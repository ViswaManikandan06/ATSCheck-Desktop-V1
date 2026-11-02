from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# ---------------------------------------------------------
# ATSCheck application directory
# ---------------------------------------------------------

ATSCheck_HOME = (
    Path.home() / "ATSCheck"
)

ATSCheck_HOME.mkdir(
    parents=True,
    exist_ok=True,
)


# ---------------------------------------------------------
# SQLite database
# ---------------------------------------------------------

DATABASE_PATH = (
    ATSCheck_HOME / "atscheck.db"
)

DATABASE_URL = (
    f"sqlite:///{DATABASE_PATH}"
)


# ---------------------------------------------------------
# SQLAlchemy
# ---------------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
)


def ensure_resume_version_commit_message_column() -> None:
    """Add the commit_message column for older SQLite databases."""
    with engine.begin() as connection:
        table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='resume_versions'"
        ).fetchone()

        if table is None:
            return

        columns = connection.exec_driver_sql(
            "PRAGMA table_info(resume_versions)"
        ).fetchall()

        if not any(column[1] == "commit_message" for column in columns):
            connection.exec_driver_sql(
                "ALTER TABLE resume_versions ADD COLUMN commit_message TEXT"
            )


def ensure_tailoring_draft_columns() -> None:
    """Upgrade existing local databases for persisted tailoring drafts."""
    with engine.begin() as connection:
        session_table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='tailoring_sessions'"
        ).fetchone()
        if session_table is not None:
            columns = connection.exec_driver_sql(
                "PRAGMA table_info(tailoring_sessions)"
            ).fetchall()
            if not any(column[1] == "base_resume_text" for column in columns):
                connection.exec_driver_sql(
                    "ALTER TABLE tailoring_sessions ADD COLUMN base_resume_text TEXT NOT NULL DEFAULT ''"
                )
            if not any(column[1] == "draft_content" for column in columns):
                connection.exec_driver_sql(
                    "ALTER TABLE tailoring_sessions ADD COLUMN draft_content TEXT NOT NULL DEFAULT ''"
                )

        version_table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='resume_versions'"
        ).fetchone()
        if version_table is not None:
            columns = connection.exec_driver_sql(
                "PRAGMA table_info(resume_versions)"
            ).fetchall()
            if not any(column[1] == "tailoring_session_id" for column in columns):
                connection.exec_driver_sql(
                    "ALTER TABLE resume_versions ADD COLUMN tailoring_session_id INTEGER REFERENCES tailoring_sessions(id) ON DELETE SET NULL"
                )
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_resume_versions_tailoring_session_id "
                "ON resume_versions (tailoring_session_id)"
            )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


# ---------------------------------------------------------
# Dependency
# ---------------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()