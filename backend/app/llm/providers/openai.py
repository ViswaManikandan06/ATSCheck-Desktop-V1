from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from ..base import LLMProvider


class OpenAIProvider(LLMProvider):
    """
    LangChain-backed provider for OpenAI-compatible APIs.

    This provider can be used for:
    - OpenAI
    - Groq
    - Mistral
    - Other OpenAI-compatible endpoints

    LangChain handles:
    - API communication
    - message conversion
    - structured output
    - Pydantic schema validation
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4.1-mini",
        base_url: str | None = None,
        temperature: float = 0.2,
    ) -> None:

        client_kwargs: dict[str, Any] = {
            "model": model,
            "api_key": api_key,
            "temperature": temperature,
        }

        if base_url:
            client_kwargs["base_url"] = base_url

        self.client = ChatOpenAI(
            **client_kwargs
        )

    # =====================================================
    # NORMAL CHAT
    # =====================================================

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:
        """
        Execute a normal chat request.

        The application communicates using provider-agnostic
        message dictionaries.
        """

        model = self.client

        if temperature != self.client.temperature:
            model = model.bind(
                temperature=temperature
            )

        if kwargs:
            model = model.bind(
                **kwargs
            )

        response = await model.ainvoke(
            messages
        )

        if isinstance(response.content, str):
            return response.content

        return str(response.content)

    # =====================================================
    # STRUCTURED CHAT
    # =====================================================

    async def structured_chat(
        self,
        messages: list[dict[str, str]],
        *,
        schema: type[BaseModel],
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> BaseModel:
        """
        Execute a structured-output request.

        LangChain converts the supplied Pydantic model into
        the appropriate structured-output mechanism for the
        underlying OpenAI-compatible provider.

        No provider-specific JSON parsing is performed here.
        """

        model = self.client

        if temperature != self.client.temperature:
            model = model.bind(
                temperature=temperature
            )

        structured_model = model.with_structured_output(
            schema
        )

        if kwargs:
            structured_model = structured_model.bind(
                **kwargs
            )

        result = await structured_model.ainvoke(
            messages
        )

        if isinstance(result, BaseModel):
            return result

        if isinstance(result, dict):
            return schema.model_validate(
                result
            )

        raise RuntimeError(
            "OpenAI-compatible provider returned "
            "an unexpected structured response type: "
            f"{type(result).__name__}"
        )