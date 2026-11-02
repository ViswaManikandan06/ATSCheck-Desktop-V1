from sqlalchemy.orm import Session

from app.resume.db_models import Resume


def get_resume_by_hash(
    db: Session,
    file_hash: str,
) -> Resume | None:

    return (
        db.query(Resume)
        .filter(
            Resume.file_hash == file_hash
        )
        .first()
    )


def create_resume(
    db: Session,
    *,
    original_filename: str,
    storage_path: str,
    file_type: str,
    file_size: int,
    file_hash: str,
    parsed_text: str,
    word_count: int,
    page_count: int | None,
    text_extractable: bool,
    is_scanned_image: bool,
) -> Resume:

    resume = Resume(
        original_filename=original_filename,
        storage_path=storage_path,
        file_type=file_type,
        file_size=file_size,
        file_hash=file_hash,
        parsed_text=parsed_text,
        word_count=word_count,
        page_count=page_count,
        text_extractable=text_extractable,
        is_scanned_image=is_scanned_image,
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return resume


def get_resume_by_uuid(
    db: Session,
    resume_uuid: str,
) -> Resume | None:

    return (
        db.query(Resume)
        .filter(
            Resume.resume_uuid == resume_uuid
        )
        .first()
    )


def list_resumes(
    db: Session,
) -> list[Resume]:

    return (
        db.query(Resume)
        .order_by(
            Resume.created_at.desc()
        )
        .all()
    )


def delete_resume(
    db: Session,
    resume: Resume,
) -> None:

    db.delete(resume)
    db.commit()