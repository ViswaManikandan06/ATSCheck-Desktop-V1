import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import App from "./App";
import StartupScreen from "./components/StartupScreen";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

async function waitForLocalService() {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:8000/health", {
        signal: AbortSignal.timeout(1_000),
      });
      const health = await response.json();

      if (
        response.ok &&
        health.status === "ok" &&
        health.service === "atscheck-desktop"
      ) {
        return;
      }

      lastError = new Error("The service returned an unexpected health response.");
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    lastError?.message || "The local service did not start within 30 seconds."
  );
}

function renderApp() {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

async function startDesktopApp() {
  root.render(<StartupScreen />);

  try {
    await waitForLocalService();
    renderApp();
  } catch (error) {
    root.render(<StartupScreen error={error.message} />);
  }
}

if (isTauri()) {
  startDesktopApp();
} else {
  renderApp();
}