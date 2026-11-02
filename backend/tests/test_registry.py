import asyncio

import pytest

from app.llm.models import Capability, ProviderConfig
from app.llm.registry_setup import create_registry
from app.llm.factory import ProviderFactory
from app.llm.providers.openai import OpenAIProvider
from app.llm.providers.ollama import OllamaProvider


def test_registry_contains_all_supported_providers():
    registry = create_registry()

    assert registry.has_provider("openai")
    assert registry.has_provider("ollama")
    assert registry.has_provider("groq")
    assert registry.has_provider("mistral")
    assert registry.has_provider("anthropic")
    assert registry.has_provider("gemini")


def test_provider_metadata():
    registry = create_registry()

    openai = registry.get_metadata("openai")
    ollama = registry.get_metadata("ollama")

    assert openai.provider_id == "openai"
    assert openai.display_name == "OpenAI"

    assert ollama.provider_id == "ollama"
    assert ollama.display_name == "Ollama"


def test_provider_capabilities():
    registry = create_registry()

    assert registry.supports(
        "openai",
        Capability.CHAT,
    )

    assert registry.supports(
        "ollama",
        Capability.CHAT,
    )

    assert registry.supports(
        "openai",
        Capability.STRUCTURED_OUTPUT,
    )


def test_list_providers():
    registry = create_registry()

    providers = registry.list_providers()

    provider_ids = {
        provider.provider_id
        for provider in providers
    }

    assert provider_ids == {"openai", "ollama", "groq", "mistral", "anthropic", "gemini"}

    openai = registry.get_metadata("openai")
    ollama = registry.get_metadata("ollama")

    assert openai.models == ()
    assert ollama.models == ()


def test_factory_creates_ollama_provider():
    registry = create_registry()

    factory = ProviderFactory(registry)

    config = ProviderConfig(
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    provider = factory.create(config)

    assert isinstance(
        provider,
        OllamaProvider,
    )


def test_factory_requires_openai_api_key():
    registry = create_registry()

    factory = ProviderFactory(registry)

    config = ProviderConfig(
        provider_id="openai",
        model_id="gpt-4.1-mini",
    )

    with pytest.raises(ValueError):
        factory.create(config)


def test_factory_creates_openai_provider():
    registry = create_registry()

    factory = ProviderFactory(registry)

    config = ProviderConfig(
        provider_id="openai",
        model_id="gpt-4.1-mini",
    )

    provider = factory.create(
        config=config,
        credential="test-key",
    )

    assert isinstance(
        provider,
        OpenAIProvider,
    )

def test_unknown_provider_fails():
    registry = create_registry()

    factory = ProviderFactory(registry)

    config = ProviderConfig(
        provider_id="unknown",
        model_id="some-model",
    )

    with pytest.raises(ValueError):
        factory.create(config)


def test_openai_runtime_model_discovery_works(monkeypatch):
    from app.api.routes import llm_settings

    class DummyModel:
        id = "gpt-4.1"

    class DummyModelsResource:
        async def list(self):
            return type(
                "Response",
                (),
                {"data": [DummyModel()]},
            )()

    class DummyClient:
        def __init__(self, **kwargs):
            self.models = DummyModelsResource()

    class DummyCredentialStore:
        def get_secret(self, provider_id):
            return "test-key"

    monkeypatch.setattr(
        llm_settings,
        "credential_store",
        DummyCredentialStore(),
    )
    monkeypatch.setattr(
        llm_settings,
        "AsyncOpenAI",
        lambda **kwargs: DummyClient(**kwargs),
    )

    result = asyncio.run(
        llm_settings.get_provider_runtime_models("openai")
    )

    assert result["models"][0]["model"] == "gpt-4.1"


def test_provider_listing_prefers_runtime_models(monkeypatch):
    from app.api.routes import llm_settings

    class DummyCredentialStore:
        def get_secret(self, provider_id):
            return "test-key" if provider_id == "openai" else None

    class DummyModel:
        id = "gpt-4.1"

    class DummyModelsResource:
        async def list(self):
            return type(
                "Response",
                (),
                {"data": [DummyModel()]},
            )()

    class DummyClient:
        def __init__(self, **kwargs):
            self.models = DummyModelsResource()

    monkeypatch.setattr(
        llm_settings,
        "credential_store",
        DummyCredentialStore(),
    )
    monkeypatch.setattr(
        llm_settings,
        "AsyncOpenAI",
        lambda **kwargs: DummyClient(**kwargs),
    )

    result = asyncio.run(
        llm_settings.get_available_llm_providers()
    )

    openai_provider = next(
        provider for provider in result.providers if provider.provider_id == "openai"
    )

    assert openai_provider.models[0].model_id == "gpt-4.1"