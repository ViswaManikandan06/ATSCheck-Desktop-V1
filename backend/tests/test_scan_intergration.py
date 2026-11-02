import io
import json

import fitz
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.ats import get_llm_service, get_scan_service
from app.core.database import get_db
from app.llm.credentials import CredentialStore
from app.llm.models import (
    Capability,
    ModelInfo,
    ProviderConfig,
    ProviderMetadata,
)
from app.llm.providers.mock import MockProvider
from app.llm.registry import ProviderRegistry
from app.llm.service import LLMService
from app.modules.ats.analysis_service import ATSAnalysisService
from app.modules.ats.llm_service import ATSLLMService
from app.modules.ats.scan_service import ScanService
from app.resume.repository import get_resume_by_uuid


def create_pdf(text: str) -> bytes:

    document = fitz.open()

    page = document.new_page()

    page.insert_text(
        (50, 50),
        text,
    )

    pdf_bytes = document.tobytes()

    document.close()

    return pdf_bytes


@pytest.fixture
def mock_scan_service(db_session):

    responses = {
        "keyword": json.dumps({
            "score": 80,
            "matched_keywords": [
                "Python",
                "AWS",
            ],
            "missing_keywords": [
                "Kubernetes",
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "skill": json.dumps({
            "score": 85,
            "matched_skills": [
                "Python",
                "PyTorch",
                "AWS",
            ],
            "partially_matched_skills": [],
            "missing_skills": [
                "Kubernetes",
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "experience": json.dumps({
            "score": 75,
            "relevant": True,
            "relevant_experience": [
                "Built machine learning models."
            ],
            "partially_relevant_experience": [],
            "missing_experience": [
                "Kubernetes production experience."
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "achievement": json.dumps({
            "score": 90,
            "strong_achievements": [
                "Improved model accuracy by 25%."
            ],
            "weak_achievements": [],
            "missing_achievements": [],
            "evidence": [],
            "recommendations": [],
        }),
    }

    def response_factory(
        messages: list[dict[str, str]],
    ) -> str:

        prompt = messages[-1]["content"].lower()

        if "achievement" in prompt:
            return responses["achievement"]

        if "experience" in prompt:
            return responses["experience"]

        if "keyword" in prompt:
            return responses["keyword"]

        if "skill" in prompt:
            return responses["skill"]

        raise ValueError(
            "Unknown ATS prompt."
        )

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory,
        )

    registry.register(
        provider_id="mock",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock",
            display_name="Mock Provider",
            requires_api_key=False,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(
                ModelInfo(
                    model_id="mock-model",
                    display_name="Mock Model",
                    capabilities=frozenset({
                        Capability.CHAT,
                        Capability.STRUCTURED_OUTPUT,
                    }),
                ),
            ),
        ),
        factory=create_mock_provider,
    )

    credential_store = CredentialStore()

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=credential_store,
    )

    ats_llm_service = ATSLLMService(
        llm_service=llm_service,
    )

    analysis_service = ATSAnalysisService(
        llm_service=ats_llm_service,
    )

    return ScanService(
        db=db_session,
        analysis_service=analysis_service,
    )


@pytest.fixture
def client(
    db_session,
    mock_scan_service,
):

    class MockConfiguredLLMService:

        def build_active_provider_config(self):
            return ProviderConfig(
                provider_id="mock",
                model_id="mock-model",
            )

        def validate_provider_credentials(self, config):
            return None

    def override_db():

        yield db_session

    def override_scan():

        return mock_scan_service

    app.dependency_overrides[
        get_db
    ] = override_db

    app.dependency_overrides[
        get_scan_service
    ] = override_scan

    app.dependency_overrides[
        get_llm_service
    ] = lambda: MockConfiguredLLMService()

    with TestClient(app) as test_client:

        yield test_client

    app.dependency_overrides.clear()


def test_complete_resume_to_scan_workflow(
    client,
    db_session,
):

    # ---------------------------------------------------------
    # 1. Create resume
    # ---------------------------------------------------------

    pdf_bytes = create_pdf(
        "John Doe\n"
        "Data Scientist\n"
        "Python PyTorch AWS\n"
        "Built machine learning models.\n"
        "Improved model accuracy by 25%."
    )

    # ---------------------------------------------------------
    # 2. Upload resume
    # ---------------------------------------------------------

    upload_response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.pdf",
                pdf_bytes,
                "application/pdf",
            )
        },
    )

    assert upload_response.status_code == 200

    upload_data = upload_response.json()

    assert "resume_uuid" in upload_data

    resume_uuid = upload_data[
        "resume_uuid"
    ]

    # ---------------------------------------------------------
    # 3. Verify resume exists in database
    # ---------------------------------------------------------

    resume = get_resume_by_uuid(
        db_session,
        resume_uuid,
    )

    assert resume is not None

    assert (
        resume.original_filename
        == "resume.pdf"
    )

    # ---------------------------------------------------------
    # 4. Create scan
    # ---------------------------------------------------------

    scan_response = client.post(
        "/api/v1/ats/scan",
        json={
            "resume_uuid": resume_uuid,
            "job_description": (
                "Looking for a Data Scientist "
                "with Python, PyTorch, AWS "
                "and Kubernetes experience."
            ),
            "provider_id": "mock",
            "model_id": "mock-model",
        },
    )

    assert scan_response.status_code == 200

    scan_data = scan_response.json()

    # ---------------------------------------------------------
    # 5. Verify API response
    # ---------------------------------------------------------

    assert (
        scan_data["status"]
        == "completed"
    )

    breakdown = scan_data[
        "breakdown"
    ]

    # ---------------------------------------------------------
    # 6. Verify unweighted category scores are omitted
    # ---------------------------------------------------------

    for category in ("keyword_match", "skills_match", "achievements"):
        assert "score" not in breakdown[category]

    # ---------------------------------------------------------
    # 7. Verify heuristic category scores exist
    # ---------------------------------------------------------

    assert (
        0
        <= breakdown[
            "ats_compatibility"
        ]["score"]
        <= 100
    )

    assert (
        0
        <= breakdown[
            "resume_structure"
        ]["score"]
        <= 100
    )

    # ---------------------------------------------------------
    assert scan_data["overall_score"] is None
    assert scan_data["skills_match_percent"] is None
    assert breakdown["skills_match"]["requirement_coverage_percent"] is None

    # ---------------------------------------------------------
    # 9. Verify database state
    # ---------------------------------------------------------

    from app.modules.ats.repository import (
        ScanRepository,
    )

    repository = ScanRepository(
        db_session,
    )

    scan = repository.get_scan(
        scan_data["scan_uuid"],
    )

    assert scan is not None

    assert (
        scan.status
        == "completed"
    )

    assert scan.overall_score is None

    # ---------------------------------------------------------
    # 10. Verify ScanResult
    # ---------------------------------------------------------

    result = repository.get_result(
        scan.id,
    )

    assert result is not None

    assert (
        result.ats_compatibility_score
        >= 0
    )

    assert (
        result.resume_structure_score
        >= 0
    )

    analysis = json.loads(
        result.analysis_json
    )

    assert analysis["overall_score"] is None
