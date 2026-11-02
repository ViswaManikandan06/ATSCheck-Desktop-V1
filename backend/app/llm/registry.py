from typing import Type

from .base import LLMProvider
from .models import (
    Capability,
    ModelInfo,
    ProviderFactory,
    ProviderMetadata,
)


class ProviderRegistry:
    """
    Central registry for all LLM providers supported by ATSCheck.
    """

    def __init__(self) -> None:
        self._providers: dict[
            str,
            tuple[
                Type[LLMProvider],
                ProviderMetadata,
                ProviderFactory,
            ],
        ] = {}

    def register(
        self,
        provider_id: str,
        provider_class: Type[LLMProvider],
        metadata: ProviderMetadata,
        factory: ProviderFactory,
    ) -> None:

        if not issubclass(
            provider_class,
            LLMProvider,
        ):
            raise TypeError(
                f"{provider_class.__name__} "
                "must inherit from LLMProvider."
            )

        if provider_id in self._providers:
            raise ValueError(
                f"Provider '{provider_id}' "
                "is already registered."
            )

        if metadata.provider_id != provider_id:
            raise ValueError(
                "provider_id does not match "
                "metadata.provider_id."
            )

        self._providers[provider_id] = (
            provider_class,
            metadata,
            factory,
        )

    def unregister(
        self,
        provider_id: str,
    ) -> None:

        if provider_id not in self._providers:
            raise ValueError(
                f"Provider '{provider_id}' "
                "is not registered."
            )

        del self._providers[provider_id]

    def has_provider(
        self,
        provider_id: str,
    ) -> bool:

        return provider_id in self._providers

    def get_provider_class(
        self,
        provider_id: str,
    ) -> Type[LLMProvider]:

        if provider_id not in self._providers:
            raise ValueError(
                f"Unknown LLM provider: "
                f"'{provider_id}'."
            )

        provider_class, _, _ = self._providers[
            provider_id
        ]

        return provider_class

    def get_factory(
        self,
        provider_id: str,
    ) -> ProviderFactory:

        if provider_id not in self._providers:
            raise ValueError(
                f"Unknown LLM provider: "
                f"'{provider_id}'."
            )

        _, _, factory = self._providers[
            provider_id
        ]

        return factory

    def get_metadata(
        self,
        provider_id: str,
    ) -> ProviderMetadata:

        if provider_id not in self._providers:
            raise ValueError(
                f"Unknown LLM provider: "
                f"'{provider_id}'."
            )

        _, metadata, _ = self._providers[
            provider_id
        ]

        return metadata

    def get_model(
        self,
        provider_id: str,
        model_id: str,
    ) -> ModelInfo:

        metadata = self.get_metadata(
            provider_id
        )

        for model in metadata.models:
            if model.model_id == model_id:
                return model

        raise ValueError(
            f"Unknown model '{model_id}' "
            f"for provider '{provider_id}'."
        )

    def list_providers(
        self,
    ) -> list[ProviderMetadata]:

        return [
            metadata
            for _, metadata, _ in self._providers.values()
        ]

    def list_models(
        self,
        provider_id: str,
    ) -> list[ModelInfo]:

        metadata = self.get_metadata(
            provider_id
        )

        return list(metadata.models)

    def supports(
        self,
        provider_id: str,
        capability: Capability,
    ) -> bool:

        metadata = self.get_metadata(
            provider_id
        )

        return capability in metadata.capabilities

    def model_supports(
        self,
        provider_id: str,
        model_id: str,
        capability: Capability,
    ) -> bool:

        model = self.get_model(
            provider_id,
            model_id,
        )

        return capability in model.capabilities

    def get_providers_with_capability(
        self,
        capability: Capability,
    ) -> list[ProviderMetadata]:

        return [
            metadata
            for _, metadata, _ in self._providers.values()
            if capability in metadata.capabilities
        ]

    def get_models_with_capability(
        self,
        capability: Capability,
    ) -> list[tuple[str, ModelInfo]]:

        results: list[
            tuple[str, ModelInfo]
        ] = []

        for provider_id, (
            _,
            metadata,
            _,
        ) in self._providers.items():

            for model in metadata.models:

                if capability in model.capabilities:
                    results.append(
                        (
                            provider_id,
                            model,
                        )
                    )

        return results