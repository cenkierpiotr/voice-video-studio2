"""
Local FFmpeg driver — generuje placeholder wideo bez zewnętrznych serwisów.
Używa ffmpeg do stworzenia animowanego wideo z gradientem + tekstem promptu.
Przydatne do testowania pełnego pipeline bez API keys.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import subprocess
import time
from pathlib import Path
from typing import Optional, Tuple

from .base import VideoServiceDriver, _SESSIONS_DIR

logger = logging.getLogger("voice_studio.video_ai.local_ffmpeg")

_JOBS_DIR = Path(__file__).parent.parent / "va_jobs"
_JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Kolory gradientu na podstawie słów kluczowych w prompcie
_MOOD_COLORS = {
    "kawa|coffee|warm|ciep": ("0x3B1A0A", "0x8B4513"),
    "ocean|sea|water|niebieski|blue": ("0x001F3F", "0x0074D9"),
    "nature|las|green|zielony|forest": ("0x1A3A1A", "0x2ECC40"),
    "sunset|zachód|orange|pomarańcz": ("0x3A0A00", "0xFF851B"),
    "night|noc|dark|ciemn": ("0x050505", "0x1A1A3A"),
    "tech|cyber|neon|purple": ("0x0A001A", "0x7B2FBE"),
}
_DEFAULT_COLORS = ("0x1A1A2E", "0x16213E")


def _pick_colors(prompt: str) -> Tuple[str, str]:
    p = prompt.lower()
    for pattern, colors in _MOOD_COLORS.items():
        if re.search(pattern, p):
            return colors
    return _DEFAULT_COLORS


def _wrap_text(text: str, max_chars: int = 55) -> list[str]:
    words = text.split()
    lines, line = [], []
    for w in words:
        if sum(len(x) + 1 for x in line) + len(w) > max_chars:
            if line:
                lines.append(" ".join(line))
            line = [w]
        else:
            line.append(w)
    if line:
        lines.append(" ".join(line))
    return lines[:4]  # max 4 linie


class LocalFfmpegDriver(VideoServiceDriver):
    name = "local_ffmpeg"
    max_segment_s = 10.0
    supports_init_image = False

    _pending: dict[str, Path] = {}   # task_ref -> output path

    async def _navigate_to_login(self, page) -> None:
        pass  # nie wymaga logowania

    def _session_exists(self) -> bool:
        return True  # zawsze dostępny

    async def submit(
        self,
        prompt: str,
        duration_s: float,
        init_image: Optional[Path] = None,
    ) -> str:
        task_ref = hashlib.md5(f"{prompt}{time.time()}".encode()).hexdigest()[:12]
        dest = _JOBS_DIR / f"{task_ref}.mp4"

        c1, c2 = _pick_colors(prompt)
        lines = _wrap_text(prompt)
        duration_s = min(duration_s, self.max_segment_s)

        # Zbuduj filtergraph
        # 1. Animowany gradient przez geq (liniowa interpolacja między c1 i c2)
        # 2. Tekst promptu na środku z efektem fade-in
        drawtext_filters = []
        y_start = 450 - len(lines) * 30
        for i, line in enumerate(lines):
            safe = line.replace("'", "\\'").replace(":", "\\:").replace("%", "\\%")
            y = y_start + i * 55
            drawtext_filters.append(
                f"drawtext=text='{safe}'"
                f":fontsize=36:fontcolor=white@0.9"
                f":x=(w-text_w)/2:y={y}"
                f":shadowcolor=black@0.7:shadowx=2:shadowy=2"
                f":alpha='if(lt(t,0.5),t/0.5,1)'"
            )
        # Etykieta "AI Video Placeholder"
        drawtext_filters.append(
            "drawtext=text='[AI Video Placeholder]'"
            ":fontsize=22:fontcolor=white@0.5"
            ":x=(w-text_w)/2:y=h-60"
        )

        # Gradient przez geq: interpolacja liniowa c1→c2 w czasie
        r1 = int(c1[2:4], 16)
        g1 = int(c1[4:6], 16)
        b1 = int(c1[6:8], 16)
        r2 = int(c2[2:4], 16)
        g2 = int(c2[4:6], 16)
        b2 = int(c2[6:8], 16)

        geq_r = f"r='lerp({r1},{r2},T/{duration_s:.2f})'"
        geq_g = f"g='lerp({g1},{g2},T/{duration_s:.2f})'"
        geq_b = f"b='lerp({b1},{b2},T/{duration_s:.2f})'"

        vf = f"geq={geq_r}:{geq_g}:{geq_b},scale=1920:1080,setsar=1," + ",".join(drawtext_filters)

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black:s=1920x1080:r=30:d={duration_s:.2f}",
            "-vf", vf,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
            "-t", str(duration_s),
            "-an",
            str(dest),
        ]

        logger.info("LocalFFmpeg: generating %s (%.1fs)…", task_ref, duration_s)
        loop = asyncio.get_event_loop()
        proc = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True, timeout=60),
        )
        if proc.returncode != 0:
            err = proc.stderr.decode()[-500:]
            raise RuntimeError(f"ffmpeg failed: {err}")

        self._pending[task_ref] = dest
        logger.info("LocalFFmpeg: generated %s → %s", task_ref, dest)
        return task_ref

    async def poll(self, task_ref: str) -> Tuple[str, Optional[Path]]:
        path = self._pending.get(task_ref)
        if path and path.exists():
            return "ready", path
        return "failed", None

    async def download(self, task_ref: str, dest: Path) -> Path:
        path = self._pending.get(task_ref)
        if not path or not path.exists():
            raise RuntimeError(f"No file for task {task_ref}")
        import shutil
        shutil.copy2(str(path), str(dest))
        return dest
