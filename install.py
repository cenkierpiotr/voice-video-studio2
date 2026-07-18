#!/usr/bin/env python3
"""
Voice & Video Studio AI — Installer / Setup Wizard
Works on Linux, macOS, Windows (Python 3.11+ required)

Usage:
    python install.py              # instaluje WSZYSTKO automatycznie
    python install.py --check      # tylko sprawdź co jest zainstalowane
    python install.py --cpu        # bez GPU deps (wolniejsza transkrypcja)
    python install.py --service    # skonfiguruj serwis systemd
"""
import argparse
import os
import platform
import subprocess
import sys
from pathlib import Path

PYTHON = sys.executable
VENV_DIR = Path(__file__).parent / "backend" / ".venv"
OS = platform.system()  # Linux | Darwin | Windows
PY_MINOR = sys.version_info.minor

# ── Colors ────────────────────────────────────────────────────────────────────
def _c(code, text):
    if OS == "Windows":
        return text
    return f"\033[{code}m{text}\033[0m"

OK  = lambda t: print(_c("32", f"  ✅  {t}"))
ERR = lambda t: print(_c("31", f"  ❌  {t}"))
INF = lambda t: print(_c("36", f"  ℹ️   {t}"))
HDR = lambda t: print(_c("1;34", f"\n{'─'*60}\n  {t}\n{'─'*60}"))
WARN = lambda t: print(_c("33", f"  ⚠️   {t}"))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _importable(name: str) -> bool:
    import importlib.util
    return importlib.util.find_spec(name) is not None


def _which(cmd: str) -> bool:
    import shutil
    return shutil.which(cmd) is not None


def _torch_cuda() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def _check_node() -> bool:
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True)
        ver = r.stdout.strip().lstrip("v")
        major = int(ver.split(".")[0])
        return major >= 20
    except Exception:
        return False


def _pip(packages: list, extra_args: list = None) -> bool:
    cmd = [PYTHON, "-m", "pip", "install", "--quiet"] + packages
    if extra_args:
        cmd += extra_args
    result = subprocess.run(cmd)
    return result.returncode == 0


def _run(cmd: list, cwd=None) -> bool:
    result = subprocess.run(cmd, cwd=cwd)
    return result.returncode == 0


def _nvidia_cuda_version() -> int:
    """Returns CUDA version as int (e.g. 128 for 12.8, 121 for 12.1) or 0."""
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"],
            capture_output=True, text=True,
        )
        # CUDA version from nvidia-smi header line
        r2 = subprocess.run(["nvidia-smi"], capture_output=True, text=True)
        for line in r2.stdout.splitlines():
            if "CUDA Version:" in line:
                ver_str = line.split("CUDA Version:")[1].strip().split()[0]
                parts = ver_str.split(".")
                return int(parts[0]) * 10 + int(parts[1]) if len(parts) >= 2 else 0
    except Exception:
        pass
    return 0


def _has_nvidia() -> bool:
    return _which("nvidia-smi") and subprocess.run(
        ["nvidia-smi"], capture_output=True
    ).returncode == 0


# ── Component installers ──────────────────────────────────────────────────────

def _install_core() -> bool:
    return _pip([
        "fastapi>=0.100", "uvicorn[standard]>=0.27", "python-multipart>=0.0.9",
        "httpx>=0.27", "psutil>=5.9", "edge-tts>=7.2",
        "soundfile>=0.12", "pydub>=0.25", "aiofiles>=23.0",
        "python-pptx>=0.6", "PyMuPDF>=1.23", "Pillow>=10.0",
        "pyparsing>=3.0", "ebooklib>=0.18",
        "slowapi>=0.1", "bcrypt>=4.0",
    ])


def _install_chatterbox() -> bool:
    INF("Tworzę oddzielny venv dla Chatterbox TTS (torch 2.6 — konflikt z głównym venv)…")
    venv_dir = Path(INSTALL_DIR) / "backend" / ".chatterbox-venv"
    py = "python3.12" if _which("python3.12") else PYTHON
    if not venv_dir.exists():
        if not _run([py, "-m", "venv", str(venv_dir)]):
            ERR("Nie udało się stworzyć .chatterbox-venv"); return False
    pip = str(venv_dir / "bin" / "pip")
    INF("Instalowanie chatterbox-tts (torch 2.6 + transformers 5.2)…")
    ok = _run([pip, "install", "-q", "--upgrade", "pip"])
    ok = ok and _run([pip, "install", "-q", "chatterbox-tts"])
    if ok:
        OK("Chatterbox TTS zainstalowany w backend/.chatterbox-venv")
    else:
        WARN("Chatterbox TTS: błąd instalacji — klonowanie głosu będzie używać XTTS jako fallback")
    return ok


def _check_chatterbox() -> bool:
    venv = Path(INSTALL_DIR) / "backend" / ".chatterbox-venv"
    return (venv / "bin" / "python3").exists() and _run(
        [str(venv / "bin" / "python3"), "-c", "import chatterbox"],
    )


def _install_xtts() -> bool:
    INF("Instalowanie TTS (Coqui XTTS-v2)…")
    # --no-deps: coqui-tts zależności zawierają torch>=2.1 co nadpisuje nasz torch 2.8+cu128
    if PY_MINOR >= 12:
        ok = _pip(["coqui-tts>=0.25.0"], extra_args=["--no-deps"])
        if not ok:
            WARN("coqui-tts nie powiodło się, próbuję TTS --ignore-requires-python…")
            ok = _pip(["TTS"], extra_args=["--no-deps", "--ignore-requires-python"])
    else:
        ok = _pip(["TTS>=0.22.0"], extra_args=["--no-deps"])
    # Doinstaluj zależności TTS inne niż torch/torchaudio
    _pip(["coqpit>=0.0.16", "inflect", "anyascii", "pysbd", "num2words",
          "gruut", "bangla", "blinker", "umalat"], extra_args=[])
    # Przywróć torch po instalacji coqui-tts
    INF("Przywracam torch 2.8.0+cu128 po instalacji coqui-tts…")
    _install_torch()
    return ok


def _install_torch() -> bool:
    cuda_ver = _nvidia_cuda_version()
    if cuda_ver >= 128:
        index_url = "https://download.pytorch.org/whl/cu128"
        tag = "cu128"
    elif cuda_ver >= 121:
        index_url = "https://download.pytorch.org/whl/cu121"
        tag = "cu121"
    else:
        # fallback to CPU-only torch
        WARN("CUDA nie wykryte — instaluję PyTorch CPU")
        return _pip(["torch", "torchaudio"])
    INF(f"Instalowanie PyTorch 2.8.0+{tag} (CUDA {cuda_ver // 10}.{cuda_ver % 10})…")
    return _pip(
        [f"torch==2.8.0+{tag}", f"torchaudio==2.8.0+{tag}"],
        extra_args=["--index-url", index_url],
    )


def _install_whisper() -> bool:
    INF("Instalowanie WhisperX (transkrypcja + diaryzacja)…")
    ok = _pip(["whisperx"])
    if not ok:
        WARN("whisperx nie powiodło się, próbuję openai-whisper…")
        ok = _pip(["openai-whisper"])
    return ok


def _install_diffusers() -> bool:
    # transformers 4.56.0: ma is_torchcodec_available (dla coqui-tts), bez keras_nlp bug (4.57+)
    return _pip(["diffusers>=0.38.0", "transformers==4.56.0", "accelerate>=0.20.0"])


def _install_liveportrait() -> bool:
    lp_dir = Path.home() / "LivePortrait"
    if lp_dir.exists():
        INF("LivePortrait już sklonowany, aktualizuję…")
        _run(["git", "pull"], cwd=str(lp_dir))
    else:
        INF("Klonowanie LivePortrait…")
        _run(["git", "clone", "https://github.com/KwaiVGI/LivePortrait.git", str(lp_dir)])
    if not lp_dir.exists():
        return False
    INF("Instalowanie zależności LivePortrait…")
    req = lp_dir / "requirements.txt"
    if req.exists():
        _run([PYTHON, "-m", "pip", "install", "-r", str(req), "--quiet"])
    INF("Pobieranie modeli LivePortrait (huggingface-cli)…")
    _run(["huggingface-cli", "download", "KwaiVGI/LivePortrait",
          "--local-dir", str(lp_dir / "pretrained_weights"),
          "--local-dir-use-symlinks", "False"])
    return (lp_dir / "inference.py").exists()


def _install_rvc_venv() -> bool:
    rvc_venv = Path("/opt/rvc-venv")
    if rvc_venv.exists():
        INF("RVC venv już istnieje — aktualizuję pakiety…")
    else:
        INF("Tworzenie venv dla RVC (Python 3.11, numpy<2)…")
        py = "python3.11" if _which("python3.11") else PYTHON
        if not _run([py, "-m", "venv", str(rvc_venv)]):
            ERR("Nie udało się stworzyć /opt/rvc-venv"); return False
    pip = str(rvc_venv / "bin" / "pip")
    INF("Instalowanie rvc-python + fairseq + zależności…")
    ok = _run([pip, "install", "-q",
               "rvc-python", "numpy<2", "torchcrepe",
               "fairseq", "ffmpeg-python", "faiss-cpu>=1.8"])
    return ok and (rvc_venv / "bin" / "python3").exists()


def _guide_node_install():
    HDR("Instalacja Node.js 20+")
    if OS == "Linux":
        INF("Ubuntu/Debian:")
        print("    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -")
        print("    sudo apt-get install -y nodejs")
    elif OS == "Darwin":
        INF("macOS: brew install node")
    else:
        INF("Windows: https://nodejs.org/en/download/ → pobierz LTS")
    input("  Naciśnij Enter po zainstalowaniu Node.js…")
    return _check_node()


def _guide_ffmpeg_install():
    HDR("Instalacja ffmpeg")
    if OS == "Linux":
        subprocess.run(["apt-get", "install", "-y", "ffmpeg"], check=False)
    elif OS == "Darwin":
        INF("macOS: brew install ffmpeg")
        input("  Naciśnij Enter po zainstalowaniu…")
    else:
        INF("Windows: https://www.gyan.dev/ffmpeg/builds/ → dodaj bin/ do PATH")
        input("  Naciśnij Enter po zainstalowaniu…")
    return _which("ffmpeg")


# ── Component registry ────────────────────────────────────────────────────────
# Uwaga: musicgen/audiocraft pominięte — audiocraft 1.3 wymaga torch==2.1.0
# (niekompatybilne z torch>=2.8 na tej instalacji)

COMPONENTS = {
    "ffmpeg": {
        "label": "ffmpeg (przetwarzanie audio/wideo)",
        "required": True,
        "check": lambda: _which("ffmpeg"),
        "install": _guide_ffmpeg_install,
    },
    "node": {
        "label": "Node.js 20+ (frontend build)",
        "required": True,
        "check": _check_node,
        "install": _guide_node_install,
    },
    "core": {
        "label": "Rdzeń (FastAPI + edge-tts + dokumenty + rate limiting)",
        "required": True,
        "check": lambda: (
            _importable("fastapi") and _importable("edge_tts")
            and _importable("slowapi") and _importable("pptx")
        ),
        "install": _install_core,
    },
    "chatterbox": {
        "label": "Chatterbox TTS (klonowanie głosu EN + wielojęzyczny, bez halucynacji)",
        "required": False,
        "check": _check_chatterbox,
        "install": _install_chatterbox,
        "note": "Oddzielny venv .chatterbox-venv. Wymaga GPU 4 GB+ VRAM. Zastępuje XTTS dla prezentacji.",
        "needs_gpu": True,
    },
    "xtts": {
        "label": "XTTS-v2 (Coqui TTS — klonowanie głosu, fallback)",
        "required": False,
        "check": lambda: _importable("TTS") or _importable("tts"),
        "install": _install_xtts,
        "note": "Używany jako fallback gdy Chatterbox niedostępny. Wymaga GPU 4 GB+ VRAM.",
        "needs_gpu": True,
    },
    "torch": {
        "label": "PyTorch + CUDA (GPU support)",
        "required": False,
        "check": lambda: _importable("torch") and _torch_cuda(),
        "install": _install_torch,
        "note": "Wymagane dla XTTS, WhisperX, AnimateDiff, Demucs.",
        "needs_gpu": True,
    },
    "whisper": {
        "label": "WhisperX (transkrypcja + diaryzacja mówców)",
        "required": False,
        "check": lambda: _importable("whisperx") or _importable("whisper"),
        "install": _install_whisper,
        "note": "Transkrypcja audio z podziałem na mówców.",
        "needs_gpu": True,
    },
    "demucs": {
        "label": "Demucs (separacja ścieżek audio: wokale / bębny / bas)",
        "required": False,
        "check": lambda: _importable("demucs"),
        "install": lambda: _pip(["demucs"]),
        "note": "Izolacja wokali z nagrania audio.",
        "needs_gpu": True,
    },
    "diffusers": {
        "label": "Diffusers + Transformers (WAN 2.1 / AnimateDiff / generowanie wideo)",
        "required": False,
        "check": lambda: _importable("diffusers"),
        "install": _install_diffusers,
        "note": "Generowanie wideo AI. Wymaga GPU 8 GB+ VRAM.",
        "needs_gpu": True,
    },
    "opencv": {
        "label": "OpenCV (przetwarzanie klatek wideo)",
        "required": False,
        "check": lambda: _importable("cv2"),
        "install": lambda: _pip(["opencv-python-headless"]),
        "needs_gpu": False,
    },
    "deepfilter": {
        "label": "DeepFilterNet (redukcja szumów audio)",
        "required": False,
        "check": lambda: _importable("df"),
        "install": lambda: _pip(["deepfilternet"]),
        "needs_gpu": False,
    },
    "liveportrait": {
        "label": "LivePortrait (animacja twarzy / avatar)",
        "required": False,
        "check": lambda: (Path.home() / "LivePortrait" / "inference.py").exists(),
        "install": _install_liveportrait,
        "note": "Klonuje ruch twarzy na zdjęcie. Wymaga GPU 4 GB+ VRAM.",
        "needs_gpu": True,
    },
    "rvc": {
        "label": "RVC (konwersja głosu) — izolowany venv /opt/rvc-venv",
        "required": False,
        "check": lambda: Path("/opt/rvc-venv/bin/python3").exists(),
        "install": _install_rvc_venv,
        "note": "Wymaga Python 3.11. Tworzy /opt/rvc-venv z numpy<2.",
        "needs_gpu": True,
    },
}

# ── Check GPU ─────────────────────────────────────────────────────────────────

def check_gpu() -> bool:
    HDR("Wykrywanie GPU")
    if _importable("torch"):
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory // (1024 ** 2)
            OK(f"GPU NVIDIA: {name} ({vram} MB VRAM)")
            return True
        else:
            WARN("PyTorch zainstalowany, ale CUDA niedostępna.")
            return False
    elif _has_nvidia():
        OK("NVIDIA GPU wykryte (nvidia-smi). PyTorch niezainstalowany jeszcze.")
        return True
    else:
        WARN("Brak NVIDIA GPU — komponenty GPU zostaną pominięte.")
        return False


# ── Status report ─────────────────────────────────────────────────────────────

def show_status():
    HDR("Status instalacji")
    all_ok = True
    for key, comp in COMPONENTS.items():
        installed = comp["check"]()
        label = comp["label"]
        note = comp.get("note", "")
        if installed:
            OK(label)
        elif comp.get("required"):
            ERR(f"{label}  ← WYMAGANE")
            all_ok = False
        else:
            print(f"  ⬜  {label}" + (f"  ({note})" if note else ""))
    # audiocraft note
    WARN("MusicGen/audiocraft: pominięte (wymaga torch==2.1.0, niekompatybilne z torch>=2.8)")
    return all_ok


# ── Build frontend ────────────────────────────────────────────────────────────

def build_frontend():
    HDR("Budowanie frontendu (React)")
    frontend_dir = Path(__file__).parent / "frontend"
    if not (frontend_dir / "package.json").exists():
        ERR("Nie znaleziono frontend/package.json")
        return False
    INF("npm install…")
    if not _run(["npm", "install", "--silent"], cwd=str(frontend_dir)):
        ERR("npm install nie powiodło się")
        return False
    INF("npm run build…")
    if not _run(["npm", "run", "build"], cwd=str(frontend_dir)):
        ERR("npm run build nie powiodło się")
        return False
    OK("Frontend zbudowany → frontend/dist/")
    return True


# ── Systemd service ───────────────────────────────────────────────────────────

def install_service():
    if OS != "Linux":
        INF(f"Serwis systemd niedostępny na {OS}.")
        INF("Uruchom: cd backend && uvicorn main:app --host 0.0.0.0 --port 47821")
        return
    HDR("Konfiguracja serwisu systemd")
    backend_dir = Path(__file__).parent / "backend"
    venv_python = backend_dir / ".venv" / "bin" / "python3"
    user = os.environ.get("SUDO_USER") or os.environ.get("USER") or "root"
    site_pkgs = backend_dir / ".venv/lib/python3.12/site-packages"
    torch_lib = site_pkgs / "torch/lib"
    torchaudio_lib = site_pkgs / "torchaudio/lib"
    # Use system python3.12 directly — venv symlink causes Permission denied in systemd
    import shutil
    py312 = shutil.which("python3.12") or str(venv_python)
    service_content = f"""[Unit]
Description=Voice Studio AI (FastAPI + React SPA)
After=network.target

[Service]
User={user}
WorkingDirectory={backend_dir}
Environment=PYTHONPATH={site_pkgs}
Environment=LD_LIBRARY_PATH={torch_lib}:{torchaudio_lib}
ExecStart={py312} -m uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1 --access-log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    svc_path = Path("/etc/systemd/system/voice-studio.service")
    try:
        svc_path.write_text(service_content)
        _run(["systemctl", "daemon-reload"])
        _run(["systemctl", "enable", "voice-studio"])
        _run(["systemctl", "restart", "voice-studio"])
        OK("Serwis voice-studio.service uruchomiony i włączony przy starcie")
        INF("Sprawdź status: systemctl status voice-studio")
    except PermissionError:
        ERR("Brak uprawnień root — uruchom jako sudo albo skonfiguruj ręcznie")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Voice Studio AI Installer")
    parser.add_argument("--check", action="store_true", help="Tylko sprawdź co jest zainstalowane")
    parser.add_argument("--cpu", action="store_true", help="Pomiń komponenty GPU")
    parser.add_argument("--service", action="store_true", help="Skonfiguruj serwis systemd")
    args = parser.parse_args()

    print(_c("1;35", "\n" + "═" * 60))
    print(_c("1;35", "   🎙  Voice & Video Studio AI — Instalator  🎬"))
    print(_c("1;35", "═" * 60))
    print(f"   System: {OS} | Python: {sys.version.split()[0]} | Arch: {platform.machine()}")
    print()

    if args.service:
        install_service()
        return

    has_gpu = check_gpu()
    all_ok = show_status()

    if args.check:
        sys.exit(0 if all_ok else 1)

    # Domyślnie instaluj wszystko — bez pytania
    # (--cpu pomija komponenty wymagające GPU)
    to_install = []
    for key, comp in COMPONENTS.items():
        if comp["check"]():
            continue  # już zainstalowane
        if comp.get("needs_gpu") and (args.cpu or not has_gpu):
            INF(f"Pomijam (brak GPU): {comp['label']}")
            continue
        to_install.append(key)

    if not to_install:
        OK("Nic do zainstalowania — wszystko gotowe!")
    else:
        # torch musi być zainstalowany przed xtts/whisper/demucs/diffusers
        if "torch" in to_install:
            to_install.remove("torch")
            to_install.insert(0, "torch")

        HDR(f"Instalowanie {len(to_install)} komponentów…")
        for key in to_install:
            comp = COMPONENTS[key]
            INF(f"Instalowanie: {comp['label']}…")
            ok = comp["install"]()
            if ok or comp["check"]():
                OK(comp["label"])
            else:
                ERR(f"Nie udało się zainstalować: {comp['label']}")

    HDR("Budowanie frontendu")
    if _check_node():
        build_frontend()
    else:
        ERR("Node.js niedostępny — pomiń build frontendu lub zainstaluj Node.js 20+")

    if OS == "Linux" and os.geteuid() == 0:
        HDR("Serwis systemd")
        install_service()
    else:
        INF("Uruchom backend: cd backend && uvicorn main:app --host 0.0.0.0 --port 47821")

    HDR("Gotowe!")
    show_status()
    print()
    print(_c("32", "  🌐  Otwórz: http://localhost:47821"))
    print()


if __name__ == "__main__":
    main()
