from dataclasses import dataclass


@dataclass(frozen=True)
class ResumeMetadata:
    file_type: str
    file_size: int
    file_hash: str
    word_count: int
    page_count: int | None
    text_extractable: bool
    is_scanned_image: bool


@dataclass(frozen=True)
class ParsedResume:
    filename: str
    text: str
    metadata: ResumeMetadata