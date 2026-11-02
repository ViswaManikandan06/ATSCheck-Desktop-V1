# Install and get started

## Download and install

Download ATSCheck Desktop [v0.1.2 from GitHub Releases](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2).
Choose the file for your operating system and processor:

- **macOS Apple Silicon:** `aarch64.dmg`
- **macOS Intel:** `x64.dmg`
- **Windows:** `x64-setup.exe` or `x64_en-US.msi`
- **Debian/Ubuntu Linux:** `amd64.deb`
- **Fedora/RHEL Linux:** `x86_64.rpm`
- **Other compatible Linux distributions:** `amd64.AppImage`

To install a published release:

- **macOS:** Open the `.dmg` and drag ATSCheck into Applications. If using the
  `.app` bundle, move it into Applications.
- **Windows:** Run the `.msi` or `.exe` installer and follow its prompts.
- **Linux:** Install the `.deb` or `.rpm` with your distribution's package
  installer, or make the AppImage executable and launch it.

### Build and install from source

If you prefer to build the desktop app yourself, follow the
[build and run from source guide](DEVELOPMENT.md) to install the required tools
and dependencies. Then, from the `frontend` directory, run:

```sh
npm run tauri:build
```

The command builds the app and its local API. Find the platform installer or
application bundle under `frontend/src-tauri/target/release/bundle/`; install
or launch it using the platform steps above. Build on the operating system
where you plan to use the app.

Release builds may trigger operating-system security warnings until they are
signed and, where applicable, notarized.

## First launch

1. Install and launch ATSCheck Desktop. The app starts its local API
   automatically; you do not need to install Python or run a terminal command.
2. Upload a PDF or DOCX resume. Files and the database are kept locally in the
   `ATSCheck` folder under your home directory.
3. Open **Settings** to choose an LLM provider and enter your own API key, or
   configure a local Ollama server. Keys are saved in the operating system
   credential store.
4. Choose the model and provider endpoint that you want to use.
5. Use the resume builder, cover-letter generator, and job tracker. ATS
   analysis is disabled by default; see [feature flags](feature-flags.md) for
   how to enable it when launching the desktop app.

## Provider choices

- **Cloud providers:** You supply and pay for your own provider account and API
  usage. Requested resume or job-description content is sent to the selected
  provider. The included integrations are OpenAI, Anthropic, Gemini, Groq, and
  Mistral; configure an API key and model in Settings.
- **Ollama:** Install and run Ollama separately, download a compatible model,
  then select the local endpoint and model in Settings. Local model quality and
  performance depend on your hardware.

ATSCheck does not supply API keys, hosted inference, model downloads, or
provider subscriptions.

## Local data and backup

ATSCheck stores its database and uploaded files in `~/ATSCheck` on macOS/Linux
and in the user's home directory on Windows. Back up this folder while the app
is closed. Treat backups as sensitive because they may contain resumes and
application details.

## Troubleshooting

- **App reports that the local service is unavailable:** Restart the app. The
  service listens only on `127.0.0.1:8000`; close any other process using port
  8000 and try again.
- **A provider request fails:** Check the provider credential, selected model,
  network access, and provider account limits.
- **Ollama is unreachable:** Start Ollama and verify the configured local
  endpoint and that the selected model is installed.
- **Image-only PDF:** The current release extracts embedded PDF text; it does
  not bundle the Tesseract OCR executable. Review the extracted text and enter
  missing details manually.
- **Linux cannot save a credential:** Ensure a Secret Service-compatible
  keyring is installed and available in the desktop session.
