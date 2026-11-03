import io

import pymupdf
import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_resume_api_database(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.pop(get_db, None)


def test_resume_list_is_empty_for_a_fresh_database():
    response = client.get("/api/v1/resumes")

    assert response.status_code == 200
    assert response.json() == {"resumes": []}


def create_pdf(text: str) -> bytes:
    document = pymupdf.open()

    page = document.new_page()

    page.insert_text(
        (72, 72),
        text,
    )

    pdf_bytes = document.tobytes()

    document.close()

    return pdf_bytes


def create_docx(text: str) -> bytes:
    document = Document()

    document.add_paragraph(text)

    buffer = io.BytesIO()

    document.save(buffer)

    return buffer.getvalue()


def test_get_resume_includes_parsed_text():
    pdf_bytes = create_pdf(
        "Jane Doe\n"
        "ML Engineer\n"
        "Python PyTorch SQL"
    )

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

    resume_uuid = upload_response.json()["resume_uuid"]

    response = client.get(f"/api/v1/resumes/{resume_uuid}")

    assert response.status_code == 200
    assert "Jane Doe" in response.json()["parsed_text"]
    assert "Python PyTorch SQL" in response.json()["parsed_text"]
    assert response.json()["text_extractable"] is True
    assert response.json()["word_count"] >= 5


def test_upload_pdf():

    pdf_bytes = create_pdf(
        "John Doe\n"
        "Data Scientist\n"
        "Python PyTorch AWS"
    )

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.pdf",
                pdf_bytes,
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "resume.pdf"

    assert "text" in data

    assert "metadata" in data

    assert data["metadata"]["file_type"] == ".pdf"


def test_upload_docx():

    docx_bytes = create_docx(
        "John Doe\n"
        "Machine Learning Engineer\n"
        "Python PyTorch"
    )

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "resume.docx"

    assert data["metadata"]["file_type"] == ".docx"

    assert "Machine Learning Engineer" in data["text"]


def test_upload_unsupported_file():

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.txt",
                b"hello",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == "Only PDF and DOCX files are allowed."
    )


def test_upload_empty_file():

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.pdf",
                b"",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == "Uploaded file is empty."
    )


def test_upload_invalid_content_type():

    pdf_bytes = create_pdf(
        "Test resume"
    )

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.pdf",
                pdf_bytes,
                "text/plain",
            )
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == "Invalid file content type."
    )


def test_upload_file_too_large():

    large_file = b"x" * (
        5 * 1024 * 1024 + 1
    )

    response = client.post(
        "/api/v1/resumes/upload",
        files={
            "file": (
                "resume.pdf",
                large_file,
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == "File size must be below 5 MB."
    )