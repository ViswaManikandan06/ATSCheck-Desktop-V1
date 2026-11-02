from pydantic import BaseModel, Field


class GenerateCoverLetterRequest(BaseModel):
    resume_uuid: str = Field(min_length=1)
    job_description: str = Field(min_length=20)
    company: str = Field(min_length=1)
    position: str = Field(min_length=1)
    tone: str = Field(default="professional", min_length=1)


class GenerateCoverLetterResponse(BaseModel):
    resume_uuid: str
    company: str
    position: str
    content: str