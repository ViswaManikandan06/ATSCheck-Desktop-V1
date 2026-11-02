from fastapi import APIRouter

from app.core.features import FeatureName, get_enabled_features


router = APIRouter(
    prefix="/features",
    tags=["Features"],
)


@router.get("")
def list_features() -> dict[FeatureName, bool]:
    return get_enabled_features()
