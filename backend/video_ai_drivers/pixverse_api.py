"""
Pixverse API driver — oficjalne REST API (nie Playwright).
Wymaga klucza API z https://app.pixverse.ai/openapi

Ustaw w .env:  PIXVERSE_API_KEY=px_...

Dokumentacja: https://app.pixverse.ai/openapi/doc#tag/Videos/operation/CreateTextToVideoV2
"""
from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional, Tuple

import httpx

from .base import VideoServiceDriver

logger = logging.getLogger("voice_studio.video_ai.pixverse_api")

_API_BASE = "https://app-api.pixverse.ai/openapi/v2"
_ASPECT_MAP = {"16:9": "16:9", "9:16": "9:16", "1:1": "1:1"}
_DURATION_MAP = {5: 5, 8: 8}   # Pixverse obsługuje 5s lub 8s


def _pick_duration(duration_s: float) -> int:
    return 8 if duration_s > 5 else 5


class PixverseApiDriver(VideoServiceDriver):
    name = "pixverse"
    max_segment_s = 8.0
    supports_init_image = False

    def __init__(self) -> None:
        self._api_key = os.getenv("PIXVERSE_API_KEY", "")

    def _session_exists(self) -> bool:
        return bool(self._api_key)

    async def _navigate_to_login(self, page) -> None:
        pass

    async def _headers(self) -> dict:
        return {
            "API-KEY": self._api_key,
            "Content-Type": "application/json",
        }

    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
        aspect_ratio: str = "16:9",
    ) -> str:
        if not self._api_key:
            raise RuntimeError(
                "PIXVERSE_API_KEY not set. Get a key at https://app.pixverse.ai/openapi"
            )
        body = {
            "prompt": prompt,
            "duration": _pick_duration(duration_s),
            "resolution": "1080p",
            "quality": "1080p",
            "aspect_ratio": _ASPECT_MAP.get(aspect_ratio, "16:9"),
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{_API_BASE}/video/text/generate",
                json=body,
                headers=await self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        err = data.get("ErrCode", 0)
        if err != 0:
            raise RuntimeError(f"Pixverse API error {err}: {data.get('ErrMsg')}")

        video_id = str(data["Resp"]["video_id"])
        logger.info("Pixverse API: submitted, video_id=%s", video_id)
        return video_id

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{_API_BASE}/video/result/{task_ref}",
                headers=await self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        err = data.get("ErrCode", 0)
        if err != 0:
            logger.warning("Pixverse poll error %s: %s", err, data.get("ErrMsg"))
            return "pending", None

        vid = data.get("Resp", {})
        status = vid.get("status", "").lower()

        if status in ("succeeded", "success", "completed"):
            return "ready", None
        if status in ("failed", "error"):
            return "failed", None
        return "pending", None

    async def download(self, task_ref: str, dest: Path) -> Path:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{_API_BASE}/video/result/{task_ref}",
                headers=await self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        url = (data.get("Resp", {}) or {}).get("url") or \
              (data.get("Resp", {}) or {}).get("video_url") or \
              (data.get("Resp", {}) or {}).get("download_url")
        if not url:
            raise RuntimeError(f"No download URL in Pixverse response: {data}")

        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            dest.write_bytes(r.content)

        logger.info("Pixverse API: downloaded %s → %s", task_ref, dest)
        return dest
