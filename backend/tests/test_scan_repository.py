from app.modules.ats.repository import ScanRepository


def test_create_scan(db_session):
    repository = ScanRepository(db_session)

    scan = repository.create_scan(
        resume_id=1,
        job_description="Data Scientist with Python experience.",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    assert scan.id is not None
    assert scan.scan_uuid is not None
    assert scan.resume_id == 1
    assert scan.provider_id == "ollama"
    assert scan.model_id == "llama3.1:8b"
    assert scan.status == "pending"


def test_get_scan(db_session):
    repository = ScanRepository(db_session)

    created = repository.create_scan(
        resume_id=1,
        job_description="Data Scientist",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    found = repository.get_scan(
        created.scan_uuid
    )

    assert found is not None
    assert found.id == created.id


def test_list_scans(db_session):
    repository = ScanRepository(db_session)

    repository.create_scan(
        resume_id=1,
        job_description="Job A",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    repository.create_scan(
        resume_id=1,
        job_description="Job B",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    scans = repository.list_scans(
        resume_id=1
    )

    assert len(scans) == 2


def test_complete_scan(db_session):
    repository = ScanRepository(db_session)

    scan = repository.create_scan(
        resume_id=1,
        job_description="Data Scientist",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    repository.complete_scan(
        scan=scan,
        overall_score=87.5,
    )

    assert scan.status == "completed"
    assert scan.overall_score == 87.5


def test_fail_scan(db_session):
    repository = ScanRepository(db_session)

    scan = repository.create_scan(
        resume_id=1,
        job_description="Data Scientist",
        provider_id="ollama",
        model_id="llama3.1:8b",
    )

    repository.fail_scan(
        scan=scan
    )

    assert scan.status == "failed"