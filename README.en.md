# 🎙 Voice & Video Studio AI

🌐 **Język / Language:** [🇵🇱 Polski](README.md) | [🇬🇧 English](README.en.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md)

![Python](https://img.shields.io/badge/Python-3.11%2F3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-CPU%2FGPU-2496ED?logo=docker&logoColor=white)
![GPU](https://img.shields.io/badge/GPU-NVIDIA%20CUDA-76B900?logo=nvidia&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A local AI studio for generating and editing audio/video — combines Chatterbox TTS, Coqui XTTS, WhisperX, MusicGen, Demucs, RVC, AnimateDiff, WAN 2.1 and more in a single interface. Runs 100% on your own hardware, no external subscriptions required.

---

## 📋 Table of contents

- [Get started in 5 minutes](#-get-started-in-5-minutes)
- [What can you do with it?](#-what-can-you-do-with-it)
- [Features](#-features)
- [Hardware requirements](#-hardware-requirements)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running](#-running)
- [API Reference](#-api-reference)
- [Job queue](#-job-queue)
- [Presentations & batch mode](#-presentations--batch-mode)
- [Night Mode](#-night-mode)
- [Security](#-security)
- [TTS models — test results](#-tts-models--test-results)
- [Troubleshooting](#-troubleshooting)
- [What's new](#-whats-new)
- [E2E tests](#-e2e-tests)
- [Open source projects used](#-open-source-projects-used)

---

## 🚀 Get started in 5 minutes

### 🐳 Docker — works right away, no dependency installation

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio

# CPU (TTS, transcription, presentations):
docker compose up -d

# GPU — NVIDIA (all features, requires nvidia-container-toolkit):
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

Open: **http://localhost:47822**

> Requirements: Docker 24+, Docker Compose v2. On Windows — Docker Desktop with the WSL2 backend.

---

### 🐧 Linux / macOS / WSL2 — install script

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
bash voice-studio/install.sh
```

The script detects the OS, installs Python 3.11 + Node 20 + ffmpeg, asks about optional components (XTTS, WhisperX, MusicGen...) and builds the frontend. At the end it starts the server.

After installation: **http://localhost:47821**

---

## 🌟 What can you do with it?

- **Presentation → Video:** Upload a PPTX or PDF, edit the narrator text for each slide, choose a voice and click "Render". A few minutes later you have a ready MP4.
- **Voice cloning:** Upload a 10-second WAV sample — XTTS-v2 will speak in that voice in 17 languages.
- **Transcription with diarization:** WhisperX recognizes speakers and generates text with timestamps ("who spoke when").
- **AI music:** Describe the mood in words — MusicGen will generate a music track in a few minutes.
- **Stem separation:** Demucs isolates voice, drums, bass and instruments from an existing recording.
- **Audiobook:** Upload an EPUB or TXT — the system splits it into chapters and narrates it.

---

## ✨ Features

### 🎙 Audio & TTS

| Module | Engine | GPU | VRAM |
|---|---|:---:|---|
| Fast narrator | edge-tts (Microsoft Neural) | ❌ | — |
| Voice cloning EN | Chatterbox Turbo (Resemble AI) | ✅ | 4 GB |
| Voice cloning PL/multi | Chatterbox Multilingual V3 | ✅ | 4 GB |
| Voice cloning (fallback) | XTTS-v2 (Coqui) | ✅ | 4 GB |
| AI music | MusicGen (Meta) | ✅ | 6 GB |
| Transcription + diarization | WhisperX | ✅ | 3 GB |
| Stem separation (4-stem/2-stem) | Demucs | optional | — |
| Voice character change | RVC (isolated venv) | optional | — |
| Audio mixer | ffmpeg | ❌ | — |

### 🎬 Video & Presentations

| Module | Description |
|---|---|
| Presentation → Video | PPTX/PDF + narrator → MP4, async queueing |
| Batch queueing | Many PPTX/PDF files at once, one shared narrator voice |
| AI video generator | AnimateDiff (local, 6 GB), WAN 2.1 (12 GB), Runway (API) |
| Feature film | Script + scenes + actor voices → finished movie |
| Dialogue studio | Two actors, Ollama LLM → script → XTTS lines |
| Video editor | Trim, crop, rotate, speed, audio replace, subtitles (ffmpeg) |
| Avatar animation | SadTalker + GFPGAN — real lip-sync from audio and face quality enhancement, ken-burns fallback |

### ⚙️ Tools

| Module | Description |
|---|---|
| JobMonitor | Status of all jobs: queued / running / completed |
| QA Checker | Audio analysis: clipping, silence, noise, speech rate |
| Dashboard | GPU/CPU/RAM/disk, installed components |
| Night Mode | Render scheduling (e.g. only 22:00–7:00) |
| History | List of generated files with preview |
| Settings | Ollama host/model, CORS, password, cache clearing |

---

## 💻 Hardware requirements

| Feature | Min. VRAM | Notes |
|---|---|---|
| edge-tts (narrator) | — | Works without a GPU, requires internet |
| XTTS-v2 (cloning) | 4 GB | GPU required |
| WhisperX (transcription) | 3 GB | GPU required |
| MusicGen (music) | 6 GB | GPU required |
| AnimateDiff (video) | 8 GB | GPU required |
| WAN 2.1 (HD video) | 12 GB | GPU required |
| Demucs, RVC | — | GPU optional (slower on CPU) |

**RAM:** minimum 8 GB, recommended 16 GB+
**Disk:** 20 GB (AI models alone), recommended 100 GB+
**OS:** Linux (recommended), macOS, Windows (WSL2 or Docker)

---

## 🔧 Installation

### Method 1 — Docker (simplest)

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio
docker compose up -d                                                    # CPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d   # GPU
```

Frontend: `http://localhost:47822` | Backend API: `http://localhost:47821`

### Method 2 — install.sh script (Linux/macOS/WSL2)

```bash
bash install.sh
```

Installs dependencies, asks about GPU components, builds the frontend, creates `start.sh`.

### Method 3 — install.py wizard (cross-platform)

```bash
python install.py              # interactive
python install.py --check      # check what's installed
python install.py --all        # install everything without asking
```

### Method 4 — Manual

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio/backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart httpx psutil \
    edge-tts soundfile pydub python-pptx PyMuPDF Pillow aiofiles
# GPU deps (optional):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install TTS whisperx demucs
# Frontend:
cd ../frontend && npm ci && npm run build
```

---

## ⚙️ Configuration

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `VOICE_STUDIO_DATA_DIR` | _(local)_ | Path to an external disk for AI and audio files |
| `CORS_ORIGINS` | `localhost:47822` | Allowed origins (comma separated) |
| `LOG_LEVEL` | `INFO` | Logging level: DEBUG / INFO / WARNING |

Example for a server with an external disk:

```env
VOICE_STUDIO_DATA_DIR=/mnt/storage
CORS_ORIGINS=http://192.168.0.100:47821,http://localhost:47821
```

---

## ▶️ Running

```bash
# Start script (created by install.sh):
bash ~/voice-studio/start.sh

# Manual:
cd backend && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1
```

> `--workers 1` is required — the XTTS model is loaded into GPU memory and is not thread-safe.

```bash
# systemd service:
sudo systemctl start voice-studio
sudo journalctl -u voice-studio -f   # live logs
```

---

## 📡 API Reference

### Health & Hardware

```bash
GET  /api/health           → {"status":"ok","version":"1.1.0"}
GET  /api/hardware         → GPU/CPU/RAM/disk + capabilities
GET  /api/queue/status     → job queue state
```

### TTS — Speech generation

```bash
# edge-tts (fast, online):
curl -X POST http://localhost:47821/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello!", "voice":"pl-PL-MarekNeural", "speed":1.0}' \
  --output audio.mp3

# XTTS-v2 (cloning from a sample):
curl -X POST http://localhost:47821/api/tts/xtts \
  -F "text=Text to speak" \
  -F "speaker_wav=@sample.wav" \
  -F "language=pl" --output cloned.wav
```

Voices: `GET /api/voices` | Upload sample: `POST /api/clone-voice` | Delete: `DELETE /api/cloned-voices/{name}`

### Presentations

```bash
# 1. Parse PPTX/PDF → slides:
curl -X POST http://localhost:47821/api/presentation/parse -F "file=@deck.pptx"
# → {"session_id":"abc123","slides":[...],"total_slides":12}

# 2. Queue rendering → MP4:
curl -X POST http://localhost:47821/api/presentation/render \
  -F "session_id=abc123" \
  -F 'slides=[{"index":0,"text":"Narrator text for slide 0"}]' \
  -F "voice_key=pl_male_marek"
# → {"job_id":"xyz"}

# 3. Poll status:
curl http://localhost:47821/api/jobs/xyz
# → {"status":"completed","progress":100,"url":"/api/audio/deck-xyz.mp4"}
```

### Other endpoints

```bash
POST /api/transcribe          # WhisperX: file, language, diarize=true/false
POST /api/music/generate      # MusicGen: {"prompt":"...","duration":30}
POST /api/audio/demucs        # Demucs: file, stems=4|2
POST /api/audio/rvc           # RVC: file, model, semitone_shift
POST /api/audio/mix           # Audio mixer
POST /api/audiobook/generate  # Audiobook from EPUB/text
POST /api/generate-video      # AI video generator
POST /api/render-dialogue     # Two-actor dialogue
GET  /api/files               # List of generated files
DELETE /api/files/{filepath}  # Delete a file
POST /api/cache/clear         # Clear /tmp/*
POST /api/auth/set-password   # Set password (bcrypt)
```

---

## 🔄 Job queue

Endpoints accept a request and immediately return a `job_id`. Jobs are processed one after another (single GPU worker).

```
queued → running → completed
                 ↘ failed
```

The frontend polls `GET /api/jobs/{job_id}` every 2.5 seconds. A job can be cancelled with `DELETE /api/queue/{job_id}`.

Jobs expire automatically after 2 hours (TTL cleanup).

---

## 📂 Presentations & batch mode

**Single presentation:** Video → Presentation → upload PPTX/PDF → edit narrator texts → choose voice → Generate.

**Batch mode:** Video → Batch → drag in multiple files at once → choose a shared voice → "Add N to queue". Each file gets its own `job_id`. Progress shown in JobMonitor.

---

## 🌙 Night Mode

The system accepts jobs around the clock but only executes them within the configured time window. Configuration: Settings → Night Mode.

**Example:** Add 10 presentations in the evening, set the window to 22:00–7:00 — it renders overnight, everything is ready in the morning.

---

## 🔐 Security

- **Password:** `POST /api/auth/set-password` stores a bcrypt hash. Without a password — access is open.
- **Rate limiting:** 200 req/min per IP (slowapi when installed, sliding-window fallback).
- **Path traversal:** Audio files are served exclusively from `AUDIO_DIR` (`.relative_to()` validation).
- **RVC injection:** Model paths passed via a JSON config (not string interpolation).
- **CORS:** Configurable via `.env` — localhost only by default.

---

## 🧪 TTS models — test results

Tests performed on an NVIDIA RTX 3060 (12 GB VRAM), Python 3.12, CUDA 12.8. The goal was voice cloning for presentation narration in Polish and English, without hallucinations or artifacts.

### Models deployed and tested in production

| Model | Language | Cloning | Hallucinations | Quality | Status |
|---|---|:---:|:---:|:---:|---|
| **Chatterbox Turbo** | EN | ✅ | ❌ none | ⭐⭐⭐⭐⭐ | ✅ active (EN) |
| **Chatterbox Multilingual V3** | PL / multi | ✅ | ❌ none | ⭐⭐⭐⭐ | ✅ active (PL) |
| XTTS-v2 (Coqui) | PL / 17 lang | ✅ | ⚠️ CJK tokens | ⭐⭐⭐ | ⚠️ fallback |
| edge-tts (Microsoft Neural) | PL / EN / multi | ❌ | ❌ none | ⭐⭐⭐⭐ | ✅ ready-made voices |

**XTTS-v2** — the original engine, issues found:
- CJK artifacts at the start of each clip (language conditioning tokens). Workaround: warmup `"Hm. "` + 450 ms trim.
- Hallucinations at `temperature=0.3` (looping). Optimum: `temperature=0.55, repetition_penalty=3.0, top_k=40, top_p=0.75`.

**Chatterbox** — chosen as the replacement:
- Requires a separate `.chatterbox-venv` venv (`torch==2.6` conflicts with `torch==2.8+cu128` in the main venv). Communication via JSON-line pipe.
- The `resemble-perth` native extension is often unavailable — a patch is required: `perth.PerthImplicitWatermarker = perth.DummyWatermarker`.
- Texts >200 characters exceed the ~1000 generation-step limit — solution: split into chunks at sentence boundaries.
- `exaggeration=0.4` — balance between fidelity to the sample and natural expressiveness (0.25 = too flat, 0.5 = too far from the voice).

---

### Models researched but not tested locally

The models below were analyzed while choosing a TTS engine. The assessment was based on available documentation, benchmarks and community reports — not on a local installation.

| Model | PL | Cloning | Main reason for rejection |
|---|:---:|:---:|---|
| **CosyVoice 2** (Alibaba) | ✅ | ✅ | Best quality among the rejected models, but requires the whole ecosystem (FunASR + others) — too complex to maintain locally |
| **F5-TTS / E2-TTS** | ✅ | ✅ | Fast, but text hallucinations on long scripts (skipping / repeating words) — critical production issue |
| **OpenVoice v2** | ✅ | ✅ | Cloning works, but the voice timbre in PL sounds synthetic; worse quality than Chatterbox |
| **Fish Speech** | ✅ | ✅ | LLM-based architecture — on an RTX 3060, generating 60s of audio takes 2–4 min |
| **MetaVoice-1B** | ✅ | ✅ | High VRAM + unstable phonemes in PL; with 12 GB little room left for other processes |
| **StyleTTS2** | limited | ✅ | Zero-shot without fine-tuning gives average quality; no native PL |
| **Tortoise TTS** | limited | ✅ | Autoregressive: 5–10 min per minute of audio — completely unusable in real time |
| **Kokoro TTS** | ✅ | ❌ | No zero-shot — only predefined voices; disqualifies personalization |
| **Piper TTS** | ✅ | ❌ | Designed for edge devices (Raspberry Pi); quality insufficient for video recordings |

---

### Production configuration (active)

```
Cloned English voice   → Chatterbox Turbo        (exaggeration=0.4)
Cloned Polish voice    → Chatterbox Multilingual   (exaggeration=0.4)
Ready-made voice (no sample) → edge-tts Microsoft Neural
Fallback (no venv)     → XTTS-v2 with warmup+trim
```

---

## 🔍 Troubleshooting

**XTTS generates Chinese artifacts at the start of a clip**
The backend automatically trims the first 250ms and sanitizes the text (removes CJK characters). If the problem comes back — use simpler sentences without em-dashes and square brackets.

**"No module named 'pptx'" when uploading a presentation**
```bash
source ~/voice-studio/backend/.venv/bin/activate
pip install python-pptx PyMuPDF
sudo systemctl restart voice-studio
```

**The second presentation job disappears from the queue**
Fixed in v1.1.0. Clear the browser cache (Ctrl+Shift+R) and update the app.

**Ollama offline / dialogue generation error**
```bash
curl http://localhost:47821/api/ollama/status?host=http://localhost:11434
# → {"online":true,"models":["llama3.1:8b"]}
ollama serve          # if offline
ollama pull llama3.1:8b   # if the model is missing
```

**Frontend shows the old interface**
Ctrl+Shift+R (hard refresh). The production app runs on port 47821 — if you have a Vite dev server (47822), stop it.

---

## 🆕 What's new

### v1.4.0 — 2026-06

**Avatar — fixed, realistic lip-sync (critical fix):**
- The feature only produced a static image with a zoom effect — LivePortrait, which the code relied on, was never actually installed on the server
- Replaced with a working engine: **SadTalker** — real lip movement synced to the generated audio (not to a random driving video)
- Added **GFPGAN** (face restoration) — significantly reduces the "uncanny valley" look, the face appears sharp and natural
- Fixed a critical bug: SadTalker saved video using the `mpeg4` codec, which doesn't play in browsers (black screen) — added transcoding to `h264`
- 15-minute timeout per clip, automatic fallback to static animation on error

**Presentation → Movie — higher slide image quality:**
- PDF/PPTX now rendered at ~180 DPI (previously ~108 DPI) — slide text is sharp, not blurry
- Output video resolution increased from 1280×720 to 1920×1080 (Full HD)
- Higher x264 encoding quality (CRF 16 instead of the default 23) + Lanczos scaling

**Video editor — new options:**
- **Crop** — trim margins from top/bottom/left/right in pixels, with a live preview overlay on the video (useful for removing captions or watermarks)
- **Rotate** — 90° / 180° / 270°
- **Speed change** — 0.5× to 2× (audio and video stay in sync)

### v1.3.0 — 2026-06

**Multilingual support (i18n):**
- Full UI localization: Polish (default), English, German, Spanish
- Language switcher in the app header, choice saved to `localStorage` (persists across sessions)
- All modules (Presentations, Audiobook, Video, Animation, Avatar, Video Editor, QA Checker and others) fully translated

**Bug fixes (audit 2026-06-15):**
- API version: `/api/health` returned `1.1.0` instead of `2.0.0` — fixed
- QA check/fix for audiobook files (subdirectories, e.g. `/api/audio/book/chapter.mp3`) — `_url_to_path` was truncating the directory name (`Path.name`), now uses `_safe_audio_path` with full path traversal verification
- Frontend `HistoryTab`: empty `catch {}` in `fetchFiles`, `deleteFile`, `deleteAll` — added `console.warn` and HTTP status checking; network errors are no longer silently swallowed
- Playwright E2E tests: added `tests/e2e.spec.js` (10 tests) + `playwright.config.js` — all tests green

**Recording history — bulk download:**
- Select any files/folders with checkboxes → "Download selected" → ZIP with the whole selection
- Fixed download bug: the `<a>` element is now attached to the DOM before clicking, URL revoked with a 2s delay (some browsers cancelled the download immediately)
- Visible error message when the ZIP fails (previously an empty `catch {}` swallowed errors)
- Presentation files now use the input file's name instead of a UUID (`my-presentation-a1b2c3.mp4`)

**AI Prompt — generating dialogue from natural text:**
- New "AI Prompt" tab: type a description of the dialogue, an AI model (Ollama, local) generates a ready segment structure with assigned voices and parameters
- Support for thinking models (Qwen3): JSON extraction from a separate `thinking` field when `content` is empty (Ollama separates the reasoning trace from the answer)
- JSON repair: regex fixes invalid numeric values (`+1`, `-3` → `"+1"`, `"-3"`) and missing colons in keys
- Automatic retry on both response fields (`content` and `thinking`) and removal of `<think>...</think>` blocks

### v1.2.0 — 2026-06

**Chatterbox TTS — new main voice cloning engine:**
- Chatterbox Turbo for English + Chatterbox Multilingual V3 for Polish and other languages
- No CJK artifacts or hallucinations — a problem that affected XTTS-v2
- Separate `.chatterbox-venv` venv with automatic installation (install.sh + install.py)
- Automatic fallback to XTTS when Chatterbox is unavailable
- `exaggeration=0.4` parameter — balance between clone fidelity and voice expressiveness
- Long texts split into chunks at sentence boundaries — prevents cutoffs above 200 characters

**Recording history:**
- "Delete all" button — removes all generated files with one click
- Bulk selection (checkboxes) — delete selected recordings

**Presentation queue:**
- "Slide 5/13" status — processing progress information
- Realistic time estimate (ETA) based on time per slide

**Bug fixes:**
- Audio cutoff at the end of a slide — `apad` + `-shortest` didn't work together with `-loop 1`; fixed with an explicit `-t duration` on the image input
- Splitting text mid-word — character-based fallback split replaced with a word-boundary split

### v1.1.0 — 2026-06

**New features:**
- WAN 2.1 — text-to-video generation (12 GB VRAM), fast/standard/high quality control
- LivePortrait — face animation from a photo, ken-burns fallback (ffmpeg)
- Demucs 4-stem and 2-stem — stem separation with an audio player for each
- RVC in an isolated venv `/opt/rvc-venv` (Python 3.11 + numpy<2, avoids an ABI conflict with whisperx)
- Batch presentation queueing (PresentationBatchQueue)
- Install wizard: `install.sh` (Linux/macOS/WSL) + `install.py` (cross-platform)
- Docker: simplified `docker-compose.yml` + `docker-compose.gpu.yml` as an override

**Bug fixes:**
- Disk in `/api/hardware` showed the root fs instead of the proper data disk
- `video_generation` and `music_generation` falsely false when XTTS was loaded
- Race condition in the job queue (asyncio.Lock + global fix)
- RVC: form parameter name mismatch (`model` vs `voice_model`)
- Jobs expire after 2h (TTLDict — no memory leak)

---

## 🧪 E2E tests

The project includes Playwright tests covering the main user paths.

```bash
npx playwright test           # all tests
npx playwright test --ui      # interactive mode
npx playwright show-report    # HTML report
```

---

## 🙏 Open source projects used

| Project | License |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com) | MIT |
| [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) | Apache-2.0 |
| [Coqui TTS / XTTS-v2](https://github.com/coqui-ai/TTS) | MPL-2.0 |
| [edge-tts](https://github.com/rany2/edge-tts) | GPL-3.0 |
| [WhisperX](https://github.com/m-bain/whisperX) | MIT |
| [MusicGen / AudioCraft](https://github.com/facebookresearch/audiocraft) | CC BY-NC 4.0 |
| [Demucs](https://github.com/facebookresearch/demucs) | MIT |
| [AnimateDiff](https://github.com/guoyww/AnimateDiff) | Apache-2.0 |
| [SadTalker](https://github.com/OpenTalker/SadTalker) | Apache-2.0 |
| [GFPGAN](https://github.com/TencentARC/GFPGAN) | Apache-2.0 |
| [React](https://react.dev) | MIT |
| [Vite](https://vitejs.dev) | MIT |
| [Playwright](https://playwright.dev) | Apache-2.0 |

---

MIT License — see the `LICENSE` file for details.
