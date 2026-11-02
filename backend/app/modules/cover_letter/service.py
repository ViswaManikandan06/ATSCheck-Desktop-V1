from app.llm.service import LLMService


class CoverLetterService:
    """
    LLM-powered cover letter generation service.

    Responsibilities:
    - Build the cover letter prompt.
    - Resolve the configured provider through LLMService.
    - Generate the cover letter.
    - Validate that a non-empty response was returned.

    It does not:
    - Implement provider-specific API logic.
    - Manage API keys.
    - Parse JSON.
    - Modify resumes.
    - Persist cover letters.
    """

    def __init__(
        self,
        llm_service: LLMService,
    ) -> None:
        self.llm = llm_service

    # =====================================================
    # GENERATE COVER LETTER
    # =====================================================

    async def generate(
        self,
        *,
        resume_text: str,
        job_description: str,
        company: str,
        position: str,
        tone: str,
        provider_id: str,
    ) -> str:
        """
        Generate a cover letter using the configured LLM
        provider.

        Cover letters intentionally use normal chat rather
        than structured output because the desired result
        is free-form text.
        """

        messages = [
            {
                "role": "system",
                "content": (
                    "You write concise, specific, professional "
                    "cover letters. "
                    "Use only facts supported by the resume. "
                    "Never invent employers, metrics, skills, "
                    "achievements, qualifications, or experience. "
                    "Do not claim experience that is not present "
                    "in the resume. "
                    "Return only the letter body without a "
                    "subject line, greeting commentary, explanation, "
                    "or Markdown code fence."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a {tone} cover letter for the "
                    f"{position} role at {company}.\n\n"
                    f"JOB DESCRIPTION:\n"
                    f"{job_description}\n\n"
                    f"RESUME:\n"
                    f"{resume_text}"
                ),
            },
        ]

        result = await self.llm.chat(
            provider_id=provider_id,
            messages=messages,
            temperature=0.5,
        )

        result = result.strip()

        if not result:
            raise ValueError(
                "The provider returned an empty cover letter."
            )

        return result
