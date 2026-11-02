# Feature flags

Feature availability is configured through backend environment variables.
Restart the backend after changing a value, then reload the desktop app. The
packaged Tauri app starts its own local backend; it reads these variables from
the environment inherited when the desktop app is launched.

| Environment variable | Feature | Default |
| --- | --- | --- |
| `ATS_SCAN_ENABLED` | ATS resume analysis, tailoring, scan history, analytics, and resume versions | `false` |
| `RESUME_BUILDER_ENABLED` | Resume builder | `true` |
| `COVER_LETTER_ENABLED` | Cover letter generator | `true` |
| `JOB_TRACKER_ENABLED` | Job tracker | `true` |

Use `true` or `false` (also accepts `1`/`0`, `yes`/`no`, and `on`/`off`).
For example, to enable ATS analysis for a backend started from a shell:

```sh
cd backend
ATS_SCAN_ENABLED=true .venv/bin/python -m uvicorn app.main:app --reload
```

On Windows PowerShell, set the variable before launching the desktop app:

```powershell
$env:ATS_SCAN_ENABLED = "true"
& "C:\path\to\ATSCheck Desktop.exe"
```

Replace the executable path with the installation location on your system.
To turn the feature off again, set the variable to `false` or remove it, then
restart the app.

On macOS or Linux, launch the installed app with the variable in its
environment. For example, on macOS:

```sh
ATS_SCAN_ENABLED=true "/Applications/ATSCheck Desktop.app/Contents/MacOS/atscheck-desktop"
```

Disabled tools are hidden in the frontend, their pages redirect to the dashboard,
and their corresponding API routes reject requests. Feature state is available
from `GET /api/v1/features`.
