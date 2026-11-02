import pytest
from pydantic import ValidationError

from app.modules.ats.llm_models import (
    AchievementEvidence,
    AchievementMatchResult,
    ExperienceEvidence,
    ExperienceMatchResult,
    LLMATSAnalysisResult,
    SkillEvidence,
    SkillsMatchResult,
)


def test_skill_match_result():
    result = SkillsMatchResult(
        score=85,
        matched_skills=[
            "Python",
            "FastAPI",
        ],
        partially_matched_skills=[
            "Docker",
        ],
        missing_skills=[
            "Kubernetes",
        ],
        evidence=[
            SkillEvidence(
                skill="Python",
                resume_evidence=(
                    "Built OCR pipelines using Python."
                ),
                relevance=(
                    "Directly relevant to the role."
                ),
            )
        ],
        recommendations=[
            "Highlight Python experience."
        ],
    )

    assert result.score == 85
    assert "Python" in result.matched_skills
    assert "Kubernetes" in result.missing_skills
    assert len(result.evidence) == 1


def test_skill_evidence_accepts_legacy_provider_shapes():
    result = SkillsMatchResult(
        score=85,
        evidence=[
            {
                "skill": "Python",
                "text": "Built projects using Python.",
            },
            '{"skill":"PyTorch","text":"Trained models with PyTorch."}',
        ],
    )

    assert result.evidence[0].resume_evidence == (
        "Built projects using Python."
    )
    assert result.evidence[1].resume_evidence == (
        "Trained models with PyTorch."
    )
    assert result.evidence[0].relevance


def test_experience_match_result():
    result = ExperienceMatchResult(
        score=78,
        relevant_experience=[
            "Built production ML pipelines."
        ],
        partially_relevant_experience=[
            "Worked with cloud infrastructure."
        ],
        missing_experience=[
            "Kubernetes production experience."
        ],
        evidence=[
            ExperienceEvidence(
                requirement="Production ML experience",
                resume_evidence=(
                    "Developed and deployed ML pipelines."
                ),
                relevance=(
                    "Strongly aligned with the requirement."
                ),
                strength="strong",
            )
        ],
        recommendations=[
            "Add measurable production impact."
        ],
    )

    assert result.score == 78
    assert len(result.evidence) == 1
    assert result.evidence[0].strength == "strong"


def test_achievement_match_result():
    result = AchievementMatchResult(
        score=90,
        strong_achievements=[
            "Improved OCR accuracy to 99%."
        ],
        weak_achievements=[
            "Worked on multiple ML projects."
        ],
        missing_achievements=[
            "No quantified business impact."
        ],
        evidence=[
            AchievementEvidence(
                achievement="OCR accuracy improvement",
                resume_evidence=(
                    "Improved OCR accuracy to 99%."
                ),
                impact=(
                    "Improved document extraction reliability."
                ),
                quality="strong",
            )
        ],
        recommendations=[
            "Add business impact where possible."
        ],
    )

    assert result.score == 90
    assert len(result.evidence) == 1


def test_complete_llm_ats_result():
    result = LLMATSAnalysisResult(
        skills=SkillsMatchResult(
            score=80,
        ),
        experience=ExperienceMatchResult(
            score=75,
        ),
        achievements=AchievementMatchResult(
            score=90,
        ),
    )

    assert result.skills.score == 80
    assert result.experience.score == 75
    assert result.achievements.score == 90


def test_score_cannot_exceed_100():
    with pytest.raises(ValidationError):
        SkillsMatchResult(
            score=101,
        )


def test_score_cannot_be_negative():
    with pytest.raises(ValidationError):
        ExperienceMatchResult(
            score=-1,
        )


def test_optional_lists_default_to_empty():
    result = SkillsMatchResult(
        score=70,
    )

    assert result.matched_skills == []
    assert result.partially_matched_skills == []
    assert result.missing_skills == []
    assert result.evidence == []
    assert result.recommendations == []