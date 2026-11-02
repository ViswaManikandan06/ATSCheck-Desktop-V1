from app.llm.models import ProviderConfig
from app.llm.service import LLMService

from .llm_models import TailoringResponse
from .prompts import (
    TAILORING_SYSTEM_PROMPT,
    build_tailoring_prompt,
)


class TailoringLLMService:
    """
    Handles LLM-powered resume tailoring.

    Responsibilities:
    - Build resume-tailoring prompts.
    - Resolve the configured LLM provider.
    - Request structured tailoring output.
    - Return validated Pydantic results.

    It does not:
    - Perform ATS analysis.
    - Modify resumes.
    - Persist suggestions.
    - Access tailoring database records.
    - Manage API keys.
    - Parse JSON.
    - Implement provider-specific logic.

    Architecture:

        Resume + Job Description + ATS Analysis
                         ↓
                TailoringLLMService
                         ↓
                  LLMService
                         ↓
              LangChain Provider
                         ↓
                TailoringResponse
    """

    def __init__(
        self,
        llm_service: LLMService,
    ) -> None:
        self.llm = llm_service

    # =====================================================
    # GENERATE TAILORING SUGGESTIONS
    # =====================================================

    async def generate_suggestions(
        self,
        *,
        resume_text: str,
        job_description: str,
        provider_id: str,
        model_id: str | None = None,
        analysis: dict | None = None,
    ) -> list[dict]:
        """
        Generate structured resume-tailoring suggestions.

        The provider returns a validated TailoringResponse
        through the generic LLMService abstraction.
        """

        messages = [
            {
                "role": "system",
                "content": TAILORING_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_tailoring_prompt(
                    resume_text=resume_text,
                    job_description=job_description,
                    analysis=analysis,
                ),
            },
        ]

        config: ProviderConfig = (
            self.llm.build_provider_config(
                provider_id,
                model_id=model_id,
            )
        )

        result: TailoringResponse = (
            await self.llm.structured_chat(
                config=config,
                messages=messages,
                temperature=config.temperature,
                schema=TailoringResponse,
            )
        )

        return [
            suggestion.model_dump()
            for suggestion in result.suggestions
        ]
