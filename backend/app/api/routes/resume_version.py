from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.resume_version import (
    LatestResumeVersionResponse,
    ResumeVersionListResponse,
    ResumeVersionResponse,
)
from app.core.database import get_db
from app.core.features import require_feature
from app.modules.tailoring.repository import (
    TailoringRepository,
)
from app.resume.repository import (
    get_resume_by_uuid,
)


router = APIRouter(
    prefix="/resumes",
    tags=["Resume Versions"],
    dependencies=[require_feature("ats_scan")],
)


# =========================================================
# RESPONSE BUILDER
# =========================================================


def _build_version_response(
    *,
    version: object,
    resume_uuid: str,
) -> ResumeVersionResponse:
    """
    Convert a ResumeVersion database model into
    the public API response model.

    A resume version belongs to:

        Resume
        +
        Scan

    Therefore the API exposes both:

        resume_uuid
        scan_uuid
    """

    scan = getattr(version, "scan", None)

    return ResumeVersionResponse(
        version_uuid=version.version_uuid,
        resume_uuid=resume_uuid,
        scan_uuid=(
            scan.scan_uuid if scan is not None else None
        ),
        version_number=version.version_number,
        commit_message=version.commit_message,
        content=version.content,
        storage_path=version.storage_path,
        created_at=version.created_at,
    )


# =========================================================
# LIST ALL RESUME VERSIONS
# =========================================================


@router.get(
    "/{resume_uuid}/versions",
    response_model=ResumeVersionListResponse,
)
def list_resume_versions(
    resume_uuid: str,
    db: Session = Depends(get_db),
) -> ResumeVersionListResponse:
    """
    List all versions belonging to a resume.

    Versions may belong to different scans.

    Example:

        Resume
        ├── Scan 1
        │    ├── v1
        │    └── v2
        │
        └── Scan 2
             ├── v1
             └── v2

    All four versions are returned.
    """

    # -----------------------------------------------------
    # 1. Get resume
    # -----------------------------------------------------

    resume = get_resume_by_uuid(
        db,
        resume_uuid,
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    # -----------------------------------------------------
    # 2. Get repository
    # -----------------------------------------------------

    repository = TailoringRepository(db)

    # -----------------------------------------------------
    # 3. Get all versions for resume
    # -----------------------------------------------------

    versions = repository.list_resume_versions(
        resume_id=resume.id,
    )

    # -----------------------------------------------------
    # 4. Build response
    # -----------------------------------------------------

    return ResumeVersionListResponse(
        resume_uuid=resume.resume_uuid,
        versions=[
            _build_version_response(
                version=version,
                resume_uuid=resume.resume_uuid,
            )
            for version in versions
        ],
    )


# =========================================================
# GET LATEST RESUME VERSION
# =========================================================


@router.get(
    "/{resume_uuid}/versions/latest",
    response_model=LatestResumeVersionResponse,
)
def get_latest_resume_version(
    resume_uuid: str,
    db: Session = Depends(get_db),
) -> LatestResumeVersionResponse:
    """
    Get the most recently created version belonging
    to the resume across all scans.

    Example:

        Scan 1 → v1
        Scan 2 → v1
        Scan 2 → v2

    The endpoint returns Scan 2 → v2 because it is
    the most recently created version.

    Version numbers are NOT compared across scans.
    """

    # -----------------------------------------------------
    # 1. Get resume
    # -----------------------------------------------------

    resume = get_resume_by_uuid(
        db,
        resume_uuid,
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    # -----------------------------------------------------
    # 2. Get repository
    # -----------------------------------------------------

    repository = TailoringRepository(db)

    # -----------------------------------------------------
    # 3. Get latest version across all scans
    # -----------------------------------------------------

    version = (
        repository.get_latest_resume_version_for_resume(
            resume_id=resume.id,
        )
    )

    # -----------------------------------------------------
    # 4. Build response
    # -----------------------------------------------------

    return LatestResumeVersionResponse(
        resume_uuid=resume.resume_uuid,
        version=(
            _build_version_response(
                version=version,
                resume_uuid=resume.resume_uuid,
            )
            if version is not None
            else None
        ),
    )


# =========================================================
# GET SINGLE RESUME VERSION
# =========================================================


@router.get(
    "/versions/{version_uuid}",
    response_model=ResumeVersionResponse,
)
def get_resume_version(
    version_uuid: str,
    db: Session = Depends(get_db),
) -> ResumeVersionResponse:
    """
    Get one resume version by UUID.
    """

    # -----------------------------------------------------
    # 1. Get repository
    # -----------------------------------------------------

    repository = TailoringRepository(db)

    # -----------------------------------------------------
    # 2. Find version
    # -----------------------------------------------------

    version = repository.get_resume_version(
        version_uuid,
    )

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="Resume version not found.",
        )

    # -----------------------------------------------------
    # 3. Ensure parent resume exists
    # -----------------------------------------------------

    if version.resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    # -----------------------------------------------------
    # 4. Build response
    # -----------------------------------------------------

    return _build_version_response(
        version=version,
        resume_uuid=version.resume.resume_uuid,
    )
