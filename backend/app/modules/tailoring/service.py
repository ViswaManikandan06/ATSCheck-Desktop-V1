import json
import re
from typing import Any

from app.llm.service import LLMService
from app.modules.ats.repository import ScanRepository

from .llm_service import TailoringLLMService
from .repository import TailoringRepository


def build_tailored_draft(
    base_text: str,
    suggestions: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]]:
    """Apply only unambiguous, independently reviewable suggestions."""
    content = base_text
    valid_suggestions: list[dict[str, Any]] = []
    seen_anchors: set[str] = set()

    for suggestion in suggestions:
        original = suggestion.get("original_text", "")
        proposed = suggestion.get("suggested_text", "")
        action = suggestion.get("action")

        if not proposed.strip():
            continue

        if original:
            if (
                original == proposed
                or original in seen_anchors
                or content.count(original) != 1
            ):
                continue
            bullet_prefix = re.match(r"^(\s*[-*•▪◦●○]\s+)", original)
            if (
                bullet_prefix
                and not re.match(r"^\s*[-*•▪◦●○]\s+", proposed)
            ):
                proposed = f"{bullet_prefix.group(1)}{proposed}"
            content = content.replace(original, proposed, 1)
            seen_anchors.add(original)
            valid_suggestions.append(suggestion)
            continue

        if action != "add":
            continue

        if proposed.casefold() in content.casefold():
            continue

        lines = content.splitlines()
        target = suggestion.get("section", "Other").strip()
        target_key = target.casefold().rstrip(":")
        section_heading_aliases = {
            "technical skills": {"skills", "technical skills", "technical expertise"},
            "skills": {"skills", "technical skills", "technical expertise"},
            "experience": {
                "experience",
                "work experience",
                "professional experience",
                "employment history",
                "work history",
            },
            "projects": {
                "projects",
                "personal projects",
                "academic projects",
                "project experience",
            },
            "education": {
                "education",
                "academic background",
                "educational background",
            },
            "certifications": {
                "certifications",
                "certificates",
                "certificates and badges",
            },
            "summary": {
                "summary",
                "professional summary",
                "profile",
                "professional profile",
            },
        }
        accepted_names = section_heading_aliases.get(
            target_key,
            {target_key},
        )
        heading_index = next(
            (
                index
                for index, line in enumerate(lines)
                if line.strip().casefold().rstrip(":") in accepted_names
            ),
            None,
        )

        if heading_index is None:
            separator = "\n" if content.endswith("\n") else "\n\n"
            content = f"{content.rstrip()}{separator}{target}\n{proposed}"
        else:
            lines.insert(heading_index + 1, proposed)
            content = "\n".join(lines)

        valid_suggestions.append(suggestion)

    return content, valid_suggestions


class TailoringService:
    """
    Orchestrates resume tailoring for a specific analysis.

    Architecture:

        Resume
           ↓
        Scan (Resume + Job Description)
           ↓
        TailoringSession
           ↓
        Suggestions
           ↓
        ResumeVersion

    Important:

    - A Scan represents one Resume + Job Description analysis.
    - Tailoring always belongs to a Scan.
    - The Job Description is taken from the Scan.
    - The user does NOT provide the JD again when tailoring.
    - Multiple tailoring sessions can exist for one Scan.
    - Multiple resume versions can exist for one Scan.
    - Versions from another Scan are never used.
    """

    def __init__(
        self,
        db,
        llm_service: LLMService,
        tailoring_llm_service: TailoringLLMService,
    ) -> None:

        self.db = db

        self.llm_service = llm_service

        self.tailoring_llm_service = (
            tailoring_llm_service
        )

        self.repository = TailoringRepository(
            db
        )

        self.scan_repository = ScanRepository(
            db
        )

    # =========================================================
    # CREATE TAILORING SESSION
    # =========================================================

    async def create_session(
        self,
        *,
        scan_uuid: str,
        analysis: dict | None = None,
    ) -> dict[str, Any]:
        """
        Create a tailoring session for an existing scan.

        The scan already contains:

            Resume
            Job Description
            Provider
            Model
            ATS analysis

        Therefore the user does NOT need to provide the
        Job Description again.

        Tailoring is performed against the latest resume
        version belonging to this specific Scan.

        If no tailored version exists yet, the original
        parsed resume text is used.
        """

        # -----------------------------------------------------
        # 1. Find scan
        # -----------------------------------------------------

        scan = self.scan_repository.get_scan(
            scan_uuid
        )

        if scan is None:
            raise ValueError(
                "Scan not found."
            )

        provider_id = scan.provider_id
        model_id = scan.model_id

        # -----------------------------------------------------
        # 2. Find parent resume
        # -----------------------------------------------------

        resume = scan.resume

        if resume is None:
            raise ValueError(
                "Resume not found."
            )

        # -----------------------------------------------------
        # 3. Get latest resume version FOR THIS SCAN
        #
        # Important:
        #
        # Do NOT use the latest version across the entire
        # resume because another Scan may belong to another JD.
        # -----------------------------------------------------

        latest_version = (
            self.repository.get_latest_resume_version(
                resume_id=resume.id,
                scan_id=scan.id,
            )
        )

        if latest_version is not None:

            resume_text = latest_version.content

        else:

            resume_text = resume.parsed_text

        # -----------------------------------------------------
        # 4. Validate resume content
        # -----------------------------------------------------

        if (
            not resume_text
            or not resume_text.strip()
        ):
            raise ValueError(
                "Resume does not contain extractable text."
            )

        # -----------------------------------------------------
        # 5. Resolve configured provider
        # -----------------------------------------------------

        provider_config = self.llm_service.build_provider_config(
            provider_id,
            model_id=model_id,
        )

        if analysis is None:
            scan_result = self.scan_repository.get_result(scan.id)
            if scan_result is not None:
                analysis = json.loads(scan_result.analysis_json)

        # -----------------------------------------------------
        # 6. Create tailoring session
        #
        # Session belongs to Scan, not directly to Resume.
        # -----------------------------------------------------

        session = self.repository.create_session(
            scan_id=scan.id,
            provider_id=provider_config.provider_id,
            model_id=provider_config.model_id,
            base_resume_text=resume_text,
        )

        try:

            # -------------------------------------------------
            # 7. Generate suggestions
            #
            # JD comes directly from the Scan.
            # Resume content comes from the latest version
            # belonging to this Scan.
            # -------------------------------------------------

            suggestion_kwargs = {
                "resume_text": resume_text,
                "job_description": scan.job_description,
                "provider_id": provider_id,
                "model_id": model_id,
            }
            if analysis is not None:
                suggestion_kwargs["analysis"] = analysis

            generated_suggestions = await self.tailoring_llm_service.generate_suggestions(
                **suggestion_kwargs,
            )

            draft_content, suggestions = build_tailored_draft(
                resume_text,
                generated_suggestions,
            )

            self.repository.save_session_draft(
                session=session,
                draft_content=draft_content,
            )

            # -------------------------------------------------
            # 8. Persist suggestions
            # -------------------------------------------------

            for suggestion in suggestions:

                self.repository.create_suggestion(
                    session_id=session.id,

                    type=suggestion["type"],

                    action=suggestion["action"],

                    source=suggestion.get(
                        "source",
                        "llm",
                    ),

                    section=suggestion["section"],

                    original_text=suggestion[
                        "original_text"
                    ],

                    suggested_text=suggestion[
                        "suggested_text"
                    ],

                    reason=suggestion["reason"],

                    matched_job_requirement=(
                        suggestion[
                            "matched_job_requirement"
                        ]
                    ),
                )

        except RuntimeError:

            self.repository.delete_session(
                session=session
            )

            raise
        except Exception as exc:
            self.repository.delete_session(
                session=session
            )
            raise ValueError(
                "The tailoring provider returned an incomplete or invalid response. Please retry."
            ) from exc

        # -----------------------------------------------------
        # 9. Get persisted suggestions
        # -----------------------------------------------------

        saved_suggestions = (
            self.repository.list_suggestions(
                session.id
            )
        )

        # -----------------------------------------------------
        # 10. Return result
        # -----------------------------------------------------

        return {
            "session_uuid": (
                session.session_uuid
            ),

            "scan_uuid": (
                scan.scan_uuid
            ),

            "resume_uuid": (
                resume.resume_uuid
            ),

            "job_description": (
                scan.job_description
            ),

            "provider_id": (
                session.provider_id
            ),

            "model_id": (
                session.model_id
            ),

            "base_resume_text": session.base_resume_text,

            "draft_content": session.draft_content,
            "accepted_draft_content": resume_text,

            "change_summary": [
                f"{suggestion['section']}: {suggestion['matched_job_requirement']}"
                for suggestion in suggestions
            ],

            "suggestions": [
                {
                    "id": suggestion.id,

                    "type": suggestion.type,

                    "action": suggestion.action,

                    "source": suggestion.source,

                    "section": suggestion.section,

                    "original_text": (
                        suggestion.original_text
                    ),

                    "suggested_text": (
                        suggestion.suggested_text
                    ),

                    "reason": suggestion.reason,

                    "matched_job_requirement": (
                        suggestion
                        .matched_job_requirement
                    ),

                    "status": suggestion.status,
                }

                for suggestion
                in saved_suggestions
            ],
        }

    # =========================================================
    # SAVE TAILORING CHANGES
    # =========================================================

    def save_tailoring_changes(
        self,
        *,
        session_uuid: str,
        commit_message: str | None = None,
        content: str | None = None,
    ) -> dict[str, Any]:
        """
        Apply accepted suggestions and create exactly one
        new resume version for the Scan.

        The version belongs to the same Scan that produced
        the tailoring suggestions.

        Versions from another Scan are never used.
        """

        # -----------------------------------------------------
        # 1. Find tailoring session
        # -----------------------------------------------------

        session = self.repository.get_session(
            session_uuid
        )

        if session is None:
            raise ValueError(
                "Tailoring session not found."
            )

        saved_version = self.repository.get_version_for_tailoring_session(
            session.id
        )
        if saved_version is not None:
            return {
                "version_uuid": saved_version.version_uuid,
                "scan_uuid": session.scan.scan_uuid,
                "resume_uuid": session.scan.resume.resume_uuid,
                "version_number": saved_version.version_number,
                "commit_message": saved_version.commit_message,
                "content": saved_version.content,
                "accepted_suggestion_count": sum(
                    suggestion.status == "accepted"
                    for suggestion in self.repository.list_suggestions(session.id)
                ),
            }

        # -----------------------------------------------------
        # 2. Get scan
        # -----------------------------------------------------

        scan = session.scan

        if scan is None:
            raise ValueError(
                "Analysis scan not found."
            )

        # -----------------------------------------------------
        # 3. Get parent resume
        # -----------------------------------------------------

        resume = scan.resume

        if resume is None:
            raise ValueError(
                "Resume not found."
            )

        # -----------------------------------------------------
        # 4. Get latest version FOR THIS SCAN
        #
        # This prevents a version belonging to another JD
        # from being used.
        # -----------------------------------------------------

        # -----------------------------------------------------
        # 5. Get suggestions
        # -----------------------------------------------------

        suggestions = (
            self.repository.list_suggestions(
                session.id
            )
        )

        accepted_suggestions = [
            suggestion
            for suggestion in suggestions
            if suggestion.status == "accepted"
        ]

        # -----------------------------------------------------
        # 6. Require accepted suggestions
        # -----------------------------------------------------

        if not accepted_suggestions:

            raise ValueError(
                "No accepted suggestions to save."
            )

        # -----------------------------------------------------
        # 7. Rebuild and verify the accepted draft
        # -----------------------------------------------------

        base_resume_text = session.base_resume_text or resume.parsed_text
        content_from_decisions, valid_suggestions = build_tailored_draft(
            base_resume_text,
            [
                {
                    "action": suggestion.action,
                    "section": suggestion.section,
                    "original_text": suggestion.original_text,
                    "suggested_text": suggestion.suggested_text,
                }
                for suggestion in accepted_suggestions
            ],
        )

        if len(valid_suggestions) != len(accepted_suggestions):
            raise ValueError(
                "Accepted suggestions conflict with the saved resume text."
            )

        if content is not None and content != content_from_decisions:
            raise ValueError(
                "Submitted resume draft does not match accepted suggestions."
            )

        content = content_from_decisions

        # -----------------------------------------------------
        # 8. Prevent empty version
        # -----------------------------------------------------

        if not content.strip():

            raise ValueError(
                "Cannot create an empty resume version."
            )

        # -----------------------------------------------------
        # 9. Create ONE new version
        #
        # Version number is scoped to this Scan.
        # -----------------------------------------------------

        new_version = (
            self.repository
            .create_next_resume_version(
                resume_id=resume.id,
                scan_id=scan.id,
                content=content,
                commit_message=commit_message,
                tailoring_session_id=session.id,
            )
        )

        # -----------------------------------------------------
        # 10. Return result
        # -----------------------------------------------------

        return {
            "version_uuid": (
                new_version.version_uuid
            ),

            "scan_uuid": (
                scan.scan_uuid
            ),

            "resume_uuid": (
                resume.resume_uuid
            ),

            "version_number": (
                new_version.version_number
            ),

            "commit_message": (
                new_version.commit_message
            ),

            "content": (
                new_version.content
            ),

            "accepted_suggestion_count": (
                len(accepted_suggestions)
            ),
        }
