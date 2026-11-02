from datetime import datetime
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    scan_uuid: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    # ---------------------------------------------------------
    # Parent resume
    # ---------------------------------------------------------

    resume_id: Mapped[int] = mapped_column(
        ForeignKey(
            "resumes.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ---------------------------------------------------------
    # Job description
    # ---------------------------------------------------------

    job_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # LLM configuration used for this analysis
    # ---------------------------------------------------------

    provider_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    model_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Analysis result
    # ---------------------------------------------------------

    overall_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

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
    # Relationships
    # ---------------------------------------------------------

    resume = relationship(
        "Resume",
        back_populates="scans",
    )

    result = relationship(
        "ScanResult",
        back_populates="scan",
        uselist=False,
        cascade="all, delete-orphan",
    )

    tailoring_sessions = relationship(
        "TailoringSession",
        back_populates="scan",
        cascade="all, delete-orphan",
    )

    versions = relationship(
        "ResumeVersion",
        back_populates="scan",
        cascade="all, delete-orphan",
    )


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    scan_id: Mapped[int] = mapped_column(
        ForeignKey(
            "scans.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
        index=True,
    )

    ats_compatibility_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    resume_structure_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    analysis_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    scan: Mapped[Scan] = relationship(
        "Scan",
        back_populates="result",
    )
