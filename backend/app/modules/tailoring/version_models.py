from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ResumeVersion(Base):
    """
    Represents a version of a resume created within
    a specific analysis / job-description context.

    Example:

        Resume
        │
        ├── Scan 1 → Google JD
        │     ├── Version 1
        │     ├── Version 2
        │     └── Version 3
        │
        └── Scan 2 → Amazon JD
              ├── Version 1
              └── Version 2

    A ResumeVersion therefore belongs to:

        Resume + Scan
    """

    __tablename__ = "resume_versions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    version_uuid: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    # ---------------------------------------------------------
    # Parent Resume
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
    # Analysis / JD context
    # ---------------------------------------------------------

    scan_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "scans.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    tailoring_session_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "tailoring_sessions.id",
            ondelete="SET NULL",
        ),
        unique=True,
        nullable=True,
        index=True,
    )

    # ---------------------------------------------------------
    # Version
    # ---------------------------------------------------------

    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    commit_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    storage_path: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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
        back_populates="versions",
    )

    scan = relationship(
        "Scan",
        back_populates="versions",
    )
