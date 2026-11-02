from typing import Any

from sqlalchemy.orm import Session

from app.llm.models import ProviderConfig
from app.modules.ats.analysis_service import ATSAnalysisService
from app.modules.ats.repository import ScanRepository
from app.resume.repository import get_resume_by_uuid


class ScanService:
    """
    Orchestrates one complete ATS analysis.

    Architecture:

        Resume
           │
           │ reused
           ▼
        Scan
        (Resume + Job Description)
           │
           ▼
        ATSAnalysisService
           │
           ▼
        ScanResult

    Important:

    - A Resume is the stored uploaded file.
    - A Scan represents ONE Resume + Job Description analysis.
    - The same Resume can have multiple Scans.
    - Resume parsing happens during upload only.
    - Scanning always reuses the stored parsed resume text.
    - The Job Description belongs permanently to the Scan.
    """

    def __init__(
        self,
        db: Session,
        analysis_service: ATSAnalysisService,
    ) -> None:

        self.db = db
        self.analysis_service = analysis_service
        self.scan_repository = ScanRepository(db)

    # =========================================================
    # CREATE SCAN
    # =========================================================

    async def create_scan(
        self,
        *,
        resume_uuid: str,
        job_description: str,
        llm_config: ProviderConfig,
    ) -> dict[str, Any]:
        """
        Create and execute one ATS analysis.

        One call represents:

            Resume + Job Description → Scan

        Example:

            resume_uuid = abc

            Scan 1:
                Resume abc
                +
                Google JD

            Scan 2:
                Resume abc
                +
                Amazon JD

        Both scans reuse the same stored Resume.
        """

        # -----------------------------------------------------
        # 1. Validate Job Description
        # -----------------------------------------------------

        if (
            not job_description
            or not job_description.strip()
        ):
            raise ValueError(
                "Job description cannot be empty."
            )

        job_description = job_description.strip()

        # -----------------------------------------------------
        # 2. Find Resume
        # -----------------------------------------------------

        resume = get_resume_by_uuid(
            self.db,
            resume_uuid,
        )

        if resume is None:
            raise ValueError(
                "Resume not found."
            )

        # -----------------------------------------------------
        # 3. Validate stored parsed resume
        # -----------------------------------------------------

        if (
            not resume.parsed_text
            or not resume.parsed_text.strip()
        ):
            raise ValueError(
                "Resume does not contain extractable text."
            )

        # -----------------------------------------------------
        # 4. Create pending Scan
        #
        # The Scan permanently stores:
        #
        #   Resume
        #   Job Description
        #   Provider
        #   Model
        # -----------------------------------------------------

        scan = self.scan_repository.create_scan(
            resume_id=resume.id,
            job_description=job_description,
            provider_id=llm_config.provider_id,
            model_id=llm_config.model_id,
        )

        try:

            # -------------------------------------------------
            # 5. Run ATS analysis
            #
            # Reuse the parsed resume.
            # Do NOT parse the PDF again.
            # -------------------------------------------------

            analysis = (
                await self.analysis_service.analyze(
                    resume_text=resume.parsed_text,
                    job_description=job_description,
                    llm_config=llm_config,
                    file_metadata={
                        "file_type": resume.file_type,
                        "file_size": resume.file_size,
                        "file_hash": resume.file_hash,
                        "word_count": resume.word_count,
                        "page_count": resume.page_count,
                        "text_extractable": (
                            resume.text_extractable
                        ),
                        "is_scanned_image": (
                            resume.is_scanned_image
                        ),
                    },
                )
            )

            # -------------------------------------------------
            # 6. Validate analysis response
            # -------------------------------------------------

            if not isinstance(analysis, dict):
                raise ValueError(
                    "ATS analysis returned an invalid response."
                )

            if "breakdown" not in analysis:
                raise ValueError(
                    "ATS analysis is missing breakdown."
                )

            breakdown = analysis["breakdown"]

            # -------------------------------------------------
            # 7. Extract required score fields
            # -------------------------------------------------

            ats_compatibility = breakdown[
                "ats_compatibility"
            ]["score"]

            resume_structure = breakdown[
                "resume_structure"
            ]["score"]

            # -------------------------------------------------
            # 8. Persist ScanResult
            # -------------------------------------------------

            self.scan_repository.create_result(
                scan_id=scan.id,
                ats_compatibility_score=(
                    ats_compatibility
                ),
                resume_structure_score=(
                    resume_structure
                ),
                analysis=analysis,
            )

            # -------------------------------------------------
            # 9. Mark Scan completed
            # -------------------------------------------------

            self.scan_repository.complete_scan(
                scan=scan,
                overall_score=analysis.get("overall_score"),
            )

            # -------------------------------------------------
            # 10. Return complete Scan context
            # -------------------------------------------------

            return {
                "scan_uuid": scan.scan_uuid,
                "resume_uuid": resume.resume_uuid,
                "status": "completed",
                "job_description": (
                    scan.job_description
                ),
                "provider_id": scan.provider_id,
                "model_id": scan.model_id,
                "overall_score": analysis.get("overall_score"),
                "skills_match_percent": analysis.get(
                    "skills_match_percent"
                ),
                "breakdown": breakdown,
            }

        except Exception:

            # -------------------------------------------------
            # Failed or incomplete analyses should not remain in
            # the database. They are not valid scan history.
            # -------------------------------------------------

            self.scan_repository.delete_scan(
                scan=scan,
            )

            raise
