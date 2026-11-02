import os
from typing import Literal

from fastapi import Depends, HTTPException


FeatureName = Literal[
    "ats_scan",
    "resume_builder",
    "cover_letter",
    "job_tracker",
]


FEATURE_ENV_VARS: dict[FeatureName, str] = {
    "ats_scan": "ATS_SCAN_ENABLED",
    "resume_builder": "RESUME_BUILDER_ENABLED",
    "cover_letter": "COVER_LETTER_ENABLED",
    "job_tracker": "JOB_TRACKER_ENABLED",
}


DEFAULT_FEATURES: dict[FeatureName, bool] = {
    "ats_scan": False,
    "resume_builder": True,
    "cover_letter": True,
    "job_tracker": True,
}


def get_enabled_features() -> dict[FeatureName, bool]:
    features: dict[FeatureName, bool] = {}

    for feature, environment_variable in FEATURE_ENV_VARS.items():
        value = os.getenv(environment_variable)

        if value is None:
            features[feature] = DEFAULT_FEATURES[feature]
            continue

        normalized_value = value.strip().lower()
        if normalized_value in {"1", "true", "yes", "on"}:
            features[feature] = True
        elif normalized_value in {"0", "false", "no", "off"}:
            features[feature] = False
        else:
            raise ValueError(
                f"{environment_variable} must be a boolean value."
            )

    return features


def require_feature(feature: FeatureName):
    def ensure_enabled() -> None:
        if not get_enabled_features()[feature]:
            raise HTTPException(
                status_code=404,
                detail=f"The {feature.replace('_', ' ')} feature is disabled.",
            )

    return Depends(ensure_enabled)
