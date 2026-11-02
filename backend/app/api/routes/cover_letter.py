from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.cover_letter import (
    GenerateCoverLetterRequest,
    GenerateCoverLetterResponse,
)
from app.core.database import get_db
from app.core.features import require_feature
from app.llm.credentials import CredentialStore
from app.llm.registry_setup import create_registry
from app.llm.service import LLMService
from app.llm.models import ProviderConfig
from app.modules.cover_letter.service import CoverLetterService
from app.resume.repository import get_resume_by_uuid


router = APIRouter(
    prefix="/cover-letter",
    tags=["Cover Letter"],
    dependencies=[require_feature("cover_letter")],
)


def get_active_llm_config(llm_service: LLMService) -> ProviderConfig:
    try:
        config = llm_service.build_active_provider_config()
        llm_service.validate_provider_credentials(config)
        return config
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/generate", response_model=GenerateCoverLetterResponse)
async def generate_cover_letter(
    request: GenerateCoverLetterRequest,
    db: Session = Depends(get_db),
) -> GenerateCoverLetterResponse:
    resume = get_resume_by_uuid(db, request.resume_uuid)

    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume.parsed_text or not resume.parsed_text.strip():
        raise HTTPException(status_code=400, detail="Resume has no extractable text.")

    llm_service = LLMService(
        db=db,
        registry=create_registry(),
        credential_store=CredentialStore(),
    )

    try:
        config = get_active_llm_config(llm_service)
        content = await CoverLetterService(llm_service).generate(
            resume_text=resume.parsed_text,
            job_description=request.job_description,
            company=request.company,
            position=request.position,
            tone=request.tone,
            provider_id=config.provider_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return GenerateCoverLetterResponse(
        resume_uuid=request.resume_uuid,
        company=request.company,
        position=request.position,
        content=content,
    )