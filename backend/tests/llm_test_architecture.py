from app.llm.credentials import CredentialStore
from app.llm.models import (
    Capability,
    ProviderConfig,
)
from app.llm.registry_setup import create_registry
from app.llm.service import LLMService


def test_model_lookup():

    registry = create_registry()

    model = registry.get_model(
        "openai",
        "gpt-4.1-mini",
    )

    assert model.model_id == "gpt-4.1-mini"


def test_model_capability():

    registry = create_registry()

    assert registry.model_supports(
        "openai",
        "gpt-4.1-mini",
        Capability.CHAT,
    )


def test_llm_service_provider_listing():

    registry = create_registry()

    credential_store = CredentialStore()

    service = LLMService(
        registry=registry,
        credential_store=credential_store,
    )

    providers = service.list_providers()

    provider_ids = {
        provider.provider_id
        for provider in providers
    }

    assert "openai" in provider_ids
    assert "ollama" in provider_ids


def test_llm_service_model_listing():

    registry = create_registry()

    credential_store = CredentialStore()

    service = LLMService(
        registry=registry,
        credential_store=credential_store,
    )

    models = service.list_models(
        "openai"
    )

    assert any(
        model.model_id == "gpt-4.1-mini"
        for model in models
    )