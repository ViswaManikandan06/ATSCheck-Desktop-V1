import json

import pytest

from app.llm.credentials import CredentialStore
from app.llm.models import (
    Capability,
    ModelInfo,
    ProviderConfig,
    ProviderMetadata,
)
from app.llm.providers.mock import MockProvider
from app.llm.registry import ProviderRegistry
from app.llm.service import LLMService

from app.modules.ats.analysis_service import ATSAnalysisService
from app.modules.ats.analysis_service import calculate_skills_match_percent
from app.modules.ats.llm_service import ATSLLMService


RESUME = """
John Doe
john@example.com
+91 9876543210

Summary
Data Scientist with 3 years of experience.

Experience
Data Scientist - ABC
2023 - Present
- Built machine learning models using Python and PyTorch.
- Improved model accuracy by 25%.

Education
B.Tech Computer Science

Skills
Python, PyTorch, AWS, SQL
"""


JOB_DESCRIPTION = """
Looking for a Data Scientist with Python, PyTorch, AWS,
machine learning and Kubernetes experience.
"""


def create_analysis_service(db_session):

    responses = {
        "keyword": json.dumps({
            "score": 80,
            "matched_keywords": [
                "Python",
                "AWS",
            ],
            "missing_keywords": [
                "Kubernetes",
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "skill": json.dumps({
            "score": 85,
            "matched_skills": [
                "Python",
                "PyTorch",
                "AWS",
            ],
            "partially_matched_skills": [],
            "missing_skills": [
                "Kubernetes",
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "experience": json.dumps({
            "score": 75,
                "relevant": True,
            "relevant_experience": [
                "Built machine learning models."
            ],
            "partially_relevant_experience": [],
            "missing_experience": [
                "Kubernetes production experience."
            ],
            "evidence": [],
            "recommendations": [],
        }),

        "achievement": json.dumps({
            "score": 90,
            "strong_achievements": [
                "Improved model accuracy by 25%."
            ],
            "weak_achievements": [],
            "missing_achievements": [],
            "evidence": [],
            "recommendations": [],
        }),
    }

    def response_factory(
    messages: list[dict[str, str]],
    ) -> str:

        system_prompt = messages[0]["content"].lower()

        if "achievement analysis" in system_prompt:
            return responses["achievement"]

        if "experience relevance" in system_prompt:
            return responses["experience"]

        if "skills required" in system_prompt:
            return responses["skill"]

        if "job-description keyword analysis" in system_prompt:
            return responses["keyword"]

        raise ValueError(
            "MockProvider received an unknown prompt."
        )

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory
        )

    registry.register(
        provider_id="mock",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock",
            display_name="Mock Provider",
            requires_api_key=False,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(
                ModelInfo(
                    model_id="mock-model",
                    display_name="Mock Model",
                    capabilities=frozenset({
                        Capability.CHAT,
                        Capability.STRUCTURED_OUTPUT,
                    }),
                ),
            ),
        ),
        factory=create_mock_provider,
    )

    credential_store = CredentialStore()

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=credential_store,
    )

    ats_llm_service = ATSLLMService(
        llm_service=llm_service,
    )

    analysis_service = ATSAnalysisService(
        llm_service=ats_llm_service,
    )

    config = ProviderConfig(
        provider_id="mock",
        model_id="mock-model",
        temperature=0.0,
    )

    return analysis_service, config


def test_skills_coverage_deduplicates_and_weights_partial_matches():
    assert calculate_skills_match_percent({
        "matched_skills": ["Python", " python "],
        "partially_matched_skills": ["SQL"],
        "missing_skills": ["Kubernetes"],
    }) == 50.0

    assert calculate_skills_match_percent({}) is None


@pytest.mark.asyncio
async def test_complete_ats_analysis(db_session):

    analysis_service, config = create_analysis_service(db_session)

    result = await analysis_service.analyze(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        llm_config=config,
    )

    assert "overall_score" in result
    assert result["overall_score"] is None
    assert result["skills_match_percent"] == 75.0
    assert "breakdown" in result

    breakdown = result["breakdown"]

    assert set(breakdown.keys()) == {
        "ats_compatibility",
        "resume_structure",
        "keyword_match",
        "skills_match",
        "experience_relevance",
        "achievements",
    }


@pytest.mark.asyncio
async def test_only_heuristic_diagnostics_return_scores(db_session):

    analysis_service, config = create_analysis_service(db_session)

    result = await analysis_service.analyze(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        llm_config=config,
    )

    breakdown = result["breakdown"]

    for category in ("ats_compatibility", "resume_structure"):
        assert 0 <= breakdown[category]["score"] <= 100

    for category in ("keyword_match", "skills_match", "achievements"):
        assert "score" not in breakdown[category]

    assert "score" not in breakdown["experience_relevance"]


@pytest.mark.asyncio
async def test_unweighted_llm_scores_are_not_exposed(db_session):

    analysis_service, config = create_analysis_service(db_session)

    result = await analysis_service.analyze(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        llm_config=config,
    )

    breakdown = result["breakdown"]

    assert "score" not in breakdown["keyword_match"]
    assert "score" not in breakdown["skills_match"]
    assert "score" not in breakdown["achievements"]


@pytest.mark.asyncio
async def test_skills_coverage_uses_equal_requirement_weights(db_session):

    analysis_service, config = create_analysis_service(db_session)

    result = await analysis_service.analyze(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        llm_config=config,
    )

    breakdown = result["breakdown"]

    skills_match = breakdown["skills_match"]
    assert skills_match["requirement_coverage_percent"] == 75.0
    assert result["skills_match_percent"] == 75.0
    assert result["overall_score"] is None