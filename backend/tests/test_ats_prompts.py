from app.modules.ats.prompts import (
    build_achievement_match_prompt,
    build_experience_match_prompt,
    build_keyword_match_prompt,
    build_skills_match_prompt,
)


RESUME = """
Python developer with experience building REST APIs using FastAPI.
Improved an OCR pipeline to 99% accuracy.
Worked with AWS, Docker, and PyTorch.
"""


JOB_DESCRIPTION = """
We are looking for a Data Scientist with experience in Python,
machine learning, FastAPI, AWS, and Kubernetes.
The candidate should be able to build production ML systems
and demonstrate measurable business impact.
"""


def test_skills_prompt_contains_resume_and_job_description():
    prompt = build_skills_match_prompt(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
    )

    assert RESUME in prompt
    assert JOB_DESCRIPTION in prompt
    assert "matched skills" in prompt.lower()
    assert "missing skills" in prompt.lower()


def test_experience_prompt_contains_resume_and_job_description():
    prompt = build_experience_match_prompt(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
    )

    assert RESUME in prompt
    assert JOB_DESCRIPTION in prompt
    assert "relevant experience" in prompt.lower()
    assert "missing experience" in prompt.lower()


def test_achievement_prompt_contains_resume_and_job_description():
    prompt = build_achievement_match_prompt(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
    )

    assert RESUME in prompt
    assert JOB_DESCRIPTION in prompt
    assert "strong achievements" in prompt.lower()
    assert "weak" in prompt.lower()


def test_skills_system_prompt_prevents_fabrication():
    from app.modules.ats.prompts import SKILLS_MATCH_SYSTEM_PROMPT

    prompt = SKILLS_MATCH_SYSTEM_PROMPT.lower()

    assert "never invent" in prompt
    assert "fabricat" in prompt

def test_keyword_prompt_contains_resume_and_job_description():

    messages = build_keyword_match_prompt(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
    )

    combined = " ".join(
        message["content"]
        for message in messages
    )

    assert RESUME.strip() in combined
    assert JOB_DESCRIPTION.strip() in combined

def test_keyword_system_prompt_prevents_fabrication():

    messages = build_keyword_match_prompt(
        resume_text=RESUME,
        job_description=JOB_DESCRIPTION,
    )

    system_prompt = messages[0]["content"]

    assert "Never invent experience" in system_prompt
    assert "unsupported skills" in system_prompt