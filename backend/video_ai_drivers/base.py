"""Abstract base for video generation service drivers."""
from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("voice_studio.video_ai.driver")

_SESSIONS_DIR = Path(__file__).parent.parent / "va_sessions"
_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class SegmentResult:
    status: str          # "ready" | "pending" | "failed"
    file_path: Optional[Path] = None
    error: Optional[str] = None


class VideoServiceDriver(ABC):
    """
    Interface that all video service drivers must implement.

    Session bootstrap (one-time manual step):
      1. Call bootstrap_session() — opens a headed browser window
      2. Log in manually (e.g. with Google SSO)
      3. Session is saved to va_sessions/{name}.json automatically
      4. Future calls reuse the saved session

    Playwright must be installed:
      pip install playwright playwright-stealth
      playwright install chromium
    """

    name: str
    max_segment_s: float
    supports_init_image: bool = False

    def _session_path(self) -> Path:
        return _SESSIONS_DIR / f"{self.name}.json"

    def _session_exists(self) -> bool:
        return self._session_path().exists()

    async def _get_browser(self, headless: bool = False):
        """Launch Playwright browser with stealth, returning (playwright, browser, context)."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise RuntimeError(
                "Playwright not installed. Run: pip install playwright playwright-stealth && playwright install chromium"
            )
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=headless, args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
        ])
        storage = str(self._session_path()) if self._session_exists() else None
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
            storage_state=storage,
        )
        # Apply stealth patches
        try:
            from playwright_stealth import stealth_async
            await stealth_async(ctx)
        except ImportError:
            logger.warning("playwright-stealth not installed — bot detection possible")
        return p, browser, ctx

    async def bootstrap_session(self) -> None:
        """
        Opens a visible browser for manual login. Call once per service.
        After logging in, close the page — session is saved automatically.
        """
        logger.info("VA driver %s: bootstrapping session (headed)…", self.name)
        p, browser, ctx = await self._get_browser(headless=False)
        page = await ctx.new_page()
        await self._navigate_to_login(page)
        logger.info("VA driver %s: Please log in manually. Close the browser tab when done.", self.name)
        # Wait until the user closes the page
        try:
            await page.wait_for_event("close", timeout=300_000)
        except Exception:
            pass
        await ctx.storage_state(path=str(self._session_path()))
        logger.info("VA driver %s: session saved to %s", self.name, self._session_path())
        await browser.close()
        await p.stop()

    @abstractmethod
    async def _navigate_to_login(self, page) -> None:
        """Navigate to the service's login page."""

    @abstractmethod
    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
    ) -> str:
        """
        Submit a video generation request.
        Returns a task_ref string (opaque ID for poll/download).
        """

    @abstractmethod
    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        """
        Check generation status.
        Returns ("ready", path) | ("pending", None) | ("failed", None)
        """

    @abstractmethod
    async def download(self, task_ref: str, dest: Path) -> Path:
        """Download the generated video to dest. Returns dest path."""
