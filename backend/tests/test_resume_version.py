from app.modules.tailoring.version_models import ResumeVersion
from app.resume.db_models import Resume


def test_create_resume_version(
    db_session,
):
    from app.modules.tailoring.version_models import (
        ResumeVersion,
    )
    from app.resume.db_models import Resume

    resume = Resume(
        resume_uuid="version-test-resume",
        original_filename="resume.pdf",
        storage_path="uploads/resume.pdf",
        file_type=".pdf",
        file_size=1024,
        file_hash="version-test-hash",
        parsed_text="Python Data Scientist",
        word_count=3,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        content="Python Data Scientist",
    )

    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    assert version.id is not None
    assert version.version_uuid is not None
    assert version.resume_id == resume.id
    assert version.version_number == 1
    assert version.content == "Python Data Scientist"
    assert version.storage_path is None
    assert version.created_at is not None


def test_create_first_resume_version(
    db_session,
):
    resume = Resume(
        resume_uuid="version-test-resume-1",
        original_filename="resume.pdf",
        storage_path="uploads/resume.pdf",
        file_type=".pdf",
        file_size=1024,
        file_hash="version-test-hash-1",
        parsed_text="Python Data Scientist",
        word_count=3,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        content="Python Data Scientist",
    )

    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    assert version.id is not None
    assert version.version_uuid is not None
    assert version.resume_id == resume.id
    assert version.version_number == 1
    assert version.content == "Python Data Scientist"


def test_create_second_resume_version(
    db_session,
):
    resume = Resume(
        resume_uuid="version-test-resume-2",
        original_filename="resume.pdf",
        storage_path="uploads/resume.pdf",
        file_type=".pdf",
        file_size=1024,
        file_hash="version-test-hash-2",
        parsed_text="Python Data Scientist",
        word_count=3,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    first_version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        content="Python Data Scientist",
    )

    db_session.add(first_version)
    db_session.commit()

    second_version = ResumeVersion(
        resume_id=resume.id,
        version_number=2,
        content="Python Data Scientist with PyTorch and AWS",
    )

    db_session.add(second_version)
    db_session.commit()
    db_session.refresh(second_version)

    assert second_version.id is not None
    assert second_version.version_uuid is not None
    assert second_version.resume_id == resume.id
    assert second_version.version_number == 2
    assert (
        second_version.content
        == "Python Data Scientist with PyTorch and AWS"
    )

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.resume_id == resume.id
        )
        .order_by(
            ResumeVersion.version_number.asc()
        )
        .all()
    )

    assert len(versions) == 2
    assert versions[0].version_number == 1
    assert versions[1].version_number == 2
