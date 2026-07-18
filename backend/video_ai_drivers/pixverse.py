"""
Pixverse AI driver — pixverse.ai
- Login: Google SSO (no Chinese phone required)
- Free tier: daily credits
- Max segment: 8s
- Bot protection: medium (stealth handles it)
- UI: clean React DOM, network interception for status/download

BOOTSTRAP (one-time):
  From backend:  python3 -c "import asyncio; from video_ai_drivers.pixverse import PixverseDriver; asyncio.run(PixverseDriver().bootstrap_session())"
  Then log in with Google. Session saved to va_sessions/pixverse.json.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Optional, Tuple

from .base import VideoServiceDriver

logger = logging.getLogger("voice_studio.video_ai.pixverse")

# Internal API endpoints discovered via DevTools network interception
_BASE_URL      = "https://app.pixverse.ai"
_GENERATE_PATH = "/api/video/create"   # POST — submit generation
_STATUS_PATH   = "/api/video/detail"   # GET  — poll status
_DOWNLOAD_RE   = re.compile(r"https://[^\"'\s]+\.mp4[^\"'\s]*", re.IGNORECASE)

ASPECT_MAP = {
    "16:9": "16:9",
    "9:16": "9:16",
    "1:1": "1:1",
}


class PixverseDriver(VideoServiceDriver):
    name = "pixverse"
    max_segment_s = 8.0
    supports_init_image = False   # Pixverse free tier: text-to-video only

    # Per-instance browser context (reused across segments in same session)
    _playwright = None
    _browser    = None
    _ctx        = None
    _base_headers: dict = {}
    _intercepted_task_ids: dict = {}  # task_ref -> download_url (captured via network)

    async def _ensure_context(self) -> None:
        if self._ctx is None:
            if not self._session_exists():
                raise RuntimeError(
                    "Pixverse session not found. Run bootstrap first:\n"
                    "  python3 -c \"import asyncio; from video_ai_drivers.pixverse import PixverseDriver; "
                    "asyncio.run(PixverseDriver().bootstrap_session())\""
                )
            self._playwright, self._browser, self._ctx = await self._get_browser(headless=True)
            # Intercept API responses to capture task IDs and download URLs
            self._ctx.on("response", self._on_response)

    async def _on_response(self, response) -> None:
        """Capture Pixverse internal API responses for task tracking."""
        try:
            if _GENERATE_PATH in response.url and response.status == 200:
                body = await response.json()
                task_id = (body.get("data", {}) or {}).get("id") or \
                          (body.get("data", {}) or {}).get("video_id")
                if task_id:
                    logger.debug("Pixverse: captured task_id=%s", task_id)
                    self._intercepted_task_ids[str(task_id)] = None

            if _STATUS_PATH in response.url and response.status == 200:
                body = await response.json()
                data = body.get("data", {}) or {}
                vid_id = str(data.get("id", ""))
                url = data.get("video_url") or data.get("url") or data.get("download_url")
                if vid_id and url:
                    self._intercepted_task_ids[vid_id] = url
        except Exception as e:
            logger.debug("Pixverse response hook error: %s", e)

    async def _navigate_to_login(self, page) -> None:
        await page.goto(_BASE_URL, wait_until="networkidle")

    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
    ) -> str:
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            await page.goto(f"{_BASE_URL}/create", wait_until="networkidle", timeout=30_000)

            # Find and fill the prompt textarea
            textarea = page.locator(
                "textarea[placeholder*='describe'], textarea[placeholder*='prompt'], "
                "textarea[data-testid*='prompt'], textarea"
            ).first
            await textarea.wait_for(state="visible", timeout=15_000)
            await textarea.fill(prompt)
            await asyncio.sleep(0.5)

            # Click generate button
            generate_btn = page.locator(
                "button[type='submit'], button:has-text('Generate'), "
                "button:has-text('Create'), [data-testid*='generate']"
            ).first
            await generate_btn.wait_for(state="visible", timeout=10_000)
            await generate_btn.click()

            # Wait for task_id to be captured via network interception
            deadline = time.monotonic() + 30
            task_ref = None
            while time.monotonic() < deadline:
                if self._intercepted_task_ids:
                    # Get the latest (last submitted) task
                    task_ref = list(self._intercepted_task_ids.keys())[-1]
                    break
                await asyncio.sleep(1)

            if not task_ref:
                # Fallback: try to find task ID in URL or DOM
                await asyncio.sleep(3)
                url = page.url
                m = re.search(r"[?&]id=([^&]+)", url) or re.search(r"/video/([a-zA-Z0-9_-]+)", url)
                if m:
                    task_ref = m.group(1)
                else:
                    raise RuntimeError("Could not capture task_ref from Pixverse response")

            logger.info("Pixverse: submitted prompt, task_ref=%s", task_ref)
            return task_ref

        finally:
            await page.close()

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        # Check intercepted results first
        url = self._intercepted_task_ids.get(task_ref)
        if url:
            return "ready", None

        # Otherwise: open status page and check
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            status_url = f"{_BASE_URL}/history"
            await page.goto(status_url, wait_until="domcontentloaded", timeout=20_000)
            await asyncio.sleep(2)

            # Try to find "completed" indicator for our task
            body = await page.content()
            if task_ref in body:
                # Task appears in history — check if download URL was captured
                url = self._intercepted_task_ids.get(task_ref)
                if url:
                    return "ready", None
                # Check for error indicators
                if "failed" in body.lower() or "error" in body.lower():
                    return "failed", None
            return "pending", None
        except Exception as e:
            logger.warning("Pixverse poll error: %s", e)
            return "pending", None
        finally:
            await page.close()

    async def download(self, task_ref: str, dest: Path) -> Path:
        url = self._intercepted_task_ids.get(task_ref)
        if not url:
            raise RuntimeError(f"No download URL captured for task {task_ref}")

        await self._ensure_context()
        # Use Playwright's download feature
        page = await self._ctx.new_page()
        try:
            # Set up download handler
            async with page.expect_download(timeout=60_000) as dl_info:
                await page.goto(url)
            download = await dl_info.value
            await download.save_as(str(dest))
            logger.info("Pixverse: downloaded %s → %s", task_ref, dest)
            return dest
        except Exception:
            # Fallback: direct HTTP download using cookies from context
            cookies = await self._ctx.cookies()
            cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
            import httpx
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.get(
                    url,
                    headers={"Cookie": cookie_str, "Referer": _BASE_URL},
                    follow_redirects=True,
                )
                resp.raise_for_status()
                dest.write_bytes(resp.content)
            logger.info("Pixverse: downloaded (fallback HTTP) %s → %s", task_ref, dest)
            return dest
        finally:
            await page.close()
