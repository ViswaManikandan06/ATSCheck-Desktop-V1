from PyInstaller.utils.hooks import collect_submodules


hidden_imports = []
for package in (
    "app",
    "uvicorn",
    "keyring.backends",
    "langchain_core",
    "langchain_openai",
    "langchain_anthropic",
    "langchain_google_genai",
    "langchain_ollama",
    "pdfplumber",
    "docx",
    "PIL",
):
    hidden_imports.extend(collect_submodules(package))

a = Analysis(
    ["atscheck_backend.py"],
    pathex=["."],
    binaries=[],
    datas=[],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="atscheck-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
)
