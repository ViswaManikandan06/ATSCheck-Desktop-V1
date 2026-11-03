# Build and run ATSCheck Desktop from source

This guide is for contributors and users who want to run the application from
the repository or produce a native installer. If you only want to install the
app, download it from the [GitHub Releases page](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases)
and follow the [installation guide](SETUP.md).

## What runs where?

- **Frontend:** React and Vite application under `frontend/`.
- **API:** FastAPI service under `backend/`.
- **Desktop shell:** Tauri v2 project under `frontend/src-tauri/`.
- **Packaged app:** starts a PyInstaller API sidecar bound to `127.0.0.1:8000`.
- **Development app:** run the Python API separately, then start the Tauri
  development window.

## Prerequisites

Install the tools below before following the commands:

| Tool | Version / notes |
| --- | --- |
| Node.js and npm | Node.js 22 LTS |
| Python | Python 3.12 |
| Rust and Cargo | Stable Rust; see the Tauri prerequisite page for the current supported toolchain |
| Native desktop dependencies | Required by Tauri and your operating system |
| System keyring | Needed to save provider credentials through the OS credential store |

### Platform build prerequisites

- **macOS:** Xcode Command Line Tools.
- **Windows:** Microsoft C++ Build Tools and WebView2 Runtime.
- **Debian/Ubuntu:** `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`,
  `libssl-dev`, `librsvg2-dev`, `patchelf`, `libwebkit2gtk-4.1-dev`,
  `libayatana-appindicator3-dev`, and `xdg-utils`. Install `rpm` too if you
  need RPM output.

Tauri system package names vary by distribution and release. Use the official
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for
platform-specific installation instructions.

## Clone the repository

```sh
git clone https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1.git
cd ATSCheck-Desktop-V1
```

Do not add real resumes, `.env` files, API keys, local databases, or generated
installers to Git. The repository includes ignore rules, but always review
`git status` before committing.

## Install project dependencies

### macOS and Linux

From the repository root:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd frontend
npm ci
```

### Windows PowerShell

From the repository root:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install --upgrade pip
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
cd frontend
npm ci
```

The `requirements-dev.txt` manifest includes the backend runtime and packaging
dependencies, plus test tools. The desktop build uses PyInstaller to bundle
the API sidecar. The build script uses `backend/.venv` when it is present;
otherwise set `PYTHON` to the Python executable containing the required
packages.

## Run the application in development

Open two terminals at the repository root.

**Terminal 1 — start the API:**

```sh
cd backend
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

On Windows PowerShell, from the repository root:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — start the desktop UI:**

```sh
cd frontend
npm run tauri:dev
```

The development shell expects the API to be running on port `8000`. To run
only the web UI in a browser, start `npm run dev` from `frontend`; make sure
the backend is also running.

The API binds to loopback only. Do not expose it on a network interface
without implementing authentication and reviewing the security model.

## Build a native installer

From `frontend`, after installing the Python dependencies and native Tauri
prerequisites:

```sh
npm run tauri:build
```

The Tauri build runs the configured pre-build steps: it bundles the backend
into a platform-specific PyInstaller sidecar, builds the frontend, then
packages the desktop shell. Generated bundles appear under
`frontend/src-tauri/target/release/bundle/`.

Build on the operating system and architecture you intend to distribute for.
The Python sidecar is native to its build host and is not cross-compiled.
The packaged app starts the API automatically; end users do not need Python.

## Feature configuration

The backend reads feature flags from its process environment. In development,
set a variable before starting Uvicorn. For example:

```sh
cd backend
ATS_SCAN_ENABLED=true .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The packaged Tauri app inherits environment variables from the process that
launches it. See [Feature flags](feature-flags.md) for the full list and
platform-specific launch examples.

## Tests and checks

Run the frontend checks from `frontend`:

```sh
npm run lint
npm run build
```

Run the focused backend regression suite from `backend`:

```sh
.venv/bin/python -m pytest -q \
  tests/test_health.py \
  tests/test_feature_flags.py \
  tests/test_resume_parser.py \
  tests/test_resume_api.py
```

On Windows, use `.venv\Scripts\python.exe -m pytest -q` followed by the same
test paths. Run additional tests relevant to your changes. The CI workflow
also checks that the Linux Tauri shell compiles.

Before distributing a build, test installation, first launch, PDF and DOCX
uploads, keyring access, application shutdown, and preservation of local data
on each supported operating system. Unsigned builds may trigger platform
security warnings.

## Troubleshooting the development setup

| Problem | Check |
| --- | --- |
| `npm` cannot find `package.json` | Change into `frontend` before running frontend scripts. |
| Import or Python package errors | Activate the intended virtual environment or set `PYTHON`; reinstall `backend/requirements-dev.txt`. |
| Tauri cannot find Rust | Install stable Rust and confirm `rustc` and `cargo` are on `PATH`. |
| Linux WebKit or GTK errors | Install the distribution-specific Tauri prerequisites. |
| Desktop UI cannot reach API | Start Uvicorn in the other terminal and confirm port `8000` is available. |
| `tauri:build` cannot make a sidecar | Confirm Python build dependencies are installed and PyInstaller can run in that environment. |

If the problem persists, open an issue with the command, operating system,
tool versions, and relevant error text. Remove credentials, private paths,
resume content, and other personal data from logs before sharing.

## Related documentation

- [End-user installation](SETUP.md)
- [User guide](USER_GUIDE.md)
- [Feature flags](feature-flags.md)
- [Release process](RELEASES.md)
- [Contribution guide](../CONTRIBUTING.md)
