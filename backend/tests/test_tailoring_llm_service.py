import json

import pytest
from pydantic import ValidationError

from app.llm.credentials import CredentialStore
from app.llm.db_models import LLMProviderSettings
from app.llm.models import (
    Capability,
    ModelInfo,
    ProviderConfig,
    ProviderMetadata,
)
from app.llm.providers.mock import MockProvider
from app.llm.registry import ProviderRegistry
from app.llm.service import LLMService
from app.modules.tailoring.llm_service import (
    TailoringLLMService,
)


# =========================================================
# Fixtures
# =========================================================


def add_provider_setting(db_session, provider_id):
    db_session.add(
        LLMProviderSettings(
            provider_id=provider_id,
            model_id="mock-model",
            enabled=True,
            is_active=False,
        )
    )
    db_session.commit()


@pytest.fixture
def tailoring_llm_service(db_session):

    response = json.dumps({
        "suggestions": [
            {
                "type": "experience",
                "action": "replace",
                "source": "experience_match",
                "section": "experience",
                "original_text": (
                    "Built OCR pipelines for bank statements."
                ),
                "suggested_text": (
                    "Developed OCR pipelines for processing "
                    "scanned bank statements."
                ),
                "reason": (
                    "Improves clarity and highlights "
                    "document processing experience."
                ),
                "matched_job_requirement": (
                    "Python and document processing experience"
                ),
            },
            {
                "type": "skill",
                "action": "replace",
                "source": "skills_match",
                "section": "skills",
                "original_text": (
                    "Python, PyTorch, AWS"
                ),
                "suggested_text": (
                    "Python, PyTorch, AWS, "
                    "Machine Learning"
                ),
                "reason": (
                    "Better aligns the skills section "
                    "with the target role."
                ),
                "matched_job_requirement": (
                    "Machine Learning experience"
                ),
            },
        ]
    })

    def response_factory(
        messages: list[dict[str, str]],
    ) -> str:

        # -----------------------------------------------------
        # Verify prompt contains required inputs
        # -----------------------------------------------------

        prompt = messages[-1]["content"]

        assert "CANDIDATE RESUME" in prompt
        assert "TARGET JOB DESCRIPTION" in prompt

        assert (
            "Built OCR pipelines for bank statements."
            in prompt
        )

        assert (
            "Looking for a Data Scientist with "
            "Python and PyTorch experience."
            in prompt
        )

        return response

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory,
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

    add_provider_setting(db_session, "mock")

    credential_store = CredentialStore()

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=credential_store,
    )

    return TailoringLLMService(
        llm_service=llm_service,
    )


@pytest.fixture
def llm_config():

    return ProviderConfig(
        provider_id="mock",
        model_id="mock-model",
    )


# =========================================================
# Valid response
# =========================================================


@pytest.mark.asyncio
async def test_generate_suggestions(
    tailoring_llm_service,
    llm_config,
):

    suggestions = (
        await tailoring_llm_service.generate_suggestions(
            resume_text=(
                "Built OCR pipelines for bank statements.\n"
                "Python, PyTorch, AWS"
            ),
            job_description=(
                "Looking for a Data Scientist with "
                "Python and PyTorch experience."
            ),
            provider_id=llm_config.provider_id,
            model_id=llm_config.model_id,
        )
    )

    assert isinstance(
        suggestions,
        list,
    )

    assert len(suggestions) == 2

    # ---------------------------------------------------------
    # First suggestion
    # ---------------------------------------------------------

    first = suggestions[0]

    assert (
        first["type"]
        == "experience"
    )

    assert (
        first["action"]
        == "replace"
    )

    assert (
        first["source"]
        == "experience_match"
    )

    assert (
        first["section"]
        == "experience"
    )

    assert (
        first["original_text"]
        == "Built OCR pipelines for bank statements."
    )

    assert (
        first["suggested_text"]
        == (
            "Developed OCR pipelines for processing "
            "scanned bank statements."
        )
    )

    assert (
        first["reason"]
        == (
            "Improves clarity and highlights "
            "document processing experience."
        )
    )

    assert (
        first["matched_job_requirement"]
        == (
            "Python and document processing experience"
        )
    )

    # ---------------------------------------------------------
    # Second suggestion
    # ---------------------------------------------------------

    second = suggestions[1]

    assert (
        second["type"]
        == "skill"
    )

    assert (
        second["action"]
        == "replace"
    )

    assert (
        second["source"]
        == "skills_match"
    )

    assert (
        second["section"]
        == "skills"
    )

    assert (
        second["original_text"]
        == "Python, PyTorch, AWS"
    )

    assert (
        second["suggested_text"]
        == (
            "Python, PyTorch, AWS, "
            "Machine Learning"
        )
    )

    assert (
        second["matched_job_requirement"]
        == "Machine Learning experience"
    )


# =========================================================
# Invalid JSON
# =========================================================


@pytest.mark.asyncio
async def test_invalid_json_response(db_session):

    def response_factory(
        messages: list[dict[str, str]],
    ) -> str:

        return "This is not valid JSON."

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory,
        )

    registry.register(
        provider_id="mock-invalid-json",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock-invalid-json",
            display_name="Invalid JSON Mock",
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

    add_provider_setting(db_session, "mock-invalid-json")

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=CredentialStore(),
    )

    tailoring_service = TailoringLLMService(
        llm_service=llm_service,
    )

    config = ProviderConfig(
        provider_id="mock-invalid-json",
        model_id="mock-model",
    )

    with pytest.raises(ValidationError):
        await tailoring_service.generate_suggestions(
            resume_text="Python Developer",
            job_description="Data Scientist",
            provider_id=config.provider_id,
            model_id=config.model_id,
        )


# =========================================================
# Missing suggestions list
# =========================================================


@pytest.mark.asyncio
async def test_missing_suggestions_list(db_session):

    def response_factory(
        messages: list[dict[str, str]],
    ) -> str:

        return json.dumps({
            "result": []
        })

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory,
        )

    registry.register(
        provider_id="mock-missing-list",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock-missing-list",
            display_name="Missing List Mock",
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

    add_provider_setting(db_session, "mock-missing-list")

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=CredentialStore(),
    )

    tailoring_service = TailoringLLMService(
        llm_service=llm_service,
    )

    config = ProviderConfig(
        provider_id="mock-missing-list",
        model_id="mock-model",
    )

    with pytest.raises(ValidationError):
        await tailoring_service.generate_suggestions(
            resume_text="Python Developer",
            job_description="Data Scientist",
            provider_id=config.provider_id,
            model_id=config.model_id,
        )


# =========================================================
# Missing suggestion field
# =========================================================


@pytest.mark.asyncio
async def test_missing_suggestion_field(db_session):

    def response_factory(
        messages: list[dict[str, str]],
    ) -> str:

        return json.dumps({
            "suggestions": [
                {
                    "type": "experience",
                    "action": "replace",
                    "source": "experience_match",
                    "section": "experience",
                    "original_text": (
                        "Built ML models."
                    ),
                    "suggested_text": (
                        "Developed machine learning models."
                    ),
                    # reason intentionally missing
                    "matched_job_requirement": (
                        "Machine Learning"
                    ),
                }
            ]
        })

    registry = ProviderRegistry()

    def create_mock_provider(
        config: ProviderConfig,
        credential: str | None,
    ) -> MockProvider:

        return MockProvider(
            response_factory=response_factory,
        )

    registry.register(
        provider_id="mock-missing-field",
        provider_class=MockProvider,
        metadata=ProviderMetadata(
            provider_id="mock-missing-field",
            display_name="Missing Field Mock",
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

    add_provider_setting(db_session, "mock-missing-field")

    llm_service = LLMService(
        db=db_session,
        registry=registry,
        credential_store=CredentialStore(),
    )

    tailoring_service = TailoringLLMService(
        llm_service=llm_service,
    )

    config = ProviderConfig(
        provider_id="mock-missing-field",
        model_id="mock-model",
    )

    with pytest.raises(ValidationError):
        await tailoring_service.generate_suggestions(
            resume_text="Built ML models.",
            job_description="Machine Learning Engineer",
            provider_id=config.provider_id,
            model_id=config.model_id,
        )
