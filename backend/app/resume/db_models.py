from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Resume(Base):
    """
    Represents the actual uploaded resume file.

    One Resume can be reused across multiple analyses.

    Example:

        Resume
        ├── Scan 1 → Google JD
        │     ├── Analysis result
        │     └── Tailored versions
        │
        ├── Scan 2 → Amazon JD
        │     ├── Analysis result
        │     └── Tailored versions
        │
        └── Scan 3 → Microsoft JD
              ├── Analysis result
              └── Tailored versions

    The Resume represents the original uploaded resume.

    A Scan represents one:

        Resume + Job Description

    ResumeVersion represents a version created from
    a particular analysis.
    """

    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    resume_uuid: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    # ---------------------------------------------------------
    # Original file
    # ---------------------------------------------------------

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    storage_path: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    file_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    file_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    # ---------------------------------------------------------
    # Parsed resume
    # ---------------------------------------------------------

    parsed_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    word_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    page_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    text_extractable: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    is_scanned_image: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Metadata
    # ---------------------------------------------------------

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ---------------------------------------------------------
    # Analyses
    # ---------------------------------------------------------

    scans = relationship(
        "Scan",
        back_populates="resume",
        cascade="all, delete-orphan",
    )

    # ---------------------------------------------------------
    # Job tracker applications
    # ---------------------------------------------------------

    applications = relationship(
        "JobApplication",
        back_populates="resume",
        cascade="all, delete-orphan",
    )

    # ---------------------------------------------------------
    # Resume versions
    # ---------------------------------------------------------

    versions = relationship(
        "ResumeVersion",
        back_populates="resume",
        cascade="all, delete-orphan",
    )
