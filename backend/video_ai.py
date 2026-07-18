"""
AI Video Orchestrator — FastAPI router
Generuje długie filmy z krótkich segmentów przez webowe serwisy AI (Playwright).
Dwuetapowy PromptProcessor (DirectorPass + StoryboardPass) → spójne segmenty.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import re
import shutil
import sqlite3
import subprocess
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, List, Any

import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

logger = logging.getLogger("voice_studio.video_ai")

# ── Ścieżki ───────────────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).parent
_ROOT_DIR    = _BACKEND_DIR.parent
_DATA_DIR    = _ROOT_DIR / "audio-output" / "video_ai"
_SESSIONS_DIR = _BACKEND_DIR / "va_sessions"
_DB_PATH     = _BACKEND_DIR / "video_ai.db"
_MUSIC_DIR   = _ROOT_DIR / "assets" / "music"

_OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
_PROMPT_MODEL = os.getenv("VA_PROMPT_MODEL", "qwen2.5:7b-instruct-q4_K_M")

SERVICE_MAX_SEGMENT: dict[str, float] = {
    "pixverse":     8.0,
    "hailuo":       6.0,
    "kling":        10.0,
    "runway":       10.0,
    "gemini":       8.0,
    "local_ffmpeg": 10.0,
}
SERVICE_RANK = ["pixverse", "hailuo", "gemini", "kling", "runway", "local_ffmpeg"]

STYLE_ANCHOR_HINTS: dict[str, dict] = {
    "cinematic": {
        "style": "cinematic live-action",
        "camera": "slow dolly movements, shallow depth of field, 35mm look",
        "global_prompt_suffix": "consistent color grading, film grain, 24fps cinematic",
    },
    "animated": {
        "style": "2D animation / Pixar-style 3D",
        "camera": "smooth animated camera, vibrant colors",
        "global_prompt_suffix": "stylized animation, consistent character design, smooth motion",
    },
    "documentary": {
        "style": "documentary / archival footage",
        "camera": "handheld, observational, natural angles",
        "global_prompt_suffix": "handheld camera, film grain, authentic atmosphere",
    },
    "commercial": {
        "style": "commercial / product video",
        "camera": "clean studio lighting, dynamic cuts, product focus",
        "global_prompt_suffix": "clean professional look, motion graphics friendly, studio quality",
    },
}

# ── SQLite ────────────────────────────────────────────────────────────────────
def init_db() -> None:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(_DB_PATH) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS va_jobs (
                id TEXT PRIMARY KEY,
                user_prompt TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                target_seconds INTEGER,
                aspect_ratio TEXT DEFAULT '16:9',
                service_pref TEXT DEFAULT 'pixverse',
                add_narration INTEGER DEFAULT 0,
                add_music INTEGER DEFAULT 0,
                mixed_services INTEGER DEFAULT 0,
                output_path TEXT,
                error TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS va_segments (
                job_id TEXT NOT NULL,
                idx INTEGER NOT NULL,
                duration_s REAL NOT NULL,
                prompt_en TEXT NOT NULL,
                start_frame TEXT,
                end_frame TEXT,
                status TEXT NOT NULL DEFAULT 'queued',
                service_used TEXT,
                task_ref TEXT,
                file_path TEXT,
                init_image TEXT,
                attempts INTEGER DEFAULT 0,
                error TEXT,
                updated_at TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (job_id, idx),
                FOREIGN KEY (job_id) REFERENCES va_jobs(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS va_service_state (
                name TEXT PRIMARY KEY,
                logged_in INTEGER DEFAULT 0,
                status TEXT DEFAULT 'ok',
                cooldown_until TEXT,
                fail_count INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now'))
            );
        """)
        for svc in SERVICE_RANK:
            logged = 1 if svc == "local_ffmpeg" else 0
            conn.execute(
                "INSERT OR IGNORE INTO va_service_state (name, logged_in) VALUES (?,?)",
                (svc, logged),
            )
        # local_ffmpeg jest zawsze dostępny — upewnij się że logged_in=1
        conn.execute(
            "UPDATE va_service_state SET logged_in=1, status='ok' WHERE name='local_ffmpeg'"
        )

@contextmanager
def _db():
    conn = sqlite3.connect(_DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ── Pydantic ──────────────────────────────────────────────────────────────────
class PlanRequest(BaseModel):
    prompt: str
    target_seconds: int = 60
    style: str = "cinematic"
    aspect_ratio: str = "16:9"
    service_pref: str = "pixverse"
    add_narration: bool = False
    ollama_host: str = _OLLAMA_HOST

class AnchorModel(BaseModel):
    style: str
    color_palette: List[str] = []
    lighting: str = ""
    mood: str = ""
    camera: str = ""
    recurring_subjects: List[Any] = []   # LLM may return strings or dicts
    negative: str = "no text overlays, no watermarks, no sudden cuts"
    global_prompt_suffix: str = ""

class SegmentModel(BaseModel):
    index: int
    duration_s: float
    visual_prompt_en: str
    start_frame_desc: str = ""
    end_frame_desc: str = ""
    continuity_note: str = ""
    audio_hint: str = ""

class VideoPlan(BaseModel):
    meta: dict
    anchor: AnchorModel
    segments: List[SegmentModel]

class JobCreateRequest(BaseModel):
    plan: VideoPlan
    service_pref: str = "pixverse"
    add_narration: bool = False
    add_music: bool = False
    aspect_ratio: str = "16:9"

class SegmentRetryRequest(BaseModel):
    service: Optional[str] = None
    prompt_override: Optional[str] = None

# ── PromptProcessor ───────────────────────────────────────────────────────────
def _compute_segmentation(target_s: int, service: str) -> tuple[int, float]:
    max_len = SERVICE_MAX_SEGMENT.get(service, 8.0)
    n = max(1, math.ceil(target_s / max_len))
    seg_len = round(target_s / n, 1)
    return n, seg_len

_DIRECTOR_SYSTEM = """You are a visual film director. Given a description of a video, output ONLY valid JSON (no explanation, no markdown) describing the consistent visual style for the entire film. Use this exact structure:
{"style":"string","color_palette":["color1","color2","color3"],"lighting":"string","mood":"string","camera":"string","recurring_subjects":[],"negative":"string","global_prompt_suffix":"string"}
Keep it concise. The style, camera, global_prompt_suffix should use English cinematography vocabulary."""

_STORYBOARD_SYSTEM = """You are a video storyboard writer. Given a visual anchor and video description, output ONLY valid JSON (no explanation, no markdown) with exactly {n} segments of {seg_len}s each. Use this structure:
{{"segments":[{{"index":0,"duration_s":{seg_len},"visual_prompt_en":"...","start_frame_desc":"...","end_frame_desc":"...","continuity_note":"...","audio_hint":"..."}}]}}
CRITICAL RULES:
1. All prompts must be in English
2. end_frame_desc of segment N must describe the SAME scene as start_frame_desc of segment N+1 (continuity!)
3. Each visual_prompt_en must include relevant parts of the anchor style
4. Describe motion, lighting, composition concisely for video generation models
5. Build a narrative arc across segments"""

async def _call_ollama(system: str, user: str, ollama_host: str, timeout: int = 90) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{ollama_host}/api/chat",
            json={
                "model": _PROMPT_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": False,
                "format": "json",          # Force Ollama to output valid JSON
                "options": {"temperature": 0.4, "num_predict": 4096},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        thinking = data.get("message", {}).get("thinking", "")
        return content or thinking

def _extract_json(raw: str) -> Any:
    # Strip known thinking patterns
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL)
    # Strip "Thinking Process:" / "Let me think" / numbered-list preambles before JSON
    cleaned = re.sub(
        r"^(Thinking Process|Let me think|Step \d|Here(?:'s| is)|My response|Analysis):?.*?(?=\{)",
        "",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )
    cleaned = cleaned.strip()

    # Try each { position until we get valid JSON
    for text in (cleaned, raw):
        for m in re.finditer(r"\{", text):
            candidate = text[m.start():]
            e = candidate.rfind("}")
            if e == -1:
                continue
            try:
                return json.loads(candidate[: e + 1])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No JSON found in response: {raw[:400]!r}")

async def generate_plan(req: PlanRequest) -> VideoPlan:
    n, seg_len = _compute_segmentation(req.target_seconds, req.service_pref)
    style_hints = STYLE_ANCHOR_HINTS.get(req.style, STYLE_ANCHOR_HINTS["cinematic"])
    aspect_desc = "landscape (16:9)" if req.aspect_ratio == "16:9" else \
                  "portrait (9:16)" if req.aspect_ratio == "9:16" else "square (1:1)"

    # ── Etap A: DirectorPass ──────────────────────────────────────────────────
    director_user = (
        f"Video description: {req.prompt}\n"
        f"Style: {req.style} ({style_hints['style']})\n"
        f"Duration: {req.target_seconds} seconds\n"
        f"Format: {aspect_desc}\n"
        f"Suggested camera: {style_hints['camera']}\n"
        f"Suggested suffix: {style_hints['global_prompt_suffix']}\n"
        "Create the visual anchor (style bible) for this film."
    )
    logger.info("VA: DirectorPass for %d segments × %.1fs", n, seg_len)
    director_raw = await _call_ollama(_DIRECTOR_SYSTEM, director_user, req.ollama_host)
    anchor_data = _extract_json(director_raw)
    # Merge style hints as defaults
    anchor_data.setdefault("style", style_hints["style"])
    anchor_data.setdefault("camera", style_hints["camera"])
    anchor_data.setdefault("global_prompt_suffix", style_hints["global_prompt_suffix"])
    anchor = AnchorModel(**{k: anchor_data.get(k, "") if not isinstance(AnchorModel.model_fields[k].default, list) else anchor_data.get(k, []) for k in AnchorModel.model_fields})

    # ── Etap B: StoryboardPass ────────────────────────────────────────────────
    storyboard_system = _STORYBOARD_SYSTEM.format(n=n, seg_len=seg_len)
    storyboard_user = (
        f"Video description: {req.prompt}\n\n"
        f"Visual anchor:\n{json.dumps(anchor.model_dump(), ensure_ascii=False)}\n\n"
        f"Create exactly {n} segments of {seg_len}s each for this {req.target_seconds}s film.\n"
        f"Build a coherent narrative arc. Start_frame of segment N+1 must match end_frame of segment N."
    )
    logger.info("VA: StoryboardPass %d×%.1fs", n, seg_len)
    storyboard_raw = await _call_ollama(storyboard_system, storyboard_user, req.ollama_host, timeout=120)
    sb_data = _extract_json(storyboard_raw)

    segments = []
    for i, seg in enumerate(sb_data.get("segments", [])[:n]):
        seg["index"] = i
        seg["duration_s"] = seg_len
        # Append anchor suffix to every visual prompt
        suffix = anchor.global_prompt_suffix
        if suffix and suffix not in seg.get("visual_prompt_en", ""):
            seg["visual_prompt_en"] = seg.get("visual_prompt_en", "") + f", {suffix}"
        segments.append(SegmentModel(**{k: seg.get(k, SegmentModel.model_fields[k].default if SegmentModel.model_fields[k].default is not None else "") for k in SegmentModel.model_fields}))

    # Pad if LLM returned fewer segments
    while len(segments) < n:
        i = len(segments)
        prev_end = segments[-1].end_frame_desc if segments else ""
        segments.append(SegmentModel(
            index=i, duration_s=seg_len,
            visual_prompt_en=f"{req.prompt}, continuation, {anchor.global_prompt_suffix}",
            start_frame_desc=prev_end,
            end_frame_desc=prev_end,
        ))

    plan = VideoPlan(
        meta={
            "user_prompt": req.prompt,
            "target_seconds": req.target_seconds,
            "segment_count": n,
            "segment_length_s": seg_len,
            "aspect_ratio": req.aspect_ratio,
            "style": req.style,
        },
        anchor=anchor,
        segments=segments,
    )
    logger.info("VA: plan generated %d segments", len(plan.segments))
    return plan

# ── FFmpeg pipeline ───────────────────────────────────────────────────────────
def _ffmpeg(*args: str) -> None:
    cmd = ["ffmpeg", "-y", *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error:\n{result.stderr[-2000:]}")

def _normalize_segment(src: Path, dst: Path, aspect: str = "16:9") -> None:
    if aspect == "9:16":
        W, H = 1080, 1920
    elif aspect == "1:1":
        W, H = 1080, 1080
    else:
        W, H = 1920, 1080
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,"
        f"fps=30,setsar=1"
    )
    _ffmpeg(
        "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        str(dst),
    )

def _concat_segments(segment_paths: list[Path], output: Path, crossfade: bool = False) -> None:
    if not segment_paths:
        raise ValueError("No segments to concat")

    if not crossfade or len(segment_paths) == 1:
        # Fast path: concat demuxer (no re-encode if formats match after normalize)
        list_file = output.parent / "concat_list.txt"
        list_file.write_text(
            "\n".join(f"file '{p.resolve()}'" for p in segment_paths)
        )
        _ffmpeg(
            "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c", "copy",
            str(output),
        )
        list_file.unlink(missing_ok=True)
    else:
        # xfade crossfade (0.3s between each segment)
        fade_dur = 0.3
        inputs = []
        for p in segment_paths:
            inputs += ["-i", str(p)]

        # Build filter_complex dynamically
        n = len(segment_paths)
        # Get durations
        durations = []
        for p in segment_paths:
            probe = subprocess.run(
                ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
                capture_output=True, text=True,
            )
            try:
                durations.append(float(probe.stdout.strip()))
            except ValueError:
                durations.append(8.0)

        if n == 1:
            _ffmpeg("-i", str(segment_paths[0]), "-c", "copy", str(output))
            return

        fc_parts = []
        offset = 0.0
        prev_v = "[0:v]"
        prev_a = "[0:a]"
        for i in range(1, n):
            offset = sum(durations[:i]) - i * fade_dur
            out_v = f"[v{i}]" if i < n - 1 else "[vout]"
            out_a = f"[a{i}]" if i < n - 1 else "[aout]"
            fc_parts.append(
                f"{prev_v}[{i}:v]xfade=transition=fade:duration={fade_dur}:offset={offset:.3f}{out_v}"
            )
            fc_parts.append(
                f"{prev_a}[{i}:a]acrossfade=d={fade_dur}{out_a}"
            )
            prev_v = out_v
            prev_a = out_a

        filter_complex = ";".join(fc_parts)
        _ffmpeg(
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-c:a", "aac",
            str(output),
        )

def _mux_audio(video: Path, narration: Optional[Path], music: Optional[Path], output: Path) -> None:
    if not narration and not music:
        shutil.copy2(video, output)
        return

    inputs = ["-i", str(video)]
    filter_parts = []
    audio_streams = []

    if narration:
        inputs += ["-i", str(narration)]
        idx = len(inputs) // 2
        audio_streams.append(f"[{idx}:a]")

    if music:
        inputs += ["-i", str(music)]
        idx = len(inputs) // 2
        filter_parts.append(f"[{idx}:a]volume=0.2[music_q]")
        if narration:
            filter_parts.append(
                "[music_q]sidechaincompress=threshold=0.03:ratio=6[music_duck]"
            )
            filter_parts.append(
                f"{''.join(audio_streams)}[music_duck]amix=inputs=2:duration=first[aout]"
            )
        else:
            filter_parts.append("[music_q][aout_tmp]amix=inputs=1:duration=first[aout]")
    elif narration:
        filter_parts.append(f"{''.join(audio_streams)}acopy[aout]")

    if not filter_parts:
        shutil.copy2(video, output)
        return

    _ffmpeg(
        *inputs,
        "-filter_complex", ";".join(filter_parts),
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        str(output),
    )

def _extract_last_frame(video: Path, dst: Path) -> bool:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(video)],
            capture_output=True, text=True,
        )
        dur = float(result.stdout.strip()) - 0.1
        _ffmpeg("-ss", str(max(0, dur)), "-i", str(video),
                "-frames:v", "1", "-q:v", "2", str(dst))
        return dst.exists()
    except Exception as e:
        logger.warning("VA: extract last frame failed: %s", e)
        return False

# ── Driver interface (lazy import to avoid playwright import error at startup) ─
async def _get_driver(service: str):
    try:
        from video_ai_drivers import get_driver
        return get_driver(service)
    except ImportError as e:
        raise RuntimeError(f"video_ai_drivers module not available: {e}")

# ── Worker Orchestrator ───────────────────────────────────────────────────────
_worker_task: Optional[asyncio.Task] = None
_worker_lock = asyncio.Lock()

async def start_worker() -> None:
    global _worker_task
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(_orchestrator_loop())
        logger.info("VA: orchestrator started")

async def _orchestrator_loop() -> None:
    logger.info("VA: orchestrator loop running")
    while True:
        try:
            await _process_pending_jobs()
        except Exception as e:
            logger.error("VA: orchestrator error: %s", e, exc_info=True)
        await asyncio.sleep(5)

async def _process_pending_jobs() -> None:
    with _db() as conn:
        rows = conn.execute(
            "SELECT id FROM va_jobs WHERE status IN ('queued','generating') ORDER BY created_at LIMIT 3"
        ).fetchall()
    job_ids = [r["id"] for r in rows]
    if job_ids:
        await asyncio.gather(*[_process_job(jid) for jid in job_ids])

async def _process_job(job_id: str) -> None:
    async with _worker_lock:
        with _db() as conn:
            job = conn.execute("SELECT * FROM va_jobs WHERE id=?", (job_id,)).fetchone()
            if not job:
                return
            if job["status"] in ("completed", "failed", "cancelled"):
                return
            conn.execute(
                "UPDATE va_jobs SET status='generating', updated_at=datetime('now') WHERE id=?",
                (job_id,),
            )

    try:
        plan = VideoPlan(**json.loads(job["plan_json"]))
        service = job["service_pref"]
        aspect = job["aspect_ratio"]
        seg_dir = _DATA_DIR / job_id / "segments"
        seg_dir.mkdir(parents=True, exist_ok=True)

        await _process_segments(job_id, plan, service, aspect, seg_dir)

        # Check all done
        with _db() as conn:
            total = conn.execute(
                "SELECT COUNT(*) as c FROM va_segments WHERE job_id=?", (job_id,)
            ).fetchone()["c"]
            done = conn.execute(
                "SELECT COUNT(*) as c FROM va_segments WHERE job_id=? AND status='done'", (job_id,)
            ).fetchone()["c"]

        if done < total:
            failed = total - done
            logger.warning("VA: job %s has %d failed segments", job_id, failed)
            with _db() as conn:
                conn.execute(
                    "UPDATE va_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?",
                    (f"{failed} segments failed", job_id),
                )
            return

        # Assemble
        with _db() as conn:
            conn.execute(
                "UPDATE va_jobs SET status='assembling', updated_at=datetime('now') WHERE id=?",
                (job_id,),
            )
        output = await _assemble_job(job_id, add_music=bool(job["add_music"]))
        with _db() as conn:
            conn.execute(
                "UPDATE va_jobs SET status='completed', output_path=?, updated_at=datetime('now') WHERE id=?",
                (str(output), job_id),
            )
        logger.info("VA: job %s completed → %s", job_id, output)

    except Exception as e:
        logger.error("VA: job %s failed: %s", job_id, e, exc_info=True)
        with _db() as conn:
            conn.execute(
                "UPDATE va_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?",
                (str(e)[:500], job_id),
            )

async def _process_segments(
    job_id: str, plan: VideoPlan, service: str, aspect: str, seg_dir: Path
) -> None:
    with _db() as conn:
        segs = conn.execute(
            "SELECT idx, status, file_path FROM va_segments WHERE job_id=? ORDER BY idx",
            (job_id,),
        ).fetchall()

    pending = [s for s in segs if s["status"] not in ("done",)]
    # Process up to 2 at a time
    sem = asyncio.Semaphore(2)

    async def _do_seg(seg_row):
        async with sem:
            if seg_row["status"] == "done" and seg_row["file_path"] and Path(seg_row["file_path"]).exists():
                return
            seg_plan = next(s for s in plan.segments if s.index == seg_row["idx"])
            await _generate_segment(job_id, seg_plan, service, aspect, seg_dir)

    await asyncio.gather(*[_do_seg(s) for s in pending])

async def _generate_segment(
    job_id: str, seg: SegmentModel, service: str, aspect: str, seg_dir: Path
) -> None:
    with _db() as conn:
        conn.execute(
            "UPDATE va_segments SET status='submitting', updated_at=datetime('now') WHERE job_id=? AND idx=?",
            (job_id, seg.index),
        )

    # Try services in order
    services_to_try = [service] + [s for s in SERVICE_RANK if s != service]
    seg_raw = seg_dir / f"seg_{seg.index:03d}_raw.mp4"
    seg_norm = seg_dir / f"seg_{seg.index:03d}.mp4"

    for svc in services_to_try:
        if _is_service_degraded(svc):
            continue
        try:
            with _db() as conn:
                row = conn.execute(
                    "SELECT init_image FROM va_segments WHERE job_id=? AND idx=?",
                    (job_id, seg.index),
                ).fetchone()
            init_img = Path(row["init_image"]) if row and row["init_image"] else None

            with _db() as conn:
                conn.execute(
                    "UPDATE va_segments SET status='generating', service_used=?, "
                    "updated_at=datetime('now') WHERE job_id=? AND idx=?",
                    (svc, job_id, seg.index),
                )

            driver = await _get_driver(svc)
            task_ref = await driver.submit(seg.visual_prompt_en, seg.duration_s, init_img)

            # Poll
            timeout = 600
            start = time.monotonic()
            while time.monotonic() - start < timeout:
                status, result_path = await driver.poll(task_ref)
                if status == "ready":
                    break
                if status == "failed":
                    raise RuntimeError(f"Driver reported failure for task {task_ref}")
                with _db() as conn:
                    conn.execute(
                        "UPDATE va_segments SET task_ref=?, updated_at=datetime('now') WHERE job_id=? AND idx=?",
                        (task_ref, job_id, seg.index),
                    )
                await asyncio.sleep(10)
            else:
                raise TimeoutError(f"Segment {seg.index} timed out after {timeout}s on {svc}")

            await driver.download(task_ref, seg_raw)

            # Normalize
            _normalize_segment(seg_raw, seg_norm, aspect)
            seg_raw.unlink(missing_ok=True)

            # Extract last frame for next segment's init_image
            if seg.index + 1 < 999:  # has next segment
                frame_path = seg_dir / f"frame_{seg.index:03d}.jpg"
                if _extract_last_frame(seg_norm, frame_path):
                    with _db() as conn:
                        conn.execute(
                            "UPDATE va_segments SET init_image=? WHERE job_id=? AND idx=?",
                            (str(frame_path), job_id, seg.index + 1),
                        )

            with _db() as conn:
                conn.execute(
                    "UPDATE va_segments SET status='done', file_path=?, error=NULL, "
                    "updated_at=datetime('now') WHERE job_id=? AND idx=?",
                    (str(seg_norm), job_id, seg.index),
                )
            # Reset service fail count
            _reset_service_fails(svc)
            logger.info("VA: segment %d done via %s", seg.index, svc)
            return

        except Exception as e:
            logger.warning("VA: segment %d failed on %s: %s", seg.index, svc, e)
            _increment_service_fails(svc)
            with _db() as conn:
                conn.execute(
                    "UPDATE va_segments SET attempts=attempts+1, error=?, "
                    "updated_at=datetime('now') WHERE job_id=? AND idx=?",
                    (str(e)[:300], job_id, seg.index),
                )
            continue  # try next service

    # All services failed
    with _db() as conn:
        conn.execute(
            "UPDATE va_segments SET status='failed', updated_at=datetime('now') WHERE job_id=? AND idx=?",
            (job_id, seg.index),
        )

async def _assemble_job(
    job_id: str,
    crossfade: bool = False,
    add_music: bool = False,
) -> Path:
    with _db() as conn:
        segs = conn.execute(
            "SELECT file_path FROM va_segments WHERE job_id=? AND status='done' ORDER BY idx",
            (job_id,),
        ).fetchall()
    seg_paths = [Path(s["file_path"]) for s in segs if s["file_path"]]

    out_dir = _DATA_DIR / job_id
    joined = out_dir / "joined.mp4"
    _concat_segments(seg_paths, joined, crossfade=crossfade)

    # Audio mux
    music_path: Optional[Path] = None
    if add_music and _MUSIC_DIR.exists():
        music_files = list(_MUSIC_DIR.glob("*.mp3")) + list(_MUSIC_DIR.glob("*.m4a"))
        if music_files:
            music_path = music_files[0]

    final = out_dir / "final.mp4"
    _mux_audio(joined, None, music_path, final)
    if joined != final:
        joined.unlink(missing_ok=True)
    return final

# ── Service state helpers ─────────────────────────────────────────────────────
def _is_service_degraded(name: str) -> bool:
    with _db() as conn:
        row = conn.execute(
            "SELECT status, cooldown_until FROM va_service_state WHERE name=?", (name,)
        ).fetchone()
    if not row:
        return False
    if row["status"] in ("down", "needs_relogin"):
        if row["cooldown_until"]:
            import datetime
            if datetime.datetime.utcnow().isoformat() < row["cooldown_until"]:
                return True
    return False

def _increment_service_fails(name: str) -> None:
    import datetime
    with _db() as conn:
        conn.execute(
            "UPDATE va_service_state SET fail_count=fail_count+1, updated_at=datetime('now') WHERE name=?",
            (name,),
        )
        row = conn.execute("SELECT fail_count FROM va_service_state WHERE name=?", (name,)).fetchone()
        if row and row["fail_count"] >= 3:
            cooldown = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
            conn.execute(
                "UPDATE va_service_state SET status='degraded', cooldown_until=? WHERE name=?",
                (cooldown, name),
            )

def _reset_service_fails(name: str) -> None:
    with _db() as conn:
        conn.execute(
            "UPDATE va_service_state SET fail_count=0, status='ok', cooldown_until=NULL WHERE name=?",
            (name,),
        )

# ── FastAPI Router ────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/video-ai", tags=["video-ai"])

@router.post("/plan")
async def api_generate_plan(req: PlanRequest):
    """Generuje plan (anchor + segmenty) bez uruchamiania generacji wideo."""
    try:
        plan = await generate_plan(req)
        return {"success": True, "plan": plan.model_dump()}
    except Exception as e:
        logger.error("VA: plan generation failed: %s", e, exc_info=True)
        raise HTTPException(500, detail=str(e))

@router.post("/jobs")
async def api_create_job(req: JobCreateRequest, bg: BackgroundTasks):
    """Tworzy job z zaakceptowanego planu i uruchamia generację."""
    job_id = str(uuid.uuid4())
    plan = req.plan
    service = req.service_pref or plan.meta.get("service_pref", "pixverse")

    with _db() as conn:
        conn.execute(
            """INSERT INTO va_jobs (id, user_prompt, plan_json, target_seconds, aspect_ratio,
               service_pref, add_narration, add_music) VALUES (?,?,?,?,?,?,?,?)""",
            (job_id, plan.meta.get("user_prompt", ""), plan.model_dump_json(),
             plan.meta.get("target_seconds", 60), req.aspect_ratio,
             service, int(req.add_narration), int(req.add_music)),
        )
        for seg in plan.segments:
            conn.execute(
                """INSERT INTO va_segments (job_id, idx, duration_s, prompt_en,
                   start_frame, end_frame) VALUES (?,?,?,?,?,?)""",
                (job_id, seg.index, seg.duration_s, seg.visual_prompt_en,
                 seg.start_frame_desc, seg.end_frame_desc),
            )

    bg.add_task(start_worker)
    logger.info("VA: job %s created (%d segments)", job_id, len(plan.segments))
    return {"success": True, "job_id": job_id}

@router.get("/jobs/{job_id}/status")
async def api_job_status(job_id: str):
    with _db() as conn:
        job = conn.execute("SELECT * FROM va_jobs WHERE id=?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(404, "Job not found")
        segs = conn.execute(
            "SELECT idx, status, service_used, error, duration_s FROM va_segments "
            "WHERE job_id=? ORDER BY idx", (job_id,)
        ).fetchall()

    total = len(segs)
    done  = sum(1 for s in segs if s["status"] == "done")
    progress = round(done / total * 100) if total else 0

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": progress,
        "done_segments": done,
        "total_segments": total,
        "output_url": f"/api/video-ai/jobs/{job_id}/download" if job["output_path"] else None,
        "error": job["error"],
        "segments": [dict(s) for s in segs],
    }

@router.get("/jobs/{job_id}/download")
async def api_download_job(job_id: str):
    with _db() as conn:
        job = conn.execute(
            "SELECT output_path, status FROM va_jobs WHERE id=?", (job_id,)
        ).fetchone()
    if not job or not job["output_path"]:
        raise HTTPException(404, "Output not ready")
    p = Path(job["output_path"])
    if not p.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(p), media_type="video/mp4", filename=f"video_ai_{job_id[:8]}.mp4")

@router.post("/jobs/{job_id}/segment/{idx}/retry")
async def api_retry_segment(job_id: str, idx: int, req: SegmentRetryRequest, bg: BackgroundTasks):
    with _db() as conn:
        seg = conn.execute(
            "SELECT * FROM va_segments WHERE job_id=? AND idx=?", (job_id, idx)
        ).fetchone()
        if not seg:
            raise HTTPException(404, "Segment not found")
        update_fields: list = ["status='queued'", "error=NULL", "updated_at=datetime('now')", "attempts=0"]
        params: list = []
        if req.prompt_override:
            update_fields.append("prompt_en=?")
            params.append(req.prompt_override)
        params += [job_id, idx]
        conn.execute(
            f"UPDATE va_segments SET {', '.join(update_fields)} WHERE job_id=? AND idx=?",
            params,
        )
        conn.execute(
            "UPDATE va_jobs SET status='generating', error=NULL, updated_at=datetime('now') WHERE id=?",
            (job_id,),
        )
    bg.add_task(start_worker)
    return {"success": True}

@router.post("/jobs/{job_id}/cancel")
async def api_cancel_job(job_id: str):
    with _db() as conn:
        conn.execute(
            "UPDATE va_jobs SET status='cancelled', updated_at=datetime('now') WHERE id=?",
            (job_id,),
        )
    return {"success": True}

@router.post("/jobs/{job_id}/assemble")
async def api_assemble_job(
    job_id: str,
    crossfade: bool = False,
    add_music: bool = False,
    bg: BackgroundTasks = None,
):
    """Wymusza ponowny montaż (np. po ręcznej wymianie segmentu)."""
    with _db() as conn:
        job = conn.execute("SELECT * FROM va_jobs WHERE id=?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(404)
        conn.execute(
            "UPDATE va_jobs SET status='assembling', updated_at=datetime('now') WHERE id=?",
            (job_id,),
        )

    async def _do():
        try:
            output = await _assemble_job(job_id, crossfade=crossfade, add_music=add_music)
            with _db() as conn:
                conn.execute(
                    "UPDATE va_jobs SET status='completed', output_path=?, updated_at=datetime('now') WHERE id=?",
                    (str(output), job_id),
                )
        except Exception as e:
            with _db() as conn:
                conn.execute(
                    "UPDATE va_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?",
                    (str(e)[:500], job_id),
                )

    if bg:
        bg.add_task(_do)
    else:
        asyncio.create_task(_do())
    return {"success": True}

@router.get("/jobs")
async def api_list_jobs(limit: int = 20):
    with _db() as conn:
        rows = conn.execute(
            "SELECT id, user_prompt, status, target_seconds, created_at, output_path, error "
            "FROM va_jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return {"jobs": [dict(r) for r in rows]}

@router.get("/services")
async def api_list_services():
    with _db() as conn:
        rows = conn.execute("SELECT * FROM va_service_state").fetchall()
    return {
        "services": [
            {**dict(r), "max_segment_s": SERVICE_MAX_SEGMENT.get(r["name"], 8.0)}
            for r in rows
        ]
    }

@router.post("/services/{name}/mark-logged-in")
async def api_mark_logged_in(name: str):
    with _db() as conn:
        conn.execute(
            "UPDATE va_service_state SET logged_in=1, status='ok', updated_at=datetime('now') WHERE name=?",
            (name,),
        )
    return {"success": True}

@router.post("/services/{name}/mark-needs-login")
async def api_mark_needs_login(name: str):
    with _db() as conn:
        conn.execute(
            "UPDATE va_service_state SET logged_in=0, status='needs_relogin', "
            "updated_at=datetime('now') WHERE name=?",
            (name,),
        )
    return {"success": True}

# ── Bootstrap sesji Playwright przez Xvfb + x11vnc + noVNC ───────────────────
_bootstrap_sessions: dict[str, dict] = {}  # name -> {procs, display, vnc_port, ws_port, pw_task}
_DISPLAY_BASE = 30   # Xvfb :30, :31, ...
_VNC_PORT_BASE = 5930
_WS_PORT_BASE  = 6090
_NOVNC_HOST    = os.getenv("VA_NOVNC_HOST", "localhost")


def _alloc_ports(name: str) -> tuple[int, int, int]:
    idx = list(SERVICE_RANK).index(name) if name in SERVICE_RANK else len(_bootstrap_sessions)
    return _DISPLAY_BASE + idx, _VNC_PORT_BASE + idx, _WS_PORT_BASE + idx


@router.post("/services/{name}/bootstrap/start")
async def api_bootstrap_start(name: str):
    """
    Uruchamia Xvfb + x11vnc + websockify + przeglądarkę z stroną logowania.
    Zwraca URL do wbudowanego noVNC — użytkownik loguje się w przeglądarce.
    """
    if name not in SERVICE_RANK and name not in ("pixverse", "hailuo", "gemini", "kling", "runway"):
        raise HTTPException(400, f"Unknown service: {name}")

    if name in _bootstrap_sessions:
        sess = _bootstrap_sessions[name]
        return {
            "success": True,
            "vnc_url": f"http://{_NOVNC_HOST}:{sess['ws_port']}/vnc.html"
                       f"?host={_NOVNC_HOST}&port={sess['ws_port']}&autoconnect=1&resize=scale",
            "ws_port": sess["ws_port"],
            "status": "already_running",
        }

    display, vnc_port, ws_port = _alloc_ports(name)

    procs = []
    try:
        # 1. Xvfb
        xvfb = subprocess.Popen(
            ["Xvfb", f":{display}", "-screen", "0", "1280x900x24"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        procs.append(xvfb)
        await asyncio.sleep(1.5)

        # 2. x11vnc
        vnc = subprocess.Popen(
            ["x11vnc", "-display", f":{display}", "-rfbport", str(vnc_port),
             "-nopw", "-localhost", "-forever", "-quiet", "-shared"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        procs.append(vnc)
        await asyncio.sleep(1)

        # 3. websockify (most noVNC)
        import shutil as _shutil
        novnc_path = "/usr/share/novnc"
        wsify = subprocess.Popen(
            ["websockify", "--web", novnc_path, str(ws_port), f"localhost:{vnc_port}"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        procs.append(wsify)
        await asyncio.sleep(1)

    except Exception as e:
        for p in procs:
            try: p.kill()
            except: pass
        raise HTTPException(500, f"Nie udało się uruchomić środowiska VNC: {e}")

    _bootstrap_sessions[name] = {
        "procs": procs,
        "display": display,
        "vnc_port": vnc_port,
        "ws_port": ws_port,
        "pw_task": None,
    }

    # 4. Uruchom Playwright (nawigacja do strony logowania) w tle
    async def _launch_browser():
        try:
            import os as _os
            env = {**_os.environ, "DISPLAY": f":{display}"}
            from video_ai_drivers import get_driver
            driver = get_driver(name)
            _, browser, ctx = await driver._get_browser(headless=False)
            page = await ctx.new_page()
            await driver._navigate_to_login(page)
            logger.info("VA bootstrap %s: przeglądarka otwarta, czeka na login", name)
            # Trzymaj kontekst w sesji do pobrania po finish
            _bootstrap_sessions[name]["ctx"] = ctx
            _bootstrap_sessions[name]["browser"] = browser
            _bootstrap_sessions[name]["pw"] = driver._playwright if hasattr(driver, "_playwright") else None
        except Exception as e:
            logger.error("VA bootstrap %s: błąd Playwright: %s", name, e)

    task = asyncio.create_task(_launch_browser())
    _bootstrap_sessions[name]["pw_task"] = task

    vnc_url = (
        f"http://{_NOVNC_HOST}:{ws_port}/vnc.html"
        f"?host={_NOVNC_HOST}&port={ws_port}&autoconnect=1&resize=scale"
    )
    return {
        "success": True,
        "vnc_url": vnc_url,
        "ws_port": ws_port,
        "display": display,
        "status": "started",
        "message": f"Otwórz link w przeglądarce, zaloguj się do {name}, a następnie kliknij 'Zapisz sesję'.",
    }


@router.post("/services/{name}/bootstrap/finish")
async def api_bootstrap_finish(name: str):
    """Zapisuje sesję Playwright i zatrzymuje procesy VNC."""
    sess = _bootstrap_sessions.get(name)
    if not sess:
        raise HTTPException(404, "Bootstrap session not found — start first")

    ctx = sess.get("ctx")
    browser = sess.get("browser")
    pw = sess.get("pw")

    try:
        if ctx:
            session_path = _SESSIONS_DIR / f"{name}.json"
            await ctx.storage_state(path=str(session_path))
            logger.info("VA bootstrap %s: sesja zapisana → %s", name, session_path)
            await ctx.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
    except Exception as e:
        logger.warning("VA bootstrap %s: błąd przy zamykaniu Playwright: %s", name, e)

    # Kill VNC processes
    for proc in sess.get("procs", []):
        try:
            proc.terminate()
        except:
            pass

    del _bootstrap_sessions[name]

    # Oznacz serwis jako zalogowany
    with _db() as conn:
        conn.execute(
            "UPDATE va_service_state SET logged_in=1, status='ok', "
            "updated_at=datetime('now') WHERE name=?",
            (name,),
        )

    return {"success": True, "message": f"Sesja {name} zapisana. Możesz generować wideo."}


@router.get("/services/{name}/bootstrap/status")
async def api_bootstrap_status(name: str):
    sess = _bootstrap_sessions.get(name)
    if not sess:
        # Sprawdź czy plik sesji istnieje
        session_path = _SESSIONS_DIR / f"{name}.json"
        return {
            "running": False,
            "has_session": session_path.exists(),
            "ws_port": None,
        }
    return {
        "running": True,
        "has_session": bool(sess.get("ctx")),
        "ws_port": sess["ws_port"],
        "display": sess["display"],
        "vnc_url": (
            f"http://{_NOVNC_HOST}:{sess['ws_port']}/vnc.html"
            f"?host={_NOVNC_HOST}&port={sess['ws_port']}&autoconnect=1&resize=scale"
        ),
    }


@router.delete("/services/{name}/bootstrap")
async def api_bootstrap_cancel(name: str):
    """Anuluje bootstrap session bez zapisywania."""
    sess = _bootstrap_sessions.get(name)
    if sess:
        for proc in sess.get("procs", []):
            try: proc.terminate()
            except: pass
        task = sess.get("pw_task")
        if task and not task.done():
            task.cancel()
        del _bootstrap_sessions[name]
    return {"success": True}
