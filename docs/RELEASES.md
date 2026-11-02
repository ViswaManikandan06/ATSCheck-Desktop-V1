# Building and publishing releases

## Release build

1. Update the version consistently in `frontend/package.json`,
   `frontend/src-tauri/tauri.conf.json`, and
   `frontend/src-tauri/Cargo.toml`.
2. Verify the app on each supported operating system. Run the backend tests,
   frontend lint/build, and install/launch smoke checks.
3. Create and push a version tag matching the app version, such as `v0.1.0`.
4. The `Desktop release` workflow builds on Linux, macOS, and Windows and
   creates a **draft** GitHub Release with the generated installers.
5. Test each artifact on a clean machine, complete the signing/notarization
   steps for the release environment, publish the release, and link it from
   the README.

The workflow builds an unsigned draft unless release signing credentials and
the corresponding signing configuration are added. Unsigned macOS and Windows
apps can display trust warnings and are not recommended for general users.
Keep signing certificates and passwords in protected repository or
organization secrets; never commit them.

## Platform notes

- Build each target on its native runner. The Python sidecar is generated for
  the runner's architecture and cannot be reused on another operating system.
- Linux bundling requires the development packages listed in
  [development setup](DEVELOPMENT.md).
- Test database upgrades and local-data retention before publishing an update.
- Installer generation is not the same as code signing, notarization, or
  update delivery; each requires its own release process.
