from typing import Literal

from pydantic import BaseModel, Field


StageValue = Literal[
    "saved",
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
]


class CreateJobApplicationRequest(BaseModel):
    company: str = Field(min_length=1)
    position: str = Field(min_length=1)
    stage: StageValue = "saved"
    resume_uuid: str | None = None
    job_url: str | None = None
    date_applied: str | None = None
    source: str | None = None
    notes: str | None = None
    job_description: str | None = None


class UpdateJobApplicationRequest(BaseModel):
    company: str | None = None
    position: str | None = None
    stage: StageValue | None = None
    resume_uuid: str | None = None
    job_url: str | None = None
    date_applied: str | None = None
    source: str | None = None
    notes: str | None = None
    job_description: str | None = None


class JobApplicationResponse(BaseModel):
    id: int
    job_uuid: str
    company: str
    position: str
    stage: str
    resume_uuid: str | None
    resume_name: str | None
    job_url: str | None
    date_applied: str | None
    source: str | None
    notes: str | None
    job_description: str | None
    created_at: str
    updated_at: str
