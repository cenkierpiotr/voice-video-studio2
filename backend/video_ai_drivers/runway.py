"""
Runway ML driver — runwayml.com
- Login: Google SSO lub email
- Free tier: 125 kredytów po rejestracji, potem płatny
- Max segment: 10s (Gen-3 Alpha Turbo)
- Jakość: bardzo wysoka, profesjonalna
- Uwaga: kredyty się kończą, warto jako fallback

BOOTSTRAP:
  python3 -c "import asyncio; from video_ai_drivers.runway import RunwayDriver; asyncio.run(RunwayDriver().bootstrap_session())"
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

logger = logging.getLogger("voice_studio.video_ai.runway")

_BASE_URL   = "https://app.runwayml.com"
_CREATE_URL = "https://app.runwayml.com/creation/text-to-video"


class RunwayDriver(VideoServiceDriver):
    name = "runway"
    max_segment_s = 10.0
    supports_init_image = True   # Runway: image-to-video jako tryb główny

    _playwright = None
    _browser    = None
    _ctx        = None
    _tasks: dict[str, dict] = {}   # task_ref -> {status, url, asset_url}

    async def _ensure_context(self) -> None:
        if self._ctx is None:
            if not self._session_exists():
                raise RuntimeError(
                    "Runway session not found. Run bootstrap first:\n"
                    "  python3 -c \"import asyncio; from video_ai_drivers.runway import "
                    "RunwayDriver; asyncio.run(RunwayDriver().bootstrap_session())\""
                )
            self._playwright, self._browser, self._ctx = await self._get_browser(headless=True)
            self._ctx.on("response", self._on_response)

    async def _on_response(self, response) -> None:
        try:
            url = response.url
            # Runway API v1/tasks lub /api/v1/generate
            if "runwayml.com" in url and "/api/" in url and response.status in (200, 201):
                data = await response.json()
                tid = str(
                    data.get("id") or
                    (data.get("task") or {}).get("id") or
                    (data.get("data") or {}).get("id") or ""
                )
                status = (
                    data.get("status") or
                    (data.get("task") or {}).get("status") or ""
                ).lower()
                artifact = (
                    data.get("artifacts", [{}])[0].get("url", "")
                    if data.get("artifacts")
                    else ""
                )
                if not artifact:
                    artifact = (
                        (data.get("task") or {}).get("artifact", {}).get("url", "") or
                        data.get("url") or ""
                    )

                if tid:
                    self._tasks[tid] = {"status": status, "url": artifact}
                    logger.debug("Runway: captured task %s status=%s url=%s", tid, status, bool(artifact))
        except Exception as e:
            logger.debug("Runway response hook: %s", e)

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
            # Wybierz właściwy tryb
            create_url = _CREATE_URL
            if init_image and init_image.exists():
                create_url = "https://app.runwayml.com/creation/image-to-video"

            await page.goto(create_url, wait_until="networkidle", timeout=45_000)
            await asyncio.sleep(2)

            # Upload init image (dla image-to-video)
            if init_image and init_image.exists():
                try:
                    upload = page.locator("input[type='file']").first
                    await upload.set_input_files(str(init_image))
                    await asyncio.sleep(2)
                except Exception as e:
                    logger.warning("Runway: init_image upload failed: %s", e)

            # Wpisz prompt
            prompt_area = page.locator(
                "textarea[placeholder*='Describe'], textarea[placeholder*='describe'], "
                "textarea[data-testid*='prompt'], [contenteditable='true'], textarea"
            ).first
            await prompt_area.wait_for(state="visible", timeout=20_000)
            await prompt_area.fill(prompt)
            await asyncio.sleep(0.5)

            # Wybierz czas trwania (5s lub 10s)
            dur_seconds = 10 if duration_s > 5 else 5
            dur_btn = page.locator(
                f"[data-value='{dur_seconds}'], button:has-text('{dur_seconds}s'), "
                f"[aria-label='{dur_seconds}s']"
            ).first
            if await dur_btn.count() > 0:
                await dur_btn.click()
                await asyncio.sleep(0.3)

            prev_count = len(self._tasks)

            # Kliknij Generate
            gen_btn = page.locator(
                "button:has-text('Generate'), button[type='submit'], "
                "button:has-text('Create'), [data-testid='generate-btn']"
            ).first
            await gen_btn.wait_for(state="visible", timeout=10_000)
            await gen_btn.click()

            # Czekaj na task_id
            deadline = time.monotonic() + 30
            task_ref = None
            while time.monotonic() < deadline:
                if len(self._tasks) > prev_count:
                    task_ref = list(self._tasks.keys())[-1]
                    break
                await asyncio.sleep(1)

            if not task_ref:
                task_ref = f"runway_{int(time.monotonic())}"
                self._tasks[task_ref] = {"status": "pending", "url": ""}

            logger.info("Runway: submitted task_ref=%s", task_ref)
            return task_ref

        finally:
            await page.close()

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        data = self._tasks.get(task_ref, {})
        status = data.get("status", "").lower()
        url = data.get("url", "")

        if url:
            return "ready", None
        if status in ("failed", "error", "cancelled"):
            return "failed", None

        # Odśwież przez wywołanie strony głównej (triggeruje sieć)
        await self._ensure_context()
        page = await self._ctx.new_page()
        try:
            await page.goto("https://app.runwayml.com/assets", wait_until="domcontentloaded", timeout=20_000)
            await asyncio.sleep(4)
            data = self._tasks.get(task_ref, {})
            if data.get("url"):
                return "ready", None
            return "pending", None
        except Exception as e:
            logger.warning("Runway poll error: %s", e)
            return "pending", None
        finally:
            await page.close()

    async def download(self, task_ref: str, dest: Path) -> Path:
        url = self._tasks.get(task_ref, {}).get("url")
        if not url:
            raise RuntimeError(f"No download URL for Runway task {task_ref}")

        await self._ensure_context()
        cookies = await self._ctx.cookies()
        cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

        async with httpx.AsyncClient(timeout=180, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={"Cookie": cookie_str, "Referer": _BASE_URL},
            )
            resp.raise_for_status()
            dest.write_bytes(resp.content)
        logger.info("Runway: downloaded %s → %s", task_ref, dest)
        return dest
