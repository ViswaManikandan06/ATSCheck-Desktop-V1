# ATSCheck Desktop

ATSCheck Desktop is a local-first workspace for resumes and job applications. It
combines resume storage, an editable resume builder, cover-letter generation,
job tracking, and optional ATS analysis in a Tauri desktop app.

The desktop app starts its own local API. Resume files and the SQLite database
stay on the user's computer in `~/ATSCheck` (or the equivalent home directory).
Provider credentials are stored through the operating system keyring. When a
cloud model is selected, the content sent to it is subject to that provider's
privacy policy. Ollama can be used as a local model provider.

## Try the app

Installers will be published on the project's GitHub Releases page after the
first release. Until then, see [how to build and install from source](docs/SETUP.md).
Unsigned builds may trigger operating-system warnings.

For a product overview and the documentation links, open [docs/index.html](docs/index.html)
in a browser.

## Features

- Resume upload and local resume library
- Resume builder with editable sections and print/save-to-PDF
- Cover-letter generator and job application tracker
- Optional ATS scanning, tailoring, resume versions, and analytics
- Bring-your-own API key for supported providers, or configure a local Ollama
  server

ATS analysis is disabled by default. See [feature configuration](docs/feature-flags.md)
for the current environment-variable switches.

## Documentation

- [Install and get started](docs/SETUP.md)
- [Build and run from source](docs/DEVELOPMENT.md)
- [Release process](docs/RELEASES.md)
- [User guide](docs/USER_GUIDE.md)
- [Privacy and security notes](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [MIT license](LICENSE)

## Project status

The project is under active development. Desktop bundles are configured for
macOS, Windows, and Linux, but installers are not yet published. Builds from
source require the native prerequisites documented in the development guide.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).
