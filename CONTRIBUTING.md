# Contributing

Thanks for helping improve ATSCheck Desktop. Contributions of code,
documentation, bug reports, and thoughtful feature proposals are welcome.

## Before you start

1. Read the [code of conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md).
2. Check existing issues and pull requests before starting substantial work.
3. For a large change, open an issue first so the approach can be discussed.
4. Do not include real resumes, API keys, personal data, generated binaries, or
   local database files in issues, tests, or commits.

## Development setup

Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to install the frontend,
backend, and Tauri prerequisites.

## Change guidelines

- Keep changes focused and follow existing patterns.
- Add or update tests for behavior changes.
- Update user and developer documentation when behavior or setup changes.
- Keep credentials out of source, logs, screenshots, and test fixtures.
- Prefer accessible controls and clear error messages.

## Checks

Before opening a pull request, run the applicable checks:

```sh
cd frontend
npm run lint
npm run build
```

```sh
cd backend
./.venv/bin/python -m pytest \
  tests/test_health.py \
  tests/test_feature_flags.py \
  tests/test_resume_parser.py \
  tests/test_resume_api.py
```

Also run the tests relevant to the files you changed. On Windows, use
`.venv\Scripts\python.exe -m pytest` for the backend test command. If a check
cannot be run locally, mention that in the pull request.

## Pull requests

- Use a descriptive title and explain the user-visible change.
- Include the reason for the change, test results, and any migration or setup
  impact.
- Include before/after screenshots for visual changes, with personal
  information removed.
- Keep each pull request reviewable; avoid bundling unrelated formatting or
  generated files.

By submitting a contribution, you agree that it may be distributed under the
project's [MIT License](LICENSE).
