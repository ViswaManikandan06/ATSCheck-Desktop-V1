import json

import httpx

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.api.schemas.llm_settings import (
    CredentialStatusResponse,
    DeleteLLMProviderResponse,
    LLMModelResponse,
    LLMProviderResponse,
    LLMProviderSettingsResponse,
    LLMProvidersResponse,
    LLMSettingsResponse,
    OllamaPullModelRequest,
    SaveCredentialRequest,
    SaveLLMSettingsRequest,
)

from app.core.database import get_db

from app.llm.credentials import CredentialStore
from app.llm.db_models import LLMProviderSettings
from app.llm.ollama_service import OllamaService
from app.llm.registry_setup import create_registry


router = APIRouter(
    prefix="/settings/llm",
    tags=["LLM Settings"],
)


credential_store = CredentialStore()


def _mask_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None

    if len(api_key) <= 4:
        return "*" * len(api_key)

    return f"{api_key[:2]}{'*' * 8}{api_key[-2:]}"


# =========================================================
# PROVIDER BASE URL
# =========================================================

def _provider_base_url(
    provider_id: str,
) -> str | None:

    provider_urls = {
        "openai": "https://api.openai.com/v1",
        "groq": "https://api.groq.com/openai/v1",
        "mistral": "https://api.mistral.ai/v1",
        "anthropic": "https://api.anthropic.com",
        "gemini": "https://generativelanguage.googleapis.com",
    }

    return provider_urls.get(provider_id)


# =========================================================
# OPENAI-COMPATIBLE MODEL DISCOVERY
# =========================================================

async def _list_openai_compatible_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    api_key = api_key or credential_store.get_secret(
        provider_id
    )

    if not api_key:
        return []

    base_url = _provider_base_url(provider_id)

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
    )

    try:
        response = await client.models.list()
        raw_models = getattr(
            response,
            "data",
            [],
        ) or []
    except Exception:
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    f"{base_url}/models",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=60,
                )

            if response.status_code >= 400:
                return []

            data = response.json()
            raw_models = (data or {}).get("data", []) or []
        except Exception:
            return []

    models: list[dict[str, str]] = []

    for model in raw_models:

        if isinstance(model, dict):
            model_id = model.get("id")
        else:
            model_id = getattr(
                model,
                "id",
                None,
            )

        if not model_id:
            continue

        models.append(
            {
                "model": model_id,
                "name": model_id,
                "display_name": model_id,
            }
        )

    return models


# =========================================================
# OLLAMA MODEL DISCOVERY
# =========================================================

async def _list_ollama_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    del provider_id, api_key

    service = OllamaService()

    try:

        runtime_models = await service.list_models()

        return [
            {
                "model": model["model"],
                "name": (
                    model.get("name")
                    or model["model"]
                ),
                "display_name": (
                    model.get("display_name")
                    or model.get("name")
                    or model["model"]
                ),
            }
            for model in runtime_models
        ]

    except RuntimeError:
        return []


# =========================================================
# GROQ
# =========================================================

async def _list_groq_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    return await _list_openai_compatible_models(
        provider_id,
        api_key=api_key,
    )


# =========================================================
# MISTRAL
# =========================================================

async def _list_mistral_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    return await _list_openai_compatible_models(
        provider_id,
        api_key=api_key,
    )


# =========================================================
# ANTHROPIC
# =========================================================

async def _list_anthropic_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    api_key = api_key or credential_store.get_secret(
        provider_id
    )

    if not api_key:
        return []

    try:

        async with httpx.AsyncClient() as client:

            response = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                timeout=60,
            )

    except Exception:
        return []

    if response.status_code >= 400:
        return []

    try:
        data = response.json()
    except Exception:
        return []

    models = data.get(
        "data",
        [],
    ) or []

    return [
        {
            "model": model.get("id"),
            "name": (
                model.get("display_name")
                or model.get("id")
            ),
            "display_name": (
                model.get("display_name")
                or model.get("id")
            ),
        }
        for model in models
        if model.get("id")
    ]


# =========================================================
# GEMINI
# =========================================================

async def _list_gemini_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    api_key = api_key or credential_store.get_secret(
        provider_id
    )

    if not api_key:
        return []

    try:

        async with httpx.AsyncClient() as client:

            response = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={
                    "key": api_key,
                },
                timeout=60,
            )

    except Exception:
        return []

    if response.status_code >= 400:
        return []

    try:
        data = response.json()
    except Exception:
        return []

    models = data.get(
        "models",
        [],
    ) or []

    result = []

    for model in models:

        full_name = model.get("name")

        if not full_name:
            continue

        model_id = full_name.split("/")[-1]

        display_name = (
            model.get("displayName")
            or model_id
        )

        result.append(
            {
                "model": model_id,
                "name": display_name,
                "display_name": display_name,
            }
        )

    return result


# =========================================================
# GENERIC RUNTIME MODEL DISCOVERY
# =========================================================

async def _list_runtime_provider_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[dict[str, str]]:

    discovery_handlers = {
        "openai": _list_openai_compatible_models,
        "groq": _list_groq_models,
        "mistral": _list_mistral_models,
        "anthropic": _list_anthropic_models,
        "gemini": _list_gemini_models,
        "ollama": _list_ollama_models,
    }

    handler = discovery_handlers.get(
        provider_id
    )

    if handler is None:
        return []

    return await handler(
        provider_id,
        api_key=api_key,
    )


# =========================================================
# RESPONSE HELPER
# =========================================================

def build_provider_response(
    settings: LLMProviderSettings,
) -> LLMProviderSettingsResponse:

    return LLMProviderSettingsResponse(
        provider_id=settings.provider_id,
        model_id=settings.model_id,
        endpoint=settings.endpoint,
        temperature=settings.temperature,
        enabled=settings.enabled,
        is_active=settings.is_active,
        has_credentials=(
            credential_store.has_secret(
                settings.provider_id
            )
        ),
    )


# =========================================================
# GET SAVED PROVIDER SETTINGS
# =========================================================

@router.get(
    "",
    response_model=LLMSettingsResponse,
)
async def get_llm_settings(
    db: Session = Depends(get_db),
) -> LLMSettingsResponse:

    settings = (
        db.query(
            LLMProviderSettings
        )
        .order_by(
            LLMProviderSettings.provider_id
        )
        .all()
    )

    return LLMSettingsResponse(
        providers=[
            build_provider_response(
                provider
            )
            for provider in settings
        ]
    )


# =========================================================
# GET ACTIVE PROVIDER
# =========================================================

@router.get(
    "/active",
    response_model=LLMProviderSettingsResponse,
)
async def get_active_llm_provider(
    db: Session = Depends(get_db),
) -> LLMProviderSettingsResponse:

    settings = (
        db.query(
            LLMProviderSettings
        )
        .filter(
            LLMProviderSettings.is_active.is_(True),
            LLMProviderSettings.enabled.is_(True),
        )
        .first()
    )

    if settings is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "No active LLM provider is configured. "
                "Please configure and select an LLM provider "
                "in Settings before analyzing a resume."
            ),
        )

    return build_provider_response(
        settings
    )


# =========================================================
# CREATE / UPDATE PROVIDER SETTINGS
# =========================================================

@router.post(
    "",
    response_model=LLMProviderSettingsResponse,
)
async def save_llm_settings(
    request: SaveLLMSettingsRequest,
    db: Session = Depends(get_db),
) -> LLMProviderSettingsResponse:

    provider_id = (
        request.provider_id.strip()
    )

    model_id = (
        request.model_id.strip()
    )

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    if not model_id:

        raise HTTPException(
            status_code=400,
            detail="Model ID cannot be empty.",
        )

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown LLM provider: "
                f"'{provider_id}'."
            ),
        )

    settings = (
        db.query(
            LLMProviderSettings
        )
        .filter(
            LLMProviderSettings.provider_id
            == provider_id
        )
        .first()
    )

    should_be_active = bool(
        request.is_active
    )

    if should_be_active:

        db.query(
            LLMProviderSettings
        ).update(
            {
                LLMProviderSettings.is_active: False,
            },
            synchronize_session=False,
        )

    if settings is None:

        settings = LLMProviderSettings(
            provider_id=provider_id,
            model_id=model_id,
            endpoint=request.endpoint,
            temperature=request.temperature,
            enabled=request.enabled,
            is_active=should_be_active,
        )

        db.add(settings)

    else:

        settings.model_id = model_id
        settings.endpoint = request.endpoint
        settings.temperature = request.temperature
        settings.enabled = request.enabled
        settings.is_active = should_be_active

    # ---------------------------------------------------------
    # Credentials
    # ---------------------------------------------------------

    if (
        provider_id != "ollama"
        and request.api_key is not None
    ):

        try:

            credential_store.set_secret(
                provider_id=provider_id,
                secret=request.api_key,
            )

        except ValueError as exc:

            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

    try:

        db.commit()
        db.refresh(settings)

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save "
                "LLM provider settings."
            ),
        ) from exc

    return build_provider_response(
        settings
    )


# =========================================================
# GET ALL AVAILABLE PROVIDERS + MODELS
# =========================================================

@router.get(
    "/providers",
    response_model=LLMProvidersResponse,
)
async def get_available_llm_providers(
) -> LLMProvidersResponse:

    registry = create_registry()

    providers = []

    for provider in registry.list_providers():

        runtime_models = (
            await _list_runtime_provider_models(
                provider.provider_id
            )
        )

        models = [
            LLMModelResponse(
                model_id=model["model"],
                display_name=(
                    model.get("display_name")
                    or model["model"]
                ),
                capabilities=[
                    "chat",
                    "structured_output",
                ],
            )
            for model in runtime_models
        ]

        providers.append(
            LLMProviderResponse(
                provider_id=provider.provider_id,
                display_name=provider.display_name,
                requires_api_key=provider.requires_api_key,
                models=models,
                capabilities=[
                    capability.value
                    for capability
                    in provider.capabilities
                ],
            )
        )

    return LLMProvidersResponse(
        providers=providers
    )


# =========================================================
# GET MODELS FOR PROVIDER
# =========================================================

@router.get(
    "/providers/{provider_id}/models",
    response_model=list[LLMModelResponse],
)
async def get_provider_models(
    provider_id: str,
    api_key: str | None = None,
) -> list[LLMModelResponse]:

    provider_id = provider_id.strip()

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                f"LLM provider "
                f"'{provider_id}' not found."
            ),
        )

    runtime_models = (
        await _list_runtime_provider_models(
            provider_id,
            api_key=api_key,
        )
    )

    return [
        LLMModelResponse(
            model_id=model["model"],
            display_name=(
                model.get("display_name")
                or model["model"]
            ),
            capabilities=[
                "chat",
                "structured_output",
            ],
        )
        for model in runtime_models
    ]


# =========================================================
# CHECK CREDENTIAL STATUS
# =========================================================

@router.get(
    "/{provider_id}/credential",
    response_model=CredentialStatusResponse,
)
async def check_provider_credential(
    provider_id: str,
) -> CredentialStatusResponse:

    provider_id = provider_id.strip()

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    stored_api_key = credential_store.get_secret(provider_id)

    return CredentialStatusResponse(
        provider_id=provider_id,
        has_credentials=stored_api_key is not None,
        masked_api_key=_mask_api_key(stored_api_key),
    )


@router.post(
    "/{provider_id}/credential",
    response_model=CredentialStatusResponse,
)
async def save_provider_credential(
    provider_id: str,
    request: SaveCredentialRequest,
) -> CredentialStatusResponse:

    provider_id = provider_id.strip()

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                f"LLM provider "
                f"'{provider_id}' not found."
            ),
        )

    try:
        credential_store.set_secret(
            provider_id,
            request.api_key.strip(),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    stored_api_key = credential_store.get_secret(provider_id)

    return CredentialStatusResponse(
        provider_id=provider_id,
        has_credentials=stored_api_key is not None,
        masked_api_key=_mask_api_key(stored_api_key),
    )


@router.delete(
    "/{provider_id}/credential",
    response_model=CredentialStatusResponse,
)
async def delete_provider_credential(
    provider_id: str,
) -> CredentialStatusResponse:

    provider_id = provider_id.strip()

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                f"LLM provider "
                f"'{provider_id}' not found."
            ),
        )

    credential_store.delete_secret(provider_id)

    return CredentialStatusResponse(
        provider_id=provider_id,
        has_credentials=False,
    )


# =========================================================
# DELETE PROVIDER
# =========================================================

@router.delete(
    "/{provider_id}",
    response_model=DeleteLLMProviderResponse,
)
async def delete_llm_provider(
    provider_id: str,
    db: Session = Depends(get_db),
) -> DeleteLLMProviderResponse:

    provider_id = provider_id.strip()

    settings = (
        db.query(
            LLMProviderSettings
        )
        .filter(
            LLMProviderSettings.provider_id
            == provider_id
        )
        .first()
    )

    if settings is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Provider "
                f"'{provider_id}' is not configured."
            ),
        )

    db.delete(settings)

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to delete "
                "provider settings."
            ),
        ) from exc

    credential_store.delete_secret(
        provider_id
    )

    return DeleteLLMProviderResponse(
        provider_id=provider_id,
        deleted=True,
    )


# =========================================================
# PROVIDER STATUS
# =========================================================

@router.get(
    "/providers/{provider_id}/status",
)
async def get_provider_status(
    provider_id: str,
):

    provider_id = provider_id.strip()

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                f"LLM provider "
                f"'{provider_id}' not found."
            ),
        )

    if provider_id == "ollama":

        service = OllamaService()

        try:

            return await service.check_status()

        except RuntimeError as exc:

            raise HTTPException(
                status_code=503,
                detail=str(exc),
            ) from exc

    return {
        "provider_id": provider_id,
        "running": True,
        "installed": True,
        "configured": True,
        "details": (
            "Provider is configured "
            "and available."
        ),
    }


# =========================================================
# PROVIDER RUNTIME MODELS
# =========================================================

@router.get(
    "/providers/{provider_id}/models/runtime",
)
async def get_provider_runtime_models(
    provider_id: str,
):

    provider_id = provider_id.strip()

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail="Provider ID cannot be empty.",
        )

    registry = create_registry()

    if not registry.has_provider(
        provider_id
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                f"LLM provider "
                f"'{provider_id}' not found."
            ),
        )

    runtime_models = (
        await _list_runtime_provider_models(
            provider_id,
        )
    )

    return {
        "models": [
            {
                "model": model["model"],
                "name": (
                    model.get("name")
                    or model["model"]
                ),
                "display_name": (
                    model.get("display_name")
                    or model.get("name")
                    or model["model"]
                ),
            }
            for model in runtime_models
        ]
    }


# =========================================================
# START OLLAMA
# =========================================================

@router.post(
    "/providers/ollama/serve",
)
async def serve_ollama_runtime():

    service = OllamaService()

    try:

        return await service.start_server()

    except RuntimeError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# =========================================================
# STOP OLLAMA
# =========================================================

@router.post(
    "/providers/ollama/disconnect",
)
async def disconnect_ollama_runtime():

    service = OllamaService()

    try:

        return await service.stop_server()

    except RuntimeError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# =========================================================
# PULL OLLAMA MODEL — STREAMING
# =========================================================

@router.post(
    "/providers/ollama/models/pull",
)
async def pull_ollama_model(
    request: OllamaPullModelRequest,
):

    model_id = (
        request.model_id or ""
    ).strip()

    if not model_id:

        raise HTTPException(
            status_code=400,
            detail="Model ID cannot be empty.",
        )

    service = OllamaService()

    async def event_stream():

        try:

            # -------------------------------------------------
            # Starting
            # -------------------------------------------------

            yield (
                json.dumps(
                    {
                        "status": "starting",
                        "model": model_id,
                        "progress": 0,
                    }
                )
                + "\n"
            )

            # -------------------------------------------------
            # Check Ollama
            # -------------------------------------------------

            status = await service.check_status()

            if not status.get("running"):

                yield (
                    json.dumps(
                        {
                            "status": "starting_server",
                            "model": model_id,
                            "progress": 0,
                        }
                    )
                    + "\n"
                )

                await service.start_server()

                yield (
                    json.dumps(
                        {
                            "status": "server_ready",
                            "model": model_id,
                            "progress": 0,
                        }
                    )
                    + "\n"
                )

            # -------------------------------------------------
            # Pull model
            # -------------------------------------------------

            async for event in service.pull_model_stream(
                model_id
            ):

                if not isinstance(
                    event,
                    dict,
                ):
                    event = {
                        "status": str(event),
                    }

                yield (
                    json.dumps(
                        event,
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            # -------------------------------------------------
            # Completed
            # -------------------------------------------------

            yield (
                json.dumps(
                    {
                        "status": "success",
                        "model": model_id,
                        "progress": 100,
                    }
                )
                + "\n"
            )

        except ValueError as exc:

            yield (
                json.dumps(
                    {
                        "status": "error",
                        "message": str(exc),
                    }
                )
                + "\n"
            )

        except RuntimeError as exc:

            yield (
                json.dumps(
                    {
                        "status": "error",
                        "message": str(exc),
                    }
                )
                + "\n"
            )

        except Exception as exc:

            yield (
                json.dumps(
                    {
                        "status": "error",
                        "message": (
                            "Unexpected error while "
                            f"pulling model: {exc}"
                        ),
                    }
                )
                + "\n"
            )

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
