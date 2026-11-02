import json

import pytest

from app.llm.models import ProviderConfig
from app.modules.ats.models import Scan, ScanResult
from app.modules.tailoring.models import (
    TailoringSession,
    TailoringSuggestion,
)
from app.modules.tailoring.repository import (
    TailoringRepository,
)
from app.modules.tailoring.service import (
    TailoringService,
    build_tailored_draft,
)
from app.modules.tailoring.version_models import (
    ResumeVersion,
)
from app.resume.db_models import Resume


# =========================================================
# HELPERS
# =========================================================


def test_build_complete_draft_preserves_every_source_entry():
    source = (
        "Candidate Name\nEmail: candidate@example.com\n"
        "Experience\nEngineer | Company | 2020-2022\n"
        "- Delivered outcome A\n- Delivered outcome A\n"
        "Projects\nProject description\nEducation\nDegree, Institute"
    )
    draft, applied = build_tailored_draft(
        source,
        [{
            "action": "replace",
            "section": "experience",
            "original_text": "- Delivered outcome A",
            "suggested_text": "- Delivered outcome A with Python",
        }],
    )

    assert len(applied) == 0
    assert draft == source

    unique_source = source.replace("- Delivered outcome A\n", "", 1)
    draft, applied = build_tailored_draft(
        unique_source,
        [{
            "action": "replace",
            "section": "experience",
            "original_text": "- Delivered outcome A",
            "suggested_text": "- Delivered outcome A with Python",
        }],
    )
    assert len(applied) == 1
    assert "Project description\nEducation\nDegree, Institute" in draft
    assert draft.count("- Delivered outcome A with Python") == 1


def test_build_complete_draft_places_supported_addition_in_section():
    source = "Skills\nPython, SQL\nExperience\nBuilt data tools."
    draft, applied = build_tailored_draft(
        source,
        [{
            "action": "add",
            "section": "skills",
            "original_text": "",
            "suggested_text": "PyTorch",
        }],
    )
    assert len(applied) == 1
    assert draft == "Skills\nPyTorch\nPython, SQL\nExperience\nBuilt data tools."

    duplicate_draft, duplicate_applied = build_tailored_draft(
        draft,
        [{
            "action": "add",
            "section": "skills",
            "original_text": "",
            "suggested_text": "PyTorch",
        }],
    )
    assert duplicate_draft == draft
    assert duplicate_applied == []


def create_test_resume(
    db_session,
    *,
    resume_uuid="test-resume-uuid",
    file_hash="test-hash",
    parsed_text="Python Data Scientist",
):
    resume = Resume(
        resume_uuid=resume_uuid,
        original_filename="resume.pdf",
        storage_path="uploads/resume.pdf",
        file_type=".pdf",
        file_size=1024,
        file_hash=file_hash,
        parsed_text=parsed_text,
        word_count=len(parsed_text.split()),
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    return resume


def create_test_scan(
    db_session,
    *,
    resume_id,
    job_description="Data Scientist",
    provider_id="mock",
    model_id="mock-model",
):
    scan = Scan(
        resume_id=resume_id,
        job_description=job_description,
        provider_id=provider_id,
        model_id=model_id,
        status="completed",
        overall_score=85.0,
    )

    db_session.add(scan)
    db_session.commit()
    db_session.refresh(scan)

    return scan


def create_test_tailoring_session(
    db_session,
    *,
    scan_id,
    provider_id="mock",
    model_id="mock-model",
):
    scan = db_session.query(Scan).filter(Scan.id == scan_id).one()
    latest_version = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.resume_id == scan.resume_id,
            ResumeVersion.scan_id == scan.id,
        )
        .order_by(ResumeVersion.version_number.desc())
        .first()
    )
    base_resume_text = (
        latest_version.content
        if latest_version is not None
        else scan.resume.parsed_text
    )
    session = TailoringSession(
        scan_id=scan_id,
        provider_id=provider_id,
        model_id=model_id,
        base_resume_text=base_resume_text,
        draft_content=base_resume_text,
    )

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)

    return session


def create_test_suggestion(
    db_session,
    *,
    session_id,
    type="experience",
    action="replace",
    source="experience_match",
    section="experience",
    original_text="Built ML models.",
    suggested_text="Built ML models using Python.",
    reason="Better alignment.",
    matched_job_requirement="Python",
    status="pending",
):
    suggestion = TailoringSuggestion(
        session_id=session_id,
        type=type,
        action=action,
        source=source,
        section=section,
        original_text=original_text,
        suggested_text=suggested_text,
        reason=reason,
        matched_job_requirement=matched_job_requirement,
        status=status,
    )

    db_session.add(suggestion)
    db_session.commit()
    db_session.refresh(suggestion)

    return suggestion


# =========================================================
# CREATE TAILORING SESSION
# =========================================================


@pytest.mark.asyncio
async def test_create_tailoring_session(
    db_session,
):
    """
    Verify that tailoring:

    - loads the scan
    - loads the parent resume
    - reuses parsed_text
    - uses the JD stored in the scan
    - creates a tailoring session
    - generates suggestions
    - persists suggestions
    - returns the expected response
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="test-resume-uuid",
        file_hash="test-hash",
        parsed_text=(
            "John Doe\n"
            "Data Scientist\n"
            "Python PyTorch AWS\n"
            "Built machine learning models."
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description=(
            "Looking for a Data Scientist "
            "with Python and Kubernetes."
        ),
    )

    analysis = {
        "breakdown": {
            "skills_match": {
                "matched_skills": ["Python"],
                "partially_matched_skills": [],
                "missing_skills": ["Kubernetes"],
            },
        },
    }
    db_session.add(
        ScanResult(
            scan_id=scan.id,
            ats_compatibility_score=90.0,
            resume_structure_score=85.0,
            analysis_json=json.dumps(analysis),
        )
    )
    db_session.commit()

    class MockLLMService:

        def build_provider_config(
            self,
            provider_id,
            *,
            model_id=None,
        ):
            assert provider_id == "mock"
            assert model_id == "mock-model"

            return ProviderConfig(
                provider_id="mock",
                model_id="mock-model",
            )

    class MockTailoringLLMService:

        async def generate_suggestions(
            self,
            *,
            resume_text,
            job_description,
            provider_id,
            model_id,
            analysis=None,
        ):
            assert resume_text == resume.parsed_text

            assert (
                job_description
                == scan.job_description
            )

            assert provider_id == "mock"
            assert model_id == "mock-model"
            assert analysis == {
                "breakdown": {
                    "skills_match": {
                        "matched_skills": ["Python"],
                        "partially_matched_skills": [],
                        "missing_skills": ["Kubernetes"],
                    },
                },
            }

            return [
                {
                    "type": "experience",
                    "action": "replace",
                    "source": "experience_match",
                    "section": "experience",
                    "original_text": (
                        "Built machine learning models."
                    ),
                    "suggested_text": (
                        "Built machine learning models "
                        "using Python and PyTorch."
                    ),
                    "reason": (
                        "Better highlights skills "
                        "relevant to the target role."
                    ),
                    "matched_job_requirement": (
                        "Python and machine learning"
                    ),
                },
                {
                    "type": "skill",
                    "action": "add",
                    "source": "skills_match",
                    "section": "skills",
                    "original_text": "",
                    "suggested_text": "PyTorch",
                    "reason": (
                        "PyTorch is relevant to "
                        "the target role."
                    ),
                    "matched_job_requirement": (
                        "Python and PyTorch experience"
                    ),
                },
            ]

    service = TailoringService(
        db=db_session,
        llm_service=MockLLMService(),
        tailoring_llm_service=(
            MockTailoringLLMService()
        ),
    )

    result = await service.create_session(
        scan_uuid=scan.scan_uuid,
    )

    assert "session_uuid" in result

    assert (
        result["scan_uuid"]
        == scan.scan_uuid
    )

    assert (
        result["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        result["job_description"]
        == scan.job_description
    )

    assert (
        result["provider_id"]
        == "mock"
    )

    assert (
        result["model_id"]
        == "mock-model"
    )

    suggestions = result["suggestions"]

    assert len(suggestions) == 1
    assert "Built machine learning models using Python and PyTorch." in result["draft_content"]
    assert "PyTorch" in result["accepted_draft_content"]
    assert result["change_summary"] == [
        "experience: Python and machine learning",
    ]

    first = suggestions[0]

    assert first["type"] == "experience"
    assert first["action"] == "replace"
    assert first["source"] == "experience_match"
    assert first["section"] == "experience"

    assert (
        first["original_text"]
        == "Built machine learning models."
    )

    assert (
        "Python and PyTorch"
        in first["suggested_text"]
    )

    assert (
        first["matched_job_requirement"]
        == "Python and machine learning"
    )

    assert first["status"] == "pending"

    session = (
        db_session.query(TailoringSession)
        .filter(
            TailoringSession.session_uuid
            == result["session_uuid"]
        )
        .first()
    )

    assert session is not None

    assert (
        session.scan_id
        == scan.id
    )

    saved_suggestions = (
        db_session.query(TailoringSuggestion)
        .filter(
            TailoringSuggestion.session_id
            == session.id
        )
        .all()
    )

    assert len(saved_suggestions) == 1


# =========================================================
# CREATE SESSION — SCAN NOT FOUND
# =========================================================


@pytest.mark.asyncio
async def test_create_tailoring_session_scan_not_found(
    db_session,
):
    class MockLLMService:

        def build_provider_config(
            self,
            provider_id,
        ):
            raise AssertionError(
                "Provider should not be resolved."
            )

    class MockTailoringLLMService:

        async def generate_suggestions(
            self,
            **kwargs,
        ):
            raise AssertionError(
                "LLM should not be called."
            )

    service = TailoringService(
        db=db_session,
        llm_service=MockLLMService(),
        tailoring_llm_service=(
            MockTailoringLLMService()
        ),
    )

    with pytest.raises(
        ValueError,
        match="Scan not found",
    ):
        await service.create_session(
            scan_uuid="does-not-exist",
        )


# =========================================================
# CREATE SESSION — RESUME NOT FOUND
# =========================================================


@pytest.mark.asyncio
async def test_create_tailoring_session_resume_not_found(
    db_session,
):
    scan = Scan(
        resume_id=999999,
        job_description="Data Scientist",
        provider_id="mock",
        model_id="mock-model",
        status="completed",
        overall_score=80.0,
    )

    db_session.add(scan)
    db_session.commit()
    db_session.refresh(scan)

    class MockLLMService:

        def build_provider_config(
            self,
            provider_id,
        ):
            raise AssertionError(
                "Provider should not be resolved."
            )

    class MockTailoringLLMService:

        async def generate_suggestions(
            self,
            **kwargs,
        ):
            raise AssertionError(
                "LLM should not be called."
            )

    service = TailoringService(
        db=db_session,
        llm_service=MockLLMService(),
        tailoring_llm_service=(
            MockTailoringLLMService()
        ),
    )

    with pytest.raises(
        ValueError,
        match="Resume not found",
    ):
        await service.create_session(
            scan_uuid=scan.scan_uuid,
        )


# =========================================================
# CREATE SESSION — EMPTY PARSED TEXT
# =========================================================


@pytest.mark.asyncio
async def test_create_tailoring_session_empty_parsed_text(
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="empty-text-resume",
        file_hash="empty-hash",
        parsed_text="",
    )

    resume.text_extractable = False
    resume.is_scanned_image = True

    db_session.commit()

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Data Scientist",
    )

    class MockLLMService:

        def build_provider_config(
            self,
            provider_id,
        ):
            raise AssertionError(
                "Provider should not be resolved."
            )

    class MockTailoringLLMService:

        async def generate_suggestions(
            self,
            **kwargs,
        ):
            raise AssertionError(
                "LLM should not be called."
            )

    service = TailoringService(
        db=db_session,
        llm_service=MockLLMService(),
        tailoring_llm_service=(
            MockTailoringLLMService()
        ),
    )

    with pytest.raises(
        ValueError,
        match="extractable text",
    ):
        await service.create_session(
            scan_uuid=scan.scan_uuid,
        )


# =========================================================
# UPDATE SUGGESTION STATUS
# =========================================================


def test_update_suggestion_status(
    client,
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="status-test-resume",
        file_hash="status-test-hash",
        parsed_text="Built ML models.",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
    )

    response = client.patch(
        f"/api/v1/tailoring/suggestions/"
        f"{suggestion.id}/status",
        json={
            "status": "accepted",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == suggestion.id
    assert data["status"] == "accepted"
    assert data["draft_content"] == "Built ML models using Python."
    assert data["accepted_draft_content"] == "Built ML models using Python."

    db_session.refresh(suggestion)

    assert suggestion.status == "accepted"

    response = client.patch(
        f"/api/v1/tailoring/suggestions/{suggestion.id}/status",
        json={"status": "rejected"},
    )
    assert response.status_code == 200
    assert response.json()["draft_content"] == "Built ML models."
    assert response.json()["accepted_draft_content"] == "Built ML models."


def test_update_suggestion_status_rejected(
    client,
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="reject-test-resume",
        file_hash="reject-test-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="replace",
        source="skills_match",
        section="skills",
        original_text="Python, AWS",
        suggested_text="Python, AWS, PyTorch",
        reason="Better skill alignment.",
        matched_job_requirement="PyTorch",
    )

    response = client.patch(
        f"/api/v1/tailoring/suggestions/"
        f"{suggestion.id}/status",
        json={
            "status": "rejected",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == suggestion.id
    assert data["status"] == "rejected"

    db_session.refresh(suggestion)

    assert suggestion.status == "rejected"


def test_update_suggestion_status_invalid(
    client,
):
    response = client.patch(
        "/api/v1/tailoring/suggestions/1/status",
        json={
            "status": "invalid",
        },
    )

    assert response.status_code == 422


# =========================================================
# GET TAILORING SESSION
# =========================================================


def test_get_tailoring_session(
    client,
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="get-session-resume",
        file_hash="get-session-hash",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description=(
            "Looking for a Data Scientist "
            "with Python and PyTorch."
        ),
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    first_suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
    )

    second_suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="Python, AWS",
        suggested_text="Python, AWS, PyTorch",
        reason="Adds a relevant required skill.",
        matched_job_requirement="PyTorch",
        status="accepted",
    )

    response = client.get(
        f"/api/v1/tailoring/sessions/"
        f"{session.session_uuid}",
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["session_uuid"]
        == session.session_uuid
    )

    assert (
        data["scan_uuid"]
        == scan.scan_uuid
    )

    assert (
        data["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        data["job_description"]
        == scan.job_description
    )

    assert data["provider_id"] == "mock"
    assert data["model_id"] == "mock-model"
    assert data["base_resume_text"] == resume.parsed_text
    assert data["draft_content"]
    assert data["accepted_draft_content"] == resume.parsed_text

    assert len(data["suggestions"]) == 2

    first = data["suggestions"][0]

    assert first["id"] == first_suggestion.id
    assert first["type"] == "experience"
    assert first["action"] == "replace"
    assert first["source"] == "experience_match"
    assert first["section"] == "experience"

    assert (
        first["original_text"]
        == "Built ML models."
    )

    assert (
        first["suggested_text"]
        == "Built ML models using Python."
    )

    assert (
        first["matched_job_requirement"]
        == "Python"
    )

    assert first["status"] == "pending"

    second = data["suggestions"][1]

    assert second["id"] == second_suggestion.id
    assert second["type"] == "skill"
    assert second["action"] == "add"
    assert second["source"] == "skills_match"
    assert second["section"] == "skills"

    assert (
        second["original_text"]
        == "Python, AWS"
    )

    assert (
        second["suggested_text"]
        == "Python, AWS, PyTorch"
    )

    assert second["status"] == "accepted"


def test_get_tailoring_session_not_found(
    client,
):
    response = client.get(
        "/api/v1/tailoring/sessions/"
        "does-not-exist",
    )

    assert response.status_code == 404

    data = response.json()

    assert (
        data["detail"]
        == "Tailoring session not found."
    )


# =========================================================
# SUGGESTION CANNOT BE DECIDED TWICE
# =========================================================


def test_user_can_revise_accepted_suggestion(
    client,
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="accepted-again-resume",
        file_hash="accepted-again-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
        status="accepted",
    )

    response = client.patch(
        f"/api/v1/tailoring/suggestions/"
        f"{suggestion.id}/status",
        json={
            "status": "rejected",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    db_session.refresh(suggestion)

    assert suggestion.status == "rejected"


def test_user_can_revise_rejected_suggestion(
    client,
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="rejected-again-resume",
        file_hash="rejected-again-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    suggestion = create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="Python",
        suggested_text="Python, PyTorch",
        reason="Adds relevant skill.",
        matched_job_requirement="PyTorch",
        status="rejected",
    )

    response = client.patch(
        f"/api/v1/tailoring/suggestions/"
        f"{suggestion.id}/status",
        json={
            "status": "accepted",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"

    db_session.refresh(suggestion)

    assert suggestion.status == "accepted"


# =========================================================
# RESUME VERSION REPOSITORY
# =========================================================


def test_create_resume_version(
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="version-test-resume",
        file_hash="version-test-hash",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    version = repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content="Python Data Scientist",
    )

    assert version.id is not None
    assert version.version_uuid is not None
    assert version.scan_id == scan.id
    assert version.resume_id == resume.id
    assert version.version_number == 1
    assert version.content == "Python Data Scientist"
    assert version.storage_path is None


def test_get_resume_version(
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="get-version-resume",
        file_hash="get-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    version = repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content="Python Developer",
    )

    fetched = repository.get_resume_version(
        version.version_uuid
    )

    assert fetched is not None
    assert fetched.id == version.id
    assert (
        fetched.version_uuid
        == version.version_uuid
    )
    assert fetched.scan_id == scan.id
    assert fetched.content == "Python Developer"


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
        db_session,
        resume_uuid="list-version-resume",
        file_hash="list-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content="Version 1",
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=2,
        content="Version 2",
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=3,
        content="Version 3",
    )

    versions = repository.list_resume_versions(
        resume_id=resume.id,
        scan_id=scan.id,
    )

    assert len(versions) == 3

    assert versions[0].version_number == 1
    assert versions[1].version_number == 2
    assert versions[2].version_number == 3


def test_get_latest_resume_version(
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="latest-version-resume",
        file_hash="latest-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content="Version 1",
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
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
        db_session,
        resume_uuid="empty-version-resume",
        file_hash="empty-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
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
        db_session,
        resume_uuid="next-version-resume",
        file_hash="next-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
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
        scan_id=scan.id,
        resume_id=resume.id,
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

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=2,
        content="Version 2",
    )

    assert (
        repository.get_next_version_number(
            resume_id=resume.id,
            scan_id=scan.id,
        )
        == 3
    )


# =========================================================
# SAVE TAILORING CHANGES
# =========================================================


def test_save_tailoring_changes_creates_one_new_version(
    db_session,
):
    """
    Verify that multiple accepted suggestions are applied
    and saved as exactly one new resume version.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="save-multiple-resume",
        file_hash="save-multiple-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models.\n"
            "AWS"
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using Python."
        ),
        reason="Better alignment.",
        matched_job_requirement="Python",
        status="accepted",
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="",
        suggested_text="PyTorch",
        reason="Relevant skill.",
        matched_job_requirement="PyTorch",
        status="accepted",
    )

    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    result = service.save_tailoring_changes(
        session_uuid=session.session_uuid,
    )

    assert (
        result["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        result["scan_uuid"]
        == scan.scan_uuid
    )

    assert result["version_number"] == 1
    assert result["accepted_suggestion_count"] == 2

    assert (
        "Developed ML models using Python."
        in result["content"]
    )

    assert "PyTorch" in result["content"]

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .all()
    )

    assert len(versions) == 1

    repeated_result = service.save_tailoring_changes(
        session_uuid=session.session_uuid,
        content=result["content"],
    )
    assert repeated_result["version_uuid"] == result["version_uuid"]
    assert len(
        db_session.query(ResumeVersion)
        .filter(ResumeVersion.scan_id == scan.id)
        .all()
    ) == 1


def test_save_tailoring_changes_rejects_content_not_matching_decisions(
    db_session,
):
    resume = create_test_resume(
        db_session,
        resume_uuid="save-mismatch-resume",
        file_hash="save-mismatch-hash",
        parsed_text="Python Developer\nBuilt ML models.",
    )
    scan = create_test_scan(db_session, resume_id=resume.id)
    session = create_test_tailoring_session(db_session, scan_id=scan.id)
    create_test_suggestion(
        db_session,
        session_id=session.id,
        original_text="Built ML models.",
        suggested_text="Developed ML models using Python.",
        status="accepted",
    )
    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    with pytest.raises(ValueError, match="does not match accepted suggestions"):
        service.save_tailoring_changes(
            session_uuid=session.session_uuid,
            content="A different resume draft",
        )

    assert db_session.query(ResumeVersion).filter(
        ResumeVersion.scan_id == scan.id
    ).count() == 0


def test_save_tailoring_changes_ignores_rejected_suggestions(
    db_session,
):
    """
    Verify that rejected suggestions are not applied.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="save-rejected-resume",
        file_hash="save-rejected-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using Python."
        ),
        reason="Better alignment.",
        matched_job_requirement="Python",
        status="accepted",
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="",
        suggested_text="Kubernetes",
        reason="Rejected skill.",
        matched_job_requirement="Kubernetes",
        status="rejected",
    )

    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    result = service.save_tailoring_changes(
        session_uuid=session.session_uuid,
    )

    assert (
        "Developed ML models using Python."
        in result["content"]
    )

    assert "Kubernetes" not in result["content"]

    assert result["accepted_suggestion_count"] == 1


def test_save_tailoring_changes_requires_accepted_suggestion(
    db_session,
):
    """
    Verify that saving fails when no suggestions
    have been accepted.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="save-none-resume",
        file_hash="save-none-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="",
        suggested_text="PyTorch",
        reason="Relevant skill.",
        matched_job_requirement="PyTorch",
        status="rejected",
    )

    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    with pytest.raises(
        ValueError,
        match="No accepted suggestions to save.",
    ):
        service.save_tailoring_changes(
            session_uuid=session.session_uuid,
        )

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .all()
    )

    assert len(versions) == 0


def test_save_tailoring_changes_preserves_previous_version(
    db_session,
):
    """
    Verify that saving changes creates a new version
    without modifying the previous version.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="save-version-resume",
        file_hash="save-version-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    first_version = repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using Python."
        ),
        reason="Better alignment.",
        matched_job_requirement="Python",
        status="accepted",
    )

    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    result = service.save_tailoring_changes(
        session_uuid=session.session_uuid,
        commit_message="Refined experience and added Python proof points.",
    )

    assert result["version_number"] == 2
    assert (
        result["commit_message"]
        == "Refined experience and added Python proof points."
    )

    db_session.refresh(first_version)

    assert (
        first_version.content
        == (
            "Python Developer\n"
            "Built ML models."
        )
    )

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .order_by(
            ResumeVersion.version_number.asc()
        )
        .all()
    )

    assert len(versions) == 2

    assert versions[0].version_number == 1
    assert versions[1].version_number == 2
    assert (
        versions[1].commit_message
        == "Refined experience and added Python proof points."
    )

    assert (
        versions[1].content
        != versions[0].content
    )


# =========================================================
# CROSS-SCAN VERSION ISOLATION
# =========================================================


def test_save_tailoring_changes_does_not_use_version_from_another_scan(
    db_session,
):
    """
    Critical architecture test.

    A resume can have multiple scans for different JDs.

    Scan A:
        Data Scientist

    Scan B:
        ML Engineer

    Scan B tailoring must NOT use Scan A's version.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="cross-scan-resume",
        file_hash="cross-scan-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    scan_a = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Data Scientist",
    )

    scan_b = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="ML Engineer",
    )

    repository = TailoringRepository(
        db_session
    )

    # Version belonging to Scan A.
    repository.create_resume_version(
        scan_id=scan_a.id,
        resume_id=resume.id,
        version_number=1,
        content=(
            "Python Developer\n"
            "Built ML models.\n"
            "Data Science Version"
        ),
    )

    session_b = create_test_tailoring_session(
        db_session,
        scan_id=scan_b.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session_b.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using PyTorch."
        ),
        reason="Better ML alignment.",
        matched_job_requirement="PyTorch",
        status="accepted",
    )

    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    result = service.save_tailoring_changes(
        session_uuid=session_b.session_uuid,
    )

    assert result["scan_uuid"] == scan_b.scan_uuid

    assert result["version_number"] == 1

    assert (
        "Developed ML models using PyTorch."
        in result["content"]
    )

    # Critical assertion:
    # Scan A content must not leak into Scan B.
    assert (
        "Data Science Version"
        not in result["content"]
    )

    versions_a = repository.list_resume_versions(
        resume_id=resume.id,
        scan_id=scan_a.id,
    )

    versions_b = repository.list_resume_versions(
        resume_id=resume.id,
        scan_id=scan_b.id,
    )

    assert len(versions_a) == 1
    assert len(versions_b) == 1

    assert (
        versions_a[0].version_number
        == 1
    )

    assert (
        versions_b[0].version_number
        == 1
    )


# =========================================================
# SAVE TAILORING — MISSING SESSION
# =========================================================


def test_save_tailoring_changes_missing_session(
    db_session,
):
    service = TailoringService(
        db=db_session,
        llm_service=None,
        tailoring_llm_service=None,
    )

    with pytest.raises(
        ValueError,
        match="Tailoring session not found.",
    ):
        service.save_tailoring_changes(
            session_uuid="does-not-exist",
        )
# =========================================================
# SAVE TAILORING CHANGES — API
# =========================================================


def test_save_tailoring_changes_api(
    client,
    db_session,
):
    """
    Verify that the save endpoint:

    - finds the tailoring session
    - applies accepted suggestions
    - creates exactly one resume version
    - returns the created version
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-save-resume",
        file_hash="api-save-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Data Scientist",
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using Python."
        ),
        reason="Better alignment.",
        matched_job_requirement="Python",
        status="accepted",
    )

    response = client.post(
        f"/api/v1/tailoring/sessions/"
        f"{session.session_uuid}/save",
        json={
            "content": (
                "Python Developer\n"
                "Developed ML models using Python."
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        data["scan_uuid"]
        == scan.scan_uuid
    )

    assert data["version_number"] == 1

    assert (
        data["accepted_suggestion_count"]
        == 1
    )

    assert (
        "Developed ML models using Python."
        in data["content"]
    )

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .all()
    )

    assert len(versions) == 1

    assert versions[0].version_number == 1

    repeated = client.post(
        f"/api/v1/tailoring/sessions/{session.session_uuid}/save",
        json={"content": data["content"]},
    )
    assert repeated.status_code == 200
    assert repeated.json()["version_uuid"] == data["version_uuid"]


def test_save_tailoring_changes_api_no_accepted_suggestions(
    client,
    db_session,
):
    """
    Verify that the API returns 400 when
    there are no accepted suggestions.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-save-none-resume",
        file_hash="api-save-none-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="skill",
        action="add",
        source="skills_match",
        section="skills",
        original_text="",
        suggested_text="PyTorch",
        reason="Relevant skill.",
        matched_job_requirement="PyTorch",
        status="rejected",
    )

    response = client.post(
        f"/api/v1/tailoring/sessions/"
        f"{session.session_uuid}/save",
        json={"content": "Python Developer"},
    )

    assert response.status_code == 400

    data = response.json()

    assert (
        data["detail"]
        == "No accepted suggestions to save."
    )

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .all()
    )

    assert len(versions) == 0


def test_save_tailoring_changes_api_session_not_found(
    client,
):
    """
    Verify that saving a non-existent
    tailoring session returns 400.
    """

    response = client.post(
        "/api/v1/tailoring/sessions/"
        "does-not-exist/save",
        json={"content": "A resume"},
    )

    assert response.status_code == 400

    data = response.json()

    assert (
        data["detail"]
        == "Tailoring session not found."
    )


def test_save_tailoring_changes_api_creates_next_version(
    client,
    db_session,
):
    """
    Verify that the API creates the next version
    when a previous version already exists.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-next-version-resume",
        file_hash="api-next-version-hash",
        parsed_text=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        scan_id=scan.id,
        resume_id=resume.id,
        version_number=1,
        content=(
            "Python Developer\n"
            "Built ML models."
        ),
    )

    session = create_test_tailoring_session(
        db_session,
        scan_id=scan.id,
    )

    create_test_suggestion(
        db_session,
        session_id=session.id,
        type="experience",
        action="replace",
        source="experience_match",
        section="experience",
        original_text="Built ML models.",
        suggested_text=(
            "Developed ML models using Python."
        ),
        reason="Better alignment.",
        matched_job_requirement="Python",
        status="accepted",
    )

    response = client.post(
        f"/api/v1/tailoring/sessions/"
        f"{session.session_uuid}/save",
        json={
            "content": (
                "Python Developer\n"
                "Developed ML models using Python."
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["version_number"] == 2

    versions = (
        db_session.query(ResumeVersion)
        .filter(
            ResumeVersion.scan_id
            == scan.id
        )
        .order_by(
            ResumeVersion.version_number.asc()
        )
        .all()
    )

    assert len(versions) == 2

    assert versions[0].version_number == 1
    assert versions[1].version_number == 2

    assert (
        versions[0].content
        == (
            "Python Developer\n"
            "Built ML models."
        )
    )

    assert (
        "Developed ML models using Python."
        in versions[1].content
    )

# =========================================================
# RESUME VERSION API
# =========================================================


def test_list_resume_versions_api(
    client,
    db_session,
):
    """
    Verify that the API returns all resume versions
    belonging to a resume.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-list-version-resume",
        file_hash="api-list-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Python Developer",
    )

    repository = TailoringRepository(
        db_session
    )

    first = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Python Developer",
    )

    second = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=2,
        content="Python Developer with AWS",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["resume_uuid"] == resume.resume_uuid

    assert len(data["versions"]) == 2

    first_response = data["versions"][0]

    assert (
        first_response["version_uuid"]
        == first.version_uuid
    )

    assert (
        first_response["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        first_response["version_number"]
        == 1
    )

    assert (
        first_response["content"]
        == "Python Developer"
    )

    assert (
        first_response["storage_path"]
        is None
    )

    second_response = data["versions"][1]

    assert (
        second_response["version_uuid"]
        == second.version_uuid
    )

    assert (
        second_response["version_number"]
        == 2
    )

    assert (
        second_response["content"]
        == "Python Developer with AWS"
    )


def test_list_resume_versions_api_resume_not_found(
    client,
):
    """
    Verify that listing versions for a non-existent
    resume returns 404.
    """

    response = client.get(
        "/api/v1/resumes/"
        "does-not-exist/versions"
    )

    assert response.status_code == 404

    data = response.json()

    assert (
        data["detail"]
        == "Resume not found."
    )


def test_get_latest_resume_version_api(
    client,
    db_session,
):
    """
    Verify that the API returns the latest version
    of a resume.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-latest-version-resume",
        file_hash="api-latest-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Data Scientist",
    )

    repository = TailoringRepository(
        db_session
    )

    repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Python Developer",
    )

    latest = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=2,
        content=(
            "Python Developer with "
            "Machine Learning and AWS"
        ),
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions/latest"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["resume_uuid"] == resume.resume_uuid

    assert data["version"] is not None

    version = data["version"]

    assert (
        version["version_uuid"]
        == latest.version_uuid
    )

    assert (
        version["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        version["version_number"]
        == 2
    )

    assert (
        version["content"]
        == (
            "Python Developer with "
            "Machine Learning and AWS"
        )
    )


def test_get_latest_resume_version_api_empty(
    client,
    db_session,
):
    """
    Verify that the latest-version API returns
    null when the resume has no versions.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-empty-latest-resume",
        file_hash="api-empty-latest-hash",
        parsed_text="Python Developer",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions/latest"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["resume_uuid"]
        == resume.resume_uuid
    )

    assert data["version"] is None


def test_get_latest_resume_version_api_resume_not_found(
    client,
):
    """
    Verify that latest-version lookup for a
    non-existent resume returns 404.
    """

    response = client.get(
        "/api/v1/resumes/"
        "does-not-exist/versions/latest"
    )

    assert response.status_code == 404

    data = response.json()

    assert (
        data["detail"]
        == "Resume not found."
    )


def test_get_resume_version_api(
    client,
    db_session,
):
    """
    Verify that the API returns one resume version
    by version UUID.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-get-version-resume",
        file_hash="api-get-version-hash",
        parsed_text="Python Developer",
    )

    scan = create_test_scan(
        db_session,
        resume_id=resume.id,
    )

    repository = TailoringRepository(
        db_session
    )

    version = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan.id,
        version_number=1,
        content="Python Developer with PyTorch",
    )

    response = client.get(
        f"/api/v1/resumes/versions/"
        f"{version.version_uuid}"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["version_uuid"]
        == version.version_uuid
    )

    assert (
        data["resume_uuid"]
        == resume.resume_uuid
    )

    assert (
        data["version_number"]
        == 1
    )

    assert (
        data["content"]
        == "Python Developer with PyTorch"
    )

    assert (
        data["storage_path"]
        is None
    )


def test_get_resume_version_api_not_found(
    client,
):
    """
    Verify that requesting a non-existent
    resume version returns 404.
    """

    response = client.get(
        "/api/v1/resumes/versions/"
        "does-not-exist"
    )

    assert response.status_code == 404

    data = response.json()

    assert (
        data["detail"]
        == "Resume version not found."
    )


def test_resume_version_api_isolated_between_scans(
    client,
    db_session,
):
    """
    Critical architecture test.

    A resume can have versions belonging to
    different scans.

    The general resume-version API should return
    the versions belonging to the resume, while
    the stored scan context remains independent.
    """

    resume = create_test_resume(
        db_session,
        resume_uuid="api-scan-isolation-resume",
        file_hash="api-scan-isolation-hash",
        parsed_text="Python Developer",
    )

    scan_a = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="Data Scientist",
    )

    scan_b = create_test_scan(
        db_session,
        resume_id=resume.id,
        job_description="ML Engineer",
    )

    repository = TailoringRepository(
        db_session
    )

    version_a = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan_a.id,
        version_number=1,
        content="Data Scientist Resume",
    )

    version_b = repository.create_resume_version(
        resume_id=resume.id,
        scan_id=scan_b.id,
        version_number=1,
        content="ML Engineer Resume",
    )

    response_a = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions"
    )

    assert response_a.status_code == 200

    data = response_a.json()

    assert len(data["versions"]) == 2

    version_uuids = {
        version["version_uuid"]
        for version in data["versions"]
    }

    assert version_a.version_uuid in version_uuids
    assert version_b.version_uuid in version_uuids

    response_version_a = client.get(
        f"/api/v1/resumes/versions/"
        f"{version_a.version_uuid}"
    )

    assert response_version_a.status_code == 200

    assert (
        response_version_a.json()["content"]
        == "Data Scientist Resume"
    )

    response_version_b = client.get(
        f"/api/v1/resumes/versions/"
        f"{version_b.version_uuid}"
    )

    assert response_version_b.status_code == 200

    assert (
        response_version_b.json()["content"]
        == "ML Engineer Resume"
    )
