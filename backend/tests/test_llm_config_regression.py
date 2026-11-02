import pytest

from app.api.routes import llm_settings


@pytest.mark.asyncio
async def test_runtime_model_discovery_uses_explicit_api_key(monkeypatch):
    class FakeResponse:
        def __init__(self):
            self.data = [{"id": "gpt-4o-mini"}]

    class FakeModelsClient:
        def __init__(self, api_key, base_url):
            self.api_key = api_key
            self.base_url = base_url

        async def list(self):
            return FakeResponse()

    class FakeAsyncOpenAI:
        def __init__(self, api_key, base_url=None):
            self.api_key = api_key
            self.base_url = base_url
            self.models = FakeModelsClient(api_key, base_url)

    monkeypatch.setattr(llm_settings, "AsyncOpenAI", FakeAsyncOpenAI)

    models = await llm_settings._list_runtime_provider_models(
        "openai",
        api_key="sk-test-key",
    )

    assert models == [{
        "model": "gpt-4o-mini",
        "name": "gpt-4o-mini",
        "display_name": "gpt-4o-mini",
    }]
