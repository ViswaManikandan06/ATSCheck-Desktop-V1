from .base import LLMProvider
from .models import ProviderConfig
from .registry import ProviderRegistry


class ProviderFactory:
    """
    Creates configured LLM provider instances.

    Provider-specific construction logic remains inside the
    factory registered for each provider.
    """

    def __init__(
        self,
        registry: ProviderRegistry,
    ) -> None:
        self.registry = registry

    def create(
        self,
        config: ProviderConfig,
        credential: str | None = None,
    ) -> LLMProvider:
        """
        Create a provider instance.

        The credential is supplied at runtime and is never stored
        inside ProviderConfig.
        """

        factory = self.registry.get_factory(
            config.provider_id
        )

        provider = factory(
            config,
            credential,
        )

        if not isinstance(provider, LLMProvider):
            raise TypeError(
                f"Factory for provider "
                f"'{config.provider_id}' did not return "
                "an LLMProvider instance."
            )

        return provider