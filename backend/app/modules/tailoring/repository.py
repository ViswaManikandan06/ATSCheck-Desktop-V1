from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.tailoring.models import (
    TailoringSession,
    TailoringSuggestion,
)

from app.modules.tailoring.version_models import (
    ResumeVersion,
)


class TailoringRepository:
    """
    Database access layer for resume tailoring.

    Architecture:

        Resume
           ↓
        Scan
        (Resume + Job Description)
           ↓
        TailoringSession
           ↓
        TailoringSuggestion
           ↓
        ResumeVersion

    This repository only handles database operations.

    It does not:
    - Perform LLM analysis.
    - Generate suggestions.
    - Apply tailoring logic.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # =========================================================
    # TAILORING SESSIONS
    # =========================================================

    def create_session(
        self,
        *,
        scan_id: int,
        provider_id: str,
        model_id: str,
        base_resume_text: str = "",
    ) -> TailoringSession:
        """
        Create a tailoring session for a specific scan.

        A Scan already contains:

            Resume + Job Description

        Therefore we only need scan_id here.
        """

        session = TailoringSession(
            scan_id=scan_id,
            provider_id=provider_id,
            model_id=model_id,
            base_resume_text=base_resume_text,
            draft_content=base_resume_text,
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def save_session_draft(
        self,
        *,
        session: TailoringSession,
        draft_content: str,
    ) -> TailoringSession:
        session.draft_content = draft_content
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session(
        self,
        session_uuid: str,
    ) -> TailoringSession | None:
        """
        Get a tailoring session by UUID.
        """

        return (
            self.db.query(TailoringSession)
            .filter(
                TailoringSession.session_uuid
                == session_uuid
            )
            .first()
        )

    def list_sessions(
        self,
        *,
        scan_id: int | None = None,
    ) -> list[TailoringSession]:
        """
        List tailoring sessions.

        If scan_id is provided, only sessions belonging
        to that analysis are returned.
        """

        query = self.db.query(
            TailoringSession
        )

        if scan_id is not None:
            query = query.filter(
                TailoringSession.scan_id
                == scan_id
            )

        return (
            query
            .order_by(
                TailoringSession.created_at.desc()
            )
            .all()
        )

    # =========================================================
    # TAILORING SUGGESTIONS
    # =========================================================

    def create_suggestion(
        self,
        *,
        session_id: int,
        type: str,
        action: str,
        source: str,
        section: str,
        original_text: str,
        suggested_text: str,
        reason: str,
        matched_job_requirement: str,
        status: str = "pending",
    ) -> TailoringSuggestion:
        """
        Persist one tailoring suggestion.
        """

        suggestion = TailoringSuggestion(
            session_id=session_id,
            type=type,
            action=action,
            source=source,
            section=section,
            original_text=original_text,
            suggested_text=suggested_text,
            reason=reason,
            matched_job_requirement=(
                matched_job_requirement
            ),
            status=status,
        )

        self.db.add(suggestion)
        self.db.commit()
        self.db.refresh(suggestion)

        return suggestion

    def get_suggestion(
        self,
        suggestion_id: int,
    ) -> TailoringSuggestion | None:
        """
        Get a suggestion by ID.
        """

        return (
            self.db.query(
                TailoringSuggestion
            )
            .filter(
                TailoringSuggestion.id
                == suggestion_id
            )
            .first()
        )

    def list_suggestions(
        self,
        session_id: int,
    ) -> list[TailoringSuggestion]:
        """
        List all suggestions belonging to a tailoring session.
        """

        return (
            self.db.query(
                TailoringSuggestion
            )
            .filter(
                TailoringSuggestion.session_id
                == session_id
            )
            .order_by(
                TailoringSuggestion.created_at.asc()
            )
            .all()
        )

    def count_suggestions(
        self,
        session_id: int,
    ) -> int:
        """
        Count suggestions belonging to a tailoring session.
        """

        return (
            self.db.query(
                TailoringSuggestion
            )
            .filter(
                TailoringSuggestion.session_id
                == session_id
            )
            .count()
        )

    # =========================================================
    # SUGGESTION STATUS
    # =========================================================

    def update_suggestion_status(
        self,
        *,
        suggestion: TailoringSuggestion,
        status: str,
    ) -> TailoringSuggestion:
        """
        Update the user's decision for a suggestion.

        Users may revise a decision while reviewing the draft.
        """

        suggestion.status = status

        self.db.commit()
        self.db.refresh(suggestion)

        return suggestion

    # =========================================================
    # RESUME VERSIONS
    # =========================================================

    def create_next_resume_version(
        self,
        *,
        resume_id: int,
        scan_id: int,
        content: str,
        storage_path: str | None = None,
        commit_message: str | None = None,
        tailoring_session_id: int | None = None,
    ) -> ResumeVersion:
        """
        Create the next version for a specific analysis.

        Version numbering is scoped to:

            Resume + Scan

        Example:

            Scan 1
                v1
                v2
                v3

            Scan 2
                v1
                v2
        """

        latest_version = (
            self.db.query(
                func.max(
                    ResumeVersion.version_number
                )
            )
            .filter(
                ResumeVersion.resume_id
                == resume_id,
                ResumeVersion.scan_id
                == scan_id,
            )
            .scalar()
        )

        next_version_number = (
            1
            if latest_version is None
            else latest_version + 1
        )

        version = ResumeVersion(
            resume_id=resume_id,
            scan_id=scan_id,
            version_number=next_version_number,
            commit_message=commit_message,
            content=content,
            storage_path=storage_path,
            tailoring_session_id=tailoring_session_id,
        )

        self.db.add(version)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            if tailoring_session_id is None:
                raise
            existing = self.get_version_for_tailoring_session(
                tailoring_session_id
            )
            if existing is None:
                raise
            return existing
        self.db.refresh(version)

        return version

    def get_version_for_tailoring_session(
        self,
        tailoring_session_id: int,
    ) -> ResumeVersion | None:
        return (
            self.db.query(ResumeVersion)
            .filter(
                ResumeVersion.tailoring_session_id
                == tailoring_session_id
            )
            .first()
        )

    def create_resume_version(
        self,
        *,
        resume_id: int,
        scan_id: int,
        version_number: int,
        content: str,
        storage_path: str | None = None,
        commit_message: str | None = None,
    ) -> ResumeVersion:
        """
        Create a resume version explicitly.
        """

        version = ResumeVersion(
            resume_id=resume_id,
            scan_id=scan_id,
            version_number=version_number,
            commit_message=commit_message,
            content=content,
            storage_path=storage_path,
        )

        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)

        return version

    def get_resume_version(
        self,
        version_uuid: str,
    ) -> ResumeVersion | None:
        """
        Get a resume version by UUID.
        """

        return (
            self.db.query(
                ResumeVersion
            )
            .filter(
                ResumeVersion.version_uuid
                == version_uuid
            )
            .first()
        )

    def list_resume_versions(
        self,
        *,
        resume_id: int,
        scan_id: int | None = None,
    ) -> list[ResumeVersion]:
        """
        List resume versions.

        If scan_id is provided, return versions for that
        specific analysis.

        Without scan_id, return all versions belonging
        to the resume.
        """

        query = self.db.query(
            ResumeVersion
        ).filter(
            ResumeVersion.resume_id
            == resume_id
        )

        if scan_id is not None:
            query = query.filter(
                ResumeVersion.scan_id
                == scan_id
            )

        return (
            query
            .order_by(
                ResumeVersion.version_number.asc()
            )
            .all()
        )

    def get_latest_resume_version(
        self,
        *,
        resume_id: int,
        scan_id: int,
    ) -> ResumeVersion | None:
        """
        Get the latest version for a specific analysis.
        """

        return (
            self.db.query(
                ResumeVersion
            )
            .filter(
                ResumeVersion.resume_id
                == resume_id,
                ResumeVersion.scan_id
                == scan_id,
            )
            .order_by(
                ResumeVersion.version_number.desc()
            )
            .first()
        )

    def get_latest_resume_version_for_resume(
        self,
        *,
        resume_id: int,
    ) -> ResumeVersion | None:
        """
        Get the most recently created version
        across all scans belonging to a resume.

        Version numbers are scoped to each scan, so
        version_number cannot be used to determine the
        globally latest resume version.

        Example:

            Scan 1 → v1
            Scan 2 → v1
            Scan 2 → v2  ← latest

        The newest created version is determined by:

            created_at DESC
            id DESC

        The ID is used as a deterministic tie-breaker
        when two versions have the same timestamp.
        """

        return (
            self.db.query(
                ResumeVersion
            )
            .filter(
                ResumeVersion.resume_id
                == resume_id,
            )
            .order_by(
                ResumeVersion.created_at.desc(),
                ResumeVersion.id.desc(),
            )
            .first()
        )

    def get_next_version_number(
        self,
        *,
        resume_id: int,
        scan_id: int,
    ) -> int:
        """
        Get the next version number for a specific analysis.
        """

        latest_version = (
            self.get_latest_resume_version(
                resume_id=resume_id,
                scan_id=scan_id,
            )
        )

        if latest_version is None:
            return 1

        return (
            latest_version.version_number + 1
        )

    # =========================================================
    # DELETE
    # =========================================================

    def delete_session(
        self,
        *,
        session: TailoringSession,
    ) -> None:
        """
        Delete a tailoring session and its suggestions.
        """

        self.db.delete(session)
        self.db.commit()
