# Frontend and desktop shell

This folder contains the React/Vite user interface and the Tauri v2 desktop
wrapper.

## Start here

- End users: [Install the latest release](../docs/SETUP.md).
- Contributors: [Build and run from source](../docs/DEVELOPMENT.md).
- User workflows: [ATSCheck Desktop user guide](../docs/USER_GUIDE.md).
- Feature configuration: [Feature flags](../docs/feature-flags.md).

## Development

Install dependencies with `npm ci` in this directory. The web UI and Tauri
development shell both require the backend API to be running separately; see
the full commands in [Development](../docs/DEVELOPMENT.md).

Run only the browser frontend:

```sh
npm run dev
```

Run the Tauri development app after starting the API:

```sh
npm run tauri:dev
```

Run frontend validation:

```sh
npm run lint
npm run build
```

## Package the desktop app

The production Tauri app bundles and starts its own Python API sidecar. From
this directory, after installing the backend build dependencies and native
Tauri prerequisites:

```sh
npm run tauri:build
```

Installers are written under `src-tauri/target/release/bundle/`. Build on the
target operating system and architecture because the sidecar is platform
specific. For dependencies, troubleshooting, and smoke-test guidance, see the
[development guide](../docs/DEVELOPMENT.md).
