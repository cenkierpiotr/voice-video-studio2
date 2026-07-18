"""
Hailuo AI driver — hailuoai.com (MiniMax)
- Login: email lub Google (wymaga konta — SMS może być wymagany)
- Free tier: hojny (lepszy niż zachodnie odpowiedniki)
- Max segment: 6s
- Jakość: najlepsza na rynku wg benchmarków 2025/2026
- Bot protection: średnia

BOOTSTRAP:
  python3 -c "import asyncio; from video_ai_drivers.hailuo import HailuoDriver; asyncio.run(HailuoDriver().bootstrap_session())"
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

logger = logging.getLogger("voice_studio.video_ai.hailuo")

_BASE_URL     = "https://hailuoai.com"
_VIDEO_URL    = "https://hailuoai.com/video"


class HailuoDriver(VideoServiceDriver):
    name = "hailuo"
    max_segment_s = 6.0
    supports_init_image = True   # Hailuo supports image-to-video

    _playwright = None
    _browser    = None
    _ctx        = None
    _task_urls: dict[str, str] = {}   # task_ref -> download_url

    async def _ensure_context(self) -> None:
        if self._ctx is None:
            if not self._session_exists():
                raise RuntimeError(
                    "Hailuo session not found. Run bootstrap first:\n"
                    "  python3 -c \"import asyncio; from video_ai_drivers.hailuo import "
                    "HailuoDriver; asyncio.run(HailuoDriver().bootstrap_session())\""
                )
            self._playwright, self._browser, self._ctx = await self._get_browser(headless=True)
            self._ctx.on("response", self._on_response)

    async def _on_response(self, response) -> None:
        try:
            url = response.url
            if "/api/generate" in url or "/v1/video" in url or "/task" in url.lower():
                if response.status == 200:
                    body = await response.json()
                    # Try common response shapes
                    task_id = (
                        (body.get("data") or {}).get("task_id") or
                        (body.get("data") or {}).get("id") or
                        body.get("task_id")
                    )
                    dl_url = (
                        (body.get("data") or {}).get("video_url") or
                        (body.get("data") or {}).get("url")
                    )
                    if task_id:
                        self._task_urls[str(task_id)] = dl_url or ""
                    if dl_url and not task_id:
                        # Completion response
                        for tid in self._task_urls:
                            if not self._task_urls[tid]:
                                self._task_urls[tid] = dl_url
                                break
        except Exception as e:
            logger.debug("Hailuo response hook: %s", e)

    async def _navigate_to_login(self, page) -> None:
        await page.goto(_VIDEO_URL, wait_until="networkidle")

    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
    ) -> str:
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            await page.goto(_VIDEO_URL, wait_until="networkidle", timeout=30_000)
            await asyncio.sleep(2)

            # Upload init image if provided
            if init_image and init_image.exists() and self.supports_init_image:
                try:
                    upload_input = page.locator("input[type='file']").first
                    await upload_input.set_input_files(str(init_image))
                    await asyncio.sleep(1)
                except Exception as e:
                    logger.warning("Hailuo: init_image upload failed: %s", e)

            # Fill prompt
            textarea = page.locator(
                "textarea, [contenteditable='true'], input[type='text'][placeholder*='describe']"
            ).first
            await textarea.wait_for(state="visible", timeout=15_000)
            await textarea.fill(prompt)
            await asyncio.sleep(0.5)

            # Click generate
            generate_btn = page.locator(
                "button:has-text('Generate'), button[type='submit'], "
                "[data-testid*='generate'], button:has-text('Create')"
            ).first
            await generate_btn.click()

            # Capture task_ref via network interception
            deadline = time.monotonic() + 30
            task_ref = None
            prev_count = len(self._task_urls)
            while time.monotonic() < deadline:
                if len(self._task_urls) > prev_count:
                    task_ref = list(self._task_urls.keys())[-1]
                    break
                await asyncio.sleep(1)

            if not task_ref:
                # Fallback: generate a pseudo-ref from timestamp
                task_ref = f"hailuo_{int(time.monotonic())}"
                self._task_urls[task_ref] = ""

            logger.info("Hailuo: submitted, task_ref=%s", task_ref)
            return task_ref

        finally:
            await page.close()

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        url = self._task_urls.get(task_ref, "")
        if url:
            return "ready", None
        # Re-open page to trigger network responses
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            await page.goto(_VIDEO_URL, wait_until="domcontentloaded", timeout=20_000)
            await asyncio.sleep(3)
            url = self._task_urls.get(task_ref, "")
            if url:
                return "ready", None
            return "pending", None
        except Exception as e:
            logger.warning("Hailuo poll error: %s", e)
            return "pending", None
        finally:
            await page.close()

    async def download(self, task_ref: str, dest: Path) -> Path:
        url = self._task_urls.get(task_ref)
        if not url:
            raise RuntimeError(f"No download URL for Hailuo task {task_ref}")

        await self._ensure_context()
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
        logger.info("Hailuo: downloaded %s → %s", task_ref, dest)
        return dest
