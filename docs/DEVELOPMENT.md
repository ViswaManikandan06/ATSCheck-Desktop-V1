# Build and run from source

This guide is for contributors and users who prefer to build ATSCheck Desktop
themselves. End users can use the native installers when available instead.

## Prerequisites

- Node.js 22 LTS and npm
- Python 3.12 (the backend syntax requires Python 3.10 or later)
- Rust stable 1.90 or later, including `rustc` and Cargo
- Tauri's operating-system prerequisites:
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Microsoft C++ Build Tools and WebView2 Runtime
  - **Debian/Ubuntu:** `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`,
    `libssl-dev`, `librsvg2-dev`, `patchelf`, `libwebkit2gtk-4.1-dev`, and
    `libayatana-appindicator3-dev`
- A supported system keyring for saving provider credentials

See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for
distribution-specific package names and current requirements.

## Install dependencies

From the project root:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd frontend
npm ci
```

On Windows PowerShell:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
cd frontend
npm ci
```

The frontend package script uses the Python interpreter in `backend/.venv`
when present. Set `PYTHON` to another Python executable if needed.

## Run in development

Start the backend in one terminal:

```sh
cd backend
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

On Windows, use `.venv\Scripts\python.exe` instead of the Unix-style
interpreter path.

Start the Tauri desktop shell in another terminal:

```sh
cd frontend
npm run tauri:dev
```

The development shell expects the API above to be running. The production app
bundles and starts its own API sidecar.

To run the web UI in a browser instead, use `npm run dev` from `frontend`.

## Build a desktop installer

From `frontend`, with the backend build dependencies installed:

```sh
npm run tauri:build
```

The build first creates a platform-specific PyInstaller API sidecar, then
builds the Tauri app. Installer files appear under
`frontend/src-tauri/target/release/bundle/`. Build on each target operating
system/architecture; a sidecar binary is platform-specific and is not
cross-compiled.

## Backend configuration

Feature flags are read from the environment of the backend process. See
[feature flags](feature-flags.md). ATS analysis is off by default. In
development, set `ATS_SCAN_ENABLED=true` before starting Uvicorn to enable it.

The local database and uploaded files are stored under `~/ATSCheck`. The
backend binds to loopback only; do not change this to a network interface
without adding authentication and reviewing the security model.

## Tests and checks

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

Run other test modules relevant to your changes as well. On Windows, use
`.venv\Scripts\python.exe -m pytest` for the backend test command.

For production-grade installers, also test installation, first launch,
keyring access, application shutdown, and upgrade behavior on each supported
operating system.
