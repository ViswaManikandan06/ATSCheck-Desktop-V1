def test_feature_flags_use_configured_defaults(client, monkeypatch):
    monkeypatch.delenv("ATS_SCAN_ENABLED", raising=False)
    monkeypatch.delenv("RESUME_BUILDER_ENABLED", raising=False)
    monkeypatch.delenv("COVER_LETTER_ENABLED", raising=False)
    monkeypatch.delenv("JOB_TRACKER_ENABLED", raising=False)

    response = client.get("/api/v1/features")

    assert response.status_code == 200
    assert response.json() == {
        "ats_scan": False,
        "resume_builder": True,
        "cover_letter": True,
        "job_tracker": True,
    }


def test_disabled_ats_feature_blocks_api_requests(client, monkeypatch):
    monkeypatch.setenv("ATS_SCAN_ENABLED", "false")

    response = client.get("/api/v1/ats/scans")

    assert response.status_code == 404
    assert response.json()["detail"] == "The ats scan feature is disabled."


def test_disabled_tool_features_block_api_requests(client, monkeypatch):
    monkeypatch.setenv("COVER_LETTER_ENABLED", "false")
    monkeypatch.setenv("JOB_TRACKER_ENABLED", "false")

    job_response = client.get("/api/v1/jobs")
    cover_letter_response = client.post(
        "/api/v1/cover-letter/generate",
        json={
            "resume_uuid": "test-resume",
            "job_description": "A sufficiently long job description.",
            "company": "Example",
            "position": "Engineer",
        },
    )

    assert job_response.status_code == 404
    assert cover_letter_response.status_code == 404


def test_feature_flags_can_be_enabled_with_environment(client, monkeypatch):
    monkeypatch.setenv("ATS_SCAN_ENABLED", "yes")
    monkeypatch.setenv("RESUME_BUILDER_ENABLED", "off")
    monkeypatch.setenv("COVER_LETTER_ENABLED", "false")
    monkeypatch.setenv("JOB_TRACKER_ENABLED", "0")

    response = client.get("/api/v1/features")

    assert response.status_code == 200
    assert response.json() == {
        "ats_scan": True,
        "resume_builder": False,
        "cover_letter": False,
        "job_tracker": False,
    }
