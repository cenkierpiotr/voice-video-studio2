"""
Gemini Web driver — gemini.google.com (Google)
- Login: konto Google (SSO)
- Free tier: tak (Gemini Advanced lub darmowy plan z limitem)
- Max segment: 8s (Veo 2 / Veo 3 w Gemini)
- Bot protection: wysoka (Google)

BOOTSTRAP:
  python3 -c "import asyncio; from video_ai_drivers.gemini_web import GeminiWebDriver; asyncio.run(GeminiWebDriver().bootstrap_session())"
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from pathlib import Path
from typing import Optional, Tuple

import httpx

from .base import VideoServiceDriver

logger = logging.getLogger("voice_studio.video_ai.gemini_web")

_BASE_URL  = "https://gemini.google.com"
_VIDEO_URL = "https://gemini.google.com/app"


class GeminiWebDriver(VideoServiceDriver):
    name = "gemini"
    max_segment_s = 8.0
    supports_init_image = False

    _playwright = None
    _browser    = None
    _ctx        = None
    _pending: dict[str, str] = {}   # task_ref -> download_url

    async def _ensure_context(self) -> None:
        if self._ctx is None:
            if not self._session_exists():
                raise RuntimeError(
                    "Gemini session not found. Run bootstrap first:\n"
                    "  python3 -c \"import asyncio; from video_ai_drivers.gemini_web import "
                    "GeminiWebDriver; asyncio.run(GeminiWebDriver().bootstrap_session())\""
                )
            self._playwright, self._browser, self._ctx = await self._get_browser(headless=True)
            self._ctx.on("response", self._on_response)

    async def _on_response(self, response) -> None:
        """Przechwytuj odpowiedzi z Gemini — szukamy wygenerowanego wideo."""
        try:
            url = response.url
            # Gemini API dla generacji mediów
            if ("generate" in url or "streamGenerate" in url) and response.status == 200:
                text = await response.text()
                # Szukaj URL do mp4 w odpowiedzi JSON
                mp4_urls = re.findall(r'https://[^"\'\\s]+\.mp4[^"\'\\s]*', text)
                lottie_ids = re.findall(r'"videoId":\s*"([^"]+)"', text)
                if mp4_urls:
                    task_ref = f"gemini_{int(time.monotonic()*1000)}"
                    self._pending[task_ref] = mp4_urls[0]
                    logger.debug("Gemini: captured video URL=%s", mp4_urls[0][:60])
        except Exception as e:
            logger.debug("Gemini response hook: %s", e)

    async def _navigate_to_login(self, page) -> None:
        await page.goto(_VIDEO_URL, wait_until="networkidle")

    async def _build_video_prompt(self, prompt: str, duration_s: float) -> str:
        """Konstruuje prompt dla Gemini z instrukcją wideo."""
        return (
            f"Generate a video: {prompt}. "
            f"Duration: approximately {int(duration_s)} seconds. "
            f"High quality, cinematic style. Only return the video, no text."
        )

    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
    ) -> str:
        await self._ensure_context()
        page = await self._ctx.new_page()
        task_ref = f"gemini_{int(time.monotonic()*1000)}"
        self._pending[task_ref] = ""

        try:
            await page.goto(_VIDEO_URL, wait_until="networkidle", timeout=45_000)
            await asyncio.sleep(2)

            # Znajdź pole tekstowe chatu
            textarea = page.locator(
                "rich-textarea, textarea, [contenteditable='true'], "
                "[data-placeholder*='Ask'], [aria-label*='message'], "
                "[aria-label*='prompt'], p[data-placeholder]"
            ).first
            await textarea.wait_for(state="visible", timeout=20_000)

            video_prompt = await self._build_video_prompt(prompt, duration_s)
            await textarea.click()
            await page.keyboard.type(video_prompt, delay=30)
            await asyncio.sleep(0.5)

            # Szukaj przycisku wysyłania
            send_btn = page.locator(
                "button[aria-label*='Send'], button[data-mat-icon-name='send'], "
                "mat-icon[fonticon='send']"
            ).first
            if await send_btn.count() > 0:
                await send_btn.click()
            else:
                await page.keyboard.press("Enter")

            logger.info("Gemini: prompt submitted, task_ref=%s", task_ref)

            # Poczekaj aż pojawi się wideo w DOM
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                # Sprawdź czy URL do mp4 został przechwycony
                if self._pending.get(task_ref):
                    break
                # Alternatywnie szukaj elementu video w DOM
                vid = page.locator("video, [data-video-url]").first
                if await vid.count() > 0:
                    src = await vid.get_attribute("src") or await vid.get_attribute("data-video-url") or ""
                    if src and "mp4" in src.lower():
                        self._pending[task_ref] = src
                        break
                await asyncio.sleep(3)

            return task_ref

        finally:
            await page.close()

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        url = self._pending.get(task_ref, "")
        if url:
            return "ready", None
        if task_ref not in self._pending:
            return "failed", None
        return "pending", None

    async def download(self, task_ref: str, dest: Path) -> Path:
        url = self._pending.get(task_ref)
        if not url:
            raise RuntimeError(f"No download URL for Gemini task {task_ref}")

        await self._ensure_context()
        cookies = await self._ctx.cookies()
        cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={"Cookie": cookie_str, "Referer": _BASE_URL},
            )
            resp.raise_for_status()
            dest.write_bytes(resp.content)
        logger.info("Gemini: downloaded %s → %s", task_ref, dest)
        return dest
