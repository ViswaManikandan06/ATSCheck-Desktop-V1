import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "../..");
const backendDirectory = resolve(projectDirectory, "backend");
const binaryDirectory = resolve(projectDirectory, "frontend/src-tauri/binaries");
const virtualEnvironmentPython = resolve(
  backendDirectory,
  process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python"
);
const python = process.env.PYTHON ||
  (existsSync(virtualEnvironmentPython)
    ? virtualEnvironmentPython
    : process.platform === "win32" ? "python" : "python3");
const targetTriple = process.env.TARGET_TRIPLE || execFileSync(
  "rustc",
  ["--print", "host-tuple"],
  { encoding: "utf8" }
).trim();
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const executableName = `atscheck-backend${executableSuffix}`;
const outputName = `atscheck-backend-${targetTriple}${executableSuffix}`;
const outputPath = resolve(binaryDirectory, outputName);

mkdirSync(binaryDirectory, { recursive: true });

execFileSync(
  python,
  [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--distpath",
    binaryDirectory,
    "--workpath",
    resolve(projectDirectory, "frontend/src-tauri/target/pyinstaller"),
    "atscheck_backend.spec",
  ],
  {
    cwd: backendDirectory,
    stdio: "inherit",
  }
);

const builtPath = resolve(binaryDirectory, executableName);

if (!existsSync(builtPath)) {
  throw new Error(`PyInstaller did not create the expected sidecar: ${builtPath}`);
}

rmSync(outputPath, { force: true });
renameSync(builtPath, outputPath);
console.log(`Created Tauri sidecar for ${targetTriple}: ${outputPath}`);
