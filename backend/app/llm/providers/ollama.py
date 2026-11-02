from typing import Any

from langchain_ollama import ChatOllama
from pydantic import BaseModel

from ..base import LLMProvider


class OllamaProvider(LLMProvider):
    """
    Ollama implementation of the ATSCheck LLMProvider interface.

    Ollama runs locally, so no API key is required.

    LangChain handles:
    - Ollama communication
    - message conversion
    - structured output
    - Pydantic schema validation
    """

    def __init__(
        self,
        model: str = "llama3.1:8b",
        host: str | None = None,
    ) -> None:

        client_kwargs: dict[str, Any] = {
            "model": model,
        }

        if host:
            client_kwargs["base_url"] = host

        self.client = ChatOllama(
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
        Execute a normal Ollama chat request.
        """

        model = self.client.bind(
            temperature=temperature,
            **kwargs,
        )

        try:
            response = await model.ainvoke(
                messages
            )

        except Exception as exc:
            raise RuntimeError(
                "Ollama is not running or unreachable. "
                "Start Ollama and verify that the Ollama "
                "server is available at the configured endpoint."
            ) from exc

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
    ) -> BaseModel:
        """
        Execute a structured Ollama request.

        LangChain converts the Pydantic schema into the
        appropriate structured-output mechanism.

        Returns:
            A validated Pydantic model instance.
        """

        model = self.client.bind(
            temperature=temperature,
            **kwargs,
        )

        structured_model = model.with_structured_output(
            schema
        )

        try:
            result = await structured_model.ainvoke(
                messages
            )

        except Exception as exc:
            raise RuntimeError(
                "Ollama structured-output request failed. "
                "Verify that Ollama is running, the selected "
                "model is installed, and the model supports "
                "structured output."
            ) from exc

        if isinstance(result, schema):
            return result

        if isinstance(result, dict):
            try:
                return schema.model_validate(
                    result
                )
            except Exception as exc:
                raise RuntimeError(
                    f"Ollama returned structured data that "
                    f"could not be validated as "
                    f"{schema.__name__}."
                ) from exc

        raise RuntimeError(
            "Ollama returned an unexpected structured "
            f"response of type {type(result).__name__}."
        )
