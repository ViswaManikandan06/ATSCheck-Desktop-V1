from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.tailoring import (
    CreateTailoringSessionRequest,
    SaveTailoringChangesRequest,
    TailoringSessionHistoryItem,
    TailoringSessionResponse,
    UpdateSuggestionStatusRequest,
    UpdateSuggestionStatusResponse,
)
from app.core.database import get_db
from app.core.features import require_feature

from app.llm.credentials import CredentialStore
from app.llm.registry_setup import create_registry
from app.llm.service import LLMService

from app.modules.tailoring.llm_service import (
    TailoringLLMService,
)
from app.modules.tailoring.repository import (
    TailoringRepository,
)
from app.modules.tailoring.service import (
    TailoringService,
    build_tailored_draft,
)


router = APIRouter(
    prefix="/tailoring",
    tags=["Tailoring"],
    dependencies=[require_feature("ats_scan")],
)


# =========================================================
# LLM SERVICE DEPENDENCY
# =========================================================

def get_llm_service(
    db: Session = Depends(get_db),
) -> LLMService:
    """
    Build the central LLM service.

    LLMService is responsible for:

        Settings
            ↓
        Active Provider
            ↓
        Credentials
            ↓
        Provider Instance
    """

    registry = create_registry()

    credential_store = CredentialStore()

    return LLMService(
        db=db,
        registry=registry,
        credential_store=credential_store,
    )


# =========================================================
# TAILORING SERVICE DEPENDENCY
# =========================================================

def get_tailoring_service(
    db: Session = Depends(get_db),
    llm_service: LLMService = Depends(
        get_llm_service
    ),
) -> TailoringService:
    """
    Build the complete tailoring dependency chain.

        TailoringService
                ↓
        TailoringLLMService
                ↓
            LLMService
                ↓
        ProviderRegistry
                ↓
        OpenAI / Ollama / ...
    """

    tailoring_llm_service = TailoringLLMService(
        llm_service=llm_service,
    )

    return TailoringService(
        db=db,
        llm_service=llm_service,
        tailoring_llm_service=tailoring_llm_service,
    )


# =========================================================
# CREATE TAILORING SESSION
# =========================================================

@router.post(
    "/sessions",
    response_model=TailoringSessionResponse,
)
async def create_tailoring_session(
    request: CreateTailoringSessionRequest,
    tailoring_service: TailoringService = Depends(
        get_tailoring_service
    ),
) -> TailoringSessionResponse:
    """
    Create a tailoring session for an existing scan.

    The Scan already contains:

        Resume
        Job Description
        Provider
        Model
        ATS analysis

    Therefore the frontend only needs to provide:

        scan_uuid

    The provider and model stored with the scan are reused.
    """

    # -----------------------------------------------------
    # 2. Create tailoring session
    # -----------------------------------------------------

    try:

        result = (
            await tailoring_service.create_session(
                scan_uuid=request.scan_uuid,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "The selected LLM provider is not available or unreachable. "
                "Check that your provider is running and configured correctly."
            ),
        ) from exc

    return TailoringSessionResponse(
        **result
    )


# =========================================================
# GET SINGLE TAILORING SESSION
# =========================================================

@router.get(
    "/sessions/{session_uuid}",
    response_model=TailoringSessionResponse,
)
async def get_tailoring_session(
    session_uuid: str,
    db: Session = Depends(get_db),
) -> TailoringSessionResponse:
    """
    Get one tailoring session and all its suggestions.
    """

    repository = TailoringRepository(db)

    session = repository.get_session(
        session_uuid
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Tailoring session not found.",
        )

    # -----------------------------------------------------
    # Get scan
    # -----------------------------------------------------

    scan = session.scan

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis scan not found.",
        )

    # -----------------------------------------------------
    # Get resume
    # -----------------------------------------------------

    resume = scan.resume

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    # -----------------------------------------------------
    # Get suggestions
    # -----------------------------------------------------

    suggestions = repository.list_suggestions(
        session.id
    )
    base_resume_text = session.base_resume_text
    if not base_resume_text:
        latest_version = repository.get_latest_resume_version(
            resume_id=resume.id,
            scan_id=scan.id,
        )
        base_resume_text = (
            latest_version.content
            if latest_version is not None
            else resume.parsed_text
        )

    draft_content, _ = build_tailored_draft(
        base_resume_text,
        [
            {
                "action": suggestion.action,
                "section": suggestion.section,
                "original_text": suggestion.original_text,
                "suggested_text": suggestion.suggested_text,
            }
            for suggestion in suggestions
            if suggestion.status != "rejected"
        ],
    )
    accepted_draft_content, _ = build_tailored_draft(
        base_resume_text,
        [
            {
                "action": suggestion.action,
                "section": suggestion.section,
                "original_text": suggestion.original_text,
                "suggested_text": suggestion.suggested_text,
            }
            for suggestion in suggestions
            if suggestion.status == "accepted"
        ],
    )
    saved_version = repository.get_version_for_tailoring_session(
        session.id
    )

    return TailoringSessionResponse(
        session_uuid=session.session_uuid,

        scan_uuid=scan.scan_uuid,

        resume_uuid=resume.resume_uuid,

        job_description=scan.job_description,

        provider_id=session.provider_id,

        model_id=session.model_id,

        base_resume_text=base_resume_text,

        draft_content=draft_content,
        accepted_draft_content=accepted_draft_content,

        change_summary=[
            f"{item.section}: {item.matched_job_requirement}"
            for item in suggestions
            if item.status != "rejected"
        ],

        saved_version_uuid=(
            saved_version.version_uuid
            if saved_version is not None
            else None
        ),

        suggestions=[
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
            in suggestions
        ],
    )


# =========================================================
# UPDATE SUGGESTION STATUS
# =========================================================

@router.patch(
    "/suggestions/{suggestion_id}/status",
    response_model=UpdateSuggestionStatusResponse,
)
async def update_suggestion_status(
    suggestion_id: int,
    request: UpdateSuggestionStatusRequest,
    db: Session = Depends(get_db),
) -> UpdateSuggestionStatusResponse:
    """Update one decision and return the resulting whole-resume drafts."""

    repository = TailoringRepository(db)

    suggestion = repository.get_suggestion(
        suggestion_id
    )

    if suggestion is None:
        raise HTTPException(
            status_code=404,
            detail="Tailoring suggestion not found.",
        )

    if repository.get_version_for_tailoring_session(
        suggestion.session_id
    ) is not None:
        raise HTTPException(
            status_code=400,
            detail="This tailoring draft has already been saved.",
        )

    try:
        updated_suggestion = repository.update_suggestion_status(
            suggestion=suggestion,
            status=request.status,
        )
    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    session = updated_suggestion.session
    all_suggestions = repository.list_suggestions(session.id)
    base_resume_text = session.base_resume_text
    if not base_resume_text:
        latest_version = repository.get_latest_resume_version(
            resume_id=session.scan.resume_id,
            scan_id=session.scan_id,
        )
        base_resume_text = (
            latest_version.content
            if latest_version is not None
            else session.scan.resume.parsed_text
        )
    suggestion_inputs = [
        {
            "action": item.action,
            "section": item.section,
            "original_text": item.original_text,
            "suggested_text": item.suggested_text,
        }
        for item in all_suggestions
    ]
    draft_content, _ = build_tailored_draft(
        base_resume_text,
        [
            item
            for item, suggestion_item in zip(
                suggestion_inputs,
                all_suggestions,
            )
            if suggestion_item.status != "rejected"
        ],
    )
    accepted_draft_content, _ = build_tailored_draft(
        base_resume_text,
        [
            item
            for item, suggestion_item in zip(
                suggestion_inputs,
                all_suggestions,
            )
            if suggestion_item.status == "accepted"
        ],
    )

    return UpdateSuggestionStatusResponse(
        id=updated_suggestion.id,

        type=updated_suggestion.type,

        action=updated_suggestion.action,

        source=updated_suggestion.source,

        section=updated_suggestion.section,

        original_text=(
            updated_suggestion.original_text
        ),

        suggested_text=(
            updated_suggestion.suggested_text
        ),

        reason=updated_suggestion.reason,

        matched_job_requirement=(
            updated_suggestion
            .matched_job_requirement
        ),

        status=updated_suggestion.status,
        draft_content=draft_content,
        accepted_draft_content=accepted_draft_content,

        change_summary=[
            f"{item.section}: {item.matched_job_requirement}"
            for item in all_suggestions
            if item.status != "rejected"
        ],
    )


# =========================================================
# LIST TAILORING SESSIONS
# =========================================================

@router.get(
    "/sessions",
    response_model=list[TailoringSessionHistoryItem],
)
async def list_tailoring_sessions(
    scan_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[TailoringSessionHistoryItem]:
    """
    List tailoring sessions.

    Optional filter:

        scan_id

    This keeps tailoring history associated with
    the corresponding ATS analysis.
    """

    repository = TailoringRepository(db)

    sessions = repository.list_sessions(
        scan_id=scan_id,
    )

    result = []

    for session in sessions:

        scan = session.scan

        if scan is None:
            continue

        resume = scan.resume

        if resume is None:
            continue

        result.append(
            TailoringSessionHistoryItem(
                session_uuid=(
                    session.session_uuid
                ),

                scan_uuid=(
                    scan.scan_uuid
                ),

                resume_uuid=(
                    resume.resume_uuid
                ),

                provider_id=(
                    session.provider_id
                ),

                model_id=(
                    session.model_id
                ),

                job_description=(
                    scan.job_description
                ),

                suggestion_count=(
                    repository.count_suggestions(
                        session.id
                    )
                ),

                created_at=(
                    session.created_at.isoformat()
                ),
            )
        )

    return result


# =========================================================
# SAVE TAILORING CHANGES
# =========================================================

@router.post(
    "/sessions/{session_uuid}/save",
)
async def save_tailoring_changes(
    session_uuid: str,
    request: SaveTailoringChangesRequest,
    tailoring_service: TailoringService = Depends(
        get_tailoring_service
    ),
) -> dict:
    """
    Apply accepted suggestions and create exactly
    one new ResumeVersion for the Scan.
    """

    try:
        result = (
            tailoring_service.save_tailoring_changes(
                session_uuid=session_uuid,
                commit_message=request.commit_message,
                content=request.content,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return result
