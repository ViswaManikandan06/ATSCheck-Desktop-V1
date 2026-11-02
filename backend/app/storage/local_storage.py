from pathlib import Path


ATSCheck_HOME = (
    Path.home() / "ATSCheck"
)

RESUME_STORAGE_DIR = (
    ATSCheck_HOME / "resumes"
)


def save_file(
    content: bytes,
    filename: str,
) -> str:

    RESUME_STORAGE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    destination = (
        RESUME_STORAGE_DIR / filename
    )

    destination.write_bytes(
        content
    )

    return str(destination)


def delete_file(
    storage_path: str,
) -> None:

    path = Path(storage_path)

    if path.exists():
        path.unlink()