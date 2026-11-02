from dataclasses import dataclass


@dataclass
class ProviderSettings:
    """
    User-selected configuration for an LLM provider.

    Secrets such as API keys are handled separately
    by CredentialStore.
    """

    provider_id: str
    model_id: str

    endpoint: str | None = None

    temperature: float = 0.2

    enabled: bool = True

    def __post_init__(self) -> None:
        if not self.provider_id.strip():
            raise ValueError(
                "Provider ID cannot be empty."
            )

        if not self.model_id.strip():
            raise ValueError(
                "Model ID cannot be empty."
            )

        if not 0.0 <= self.temperature <= 2.0:
            raise ValueError(
                "Temperature must be between 0.0 and 2.0."
            )

        if self.endpoint is not None:
            self.endpoint = self.endpoint.strip() or None