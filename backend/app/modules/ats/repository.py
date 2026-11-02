
import json

from sqlalchemy.orm import Session

from app.modules.ats.models import (
    Scan,
    ScanResult,
)


class ScanRepository:
    """
    Database access layer for ATS scans.

    Architecture:

        Resume
           ↓
        Scan
        (Resume + Job Description)
           ↓
        ScanResult
           ↓
        TailoringSession
           ↓
        ResumeVersion

    A Scan represents ONE analysis of:

        Resume + Job Description

    The same Resume can therefore have multiple Scans:

        Resume
        ├── Scan 1 → Google JD
        ├── Scan 2 → Amazon JD
        └── Scan 3 → Microsoft JD

    This repository is responsible only for database
    persistence.

    It does not:
    - Parse resumes.
    - Perform ATS scoring.
    - Perform LLM analysis.
    - Generate tailoring suggestions.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # =========================================================
    # CREATE
    # =========================================================

    def create_scan(
        self,
        *,
        resume_id: int,
        job_description: str,
        provider_id: str,
        model_id: str,
    ) -> Scan:
        """
        Create one new analysis.

        A scan permanently stores the Job Description
        used for that analysis.
        """

        scan = Scan(
            resume_id=resume_id,
            job_description=job_description,
            provider_id=provider_id,
            model_id=model_id,
            status="pending",
        )

        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)

        return scan

    # =========================================================
    # GET
    # =========================================================

    def get_scan(
        self,
        scan_uuid: str,
    ) -> Scan | None:
        """
        Get a scan by UUID.
        """

        return (
            self.db.query(Scan)
            .filter(
                Scan.scan_uuid == scan_uuid
            )
            .first()
        )

    # =========================================================
    # LIST
    # =========================================================

    def list_scans(
        self,
        *,
        resume_id: int | None = None,
    ) -> list[Scan]:
        """
        List completed analyses only.

        Invalid, empty, failed, or pending scan rows should not
        be surfaced in the workspace or dashboard.
        """

        query = self.db.query(Scan).filter(
            Scan.status == "completed"
        ).filter(
            Scan.job_description.isnot(None)
        ).filter(
            Scan.job_description != ""
        )

        if resume_id is not None:
            query = query.filter(
                Scan.resume_id == resume_id
            )

        return (
            query
            .order_by(
                Scan.created_at.desc()
            )
            .all()
        )

    # =========================================================
    # CREATE RESULT
    # =========================================================

    def create_result(
        self,
        *,
        scan_id: int,
        ats_compatibility_score: float,
        resume_structure_score: float,
        analysis: dict,
    ) -> ScanResult:
        """
        Persist the result of one ATS analysis.
        """

        result = ScanResult(
            scan_id=scan_id,
            ats_compatibility_score=(
                ats_compatibility_score
            ),
            resume_structure_score=(
                resume_structure_score
            ),
            analysis_json=json.dumps(
                analysis
            ),
        )

        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)

        return result

    # =========================================================
    # COMPLETE SCAN
    # =========================================================

    def complete_scan(
        self,
        *,
        scan: Scan,
        overall_score: float | None,
    ) -> Scan:
        """
        Mark an analysis as completed.
        """

        scan.status = "completed"
        scan.overall_score = overall_score

        self.db.commit()
        self.db.refresh(scan)

        return scan

    # =========================================================
    # FAIL SCAN
    # =========================================================

    def fail_scan(
        self,
        *,
        scan: Scan,
    ) -> Scan:
        """
        Mark an analysis as failed.
        """

        scan.status = "failed"

        self.db.commit()
        self.db.refresh(scan)

        return scan

    # =========================================================
    # GET RESULT
    # =========================================================

    def get_result(
        self,
        scan_id: int,
    ) -> ScanResult | None:
        """
        Get the ATS result for a scan.
        """

        return (
            self.db.query(ScanResult)
            .filter(
                ScanResult.scan_id == scan_id
            )
            .first()
        )

    # =========================================================
    # DELETE
    # =========================================================

    def delete_scan(
        self,
        *,
        scan: Scan,
    ) -> None:
        """
        Delete a scan and its dependent records.

        Because Scan relationships use cascade delete,
        this also removes:

        - ScanResult
        - TailoringSession
        - ResumeVersion
        """

        self.db.delete(scan)
        self.db.commit()
