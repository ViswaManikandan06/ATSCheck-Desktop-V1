from typing import Any

from app.llm.models import ProviderConfig

from .heuristic_scorer import (
    score_ats_compatibility,
    score_resume_structure,
)
from .llm_service import ATSLLMService


def calculate_skills_match_percent(
    skills_match: dict[str, Any],
) -> float | None:
    """Calculate equal-weight requirement coverage from skill classifications."""
    classifications: dict[str, str] = {}

    for classification, field in (
        ("matched", "matched_skills"),
        ("partial", "partially_matched_skills"),
        ("missing", "missing_skills"),
    ):
        for skill in skills_match.get(field, []):
            normalized = skill.strip().casefold()
            if normalized:
                classifications.setdefault(
                    normalized,
                    classification,
                )

    if not classifications:
        return None

    weighted_matches = sum(
        1.0 if classification == "matched"
        else 0.5 if classification == "partial"
        else 0.0
        for classification in classifications.values()
    )

    return round(
        weighted_matches / len(classifications) * 100,
        1,
    )


class ATSAnalysisService:
    """
    Orchestrates the complete ATS analysis.

    Heuristic analysis:
        - ATS compatibility
        - Resume structure

    LLM analysis:
        - Keyword match
        - Skills match
        - Experience relevance
        - Achievements

    ATS compatibility and resume structure retain heuristic scores.
    Skills coverage is calculated from the classified requirements.
    """

    def __init__(
        self,
        llm_service: ATSLLMService,
    ) -> None:
        self.llm_service = llm_service

    async def analyze(
        self,
        *,
        resume_text: str,
        job_description: str,
        llm_config: ProviderConfig,
        file_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:

        # ---------------------------------------------------------
        # 1. Heuristic analysis
        # ---------------------------------------------------------

        ats_compatibility = score_ats_compatibility(
            resume_text=resume_text,
            file_metadata=file_metadata,
        )

        resume_structure = score_resume_structure(
            resume_text=resume_text,
        )

        # ---------------------------------------------------------
        # 2. LLM analysis
        # ---------------------------------------------------------

        keyword_match = await self.llm_service.analyze_keywords(
            resume_text=resume_text,
            job_description=job_description,
            config=llm_config,
        )

        skills_match = await self.llm_service.analyze_skills(
            resume_text=resume_text,
            job_description=job_description,
            config=llm_config,
        )

        experience_relevance = (
            await self.llm_service.analyze_experience(
                resume_text=resume_text,
                job_description=job_description,
                config=llm_config,
            )
        )

        achievements = (
            await self.llm_service.analyze_achievements(
                resume_text=resume_text,
                job_description=job_description,
                config=llm_config,
            )
        )

        # ---------------------------------------------------------
        # 3. Build unified response
        # ---------------------------------------------------------

        keyword_data = keyword_match.model_dump()
        keyword_data.pop("score", None)

        skills_data = skills_match.model_dump()
        skills_data.pop("score", None)
        skills_data["requirement_coverage_percent"] = (
            calculate_skills_match_percent(skills_data)
        )

        achievements_data = achievements.model_dump()
        achievements_data.pop("score", None)

        breakdown = {
            "ats_compatibility": ats_compatibility,
            "resume_structure": resume_structure,
            "keyword_match": keyword_data,
            "skills_match": skills_data,
            "experience_relevance": (
                experience_relevance.model_dump()
            ),
            "achievements": achievements_data,
        }

        # ---------------------------------------------------------
        # 5. Return complete analysis
        # ---------------------------------------------------------

        return {
            "overall_score": None,
            "skills_match_percent": (
                skills_data["requirement_coverage_percent"]
            ),
            "breakdown": breakdown,
        }