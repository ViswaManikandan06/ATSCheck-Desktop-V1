import io

import pymupdf
import pytest
from docx import Document

from app.resume.parser import parse_resume
from app.resume.extractor import _normalize_extracted_text


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


def test_parse_pdf():

    pdf_bytes = create_pdf(
        "John Doe\n"
        "Data Scientist\n"
        "Python PyTorch AWS"
    )

    result = parse_resume(
        filename="resume.pdf",
        file_bytes=pdf_bytes,
    )

    assert result.filename == "resume.pdf"

    assert result.metadata.file_type == ".pdf"

    assert result.metadata.page_count == 1

    assert result.metadata.text_extractable is True

    assert result.metadata.is_scanned_image is False

    assert "Data Scientist" in result.text


def test_parse_docx():

    docx_bytes = create_docx(
        "John Doe\n"
        "Machine Learning Engineer\n"
        "Python PyTorch"
    )

    result = parse_resume(
        filename="resume.docx",
        file_bytes=docx_bytes,
    )

    assert result.filename == "resume.docx"

    assert result.metadata.file_type == ".docx"

    assert result.metadata.text_extractable is True

    assert "Machine Learning Engineer" in result.text


def test_parse_docx_preserves_tables_headers_and_footers():
    document = Document()
    document.sections[0].header.paragraphs[0].text = "Candidate contact details"
    document.add_paragraph("Experience")
    table = document.add_table(rows=1, cols=2)
    table.cell(0, 0).text = "Research Engineer"
    table.cell(0, 1).text = "Example Labs"
    document.add_paragraph("- Preserved achievement bullet")
    document.sections[0].footer.paragraphs[0].text = "Publication details"

    buffer = io.BytesIO()
    document.save(buffer)

    result = parse_resume(
        filename="complete-resume.docx",
        file_bytes=buffer.getvalue(),
    )

    assert "Candidate contact details" in result.text
    assert "Research Engineer | Example Labs" in result.text
    assert "Preserved achievement bullet" in result.text
    assert "Publication details" in result.text


def test_file_hash_is_generated():

    content = create_pdf(
        "Test resume"
    )

    result = parse_resume(
        filename="resume.pdf",
        file_bytes=content,
    )

    assert len(
        result.metadata.file_hash
    ) == 64


def test_word_count():

    content = create_pdf(
        "Python Data Scientist AWS"
    )

    result = parse_resume(
        filename="resume.pdf",
        file_bytes=content,
    )

    assert result.metadata.word_count >= 4


def test_empty_file_is_rejected():

    with pytest.raises(
        ValueError,
        match="Uploaded file is empty",
    ):
        parse_resume(
            filename="resume.pdf",
            file_bytes=b"",
        )


def test_unsupported_file_is_rejected():

    with pytest.raises(
        ValueError,
        match="Only PDF and DOCX",
    ):
        parse_resume(
            filename="resume.txt",
            file_bytes=b"hello",
        )


def test_missing_filename_is_rejected():

    with pytest.raises(
        ValueError,
        match="Filename is required",
    ):
        parse_resume(
            filename="",
            file_bytes=b"hello",
        )


def test_pdf_with_text_is_not_scanned():

    pdf_bytes = create_pdf(
        "This PDF contains selectable text."
    )

    result = parse_resume(
        filename="resume.pdf",
        file_bytes=pdf_bytes,
    )

    assert result.metadata.is_scanned_image is False


def test_pdf_extraction_keeps_side_by_side_fields_readable():
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((28, 72), "Example Labs")
    page.insert_text((420, 72), "Jan 2021 - Present")
    page.insert_text((28, 92), "Research Engineer")
    page.insert_text((420, 92), "Austin, TX")
    pdf_bytes = document.tobytes()
    document.close()

    result = parse_resume(
        filename="resume.pdf",
        file_bytes=pdf_bytes,
    )

    assert "Example Labs | Jan 2021 - Present" in result.text
    assert "Research Engineer | Austin, TX" in result.text


def test_pdf_extraction_removes_control_characters():
    result = parse_resume(
        filename="resume.pdf",
        file_bytes=create_pdf("Jane Doe\nEmail: jane@example.com"),
    )

    assert not any(ord(character) < 32 and character not in "\n\t" for character in result.text)


def test_text_normalization_removes_contact_icons_and_preserves_values():
    text = _normalize_extracted_text(
        "Phone +1 555 123 4567 + Austin, TX\n"
        "# jane@example.com\n"
        "ï linkedin.com/in/jane § github.com/jane\n"
        "C# and C++"
    )

    assert "Phone +1 555 123 4567 | Austin, TX" in text
    assert "jane@example.com" in text
    assert "linkedin.com/in/jane" in text
    assert "github.com/jane" in text
    assert "C# and C++" in text