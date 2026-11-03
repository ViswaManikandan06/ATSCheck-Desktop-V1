# Contributing to ATSCheck Desktop

Thank you for considering a contribution. Fixes, tests, documentation,
accessibility improvements, bug reports, and carefully scoped feature ideas all
help make ATSCheck better.

## Before opening a change

1. Read the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).
2. Search existing [issues](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/issues)
   and pull requests so work is not duplicated.
3. For a substantial feature or behavior change, open an issue first to agree
   on the problem and scope.
4. Do not publish real resumes, API keys, credentials, database files, or
   private provider responses in issues, tests, screenshots, or commits.

## Set up the project

Follow [Build and run from source](docs/DEVELOPMENT.md) for supported tools,
native prerequisites, dependency installation, and local run instructions.

In short, contributions to the desktop app may touch three areas:

- `frontend/` — React and Vite interface.
- `backend/` — FastAPI service, parsing, storage, and model integrations.
- `frontend/src-tauri/` — native desktop shell and app packaging.

## A good contribution

- **Solve a clear problem.** Explain who is affected and what should improve.
- **Keep the diff focused.** Avoid unrelated formatting, generated output, or
  opportunistic refactors.
- **Follow existing patterns.** Prefer clear types, validation, and visible
  errors over silent fallback behavior.
- **Preserve privacy.** Keep API keys out of source, logs, screenshots,
  configuration snapshots, and test fixtures.
- **Design for people.** Use accessible labels, keyboard-friendly controls,
  useful empty states, and clear error messages.
- **Test behavior.** Add or update tests when behavior changes.
- **Update documentation.** Keep setup, user, developer, and release guidance
  aligned with the actual product.

## Tests and checks

Run the relevant checks before asking for review.

### Frontend

```sh
cd frontend
npm run lint
npm run build
```

### Backend

```sh
cd backend
./.venv/bin/python -m pytest -q \
  tests/test_health.py \
  tests/test_feature_flags.py \
  tests/test_resume_parser.py \
  tests/test_resume_api.py
```

On Windows PowerShell, use:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q `
  tests\test_health.py `
  tests\test_feature_flags.py `
  tests\test_resume_parser.py `
  tests\test_resume_api.py
```

Run additional test modules related to the changed behavior. For native-shell
or packaging changes, see the desktop build and smoke-test guidance in
[Development](docs/DEVELOPMENT.md). If a check cannot be run, say which one
and why in the pull request.

## Branch, commit, and pull request

1. Create a short, descriptive branch from `main`.
2. Make a focused change and add tests or documentation as appropriate.
3. Run the relevant validation commands and inspect the complete diff.
4. Confirm no secrets, real personal data, build products, or local files are
   staged.
5. Push your branch and open a pull request against `main`.

In the pull request:

- Describe the problem, the solution, and any user-visible change.
- List the exact validation commands and whether each passed or failed.
- Mention changes to setup, storage, database migrations, feature flags, or
  providers.
- Include screenshots for visual changes, using synthetic data only.
- Mark untested behavior clearly instead of implying it was verified.

The repository pull request template is there to help capture these details.

## Reporting bugs and suggesting features

Use the repository's [issue tracker](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/issues).
For a bug, include the app version, operating system, safe reproduction steps,
expected behavior, and observed behavior. Use synthetic data. Never attach a
resume, local database, API key, or an unredacted provider response.

For feature ideas, explain the user problem, the desired outcome, and any
important constraints or alternatives. For a suspected security
vulnerability, follow the private process in [SECURITY.md](SECURITY.md)
instead of opening a public issue.

## License

By submitting a contribution, you agree that it may be distributed under the
project's [MIT License](LICENSE).
