# 🎙 Voice & Video Studio AI

🌐 **Język / Language:** [🇵🇱 Polski](README.md) | [🇬🇧 English](README.en.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md)

![Python](https://img.shields.io/badge/Python-3.11%2F3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-CPU%2FGPU-2496ED?logo=docker&logoColor=white)
![GPU](https://img.shields.io/badge/GPU-NVIDIA%20CUDA-76B900?logo=nvidia&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Un estudio de IA local para generar y editar audio/video — combina Chatterbox TTS, Coqui XTTS, WhisperX, MusicGen, Demucs, RVC, AnimateDiff, WAN 2.1 y más en una sola interfaz. Funciona 100% en tu propio hardware, sin suscripciones externas.

---

## 📋 Tabla de contenidos

- [Empieza en 5 minutos](#-empieza-en-5-minutos)
- [¿Qué puedes hacer con esto?](#-qué-puedes-hacer-con-esto)
- [Funcionalidades](#-funcionalidades)
- [Requisitos de hardware](#-requisitos-de-hardware)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Referencia de la API](#-referencia-de-la-api)
- [Cola de tareas](#-cola-de-tareas)
- [Presentaciones y modo por lotes](#-presentaciones-y-modo-por-lotes)
- [Night Mode](#-night-mode)
- [Seguridad](#-seguridad)
- [Modelos TTS — resultados de pruebas](#-modelos-tts--resultados-de-pruebas)
- [Solución de problemas](#-solución-de-problemas)
- [Novedades](#-novedades)
- [Pruebas E2E](#-pruebas-e2e)
- [Proyectos open source utilizados](#-proyectos-open-source-utilizados)

---

## 🚀 Empieza en 5 minutos

### 🐳 Docker — funciona de inmediato, sin instalar dependencias

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio

# CPU (TTS, transcripción, presentaciones):
docker compose up -d

# GPU — NVIDIA (todas las funciones, requiere nvidia-container-toolkit):
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

Abre: **http://localhost:47822**

> Requisitos: Docker 24+, Docker Compose v2. En Windows — Docker Desktop con backend WSL2.

---

### 🐧 Linux / macOS / WSL2 — script de instalación

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
bash voice-studio/install.sh
```

El script detecta el sistema operativo, instala Python 3.11 + Node 20 + ffmpeg, pregunta sobre componentes opcionales (XTTS, WhisperX, MusicGen...) y compila el frontend. Al final inicia el servidor.

Después de la instalación: **http://localhost:47821**

---

## 🌟 ¿Qué puedes hacer con esto?

- **Presentación → Video:** Sube un PPTX o PDF, edita el texto del narrador para cada diapositiva, elige una voz y haz clic en "Renderizar". En unos minutos tendrás un MP4 listo.
- **Clonación de voz:** Sube una muestra WAV de 10 segundos — XTTS-v2 hablará con esa voz en 17 idiomas.
- **Transcripción con diarización:** WhisperX reconoce a los hablantes y genera texto con marcas de tiempo ("quién habló y cuándo").
- **Música con IA:** Describe el ambiente con palabras — MusicGen generará una pista musical en pocos minutos.
- **Separación de pistas:** Demucs aísla la voz, la batería, el bajo y los instrumentos de una grabación existente.
- **Audiolibro:** Sube un EPUB o TXT — el sistema lo dividirá en capítulos y lo narrará.

---

## ✨ Funcionalidades

### 🎙 Audio y TTS

| Módulo | Motor | GPU | VRAM |
|---|---|:---:|---|
| Narrador rápido | edge-tts (Microsoft Neural) | ❌ | — |
| Clonación de voz EN | Chatterbox Turbo (Resemble AI) | ✅ | 4 GB |
| Clonación de voz PL/multi | Chatterbox Multilingual V3 | ✅ | 4 GB |
| Clonación de voz (alternativa) | XTTS-v2 (Coqui) | ✅ | 4 GB |
| Música con IA | MusicGen (Meta) | ✅ | 6 GB |
| Transcripción + diarización | WhisperX | ✅ | 3 GB |
| Separación de pistas (4 o 2 pistas) | Demucs | opcional | — |
| Cambio de carácter de voz | RVC (venv aislado) | opcional | — |
| Mezclador de audio | ffmpeg | ❌ | — |

### 🎬 Video y presentaciones

| Módulo | Descripción |
|---|---|
| Presentación → Video | PPTX/PDF + narrador → MP4, cola asíncrona |
| Cola por lotes | Varios archivos PPTX/PDF a la vez, una voz compartida |
| Generador de video con IA | AnimateDiff (local, 6 GB), WAN 2.1 (12 GB), Runway (API) |
| Película | Guion + escenas + voces de actores → película terminada |
| Estudio de diálogos | Dos actores, Ollama LLM → guion → líneas XTTS |
| Editor de video | Recorte temporal (trim), recorte de imagen (crop), rotación, velocidad, sustitución de audio, subtítulos (ffmpeg) |
| Animación de avatar | SadTalker + GFPGAN — sincronización de labios real a partir del audio y mejora facial, alternativa ken-burns |

### ⚙️ Herramientas

| Módulo | Descripción |
|---|---|
| JobMonitor | Estado de todas las tareas: en cola / en ejecución / completadas |
| QA Checker | Análisis de audio: clipping, silencio, ruido, velocidad del habla |
| Dashboard | GPU/CPU/RAM/disco, componentes instalados |
| Night Mode | Programación de renderizado (p. ej. solo de 22:00 a 7:00) |
| Historial | Lista de archivos generados con vista previa |
| Configuración | Host/modelo de Ollama, CORS, contraseña, limpieza de caché |

---

## 💻 Requisitos de hardware

| Función | VRAM mín. | Notas |
|---|---|---|
| edge-tts (narrador) | — | Funciona sin GPU, requiere internet |
| XTTS-v2 (clonación) | 4 GB | Requiere GPU |
| WhisperX (transcripción) | 3 GB | Requiere GPU |
| MusicGen (música) | 6 GB | Requiere GPU |
| AnimateDiff (video) | 8 GB | Requiere GPU |
| WAN 2.1 (video HD) | 12 GB | Requiere GPU |
| Demucs, RVC | — | GPU opcional (más lento en CPU) |

**RAM:** mínimo 8 GB, recomendado 16 GB+
**Disco:** 20 GB (solo los modelos de IA), recomendado 100 GB+
**SO:** Linux (recomendado), macOS, Windows (WSL2 o Docker)

---

## 🔧 Instalación

### Método 1 — Docker (el más sencillo)

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio
docker compose up -d                                                    # CPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d   # GPU
```

Frontend: `http://localhost:47822` | API del backend: `http://localhost:47821`

### Método 2 — Script install.sh (Linux/macOS/WSL2)

```bash
bash install.sh
```

Instala las dependencias, pregunta sobre componentes GPU, compila el frontend, crea `start.sh`.

### Método 3 — Asistente install.py (multiplataforma)

```bash
python install.py              # interactivo
python install.py --check      # comprobar qué está instalado
python install.py --all        # instalar todo sin preguntar
```

### Método 4 — Manual

```bash
git clone https://github.com/cenkierpiotr/voice-video-studio2.git voice-studio
cd voice-studio/backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart httpx psutil \
    edge-tts soundfile pydub python-pptx PyMuPDF Pillow aiofiles
# Dependencias GPU (opcionales):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install TTS whisperx demucs
# Frontend:
cd ../frontend && npm ci && npm run build
```

---

## ⚙️ Configuración

```bash
cp backend/.env.example backend/.env
```

| Variable | Predeterminado | Descripción |
|---|---|---|
| `VOICE_STUDIO_DATA_DIR` | _(local)_ | Ruta a un disco externo para archivos de IA y audio |
| `CORS_ORIGINS` | `localhost:47822` | Orígenes permitidos (separados por comas) |
| `LOG_LEVEL` | `INFO` | Nivel de registro: DEBUG / INFO / WARNING |

Ejemplo para un servidor con disco externo:

```env
VOICE_STUDIO_DATA_DIR=/mnt/storage
CORS_ORIGINS=http://192.168.0.100:47821,http://localhost:47821
```

---

## ▶️ Ejecución

```bash
# Script de inicio (creado por install.sh):
bash ~/voice-studio/start.sh

# Manual:
cd backend && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1
```

> `--workers 1` es obligatorio — el modelo XTTS se carga en la memoria de la GPU y no es thread-safe.

```bash
# Servicio systemd:
sudo systemctl start voice-studio
sudo journalctl -u voice-studio -f   # registros en vivo
```

---

## 📡 Referencia de la API

### Health & Hardware

```bash
GET  /api/health           → {"status":"ok","version":"1.1.0"}
GET  /api/hardware         → GPU/CPU/RAM/disco + capacidades
GET  /api/queue/status     → estado de la cola de tareas
```

### TTS — Generación de voz

```bash
# edge-tts (rápido, en línea):
curl -X POST http://localhost:47821/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"¡Hola!", "voice":"pl-PL-MarekNeural", "speed":1.0}' \
  --output audio.mp3

# XTTS-v2 (clonación a partir de una muestra):
curl -X POST http://localhost:47821/api/tts/xtts \
  -F "text=Texto a pronunciar" \
  -F "speaker_wav=@muestra.wav" \
  -F "language=pl" --output clonado.wav
```

Voces: `GET /api/voices` | Subir muestra: `POST /api/clone-voice` | Eliminar: `DELETE /api/cloned-voices/{name}`

### Presentaciones

```bash
# 1. Analizar PPTX/PDF → diapositivas:
curl -X POST http://localhost:47821/api/presentation/parse -F "file=@presentacion.pptx"
# → {"session_id":"abc123","slides":[...],"total_slides":12}

# 2. Encolar el renderizado → MP4:
curl -X POST http://localhost:47821/api/presentation/render \
  -F "session_id=abc123" \
  -F 'slides=[{"index":0,"text":"Texto del narrador para la diapositiva 0"}]' \
  -F "voice_key=pl_male_marek"
# → {"job_id":"xyz"}

# 3. Consultar el estado:
curl http://localhost:47821/api/jobs/xyz
# → {"status":"completed","progress":100,"url":"/api/audio/presentacion-xyz.mp4"}
```

### Otros endpoints

```bash
POST /api/transcribe          # WhisperX: file, language, diarize=true/false
POST /api/music/generate      # MusicGen: {"prompt":"...","duration":30}
POST /api/audio/demucs        # Demucs: file, stems=4|2
POST /api/audio/rvc           # RVC: file, model, semitone_shift
POST /api/audio/mix           # Mezclador de audio
POST /api/audiobook/generate  # Audiolibro a partir de EPUB/texto
POST /api/generate-video      # Generador de video con IA
POST /api/render-dialogue     # Diálogo de dos actores
GET  /api/files               # Lista de archivos generados
DELETE /api/files/{filepath}  # Eliminar un archivo
POST /api/cache/clear         # Limpiar /tmp/*
POST /api/auth/set-password   # Establecer contraseña (bcrypt)
```

---

## 🔄 Cola de tareas

Los endpoints aceptan una solicitud y devuelven inmediatamente un `job_id`. Las tareas se procesan una tras otra (un único worker de GPU).

```
queued → running → completed
                 ↘ failed
```

El frontend consulta `GET /api/jobs/{job_id}` cada 2.5 segundos. Se puede cancelar una tarea con `DELETE /api/queue/{job_id}`.

Las tareas caducan automáticamente después de 2 horas (limpieza TTL).

---

## 📂 Presentaciones y modo por lotes

**Presentación individual:** Video → Presentación → sube PPTX/PDF → edita los textos del narrador → elige una voz → Generar.

**Modo por lotes:** Video → Por lotes → arrastra varios archivos a la vez → elige una voz compartida → "Añadir N a la cola". Cada archivo recibe su propio `job_id`. Progreso visible en JobMonitor.

---

## 🌙 Night Mode

El sistema acepta tareas todo el día, pero solo las ejecuta dentro de la ventana de tiempo configurada. Configuración: Configuración → Night Mode.

**Ejemplo:** Añade 10 presentaciones por la noche, establece la ventana de 22:00 a 7:00 — se renderiza durante la noche, por la mañana todo está listo.

---

## 🔐 Seguridad

- **Contraseña:** `POST /api/auth/set-password` guarda un hash bcrypt. Sin contraseña — acceso abierto.
- **Limitación de velocidad:** 200 solicitudes/min por IP (slowapi si está instalado, alternativa de ventana deslizante).
- **Path traversal:** Los archivos de audio se sirven exclusivamente desde `AUDIO_DIR` (validación `.relative_to()`).
- **Inyección RVC:** Las rutas de los modelos se pasan mediante una configuración JSON (no interpolación de cadenas).
- **CORS:** Configurable mediante `.env` — por defecto solo localhost.

---

## 🧪 Modelos TTS — resultados de pruebas

Pruebas realizadas en una NVIDIA RTX 3060 (12 GB VRAM), Python 3.12, CUDA 12.8. El objetivo era clonar voces para la narración de presentaciones en polaco e inglés, sin alucinaciones ni artefactos.

### Modelos implementados y probados en producción

| Modelo | Idioma | Clonación | Alucinaciones | Calidad | Estado |
|---|---|:---:|:---:|:---:|---|
| **Chatterbox Turbo** | EN | ✅ | ❌ ninguna | ⭐⭐⭐⭐⭐ | ✅ activo (EN) |
| **Chatterbox Multilingual V3** | PL / multi | ✅ | ❌ ninguna | ⭐⭐⭐⭐ | ✅ activo (PL) |
| XTTS-v2 (Coqui) | PL / 17 idiomas | ✅ | ⚠️ tokens CJK | ⭐⭐⭐ | ⚠️ alternativa |
| edge-tts (Microsoft Neural) | PL / EN / multi | ❌ | ❌ ninguna | ⭐⭐⭐⭐ | ✅ voces predefinidas |

**XTTS-v2** — el motor original, problemas detectados:
- Artefactos CJK al inicio de cada clip (tokens de condicionamiento de idioma). Solución: warmup "Hm. " + recorte de 450 ms.
- Alucinaciones con `temperature=0.3` (bucles). Óptimo: `temperature=0.55, repetition_penalty=3.0, top_k=40, top_p=0.75`.

**Chatterbox** — elegido como sustituto:
- Requiere un venv separado `.chatterbox-venv` (`torch==2.6` entra en conflicto con `torch==2.8+cu128` del venv principal). Comunicación mediante pipe JSON-line.
- La extensión nativa `resemble-perth` a menudo no está disponible — se requiere un parche: `perth.PerthImplicitWatermarker = perth.DummyWatermarker`.
- Los textos de más de 200 caracteres superan el límite de ~1000 pasos de generación — solución: dividir en fragmentos en los límites de las frases.
- `exaggeration=0.4` — equilibrio entre la fidelidad a la muestra y la expresividad natural (0.25 = demasiado plano, 0.5 = demasiado alejado de la voz).

---

### Modelos investigados pero no probados localmente

Los siguientes modelos se analizaron al elegir el motor TTS. La evaluación se basó en la documentación disponible, benchmarks e informes de la comunidad, no en una instalación local.

| Modelo | PL | Clonación | Principal motivo de rechazo |
|---|:---:|:---:|---|
| **CosyVoice 2** (Alibaba) | ✅ | ✅ | Mejor calidad entre los rechazados, pero requiere todo el ecosistema (FunASR y otros) — demasiado complejo para mantener localmente |
| **F5-TTS / E2-TTS** | ✅ | ✅ | Rápido, pero con alucinaciones de texto en guiones largos (palabras omitidas/repetidas) — problema crítico en producción |
| **OpenVoice v2** | ✅ | ✅ | La clonación funciona, pero el timbre de voz en PL suena sintético; calidad inferior a Chatterbox |
| **Fish Speech** | ✅ | ✅ | Arquitectura basada en LLM — en una RTX 3060, generar 60s de audio tarda 2–4 min |
| **MetaVoice-1B** | ✅ | ✅ | Alto consumo de VRAM + fonemas inestables en PL; con 12 GB queda poco espacio para otros procesos |
| **StyleTTS2** | limitado | ✅ | Zero-shot sin fine-tuning da una calidad media; sin soporte nativo de PL |
| **Tortoise TTS** | limitado | ✅ | Autorregresivo: 5–10 min por minuto de audio — completamente inutilizable en tiempo real |
| **Kokoro TTS** | ✅ | ❌ | Sin zero-shot — solo voces predefinidas; descalifica para la personalización |
| **Piper TTS** | ✅ | ❌ | Diseñado para dispositivos edge (Raspberry Pi); calidad insuficiente para grabaciones de video |

---

### Configuración de producción (activa)

```
Voz inglesa clonada       → Chatterbox Turbo        (exaggeration=0.4)
Voz polaca clonada        → Chatterbox Multilingual   (exaggeration=0.4)
Voz predefinida (sin muestra) → edge-tts Microsoft Neural
Alternativa (sin venv)    → XTTS-v2 con warmup+recorte
```

---

## 🔍 Solución de problemas

**XTTS genera artefactos chinos al inicio del clip**
El backend recorta automáticamente los primeros 250 ms y sanea el texto (elimina caracteres CJK). Si el problema persiste — usa frases más simples sin guiones largos ni corchetes.

**"No module named 'pptx'" al subir una presentación**
```bash
source ~/voice-studio/backend/.venv/bin/activate
pip install python-pptx PyMuPDF
sudo systemctl restart voice-studio
```

**La segunda tarea de presentación desaparece de la cola**
Corregido en la v1.1.0. Borra la caché del navegador (Ctrl+Shift+R) y actualiza la aplicación.

**Ollama desconectado / error al generar el diálogo**
```bash
curl http://localhost:47821/api/ollama/status?host=http://localhost:11434
# → {"online":true,"models":["llama3.1:8b"]}
ollama serve          # si está desconectado
ollama pull llama3.1:8b   # si falta el modelo
```

**El frontend muestra la interfaz antigua**
Ctrl+Shift+R (recarga forzada). La aplicación de producción funciona en el puerto 47821 — si tienes un servidor de desarrollo Vite (47822), deténlo.

---

## 🆕 Novedades

### v1.4.0 — 2026-06

**Avatar — corregido, sincronización de labios realista (corrección crítica):**
- La función solo generaba una imagen estática con efecto de zoom — LivePortrait, en el que se basaba el código, nunca estuvo realmente instalado en el servidor
- Reemplazado por un motor funcional: **SadTalker** — movimiento de labios real sincronizado con el audio generado (no con un video de referencia aleatorio)
- Se añadió **GFPGAN** (restauración facial) — reduce significativamente el efecto "uncanny valley", el rostro se ve nítido y natural
- Se corrigió un error crítico: SadTalker guardaba el video con el codec `mpeg4`, que no se reproduce en los navegadores (pantalla negra) — se añadió la transcodificación a `h264`
- Tiempo de espera de 15 minutos por clip, alternativa automática a animación estática en caso de error

**Presentación → Película — mayor calidad de imagen de las diapositivas:**
- PDF/PPTX ahora se renderizan a ~180 DPI (antes ~108 DPI) — el texto de las diapositivas es nítido, no borroso
- Resolución de video de salida aumentada de 1280×720 a 1920×1080 (Full HD)
- Mayor calidad de codificación x264 (CRF 16 en lugar del valor predeterminado 23) + escalado Lanczos

**Editor de video — nuevas opciones:**
- **Recorte (Crop)** — recorta los márgenes superior/inferior/izquierdo/derecho en píxeles, con vista previa en vivo sobre el video (útil para eliminar subtítulos o marcas de agua)
- **Rotación** — 90° / 180° / 270°
- **Cambio de velocidad** — 0.5× a 2× (audio y video permanecen sincronizados)

### v1.3.0 — 2026-06

**Soporte multilingüe (i18n):**
- Localización completa de la interfaz: polaco (predeterminado), inglés, alemán, español
- Selector de idioma en el encabezado de la aplicación, la elección se guarda en `localStorage` (se mantiene entre sesiones)
- Todos los módulos (Presentaciones, Audiolibro, Video, Animación, Avatar, Editor de video, QA Checker y otros) totalmente traducidos

**Correcciones de errores (auditoría 2026-06-15):**
- Versión de la API: `/api/health` devolvía `1.1.0` en lugar de `2.0.0` — corregido
- Comprobación/corrección de calidad para archivos de audiolibros (subdirectorios, p. ej. `/api/audio/libro/capitulo.mp3`) — `_url_to_path` truncaba el nombre del directorio (`Path.name`), ahora usa `_safe_audio_path` con verificación completa de path traversal
- Frontend `HistoryTab`: `catch {}` vacío en `fetchFiles`, `deleteFile`, `deleteAll` — se añadió `console.warn` y comprobación del estado HTTP; los errores de red ya no se silencian
- Pruebas E2E de Playwright: se añadió `tests/e2e.spec.js` (10 pruebas) + `playwright.config.js` — todas las pruebas en verde

**Historial de grabaciones — descarga masiva:**
- Selecciona cualquier archivo/carpeta con casillas → "Descargar seleccionados" → ZIP con toda la selección
- Error de descarga corregido: el elemento `<a>` ahora se añade al DOM antes de hacer clic, la URL se revoca con un retraso de 2s (algunos navegadores cancelaban la descarga inmediatamente)
- Mensaje de error visible cuando el ZIP falla (antes un `catch {}` vacío silenciaba los errores)
- Los archivos de presentación ahora usan el nombre del archivo de entrada en lugar de un UUID (`mi-presentacion-a1b2c3.mp4`)

**Prompt de IA — generación de diálogos a partir de texto natural:**
- Nueva pestaña "Prompt de IA": escribe una descripción del diálogo, un modelo de IA (Ollama, local) genera una estructura de segmentos lista con voces y parámetros asignados
- Soporte para modelos de razonamiento (Qwen3): extracción de JSON desde un campo `thinking` separado cuando `content` está vacío (Ollama separa el razonamiento de la respuesta)
- Reparación de JSON: una expresión regular corrige valores numéricos inválidos (`+1`, `-3` → `"+1"`, `"-3"`) y dos puntos faltantes en las claves
- Intento automático en ambos campos de respuesta (`content` y `thinking`) y eliminación de bloques `<think>...</think>`

### v1.2.0 — 2026-06

**Chatterbox TTS — nuevo motor principal de clonación de voz:**
- Chatterbox Turbo para inglés + Chatterbox Multilingual V3 para polaco y otros idiomas
- Sin artefactos CJK ni alucinaciones — un problema que afectaba a XTTS-v2
- venv separado `.chatterbox-venv` con instalación automática (install.sh + install.py)
- Alternativa automática a XTTS cuando Chatterbox no está disponible
- Parámetro `exaggeration=0.4` — equilibrio entre fidelidad de clonación y expresividad de la voz
- División de textos largos en fragmentos por límites de frase — evita cortes con más de 200 caracteres

**Historial de grabaciones:**
- Botón "Eliminar todo" — elimina todos los archivos generados con un clic
- Selección masiva (casillas) — eliminar grabaciones seleccionadas

**Cola de presentaciones:**
- Estado "Diapositiva 5/13" — información del progreso de procesamiento
- Estimación de tiempo realista (ETA) basada en el tiempo por diapositiva

**Correcciones de errores:**
- Corte de audio al final de una diapositiva — `apad` + `-shortest` no funcionaban junto con `-loop 1`; corregido con un `-t duration` explícito en la entrada de imagen
- División de texto a mitad de palabra — la división de respaldo basada en caracteres se sustituyó por una división basada en límites de palabra

### v1.1.0 — 2026-06

**Nuevas funciones:**
- WAN 2.1 — generación de video a partir de texto (12 GB VRAM), control de calidad rápido/estándar/alto
- LivePortrait — animación facial a partir de una foto, alternativa ken-burns (ffmpeg)
- Demucs de 4 y 2 pistas — separación de pistas con reproductor de audio para cada una
- RVC en un venv aislado `/opt/rvc-venv` (Python 3.11 + numpy<2, evita un conflicto de ABI con whisperx)
- Cola por lotes de presentaciones (PresentationBatchQueue)
- Asistente de instalación: `install.sh` (Linux/macOS/WSL) + `install.py` (multiplataforma)
- Docker: `docker-compose.yml` simplificado + `docker-compose.gpu.yml` como override

**Correcciones de errores:**
- El disco en `/api/hardware` mostraba el sistema de archivos raíz en lugar del disco de datos correcto
- `video_generation` y `music_generation` aparecían falsamente como false cuando XTTS estaba cargado
- Condición de carrera en la cola de tareas (asyncio.Lock + corrección global)
- RVC: discrepancia en el nombre del parámetro del formulario (`model` vs `voice_model`)
- Las tareas caducan después de 2h (TTLDict — sin fugas de memoria)

---

## 🧪 Pruebas E2E

El proyecto incluye pruebas de Playwright que cubren las principales rutas de usuario.

```bash
npx playwright test           # todas las pruebas
npx playwright test --ui      # modo interactivo
npx playwright show-report    # informe HTML
```

---

## 🙏 Proyectos open source utilizados

| Proyecto | Licencia |
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

Licencia MIT — consulta el archivo `LICENSE` para más detalles.
