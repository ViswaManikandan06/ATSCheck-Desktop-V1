import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.ats import get_scan_service


class MockScanService:
    """
    Fake ScanService used by API tests.

    This prevents API tests from touching:
    - SQLite resume records
    - local resume files
    - real LLM providers
    """

    async def create_scan(
        self,
        *,
        resume_uuid: str,
        job_description: str,
        llm_config,
    ):

        return {
            "scan_uuid": "test-scan-uuid",
            "status": "completed",
            "overall_score": 82.5,
            "breakdown": {
                "ats_compatibility": {
                    "score": 90,
                },
                "resume_structure": {
                    "score": 85,
                },
                "keyword_match": {
                    "score": 80,
                },
                "skills_match": {
                    "score": 85,
                },
                "experience_relevance": {
                    "score": 75,
                },
                "achievements": {
                    "score": 90,
                },
            },
        }


@pytest.fixture
def client():

    app.dependency_overrides[
        get_scan_service
    ] = lambda: MockScanService()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_create_scan(client):

    response = client.post(
        "/api/v1/ats/scan",
        json={
            "resume_uuid": "test-resume-uuid",
            "job_description": (
                "Looking for a Data Scientist "
                "with Python and PyTorch experience."
            ),
            "provider_id": "mock",
            "model_id": "mock-model",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scan_uuid"] == "test-scan-uuid"
    assert data["status"] == "completed"
    assert data["overall_score"] == 82.5

    assert "breakdown" in data


def test_create_scan_requires_resume_uuid(client):

    response = client.post(
        "/api/v1/ats/scan",
        json={
            "job_description": "Data Scientist",
            "provider_id": "mock",
            "model_id": "mock-model",
        },
    )

    assert response.status_code == 422


def test_create_scan_requires_job_description(client):

    response = client.post(
        "/api/v1/ats/scan",
        json={
            "resume_uuid": "test-resume-uuid",
            "provider_id": "mock",
            "model_id": "mock-model",
        },
    )

    assert response.status_code == 422
