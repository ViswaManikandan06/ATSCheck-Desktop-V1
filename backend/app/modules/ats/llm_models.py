import json
from typing import Any

from pydantic import BaseModel, Field, model_validator

# ============================================================
# Keyword Match
# ============================================================

class KeywordMatchResult(BaseModel):
    score: float = Field(ge=0, le=100)

    matched_keywords: list[str] = Field(
        default_factory=list
    )

    partially_matched_keywords: list[str] = Field(
        default_factory=list
    )

    missing_keywords: list[str] = Field(
        default_factory=list
    )

    evidence: list[str] = Field(
        default_factory=list
    )

    recommendations: list[str] = Field(
        default_factory=list
    )

# ============================================================
# Skills Match
# ============================================================


class SkillEvidence(BaseModel):
    """
    Evidence showing how a resume demonstrates a required skill.
    """

    skill: str

    resume_evidence: str

    relevance: str = Field(
        description=(
            "Explain how the resume evidence demonstrates "
            "the required skill."
        )
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_evidence(
        cls,
        value: Any,
    ) -> Any:
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return value

        if not isinstance(value, dict):
            return value

        normalized = dict(value)
        if "resume_evidence" not in normalized and "text" in normalized:
            normalized["resume_evidence"] = normalized.pop("text")

        if "relevance" not in normalized:
            normalized["relevance"] = (
                "The resume provides evidence of this skill."
            )

        return normalized


class SkillsMatchResult(BaseModel):
    """
    Structured LLM output for skills matching.

    The score must always be expressed on a 0-100 scale.
    """

    score: float = Field(
        ge=0,
        le=100,
        description=(
            "Overall skills match score from 0 to 100. "
            "Always return a number between 0 and 100. "
            "Do not return a decimal ratio such as 0.8 or 0.85."
        ),
    )

    matched_skills: list[str] = Field(
        default_factory=list,
    )

    partially_matched_skills: list[str] = Field(
        default_factory=list,
    )

    missing_skills: list[str] = Field(
        default_factory=list,
    )

    evidence: list[SkillEvidence] = Field(
        default_factory=list,
    )

    recommendations: list[str] = Field(
        default_factory=list,
    )


# ============================================================
# Experience Match
# ============================================================


class ExperienceEvidence(BaseModel):
    """
    Evidence showing how the candidate's experience
    satisfies a job requirement.
    """

    requirement: str

    resume_evidence: str

    relevance: str

    strength: str = Field(
        description=(
            "Describe how strongly the resume evidence "
            "satisfies the requirement."
        )
    )


class ExperienceMatchResult(BaseModel):
    """
    Structured LLM output for experience relevance.

    Experience relevance is a qualitative decision:
    the LLM determines whether the candidate's experience
    is relevant to the target role.

    It does NOT produce a numeric score.
    """

    relevant: bool = Field(
        description=(
            "Whether the candidate's overall experience is "
            "relevant to the target job. Return true or false."
        )
    )

    relevant_experience: list[str] = Field(
        default_factory=list,
    )

    partially_relevant_experience: list[str] = Field(
        default_factory=list,
    )

    missing_experience: list[str] = Field(
        default_factory=list,
    )

    evidence: list[ExperienceEvidence] = Field(
        default_factory=list,
    )

    recommendations: list[str] = Field(
        default_factory=list,
    )

# ============================================================
# Achievement Match
# ============================================================


class AchievementEvidence(BaseModel):
    """
    Evidence showing the quality and impact of a
    candidate achievement.
    """

    achievement: str

    resume_evidence: str

    impact: str

    quality: str = Field(
        description=(
            "Assess the strength and quality of the "
            "achievement for the target role."
        )
    )


class AchievementMatchResult(BaseModel):
    """
    Structured LLM output for achievement analysis.
    """

    score: float = Field(
        ge=0,
        le=100,
        description=(
            "Overall achievement score from 0 to 100."
        ),
    )

    strong_achievements: list[str] = Field(
        default_factory=list,
    )

    weak_achievements: list[str] = Field(
        default_factory=list,
    )

    missing_achievements: list[str] = Field(
        default_factory=list,
    )

    evidence: list[AchievementEvidence] = Field(
        default_factory=list,
    )

    recommendations: list[str] = Field(
        default_factory=list,
    )


# ============================================================
# Complete LLM ATS Analysis
# ============================================================


class LLMATSAnalysisResult(BaseModel):
    """
    Complete structured output produced by the
    LLM-powered ATS analysis.
    """

    skills: SkillsMatchResult

    experience: ExperienceMatchResult

    achievements: AchievementMatchResult