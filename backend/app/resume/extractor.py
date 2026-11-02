import io
import re
import unicodedata

import pdfplumber
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


def _normalize_extracted_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = "".join(
        character
        for character in normalized
        if character in "\n\t" or not unicodedata.category(character).startswith("C")
    )
    normalized = re.sub(
        r"(?m)(?<!\w)[#§ï]\s*(?=(?:https?://|www\.|linkedin\.com|github\.com|[\w.+-]+@))",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"(?<=\d)[ \t]+\+[ \t]+(?=[A-Za-z])",
        " | ",
        normalized,
    )

    lines = []
    for raw_line in normalized.splitlines():
        line = raw_line.strip()
        if not line:
            if lines and lines[-1]:
                lines.append("")
            continue

        line = re.sub(r"[ \t]{3,}", " | ", line)
        line = re.sub(r"[ \t]+", " ", line).strip()
        lines.append(line)

    return "\n".join(lines).strip()


def _count_words(text: str) -> int:
    return sum(
        any(character.isalnum() for character in word)
        for word in text.split()
    )


def _extract_docx_blocks(document) -> list[str]:
    blocks: list[str] = []

    for section in document.sections:
        for paragraph in section.header.paragraphs:
            if paragraph.text.strip():
                blocks.append(paragraph.text)

    for block in document.iter_inner_content():
        if isinstance(block, Paragraph):
            if block.text.strip():
                blocks.append(block.text)
        elif isinstance(block, Table):
            for row in block.rows:
                values = [cell.text.strip() for cell in row.cells]
                if any(values):
                    blocks.append(" | ".join(values))

    for section in document.sections:
        for paragraph in section.footer.paragraphs:
            if paragraph.text.strip():
                blocks.append(paragraph.text)

    return blocks


def extract_docx(
    file_bytes: bytes,
) -> tuple[str, dict]:
    """
    Extract text and basic metadata from a DOCX file.
    """

    document = Document(
        io.BytesIO(file_bytes)
    )

    text = _normalize_extracted_text(
        "\n".join(_extract_docx_blocks(document))
    )

    has_tables = len(document.tables) > 0

    return text, {
        "page_count": None,
        "word_count": _count_words(text),
        "text_extractable": bool(text.strip()),
        "is_scanned_image": False,
        "has_images": False,
        "has_tables": has_tables,
        "has_text_boxes": False,
        "has_columns": False,
        "has_header_footer_content": False,
        "fonts_used": [],
    }


def extract_pdf(
    file_bytes: bytes,
) -> tuple[str, dict]:
    """
    Extract text and basic metadata from a PDF file.
    """

    text_parts: list[str] = []
    image_count = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as document:
        page_count = len(document.pages)

        for page in document.pages:
            page_text = page.extract_text(layout=True)
            if page_text:
                page_lines = []
                for raw_line in page_text.splitlines():
                    line = raw_line.strip()
                    if line:
                        page_lines.append(re.sub(r"[ \t]{3,}", " | ", line))
                text_parts.append("\n".join(page_lines))

            image_count += len(page.images)

    text = _normalize_extracted_text("\n".join(text_parts))

    text_extractable = any(character.isalnum() for character in text)

    # A PDF should be considered scanned when it has
    # no meaningful text layer, rather than simply because
    # it contains images.
    is_scanned_image = (
        page_count > 0
        and not text_extractable
        and image_count > 0
    )

    return text, {
        "page_count": page_count,
        "word_count": _count_words(text),
        "text_extractable": text_extractable,
        "is_scanned_image": is_scanned_image,
        "has_images": image_count > 0,
        "has_tables": False,
        "has_text_boxes": False,
        "has_columns": False,
        "has_header_footer_content": False,
        "fonts_used": [],
    }