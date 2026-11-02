from typing import Any, Callable

from ..base import LLMProvider


class MockProvider(LLMProvider):
    """
    Mock LLM provider used for testing.

    Supports either:
    1. A fixed response for every request.
    2. A response factory that can inspect the messages
       and return an appropriate response.
    """

    def __init__(
        self,
        response: str | None = None,
        response_factory: Callable[
            [list[dict[str, str]]],
            str,
        ] | None = None,
    ) -> None:

        if response is None and response_factory is None:
            raise ValueError(
                "Either response or response_factory "
                "must be provided."
            )

        if response is not None and response_factory is not None:
            raise ValueError(
                "Provide either response or response_factory, "
                "not both."
            )

        self.response = response
        self.response_factory = response_factory

    def _get_response(
        self,
        messages: list[dict[str, str]],
    ) -> str:

        if self.response_factory is not None:
            return self.response_factory(messages)

        return self.response  # type: ignore[return-value]

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> str:

        return self._get_response(messages)

    async def structured_chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> Any:

        response = self._get_response(messages)
        schema = kwargs.get("schema")

        if isinstance(response, str) and schema is not None:
            return schema.model_validate_json(response)

        return response