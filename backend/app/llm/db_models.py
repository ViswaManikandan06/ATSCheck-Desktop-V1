from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LLMProviderSettings(Base):
    """
    Persistent configuration for an LLM provider.

    API keys and other secrets are NOT stored here.
    """

    __tablename__ = "llm_provider_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    provider_id: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        index=True,
    )

    model_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    endpoint: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    temperature: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.2,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ---------------------------------------------------------
    # Currently selected provider
    # ---------------------------------------------------------

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )