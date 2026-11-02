import pytest

from app.modules.tailoring.models import TailoringSession
from app.modules.tailoring.version_models import ResumeVersion
from app.resume.db_models import Resume


def create_resume(
    db_session,
    *,
    resume_uuid="version-api-resume",
):
    resume = Resume(
        resume_uuid=resume_uuid,
        original_filename="resume.pdf",
        storage_path="uploads/resume.pdf",
        file_type=".pdf",
        file_size=1024,
        file_hash=f"{resume_uuid}-hash",
        parsed_text="Python Developer",
        word_count=2,
        page_count=1,
        text_extractable=True,
        is_scanned_image=False,
    )

    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    return resume


def create_version(
    db_session,
    *,
    resume_id,
    version_number,
    content,
    scan_id=None,
):
    version = ResumeVersion(
        resume_id=resume_id,
        scan_id=scan_id,
        version_number=version_number,
        content=content,
    )

    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    return version


# =========================================================
# LIST VERSIONS
# =========================================================


def test_list_resume_versions(
    client,
    db_session,
):
    resume = create_resume(db_session)

    version_one = create_version(
        db_session,
        resume_id=resume.id,
        version_number=1,
        content="Python Developer",
    )

    version_two = create_version(
        db_session,
        resume_id=resume.id,
        version_number=2,
        content="Python Developer\nML Engineer",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["resume_uuid"] == resume.resume_uuid

    assert len(data["versions"]) == 2

    assert (
        data["versions"][0]["version_uuid"]
        == version_one.version_uuid
    )

    assert (
        data["versions"][0]["version_number"]
        == 1
    )

    assert (
        data["versions"][1]["version_uuid"]
        == version_two.version_uuid
    )

    assert (
        data["versions"][1]["version_number"]
        == 2
    )


# =========================================================
# LIST VERSIONS ORDER
# =========================================================


def test_list_resume_versions_returns_ascending_order(
    client,
    db_session,
):
    resume = create_resume(
        db_session,
        resume_uuid="ordered-version-resume",
    )

    create_version(
        db_session,
        resume_id=resume.id,
        version_number=3,
        content="Version 3",
    )

    create_version(
        db_session,
        resume_id=resume.id,
        version_number=1,
        content="Version 1",
    )

    create_version(
        db_session,
        resume_id=resume.id,
        version_number=2,
        content="Version 2",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions"
    )

    assert response.status_code == 200

    versions = response.json()["versions"]

    assert [
        version["version_number"]
        for version in versions
    ] == [1, 2, 3]


# =========================================================
# LATEST VERSION
# =========================================================


def test_list_resume_versions_without_scan_data(
    client,
    db_session,
):
    resume = create_resume(
        db_session,
        resume_uuid="legacy-version-resume",
    )

    create_version(
        db_session,
        resume_id=resume.id,
        version_number=1,
        content="Original resume",
    )

    response = client.get(
        f"/api/v1/resumes/{resume.resume_uuid}/versions"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["resume_uuid"] == resume.resume_uuid
    assert len(data["versions"]) == 1
    assert data["versions"][0]["scan_uuid"] is None


def test_get_latest_resume_version(
    client,
    db_session,
):
    resume = create_resume(
        db_session,
        resume_uuid="latest-version-resume",
    )

    create_version(
        db_session,
        resume_id=resume.id,
        version_number=1,
        content="Original resume",
    )

    latest = create_version(
        db_session,
        resume_id=resume.id,
        version_number=2,
        content="Tailored resume",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions/latest"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["resume_uuid"] == resume.resume_uuid

    assert (
        data["version"]["version_uuid"]
        == latest.version_uuid
    )

    assert (
        data["version"]["version_number"]
        == 2
    )

    assert (
        data["version"]["content"]
        == "Tailored resume"
    )


# =========================================================
# LATEST VERSION WHEN NONE EXISTS
# =========================================================


def test_get_latest_resume_version_when_none_exists(
    client,
    db_session,
):
    resume = create_resume(
        db_session,
        resume_uuid="no-version-resume",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"{resume.resume_uuid}/versions/latest"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["resume_uuid"] == resume.resume_uuid
    assert data["version"] is None


# =========================================================
# GET SPECIFIC VERSION
# =========================================================


def test_get_resume_version(
    client,
    db_session,
):
    resume = create_resume(
        db_session,
        resume_uuid="specific-version-resume",
    )

    version = create_version(
        db_session,
        resume_id=resume.id,
        version_number=1,
        content="Python Developer",
    )

    response = client.get(
        f"/api/v1/resumes/"
        f"versions/{version.version_uuid}"
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

    assert data["version_number"] == 1

    assert (
        data["content"]
        == "Python Developer"
    )


# =========================================================
# RESUME NOT FOUND
# =========================================================


def test_list_versions_resume_not_found(
    client,
):
    response = client.get(
        "/api/v1/resumes/"
        "does-not-exist/versions"
    )

    assert response.status_code == 404

    assert (
        response.json()["detail"]
        == "Resume not found."
    )


def test_latest_version_resume_not_found(
    client,
):
    response = client.get(
        "/api/v1/resumes/"
        "does-not-exist/versions/latest"
    )

    assert response.status_code == 404

    assert (
        response.json()["detail"]
        == "Resume not found."
    )


# =========================================================
# VERSION NOT FOUND
# =========================================================


def test_get_resume_version_not_found(
    client,
):
    response = client.get(
        "/api/v1/resumes/"
        "versions/does-not-exist"
    )

    assert response.status_code == 404

    assert (
        response.json()["detail"]
        == "Resume version not found."
    )
