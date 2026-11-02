from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from pydantic import BaseModel

from ..base import LLMProvider


class LangChainProvider(LLMProvider):
    """
    Common provider adapter built on top of LangChain.

    This class hides LangChain-specific behavior from the rest
    of ATSCheck.

    Provider-specific classes only need to construct the
    appropriate LangChain chat model.

    Example:

        ChatOpenAI
        ChatAnthropic
        ChatGoogleGenerativeAI
        ChatOllama

    All of them are exposed to the application through the
    same LLMProvider interface.
    """

    def __init__(
        self,
        model: BaseChatModel,
    ) -> None:
        self.model = model

    # =====================================================
    # MESSAGE CONVERSION
    # =====================================================

    @staticmethod
    def _convert_messages(
        messages: list[dict[str, str]],
    ) -> list[BaseMessage]:
        """
        Convert ATSCheck's provider-agnostic message format
        into LangChain message objects.
        """

        converted: list[BaseMessage] = []

        for message in messages:
            role = message.get("role")
            content = message.get("content", "")

            if role == "system":
                converted.append(
                    SystemMessage(
                        content=content
                    )
                )

            elif role == "user":
                converted.append(
                    HumanMessage(
                        content=content
                    )
                )

            else:
                raise ValueError(
                    f"Unsupported message role: '{role}'."
                )

        return converted

    # =====================================================
    # CHAT
    # =====================================================

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:
        """
        Execute a normal chat request through LangChain.
        """

        model = self.model

        if temperature is not None:
            model = model.bind(
                temperature=temperature
            )

        response = await model.ainvoke(
            self._convert_messages(messages),
            **kwargs,
        )

        content = response.content

        if isinstance(content, str):
            return content

        return str(content)

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
        Execute a structured-output request through LangChain.

        The supplied Pydantic model is used as the response schema.

        LangChain handles the provider-specific structured-output
        implementation internally.
        """

        model = self.model

        if temperature is not None:
            model = model.bind(
                temperature=temperature
            )

        structured_model = model.with_structured_output(
            schema
        )

        result = await structured_model.ainvoke(
            self._convert_messages(messages),
            **kwargs,
        )

        if isinstance(result, schema):
            return result

        if isinstance(result, dict):
            return schema.model_validate(result)

        raise TypeError(
            "LangChain returned an unexpected structured "
            f"response type: {type(result).__name__}."
        )