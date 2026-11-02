from .models import (
    Capability,
    ProviderConfig,
    ProviderMetadata,
)
from .providers.anthropic import AnthropicProvider
from .providers.gemini import GeminiProvider
from .providers.ollama import OllamaProvider
from .providers.openai import OpenAIProvider
from .registry import ProviderRegistry


# =========================================================
# OPENAI
# =========================================================

def create_openai_provider(
    config: ProviderConfig,
    credential: str | None,
) -> OpenAIProvider:
    """
    Create an OpenAI provider.

    Structured output is handled internally by the
    LangChain-backed OpenAIProvider.
    """

    if not credential:
        raise ValueError(
            "OpenAI API key is required."
        )

    return OpenAIProvider(
        api_key=credential,
        model=config.model_id,
        base_url=config.endpoint,
    )


# =========================================================
# GROQ
# =========================================================

def create_groq_provider(
    config: ProviderConfig,
    credential: str | None,
) -> OpenAIProvider:
    """
    Create a Groq provider.

    Groq exposes an OpenAI-compatible API, so the same
    LangChain-backed OpenAIProvider can be used.
    """

    if not credential:
        raise ValueError(
            "Groq API key is required."
        )

    return OpenAIProvider(
        api_key=credential,
        model=config.model_id,
        base_url=(
            config.endpoint
            or "https://api.groq.com/openai/v1"
        ),
    )


# =========================================================
# MISTRAL
# =========================================================

def create_mistral_provider(
    config: ProviderConfig,
    credential: str | None,
) -> OpenAIProvider:
    """
    Create a Mistral provider.

    Mistral's OpenAI-compatible endpoint allows it to use
    the same LangChain-backed OpenAIProvider abstraction.
    """

    if not credential:
        raise ValueError(
            "Mistral API key is required."
        )

    return OpenAIProvider(
        api_key=credential,
        model=config.model_id,
        base_url=(
            config.endpoint
            or "https://api.mistral.ai/v1"
        ),
    )


# =========================================================
# ANTHROPIC
# =========================================================

def create_anthropic_provider(
    config: ProviderConfig,
    credential: str | None,
) -> AnthropicProvider:
    """
    Create an Anthropic provider.
    """

    if not credential:
        raise ValueError(
            "Anthropic API key is required."
        )

    return AnthropicProvider(
        api_key=credential,
        model=config.model_id,
        base_url=(
            config.endpoint
            or "https://api.anthropic.com"
        ),
    )


# =========================================================
# GEMINI
# =========================================================

def create_gemini_provider(
    config: ProviderConfig,
    credential: str | None,
) -> GeminiProvider:
    """
    Create a Gemini provider.
    """

    if not credential:
        raise ValueError(
            "Gemini API key is required."
        )

    return GeminiProvider(
        api_key=credential,
        model=config.model_id,
        base_url=(
            config.endpoint
            or "https://generativelanguage.googleapis.com"
        ),
    )


# =========================================================
# OLLAMA
# =========================================================

def create_ollama_provider(
    config: ProviderConfig,
    credential: str | None,
) -> OllamaProvider:
    """
    Create an Ollama provider.

    Ollama runs locally and does not require an API key.
    """

    return OllamaProvider(
        model=config.model_id,
        host=config.endpoint,
    )


# =========================================================
# REGISTRY
# =========================================================

def create_registry() -> ProviderRegistry:
    """
    Create and configure the ATSCheck LLM provider registry.
    """

    registry = ProviderRegistry()

    # =====================================================
    # OPENAI
    # =====================================================

    registry.register(
        provider_id="openai",
        provider_class=OpenAIProvider,
        metadata=ProviderMetadata(
            provider_id="openai",
            display_name="OpenAI",
            requires_api_key=True,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_openai_provider,
    )

    # =====================================================
    # OLLAMA
    # =====================================================

    registry.register(
        provider_id="ollama",
        provider_class=OllamaProvider,
        metadata=ProviderMetadata(
            provider_id="ollama",
            display_name="Ollama",
            requires_api_key=False,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_ollama_provider,
    )

    # =====================================================
    # GROQ
    # =====================================================

    registry.register(
        provider_id="groq",
        provider_class=OpenAIProvider,
        metadata=ProviderMetadata(
            provider_id="groq",
            display_name="Groq",
            requires_api_key=True,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_groq_provider,
    )

    # =====================================================
    # MISTRAL
    # =====================================================

    registry.register(
        provider_id="mistral",
        provider_class=OpenAIProvider,
        metadata=ProviderMetadata(
            provider_id="mistral",
            display_name="Mistral",
            requires_api_key=True,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_mistral_provider,
    )

    # =====================================================
    # ANTHROPIC
    # =====================================================

    registry.register(
        provider_id="anthropic",
        provider_class=AnthropicProvider,
        metadata=ProviderMetadata(
            provider_id="anthropic",
            display_name="Anthropic",
            requires_api_key=True,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_anthropic_provider,
    )

    # =====================================================
    # GEMINI
    # =====================================================

    registry.register(
        provider_id="gemini",
        provider_class=GeminiProvider,
        metadata=ProviderMetadata(
            provider_id="gemini",
            display_name="Gemini",
            requires_api_key=True,
            capabilities=frozenset({
                Capability.CHAT,
                Capability.STRUCTURED_OUTPUT,
            }),
            models=(),
        ),
        factory=create_gemini_provider,
    )

    return registry