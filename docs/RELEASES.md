# ATSCheck Desktop releases

This page tells users where to download the current app and maintainers how
to prepare and publish future builds.

## Current release: v0.1.2

[Download ATSCheck Desktop v0.1.2](https://github.com/ViswaManikandan06/ATSCheck-Desktop-V1/releases/tag/v0.1.2).
The public release includes nine installer assets:

| Platform | Release asset |
| --- | --- |
| Linux · RPM | `ATSCheck.Desktop-0.1.2-1.x86_64.rpm` |
| Linux · AppImage | `ATSCheck.Desktop_0.1.2_amd64.AppImage` |
| Linux · Debian package | `ATSCheck.Desktop_0.1.2_amd64.deb` |
| macOS · Apple Silicon | `ATSCheck.Desktop_0.1.2_aarch64.dmg` |
| macOS · Apple Silicon bundle archive | `ATSCheck.Desktop_0.1.2_aarch64.app.tar.gz` |
| macOS · Intel | `ATSCheck.Desktop_0.1.2_x64.dmg` |
| macOS · Intel bundle archive | `ATSCheck.Desktop_0.1.2_x64.app.tar.gz` |
| Windows · installer | `ATSCheck.Desktop_0.1.2_x64-setup.exe` |
| Windows · MSI | `ATSCheck.Desktop_0.1.2_x64_en-US.msi` |

Install instructions are in [SETUP.md](SETUP.md). These builds are unsigned and
not notarized; macOS and Windows may show security warnings. Scanned/image-only
PDF OCR is not bundled.

## How the release workflow works

The GitHub Actions workflow at `.github/workflows/release.yml` runs when a
version tag matching `v*` is pushed. It builds on native Linux, Apple Silicon
macOS, Intel macOS, and Windows runners, then creates a **draft** GitHub
Release and attaches the generated installer files.

The workflow does not publish the draft automatically. Maintainers should
verify that the full platform matrix succeeded, inspect the attached assets,
test the installers, update release notes, and publish the draft deliberately.

## Maintainer release checklist

### Prepare

- [ ] Confirm the release scope and known limitations.
- [ ] Update the version consistently in:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src-tauri/Cargo.toml`
  - `frontend/src-tauri/tauri.conf.json`
- [ ] Update user documentation, setup instructions, and this release page.
- [ ] Run the backend regression suite and frontend lint/build.
- [ ] Review the complete diff for secrets, personal data, and generated files.
- [ ] Verify native build and installation behavior on each target platform.

### Build

- [ ] Push the version tag matching the app version, for example `v0.1.3`.
- [ ] Monitor the **Desktop release** workflow in GitHub Actions.
- [ ] Confirm all four matrix targets completed successfully:
  Linux, macOS Apple Silicon, macOS Intel, and Windows.
- [ ] Confirm the draft release contains the expected installers and no
  unintended artifacts.
- [ ] Test the installers on clean machines, including first launch, local API
  startup, keyring access, shutdown, and preservation of user data.

### Publish

- [ ] Add release notes with supported downloads, install instructions,
  breaking changes, privacy implications, and known limitations.
- [ ] Complete code signing and notarization when signing credentials and
  platform configuration are available.
- [ ] Publish the GitHub draft.
- [ ] Update the README and setup guide to point to the release.
- [ ] Verify the public release page and downloadable asset links.

## Versioning and platform notes

- Keep the four version files listed above aligned. Use a new version/tag for
  every published build; do not move an already-published tag to different
  source.
- Build each target on its native runner. The Python sidecar is generated for
  that operating system and architecture and is not cross-compiled.
- Linux bundling needs the packages listed in
  [development setup](DEVELOPMENT.md).
- Test database upgrades and local-data retention before publishing an
  update. Never ask users to delete their data folder as routine upgrade
  guidance.
- Installer generation is separate from signing, notarization, and update
  delivery. The current project does not configure automatic in-app updates.

## Signing and credentials

Until signing is configured, release assets remain unsigned and may trigger
operating-system warnings. For a smoother installation experience, maintainers
should configure platform signing and notarization in the release environment.
Store certificates and passwords only in protected repository or organization
secrets. Never commit signing material or provider credentials to source.
