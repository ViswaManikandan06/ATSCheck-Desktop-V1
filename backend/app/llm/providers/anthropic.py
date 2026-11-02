from typing import Any

from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel

from ..base import LLMProvider


class AnthropicProvider(LLMProvider):
    """
    Anthropic implementation of the ATSCheck LLMProvider interface.

    LangChain handles:
    - Anthropic API communication
    - message conversion
    - structured output
    - provider-specific response handling
    """

    def __init__(
        self,
        api_key: str,
        model: str = "claude-sonnet-4-20250514",
        base_url: str | None = None,
    ) -> None:

        client_kwargs: dict[str, Any] = {
            "model": model,
            "api_key": api_key,
        }

        if base_url:
            client_kwargs["base_url"] = base_url

        self.client = ChatAnthropic(
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
        """

        model = self.client.bind(
            temperature=temperature,
            **kwargs,
        )

        response = await model.ainvoke(
            messages
        )

        return response.content if isinstance(
            response.content,
            str,
        ) else str(response.content)

    # =====================================================
    # STRUCTURED CHAT
    # =====================================================

    async def structured_chat(
        self,
        messages: list[dict[str, str]],
        *,
        schema: type[BaseModel],
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:
        """
        Execute a structured-output request.

        LangChain converts the Pydantic model into the
        provider-specific structured-output mechanism.

        The provider returns JSON so the higher-level
        LLMService can remain provider-independent.
        """

        structured_model = self.client.with_structured_output(
            schema
        )

        if temperature != 0.2 or kwargs:
            structured_model = structured_model.bind(
                temperature=temperature,
                **kwargs,
            )

        result = await structured_model.ainvoke(
            messages
        )

        if isinstance(result, BaseModel):
            return result.model_dump_json()

        if isinstance(result, dict):
            return schema.model_validate(
                result
            ).model_dump_json()

        raise RuntimeError(
            "Anthropic returned an unexpected "
            "structured response."
        )