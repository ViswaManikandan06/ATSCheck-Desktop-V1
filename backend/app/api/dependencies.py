from functools import lru_cache

from app.llm.credentials import CredentialStore
from app.llm.registry_setup import create_registry
from app.llm.service import LLMService
from app.modules.ats.analysis_service import ATSAnalysisService
from app.modules.ats.llm_service import ATSLLMService
from app.modules.tailoring.llm_service import TailoringLLMService
from app.modules.tailoring.service import TailoringService


@lru_cache
def get_credential_store() -> CredentialStore:
    return CredentialStore()


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService(
        registry=create_registry(),
        credential_store=get_credential_store(),
    )


@lru_cache
def get_ats_llm_service() -> ATSLLMService:
    return ATSLLMService(
        llm_service=get_llm_service(),
    )


@lru_cache
def get_ats_analysis_service() -> ATSAnalysisService:
    return ATSAnalysisService(
        llm_service=get_ats_llm_service(),
    )

@lru_cache
def get_tailoring_llm_service() -> TailoringLLMService:

    return TailoringLLMService(
        llm_service=get_llm_service(),
    )


def get_tailoring_service(
    db,
) -> TailoringService:

    return TailoringService(
        db=db,
        llm_service=get_tailoring_llm_service(),
    )