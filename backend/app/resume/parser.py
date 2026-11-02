import hashlib
from pathlib import Path

import pymupdf

from .extractor import extract_docx, extract_pdf
from .models import ParsedResume, ResumeMetadata


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
}


def parse_resume(
    *,
    filename: str,
    file_bytes: bytes,
) -> ParsedResume:

    if not filename.strip():
        raise ValueError(
            "Filename is required."
        )

    if not file_bytes:
        raise ValueError(
            "Uploaded file is empty."
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            "Only PDF and DOCX files are allowed."
        )

    file_hash = hashlib.sha256(
        file_bytes
    ).hexdigest()

    if extension == ".pdf":
        return _parse_pdf(
            filename=filename,
            file_bytes=file_bytes,
            file_hash=file_hash,
        )

    return _parse_docx(
        filename=filename,
        file_bytes=file_bytes,
        file_hash=file_hash,
    )


def _parse_pdf(
    *,
    filename: str,
    file_bytes: bytes,
    file_hash: str,
) -> ParsedResume:

    text, extracted_metadata = extract_pdf(file_bytes)
    word_count = extracted_metadata["word_count"]

    metadata = ResumeMetadata(
        file_type=".pdf",
        file_size=len(file_bytes),
        file_hash=file_hash,
        word_count=word_count,
        page_count=extracted_metadata["page_count"],
        text_extractable=extracted_metadata["text_extractable"],
        is_scanned_image=extracted_metadata["is_scanned_image"],
    )

    return ParsedResume(
        filename=filename,
        text=text,
        metadata=metadata,
    )


def _parse_docx(
    *,
    filename: str,
    file_bytes: bytes,
    file_hash: str,
) -> ParsedResume:

    text, extracted_metadata = extract_docx(file_bytes)
    word_count = extracted_metadata["word_count"]

    metadata = ResumeMetadata(
        file_type=".docx",
        file_size=len(file_bytes),
        file_hash=file_hash,
        word_count=word_count,
        page_count=None,
        text_extractable=extracted_metadata["text_extractable"],
        is_scanned_image=extracted_metadata["is_scanned_image"],
    )

    return ParsedResume(
        filename=filename,
        text=text,
        metadata=metadata,
    )