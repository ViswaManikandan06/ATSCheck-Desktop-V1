import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.ats import get_scan_service
from app.core.database import get_db
from app.modules.ats.repository import ScanRepository
from app.resume.repository import create_resume


@pytest.fixture
def client(db_session):
    """
    Test client using the isolated test database.
    """

    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_resume(db_session):
    """
    Create a resume directly in the test database.
    """

    return create_resume(
        db_session,
        original_filename="test_resume.pdf",
        storage_path="/tmp/test_resume.pdf",
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


@pytest.fixture
def test_scan(db_session, test_resume):
    """
    Create a completed scan directly through the repository.
    """

    repository = ScanRepository(db_session)

    scan = repository.create_scan(
        resume_id=test_resume.id,
        job_description="Data Scientist with Python",
        provider_id="mock",
        model_id="mock-model",
    )

    repository.create_result(
        scan_id=scan.id,
        ats_compatibility_score=90,
        resume_structure_score=85,
        analysis={
            "overall_score": 87.5,
            "breakdown": {
                "keyword_match": {
                    "score": 80,
                },
                "skills_match": {
                    "score": 85,
                },
                "experience_relevance": {
                    "score": 90,
                },
                "achievements": {
                    "score": 95,
                },
            },
        },
    )

    repository.complete_scan(
        scan=scan,
        overall_score=87.5,
    )

    return scan


def test_get_scan(client, test_scan):
    """
    Verify a scan can be retrieved by UUID.
    """

    response = client.get(
        f"/api/v1/ats/scans/{test_scan.scan_uuid}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scan_uuid"] == test_scan.scan_uuid
    assert data["status"] == "completed"
    assert data["overall_score"] == 87.5


def test_get_scan_not_found(client):
    """
    Verify an unknown scan UUID returns 404.
    """

    response = client.get(
        "/api/v1/ats/scans/non-existent-scan"
    )

    assert response.status_code == 404


def test_list_scans(client, test_scan):
    """
    Verify scan history can be retrieved.
    """

    response = client.get(
        "/api/v1/ats/scans"
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 1

    scan_uuids = [
        scan["scan_uuid"]
        for scan in data
    ]

    assert test_scan.scan_uuid in scan_uuids


def test_list_scans_by_resume(
    client,
    test_resume,
    test_scan,
):
    """
    Verify scans can be filtered by resume.
    """

    response = client.get(
        "/api/v1/ats/scans",
        params={
            "resume_id": test_resume.id,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)

    assert any(
        scan["scan_uuid"] == test_scan.scan_uuid
        for scan in data
    )


def test_delete_scan(
    client,
    db_session,
    test_scan,
):
    """
    Verify a scan can be deleted.
    """

    scan_uuid = test_scan.scan_uuid

    response = client.delete(
        f"/api/v1/ats/scans/{scan_uuid}"
    )

    assert response.status_code in (200, 204)

    repository = ScanRepository(
        db_session
    )

    scan = repository.get_scan(
        scan_uuid
    )

    assert scan is None


def test_delete_scan_not_found(client):
    """
    Verify deleting an unknown scan returns 404.
    """

    response = client.delete(
        "/api/v1/ats/scans/non-existent-scan"
    )

    assert response.status_code == 404