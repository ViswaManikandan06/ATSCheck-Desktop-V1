from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.llm.credentials import CredentialStore
from app.llm.db_models import LLMProviderSettings
from app.llm.models import ProviderConfig
from app.llm.registry import ProviderRegistry


class LLMService:
    """
    Central service responsible for creating and using
    configured LLM providers.

    Responsibilities:
    - Read provider configuration from SQLite.
    - Read the currently active provider configuration.
    - Build ProviderConfig.
    - Retrieve credentials from the OS credential store.
    - Create providers through ProviderRegistry factories.
    - Execute generic chat requests.
    - Execute provider-agnostic structured chat requests.

    This service does NOT contain:
    - ATS prompts
    - Tailoring prompts
    - Resume logic
    - JSON parsing
    - Provider-specific API logic
    - Provider-specific structured-output logic
    """

    def __init__(
        self,
        db: Session,
        registry: ProviderRegistry,
        credential_store: CredentialStore,
    ) -> None:
        self.db = db
        self.registry = registry
        self.credential_store = credential_store

    # =====================================================
    # GET SAVED PROVIDER SETTINGS
    # =====================================================

    def get_provider_settings(
        self,
        provider_id: str,
    ) -> LLMProviderSettings:
        """
        Load a specific provider configuration from SQLite.
        """

        settings = (
            self.db.query(LLMProviderSettings)
            .filter(
                LLMProviderSettings.provider_id == provider_id
            )
            .first()
        )

        if settings is None:
            raise ValueError(
                f"Provider '{provider_id}' is not configured."
            )

        if not settings.enabled:
            raise ValueError(
                f"Provider '{provider_id}' is disabled."
            )

        return settings

    # =====================================================
    # GET ACTIVE PROVIDER SETTINGS
    # =====================================================

    def get_active_provider_settings(
        self,
    ) -> LLMProviderSettings:
        """
        Load the provider currently selected in Settings.
        """

        settings = (
            self.db.query(LLMProviderSettings)
            .filter(
                LLMProviderSettings.is_active.is_(True),
                LLMProviderSettings.enabled.is_(True),
            )
            .first()
        )

        if settings is None:
            raise ValueError(
                "No active LLM provider is configured."
            )

        return settings

    # =====================================================
    # BUILD PROVIDER CONFIG
    # =====================================================

    def build_provider_config(
        self,
        provider_id: str,
        model_id: str | None = None,
    ) -> ProviderConfig:
        """
        Convert a database provider setting into a runtime
        ProviderConfig.

        Secrets are intentionally excluded.
        """

        settings = self.get_provider_settings(
            provider_id
        )

        return ProviderConfig(
            provider_id=settings.provider_id,
            model_id=model_id or settings.model_id,
            endpoint=settings.endpoint,
            temperature=settings.temperature,
        )

    # =====================================================
    # BUILD ACTIVE PROVIDER CONFIG
    # =====================================================

    def build_active_provider_config(
        self,
    ) -> ProviderConfig:
        """
        Build a ProviderConfig using the provider/model
        currently selected in Settings.
        """

        settings = self.get_active_provider_settings()

        return ProviderConfig(
            provider_id=settings.provider_id,
            model_id=settings.model_id,
            endpoint=settings.endpoint,
            temperature=settings.temperature,
        )

    # =====================================================
    # GET PROVIDER CREDENTIAL
    # =====================================================

    def get_provider_credential(
        self,
        provider_id: str,
    ) -> str | None:
        """
        Retrieve the provider credential from the OS
        credential store.

        API keys are never stored in SQLite.
        """

        return self.credential_store.get_secret(
            provider_id
        )

    # =====================================================
    # VALIDATE PROVIDER CREDENTIAL
    # =====================================================

    def validate_provider_credentials(
        self,
        config: ProviderConfig,
    ) -> None:
        """
        Validate credentials for the selected provider.

        Providers such as Ollama do not require an API key.
        Cloud providers normally do.
        """

        metadata = self.registry.get_metadata(
            config.provider_id
        )

        if not metadata.requires_api_key:
            return

        credential = self.get_provider_credential(
            config.provider_id
        )

        if not credential:
            raise ValueError(
                f"No API key is configured for "
                f"provider '{config.provider_id}'."
            )

    # =====================================================
    # CREATE PROVIDER FROM CONFIG
    # =====================================================

    def create_provider(
        self,
        config: ProviderConfig,
    ):
        """
        Create an LLM provider using the registered factory.
        """

        if not self.registry.has_provider(
            config.provider_id
        ):
            raise ValueError(
                f"Unknown LLM provider: "
                f"'{config.provider_id}'."
            )

        factory = self.registry.get_factory(
            config.provider_id
        )

        credential = self.get_provider_credential(
            config.provider_id
        )

        return factory(
            config,
            credential,
        )

    # =====================================================
    # CREATE CONFIGURED PROVIDER
    # =====================================================

    def get_provider(
        self,
        provider_id: str,
    ):
        """
        Load the saved provider configuration and create
        the provider.
        """

        config = self.build_provider_config(
            provider_id
        )

        self.validate_provider_credentials(
            config
        )

        return self.create_provider(
            config
        )

    # =====================================================
    # CREATE ACTIVE PROVIDER
    # =====================================================

    def get_active_provider(self):
        """
        Load the currently selected provider/model and
        create the provider.
        """

        config = self.build_active_provider_config()

        self.validate_provider_credentials(
            config
        )

        return self.create_provider(
            config
        )

    # =====================================================
    # CHAT
    # =====================================================

    async def chat(
        self,
        *,
        provider_id: str,
        messages: list[dict[str, Any]],
        temperature: float | None = None,
        **kwargs: Any,
    ) -> str:
        """
        Execute a normal chat request using a specific
        configured provider.
        """

        config = self.build_provider_config(
            provider_id
        )

        self.validate_provider_credentials(
            config
        )

        provider = self.create_provider(
            config
        )

        actual_temperature = (
            temperature
            if temperature is not None
            else config.temperature
        )

        return await provider.chat(
            messages=messages,
            temperature=actual_temperature,
            **kwargs,
        )

    # =====================================================
    # ACTIVE CHAT
    # =====================================================

    async def active_chat(
        self,
        *,
        messages: list[dict[str, Any]],
        temperature: float | None = None,
        **kwargs: Any,
    ) -> str:
        """
        Execute a normal chat request using the provider/model
        currently selected in Settings.
        """

        config = self.build_active_provider_config()

        self.validate_provider_credentials(
            config
        )

        provider = self.create_provider(
            config
        )

        actual_temperature = (
            temperature
            if temperature is not None
            else config.temperature
        )

        return await provider.chat(
            messages=messages,
            temperature=actual_temperature,
            **kwargs,
        )

    # =====================================================
    # STRUCTURED CHAT
    # =====================================================

    async def structured_chat(
        self,
        *,
        config: ProviderConfig,
        messages: list[dict[str, Any]],
        schema: type[BaseModel],
        temperature: float | None = None,
        **kwargs: Any,
    ) -> BaseModel:
        """
        Execute a provider-agnostic structured-output request.

        The caller supplies a Pydantic model:

            schema=ExperienceMatchResult

        The provider implementation uses LangChain's
        structured-output support and returns a validated
        Pydantic object.

        This service does NOT:
        - generate JSON schemas
        - build response_format objects
        - parse JSON
        - call model_validate_json()
        - handle provider-specific structured output
        """

        self.validate_provider_credentials(
            config
        )

        provider = self.create_provider(
            config
        )

        actual_temperature = (
            temperature
            if temperature is not None
            else config.temperature
        )

        result = await provider.structured_chat(
            messages=messages,
            schema=schema,
            temperature=actual_temperature,
            **kwargs,
        )

        if not isinstance(result, schema):
            raise TypeError(
                f"Provider '{config.provider_id}' returned "
                f"{type(result).__name__} instead of "
                f"{schema.__name__}."
            )

        return result
