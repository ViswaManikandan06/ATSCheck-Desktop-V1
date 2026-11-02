from typing import Literal

from pydantic import BaseModel, Field


# =========================================================
# SUGGESTION STATUS
# =========================================================

SuggestionStatus = Literal[
    "pending",
    "accepted",
    "rejected",
]


# =========================================================
# CREATE TAILORING SESSION
# =========================================================

class CreateTailoringSessionRequest(BaseModel):
    """
    Create a tailoring session for an existing ATS scan.

    The scan already contains:
        - Resume
        - Job Description
        - ATS analysis

    Therefore the frontend only sends scan_uuid.
    """

    scan_uuid: str = Field(
        min_length=1,
    )


# =========================================================
# TAILORING SUGGESTION
# =========================================================

class TailoringSuggestionResponse(BaseModel):

    id: int

    type: str

    action: str

    source: str

    section: str

    original_text: str

    suggested_text: str

    reason: str

    matched_job_requirement: str

    status: SuggestionStatus


# =========================================================
# TAILORING SESSION RESPONSE
# =========================================================

class TailoringSessionResponse(BaseModel):
    """
    Complete tailoring session response.

    A tailoring session belongs to a Scan.
    """

    session_uuid: str

    scan_uuid: str

    resume_uuid: str

    job_description: str

    provider_id: str

    model_id: str

    base_resume_text: str

    draft_content: str
    accepted_draft_content: str

    change_summary: list[str]

    saved_version_uuid: str | None = None

    suggestions: list[
        TailoringSuggestionResponse
    ]


# =========================================================
# UPDATE SUGGESTION STATUS REQUEST
# =========================================================

class UpdateSuggestionStatusRequest(BaseModel):

    status: SuggestionStatus


# =========================================================
# UPDATE SUGGESTION STATUS RESPONSE
# =========================================================

class UpdateSuggestionStatusResponse(
    TailoringSuggestionResponse
):
    draft_content: str
    accepted_draft_content: str

    change_summary: list[str]


# =========================================================
# TAILORING SESSION HISTORY
# =========================================================

class TailoringSessionHistoryItem(BaseModel):
    """
    Lightweight tailoring session history item.
    """

    session_uuid: str

    scan_uuid: str

    resume_uuid: str

    provider_id: str

    model_id: str

    job_description: str

    suggestion_count: int

    created_at: str


class SaveTailoringChangesRequest(BaseModel):
    commit_message: str | None = None

    content: str = Field(min_length=1)
