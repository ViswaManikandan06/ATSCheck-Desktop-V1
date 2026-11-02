import json

import pytest

from app.llm.credentials import CredentialStore
from app.llm.models import (
    Capability,
    ModelInfo,
    ProviderConfig,
    ProviderMetadata,
)
from app.llm.registry import ProviderRegistry
from app.llm.service import LLMService
from app.llm.providers.mock import MockProvider

from app.modules.ats.llm_models import (
    AchievementMatchResult,
    ExperienceMatchResult,
    KeywordMatchResult,
    SkillsMatchResult,
)

from app.modules.ats.llm_service import ATSLLMService


RESUME = """
Data Scientist with experience in Python, FastAPI, AWS and PyTorch.
Built OCR pipelines and improved OCR accuracy to 99%.
"""

JOB_DESCRIPTION = """
Looking for a Data Scientist with experience in Python,
FastAPI, AWS, machine learning and Kubernetes.
"""


def create_test_service(mock_response: str):

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response=mock_response
        )

    registry.register(
        provider_id="mock",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock",
            display_name="Mock Provider",
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
        registry=registry,
        credential_store=credential_store,
    )

    ats_service = ATSLLMService(
        llm_service=llm_service
    )

    config = ProviderConfig(
        provider_id="mock",
        model_id="mock-model",
        temperature=0.0,
    )

    return ats_service, config


@pytest.mark.asyncio
async def test_analyze_skills():

    mock_response = json.dumps(
        {
            "score": 85,
            "matched_skills": [
                "Python",
                "FastAPI",
                "AWS",
            ],
            "partially_matched_skills": [],
            "missing_skills": [
                "Kubernetes",
            ],
            "evidence": [],
            "recommendations": [
                "Highlight machine learning experience."
            ],
        }
    )

    ats_service, config = create_test_service(
        mock_response
    )

    result = await ats_service.analyze_skills(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        config=config,
    )

    assert isinstance(
        result,
        SkillsMatchResult,
    )

    assert result.score == 85

    assert "Python" in result.matched_skills

    assert "Kubernetes" in result.missing_skills


@pytest.mark.asyncio
async def test_analyze_experience():

    mock_response = json.dumps(
        {
            "score": 80,
            "relevant_experience": [
                "Built production OCR pipelines."
            ],
            "partially_relevant_experience": [],
            "missing_experience": [
                "Kubernetes production experience."
            ],
            "evidence": [],
            "recommendations": [
                "Highlight production ML work."
            ],
        }
    )

    ats_service, config = create_test_service(
        mock_response
    )

    result = await ats_service.analyze_experience(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        config=config,
    )

    assert isinstance(
        result,
        ExperienceMatchResult,
    )

    assert result.score == 80


@pytest.mark.asyncio
async def test_analyze_achievements():

    mock_response = json.dumps(
        {
            "score": 90,
            "strong_achievements": [
                "Improved OCR accuracy to 99%."
            ],
            "weak_achievements": [],
            "missing_achievements": [],
            "evidence": [],
            "recommendations": [],
        }
    )

    ats_service, config = create_test_service(
        mock_response
    )

    result = await ats_service.analyze_achievements(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        config=config,
    )

    assert isinstance(
        result,
        AchievementMatchResult,
    )

    assert result.score == 90


@pytest.mark.asyncio
async def test_invalid_llm_response_is_rejected():

    mock_response = json.dumps(
        {
            "score": 150
        }
    )

    ats_service, config = create_test_service(
        mock_response
    )

    with pytest.raises(Exception):

        await ats_service.analyze_skills(
            resume_text=RESUME,
            job_description=JOB_DESCRIPTION,
            config=config,
        )

@pytest.mark.asyncio
async def test_structured_output_requires_capability():

    mock_response = json.dumps(
        {
            "score": 85,
            "matched_skills": [],
            "partially_matched_skills": [],
            "missing_skills": [],
            "evidence": [],
            "recommendations": [],
        }
    )

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response=mock_response
        )

    registry.register(
        provider_id="mock-no-structured",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock-no-structured",
            display_name="Mock No Structured",
            capabilities=frozenset({
                Capability.CHAT,
            }),
            models=(
                ModelInfo(
                    model_id="mock-model",
                    display_name="Mock Model",
                    capabilities=frozenset({
                        Capability.CHAT,
                    }),
                ),
            ),
        ),
        factory=create_mock_provider,
    )

    credential_store = CredentialStore()

    llm_service = LLMService(
        registry=registry,
        credential_store=credential_store,
    )

    ats_service = ATSLLMService(
        llm_service=llm_service
    )

    config = ProviderConfig(
        provider_id="mock-no-structured",
        model_id="mock-model",
    )

    with pytest.raises(ValueError, match="structured output"):

        await ats_service.analyze_skills(
            resume_text=RESUME,
            job_description=JOB_DESCRIPTION,
            config=config,
        )


@pytest.mark.asyncio
async def test_analyze_keywords():

    mock_response = json.dumps(
        {
            "score": 78,
            "matched_keywords": [
                "Python",
                "FastAPI",
                "AWS",
            ],
            "partially_matched_keywords": [
                "machine learning",
            ],
            "missing_keywords": [
                "Kubernetes",
            ],
            "evidence": [
                "The resume explicitly mentions Python, "
                "FastAPI and AWS."
            ],
            "recommendations": [
                "Add Kubernetes experience if applicable."
            ],
        }
    )

    ats_service, config = create_test_service(
        mock_response
    )

    result = await ats_service.analyze_keywords(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
        config=config,
    )

    assert isinstance(
        result,
        KeywordMatchResult,
    )

    assert result.score == 78

    assert "Python" in result.matched_keywords

    assert "Kubernetes" in result.missing_keywords