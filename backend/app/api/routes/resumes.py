import hashlib
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.resume.parser import parse_resume
from app.resume.repository import (
    create_resume,
    delete_resume,
    get_resume_by_hash,
    get_resume_by_uuid,
    list_resumes,
)
from app.storage.local_storage import save_file


router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"],
)


MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
}


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload, parse, persist, and register a resume.
    """

    filename = file.filename or ""

    # ---------------------------------------------------------
    # 1. Validate filename
    # ---------------------------------------------------------

    if not filename.strip():
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    # ---------------------------------------------------------
    # 2. Validate extension
    # ---------------------------------------------------------

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed.",
        )

    # ---------------------------------------------------------
    # 3. Validate MIME type
    # ---------------------------------------------------------

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file content type.",
        )

    # ---------------------------------------------------------
    # 4. Read file
    # ---------------------------------------------------------

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    # ---------------------------------------------------------
    # 5. Validate file size
    # ---------------------------------------------------------

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be below 5 MB.",
        )

    # ---------------------------------------------------------
    # 6. Generate file hash
    # ---------------------------------------------------------

    file_hash = hashlib.sha256(content).hexdigest()

    # ---------------------------------------------------------
    # 7. Check duplicate
    # ---------------------------------------------------------

    existing_resume = get_resume_by_hash(
        db=db,
        file_hash=file_hash,
    )

    if existing_resume:

        return {
            "resume_uuid": existing_resume.resume_uuid,
            "filename": existing_resume.original_filename,
            "status": "already_exists",
        }

    # ---------------------------------------------------------
    # 8. Parse resume
    # ---------------------------------------------------------

    try:

        parsed_resume = parse_resume(
            filename=filename,
            file_bytes=content,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # ---------------------------------------------------------
    # 9. Generate internal filename
    # ---------------------------------------------------------

    safe_name = (
        f"{uuid.uuid4()}{extension}"
    )

    # ---------------------------------------------------------
    # 10. Save physical file
    # ---------------------------------------------------------

    storage_path = save_file(
        content,
        safe_name,
    )

    # ---------------------------------------------------------
    # 11. Save database record
    # ---------------------------------------------------------

    resume = create_resume(
        db=db,
        original_filename=filename,
        storage_path=storage_path,
        file_type=extension,
        file_size=len(content),
        file_hash=file_hash,
        parsed_text=parsed_resume.text,
        word_count=parsed_resume.metadata.word_count,
        page_count=parsed_resume.metadata.page_count,
        text_extractable=parsed_resume.metadata.text_extractable,
        is_scanned_image=parsed_resume.metadata.is_scanned_image,
    )
    # ---------------------------------------------------------
    # 12. Return response
    # ---------------------------------------------------------

    return {
        "id": resume.id,
        "resume_uuid": resume.resume_uuid,
        "filename": resume.original_filename,
        "status": "uploaded",
        "text": parsed_resume.text,
        "metadata": vars(parsed_resume.metadata),
    }

@router.get("")
def get_resumes(
    db: Session = Depends(get_db),
):
    """
    Return all stored resumes.
    """

    resumes = list_resumes(db)

    return {
        "resumes": [
            {
                "id": resume.id,
                "resume_uuid": resume.resume_uuid,
                "filename": resume.original_filename,
                "file_type": resume.file_type,
                "file_size": resume.file_size,
                "created_at": resume.created_at.isoformat(),
            }
            for resume in resumes
        ]
    }


@router.get("/{resume_uuid}")
def get_resume(
    resume_uuid: str,
    db: Session = Depends(get_db),
):
    """
    Return details for a single stored resume.
    """

    resume = get_resume_by_uuid(
        db=db,
        resume_uuid=resume_uuid,
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    return {
        "id": resume.id,
        "resume_uuid": resume.resume_uuid,
        "filename": resume.original_filename,
        "file_type": resume.file_type,
        "file_size": resume.file_size,
        "file_hash": resume.file_hash,
        "storage_path": resume.storage_path,
        "parsed_text": resume.parsed_text,
        "word_count": resume.word_count,
        "page_count": resume.page_count,
        "text_extractable": resume.text_extractable,
        "is_scanned_image": resume.is_scanned_image,
        "created_at": resume.created_at.isoformat(),
    }


@router.delete("/{resume_uuid}")
def remove_resume(
    resume_uuid: str,
    db: Session = Depends(get_db),
):
    """
    Delete a stored resume and its local file.
    """

    resume = get_resume_by_uuid(
        db=db,
        resume_uuid=resume_uuid,
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    storage_path = Path(resume.storage_path)

    if storage_path.exists():
        storage_path.unlink()

    delete_resume(
        db=db,
        resume=resume,
    )

    return {
        "resume_uuid": resume_uuid,
        "status": "deleted",
    }