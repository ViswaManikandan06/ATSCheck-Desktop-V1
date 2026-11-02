import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.ats import (
    CreateScanRequest,
    ScanDetailResponse,
    ScanHistoryItem,
    ScanResponse,
)
from app.core.database import get_db
from app.core.features import require_feature

from app.llm.credentials import CredentialStore
from app.llm.models import ProviderConfig
from app.llm.registry_setup import create_registry
from app.llm.service import LLMService

from app.modules.ats.analysis_service import ATSAnalysisService
from app.modules.ats.analysis_service import calculate_skills_match_percent
from app.modules.ats.llm_service import ATSLLMService
from app.modules.ats.repository import ScanRepository
from app.modules.ats.scan_service import ScanService


router = APIRouter(
    prefix="/ats",
    tags=["ATS"],
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

    - reading the active provider/model
    - loading credentials
    - creating the selected provider
    """

    registry = create_registry()

    credential_store = CredentialStore()

    return LLMService(
        db=db,
        registry=registry,
        credential_store=credential_store,
    )


# =========================================================
# ATS SERVICE DEPENDENCY
# =========================================================

def get_scan_service(
    db: Session = Depends(get_db),
    llm_service: LLMService = Depends(
        get_llm_service
    ),
) -> ScanService:
    """
    Build the ATS scanning service.

    Architecture:

        API
         ↓
        ScanService
         ↓
        ATSAnalysisService
         ↓
        ATSLLMService
         ↓
        LLMService
         ↓
        Provider
    """

    ats_llm_service = ATSLLMService(
        llm_service=llm_service,
    )

    analysis_service = ATSAnalysisService(
        llm_service=ats_llm_service,
    )

    return ScanService(
        db=db,
        analysis_service=analysis_service,
    )


# =========================================================
# GET ACTIVE LLM CONFIGURATION
# =========================================================

def get_active_llm_config(
    llm_service: LLMService,
) -> ProviderConfig:
    """
    Load and validate the provider/model selected
    in Settings.

    The frontend does NOT choose the provider.

    Flow:

        Settings
            ↓
        SQLite
            ↓
        Active Provider
            ↓
        LLMService
            ↓
        ProviderConfig
    """

    try:

        config = (
            llm_service.build_active_provider_config()
        )

        llm_service.validate_provider_credentials(
            config
        )

        return config

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# =========================================================
# CREATE ATS SCAN
# =========================================================

@router.post(
    "/scan",
    response_model=ScanResponse,
)
async def create_scan(
    request: CreateScanRequest,
    llm_service: LLMService = Depends(
        get_llm_service
    ),
    scan_service: ScanService = Depends(
        get_scan_service
    ),
) -> ScanResponse:
    """
    Create one ATS analysis.

    One request creates exactly one Scan:

        Resume + Job Description
                  ↓
                Scan
                  ↓
             ATS Analysis
                  ↓
             ScanResult

    The same Resume can therefore be analyzed
    against many different Job Descriptions.
    """

    # -----------------------------------------------------
    # 1. Load active provider/model
    # -----------------------------------------------------

    config = get_active_llm_config(
        llm_service
    )

    # -----------------------------------------------------
    # 2. Create and execute scan
    # -----------------------------------------------------

    try:

        result = await scan_service.create_scan(
            resume_uuid=request.resume_uuid,
            job_description=request.job_description,
            llm_config=config,
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

    # -----------------------------------------------------
    # 3. Return scan
    # -----------------------------------------------------

    response_payload = {
        "resume_uuid": result.get(
            "resume_uuid",
            request.resume_uuid,
        ),
        "job_description": result.get(
            "job_description",
            request.job_description,
        ),
        "provider_id": result.get(
            "provider_id",
            config.provider_id,
        ),
        "model_id": result.get(
            "model_id",
            config.model_id,
        ),
        "scan_uuid": result.get(
            "scan_uuid",
            result.get("scan_uuid"),
        ),
        "status": result.get(
            "status",
            "completed",
        ),
        "overall_score": result.get(
            "overall_score",
        ),
        "skills_match_percent": result.get(
            "skills_match_percent",
        ),
        "breakdown": result.get(
            "breakdown",
            {},
        ),
        "tailoring": result.get("tailoring"),
    }

    return ScanResponse(
        **response_payload
    )


# =========================================================
# GET SINGLE SCAN
# =========================================================

@router.get(
    "/scans/{scan_uuid}",
    response_model=ScanDetailResponse,
)
async def get_scan(
    scan_uuid: str,
    db: Session = Depends(get_db),
) -> ScanDetailResponse:
    """
    Get one complete ATS analysis.

    The Scan contains the complete context:

        Resume
        Job Description
        Provider
        Model
        Score
        Analysis Result
    """

    repository = ScanRepository(db)

    scan = repository.get_scan(
        scan_uuid
    )

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    result = repository.get_result(
        scan.id
    )

    result_data = None
    skills_match_percent = None

    if result is not None:
        analysis = json.loads(result.analysis_json)
        breakdown = analysis.get("breakdown", {})
        skills_match_percent = calculate_skills_match_percent(
            breakdown.get("skills_match", {})
        )

        result_data = {
            "ats_compatibility_score": (
                result.ats_compatibility_score
            ),
            "resume_structure_score": (
                result.resume_structure_score
            ),
            "analysis": analysis,
        }

    return ScanDetailResponse(
        scan_uuid=scan.scan_uuid,
        resume_id=scan.resume_id,
        job_description=scan.job_description,
        provider_id=scan.provider_id,
        model_id=scan.model_id,
        overall_score=scan.overall_score,
        skills_match_percent=skills_match_percent,
        status=scan.status,
        created_at=scan.created_at.isoformat(),
        result=result_data,
    )


# =========================================================
# LIST SCAN HISTORY
# =========================================================

@router.get(
    "/scans",
    response_model=list[ScanHistoryItem],
)
async def list_scans(
    resume_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[ScanHistoryItem]:
    """
    List analysis history.

    If resume_id is supplied:

        return all analyses for that Resume.

    Example:

        Resume A
            ├── Scan 1 → Google
            ├── Scan 2 → Amazon
            └── Scan 3 → Microsoft
    """

    repository = ScanRepository(db)

    scans = repository.list_scans(
        resume_id=resume_id,
    )

    history = []
    for scan in scans:
        skills_match_percent = None
        if scan.result is not None:
            analysis = json.loads(scan.result.analysis_json)
            skills_match_percent = calculate_skills_match_percent(
                analysis.get("breakdown", {}).get("skills_match", {})
            )

        history.append(
            ScanHistoryItem(
                scan_uuid=scan.scan_uuid,
                resume_id=scan.resume_id,
                job_description=scan.job_description,
                provider_id=scan.provider_id,
                model_id=scan.model_id,
                overall_score=scan.overall_score,
                skills_match_percent=skills_match_percent,
                status=scan.status,
                created_at=scan.created_at.isoformat(),
            )
        )

    return history


# =========================================================
# DELETE SCAN
# =========================================================

@router.delete(
    "/scans/{scan_uuid}",
)
async def delete_scan(
    scan_uuid: str,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Delete one analysis.

    Because Scan owns:

        ScanResult
        TailoringSession
        ResumeVersion

    those dependent records are removed through
    the configured cascade relationships.
    """

    repository = ScanRepository(db)

    scan = repository.get_scan(
        scan_uuid
    )

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    repository.delete_scan(
        scan=scan,
    )

    return {
        "message": "Scan deleted successfully.",
    }

@router.get(
    "/resumes/{resume_uuid}/latest",
    response_model=ScanDetailResponse,
)
async def get_latest_scan_for_resume(
    resume_uuid: str,
    db: Session = Depends(get_db),
) -> ScanDetailResponse:
    """
    Get the most recent ATS scan for a resume.

    Used when opening an existing resume workspace.

    A resume can have multiple scans, but the workspace
    initially displays the latest one.
    """

    from app.resume.repository import get_resume_by_uuid

    # resume_repository = ResumeRepository(db)

    resume = get_resume_by_uuid(
        resume_uuid=resume_uuid,
        db=db
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    repository = ScanRepository(db)

    scans = repository.list_scans(
        resume_id=resume.id,
    )

    if not scans:
        raise HTTPException(
            status_code=404,
            detail="No analysis found for this resume.",
        )

    scan = scans[0]

    result = repository.get_result(
        scan.id
    )

    result_data = None

    if result is not None:
        result_data = {
            "ats_compatibility_score": (
                result.ats_compatibility_score
            ),
            "resume_structure_score": (
                result.resume_structure_score
            ),
            "analysis": json.loads(
                result.analysis_json
            ),
        }

    return ScanDetailResponse(
        scan_uuid=scan.scan_uuid,
        resume_id=scan.resume_id,
        job_description=scan.job_description,
        provider_id=scan.provider_id,
        model_id=scan.model_id,
        overall_score=scan.overall_score,
        status=scan.status,
        created_at=scan.created_at.isoformat(),
        result=result_data,
    )