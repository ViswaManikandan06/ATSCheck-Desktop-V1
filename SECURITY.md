# Security and privacy

ATSCheck Desktop is designed to keep its application data on your computer,
while allowing optional connections to model providers you choose. This page
describes the intended data boundaries, known limitations, and how to report a
security problem.

## Supported versions

Security fixes are applied to the latest published release. The current
release is [v0.1.2](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2).
Update to the latest release when possible. Older releases may not receive
security fixes.

## Report a vulnerability privately

**Please do not publish exploitable vulnerabilities in a public issue or
discussion.**

Use GitHub's private vulnerability-reporting feature for this repository if it
is enabled. If it is unavailable, contact the project maintainers privately
through the contact information on the
[maintainer's GitHub profile](https://github.com/ViswaManikandan06).

Include, when safe:

- The affected release, operating system, and relevant configuration.
- A concise description of the potential impact.
- Steps to reproduce using synthetic data.
- Logs or screenshots only after removing credentials, resume contents,
  personal information, and local paths that you do not want to share.
- A suggested mitigation, if you have one.

Do not include real resumes, API keys, passwords, database files, or
unredacted provider responses. Please allow maintainers time to investigate
and coordinate a fix before public disclosure.

## Data boundaries

| Data or service | Intended handling |
| --- | --- |
| Resume uploads | Stored under `~/ATSCheck/resumes` on the local computer |
| Application database | SQLite file at `~/ATSCheck/atscheck.db` |
| Provider credentials | Stored through the operating system credential store |
| Packaged API | Bound to `127.0.0.1:8000`; not intended for network exposure |
| Cloud model requests | Relevant resume or job-description content is sent to the provider you select |
| Ollama | A separately installed local model service; its endpoint and model are user-configured |

ATSCheck does not operate a hosted ATSCheck account or API. This does not mean
every operation is offline: provider requests leave the computer when you
select a cloud provider and invoke an AI feature. Review that provider's data
handling terms before sending sensitive information.

## Security guidance for users

- Keep your operating system, ATSCheck installation, and provider software
  updated.
- Use only API keys you intentionally create for your own provider accounts.
- Review the provider, model, and endpoint in **Settings** before sending
  content.
- Protect the computer and backups containing the `ATSCheck` directory.
- Do not expose the local API to a network. It is intended for loopback use.
- Download installers from the official [GitHub Releases page](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases).

The v0.1.2 installers are unsigned and not notarized. Operating systems may
show publisher or security warnings. Only proceed if you have verified that
the download is from the official release page and accept the risks of an
unsigned application.

## Known limitations

- The local API is designed to bind to loopback and does not provide
  authentication for remote network exposure.
- Scanned/image-only PDF OCR is not bundled.
- The app cannot guarantee the privacy, retention, or security practices of
  third-party providers you choose.
- Open-source dependencies and provider APIs can have independent security
  issues. Keep dependencies current and report concerns privately.
- ATS analysis is disabled by default; feature availability is described in
  [feature flags](docs/feature-flags.md).

## For contributors

- Never commit secrets, real resume data, local databases, or credential
  snapshots.
- Use synthetic resumes and provider responses in tests and screenshots.
- Redact personal data and credentials before sharing logs.
- Do not change the local API bind address without reviewing authentication
  and the security model.
- See [Contributing](CONTRIBUTING.md) for development and test practices.
