# Install ATSCheck Desktop

> **Current release:** [ATSCheck Desktop v0.1.2](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2)
>
> **Platforms:** macOS (Intel and Apple Silicon), Windows 64-bit, Linux 64-bit
>
> **Source license:** MIT

This guide helps you choose the correct download, install it, make the first
launch, connect an AI provider if you want one, and understand where your data
goes. You do not need to install Python or start a terminal service when using
the packaged desktop app.

## 1. Choose and download an installer

Open the [v0.1.2 release page](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2)
and expand **Assets**. Select the file that matches your operating system and
processor:

| Your computer | Download |
| --- | --- |
| Mac with Apple Silicon (M1/M2/M3/M4) | `ATSCheck.Desktop_0.1.2_aarch64.dmg` |
| Mac with Intel processor | `ATSCheck.Desktop_0.1.2_x64.dmg` |
| Windows 64-bit | `ATSCheck.Desktop_0.1.2_x64-setup.exe` or `ATSCheck.Desktop_0.1.2_x64_en-US.msi` |
| Debian or Ubuntu Linux | `ATSCheck.Desktop_0.1.2_amd64.deb` |
| Fedora or RHEL Linux | `ATSCheck.Desktop-0.1.2-1.x86_64.rpm` |
| Other compatible 64-bit Linux | `ATSCheck.Desktop_0.1.2_amd64.AppImage` |

The `.app.tar.gz` files are macOS application bundles intended for users who
prefer a bundle archive; most users should choose the matching `.dmg`.

## 2. Install

### macOS

1. Open the downloaded `.dmg`.
2. Drag **ATSCheck Desktop** into **Applications**.
3. Eject the mounted installer image and open ATSCheck Desktop from
   **Applications**.

The app is currently unsigned and not notarized. macOS may display a warning
the first time you open it. Only proceed if you downloaded the release from
the official project page and are comfortable running an unsigned build.

### Windows

1. Run the `.exe` setup program or open the `.msi` package.
2. Follow the installer prompts and wait for setup to complete.
3. Launch **ATSCheck Desktop** from the Start menu.

The installer is currently unsigned. Windows may show SmartScreen or publisher
warnings. Verify that the installer came from the official release page before
deciding whether to continue.

### Debian or Ubuntu

Open a terminal in the folder containing the downloaded `.deb`, then install:

```sh
sudo apt install ./ATSCheck.Desktop_0.1.2_amd64.deb
```

Launch **ATSCheck Desktop** from your applications menu.

### Fedora or RHEL

Open a terminal in the download folder and install the `.rpm`:

```sh
sudo dnf install ./ATSCheck.Desktop-0.1.2-1.x86_64.rpm
```

Launch **ATSCheck Desktop** from your applications menu.

### AppImage on compatible Linux distributions

In the terminal, change to the download folder and make the AppImage
executable:

```sh
chmod +x ATSCheck.Desktop_0.1.2_amd64.AppImage
./ATSCheck.Desktop_0.1.2_amd64.AppImage
```

If it does not start, check your distribution's support for AppImage and the
Linux dependencies listed in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## 3. First launch

1. Open ATSCheck Desktop. The app starts its local API and waits for it to be
   ready. This normally happens automatically.
2. Upload a PDF or DOCX resume. The original file is retained locally and
   extracted text is available for review.
3. Open **Settings** if you want AI-assisted features. Select a provider, save
   your own API key where required, and choose a model.
4. Review the parsed resume in the builder before relying on its contents.
5. Start with a cover-letter draft or add an application to the job tracker.

The app can be used without connecting a cloud provider for local resume
storage and non-AI workflows. ATS analysis is disabled by default.

## 4. Configure an AI provider (optional)

ATSCheck does not provide API keys, model subscriptions, hosted inference, or
usage credits. You are responsible for your provider account and any charges.

### Cloud providers

The app includes integrations for OpenAI, Anthropic, Gemini, Groq, and Mistral.
In **Settings**, choose a provider, enter its API key, save it, and select a
model. API keys are stored in the operating system credential store, not in
the SQLite resume database.

When you ask a cloud provider to process a resume or job description, the
content needed for that request is sent to the provider. Review its privacy
policy, retention practices, and terms before using it with personal data.

### Ollama

Ollama is a separately installed local model server. Install Ollama, download
a compatible model, start its service, then select the local endpoint and
model in **Settings**. Ollama model quality and speed depend on the model and
your computer. Installing Ollama does not happen automatically with ATSCheck.

## Data, privacy, and backups

- Resume files are stored under `~/ATSCheck/resumes`.
- The local SQLite database is stored at `~/ATSCheck/atscheck.db`.
- Provider credentials are stored in the operating system keyring.
- The packaged API listens on `127.0.0.1:8000` and is intended for local use.
- Cloud AI requests can transmit the content you ask the selected provider to
  process. Ollama can provide a local inference option when configured.

Back up the `ATSCheck` folder while the app is closed. Treat backups as
sensitive: they may contain resumes, contact information, and job-search
details. Deleting the app does not necessarily remove this data folder.

## Known limitations

- **Unsigned installers:** macOS and Windows may show security or publisher
  warnings. Signing and notarization are not configured.
- **Scanned PDFs:** the packaged app extracts embedded PDF text but does not
  include the Tesseract executable for OCR. Image-only PDFs may produce little
  or no text.
- **ATS analysis:** disabled by default. See [feature flags](feature-flags.md)
  for the current environment-variable configuration.
- **AI quality:** generated content and parser output can be inaccurate.
  Verify names, dates, skills, claims, and formatting against the original.
- **Provider availability:** model names, APIs, rate limits, prices, and data
  policies are controlled by each provider and can change independently.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| “Local ATSCheck service could not be reached” | Restart the app. Another local process may be using port `8000`; close it and retry. |
| A provider request fails | Confirm your provider account, saved key, selected model, network connection, and account limits. |
| Ollama is unreachable | Start Ollama, confirm its endpoint, and make sure the selected model is installed. |
| A PDF has missing or jumbled text | Compare with the original. Image-only PDFs require OCR, which is not bundled. |
| Linux credential saving fails | Check that a Secret Service-compatible keyring is installed and available in your desktop session. |
| The installer shows a security warning | This release is unsigned. Confirm you used the official release page and review the warning before proceeding. |

If you still need help, open a [GitHub issue](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/issues)
with your app version, operating system, and steps to reproduce. Never attach a
real resume, API key, credential, or local database.

## Build from source instead

If you want to compile the desktop app yourself, see
[Build and run from source](DEVELOPMENT.md). That process requires Node.js,
Python, Rust, and platform-specific Tauri development dependencies.
