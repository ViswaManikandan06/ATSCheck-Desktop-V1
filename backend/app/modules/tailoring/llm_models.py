from typing import Literal

from pydantic import BaseModel, Field


SuggestionType = Literal[
    "keyword",
    "skill",
    "experience",
    "achievement",
    "addition",
]


SuggestionAction = Literal[
    "replace",
    "add",
]


SuggestionSource = Literal[
    "keyword_match",
    "skills_match",
    "experience_match",
    "achievement_match",
]


class TailoringSuggestionResult(BaseModel):
    type: SuggestionType

    action: SuggestionAction

    source: SuggestionSource

    section: str = Field(
        min_length=1,
    )

    original_text: str

    suggested_text: str = Field(
        min_length=1,
    )

    reason: str = Field(
        min_length=1,
    )

    matched_job_requirement: str = Field(
        min_length=1,
    )


class TailoringResponse(BaseModel):
    suggestions: list[TailoringSuggestionResult]