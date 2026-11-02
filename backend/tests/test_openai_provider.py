from types import SimpleNamespace

import pytest

from app.llm.providers.openai import OpenAIProvider


class FakeCompletions:

    def __init__(self):
        self.kwargs = None

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content='{"score": 90}')
                )
            ]
        )


@pytest.mark.asyncio
async def test_structured_chat_wraps_json_schema_for_openai():
    provider = OpenAIProvider(api_key="test-key")
    completions = FakeCompletions()
    provider.client = SimpleNamespace(
        chat=SimpleNamespace(completions=completions)
    )

    result = await provider.structured_chat(
        messages=[{"role": "user", "content": "Analyze this."}],
        format={
            "title": "AnalysisResult",
            "type": "object",
            "properties": {"score": {"type": "number"}},
            "required": ["score"],
        },
    )

    assert result == '{"score": 90}'
    assert completions.kwargs["response_format"] == {
        "type": "json_schema",
        "json_schema": {
            "name": "AnalysisResult",
            "strict": True,
            "schema": {
                "title": "AnalysisResult",
                "type": "object",
                "properties": {"score": {"type": "number"}},
                "required": ["score"],
            },
        },
    }


@pytest.mark.asyncio
async def test_structured_chat_uses_json_object_mode():
    provider = OpenAIProvider(api_key="test-key")
    completions = FakeCompletions()
    provider.client = SimpleNamespace(
        chat=SimpleNamespace(completions=completions)
    )

    await provider.structured_chat(
        messages=[{"role": "user", "content": "Return JSON."}],
        format="json",
    )

    assert completions.kwargs["response_format"] == {
        "type": "json_object",
    }