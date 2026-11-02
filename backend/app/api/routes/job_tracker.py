from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.job_tracker import (
    CreateJobApplicationRequest,
    JobApplicationResponse,
    UpdateJobApplicationRequest,
)
from app.core.database import get_db
from app.core.features import require_feature
from app.modules.job_tracker.models import JobApplication
from app.resume.db_models import Resume
from app.resume.repository import get_resume_by_uuid


router = APIRouter(
    prefix="/jobs",
    tags=["Job Tracker"],
    dependencies=[require_feature("job_tracker")],
)


ALLOWED_STAGES = {
    "saved",
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
}


def serialize_job(job: JobApplication) -> JobApplicationResponse:
    resume_uuid = job.resume.resume_uuid if job.resume else None
    resume_name = job.resume.original_filename if job.resume else None

    return JobApplicationResponse(
        id=job.id,
        job_uuid=job.job_uuid,
        company=job.company,
        position=job.position,
        stage=job.stage,
        resume_uuid=resume_uuid,
        resume_name=resume_name,
        job_url=job.job_url,
        date_applied=job.date_applied,
        source=job.source,
        notes=job.notes,
        job_description=job.job_description,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
    )


@router.get("")
def list_jobs(db: Session = Depends(get_db)) -> dict[str, list[JobApplicationResponse]]:
    jobs = (
        db.query(JobApplication)
        .order_by(JobApplication.updated_at.desc())
        .all()
    )

    return {
        "jobs": [serialize_job(job) for job in jobs],
    }


@router.post("", response_model=JobApplicationResponse)
def create_job(
    payload: CreateJobApplicationRequest,
    db: Session = Depends(get_db),
) -> JobApplicationResponse:
    if payload.company.strip() == "":
        raise HTTPException(status_code=400, detail="Company is required.")

    if payload.position.strip() == "":
        raise HTTPException(status_code=400, detail="Position is required.")

    if payload.stage not in ALLOWED_STAGES:
        raise HTTPException(status_code=400, detail="Invalid job stage.")

    resume: Resume | None = None
    if payload.resume_uuid:
        resume = get_resume_by_uuid(db=db, resume_uuid=payload.resume_uuid)
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found.")

    job = JobApplication(
        company=payload.company.strip(),
        position=payload.position.strip(),
        stage=payload.stage,
        resume_id=resume.id if resume else None,
        job_url=payload.job_url.strip() if payload.job_url else None,
        date_applied=payload.date_applied,
        source=payload.source.strip() if payload.source else None,
        notes=payload.notes.strip() if payload.notes else None,
        job_description=payload.job_description.strip() if payload.job_description else None,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return serialize_job(job)


@router.get("/{job_uuid}", response_model=JobApplicationResponse)
def get_job(job_uuid: str, db: Session = Depends(get_db)) -> JobApplicationResponse:
    job = db.query(JobApplication).filter(JobApplication.job_uuid == job_uuid).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job application not found.")

    return serialize_job(job)


@router.patch("/{job_uuid}", response_model=JobApplicationResponse)
def update_job(
    job_uuid: str,
    payload: UpdateJobApplicationRequest,
    db: Session = Depends(get_db),
) -> JobApplicationResponse:
    job = db.query(JobApplication).filter(JobApplication.job_uuid == job_uuid).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job application not found.")

    if payload.stage is not None and payload.stage not in ALLOWED_STAGES:
        raise HTTPException(status_code=400, detail="Invalid job stage.")

    if payload.resume_uuid is not None:
        resume = get_resume_by_uuid(db=db, resume_uuid=payload.resume_uuid)
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found.")
        job.resume_id = resume.id

    for field_name, value in {
        "company": payload.company,
        "position": payload.position,
        "stage": payload.stage,
        "job_url": payload.job_url,
        "date_applied": payload.date_applied,
        "source": payload.source,
        "notes": payload.notes,
        "job_description": payload.job_description,
    }.items():
        if value is not None:
            if field_name in {"company", "position"}:
                value = value.strip()
            if field_name in {"job_url", "source", "notes", "job_description"} and value == "":
                value = None
            setattr(job, field_name, value)

    db.commit()
    db.refresh(job)

    return serialize_job(job)


@router.delete("/{job_uuid}")
def delete_job(job_uuid: str, db: Session = Depends(get_db)) -> dict[str, str]:
    job = db.query(JobApplication).filter(JobApplication.job_uuid == job_uuid).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job application not found.")

    db.delete(job)
    db.commit()

    return {"status": "deleted", "job_uuid": job_uuid}
