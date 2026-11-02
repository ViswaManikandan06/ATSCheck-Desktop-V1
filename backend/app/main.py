from fastapi import FastAPI

from app.api.routes.ats import router as ats_router
from app.api.routes.resumes import router as resumes_router
from app.api.routes.tailoring import router as tailoring_router
from app.api.routes.resume_version import router as resume_version_router
from app.api.routes.llm_settings import router as llm_settings_router
from app.api.routes.job_tracker import router as job_tracker_router
from app.api.routes.cover_letter import router as cover_letter_router
from app.api.routes.features import router as features_router

from app.core.database import (
    Base,
    engine,
    ensure_resume_version_commit_message_column,
    ensure_tailoring_draft_columns,
)
from app.resume import db_models as resume_models
from app.modules.ats import models as ats_models
from app.modules.job_tracker import models as job_tracker_models
from app.modules.tailoring import version_models
from app.modules.tailoring import models as tailoring_models
from app.llm.db_models import LLMProviderSettings

from fastapi.middleware.cors import CORSMiddleware


ensure_resume_version_commit_message_column()
ensure_tailoring_draft_columns()

Base.metadata.create_all(
    bind=engine,
)

app = FastAPI(
    title="ATSCheck Desktop",
    description="Local AI-powered resume analysis system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "atscheck-desktop",
    }


app.include_router(
    ats_router,
    prefix="/api/v1",
)

app.include_router(
    features_router,
    prefix="/api/v1",
)

app.include_router(
    resumes_router,
    prefix="/api/v1",
)

app.include_router(
    tailoring_router,
    prefix="/api/v1",
)

app.include_router(
    resume_version_router,
    prefix="/api/v1",
)

app.include_router(
    llm_settings_router,
    prefix="/api/v1",
)

app.include_router(
    job_tracker_router,
    prefix="/api/v1",
)

app.include_router(
    cover_letter_router,
    prefix="/api/v1",
)