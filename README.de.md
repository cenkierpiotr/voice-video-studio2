# 🎙 Voice & Video Studio AI

🌐 **Język / Language:** [🇵🇱 Polski](README.md) | [🇬🇧 English](README.en.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md)

![Python](https://img.shields.io/badge/Python-3.11%2F3.12-blue?logo=python&logoColor=white)


![Docker](https://img.shields.io/badge/Docker-CPU%2FGPU-2496ED?logo=docker&logoColor=white)
![GPU](https://img.shields.io/badge/GPU-NVIDIA%20CUDA-76B900?logo=nvidia&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Ein lokales KI-Studio zum Erstellen und Bearbeiten von Audio/Video — kombiniert Chatterbox TTS, Coqui XTTS, WhisperX, MusicGen, Demucs, RVC, AnimateDiff, WAN 2.1 und mehr in einer Oberfläche. Läuft zu 100 % auf Ihrer eigenen Hardware, ohne externe Abonnements.

---

## 📋 Inhaltsverzeichnis

- [In 5 Minuten starten](#-in-5-minuten-starten)
- [Was können Sie damit tun?](#-was-können-sie-damit-tun)
- [Funktionen](#-funktionen)
- [Hardware-Anforderungen](#-hardware-anforderungen)
- [Installation](#-installation)
- [Konfiguration](#-konfiguration)
- [Ausführen](#-ausführen)
- [API-Referenz](#-api-referenz)
- [Aufgabenwarteschlange](#-aufgabenwarteschlange)
- [Präsentationen & Batch-Modus](#-präsentationen--batch-modus)
- [Night Mode](#-night-mode)
- [Sicherheit](#-sicherheit)
- [TTS-Modelle — Testergebnisse](#-tts-modelle--testergebnisse)
- [Fehlerbehebung](#-fehlerbehebung)
- [Was ist neu](#-was-ist-neu)
- [E2E-Tests](#-e2e-tests)
- [Verwendete Open-Source-Projekte](#-verwendete-open-source-projekte)

---

## 🚀 In 5 Minuten starten

### 🐳 Docker — funktioniert sofort, ohne Abhängigkeiten zu installieren

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio

# CPU (TTS, Transkription, Präsentationen):
docker compose up -d

# GPU — NVIDIA (alle Funktionen, erfordert nvidia-container-toolkit):
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

Öffnen: **http://localhost:47822**

> Anforderungen: Docker 24+, Docker Compose v2. Unter Windows — Docker Desktop mit WSL2-Backend.

---

### 🐧 Linux / macOS / WSL2 — Installationsskript

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
bash voice-studio/install.sh
```

Das Skript erkennt das Betriebssystem, installiert Python 3.11 + Node 20 + ffmpeg, fragt nach optionalen Komponenten (XTTS, WhisperX, MusicGen...) und erstellt das Frontend. Am Ende startet es den Server.

Nach der Installation: **http://localhost:47821**

---

## 🌟 Was können Sie damit tun?

- **Präsentation → Video:** Laden Sie eine PPTX- oder PDF-Datei hoch, bearbeiten Sie den Sprechertext für jede Folie, wählen Sie eine Stimme und klicken Sie auf „Rendern“. Nach wenigen Minuten haben Sie ein fertiges MP4.
- **Stimmenklonen:** Laden Sie eine 10-sekündige WAV-Probe hoch — XTTS-v2 spricht mit dieser Stimme in 17 Sprachen.
- **Transkription mit Diarisierung:** WhisperX erkennt Sprecher und erstellt Text mit Zeitstempeln („wer hat wann gesprochen“).
- **KI-Musik:** Beschreiben Sie die Stimmung in Worten — MusicGen erzeugt in wenigen Minuten einen Musiktrack.
- **Stem-Trennung:** Demucs isoliert Stimme, Schlagzeug, Bass und Instrumente aus einer vorhandenen Aufnahme.
- **Hörbuch:** Laden Sie ein EPUB oder TXT hoch — das System teilt es in Kapitel auf und vertont es.

---

## ✨ Funktionen

### 🎙 Audio & TTS

| Modul | Engine | GPU | VRAM |
|---|---|:---:|---|
| Schneller Sprecher | edge-tts (Microsoft Neural) | ❌ | — |
| Stimmenklon EN | Chatterbox Turbo (Resemble AI) | ✅ | 4 GB |
| Stimmenklon PL/multi | Chatterbox Multilingual V3 | ✅ | 4 GB |
| Stimmenklon (Fallback) | XTTS-v2 (Coqui) | ✅ | 4 GB |
| KI-Musik | MusicGen (Meta) | ✅ | 6 GB |
| Transkription + Diarisierung | WhisperX | ✅ | 3 GB |
| Stem-Trennung (4-Stem/2-Stem) | Demucs | optional | — |
| Stimmcharakter ändern | RVC (isolierte venv) | optional | — |
| Audio-Mixer | ffmpeg | ❌ | — |

### 🎬 Video & Präsentationen

| Modul | Beschreibung |
|---|---|
| Präsentation → Video | PPTX/PDF + Sprecher → MP4, asynchrone Warteschlange |
| Stapelverarbeitung | Mehrere PPTX/PDF-Dateien gleichzeitig, eine gemeinsame Sprecherstimme |
| KI-Video-Generator | AnimateDiff (lokal, 6 GB), WAN 2.1 (12 GB), Runway (API) |
| Spielfilm | Skript + Szenen + Schauspielerstimmen → fertiger Film |
| Dialog-Studio | Zwei Schauspieler, Ollama LLM → Skript → XTTS-Zeilen |
| Video-Editor | Schneiden (Trim), Zuschneiden (Crop), Drehen, Geschwindigkeit, Audio-Ersatz, Untertitel (ffmpeg) |
| Avatar-Animation | SadTalker + GFPGAN — echte Lippensynchronisation aus Audio und Gesichtsverbesserung, Ken-Burns-Fallback |

### ⚙️ Werkzeuge

| Modul | Beschreibung |
|---|---|
| JobMonitor | Status aller Aufgaben: in Warteschlange / läuft / abgeschlossen |
| QA Checker | Audioanalyse: Clipping, Stille, Rauschen, Sprechgeschwindigkeit |
| Dashboard | GPU/CPU/RAM/Festplatte, installierte Komponenten |
| Night Mode | Render-Zeitplan (z. B. nur 22:00–7:00 Uhr) |
| Verlauf | Liste der generierten Dateien mit Vorschau |
| Einstellungen | Ollama-Host/Modell, CORS, Passwort, Cache leeren |

---

## 💻 Hardware-Anforderungen

| Funktion | Min. VRAM | Hinweise |
|---|---|---|
| edge-tts (Sprecher) | — | Funktioniert ohne GPU, erfordert Internet |
| XTTS-v2 (Klonen) | 4 GB | GPU erforderlich |
| WhisperX (Transkription) | 3 GB | GPU erforderlich |
| MusicGen (Musik) | 6 GB | GPU erforderlich |
| AnimateDiff (Video) | 8 GB | GPU erforderlich |
| WAN 2.1 (HD-Video) | 12 GB | GPU erforderlich |
| Demucs, RVC | — | GPU optional (auf CPU langsamer) |

**RAM:** mindestens 8 GB, empfohlen 16 GB+
**Festplatte:** 20 GB (nur KI-Modelle), empfohlen 100 GB+
**Betriebssystem:** Linux (empfohlen), macOS, Windows (WSL2 oder Docker)

---

## 🔧 Installation

### Methode 1 — Docker (am einfachsten)

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio
docker compose up -d                                                    # CPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d   # GPU
```

Frontend: `http://localhost:47822` | Backend-API: `http://localhost:47821`

### Methode 2 — Skript install.sh (Linux/macOS/WSL2)

```bash
bash install.sh
```

Installiert Abhängigkeiten, fragt nach GPU-Komponenten, erstellt das Frontend, erzeugt `start.sh`.

### Methode 3 — Assistent install.py (plattformübergreifend)

```bash
python install.py              # interaktiv
python install.py --check      # prüfen, was installiert ist
python install.py --all        # alles ohne Nachfrage installieren
```

### Methode 4 — Manuell

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio/backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart httpx psutil \
    edge-tts soundfile pydub python-pptx PyMuPDF Pillow aiofiles
# GPU-Abhängigkeiten (optional):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install TTS whisperx demucs
# Frontend:
cd ../frontend && npm ci && npm run build
```

---

## ⚙️ Konfiguration

```bash
cp backend/.env.example backend/.env
```

| Variable | Standard | Beschreibung |
|---|---|---|
| `VOICE_STUDIO_DATA_DIR` | _(lokal)_ | Pfad zu einer externen Festplatte für KI- und Audiodateien |
| `CORS_ORIGINS` | `localhost:47822` | Erlaubte Origins (durch Komma getrennt) |
| `LOG_LEVEL` | `INFO` | Protokollstufe: DEBUG / INFO / WARNING |

Beispiel für einen Server mit externer Festplatte:

```env
VOICE_STUDIO_DATA_DIR=/mnt/storage
CORS_ORIGINS=http://192.168.0.100:47821,http://localhost:47821
```

---

## ▶️ Ausführen

```bash
# Startskript (von install.sh erstellt):
bash ~/voice-studio/start.sh

# Manuell:
cd backend && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1
```

> `--workers 1` ist erforderlich — das XTTS-Modell wird in den GPU-Speicher geladen und ist nicht thread-sicher.

```bash
# systemd-Dienst:
sudo systemctl start voice-studio
sudo journalctl -u voice-studio -f   # Live-Protokolle
```

---

## 📡 API-Referenz

### Health & Hardware

```bash
GET  /api/health           → {"status":"ok","version":"1.1.0"}
GET  /api/hardware         → GPU/CPU/RAM/Festplatte + Funktionen
GET  /api/queue/status     → Status der Aufgabenwarteschlange
```

### TTS — Sprachgenerierung

```bash
# edge-tts (schnell, online):
curl -X POST http://localhost:47821/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hallo!", "voice":"pl-PL-MarekNeural", "speed":1.0}' \
  --output audio.mp3

# XTTS-v2 (Klonen aus einer Probe):
curl -X POST http://localhost:47821/api/tts/xtts \
  -F "text=Zu sprechender Text" \
  -F "speaker_wav=@probe.wav" \
  -F "language=pl" --output geklont.wav
```

Stimmen: `GET /api/voices` | Probe hochladen: `POST /api/clone-voice` | Löschen: `DELETE /api/cloned-voices/{name}`

### Präsentationen

```bash
# 1. PPTX/PDF analysieren → Folien:
curl -X POST http://localhost:47821/api/presentation/parse -F "file=@praes.pptx"
# → {"session_id":"abc123","slides":[...],"total_slides":12}

# 2. Rendering einreihen → MP4:
curl -X POST http://localhost:47821/api/presentation/render \
  -F "session_id=abc123" \
  -F 'slides=[{"index":0,"text":"Sprechertext für Folie 0"}]' \
  -F "voice_key=pl_male_marek"
# → {"job_id":"xyz"}

# 3. Status abfragen:
curl http://localhost:47821/api/jobs/xyz
# → {"status":"completed","progress":100,"url":"/api/audio/praes-xyz.mp4"}
```

### Weitere Endpunkte

```bash
POST /api/transcribe          # WhisperX: file, language, diarize=true/false
POST /api/music/generate      # MusicGen: {"prompt":"...","duration":30}
POST /api/audio/demucs        # Demucs: file, stems=4|2
POST /api/audio/rvc           # RVC: file, model, semitone_shift
POST /api/audio/mix           # Audio-Mixer
POST /api/audiobook/generate  # Hörbuch aus EPUB/Text
POST /api/generate-video      # KI-Video-Generator
POST /api/render-dialogue     # Dialog mit zwei Schauspielern
GET  /api/files               # Liste der generierten Dateien
DELETE /api/files/{filepath}  # Datei löschen
POST /api/cache/clear         # /tmp/* leeren
POST /api/auth/set-password   # Passwort festlegen (bcrypt)
```

---

## 🔄 Aufgabenwarteschlange

Endpunkte nehmen eine Anfrage an und geben sofort eine `job_id` zurück. Aufgaben werden nacheinander verarbeitet (ein einzelner GPU-Worker).

```
queued → running → completed
                 ↘ failed
```

Das Frontend fragt `GET /api/jobs/{job_id}` alle 2,5 Sekunden ab. Eine Aufgabe kann mit `DELETE /api/queue/{job_id}` abgebrochen werden.

Aufgaben laufen automatisch nach 2 Stunden ab (TTL-Bereinigung).

---

## 📂 Präsentationen & Batch-Modus

**Einzelne Präsentation:** Video → Präsentation → PPTX/PDF hochladen → Sprechertexte bearbeiten → Stimme wählen → Generieren.

**Batch-Modus:** Video → Stapel → mehrere Dateien gleichzeitig hineinziehen → gemeinsame Stimme wählen → „N zur Warteschlange hinzufügen“. Jede Datei erhält ihre eigene `job_id`. Fortschritt im JobMonitor.

---

## 🌙 Night Mode

Das System nimmt rund um die Uhr Aufgaben an, führt sie aber nur im konfigurierten Zeitfenster aus. Konfiguration: Einstellungen → Night Mode.

**Beispiel:** Fügen Sie abends 10 Präsentationen hinzu, stellen Sie das Fenster auf 22:00–7:00 Uhr — es wird über Nacht gerendert, morgens ist alles fertig.

---

## 🔐 Sicherheit

- **Passwort:** `POST /api/auth/set-password` speichert einen bcrypt-Hash. Ohne Passwort — offener Zugriff.
- **Rate Limiting:** 200 Anfragen/Min pro IP (slowapi, falls installiert, sonst Sliding-Window-Fallback).
- **Path Traversal:** Audiodateien werden ausschließlich aus `AUDIO_DIR` bereitgestellt (`.relative_to()`-Validierung).
- **RVC-Injection:** Modellpfade werden über eine JSON-Konfiguration übergeben (keine String-Interpolation).
- **CORS:** Konfigurierbar über `.env` — standardmäßig nur localhost.

---

## 🧪 TTS-Modelle — Testergebnisse

Tests durchgeführt auf einer NVIDIA Ziel war das Klonen von Stimmen für die Präsentationsvertonung auf Polnisch und Englisch, ohne Halluzinationen und Artefakte.

### In der Produktion eingesetzte und getestete Modelle

| Modell | Sprache | Klonen | Halluzinationen | Qualität | Status |
|---|---|:---:|:---:|:---:|---|
| **Chatterbox Turbo** | EN | ✅ | ❌ keine | ⭐⭐⭐⭐⭐ | ✅ aktiv (EN) |
| **Chatterbox Multilingual V3** | PL / multi | ✅ | ❌ keine | ⭐⭐⭐⭐ | ✅ aktiv (PL) |
| XTTS-v2 (Coqui) | PL / 17 Sprachen | ✅ | ⚠️ CJK-Token | ⭐⭐⭐ | ⚠️ Fallback |
| edge-tts (Microsoft Neural) | PL / EN / multi | ❌ | ❌ keine | ⭐⭐⭐⭐ | ✅ fertige Stimmen |

**XTTS-v2** — die ursprüngliche Engine, festgestellte Probleme:
- CJK-Artefakte am Anfang jedes Clips (Sprachkonditionierungs-Token). Workaround: Warmup „Hm. “ + 450 ms Trim.
- Halluzinationen bei `temperature=0.3` (Endlosschleifen). Optimum: `temperature=0.55, repetition_penalty=3.0, top_k=40, top_p=0.75`.

**Chatterbox** — als Ersatz gewählt:
- Erfordert eine separate venv `.chatterbox-venv` (`torch==2.6` kollidiert mit `torch==2.8+cu128` in der Haupt-venv). Kommunikation über JSON-Line-Pipe.
- Die native Erweiterung `resemble-perth` ist oft nicht verfügbar — erforderlicher Patch: `perth.PerthImplicitWatermarker = perth.DummyWatermarker`.
- Texte >200 Zeichen überschreiten das Limit von ~1000 Generierungsschritten — Lösung: Aufteilung in Abschnitte an Satzgrenzen.
- `exaggeration=0.4` — Balance zwischen Treue zur Probe und natürlicher Ausdruckskraft (0,25 = zu flach, 0,5 = zu weit von der Stimme entfernt).

---

### Untersuchte, aber nicht lokal getestete Modelle

Die folgenden Modelle wurden bei der Wahl der TTS-Engine analysiert. Die Bewertung basierte auf verfügbarer Dokumentation, Benchmarks und Community-Berichten — nicht auf einer lokalen Installation.

| Modell | PL | Klonen | Hauptgrund für die Ablehnung |
|---|:---:|:---:|---|
| **CosyVoice 2** (Alibaba) | ✅ | ✅ | Beste Qualität unter den abgelehnten Modellen, erfordert aber das gesamte Ökosystem (FunASR + weitere) — zu komplex für lokale Wartung |
| **F5-TTS / E2-TTS** | ✅ | ✅ | Schnell, aber Texthalluzinationen bei langen Skripten (Wörter werden ausgelassen/wiederholt) — kritisches Produktionsproblem |
| **OpenVoice v2** | ✅ | ✅ | Klonen funktioniert, aber die Stimmfarbe klingt auf PL synthetisch; schlechtere Qualität als Chatterbox |
| **Fish Speech** | ✅ | ✅ | LLM-basierte Architektur — auf einer RTX 3060 dauert die Generierung von 60s Audio 2–4 Min |
| **MetaVoice-1B** | ✅ | ✅ | Hoher VRAM-Bedarf + instabile Phoneme auf PL; bei 12 GB wenig Platz für andere Prozesse |
| **StyleTTS2** | begrenzt | ✅ | Zero-Shot ohne Fine-Tuning liefert durchschnittliche Qualität; kein natives PL |
| **Tortoise TTS** | begrenzt | ✅ | Autoregressiv: 5–10 Min pro Minute Audio — völlig unbrauchbar in Echtzeit |
| **Kokoro TTS** | ✅ | ❌ | Kein Zero-Shot — nur vordefinierte Stimmen; disqualifiziert für Personalisierung |
| **Piper TTS** | ✅ | ❌ | Für Edge-Geräte konzipiert (Raspberry Pi); Qualität für Videoaufnahmen unzureichend |

---

### Produktionskonfiguration (aktiv)

```
Geklonte englische Stimme  → Chatterbox Turbo        (exaggeration=0.4)
Geklonte polnische Stimme  → Chatterbox Multilingual   (exaggeration=0.4)
Fertige Stimme (ohne Probe) → edge-tts Microsoft Neural
Fallback (keine venv)      → XTTS-v2 mit Warmup+Trim
```

---

## 🔍 Fehlerbehebung

**XTTS erzeugt chinesische Artefakte am Anfang des Clips**
Das Backend schneidet automatisch die ersten 250 ms ab und bereinigt den Text (entfernt CJK-Zeichen). Falls das Problem erneut auftritt — verwenden Sie einfachere Sätze ohne Gedankenstriche und eckige Klammern.

**„No module named 'pptx'“ beim Hochladen einer Präsentation**
```bash
source ~/voice-studio/backend/.venv/bin/activate
pip install python-pptx PyMuPDF
sudo systemctl restart voice-studio
```

**Der zweite Präsentations-Job verschwindet aus der Warteschlange**
Behoben in v1.1.0. Browser-Cache leeren (Strg+Umschalt+R) und die App aktualisieren.

**Ollama offline / Fehler bei der Dialoggenerierung**
```bash
curl http://localhost:47821/api/ollama/status?host=http://localhost:11434
# → {"online":true,"models":["llama3.1:8b"]}
ollama serve          # falls offline
ollama pull llama3.1:8b   # falls das Modell fehlt
```

**Frontend zeigt die alte Oberfläche**
Strg+Umschalt+R (Hard Refresh). Die Produktions-App läuft auf Port 47821 — falls Sie einen Vite-Dev-Server (47822) haben, stoppen Sie ihn.

---

## 🆕 Was ist neu

### v1.4.0 — 2026-06

**Avatar — behoben, realistische Lippensynchronisation (kritischer Fix):**
- Die Funktion erzeugte nur ein statisches Bild mit Zoom-Effekt — LivePortrait, auf das sich der Code stützte, war auf dem Server nie tatsächlich installiert
- Ersetzt durch eine funktionierende Engine: **SadTalker** — echte Lippenbewegung synchronisiert mit dem generierten Audio (nicht mit einem zufälligen Antriebs-Video)
- **GFPGAN** (Gesichtsrestaurierung) hinzugefügt — reduziert den "Uncanny-Valley"-Effekt deutlich, das Gesicht wirkt scharf und natürlich
- Kritischer Bug behoben: SadTalker speicherte Video mit dem `mpeg4`-Codec, der in Browsern nicht abspielbar ist (schwarzer Bildschirm) — Transkodierung nach `h264` hinzugefügt
- 15-Minuten-Timeout pro Clip, automatischer Fallback auf statische Animation bei Fehlern

**Präsentation → Film — höhere Bildqualität der Folien:**
- PDF/PPTX werden jetzt mit ~180 DPI gerendert (vorher ~108 DPI) — Folientext ist scharf, nicht verschwommen
- Ausgabevideo-Auflösung von 1280×720 auf 1920×1080 (Full HD) erhöht
- Höhere x264-Kodierqualität (CRF 16 statt Standard 23) + Lanczos-Skalierung

**Video-Editor — neue Optionen:**
- **Zuschneiden (Crop)** — Ränder oben/unten/links/rechts in Pixeln entfernen, mit Live-Vorschau-Overlay auf dem Video (nützlich zum Entfernen von Untertiteln oder Wasserzeichen)
- **Drehen** — 90° / 180° / 270°
- **Geschwindigkeitsänderung** — 0.5× bis 2× (Audio und Video bleiben synchron)

### v1.3.0 — 2026-06

**Mehrsprachige Unterstützung (i18n):**
- Vollständige UI-Lokalisierung: Polnisch (Standard), Englisch, Deutsch, Spanisch
- Sprachumschalter in der App-Kopfzeile, die Auswahl wird in `localStorage` gespeichert (bleibt über Sitzungen hinweg erhalten)
- Alle Module (Präsentationen, Hörbuch, Video, Animation, Avatar, Video-Editor, QA Checker und andere) vollständig übersetzt

**Fehlerkorrekturen (Audit 2026-06-15):**
- API-Version: `/api/health` gab `1.1.0` statt `2.0.0` zurück — behoben
- QA-Prüfung/-Korrektur für Hörbuchdateien (Unterordner, z. B. `/api/audio/buch/kapitel.mp3`) — `_url_to_path` schnitt den Ordnernamen ab (`Path.name`), verwendet jetzt `_safe_audio_path` mit vollständiger Path-Traversal-Prüfung
- Frontend `HistoryTab`: leeres `catch {}` in `fetchFiles`, `deleteFile`, `deleteAll` — `console.warn` und HTTP-Statusprüfung hinzugefügt; Netzwerkfehler werden nicht mehr stillschweigend verschluckt
- Playwright-E2E-Tests: `tests/e2e.spec.js` (10 Tests) + `playwright.config.js` hinzugefügt — alle Tests grün

**Aufnahmeverlauf — Massendownload:**
- Beliebige Dateien/Ordner per Checkbox auswählen → „Auswahl herunterladen“ → ZIP mit der gesamten Auswahl
- Download-Fehler behoben: Das `<a>`-Element wird jetzt vor dem Klick dem DOM hinzugefügt, URL-Freigabe mit 2s Verzögerung (einige Browser brachen den Download sofort ab)
- Sichtbare Fehlermeldung, wenn das ZIP fehlschlägt (zuvor verschluckte ein leeres `catch {}` die Fehler)
- Präsentationsdateien verwenden jetzt den Namen der Eingabedatei statt einer UUID (`meine-praesentation-a1b2c3.mp4`)

**KI-Prompt — Dialoggenerierung aus natürlichem Text:**
- Neuer Tab „KI-Prompt“: Beschreibung des Dialogs eingeben, ein KI-Modell (Ollama, lokal) erzeugt eine fertige Segmentstruktur mit zugewiesenen Stimmen und Parametern
- Unterstützung für Denkmodelle (Qwen3): JSON-Extraktion aus einem separaten `thinking`-Feld, wenn `content` leer ist (Ollama trennt den Denkprozess von der Antwort)
- JSON-Reparatur: Regex korrigiert ungültige numerische Werte (`+1`, `-3` → `"+1"`, `"-3"`) und fehlende Doppelpunkte in Schlüsseln
- Automatischer Versuch beider Antwortfelder (`content` und `thinking`) und Entfernen von `<think>...</think>`-Blöcken

### v1.2.0 — 2026-06

**Chatterbox TTS — neue Haupt-Engine für Stimmenklonen:**
- Chatterbox Turbo für Englisch + Chatterbox Multilingual V3 für Polnisch und andere Sprachen
- Keine CJK-Artefakte oder Halluzinationen — ein Problem, das XTTS-v2 betraf
- Separate venv `.chatterbox-venv` mit automatischer Installation (install.sh + install.py)
- Automatischer Fallback zu XTTS, wenn Chatterbox nicht verfügbar ist
- Parameter `exaggeration=0.4` — Balance zwischen Klontreue und stimmlicher Ausdruckskraft
- Aufteilung langer Texte in Abschnitte an Satzgrenzen — verhindert Abschneiden bei >200 Zeichen

**Aufnahmeverlauf:**
- Schaltfläche „Alle löschen“ — entfernt alle generierten Dateien mit einem Klick
- Massenauswahl (Checkboxen) — ausgewählte Aufnahmen löschen

**Präsentationswarteschlange:**
- Status „Folie 5/13“ — Information zum Verarbeitungsfortschritt
- Realistische Zeitschätzung (ETA) basierend auf der Zeit pro Folie

**Fehlerkorrekturen:**
- Audio-Abschneidung am Ende einer Folie — `apad` + `-shortest` funktionierten nicht zusammen mit `-loop 1`; behoben durch explizites `-t duration` am Bildeingang
- Textaufteilung mitten im Wort — zeichenbasierter Fallback-Split durch wortgrenzenbasierten Split ersetzt

### v1.1.0 — 2026-06

**Neue Funktionen:**
- WAN 2.1 — Text-zu-Video-Generierung (12 GB VRAM), Qualitätssteuerung schnell/standard/hoch
- LivePortrait — Gesichtsanimation aus einem Foto, Ken-Burns-Fallback (ffmpeg)
- Demucs 4-Stem und 2-Stem — Stem-Trennung mit Audioplayer für jeden Stem
- RVC in einer isolierten venv `/opt/rvc-venv` (Python 3.11 + numpy<2, vermeidet einen ABI-Konflikt mit whisperx)
- Stapelweise Präsentationswarteschlange (PresentationBatchQueue)
- Installationsassistent: `install.sh` (Linux/macOS/WSL) + `install.py` (plattformübergreifend)
- Docker: vereinfachte `docker-compose.yml` + `docker-compose.gpu.yml` als Override

**Fehlerkorrekturen:**
- Festplatte in `/api/hardware` zeigte das Root-Dateisystem statt der richtigen Datenfestplatte
- `video_generation` und `music_generation` fälschlicherweise false, wenn XTTS geladen war
- Race Condition in der Aufgabenwarteschlange (asyncio.Lock + globaler Fix)
- RVC: Nichtübereinstimmung des Formularparameternamens (`model` vs `voice_model`)
- Aufgaben laufen nach 2h ab (TTLDict — kein Memory Leak)

---

## 🧪 E2E-Tests

Das Projekt enthält Playwright-Tests, die die wichtigsten Benutzerpfade abdecken.

```bash
npx playwright test           # alle Tests
npx playwright test --ui      # interaktiver Modus
npx playwright show-report    # HTML-Bericht
```

---

## 🙏 Verwendete Open-Source-Projekte

| Projekt | Lizenz |
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

MIT-Lizenz — Details in der Datei `LICENSE`.
