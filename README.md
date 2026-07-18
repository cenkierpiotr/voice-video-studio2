# 🎙 Voice & Video Studio AI

🌐 **Język / Language:** [🇵🇱 Polski](README.md) | [🇬🇧 English](README.en.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md)

![License](https://img.shields.io/badge/License-MIT-green)
![Docker](https://img.shields.io/badge/Docker-CPU%2FGPU-2496ED?logo=docker&logoColor=white)
![GPU](https://img.shields.io/badge/GPU-CUDA-76B900?logo=nvidia&logoColor=white)

Lokalne studio AI do generowania i edycji audio/wideo — łączy Chatterbox TTS, Coqui XTTS, WhisperX, MusicGen, Demucs, RVC, AnimateDiff, WAN 2.1 i inne w jeden interfejs. Działa w 100% na Twoim sprzęcie bez zewnętrznych subskrypcji.

---

## 🆙 Aktualizacja — lipiec 2026

### Nowe: AI Video Orchestrator

Wpisz opis filmu (30–180 sekund) → system automatycznie podzieli go na segmenty, wygeneruje spójne wizualnie prompty i zleci generację wideo do wybranego webowego serwisu AI. Gotowe segmenty składa w jeden film przez ffmpeg.

**Co jest nowe:**
- **Zakładka Video AI** z wizardem 4-krokowym (prompt → parametry → podgląd planu → generowanie)
- **Dwuprzebiegowy PromptProcessor** — jeden prompt → spójny plan z paletą barw, nastrojem, stylem kamery i frame chainingiem między segmentami
- **5 obsługiwanych serwisów webowych** (przez Playwright — korzysta z Twoich subskrypcji, bez API fees): Pixverse, Hailuo/MiniMax, Gemini Veo, Kling AI, Runway ML
- **Bootstrap sesji wbudowany w UI** — kliknij "Zaloguj" → otwiera się przeglądarka w oknie iframe (noVNC) → logujesz się raz → sesja zapisana automatycznie
- **Automatyczny failover** między serwisami, checkpointing, bezpieczny restart
- **Driver `local_ffmpeg`** — zawsze aktywny, bez logowania, do testowania pipeline

---

## 📋 Spis treści

- [Zacznij w 5 minut](#-zacznij-w-5-minut)
- [Co możesz z tym zrobić?](#-co-możesz-z-tym-zrobić)
- [Funkcjonalności](#-funkcjonalności)
- [Wymagania sprzętowe](#-wymagania-sprzętowe)
- [Instalacja](#-instalacja)
- [Konfiguracja](#-konfiguracja)
- [Uruchomienie](#-uruchomienie)
- [API Reference](#-api-reference)
- [Kolejka zadań](#-kolejka-zadań)
- [Prezentacje i tryb wsadowy](#-prezentacje-i-tryb-wsadowy)
- [Night Mode](#-night-mode)
- [Bezpieczeństwo](#-bezpieczeństwo)
- [Modele TTS — wyniki testów](#-modele-tts--wyniki-testów)
- [Rozwiązywanie problemów](#-rozwiązywanie-problemów)
- [Co nowego](#-co-nowego)
- [Testy E2E](#-testy-e2e)
- [Użyte projekty open source](#-użyte-projekty-open-source)

---

## 🚀 Zacznij w 5 minut

### 🐳 Docker — działa od razu, bez instalacji zależności

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio

# CPU (TTS, transkrypcja, prezentacje):
docker compose up -d

# GPU — NVIDIA (wszystkie funkcje, wymaga nvidia-container-toolkit):
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

Otwórz: **http://localhost:47822**

> Wymagania: Docker 24+, Docker Compose v2. Na Windows — Docker Desktop z WSL2 backend.

---

### 🐧 Linux / macOS / WSL2 — skrypt instalacyjny

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
bash voice-studio/install.sh
```

Skrypt wykrywa OS, instaluje Python 3.11 + Node 20 + ffmpeg, pyta o opcjonalne komponenty (XTTS, WhisperX, MusicGen...) i buduje frontend. Na końcu uruchamia serwer.

Po instalacji: **http://localhost:47821**

---

## 🌟 Co możesz z tym zrobić?

- **Prezentacja → Film:** Wgraj PPTX lub PDF, edytuj tekst lektora dla każdego slajdu, wybierz głos i kliknij "Renderuj". Po kilku minutach masz gotowy MP4.
- **Klonowanie głosu:** Wgraj 10-sekundową próbkę WAV — Chatterbox lub XTTS-v2 będzie mówić tym głosem w wielu językach.
- **Transkrypcja z diaryzacją:** WhisperX rozpoznaje mówców i generuje tekst ze znacznikami czasu ("kto kiedy mówił").
- **Muzyka AI:** Opisz nastrój słowami — MusicGen wygeneruje podkład muzyczny w kilka minut.
- **Separacja ścieżek:** Demucs wyizoluje głos, perkusję, bas i instrumenty z gotowego nagrania.
- **Audiobook z masteringiem:** Wgraj EPUB lub TXT — system podzieli na rozdziały, nagra lektorem i zastosuje mastering ACX/EBU R128.
- **Wideo AI lokalnie:** Opisz scenę tekstem — AnimateDiff, WAN 2.1 lub CogVideoX wygeneruje klip wideo na lokalnym GPU.
- **AI Video Orchestrator:** Opisz film (30–180 sekund) — system automatycznie podzieli na segmenty, przetworzy prompty przez AI i wygeneruje wideo przez webowe serwisy AI (Pixverse, Hailuo, Gemini, Kling, Runway) korzystając z Twoich subskrypcji. Łączy segmenty w spójny film z ffmpeg.
- **Praca w 100% offline:** Wszystkie lokalne modele działają bez zewnętrznych subskrypcji.

---

## 📋 Wszystkie funkcje

### 🎙 Dźwięk

| Moduł | Opis |
|---|---|
| **Lektor** | Multi-segment TTS z edge-tts (szybki, online) lub Chatterbox/XTTS (klonowanie, GPU). Regulacja tempa i tonu per segment. |
| **Prompt AI** | Opisujesz dialog/narrację słowami — Ollama/Qwen3 generuje gotową strukturę segmentów z głosami i parametrami prosodii. |
| **Mój Głos** | Klonowanie głosu z próbki 10–30s: Chatterbox Multilingual (PL), Chatterbox Turbo (EN), XTTS-v2 fallback. |
| **Mikser** | Łączy do 4 ścieżek audio z regulacją głośności per ścieżka i opcją ducking (auto-ściszanie tła przy mowie). |
| **Transkrypcja** | WhisperX STT z diaryzacją (kto kiedy mówił), auto-detekcją języka, eksportem TXT/SRT. |
| **Muzyka AI** | MusicGen (Meta) generuje podkład muzyczny do 300s z opisu słownego po angielsku. |
| **Efekty audio** | Demucs separacja ścieżek (4-stem/2-stem), RVC zmiana głosu, normalizacja loudnorm, pitch shift. |

### 🎬 Wideo

| Moduł | Opis |
|---|---|
| **Audiobook** | EPUB/PDF/TXT → rozdziały MP3 + całość + M4B z markerami. Mastering ACX (−18 LUFS, TP ≤ −3 dBFS). Wielogłosowość (narrator + postacie). |
| **Prezentacja** | PPTX/PDF → MP4 Full HD z narracją lektora. Edycja tekstu per slajd, asynchroniczne kolejkowanie. |
| **Wsadowe** | Wiele plików PPTX/PDF naraz z jednym głosem. Każdy plik dostaje job_id, postęp w JobMonitor. |
| **Avatar** | Animacja ust ze zdjęcia zsynchronizowana z mową (lip-sync). Silniki: EchoMimic (8 GB+) / SadTalker + GFPGAN. |
| **Generator wideo** | Tekst → krótki klip wideo. Silniki: AnimateDiff, WAN 2.1, CogVideoX. |
| **AI Video Orchestrator** | Długie wideo (30–180s) z wielu segmentów AI. Dwuprzebiegowy PromptProcessor (spójność wizualna między segmentami). Serwisy: Pixverse, Hailuo, Gemini, Kling, Runway. Bootstrap sesji przeglądarki wbudowany w UI (noVNC). |
| **Animacja** | Efekt Ken Burns (pan+zoom) na zdjęciu. Lżejsza alternatywa dla generowania wideo — działa na CPU bez GPU. |

### 🎭 Scenariusze

| Moduł | Opis |
|---|---|
| **Studio filmowe** | Wieloscenowy film MP4 z wieloma aktorami. Scenariusz (sceny + dialogi + głosy) → gotowy film. AnimateDiff lub statyczne klatki. |
| **Dialog AI** | Dwie postacie rozmawiają. Ollama generuje scenariusz z podanego tematu, XTTS/Chatterbox syntetyzuje kwestie osobno. |
| **Edytor wideo** | Trim, crop, obrót, zmiana prędkości, podmiana audio, napisy SRT. Podgląd przed eksportem. Silnik: ffmpeg. |

### 🔧 Narzędzia

| Moduł | Opis |
|---|---|
| **Projekty** | Historia wszystkich wygenerowanych plików. Pobieranie zbiorcze ZIP, usuwanie per plik lub wszystkich. |
| **Kolejka** | Status zadań GPU w czasie rzeczywistym. Anulowanie zadań. Night Mode (okno godzinowe renderowania). |
| **Modele AI** | Katalog 22 modeli AI w 5 kategoriach. VRAM wymagania, oceny jakości ★. Auto-konfiguracja do sprzętu. Active/installed status. |
| **Dashboard** | Monitoring GPU/CPU/RAM/dysk w czasie rzeczywistym. Lista zainstalowanych komponentów AI. |
| **QA Checker** | Analiza audio: klipping, cisza, szum tła, prędkość mowy, poziom LUFS. Automatyczna naprawa (normalizacja). |

---

## ✨ Funkcjonalności

### 🎙 Audio & TTS

| Moduł | Silnik | GPU | VRAM |
|---|---|:---:|---|
| Szybki lektor | edge-tts (Microsoft Neural) | ❌ | — |
| Klonowanie głosu EN | Chatterbox Turbo (Resemble AI) | ✅ | 4 GB |
| Klonowanie głosu PL/multi | Chatterbox Multilingual V3 | ✅ | 4 GB |
| Klonowanie głosu (fallback) | XTTS-v2 (Coqui) | ✅ | 4 GB |
| Muzyka AI | MusicGen (Meta) | ✅ | 6 GB |
| Transkrypcja + diaryzacja | WhisperX | ✅ | 3 GB |
| Separacja ścieżek (4-stem/2-stem) | Demucs | opcjonalne | — |
| Zmiana charakteru głosu | RVC (izolowany venv) | opcjonalne | — |
| Mikser audio | ffmpeg | ❌ | — |

### 🎬 Wideo & Prezentacje

| Moduł | Opis |
|---|---|
| Prezentacja → Film | PPTX/PDF + lektor → MP4, kolejkowanie asynchroniczne |
| Wsadowe kolejkowanie | Wiele plików PPTX/PDF naraz, jeden lektor dla wszystkich |
| Generator wideo AI | AnimateDiff, WAN 2.1, CogVideoX-5B (lokalne GPU) |
| AI Video Orchestrator | Długie filmy (30–180s) przez webowe serwisy AI (Pixverse, Hailuo, Gemini, Kling, Runway) — korzysta z Twoich subskrypcji |
| Film fabularny | Skrypt + sceny + głosy aktorów → gotowy film |
| Studio dialogów | Dwóch aktorów, Ollama LLM → scenariusz → XTTS kwestie |
| Edytor wideo | Przycinanie (trim), kadrowanie (crop), obrót, prędkość, podmiana audio, napisy (ffmpeg) |
| Animacja awatara | EchoMimic / SadTalker / LivePortrait / MuseTalk / Wav2Lip — wybór modelu w interfejsie |

### 🤖 Adaptacyjny dobór modeli AI

System automatycznie wykrywa VRAM i dobiera optymalny model dla każdej funkcji. W zakładce **Ustawienia → Modele AI** możesz:

- przeglądać katalog 20+ modeli z wymaganiami sprzętowymi i ocenami jakości
- instalować lepsze modele (np. CogVideoX, F5-TTS, MuseTalk) bez restartowania serwera
- ustawiać aktywny model osobno dla TTS, avatara, wideo, transkrypcji i muzyki
- kliknąć "⚡ Auto-konfiguracja" — system sam dobierze najlepsze modele do twojego GPU

| Profil sprzętu | TTS | Avatar | Wideo | Transkrypcja | Muzyka |
|---|---|---|---|---|---|
| CPU / brak GPU | Edge TTS | Wav2Lip | — | Whisper medium | MusicGen small |
| 4–6 GB VRAM | XTTS-v2 | SadTalker | AnimateDiff | Whisper turbo | MusicGen small |
| 8–10 GB VRAM | XTTS-v2 | SadTalker | AnimateDiff | Whisper turbo | MusicGen medium |
| 12 GB VRAM | XTTS-v2 | EchoMimic | WAN 2.1 | Whisper large-v3 | MusicGen medium |
| 24 GB VRAM | CosyVoice 2 | MuseTalk | CogVideoX-5B | Whisper large-v3 | MusicGen large |

### ⚙️ Narzędzia

| Moduł | Opis |
|---|---|
| JobMonitor | Status wszystkich zadań: kolejka / uruchomione / zakończone |
| QA Checker | Analiza audio: klipping, cisza, szum, prędkość mowy |
| Dashboard | GPU/CPU/RAM/dysk, zainstalowane komponenty |
| Night Mode | Harmonogram renderowania (np. tylko 22:00–7:00) |
| Historia | Lista wygenerowanych plików z podglądem |
| Ustawienia | Ollama host/model, CORS, hasło, czyszczenie cache, **Modele AI** |

---

## 💻 Wymagania sprzętowe

System automatycznie wykrywa możliwości sprzętu i aktywuje odpowiednie funkcje. Poniżej pełny katalog obsługiwanych modeli:

| Funkcja | Model (standard → lepszy → najlepszy) | Min. VRAM |
|---|---|---|
| Lektor szybki | Edge TTS | — (CPU) |
| Klonowanie głosu | XTTS-v2 → F5-TTS → CosyVoice 2 | 4–6 GB |
| Transkrypcja | Whisper medium → turbo → large-v3 | 2–5 GB |
| Muzyka AI | MusicGen small → medium → large | 2–10 GB |
| Wideo AI | AnimateDiff → WAN 2.1 → CogVideoX-5B | 8–24 GB |
| Avatar / lip-sync | Wav2Lip → SadTalker → EchoMimic → MuseTalk | 2–8 GB |
| Separacja ścieżek | Demucs | opcjonalne |
| Zmiana głosu | RVC | opcjonalne |

> Modele oznaczone "→" to wyższe poziomy jakości dostępne po instalacji przez **Ustawienia → Modele AI**. CogVideoX obsługuje CPU offload — działa z 12 GB VRAM przy dłuższym czasie renderowania.

**RAM:** minimum 8 GB, zalecane 16 GB+  
**Dysk:** 20 GB (same modele AI), zalecane 100 GB+  
**OS:** Linux (zalecane), macOS, Windows (WSL2 lub Docker)

---

## 🔧 Instalacja

### Metoda 1 — Docker (najprostsza)

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio
docker compose up -d                                                    # CPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d   # GPU
```

Frontend: `http://localhost:47822` | Backend API: `http://localhost:47821`

### Metoda 2 — Skrypt install.sh (Linux/macOS/WSL2)

```bash
bash install.sh
```

Instaluje zależności, pyta o komponenty GPU, buduje frontend, tworzy `start.sh`.

### Metoda 3 — Wizard install.py (cross-platform)

```bash
python install.py              # interaktywny
python install.py --check      # sprawdź co jest zainstalowane
python install.py --all        # zainstaluj wszystko bez pytania
```

### Metoda 4 — Ręcznie

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio/backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart httpx psutil \
    edge-tts soundfile pydub python-pptx PyMuPDF Pillow aiofiles
# GPU deps (opcjonalne):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install TTS whisperx demucs
# Frontend:
cd ../frontend && npm ci && npm run build
```

---

## ⚙️ Konfiguracja

```bash
cp backend/.env.example backend/.env
```

| Zmienna | Domyślna | Opis |
|---|---|---|
| `VOICE_STUDIO_DATA_DIR` | _(lokalnie)_ | Ścieżka do zewnętrznego dysku na pliki AI i audio |
| `CORS_ORIGINS` | `localhost:47822` | Dozwolone origins (przecinek jako separator) |
| `LOG_LEVEL` | `INFO` | Poziom logowania: DEBUG / INFO / WARNING |

Przykład dla serwera z zewnętrznym dyskiem:

```env
VOICE_STUDIO_DATA_DIR=/mnt/storage
CORS_ORIGINS=http://192.168.0.100:47821,http://localhost:47821
```

---

## ▶️ Uruchomienie

```bash
# Skrypt startowy (tworzony przez install.sh):
bash ~/voice-studio/start.sh

# Ręcznie:
cd backend && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1
```

> `--workers 1` jest wymagane — model XTTS jest ładowany do pamięci GPU i nie jest thread-safe.

```bash
# Serwis systemd:
sudo systemctl start voice-studio
sudo journalctl -u voice-studio -f   # logi na żywo
```

---

## 📡 API Reference

### Health & Hardware

```bash
GET  /api/health           → {"status":"ok","version":"1.1.0"}
GET  /api/hardware         → GPU/CPU/RAM/dysk + capabilities
GET  /api/queue/status     → stan kolejki zadań
```

### TTS — Generowanie mowy

```bash
# edge-tts (szybki, online):
curl -X POST http://localhost:47821/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Witaj!", "voice":"pl-PL-MarekNeural", "speed":1.0}' \
  --output audio.mp3

# XTTS-v2 (klonowanie z próbki):
curl -X POST http://localhost:47821/api/tts/xtts \
  -F "text=Tekst do wypowiedzenia" \
  -F "speaker_wav=@probka.wav" \
  -F "language=pl" --output klonowany.wav
```

Głosy: `GET /api/voices` | Upload próbki: `POST /api/clone-voice` | Usuń: `DELETE /api/cloned-voices/{name}`

### Prezentacje

```bash
# 1. Parsowanie PPTX/PDF → slajdy:
curl -X POST http://localhost:47821/api/presentation/parse -F "file=@prez.pptx"
# → {"session_id":"abc123","slides":[...],"total_slides":12}

# 2. Kolejkowanie renderowania → MP4:
curl -X POST http://localhost:47821/api/presentation/render \
  -F "session_id=abc123" \
  -F 'slides=[{"index":0,"text":"Tekst lektora slajdu 0"}]' \
  -F "voice_key=pl_male_marek"
# → {"job_id":"xyz"}

# 3. Polling statusu:
curl http://localhost:47821/api/jobs/xyz
# → {"status":"completed","progress":100,"url":"/api/audio/prez-xyz.mp4"}
```

### Pozostałe endpointy

```bash
POST /api/transcribe          # WhisperX: file, language, diarize=true/false
POST /api/music/generate      # MusicGen: {"prompt":"...","duration":30}
POST /api/audio/demucs        # Demucs: file, stems=4|2
POST /api/audio/rvc           # RVC: file, model, semitone_shift
POST /api/audio/mix           # Mikser audio
POST /api/audiobook/generate  # Audiobook z EPUB/tekstu
POST /api/generate-video      # Generator wideo AI
POST /api/render-dialogue     # Dialog dwóch aktorów
GET  /api/files               # Lista wygenerowanych plików
DELETE /api/files/{filepath}  # Usuń plik
POST /api/cache/clear         # Wyczyść /tmp/*
POST /api/auth/set-password   # Ustaw hasło (bcrypt)
```

---

## 🔄 Kolejka zadań

Endpointy przyjmują request i natychmiast zwracają `job_id`. Zadania są przetwarzane jedno po drugim (single GPU worker).

```
queued → running → completed
                 ↘ failed
```

Frontend polluje `GET /api/jobs/{job_id}` co 2.5 sekundy. Można anulować zadanie: `DELETE /api/queue/{job_id}`.

Zadania wygasają automatycznie po 2 godzinach (TTL cleanup).

---

## 📂 Prezentacje i tryb wsadowy

**Pojedyncza prezentacja:** Wideo → Prezentacja → wgraj PPTX/PDF → edytuj teksty lektora → wybierz głos → Generuj.

**Tryb wsadowy:** Wideo → Wsadowe → przeciągnij wiele plików naraz → wybierz wspólny głos → "Dodaj N do kolejki". Każdy plik dostaje własny `job_id`. Postęp w JobMonitor.

---

## 🌙 Night Mode

System przyjmuje zadania przez całą dobę, ale wykonuje je tylko w ustawionym oknie czasowym. Konfiguracja: Ustawienia → Night Mode.

**Przykład:** Dodaj 10 prezentacji wieczorem, ustaw okno 22:00–7:00 — renderuje przez noc, rano wszystko gotowe.

---

## 🔐 Bezpieczeństwo

- **Hasło:** `POST /api/auth/set-password` zapisuje hash bcrypt. Bez hasła — dostęp otwarty.
- **Rate limiting:** 200 req/min per IP (slowapi gdy zainstalowany, fallback sliding window).
- **Path traversal:** Pliki audio serwowane wyłącznie z `AUDIO_DIR` (walidacja `.relative_to()`).
- **RVC injection:** Ścieżki do modeli przekazywane przez JSON config (nie interpolacja stringów).
- **CORS:** Konfigurowalny przez `.env` — domyślnie tylko localhost.

---

## 🧪 Modele TTS — wyniki testów

Celem było klonowanie głosu do narracji prezentacji po polsku i angielsku, bez halucynacji i artefaktów.

### Modele wdrożone i przetestowane w produkcji

| Model | Język | Klonowanie | Halucynacje | Jakość | Status |
|---|---|:---:|:---:|:---:|---|
| **Chatterbox Turbo** | EN | ✅ | ❌ brak | ⭐⭐⭐⭐⭐ | ✅ aktywny (EN) |
| **Chatterbox Multilingual V3** | PL / multi | ✅ | ❌ brak | ⭐⭐⭐⭐ | ✅ aktywny (PL) |
| XTTS-v2 (Coqui) | PL / 17 lang | ✅ | ⚠️ CJK tokeny | ⭐⭐⭐ | ⚠️ fallback |
| edge-tts (Microsoft Neural) | PL / EN / multi | ❌ | ❌ brak | ⭐⭐⭐⭐ | ✅ gotowe głosy |

**XTTS-v2** — pierwotny silnik, wykryte problemy:
- Artefakty CJK na początku każdego klipu (tokeny kondycjonowania języka). Obejście: warmup `"Hm. "` + trim 450 ms.
- Halucynacje przy `temperature=0.3` (zapętlanie). Optimum: `temperature=0.55, repetition_penalty=3.0, top_k=40, top_p=0.75`.

**Chatterbox** — wybrany jako zamiennik:
- Wymaga oddzielnego venv `.chatterbox-venv` (`torch==2.6` konfliktuje z `torch==2.8+cu128` w głównym venv). Komunikacja JSON-line pipe.
- `resemble-perth` native extension często niedostępna — wymagany patch: `perth.PerthImplicitWatermarker = perth.DummyWatermarker`.
- Teksty >200 znaków przekraczają limit ~1000 kroków generacji — rozwiązanie: podział na chunki na granicach zdań.
- `exaggeration=0.4` — balans między wiernością próbce a naturalną ekspresją (0.25 = zbyt płaski, 0.5 = za odległy od głosu).

---

### Modele badane, nieprzetestowane lokalnie

Poniższe modele były analizowane podczas wyboru silnika TTS. Testy opierały się na dostępnej dokumentacji, benchmarkach i raportach społeczności — nie na lokalnej instalacji.

| Model | PL | Klonowanie | Główny powód odrzucenia |
|---|:---:|:---:|---|
| **CosyVoice 2** (Alibaba) | ✅ | ✅ | Najlepsza jakość spośród odrzuconych, ale wymaga całego ekosystemu (FunASR + inne) — zbyt złożony do utrzymania lokalnie |
| **F5-TTS / E2-TTS** | ✅ | ✅ | Szybki, ale halucynacje tekstowe przy długich skryptach (pomijanie / powtarzanie słów) — krytyczny problem produkcyjny |
| **OpenVoice v2** | ✅ | ✅ | Klonowanie działa, ale barwa głosu w PL brzmi syntetycznie; gorsza jakość niż Chatterbox |
| **Fish Speech** | ✅ | ✅ | Architektura LLM-based — na RTX 3060 generowanie 60s audio zajmuje 2–4 min |
| **MetaVoice-1B** | ✅ | ✅ | Wysokie VRAM + niestabilne fonemy w PL; przy 12 GB mało miejsca na pozostałe procesy |
| **StyleTTS2** | ograniczona | ✅ | Zero-shot bez fine-tuningu daje przeciętną jakość; brak natywnego PL |
| **Tortoise TTS** | ograniczona | ✅ | Autoregresja: 5–10 min na minutę audio — całkowicie nieużywalny real-time |
| **Kokoro TTS** | ✅ | ❌ | Brak zero-shot — tylko predefiniowane głosy; dyskwalifikuje personalizację |
| **Piper TTS** | ✅ | ❌ | Zaprojektowany pod urządzenia edge (Raspberry Pi); jakość niewystarczająca do nagrań wideo |

---

### Konfiguracja produkcyjna (aktywna)

```
Angielski głos klonowany  → Chatterbox Turbo        (exaggeration=0.4)
Polski głos klonowany     → Chatterbox Multilingual   (exaggeration=0.4)
Głos gotowy (bez próbki)  → edge-tts Microsoft Neural
Fallback (brak venv)      → XTTS-v2 z warmup+trim
```

---

## 🔍 Rozwiązywanie problemów

**XTTS generuje chińskie artefakty na początku klipu**  
Backend automatycznie przycina pierwsze 250ms i sanityzuje tekst (usuwa znaki CJK). Jeśli problem wraca — użyj prostszych zdań bez em-dashy i nawiasów kwadratowych.

**"No module named 'pptx'" przy wgrywaniu prezentacji**  
```bash
source ~/voice-studio/backend/.venv/bin/activate
pip install python-pptx PyMuPDF
sudo systemctl restart voice-studio
```

**Drugi job prezentacji znika z kolejki**  
Naprawione w v1.1.0. Wyczyść cache przeglądarki (Ctrl+Shift+R) i zaktualizuj aplikację.

**Ollama offline / błąd generowania dialogu**  
```bash
curl http://localhost:47821/api/ollama/status?host=http://localhost:11434
# → {"online":true,"models":["llama3.1:8b"]}
ollama serve          # jeśli offline
ollama pull llama3.1:8b   # jeśli brak modelu
```

**Frontend pokazuje stary interfejs**  
Ctrl+Shift+R (hard refresh). Aplikacja produkcyjna działa na porcie 47821 — jeśli masz dev server Vite (47822), zatrzymaj go.  
Jeśli używasz serwisu systemd i robiłeś `git pull` bez przebudowania frontendu: `sudo systemctl restart voice-studio` — serwis automatycznie rebuiluje frontend przed startem (od v1.5.1).

**Model pokazuje "AKTYWNY · BRAK WAG"**  
Model jest ustawiony jako aktywny w `model_config.json`, ale wagi nie zostały pobrane. Możliwe przyczyny: wagi nigdy nie zostały pobrane (model tylko skonfigurowany), lub `model_config.json` zawiera przestarzały wpis. Kliknij **⚡ Auto-konfiguracja** w Ustawienia → Modele AI — system przestawi aktywne modele na te z faktycznie pobranymi wagami.

**Żaden model wideo nie jest zainstalowany**  
AnimateDiff i WAN 2.1 wymagają osobnego pobrania wag (gigabajty). Sam `pip install diffusers` nie wystarcza — wagi pobierane są przy pierwszym użyciu przez HuggingFace Hub, lub można je pobrać z wyprzedzeniem. Dla RTX 3060 (12 GB) zalecany model to WAN 2.1 (1.3B) — około 3 GB pobierania.

**MusicStudio od razu pokazuje "zainstaluj audiocraft"**  
`audiocraft` (Meta MusicGen) nie jest zainstalowane:
```bash
source ~/voice-studio/backend/.venv/bin/activate
pip install audiocraft
sudo systemctl restart voice-studio
```

---

## 🆕 Co nowego

### v1.6.0 — 2026-07

**AI Video Orchestrator — generowanie długich filmów przez webowe serwisy AI:**
- Nowa zakładka **Video AI** — wizard 4-krokowy: prompt → parametry → podgląd planu → generowanie
- **Dwuprzebiegowy PromptProcessor** (DirectorPass + StoryboardPass przez lokalne LLM): jeden prompt użytkownika → plan z `anchor` (styl, paleta barw, nastrój, kamera) + N segmentów ze spójnymi opisami i frame chainingiem (koniec segmentu N = początek segmentu N+1)
- **5 webowych serwisów** obsługiwanych przez Playwright: Pixverse (8s/seg, Google SSO), Hailuo/MiniMax (6s/seg, top quality), Gemini Veo (8s/seg), Kling AI (10s/seg, 66 kr/dzień gratis), Runway ML (10s/seg)
- **Bootstrap sesji wbudowany w UI** — kliknij "Zaloguj" przy serwisie → otwiera się przeglądarka w oknie iframe (noVNC) → logujesz się raz → sesja zapisana automatycznie. Nie wymaga VNC ani SSH.
- **Automatyczny failover**: jeśli jeden serwis zawiedzie, orkiestrator przechodzi do następnego w kolejce
- **FFmpeg pipeline**: normalizacja segmentów (1920×1080, 30fps) → konkatenacja (hard-cut lub crossfade) → mux audio
- **Segmentowanie**: 15–180 sekund, automatyczny podział na segmenty dopasowane do max czasu wybranego serwisu
- **Driver `local_ffmpeg`**: zawsze aktywny placeholder bez logowania — przydatny do testowania całego pipeline
- Orkiestrator z checkpointingiem — bezpieczny restart usługi w trakcie generowania

### v1.5.1 — 2026-06

**Poprawki wykrywania modeli i UX:**
- Wykrywanie instalacji modeli opiera się teraz na faktycznej obecności wag w `~/.cache/huggingface/hub/` (nie samego pakietu pip). AnimateDiff, WAN 2.1, CogVideoX, Mochi 1 nie pokazują się jako "zainstalowane" gdy mają tylko bibliotekę `diffusers` bez pobranych wag; podobnie Whisper medium/turbo nie są wykrywane tylko dlatego że istnieje pakiet `whisper`
- Karta modelu w **Ustawienia → Modele AI** pokazuje badge **"AKTYWNY · BRAK WAG"** (pomarańczowy) gdy model jest aktywny w konfiguracji, ale wagi nie są pobrane — zamiast mylącego zielonego "AKTYWNY" + przycisku "Zainstaluj"
- **Auto-konfiguracja** dobiera wyłącznie modele z pobranymi wagami; jeśli preferowany model nie jest dostępny, wybiera najlepszy zainstalowany fallback w danej kategorii
- **VideoStudio** czyta dostępność silników z `/api/models` przy starcie — silniki bez pobranych wag są poprawnie oznaczone `⚠️ nie zainstalowany`; baner informuje gdy żaden lokalny model wideo nie jest gotowy
- **MusicStudio** sprawdza instalację audiocraft przy otwarciu zakładki (nie dopiero po kliknięciu Generuj) — od razu pokazuje instrukcję `pip install audiocraft` jeśli brak
- Serwis systemd (`voice-studio.service`) automatycznie buduje frontend (`ExecStartPre: npm run build`) przy każdym restarcie — `git pull` + `systemctl restart` wystarczy do pełnego wdrożenia bez osobnego kroku budowania
- Zmienna środowiskowa `VOICE_STUDIO_DATA_DIR` w serwisie wskazuje katalog `model_config.json` — eliminuje błąd symlinku gdzie plik lądował w złym miejscu przy uruchomieniu przez systemd

### v1.5.0 — 2026-06

**Adaptacyjny system modeli AI — wybór i instalacja lepszych modeli:**
- Nowa zakładka **Ustawienia → Modele AI** z katalogiem 20+ modeli w 5 kategoriach (TTS, Avatar, Wideo, Transkrypcja, Muzyka)
- Każdy model pokazuje wymagania VRAM, ocenę jakości (★) i szybkości (⚡), status instalacji i kompatybilność ze sprzętem
- Przycisk "⚡ Auto-konfiguracja" — system wykrywa VRAM i automatycznie dobiera najlepszy model dla każdej kategorii
- Selektor modelu bezpośrednio w zakładkach **AvatarStudio** i **VideoStudio** — zmiana bez wchodzenia do ustawień
- Nowe modele w katalogu: **F5-TTS**, **CosyVoice 2**, **LivePortrait**, **MuseTalk**, **CogVideoX-5B**, **Mochi 1**, **Stable Audio Open**, **Parakeet TDT** (NVIDIA), **MusicGen medium/large**
- Konfiguracja aktywnych modeli zapisywana w `model_config.json` — przeżywa restart serwera
- Backend endpoint `GET /api/models` zwraca pełną listę z flagami `installed`, `active`, `fits_hardware`, `recommended`

### v1.4.0 — 2026-06

**Avatar — naprawiony, realistyczny lip-sync (krytyczny fix):**
- Funkcja generowała wyłącznie statyczny obrazek z efektem zoom — LivePortrait, na którym opierał się kod, nigdy nie był zainstalowany na serwerze
- Zastąpiono działającym silnikiem **SadTalker** — realna synchronizacja ruchu ust z wygenerowanym audio (nie z losowym wideo wzorcowym)
- Dodano **GFPGAN** (face restoration) — znacząco redukuje "uncanny valley", twarz wygląda ostro i naturalnie
- Naprawiony krytyczny bug: SadTalker zapisywał wideo kodekiem `mpeg4`, który nie odtwarza się w przeglądarkach (czarny ekran) — dodano transkodowanie do `h264`
- Timeout 15 min na pojedynczy klip, automatyczny fallback do animacji statycznej przy błędzie

**Prezentacja → Film — wyższa jakość obrazu slajdów:**
- PDF/PPTX renderowane teraz w ~180 DPI (wcześniej ~108 DPI) — tekst na slajdach wyraźny, nie rozmazany
- Rozdzielczość wyjściowa wideo zwiększona z 1280×720 do 1920×1080 (Full HD)
- Wyższa jakość kodowania x264 (CRF 16 zamiast domyślnego 23) + skalowanie Lanczos

**Edytor wideo — nowe opcje:**
- **Kadrowanie (crop)** — przycinanie marginesów góra/dół/lewo/prawo w pikselach, z podglądem na żywo na wideo (przydatne np. do wycięcia napisów lub znaków wodnych)
- **Obrót** — 90° / 180° / 270°
- **Zmiana prędkości** — 0.5× do 2× (audio i wideo zostają zsynchronizowane)

### v1.3.0 — 2026-06

**Wsparcie wielojęzyczne (i18n):**
- Pełna lokalizacja interfejsu: polski (domyślny), angielski, niemiecki, hiszpański
- Przełącznik języka w nagłówku aplikacji, wybór zapisywany w `localStorage` (zachowany między sesjami)
- Wszystkie moduły (Prezentacje, Audiobook, Wideo, Animacja, Avatar, Edytor wideo, QA Checker i inne) w pełni przetłumaczone

**Naprawione błędy (audit 2026-06-15):**
- Wersja API: `/api/health` zwracała `1.1.0` zamiast `2.0.0` — naprawiono
- QA check/fix dla plików audiobooków (podkatalogi, np. `/api/audio/ksiazka/rozdzial.mp3`) — `_url_to_path` obcinał nazwę katalogu (`Path.name`), teraz używa `_safe_audio_path` z pełną weryfikacją path traversal
- Frontend `HistoryTab`: puste `catch {}` w `fetchFiles`, `deleteFile`, `deleteAll` — dodano `console.warn` i sprawdzanie statusu HTTP; błędy sieciowe nie są już połykane w ciszy
- Testy E2E Playwright: dodano `tests/e2e.spec.js` (10 testów) + `playwright.config.js` — wszystkie testy zielone

**Historia nagrań — pobieranie zbiorcze:**
- Zaznacz dowolne pliki/foldery checkboxami → "Pobierz zaznaczone" → ZIP z całą selekcją
- Naprawiony błąd pobierania: element `<a>` teraz dołączany do DOM przed kliknięciem, revoke URL z 2s opóźnieniem (część przeglądarek anulowała pobieranie natychmiast)
- Widoczny komunikat błędu gdy ZIP się nie powiedzie (wcześniej puste `catch {}` połykało błędy)
- Pliki prezentacji mają teraz nazwę wejściowego pliku zamiast UUID (`moja-prezentacja-a1b2c3.mp4`)

**Prompt AI — generowanie dialogu z tekstu naturalnego:**
- Nowa zakładka "Prompt AI": wpisz opis dialogu, model AI (Ollama lokalnie) generuje gotową strukturę segmentów z przypisanymi głosami i parametrami
- Obsługa modeli myślących (Qwen3): ekstrakcja JSON z osobnego pola `thinking` gdy `content` jest pusty (Ollama oddziela tok myślenia od odpowiedzi)
- Naprawa JSON: regex koryguje niepoprawne wartości liczbowe (`+1`, `-3` → `"+1"`, `"-3"`) i brakujące dwukropki w kluczach
- Automatyczna próba obu pól odpowiedzi (`content` i `thinking`) i usuwanie bloków `<think>...</think>`

### v1.2.0 — 2026-06

**Chatterbox TTS — nowy główny silnik klonowania głosu:**
- Chatterbox Turbo dla angielskiego + Chatterbox Multilingual V3 dla polskiego i innych języków
- Brak artefaktów CJK i halucynacji — problem który dotykał XTTS-v2
- Oddzielny venv `.chatterbox-venv` z automatyczną instalacją (install.sh + install.py)
- Automatyczny fallback do XTTS gdy Chatterbox niedostępny
- Parametr `exaggeration=0.4` — balans między dokładnością klonu a ekspresją głosu
- Podział długich tekstów na chunki na granicy zdań — zapobiega ucięciom przy >200 znaków

**Historia nagrań:**
- Przycisk "Usuń wszystkie" — usuwa wszystkie wygenerowane pliki jednym kliknięciem
- Zaznaczanie masowe (checkboxy) — usuń wybrane nagrania

**Kolejka prezentacji:**
- Status "Slajd 5/13" — informacja o postępie przetwarzania
- Realistyczna estymacja czasu (ETA) na podstawie czasu per slajd

**Naprawione błędy:**
- Ucięcie dźwięku na końcu slajdu — `apad` + `-shortest` nie działały razem z `-loop 1`; naprawione przez explicite `-t duration` na wejściu obrazu
- Dzielenie tekstu w połowie słowa — fallback na podział po znakach zastąpiony podziałem na granicy słów

### v1.1.0 — 2026-06

**Nowe funkcje:**
- WAN 2.1 — generowanie wideo z tekstu (12 GB VRAM), kontrola jakości fast/standard/high
- LivePortrait — animacja twarzy ze zdjęcia, fallback ken-burns (ffmpeg)
- Demucs 4-stem i 2-stem — separacja ścieżek z odtwarzaczem audio dla każdej
- RVC w izolowanym venv `/opt/rvc-venv` (Python 3.11 + numpy<2, omija konflikt ABI z whisperx)
- Wsadowe kolejkowanie prezentacji (PresentationBatchQueue)
- Install wizard: `install.sh` (Linux/macOS/WSL) + `install.py` (cross-platform)
- Docker: uproszczony `docker-compose.yml` + `docker-compose.gpu.yml` jako override

**Naprawione błędy:**
- Dysk w `/api/hardware` pokazywał root fs zamiast właściwego dysku danych
- `video_generation` i `music_generation` fałszywie false gdy XTTS załadowany
- Race condition w kolejce zadań (asyncio.Lock + global fix)
- RVC: mismatch nazwy parametru form (`model` vs `voice_model`)
- Zadania wygasają po 2h (TTLDict — brak memory leak)

---

## 🧪 Testy E2E

Projekt zawiera testy Playwright pokrywające główne ścieżki użytkownika.

```bash
npx playwright test           # wszystkie testy
npx playwright test --ui      # tryb interaktywny
npx playwright show-report    # raport HTML
```

---

## 🙏 Użyte projekty open source

| Projekt | Licencja |
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

MIT License — szczegóły w pliku `LICENSE`.
