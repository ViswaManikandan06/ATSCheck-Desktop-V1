import re
from datetime import datetime
from typing import Any


STANDARD_SECTION_HEADERS = [
    "experience",
    "education",
    "skills",
    "summary",
    "objective",
    "work history",
    "employment",
    "projects",
    "certifications",
]

SECTION_KEYWORDS = {
    "summary": [
        "summary",
        "objective",
        "profile",
        "about me",
    ],
    "experience": [
        "experience",
        "employment history",
        "work history",
        "career history",
        "professional experience",
    ],
    "education": [
        "education",
        "academic background",
        "qualifications",
    ],
    "skills": [
        "skills",
        "technical skills",
        "core competencies",
        "key skills",
        "expertise",
    ],
}

STANDARD_FONTS = {
    "arial",
    "calibri",
    "times new roman",
    "georgia",
    "verdana",
    "helvetica",
    "garamond",
    "cambria",
    "trebuchet ms",
    "tahoma",
}

UNUSUAL_BULLET_CHARS = r"[❖➤◆■●▪➔➜✦]"


def check_reverse_chronological(
    text: str,
) -> bool | None:
    """
    Heuristically check whether date ranges appear
    in reverse chronological order.

    Returns:
        True  -> appears correctly ordered
        False -> appears incorrectly ordered
        None  -> insufficient information
    """

    current_year = datetime.now().year

    normalized = re.sub(
        r"\b(present|current|ongoing|till date|to date|now)\b",
        str(current_year),
        text,
        flags=re.IGNORECASE,
    )

    range_pattern = (
        r"\b(19[5-9]\d|20[0-4]\d)"
        r"\s*(?:-|–|—|to)\s*"
        r"(19[5-9]\d|20[0-4]\d)\b"
    )

    start_years = [
        int(match[0])
        for match in re.findall(
            range_pattern,
            normalized,
        )
    ]

    if len(start_years) < 2:
        return None

    inversions = sum(
        1
        for i in range(len(start_years) - 1)
        if start_years[i] < start_years[i + 1]
    )

    return inversions <= max(
        1,
        len(start_years) // 3,
    )


def score_ats_compatibility(
    resume_text: str,
    file_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Score ATS compatibility independently from 0-100.

    This is intentionally heuristic/deterministic.
    No LLM is involved.
    """

    max_score = 100

    if not resume_text or not resume_text.strip():
        return {
            "score": 0,
            "max_score": max_score,
            "issues": [
                "No extractable text found. "
                "The file may be scanned, empty, or corrupted."
            ],
        }

    score = float(max_score)
    issues: list[str] = []

    metadata = file_metadata or {}

    # --------------------------------------------------
    # File type
    # --------------------------------------------------

    file_type = (
        metadata.get("file_type") or ""
    ).lower()

    if file_type and file_type not in {
        ".docx",
        ".doc",
        ".pdf",
        ".txt",
        ".rtf",
    }:
        score -= 10

        issues.append(
            f"File type '{file_type}' is not "
            "well supported by many ATS systems."
        )

    # --------------------------------------------------
    # Scanned document
    # --------------------------------------------------

    if metadata.get("is_scanned_image"):
        score -= 40

        issues.append(
            "The file appears to be a scanned image "
            "with no selectable text."
        )

    # --------------------------------------------------
    # Layout
    # --------------------------------------------------

    if metadata.get("has_tables"):
        score -= 15

        issues.append(
            "Tables detected. Some ATS parsers "
            "may misread table content."
        )

    if metadata.get("has_images"):
        score -= 10

        issues.append(
            "Images or graphics detected. "
            "Text inside images may not be parsed."
        )

    if metadata.get("has_text_boxes"):
        score -= 15

        issues.append(
            "Text boxes detected. Some ATS parsers "
            "may skip their contents."
        )

    if metadata.get("has_columns"):
        score -= 15

        issues.append(
            "Multi-column layout detected. "
            "Content may be read out of order."
        )

    if metadata.get(
        "has_header_footer_content"
    ):
        score -= 10

        issues.append(
            "Important content appears in a header "
            "or footer."
        )

    # --------------------------------------------------
    # Fonts
    # --------------------------------------------------

    fonts = [
        font.lower()
        for font in metadata.get(
            "fonts_used",
            [],
        )
        if font
    ]

    if fonts and not any(
        font in STANDARD_FONTS
        for font in fonts
    ):
        score -= 5

        issues.append(
            "Non-standard fonts detected. "
            "Common fonts are safer for ATS parsing."
        )

    # --------------------------------------------------
    # Text-based checks
    # --------------------------------------------------

    text_lower = resume_text.lower()

    found_headers = [
        header
        for header in STANDARD_SECTION_HEADERS
        if header in text_lower
    ]

    if len(found_headers) < 2:
        score -= 15

        issues.append(
            "Few standard resume section headers "
            "were detected."
        )

    non_ascii = re.findall(
        r"[^\x00-\x7F]",
        resume_text,
    )

    if len(non_ascii) > 10:
        score -= 5

        issues.append(
            "Multiple non-standard Unicode characters "
            "were detected."
        )

    if re.search(
        UNUSUAL_BULLET_CHARS,
        resume_text,
    ):
        score -= 5

        issues.append(
            "Unusual bullet symbols detected. "
            "Use standard bullets."
        )

    score = max(
        0,
        min(
            max_score,
            round(score, 2),
        ),
    )

    return {
        "score": score,
        "max_score": max_score,
        "issues": issues,
    }


def score_resume_structure(
    resume_text: str,
) -> dict[str, Any]:
    """
    Score resume structure independently from 0-100.

    This is intentionally heuristic/deterministic.
    """

    max_score = 100

    if not resume_text or not resume_text.strip():
        return {
            "score": 0,
            "max_score": max_score,
            "issues": [
                "Resume text is empty."
            ],
        }

    score = 0.0
    issues: list[str] = []

    text_lower = resume_text.lower()

    # --------------------------------------------------
    # Contact information — 20 points
    # --------------------------------------------------

    has_email = bool(
        re.search(
            r"[a-zA-Z0-9._%+-]+"
            r"@[a-zA-Z0-9.-]+\."
            r"[a-zA-Z]{2,}",
            resume_text,
        )
    )

    has_phone = bool(
        re.search(
            r"(\+?\d{1,3}[-.\s]?)?"
            r"\(?\d{2,4}\)?"
            r"[-.\s]?\d{3,4}"
            r"[-.\s]?\d{3,4}",
            resume_text,
        )
    )

    if has_email:
        score += 10
    else:
        issues.append(
            "No email address detected."
        )

    if has_phone:
        score += 10
    else:
        issues.append(
            "No phone number detected."
        )

    # --------------------------------------------------
    # Core sections — 60 points
    #
    # 15 points each:
    # Summary
    # Experience
    # Education
    # Skills
    # --------------------------------------------------

    section_score = 15

    for section, keywords in SECTION_KEYWORDS.items():

        if any(
            keyword in text_lower
            for keyword in keywords
        ):
            score += section_score
        else:
            issues.append(
                f"No clear '{section}' "
                "section detected."
            )

    # --------------------------------------------------
    # Chronological ordering — 20 points
    # --------------------------------------------------

    chronological = check_reverse_chronological(
        resume_text
    )

    if chronological is True:

        score += 20

    elif chronological is False:

        issues.append(
            "Dates do not appear to be in "
            "reverse-chronological order."
        )

    else:

        score += 10

        issues.append(
            "Not enough date information was found "
            "to verify chronological ordering."
        )

    score = max(
        0,
        min(
            max_score,
            round(score, 2),
        ),
    )

    return {
        "score": score,
        "max_score": max_score,
        "issues": issues,
    }


def calculate_heuristic_scores(
    resume_text: str,
    file_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Run the deterministic ATS checks.

    Only the two heuristic categories belong here.
    """

    ats_compatibility = score_ats_compatibility(
        resume_text,
        file_metadata,
    )

    resume_structure = score_resume_structure(
        resume_text,
    )

    return {
        "ats_compatibility": ats_compatibility,
        "resume_structure": resume_structure,
    }