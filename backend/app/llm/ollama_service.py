import asyncio
import platform
import shutil
import subprocess
import time
from typing import Any, AsyncGenerator

from ollama import AsyncClient


class OllamaService:
    """
    Handles communication with the local Ollama runtime.

    Responsibilities:
    - checking Ollama availability
    - starting/stopping the Ollama server
    - listing installed models
    - pulling models
    - streaming model pull progress
    - normalizing Ollama model metadata

    Actual LLM inference remains inside OllamaProvider.
    """

    def __init__(
        self,
        host: str = "http://127.0.0.1:11434",
    ) -> None:

        self.host = host

        self.client = AsyncClient(
            host=self.host,
        )

    # =========================================================
    # HELPERS
    # =========================================================

    @staticmethod
    def _get_value(
        response: Any,
        key: str,
        default: Any = None,
    ) -> Any:
        """
        Safely read a value from an Ollama response.

        Different versions of the Ollama Python client can
        return dictionaries or response objects.
        """

        if response is None:
            return default

        if isinstance(response, dict):
            return response.get(
                key,
                default,
            )

        return getattr(
            response,
            key,
            default,
        )

    @staticmethod
    def _safe_int(
        value: Any,
    ) -> int:
        """
        Safely convert Ollama progress values to integers.
        """

        try:
            return int(value or 0)
        except (
            TypeError,
            ValueError,
        ):
            return 0

    @staticmethod
    def _calculate_progress(
        completed: int,
        total: int,
    ) -> int:
        """
        Calculate pull progress as a percentage.

        Returns a value between 0 and 100.
        """

        if total <= 0:
            return 0

        progress = int(
            (completed / total) * 100
        )

        return max(
            0,
            min(
                progress,
                100,
            ),
        )

    # =========================================================
    # OLLAMA STATUS
    # =========================================================

    def is_installed(self) -> bool:
        """
        Return whether the Ollama CLI is available
        on this machine.
        """

        return shutil.which("ollama") is not None

    def get_download_url(self) -> str:
        """
        Return the official Ollama installer URL
        for the current operating system.
        """

        system = platform.system().lower()

        if system == "darwin":
            return "https://ollama.com/download/mac"

        if system == "windows":
            return "https://ollama.com/download/windows"

        if system == "linux":
            return "https://ollama.com/download/linux"

        return "https://ollama.com/download"

    async def check_status(
        self,
    ) -> dict[str, Any]:
        """
        Check whether the local Ollama runtime is reachable.
        """

        if not self.is_installed():

            return {
                "installed": False,
                "running": False,
                "host": self.host,
                "download_url": self.get_download_url(),
            }

        try:

            response = await self.client.list()

            version = None

            try:
                version_response = (
                    await self.client.show(
                        "__non_existing_model__"
                    )
                )

                version = self._get_value(
                    version_response,
                    "version",
                )

            except Exception:
                pass

            return {
                "installed": True,
                "running": True,
                "host": self.host,
                "download_url": self.get_download_url(),
                "version": version,
            }

        except Exception:

            return {
                "installed": True,
                "running": False,
                "host": self.host,
                "download_url": self.get_download_url(),
            }

    # =========================================================
    # SERVER START / STOP
    # =========================================================

    async def _wait_for_server_ready(
        self,
        timeout_seconds: float = 20.0,
    ) -> bool:
        """
        Poll Ollama until the runtime responds
        or the timeout is reached.
        """

        deadline = (
            time.monotonic()
            + timeout_seconds
        )

        while time.monotonic() < deadline:

            try:

                await self.client.list()

                return True

            except Exception:

                await asyncio.sleep(1)

        return False

    async def start_server(
        self,
    ) -> dict[str, Any]:
        """
        Start the local Ollama service if it is installed.
        """

        if not self.is_installed():

            raise RuntimeError(
                "Ollama is not installed on this machine. "
                "Download it from the official installer first."
            )

        # -----------------------------------------------------
        # Already running?
        # -----------------------------------------------------

        try:

            await self.client.list()

            return {
                "installed": True,
                "running": True,
                "host": self.host,
                "download_url": self.get_download_url(),
            }

        except Exception:
            pass

        # -----------------------------------------------------
        # Start Ollama
        # -----------------------------------------------------

        try:

            process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )

        except Exception as exc:

            raise RuntimeError(
                f"Failed to start Ollama server: {exc}"
            ) from exc

        # -----------------------------------------------------
        # Wait for server
        # -----------------------------------------------------

        ready = await self._wait_for_server_ready(
            timeout_seconds=20.0,
        )

        if not ready:

            raise RuntimeError(
                "Ollama server did not respond after startup. "
                "Check whether the service is still starting "
                "or restart it manually."
            )

        return {
            "installed": True,
            "running": True,
            "host": self.host,
            "download_url": self.get_download_url(),
            "pid": process.pid,
        }

    async def stop_server(
        self,
    ) -> dict[str, Any]:
        """
        Stop the local Ollama server process.

        On macOS/Linux, Ollama is normally started using
        `ollama serve`.
        """

        if not self.is_installed():

            raise RuntimeError(
                "Ollama is not installed on this machine."
            )

        system = platform.system().lower()

        # -----------------------------------------------------
        # macOS / Linux
        # -----------------------------------------------------

        if system in {
            "darwin",
            "linux",
        }:

            process_patterns = [
                "ollama serve",
                "/Ollama.app/Contents/MacOS/Ollama",
            ] if system == "darwin" else ["ollama serve"]

            for pattern in process_patterns:
                subprocess.run(
                    ["pkill", "-f", pattern],
                    check=False,
                    capture_output=True,
                    text=True,
                )

        # -----------------------------------------------------
        # Windows
        # -----------------------------------------------------

        elif system == "windows":

            subprocess.run(
                [
                    "taskkill",
                    "/F",
                    "/IM",
                    "ollama.exe",
                ],
                check=False,
                capture_output=True,
                text=True,
            )

        stopped = False

        for _ in range(10):
            try:
                await self.client.list()
            except Exception:
                stopped = True
                break

            await asyncio.sleep(0.2)

        if not stopped:
            raise RuntimeError(
                "Ollama did not stop. Close the Ollama desktop app and try again."
            )

        return {
            "installed": True,
            "running": False,
            "host": self.host,
            "download_url": self.get_download_url(),
        }

    # =========================================================
    # PULL MODEL - STREAMING
    # =========================================================

    async def pull_model_stream(
        self,
        model_id: str,
    ) -> AsyncGenerator[
        dict[str, Any],
        None,
    ]:
        """
        Pull an Ollama model and yield progress events.

        IMPORTANT:

        AsyncClient.pull() in the installed Ollama package
        returns a coroutine which resolves to an async stream.

        Therefore this MUST be:

            stream = await self.client.pull(...)

            async for response in stream:

        and NOT:

            async for response in self.client.pull(...)

        Example event:

        {
            "model": "llama3.1:8b",
            "status": "downloading",
            "completed": 120000000,
            "total": 4660000000,
            "progress": 2,
            "digest": "...",
            "done": false,
            "error": null
        }
        """

        normalized = (
            model_id or ""
        ).strip()

        if not normalized:

            raise ValueError(
                "Model name cannot be empty."
            )

        # -----------------------------------------------------
        # Check installation
        # -----------------------------------------------------

        if not self.is_installed():

            raise RuntimeError(
                "Ollama is not installed on this machine. "
                "Download and install it before pulling models."
            )

        # -----------------------------------------------------
        # Make sure server is running
        # -----------------------------------------------------

        try:

            await self.client.list()

        except Exception:

            await self.start_server()

        # -----------------------------------------------------
        # Start model pull
        #
        # IMPORTANT:
        #
        # AsyncClient.pull() returns a coroutine.
        # We MUST await it before iterating.
        # -----------------------------------------------------

        try:

            stream = await self.client.pull(
                normalized,
                stream=True,
            )

            # -------------------------------------------------
            # Read streaming progress
            # -------------------------------------------------

            async for response in stream:

                status = self._get_value(
                    response,
                    "status",
                    "",
                )

                completed = self._safe_int(
                    self._get_value(
                        response,
                        "completed",
                        0,
                    )
                )

                total = self._safe_int(
                    self._get_value(
                        response,
                        "total",
                        0,
                    )
                )

                digest = self._get_value(
                    response,
                    "digest",
                    None,
                )

                # -------------------------------------------------
                # Calculate percentage
                # -------------------------------------------------

                progress = (
                    self._calculate_progress(
                        completed,
                        total,
                    )
                )

                status_lower = (
                    str(status)
                    .strip()
                    .lower()
                )

                done = (
                    status_lower
                    in {
                        "success",
                        "complete",
                        "completed",
                    }
                )

                if done:
                    progress = 100

                # -------------------------------------------------
                # Yield normalized progress event
                # -------------------------------------------------

                yield {
                    "model": normalized,
                    "status": status,
                    "completed": completed,
                    "total": total,
                    "progress": progress,
                    "digest": digest,
                    "done": done,
                    "error": None,
                }

        except Exception as exc:

            # -----------------------------------------------------
            # Send a final error event.
            # -----------------------------------------------------

            yield {
                "model": normalized,
                "status": "error",
                "completed": 0,
                "total": 0,
                "progress": 0,
                "digest": None,
                "done": True,
                "error": str(exc),
            }

    # =========================================================
    # PULL MODEL - NON STREAMING
    # =========================================================

    async def pull_model(
        self,
        model_id: str,
    ) -> dict[str, Any]:
        """
        Pull an Ollama model and wait until completion.

        This method is useful for existing API endpoints
        that expect a normal JSON response.

        For the frontend progress bar, use
        `pull_model_stream()` instead.
        """

        normalized = (
            model_id or ""
        ).strip()

        if not normalized:

            raise ValueError(
                "Model name cannot be empty."
            )

        last_event: dict[str, Any] | None = None

        async for event in self.pull_model_stream(
            normalized
        ):

            last_event = event

            # -------------------------------------------------
            # Stop immediately if pull failed.
            # -------------------------------------------------

            if event.get("error"):

                raise RuntimeError(
                    event["error"]
                )

        # -----------------------------------------------------
        # Safety check
        # -----------------------------------------------------

        if not last_event:

            raise RuntimeError(
                f"No response received while pulling "
                f"model '{normalized}'."
            )

        return {
            "model": normalized,
            "success": True,
            "status": last_event.get(
                "status",
                "success",
            ),
            "progress": 100,
            "output": last_event,
        }

    # =========================================================
    # INSTALLED MODELS
    # =========================================================

    async def list_models(
        self,
    ) -> list[dict[str, Any]]:
        """
        Return normalized information about models
        currently installed in Ollama.

        Example:

        {
            "model": "llama3.1:8b",
            "name": "llama3.1:8b",
            "size": 4661224676,
            "modified_at": "..."
        }

        The frontend should use `model` as the
        canonical Ollama model identifier.
        """

        try:

            response = await self.client.list()

            # -------------------------------------------------
            # Handle different Ollama client versions.
            # -------------------------------------------------

            if isinstance(
                response,
                dict,
            ):

                raw_models = response.get(
                    "models",
                    [],
                )

            else:

                raw_models = getattr(
                    response,
                    "models",
                    [],
                )

            models: list[
                dict[str, Any]
            ] = []

            # -------------------------------------------------
            # Normalize every model.
            # -------------------------------------------------

            for model in raw_models:

                # -------------------------------------------------
                # Dictionary response
                # -------------------------------------------------

                if isinstance(
                    model,
                    dict,
                ):

                    model_id = (
                        model.get("model")
                        or model.get("name")
                    )

                    model_name = (
                        model.get("name")
                        or model.get("model")
                    )

                    size = model.get(
                        "size"
                    )

                    modified_at = model.get(
                        "modified_at"
                    )

                # -------------------------------------------------
                # Object response
                # -------------------------------------------------

                else:

                    model_id = (
                        getattr(
                            model,
                            "model",
                            None,
                        )
                        or getattr(
                            model,
                            "name",
                            None,
                        )
                    )

                    model_name = (
                        getattr(
                            model,
                            "name",
                            None,
                        )
                        or getattr(
                            model,
                            "model",
                            None,
                        )
                    )

                    size = getattr(
                        model,
                        "size",
                        None,
                    )

                    modified_at = getattr(
                        model,
                        "modified_at",
                        None,
                    )

                # -------------------------------------------------
                # Ignore unusable model records.
                # -------------------------------------------------

                if not model_id:
                    continue

                models.append(
                    {
                        "model": model_id,
                        "name": (
                            model_name
                            or model_id
                        ),
                        "size": size,
                        "modified_at": modified_at,
                    }
                )

            return models

        except Exception as exc:

            raise RuntimeError(
                "Unable to connect to the local "
                "Ollama runtime."
            ) from exc
