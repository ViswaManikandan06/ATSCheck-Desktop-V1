from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TailoringSession(Base):
    """
    Represents one tailoring operation for a specific analysis.

    A Scan represents:

        Resume + Job Description

    Therefore a TailoringSession belongs to a Scan.

    Example:

        Resume
          │
          └── Scan → Data Scientist JD
                │
                └── Tailoring Session
                      ├── Suggestion 1
                      ├── Suggestion 2
                      └── Suggestion 3
    """

    __tablename__ = "tailoring_sessions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    session_uuid: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    # ---------------------------------------------------------
    # Analysis context
    # ---------------------------------------------------------

    scan_id: Mapped[int] = mapped_column(
        ForeignKey(
            "scans.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ---------------------------------------------------------
    # LLM configuration
    # ---------------------------------------------------------

    provider_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    model_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    base_resume_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    draft_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Relationships
    # ---------------------------------------------------------

    scan = relationship(
        "Scan",
        back_populates="tailoring_sessions",
    )

    suggestions: Mapped[list["TailoringSuggestion"]] = relationship(
        "TailoringSuggestion",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class TailoringSuggestion(Base):
    """
    Represents one AI-generated tailoring suggestion.

    Suggestions belong to a TailoringSession and therefore
    indirectly belong to a specific:

        Resume + Job Description
    """

    __tablename__ = "tailoring_suggestions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey(
            "tailoring_sessions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ---------------------------------------------------------
    # Suggestion classification
    # ---------------------------------------------------------

    type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    source: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Resume location
    # ---------------------------------------------------------

    section: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Suggested change
    # ---------------------------------------------------------

    original_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    suggested_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Explanation
    # ---------------------------------------------------------

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    matched_job_requirement: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # User decision
    # ---------------------------------------------------------

    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Relationship
    # ---------------------------------------------------------

    session: Mapped[TailoringSession] = relationship(
        "TailoringSession",
        back_populates="suggestions",
    )
