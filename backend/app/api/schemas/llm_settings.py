from typing import Literal

from pydantic import BaseModel, Field


# =========================================================
# LLM PROVIDER / MODEL DISCOVERY
# =========================================================

class LLMModelResponse(BaseModel):

    model_id: str

    display_name: str

    capabilities: list[str]


class LLMProviderResponse(BaseModel):

    provider_id: str

    display_name: str

    requires_api_key: bool

    models: list[LLMModelResponse]

    capabilities: list[str]


class LLMProvidersResponse(BaseModel):

    providers: list[LLMProviderResponse]


# =========================================================
# SAVED PROVIDER SETTINGS
# =========================================================

class SaveLLMSettingsRequest(BaseModel):

    provider_id: str = Field(
        min_length=1,
    )

    model_id: str = Field(
        min_length=1,
    )

    api_key: str | None = None

    endpoint: str | None = None

    temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
    )

    enabled: bool = True

    is_active: bool = False


class LLMProviderSettingsResponse(BaseModel):

    provider_id: str

    model_id: str

    endpoint: str | None

    temperature: float

    enabled: bool

    is_active: bool

    has_credentials: bool


class LLMSettingsResponse(BaseModel):

    providers: list[
        LLMProviderSettingsResponse
    ]


class OllamaPullModelRequest(BaseModel):

    model_id: str = Field(
        min_length=1,
    )


# =========================================================
# CREDENTIAL STATUS
# =========================================================

class CredentialStatusResponse(BaseModel):

    provider_id: str

    has_credentials: bool

    masked_api_key: str | None = None


class SaveCredentialRequest(BaseModel):

    api_key: str = Field(
        min_length=1,
    )


# =========================================================
# DELETE PROVIDER
# =========================================================

class DeleteLLMProviderResponse(BaseModel):

    provider_id: str

    deleted: bool