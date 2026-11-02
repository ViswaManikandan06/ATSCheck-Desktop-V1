# ATSCheck Desktop frontend

This directory contains the React/Vite user interface and the Tauri desktop
wrapper. Start with the project [README](../README.md), then see:

- [End-user setup](../docs/SETUP.md)
- [Development and desktop builds](../docs/DEVELOPMENT.md)
- [User guide](../docs/USER_GUIDE.md)

For browser development, run the API from `backend/` and use:

```sh
npm ci
npm run dev
```

For a Tauri development window, start the API first and run:

```sh
npm run tauri:dev
```

To package the desktop app with its Python API sidecar, install the backend
build requirements and run `npm run tauri:build`. Native installers must be
built on their target operating system and architecture.
