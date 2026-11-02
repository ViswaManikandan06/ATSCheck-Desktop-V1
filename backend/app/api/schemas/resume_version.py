from datetime import datetime

from pydantic import BaseModel


class ResumeVersionResponse(BaseModel):
    version_uuid: str
    resume_uuid: str
    scan_uuid: str | None = None
    version_number: int
    commit_message: str | None = None
    content: str
    storage_path: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeVersionListResponse(BaseModel):
    resume_uuid: str
    versions: list[ResumeVersionResponse]


class LatestResumeVersionResponse(BaseModel):
    resume_uuid: str
    version: ResumeVersionResponse | None
