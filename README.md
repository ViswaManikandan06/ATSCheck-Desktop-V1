<div align="center">

# ATSCheck Desktop

### A calmer, more private workspace for your next career move.

Organize resumes and applications, shape polished resume drafts, and keep the
whole job search moving from one desktop app.

[Download ATSCheck Desktop](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/latest) ·
[Install guide](docs/SETUP.md) ·
[User guide](docs/USER_GUIDE.md) ·
[Project overview](docs/index.html)

![License: MIT](https://img.shields.io/badge/license-MIT-171717?style=flat-square)
![Desktop: macOS, Windows, Linux](https://img.shields.io/badge/desktop-macOS%20%7C%20Windows%20%7C%20Linux-b8ff5a?style=flat-square&labelColor=171717)
![Release: 0.1.2](https://img.shields.io/badge/release-v0.1.2-171717?style=flat-square)

</div>

---

## What is ATSCheck?

ATSCheck Desktop brings everyday job-search work into one local-first
workspace. The desktop app starts its own API on your computer; there is no
ATSCheck-hosted account or service to sign into.

> **Privacy is a choice, not a blanket promise.** The app stores resumes and
> application data locally. If you ask a cloud AI provider to process content,
> the relevant resume or job-description text is sent to that provider.
> Configure a local Ollama service if you prefer local model inference.

## Get the app

**Current release: [v0.1.2](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2).**
Choose the installer for your operating system and processor:

| Platform | Download |
| --- | --- |
| macOS · Apple Silicon | `aarch64.dmg` |
| macOS · Intel | `x64.dmg` |
| Windows · 64-bit | `x64-setup.exe` or `x64_en-US.msi` |
| Debian / Ubuntu · 64-bit | `amd64.deb` |
| Fedora / RHEL · 64-bit | `x86_64.rpm` |
| Other compatible Linux · 64-bit | `amd64.AppImage` |

Installers are currently unsigned, so macOS or Windows may show a security
warning. The [installation guide](docs/SETUP.md) includes platform steps,
first-launch setup, known limitations, and troubleshooting.

## What you can do

| Workspace | Use it to |
| --- | --- |
| **Resume library** | Import PDF and DOCX resumes and keep the originals locally. |
| **Resume builder** | Review and edit parsed content, arrange sections, then print or save a PDF. |
| **Cover letters** | Create a starting draft from a resume and a job description, then revise it. |
| **Job tracker** | Keep application details and progress together. |
| **Optional ATS tools** | Enable analysis, tailoring, scan history, analytics, and resume versions when needed. |
| **Provider settings** | Bring your own supported provider account or connect a local Ollama service. |

AI-generated and parsed content is a draft: check names, dates, skills, claims,
and formatting against your source material before using or sending it.

## Quick start

1. Download and install the matching [v0.1.2 release](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2).
2. Launch ATSCheck Desktop. Its local API starts automatically.
3. Import a PDF or DOCX resume, then review the extracted text in the resume
   builder.
4. Open **Settings** to choose a model provider and save your own credentials,
   or configure an Ollama server you run locally.
5. Try a cover-letter draft or record an application in the job tracker.

ATS analysis is **off by default**. Feature switches are documented in the
[feature configuration guide](docs/feature-flags.md).

## Documentation

For an organized directory of all guides, open the
[documentation map](docs/README.md).

| If you want to… | Read |
| --- | --- |
| Install the app and configure it for first use | [Install and get started](docs/SETUP.md) |
| Learn the main workflows and privacy boundaries | [User guide](docs/USER_GUIDE.md) |
| Build, run, test, or package from source | [Development guide](docs/DEVELOPMENT.md) |
| Turn individual app features on or off | [Feature flags](docs/feature-flags.md) |
| Understand the current release and future release process | [Releases](docs/RELEASES.md) |
| Report a security issue responsibly | [Security policy](SECURITY.md) |
| Contribute code, tests, or documentation | [Contributing](CONTRIBUTING.md) |
| Read community expectations | [Code of Conduct](CODE_OF_CONDUCT.md) |
| Review the product overview | [HTML overview](docs/index.html) |
| Review licensing terms | [MIT License](LICENSE) |

## Project status

ATSCheck Desktop is open source and under active development. Version 0.1.2
has installers for macOS (Intel and Apple Silicon), Windows, and Linux.
Scanned/image-only PDF OCR is not bundled. See the [release notes](docs/RELEASES.md)
and [known limitations](docs/SETUP.md#known-limitations) before installing.

## Build from source

Contributors need Node.js 22, Python 3.12, Rust, and the native Tauri
prerequisites for their operating system. Start with the
[development guide](docs/DEVELOPMENT.md); it includes setup commands and
validation steps.

## License

ATSCheck Desktop is distributed under the MIT License. See [LICENSE](LICENSE).
