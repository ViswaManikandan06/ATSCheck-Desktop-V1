import asyncio
from types import SimpleNamespace

import pytest

from app.api.routes import llm_settings
from app.llm.config import LLMConfigManager
from app.llm.credentials import CredentialStore
from app.llm.models import ProviderConfig
from app.llm.settings import ProviderSettings


class FakeCredentialStore:
    """
    In-memory credential store used only for testing.

    This avoids touching the real OS keychain during tests.
    """

    def __init__(self):
        self.secrets = {}

    def set_secret(
        self,
        provider_id: str,
        secret: str,
    ) -> None:
        self.secrets[provider_id] = secret

    def get_secret(
        self,
        provider_id: str,
    ) -> str | None:
        return self.secrets.get(provider_id)

    def delete_secret(
        self,
        provider_id: str,
    ) -> None:
        self.secrets.pop(
            provider_id,
            None,
        )

    def has_secret(
        self,
        provider_id: str,
    ) -> bool:
        return provider_id in self.secrets


def create_manager():
    credential_store = FakeCredentialStore()

    manager = LLMConfigManager(
        credential_store=credential_store
    )

    return manager, credential_store


def test_build_config():

    manager, _ = create_manager()

    settings = ProviderSettings(
        provider_id="openai",
        model_id="gpt-4.1-mini",
        endpoint=None,
        temperature=0.4,
        enabled=True,
    )

    config = manager.build_config(
        settings
    )

    assert isinstance(
        config,
        ProviderConfig,
    )

    assert config.provider_id == "openai"
    assert config.model_id == "gpt-4.1-mini"
    assert config.temperature == 0.4
    assert config.endpoint is None


def test_disabled_provider_is_rejected():

    manager, _ = create_manager()

    settings = ProviderSettings(
        provider_id="openai",
        model_id="gpt-4.1-mini",
        enabled=False,
    )

    with pytest.raises(
        ValueError,
        match="disabled",
    ):
        manager.build_config(
            settings
        )


def test_save_and_get_credential():

    manager, _ = create_manager()

    manager.save_credential(
        provider_id="openai",
        credential="test-api-key",
    )

    assert (
        manager.get_credential("openai")
        == "test-api-key"
    )


def test_has_credential():

    manager, _ = create_manager()

    assert (
        manager.has_credential("openai")
        is False
    )

    manager.save_credential(
        provider_id="openai",
        credential="test-api-key",
    )

    assert (
        manager.has_credential("openai")
        is True
    )


def test_remove_credential():

    manager, _ = create_manager()

    manager.save_credential(
        provider_id="openai",
        credential="test-api-key",
    )

    assert (
        manager.has_credential("openai")
        is True
    )

    manager.remove_credential(
        provider_id="openai"
    )

    assert (
        manager.has_credential("openai")
        is False
    )


def test_provider_config_contains_no_secret():

    manager, _ = create_manager()

    settings = ProviderSettings(
        provider_id="openai",
        model_id="gpt-4.1-mini",
    )

    config = manager.build_config(
        settings
    )

    assert not hasattr(
        config,
        "api_key",
    )

    assert not hasattr(
        config,
        "credential",
    )


def test_openai_provider_adds_additional_properties_to_object_schema():
    from app.llm.providers.openai import OpenAIProvider

    schema = {
        "title": "KeywordMatchResult",
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "matched_keywords": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["score", "matched_keywords"],
    }

    normalized = OpenAIProvider._normalize_response_format(schema)

    assert normalized["type"] == "json_schema"
    assert normalized["json_schema"]["schema"]["additionalProperties"] is False
    assert normalized["json_schema"]["schema"]["required"] == ["score", "matched_keywords"]


def test_openai_provider_adds_required_list_for_all_object_properties():
    from app.llm.providers.openai import OpenAIProvider

    schema = {
        "title": "KeywordMatchResult",
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "matched_keywords": {"type": "array", "items": {"type": "string"}},
            "missing_keywords": {"type": "array", "items": {"type": "string"}},
        },
    }

    normalized = OpenAIProvider._normalize_response_format(schema)

    assert normalized["json_schema"]["schema"]["required"] == [
        "score",
        "matched_keywords",
        "missing_keywords",
    ]


def test_openai_provider_recurses_into_defs_for_nested_objects():
    from app.llm.providers.openai import OpenAIProvider

    schema = {
        "title": "SkillsMatchResult",
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "evidence": {
                "type": "array",
                "items": {"$ref": "#/$defs/SkillEvidence"},
            },
        },
        "$defs": {
            "SkillEvidence": {
                "type": "object",
                "properties": {
                    "skill": {"type": "string"},
                    "resume_evidence": {"type": "string"},
                    "relevance": {"type": "string"},
                },
            }
        },
    }

    normalized = OpenAIProvider._normalize_response_format(schema)

    assert normalized["json_schema"]["schema"]["$defs"]["SkillEvidence"]["additionalProperties"] is False
    assert normalized["json_schema"]["schema"]["$defs"]["SkillEvidence"]["required"] == [
        "skill",
        "resume_evidence",
        "relevance",
    ]


def test_openai_like_providers_apply_strict_json_schema_contract_to_nested_objects():
    from app.llm.providers.anthropic import AnthropicProvider
    from app.llm.providers.gemini import GeminiProvider
    from app.llm.providers.openai import OpenAIProvider

    schema = {
        "title": "SkillsMatchResult",
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "evidence": {
                "type": "array",
                "items": {"$ref": "#/$defs/SkillEvidence"},
            },
        },
        "$defs": {
            "SkillEvidence": {
                "type": "object",
                "properties": {
                    "skill": {"type": "string"},
                    "resume_evidence": {"type": "string"},
                    "relevance": {"type": "string"},
                },
            }
        },
    }

    normalized = {
        "openai": OpenAIProvider._normalize_response_format(schema),
        "anthropic": AnthropicProvider._normalize_response_format(schema),
        "gemini": GeminiProvider._normalize_response_format(schema),
    }

    for _, formatted in normalized.items():
        assert formatted["json_schema"]["schema"]["$defs"]["SkillEvidence"]["additionalProperties"] is False
        assert formatted["json_schema"]["schema"]["$defs"]["SkillEvidence"]["required"] == [
            "skill",
            "resume_evidence",
            "relevance",
        ]


def test_openai_provider_wraps_pydantic_schema_in_json_schema_response_format(monkeypatch):
    captured = {}

    class FakeMessage:
        content = '{"ok": true}'

    class FakeChoice:
        message = FakeMessage()

    class FakeResponse:
        choices = [FakeChoice()]

    class FakeCompletions:
        async def create(self, **kwargs):
            captured["response_format"] = kwargs["response_format"]
            return FakeResponse()

    class FakeAsyncOpenAIClient:
        def __init__(self, **kwargs):
            captured["kwargs"] = kwargs
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr(
        "app.llm.providers.openai.AsyncOpenAI",
        FakeAsyncOpenAIClient,
    )

    from app.llm.providers.openai import OpenAIProvider

    pydantic_schema = {
        "title": "SampleResponse",
        "type": "object",
        "properties": {"ok": {"type": "boolean"}},
        "required": ["ok"],
    }

    provider = OpenAIProvider(
        api_key="test-key",
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
    )

    result = asyncio.run(
        provider.structured_chat(
            messages=[{"role": "user", "content": "hello"}],
            format=pydantic_schema,
            temperature=0.2,
        )
    )

    assert result == '{"ok": true}'
    expected_schema = dict(pydantic_schema)
    expected_schema["additionalProperties"] = False
    assert captured["response_format"] == {
        "type": "json_schema",
        "json_schema": {
            "name": "SampleResponse",
            "schema": expected_schema,
            "strict": True,
        },
    }