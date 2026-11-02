from .credentials import CredentialStore
from .models import ProviderConfig
from .settings import ProviderSettings


class LLMConfigManager:
    """
    Combines non-secret provider settings with secure credentials.

    This class is responsible for preparing the runtime
    configuration required to create an LLM provider.
    """

    def __init__(
        self,
        credential_store: CredentialStore,
    ) -> None:

        self.credential_store = credential_store

    def build_config(
        self,
        settings: ProviderSettings,
    ) -> ProviderConfig:
        """
        Build a ProviderConfig from user settings.

        Credentials are intentionally not included in ProviderConfig.
        """

        if not settings.enabled:
            raise ValueError(
                f"Provider '{settings.provider_id}' is disabled."
            )

        return ProviderConfig(
            provider_id=settings.provider_id,
            model_id=settings.model_id,
            endpoint=settings.endpoint,
            temperature=settings.temperature,
        )

    def get_credential(
        self,
        provider_id: str,
    ) -> str | None:
        """
        Retrieve the provider credential securely.
        """

        return self.credential_store.get_secret(
            provider_id
        )

    def has_credential(
        self,
        provider_id: str,
    ) -> bool:
        """
        Check whether a provider has a stored credential.
        """

        return self.credential_store.has_secret(
            provider_id
        )

    def save_credential(
        self,
        provider_id: str,
        credential: str,
    ) -> None:
        """
        Save a provider credential securely.
        """

        self.credential_store.set_secret(
            provider_id,
            credential,
        )

    def remove_credential(
        self,
        provider_id: str,
    ) -> None:
        """
        Remove a provider credential.
        """

        self.credential_store.delete_secret(
            provider_id
        )