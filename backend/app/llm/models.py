from dataclasses import dataclass, field
from enum import Enum
from typing import Callable

from .base import LLMProvider


class Capability(str, Enum):
    """
    Capabilities supported by an LLM provider or model.
    """

    CHAT = "chat"
    STRUCTURED_OUTPUT = "structured_output"
    VISION = "vision"
    EMBEDDINGS = "embeddings"


@dataclass(frozen=True)
class ModelInfo:
    """
    Metadata describing an individual LLM model.
    """

    model_id: str
    display_name: str

    capabilities: frozenset[Capability] = field(
        default_factory=frozenset
    )


@dataclass(frozen=True)
class ProviderMetadata:
    """
    Metadata describing an LLM provider.
    """

    provider_id: str
    display_name: str

    requires_api_key: bool = True

    models: tuple[ModelInfo, ...] = ()

    capabilities: frozenset[Capability] = field(
        default_factory=frozenset
    )


@dataclass(frozen=True)
class ProviderConfig:
    """
    Runtime configuration for an LLM provider.

    Contains only non-secret configuration.

    Credentials are retrieved separately through the
    CredentialStore and are never stored here.
    """

    provider_id: str
    model_id: str

    endpoint: str | None = None

    temperature: float = 0.2


ProviderFactory = Callable[
    [ProviderConfig, str | None],
    LLMProvider,
]