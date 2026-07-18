"""
Kling AI driver — klingai.com (Kuaishou)
- Login: Google SSO lub email (nie wymaga chińskiego numeru)
- Free tier: 66 kredytów/dzień (5s seg = 10 kredytów, 10s seg = 35 kredytów)
- Max segment: 10s (Standard mode), 5s (darmowy plan — ostrożnie)
- Jakość: bardzo dobra, jedna z najlepszych
- Bot protection: niska–średnia

BOOTSTRAP:
  python3 -c "import asyncio; from video_ai_drivers.kling import KlingDriver; asyncio.run(KlingDriver().bootstrap_session())"
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

logger = logging.getLogger("voice_studio.video_ai.kling")

_BASE_URL    = "https://klingai.com"
_CREATE_URL  = "https://klingai.com/text-to-video/new"
_HISTORY_URL = "https://klingai.com/works"


class KlingDriver(VideoServiceDriver):
    name = "kling"
    max_segment_s = 10.0
    supports_init_image = True   # Kling ma tryb image-to-video

    _playwright = None
    _browser    = None
    _ctx        = None
    _task_data:  dict[str, dict] = {}   # task_ref -> {status, url}

    async def _ensure_context(self) -> None:
        if self._ctx is None:
            if not self._session_exists():
                raise RuntimeError(
                    "Kling session not found. Run bootstrap first:\n"
                    "  python3 -c \"import asyncio; from video_ai_drivers.kling import "
                    "KlingDriver; asyncio.run(KlingDriver().bootstrap_session())\""
                )
            self._playwright, self._browser, self._ctx = await self._get_browser(headless=True)
            self._ctx.on("response", self._on_response)

    async def _on_response(self, response) -> None:
        try:
            url = response.url
            # Kling API: /api/works lub /api/task
            if ("/api/" in url) and response.status == 200:
                data = await response.json()
                items = []
                if isinstance(data.get("data"), list):
                    items = data["data"]
                elif isinstance(data.get("data"), dict):
                    items = [data["data"]]

                for item in items:
                    tid = str(item.get("id") or item.get("task_id") or "")
                    dl_url = (
                        item.get("works", [{}])[0].get("resource", {}).get("resource")
                        if item.get("works")
                        else item.get("url") or item.get("resource_url") or ""
                    )
                    status = item.get("status", "")
                    if tid:
                        self._task_data[tid] = {"status": status, "url": dl_url or ""}
        except Exception as e:
            logger.debug("Kling response hook: %s", e)

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
            # Użyj image-to-video jeśli mamy init_image
            create_url = _CREATE_URL
            if init_image and init_image.exists():
                create_url = "https://klingai.com/image-to-video/new"

            await page.goto(create_url, wait_until="networkidle", timeout=30_000)
            await asyncio.sleep(2)

            # Upload init image
            if init_image and init_image.exists():
                try:
                    upload = page.locator("input[type='file']").first
                    await upload.set_input_files(str(init_image))
                    await asyncio.sleep(2)
                except Exception as e:
                    logger.warning("Kling: init_image upload failed: %s", e)

            # Wpisz prompt
            textarea = page.locator(
                "textarea[placeholder*='describe'], textarea[placeholder*='Describe'], "
                "textarea[placeholder*='prompt'], textarea"
            ).first
            await textarea.wait_for(state="visible", timeout=15_000)
            await textarea.fill(prompt)
            await asyncio.sleep(0.5)

            # Wybierz czas trwania (5s lub 10s)
            duration_label = "10s" if duration_s > 5 else "5s"
            dur_btn = page.locator(
                f"button:has-text('{duration_label}'), [data-value='{duration_label.rstrip('s')}']"
            ).first
            if await dur_btn.count() > 0:
                await dur_btn.click()
                await asyncio.sleep(0.3)

            # Kliknij Generate
            gen_btn = page.locator(
                "button:has-text('Generate'), button[type='submit'], "
                "button:has-text('Create Video'), [data-testid='generate']"
            ).first
            await gen_btn.wait_for(state="visible", timeout=10_000)

            # Zapamiętaj liczbę zadań przed kliknięciem
            prev_count = len(self._task_data)
            await gen_btn.click()

            # Czekaj na nowe zadanie w _task_data
            deadline = time.monotonic() + 30
            task_ref = None
            while time.monotonic() < deadline:
                new_keys = [k for k in self._task_data if k not in list(self._task_data.keys())[:prev_count]]
                if len(self._task_data) > prev_count:
                    task_ref = list(self._task_data.keys())[-1]
                    break
                await asyncio.sleep(1)

            if not task_ref:
                task_ref = f"kling_{int(time.monotonic())}"
                self._task_data[task_ref] = {"status": "pending", "url": ""}

            logger.info("Kling: submitted task_ref=%s", task_ref)
            return task_ref

        finally:
            await page.close()

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        data = self._task_data.get(task_ref, {})
        status = data.get("status", "").lower()
        url = data.get("url", "")

        if url and status in ("completed", "succeed", "success", "done", ""):
            return "ready", None
        if status in ("failed", "error"):
            return "failed", None

        # Odśwież przez historię
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            await page.goto(_HISTORY_URL, wait_until="domcontentloaded", timeout=20_000)
            await asyncio.sleep(3)
            data = self._task_data.get(task_ref, {})
            if data.get("url"):
                return "ready", None
            return "pending", None
        except Exception as e:
            logger.warning("Kling poll error: %s", e)
            return "pending", None
        finally:
            await page.close()

    async def download(self, task_ref: str, dest: Path) -> Path:
        url = self._task_data.get(task_ref, {}).get("url")
        if not url:
            raise RuntimeError(f"No download URL for Kling task {task_ref}")

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
        logger.info("Kling: downloaded %s → %s", task_ref, dest)
        return dest
