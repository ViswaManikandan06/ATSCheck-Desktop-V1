from app.modules.ats.models import Scan
from app.modules.tailoring.repository import (
    TailoringRepository,
)
from app.resume.repository import create_resume


def create_test_resume(db_session):
    return create_resume(
        db_session,
        original_filename="resume.pdf",
        storage_path="/Users/test/ATSCheck/resumes/test.pdf",
        file_type="pdf",
        file_size=1024,
        file_hash="a" * 64,
        parsed_text=(
            "John Doe\n"
            "Data Scientist\n"
            "Python PyTorch AWS"
        ),
        word_count=7,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )


def create_test_scan(
    db_session,
    resume,
    job_description="Data Scientist",
):
    scan = Scan(
        resume_id=resume.id,
        job_description=job_description,
        provider_id="mock",
        model_id="mock-model",
    )

    db_session.add(scan)
    db_session.commit()
    db_session.refresh(scan)

    return scan


# =========================================================
# TAILORING SESSIONS
# =========================================================


def test_create_session(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
        job_description=(
            "Looking for a Data Scientist "
            "with Python and PyTorch."
        ),
    )

    repository = TailoringRepository(
        db_session
    )

    session = repository.create_session(
        scan_id=scan.id,
        provider_id="mock",
        model_id="mock-model",
    )

    assert session.id is not None
    assert session.session_uuid is not None

    assert session.scan_id == scan.id
    assert session.provider_id == "mock"
    assert session.model_id == "mock-model"


def test_get_session(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    created = repository.create_session(
        scan_id=scan.id,
        provider_id="mock",
        model_id="mock-model",
    )

    session = repository.get_session(
        created.session_uuid
    )

    assert session is not None
    assert session.id == created.id
    assert session.scan_id == scan.id


def test_get_session_not_found(
    db_session,
):

    repository = TailoringRepository(
        db_session
    )

    session = repository.get_session(
        "does-not-exist"
    )

    assert session is None


def test_list_sessions(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_session(
        scan_id=scan.id,
        provider_id="mock",
        model_id="mock-model",
    )

    repository.create_session(
        scan_id=scan.id,
        provider_id="mock",
        model_id="mock-model",
    )

    sessions = repository.list_sessions()

    assert len(sessions) == 2


def test_list_sessions_by_resume(
    db_session,
):

    resume_1 = create_test_resume(
        db_session
    )

    resume_2 = create_resume(
        db_session,
        original_filename="resume2.pdf",
        storage_path=(
            "/Users/test/ATSCheck/resumes/test2.pdf"
        ),
        file_type="pdf",
        file_size=2048,
        file_hash="b" * 64,
        parsed_text=(
            "John Doe\n"
            "Data Scientist\n"
            "Python PyTorch AWS"
        ),
        word_count=7,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    scan_1 = create_test_scan(
        db_session,
        resume_1,
        job_description="Job 1",
    )

    scan_2 = create_test_scan(
        db_session,
        resume_2,
        job_description="Job 2",
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_session(
        scan_id=scan_1.id,
        provider_id="mock",
        model_id="mock-model",
    )

    repository.create_session(
        scan_id=scan_2.id,
        provider_id="mock",
        model_id="mock-model",
    )

    sessions = repository.list_sessions(
        scan_id=scan_1.id
    )

    assert len(sessions) == 1
    assert sessions[0].scan_id == scan_1.id


# =========================================================
# TAILORING SUGGESTIONS
# =========================================================


def create_test_session(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    session = repository.create_session(
        scan_id=scan.id,
        provider_id="mock",
        model_id="mock-model",
    )

    return repository, session


def test_create_suggestion(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    suggestion = repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text=(
            "Worked on OCR systems."
        ),
        suggested_text=(
            "Developed OCR pipelines "
            "for document processing."
        ),
        reason=(
            "Better alignment with "
            "the job description."
        ),
        matched_job_requirement=(
            "OCR and document processing"
        ),
    )

    assert suggestion.id is not None

    assert suggestion.session_id == session.id

    assert suggestion.type == "experience"

    assert suggestion.action == "replace"

    assert suggestion.source == "experience_match"

    assert suggestion.section == "experience"

    assert (
        suggestion.original_text
        == "Worked on OCR systems."
    )

    assert (
        suggestion.suggested_text
        == (
            "Developed OCR pipelines "
            "for document processing."
        )
    )

    assert (
        suggestion.reason
        == (
            "Better alignment with "
            "the job description."
        )
    )

    assert (
        suggestion.matched_job_requirement
        == "OCR and document processing"
    )

    assert suggestion.status == "pending"


def test_get_suggestion(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    created = repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed machine learning models."
        ),
        reason="Improves clarity.",
        matched_job_requirement=(
            "Machine learning"
        ),
    )

    suggestion = repository.get_suggestion(
        created.id
    )

    assert suggestion is not None
    assert suggestion.id == created.id


def test_get_suggestion_not_found(
    db_session,
):

    repository = TailoringRepository(
        db_session
    )

    suggestion = repository.get_suggestion(
        999999
    )

    assert suggestion is None


def test_list_suggestions(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Bullet 1",
        suggested_text="Improved Bullet 1",
        reason="Better alignment.",
        matched_job_requirement=(
            "Relevant experience"
        ),
    )

    repository.create_suggestion(
        session_id=session.id,
        type="skill",
        action="replace",
        source="skills_match",
        section="skills",
        original_text="Python",
        suggested_text="Python, PyTorch",
        reason="Improves skill visibility.",
        matched_job_requirement="PyTorch",
    )

    suggestions = repository.list_suggestions(
        session.id
    )

    assert len(suggestions) == 2

    assert suggestions[0].type == "experience"
    assert suggestions[0].action == "replace"
    assert suggestions[0].source == "experience_match"

    assert suggestions[1].type == "skill"
    assert suggestions[1].action == "replace"
    assert suggestions[1].source == "skills_match"


def test_count_suggestions(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Bullet 1",
        suggested_text="Improved Bullet 1",
        reason="Better alignment.",
        matched_job_requirement="Experience",
    )

    repository.create_suggestion(
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="",
        suggested_text="PyTorch",
        reason="Missing skill.",
        matched_job_requirement="PyTorch",
    )

    assert (
        repository.count_suggestions(
            session.id
        )
        == 2
    )


# =========================================================
# SUGGESTION STATUS
# =========================================================


def test_update_suggestion_status(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    suggestion = repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed machine learning models."
        ),
        reason="Better wording.",
        matched_job_requirement=(
            "Machine learning"
        ),
    )

    assert suggestion.status == "pending"

    updated = repository.update_suggestion_status(
        suggestion=suggestion,
        status="accepted",
    )

    assert updated.status == "accepted"


def test_update_suggestion_status_rejected(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    suggestion = repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed machine learning models."
        ),
        reason="Better wording.",
        matched_job_requirement=(
            "Machine learning"
        ),
    )

    updated = repository.update_suggestion_status(
        suggestion=suggestion,
        status="rejected",
    )

    assert updated.status == "rejected"


def test_update_accepted_suggestion_again(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    suggestion = repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed machine learning models."
        ),
        reason="Better wording.",
        matched_job_requirement=(
            "Machine learning"
        ),
    )

    repository.update_suggestion_status(
        suggestion=suggestion,
        status="accepted",
    )

    try:
        repository.update_suggestion_status(
            suggestion=suggestion,
            status="rejected",
        )
        assert False, (
            "Expected ValueError when changing "
            "an already decided suggestion."
        )
    except ValueError as exc:
        assert (
            str(exc)
            == "Suggestion has already been decided."
        )


# =========================================================
# RESUME VERSIONS
# =========================================================


def test_create_resume_version(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    version = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Python Data Scientist",
    )

    assert version.id is not None
    assert version.version_uuid is not None

    assert version.resume_id == resume.id
    assert version.scan_id == scan.id

    assert version.version_number == 1

    assert (
        version.content
        == "Python Data Scientist"
    )


def test_get_resume_version(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    version = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Python Developer",
    )

    fetched = repository.get_resume_version(
        version.version_uuid
    )

    assert fetched is not None
    assert fetched.id == version.id


def test_get_resume_version_not_found(
    db_session,
):

    repository = TailoringRepository(
        db_session
    )

    version = repository.get_resume_version(
        "does-not-exist"
    )

    assert version is None


def test_list_resume_versions(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Version 1",
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=2,
        content="Version 2",
    )

    versions = repository.list_resume_versions(
        resume_id=resume.id,
        scan_id=scan.id,
    )

    assert len(versions) == 2

    assert versions[0].version_number == 1
    assert versions[1].version_number == 2


def test_get_latest_resume_version(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Version 1",
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=2,
        content="Version 2",
    )

    latest = repository.get_latest_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
    )

    assert latest is not None
    assert latest.version_number == 2
    assert latest.content == "Version 2"


def test_get_latest_resume_version_empty(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    latest = repository.get_latest_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
    )

    assert latest is None


def test_get_next_version_number(
    db_session,
):

    resume = create_test_resume(
        db_session
    )

    scan = create_test_scan(
        db_session,
        resume,
    )

    repository = TailoringRepository(
        db_session
    )

    assert (
        repository.get_next_version_number(
            resume_id=resume.id,
            scan_id=scan.id,
        )
        == 1
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Version 1",
    )

    assert (
        repository.get_next_version_number(
            resume_id=resume.id,
            scan_id=scan.id,
        )
        == 2
    )


def test_delete_session(
    db_session,
):

    repository, session = create_test_session(
        db_session
    )

    repository.create_suggestion(
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Original",
        suggested_text="Suggested",
        reason="Reason",
        matched_job_requirement=(
            "Relevant experience"
        ),
    )

    session_uuid = session.session_uuid

    repository.delete_session(
        session=session
    )

    assert (
        repository.get_session(
            session_uuid
        )
        is None
    )

    assert (
        repository.list_suggestions(
            session.id
        )
        == []
    )
