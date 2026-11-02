from typing import Any

from pydantic import BaseModel, Field


# =========================================================
# CREATE ATS SCAN
# =========================================================

class CreateScanRequest(BaseModel):
    """
    Request to create one ATS analysis.

    A Scan represents:

        Resume + Job Description
    """

    resume_uuid: str = Field(
        min_length=1,
    )

    job_description: str = Field(
        min_length=1,
    )


# =========================================================
# ATS SCAN RESPONSE
# =========================================================

class ScanResponse(BaseModel):
    """
    Response returned after ATS analysis.

    This contains the complete context required
    by the frontend to work with this analysis.
    """

    scan_uuid: str

    resume_uuid: str

    status: str

    job_description: str

    provider_id: str

    model_id: str

    overall_score: float | None = None

    skills_match_percent: float | None = None

    breakdown: dict[str, Any]

    tailoring: dict[str, Any] | None = None


# =========================================================
# SCAN HISTORY
# =========================================================

class ScanHistoryItem(BaseModel):
    """
    Lightweight representation of one scan
    for the analysis history screen.
    """

    scan_uuid: str

    resume_id: int

    job_description: str

    provider_id: str

    model_id: str

    overall_score: float | None

    skills_match_percent: float | None = None

    status: str

    created_at: str


# =========================================================
# SCAN DETAIL
# =========================================================

class ScanDetailResponse(BaseModel):
    """
    Complete representation of one ATS analysis.

    The scan is the source of truth for:

        Resume
        Job Description
        Provider
        Model
        Result
    """

    scan_uuid: str

    resume_id: int

    job_description: str

    provider_id: str

    model_id: str

    overall_score: float | None

    skills_match_percent: float | None = None

    status: str

    created_at: str

    result: dict[str, Any] | None
