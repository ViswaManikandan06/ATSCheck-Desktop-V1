from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from ..base import LLMProvider


class GeminiProvider(LLMProvider):
    """
    Google Gemini implementation of the ATSCheck
    LLMProvider interface.

    LangChain handles:
    - Gemini API communication
    - message conversion
    - structured output
    - provider-specific schema handling
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        base_url: str | None = None,
    ) -> None:

        client_kwargs: dict[str, Any] = {
            "model": model,
            "google_api_key": api_key,
        }

        # Gemini's LangChain integration normally manages
        # its own endpoint. Keep endpoint support optional
        # for future/custom configurations.
        if base_url:
            client_kwargs["base_url"] = base_url

        self.client = ChatGoogleGenerativeAI(
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
        Execute a normal Gemini chat request.
        """

        model = self.client.bind(
            temperature=temperature,
            **kwargs,
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
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:
        """
        Execute a structured Gemini request using
        a Pydantic schema.

        LangChain handles conversion of the Pydantic
        model into Gemini's structured-output format.
        """

        structured_model = self.client.with_structured_output(
            schema
        )

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
            "Gemini returned an unexpected "
            "structured response."
        )