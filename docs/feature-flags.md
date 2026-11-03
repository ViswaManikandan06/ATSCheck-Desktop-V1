# Configure feature availability

ATSCheck Desktop uses backend environment variables to enable or disable
selected feature groups. This is useful for local testing, demonstrations, or
temporarily hiding a feature. **There is no in-app feature-toggle screen at
this time.**

## Available switches

| Environment variable | Controls | Default |
| --- | --- | --- |
| `ATS_SCAN_ENABLED` | ATS analysis, tailoring, scan history, analytics, and resume versions | `false` |
| `RESUME_BUILDER_ENABLED` | Resume builder | `true` |
| `COVER_LETTER_ENABLED` | Cover-letter generator | `true` |
| `JOB_TRACKER_ENABLED` | Job tracker | `true` |

Values are case-insensitive. Accepted true values are `true`, `1`, `yes`, and
`on`; accepted false values are `false`, `0`, `no`, and `off`. An invalid
value is an explicit configuration error rather than a silent fallback.

## Start the development API with a flag

Set the variable in the same shell that starts Uvicorn:

### macOS or Linux

```sh
cd backend
ATS_SCAN_ENABLED=true .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Windows PowerShell

```powershell
cd backend
$env:ATS_SCAN_ENABLED = "true"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

To turn a feature off for the same shell, set its value to `false` instead.
Close the running API and restart it after changing a variable.

## Start an installed desktop app with a flag

The packaged Tauri app starts its own local API. The API inherits the
environment of the desktop process, so set the value **before launching the
app**. Restart the desktop app after any change.

### macOS

For ATS analysis, from Terminal:

```sh
ATS_SCAN_ENABLED=true "/Applications/ATSCheck Desktop.app/Contents/MacOS/atscheck-desktop"
```

Use the same pattern for another variable, for example:

```sh
RESUME_BUILDER_ENABLED=false "/Applications/ATSCheck Desktop.app/Contents/MacOS/atscheck-desktop"
```

### Windows PowerShell

Set the variable and launch the installed executable in the same PowerShell
session. Replace the example path with the actual installation path:

```powershell
$env:ATS_SCAN_ENABLED = "true"
& "C:\path\to\ATSCheck Desktop.exe"
```

### Linux

Launch the installed executable with the variable set for that process. For an
AppImage in the current directory:

```sh
ATS_SCAN_ENABLED=true ./ATSCheck.Desktop_0.1.3_amd64.AppImage
```

For a package-installed app, run the app executable from a terminal with the
variable prefixed in the same way. The exact executable path can differ by
distribution.

## What changes when a feature is disabled?

For supported feature groups:

- The corresponding navigation item is hidden.
- Opening its frontend route returns the user to the dashboard.
- The related API routes reject requests while the feature is disabled.
- `GET /api/v1/features` reports the effective feature state.

The flags only control availability. They do not erase existing data. The ATS
switch groups the analysis, tailoring, scan history, analytics, and resume
version tools together; the other three switches are independent.

## Troubleshooting

- **The feature state did not change:** confirm the variable is set in the
  process that launches ATSCheck, then fully quit and restart the app.
- **A terminal launch cannot find the app:** use the actual path where the app
  was installed. On macOS, dragging the app to Applications is the usual
  installation step.
- **A flag value is rejected:** use one of the documented boolean values.
- **Need the default behavior back:** unset the variable or set it to the
  documented default, then restart.

See the [development guide](DEVELOPMENT.md) for running the API and desktop
shell from source.
