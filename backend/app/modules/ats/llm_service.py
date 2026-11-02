from app.llm.models import ProviderConfig
from app.llm.service import LLMService

from .llm_models import (
    AchievementMatchResult,
    ExperienceMatchResult,
    KeywordMatchResult,
    SkillsMatchResult,
)

from .prompts import (
    ACHIEVEMENT_MATCH_SYSTEM_PROMPT,
    EXPERIENCE_MATCH_SYSTEM_PROMPT,
    SKILLS_MATCH_SYSTEM_PROMPT,
    build_achievement_match_prompt,
    build_experience_match_prompt,
    build_keyword_match_prompt,
    build_skills_match_prompt,
)


class ATSLLMService:
    """
    LLM-powered ATS analysis service.

    Responsibilities:
    - Build ATS analysis prompts.
    - Select the requested LLM provider/model.
    - Request structured responses using Pydantic schemas.
    - Return validated Pydantic analysis results.

    Provider-specific logic is completely delegated to
    the generic LLMService and LLM provider abstraction.

    This service does NOT:
    - Implement provider-specific API logic.
    - Handle JSON formatting.
    - Parse raw JSON.
    - Normalize provider-specific response formats.
    - Know how OpenAI, Anthropic, Gemini, Ollama, etc.
      implement structured output.
    - Calculate the overall ATS score.
    """

    def __init__(
        self,
        llm_service: LLMService,
    ) -> None:
        self.llm = llm_service

    # =========================================================
    # INTERNAL STRUCTURED REQUEST
    # =========================================================

    async def _structured_request(
        self,
        *,
        config: ProviderConfig,
        messages: list[dict[str, str]],
        schema: type,
    ):
        """
        Send a structured LLM request through the generic
        LLMService.

        The LLMService is responsible for:
        - Creating the configured provider.
        - Applying LangChain structured output.
        - Validating the response against the Pydantic schema.
        """

        return await self.llm.structured_chat(
            config=config,
            messages=messages,
            schema=schema,
            temperature=0.0,
        )

    # =========================================================
    # SKILLS
    # =========================================================

    async def analyze_skills(
        self,
        resume_text: str,
        job_description: str,
        config: ProviderConfig,
    ) -> SkillsMatchResult:
        """
        Analyze how well the resume's skills match
        the target job description.
        """

        messages = [
            {
                "role": "system",
                "content": SKILLS_MATCH_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_skills_match_prompt(
                    resume_text=resume_text,
                    job_description=job_description,
                ),
            },
        ]

        return await self._structured_request(
            config=config,
            messages=messages,
            schema=SkillsMatchResult,
        )

    # =========================================================
    # EXPERIENCE
    # =========================================================

    async def analyze_experience(
        self,
        resume_text: str,
        job_description: str,
        config: ProviderConfig,
    ) -> ExperienceMatchResult:
        """
        Analyze the relevance of the candidate's experience
        to the target job description.
        """

        messages = [
            {
                "role": "system",
                "content": EXPERIENCE_MATCH_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_experience_match_prompt(
                    resume_text=resume_text,
                    job_description=job_description,
                ),
            },
        ]

        return await self._structured_request(
            config=config,
            messages=messages,
            schema=ExperienceMatchResult,
        )

    # =========================================================
    # ACHIEVEMENTS
    # =========================================================

    async def analyze_achievements(
        self,
        resume_text: str,
        job_description: str,
        config: ProviderConfig,
    ) -> AchievementMatchResult:
        """
        Analyze how well the candidate's achievements
        support the target job requirements.
        """

        messages = [
            {
                "role": "system",
                "content": ACHIEVEMENT_MATCH_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": build_achievement_match_prompt(
                    resume_text=resume_text,
                    job_description=job_description,
                ),
            },
        ]

        return await self._structured_request(
            config=config,
            messages=messages,
            schema=AchievementMatchResult,
        )

    # =========================================================
    # KEYWORDS
    # =========================================================

    async def analyze_keywords(
        self,
        resume_text: str,
        job_description: str,
        config: ProviderConfig,
    ) -> KeywordMatchResult:
        """
        Analyze keyword alignment between the resume
        and target job description.
        """

        messages = build_keyword_match_prompt(
            resume_text=resume_text,
            job_description=job_description,
        )

        return await self._structured_request(
            config=config,
            messages=messages,
            schema=KeywordMatchResult,
        )
