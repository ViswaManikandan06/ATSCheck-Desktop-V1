from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class LLMProvider(ABC):
    """
    Provider-agnostic interface for all LLM implementations.

    Provider-specific API details are hidden behind this interface.
    LangChain-backed providers implement these operations.

    The application only needs to know:
    - how to perform normal chat
    - how to request a structured Pydantic response
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:
        """
        Execute a normal conversational request.

        Returns:
            Plain text response from the LLM.
        """
        raise NotImplementedError

    @abstractmethod
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

        Args:
            messages:
                Provider-agnostic chat messages.

            schema:
                Pydantic model describing the expected response.

            temperature:
                Sampling temperature.

        Returns:
            A validated Pydantic model instance.

        Provider-specific structured-output handling is
        implemented internally by the provider.
        """
        raise NotImplementedError