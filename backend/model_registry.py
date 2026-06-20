"""
Model Registry — centralny katalog modeli AI dla Voice Studio.

Każdy model ma:
  - wymagania VRAM
  - informacje o instalacji
  - kategorię (tts, avatar, video, transcription, music)
  - ocenę jakości i szybkości
"""
from __future__ import annotations
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger("voice_studio.models")

# Ścieżka do pliku konfiguracji aktywnych modeli
_env_data_dir = os.environ.get("VOICE_STUDIO_DATA_DIR", "")
_CONFIG_DIR = Path(_env_data_dir) if _env_data_dir else Path(__file__).resolve().parent
MODEL_CONFIG_FILE = _CONFIG_DIR / "model_config.json"

# ── Katalog modeli ────────────────────────────────────────────────────────────

MODEL_CATALOG: dict[str, dict] = {

    # ════════════════════════════════════════════════
    # TTS — synteza mowy
    # ════════════════════════════════════════════════
    "edge_tts": {
        "id": "edge_tts",
        "category": "tts",
        "name": "Edge TTS (Microsoft)",
        "description": "Szybki TTS online, ~50 głosów PL/EN. Zero VRAM.",
        "vram_gb": 0,
        "ram_gb": 0.2,
        "disk_gb": 0,
        "quality": 2,         # 1=słaba … 5=doskonała
        "speed": 5,           # 1=wolna … 5=natychmiastowa
        "clone_voice": False,
        "languages": ["pl", "en", "de", "fr", "es", "it", "ru"],
        "install_cmd": None,  # zawsze dostępny
        "installed_check": "edge_tts",  # import name
        "recommended_for": [],
    },
    "xtts_v2": {
        "id": "xtts_v2",
        "category": "tts",
        "name": "XTTS v2 (Coqui)",
        "description": "Klonowanie głosu z 6s próbki. Emocje, akcent, wielojęzyczność.",
        "vram_gb": 4,
        "ram_gb": 6,
        "disk_gb": 2.5,
        "quality": 4,
        "speed": 3,
        "clone_voice": True,
        "languages": ["pl", "en", "de", "fr", "es", "it", "pt", "ru", "zh", "ja"],
        "install_cmd": "pip install coqui-tts>=0.25",
        "installed_check": "TTS",
        "recommended_for": ["8gb_vram"],
    },
    "f5_tts": {
        "id": "f5_tts",
        "category": "tts",
        "name": "F5-TTS (SWivid)",
        "description": "Najlepsza jakość klonowania głosu. Wymaga 6 GB VRAM. Zero artefaktów.",
        "vram_gb": 6,
        "ram_gb": 8,
        "disk_gb": 3,
        "quality": 5,
        "speed": 3,
        "clone_voice": True,
        "languages": ["en", "zh"],
        "install_cmd": "pip install git+https://github.com/SWivid/F5-TTS.git",
        "install_script": "install_f5tts.sh",
        "installed_check": "f5_tts",
        "recommended_for": ["12gb_vram", "24gb_vram"],
    },
    "chatterbox": {
        "id": "chatterbox",
        "category": "tts",
        "name": "Chatterbox (Resemble AI)",
        "description": "Emocjonalny TTS z klonowaniem. Najlepsza ekspresja w języku EN.",
        "vram_gb": 4,
        "ram_gb": 6,
        "disk_gb": 2,
        "quality": 4,
        "speed": 3,
        "clone_voice": True,
        "languages": ["en"],
        "install_cmd": None,  # oddzielny venv — sprawdzany osobno
        "installed_check": "_chatterbox_venv",
        "recommended_for": ["8gb_vram"],
    },
    "cosyvoice2": {
        "id": "cosyvoice2",
        "category": "tts",
        "name": "CosyVoice 2 (Alibaba)",
        "description": "Wielojęzyczny TTS z 3s klonowaniem. Świetny dla PL/EN/DE.",
        "vram_gb": 6,
        "ram_gb": 8,
        "disk_gb": 4,
        "quality": 5,
        "speed": 3,
        "clone_voice": True,
        "languages": ["pl", "en", "zh", "ja", "ko", "de", "fr"],
        "install_cmd": "pip install git+https://github.com/FunAudioLLM/CosyVoice.git",
        "install_script": "install_cosyvoice.sh",
        "installed_check": "cosyvoice",
        "recommended_for": ["12gb_vram", "24gb_vram"],
    },

    # ════════════════════════════════════════════════
    # AVATAR / LIP-SYNC
    # ════════════════════════════════════════════════
    "sadtalker": {
        "id": "sadtalker",
        "category": "avatar",
        "name": "SadTalker",
        "description": "Realistyczna animacja twarzy z audio. Dobry dla zdjęć.",
        "vram_gb": 4,
        "ram_gb": 8,
        "disk_gb": 8,
        "quality": 3,
        "speed": 3,
        "install_script": "install_sadtalker.sh",
        "installed_check": "_sadtalker_dir",
        "recommended_for": ["8gb_vram"],
    },
    "echomimic": {
        "id": "echomimic",
        "category": "avatar",
        "name": "EchoMimic (BadToBest)",
        "description": "Diffusion-based lip-sync. Płynna animacja ust, naturalne ruchy.",
        "vram_gb": 8,
        "ram_gb": 12,
        "disk_gb": 12,
        "quality": 4,
        "speed": 2,
        "install_script": "install_echomimic.sh",
        "installed_check": "_echomimic_dir",
        "recommended_for": ["12gb_vram"],
    },
    "liveportrait": {
        "id": "liveportrait",
        "category": "avatar",
        "name": "LivePortrait (Kuaishou)",
        "description": "Najlepsza jakość animacji portretowej. Ekspresja, obrót głowy, mrugnięcia.",
        "vram_gb": 4,
        "ram_gb": 8,
        "disk_gb": 4,
        "quality": 5,
        "speed": 4,
        "install_script": "install_liveportrait.sh",
        "installed_check": "_liveportrait_dir",
        "recommended_for": ["8gb_vram", "12gb_vram", "24gb_vram"],
        "note": "Polecany jako domyślny — szybki i bardzo dobra jakość",
    },
    "musetalk": {
        "id": "musetalk",
        "category": "avatar",
        "name": "MuseTalk (Tencent)",
        "description": "Realtime lip-sync. Najszybszy spośród modeli dyfuzyjnych. 30fps.",
        "vram_gb": 6,
        "ram_gb": 10,
        "disk_gb": 8,
        "quality": 4,
        "speed": 5,
        "install_script": "install_musetalk.sh",
        "installed_check": "_musetalk_dir",
        "recommended_for": ["12gb_vram", "24gb_vram"],
    },
    "wav2lip": {
        "id": "wav2lip",
        "category": "avatar",
        "name": "Wav2Lip (LipGAN)",
        "description": "Klasyczny lip-sync. Działa na CPU, minimalne wymagania.",
        "vram_gb": 2,
        "ram_gb": 4,
        "disk_gb": 1,
        "quality": 2,
        "speed": 4,
        "install_script": "install_wav2lip.sh",
        "installed_check": "_wav2lip_dir",
        "recommended_for": ["cpu", "4gb_vram"],
    },

    # ════════════════════════════════════════════════
    # VIDEO GENERATION
    # ════════════════════════════════════════════════
    "animatediff": {
        "id": "animatediff",
        "category": "video",
        "name": "AnimateDiff v1.5",
        "description": "SD 1.5 + motion adapter. Szybki, działa na 8 GB VRAM.",
        "vram_gb": 8,
        "ram_gb": 12,
        "disk_gb": 6,
        "quality": 3,
        "speed": 3,
        "install_cmd": "pip install diffusers",
        "installed_check": "_animatediff_weights",
        "recommended_for": ["8gb_vram"],
    },
    "wan21": {
        "id": "wan21",
        "category": "video",
        "name": "WAN 2.1 (1.3B)",
        "description": "Chiński model wideo open-source. Płynny ruch, dobre tekstury.",
        "vram_gb": 10,
        "ram_gb": 16,
        "disk_gb": 5,
        "quality": 4,
        "speed": 2,
        "install_cmd": "pip install diffusers",
        "installed_check": "_wan21_weights",
        "recommended_for": ["12gb_vram"],
    },
    "cogvideox_5b": {
        "id": "cogvideox_5b",
        "category": "video",
        "name": "CogVideoX 5B (THUDM)",
        "description": "Najlepsza jakość wideo open-source. Wymaga 24 GB VRAM lub CPU offload.",
        "vram_gb": 24,
        "ram_gb": 32,
        "disk_gb": 18,
        "quality": 5,
        "speed": 1,
        "install_cmd": "pip install diffusers",
        "installed_check": "_cogvideox_weights",
        "recommended_for": ["24gb_vram"],
        "supports_cpu_offload": True,
        "vram_with_offload_gb": 12,
    },
    "mochi_1": {
        "id": "mochi_1",
        "category": "video",
        "name": "Mochi 1 (Genmo)",
        "description": "Płynne ruchy kamery, fotorealizm. 24 GB VRAM lub z offloadem 16 GB.",
        "vram_gb": 24,
        "ram_gb": 32,
        "disk_gb": 20,
        "quality": 5,
        "speed": 1,
        "install_cmd": "pip install diffusers",
        "installed_check": "_mochi_weights",
        "recommended_for": ["24gb_vram"],
        "supports_cpu_offload": True,
        "vram_with_offload_gb": 16,
    },

    # ════════════════════════════════════════════════
    # TRANSKRYPCJA
    # ════════════════════════════════════════════════
    "whisper_large_v3": {
        "id": "whisper_large_v3",
        "category": "transcription",
        "name": "Whisper large-v3",
        "description": "Najdokładniejszy model OpenAI. 99 języków, diaryzacja głośników.",
        "vram_gb": 5,
        "ram_gb": 10,
        "disk_gb": 3,
        "quality": 5,
        "speed": 2,
        "install_cmd": "pip install openai-whisper",
        "installed_check": "_whisper_large_v3_weights",
        "recommended_for": ["8gb_vram", "12gb_vram"],
    },
    "whisper_turbo": {
        "id": "whisper_turbo",
        "category": "transcription",
        "name": "Whisper large-v3-turbo",
        "description": "8× szybszy niż large-v3, niemal ta sama dokładność. Idealny kompromis.",
        "vram_gb": 3,
        "ram_gb": 6,
        "disk_gb": 1.5,
        "quality": 4,
        "speed": 4,
        "install_cmd": "pip install openai-whisper",
        "installed_check": "_whisper_turbo_weights",
        "recommended_for": ["6gb_vram", "8gb_vram", "12gb_vram"],
        "note": "Zalecany domyślny",
    },
    "whisper_medium": {
        "id": "whisper_medium",
        "category": "transcription",
        "name": "Whisper medium",
        "description": "Szybki, niewielki (1.4 GB). Dobry dla CPU lub małego VRAM.",
        "vram_gb": 2,
        "ram_gb": 4,
        "disk_gb": 1.5,
        "quality": 3,
        "speed": 4,
        "install_cmd": "pip install openai-whisper",
        "installed_check": "_whisper_medium_weights",
        "recommended_for": ["cpu", "4gb_vram"],
    },
    "parakeet": {
        "id": "parakeet",
        "category": "transcription",
        "name": "Parakeet TDT 1.1B (NVIDIA)",
        "description": "Najszybszy model transkrypcji. Tylko angielski. 40× real-time.",
        "vram_gb": 4,
        "ram_gb": 6,
        "disk_gb": 2,
        "quality": 4,
        "speed": 5,
        "install_cmd": "pip install nemo_toolkit[asr]",
        "installed_check": "nemo_toolkit",
        "recommended_for": ["8gb_vram", "12gb_vram"],
        "languages": ["en"],
    },

    # ════════════════════════════════════════════════
    # MUZYKA
    # ════════════════════════════════════════════════
    "musicgen_small": {
        "id": "musicgen_small",
        "category": "music",
        "name": "MusicGen Small (300M)",
        "description": "Szybki, 8 GB RAM. Prosta muzyka do 30 sekund.",
        "vram_gb": 2,
        "ram_gb": 4,
        "disk_gb": 1,
        "quality": 3,
        "speed": 4,
        "install_cmd": "pip install audiocraft",
        "installed_check": "audiocraft",
        "recommended_for": ["4gb_vram"],
    },
    "musicgen_medium": {
        "id": "musicgen_medium",
        "category": "music",
        "name": "MusicGen Medium (1.5B)",
        "description": "Dobra jakość, struktury muzyczne. 8 GB VRAM.",
        "vram_gb": 6,
        "ram_gb": 10,
        "disk_gb": 3,
        "quality": 4,
        "speed": 3,
        "install_cmd": "pip install audiocraft",
        "installed_check": "audiocraft",
        "recommended_for": ["8gb_vram", "12gb_vram"],
        "note": "Zalecany domyślny",
    },
    "musicgen_large": {
        "id": "musicgen_large",
        "category": "music",
        "name": "MusicGen Large (3.3B)",
        "description": "Najlepsza jakość muzyczna. Wymaga 12 GB VRAM.",
        "vram_gb": 10,
        "ram_gb": 16,
        "disk_gb": 6,
        "quality": 5,
        "speed": 2,
        "install_cmd": "pip install audiocraft",
        "installed_check": "audiocraft",
        "recommended_for": ["12gb_vram", "24gb_vram"],
    },
    "stable_audio": {
        "id": "stable_audio",
        "category": "music",
        "name": "Stable Audio Open",
        "description": "Stability AI — stereo, 44kHz, do 47s. Świetna jakość.",
        "vram_gb": 8,
        "ram_gb": 12,
        "disk_gb": 4,
        "quality": 5,
        "speed": 3,
        "install_cmd": "pip install stable-audio-tools",
        "installed_check": "stable_audio_tools",
        "recommended_for": ["12gb_vram", "24gb_vram"],
    },
}

# Domyślne modele dla każdej kategorii (wg profilu sprzętowego)
HARDWARE_PROFILES = {
    "cpu":       {"tts": "edge_tts",       "avatar": "wav2lip",    "video": None,          "transcription": "whisper_medium", "music": "musicgen_small"},
    "4gb_vram":  {"tts": "edge_tts",       "avatar": "wav2lip",    "video": None,          "transcription": "whisper_medium", "music": "musicgen_small"},
    "6gb_vram":  {"tts": "xtts_v2",        "avatar": "sadtalker",  "video": "animatediff", "transcription": "whisper_turbo",  "music": "musicgen_small"},
    "8gb_vram":  {"tts": "xtts_v2",        "avatar": "sadtalker",  "video": "animatediff", "transcription": "whisper_turbo",  "music": "musicgen_medium"},
    "12gb_vram": {"tts": "xtts_v2",        "avatar": "echomimic",  "video": "wan21",       "transcription": "whisper_large_v3","music": "musicgen_medium"},
    "24gb_vram": {"tts": "cosyvoice2",     "avatar": "musetalk",   "video": "cogvideox_5b","transcription": "whisper_large_v3","music": "musicgen_large"},
}


def detect_hardware_profile(vram_gb: float) -> str:
    """Zwraca profil sprzętowy na podstawie VRAM."""
    if vram_gb <= 0:
        return "cpu"
    elif vram_gb < 5:
        return "4gb_vram"
    elif vram_gb < 7:
        return "6gb_vram"
    elif vram_gb < 10:
        return "8gb_vram"
    elif vram_gb < 20:
        return "12gb_vram"
    else:
        return "24gb_vram"


# ── Persistowanie konfiguracji ───────────────────────────────────────────────

def _default_config() -> dict:
    return {
        "active": {
            "tts": "xtts_v2",
            "avatar": "echomimic",
            "video": "animatediff",
            "transcription": "whisper_large_v3",
            "music": "musicgen_small",
        }
    }


def load_model_config() -> dict:
    """Wczytuje konfigurację modeli z pliku JSON."""
    try:
        if MODEL_CONFIG_FILE.exists():
            return json.loads(MODEL_CONFIG_FILE.read_text())
    except Exception as e:
        logger.warning("Błąd wczytania konfiguracji modeli: %s", e)
    return _default_config()


def save_model_config(cfg: dict) -> None:
    """Zapisuje konfigurację modeli do pliku JSON."""
    try:
        MODEL_CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error("Błąd zapisu konfiguracji modeli: %s", e)


def get_active_models() -> dict[str, str]:
    """Zwraca słownik {kategoria: model_id} aktywnych modeli."""
    return load_model_config().get("active", _default_config()["active"])


def set_active_model(category: str, model_id: str) -> None:
    """Ustawia aktywny model dla danej kategorii."""
    if model_id not in MODEL_CATALOG:
        raise ValueError(f"Nieznany model: {model_id}")
    m = MODEL_CATALOG[model_id]
    if m["category"] != category:
        raise ValueError(f"Model {model_id} jest kategorii {m['category']}, nie {category}")
    cfg = load_model_config()
    cfg.setdefault("active", {})[category] = model_id
    save_model_config(cfg)


_CATEGORY_FALLBACKS: dict[str, str] = {
    "tts": "edge_tts",
    "avatar": "wav2lip",
    "video": None,
    "transcription": "whisper_medium",
    "music": "musicgen_small",
}


def _best_installed_for_category(category: str, preferred_id: str | None) -> str | None:
    """Zwraca preferred_id jeśli zainstalowany, inaczej najlepszy zainstalowany fallback."""
    if preferred_id and is_model_installed(preferred_id):
        return preferred_id
    # fallback: szukaj jakiegokolwiek zainstalowanego w tej kategorii (wg jakości malejąco)
    candidates = sorted(
        [m for m in MODEL_CATALOG.values() if m["category"] == category],
        key=lambda m: m.get("quality", 0),
        reverse=True,
    )
    for m in candidates:
        if is_model_installed(m["id"]):
            return m["id"]
    return _CATEGORY_FALLBACKS.get(category)


def auto_configure_for_hardware(vram_gb: float) -> dict:
    """Automatycznie dobiera modele do sprzętu i zapisuje konfigurację."""
    profile = detect_hardware_profile(vram_gb)
    recommended = HARDWARE_PROFILES.get(profile, HARDWARE_PROFILES["cpu"])
    cfg = load_model_config()
    configured: dict[str, str | None] = {}
    for category, model_id in recommended.items():
        best = _best_installed_for_category(category, model_id)
        cfg.setdefault("active", {})[category] = best
        configured[category] = best
    save_model_config(cfg)
    return {"profile": profile, "configured": configured}


# ── Sprawdzanie instalacji modeli ─────────────────────────────────────────────

def _check_import(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except ImportError:
        return False


def _data_subdir(name: str) -> list:
    candidates = [Path.home() / name, Path("/opt") / name]
    if _env_data_dir:
        candidates.append(Path(_env_data_dir) / name)
    return candidates


def _check_sadtalker_dir() -> bool:
    return any(d.exists() and (d / "inference.py").exists() for d in _data_subdir("SadTalker"))


def _check_echomimic_dir() -> bool:
    return any(d.exists() and (d / "infer_audio2vid.py").exists() for d in _data_subdir("EchoMimic"))


def _check_liveportrait_dir() -> bool:
    return any(d.exists() for d in _data_subdir("LivePortrait"))


def _check_musetalk_dir() -> bool:
    return any(d.exists() for d in _data_subdir("MuseTalk"))


def _check_wav2lip_dir() -> bool:
    return any(d.exists() for d in _data_subdir("Wav2Lip"))


def _check_chatterbox_venv() -> bool:
    venv = Path(__file__).parent / ".chatterbox-venv"
    return (venv / "bin" / "python").exists()


_HF_CACHE = Path.home() / ".cache" / "huggingface" / "hub"


def _hf_model_cached(*repo_prefixes: str) -> bool:
    """True jeśli dowolny z podanych repo ID jest w HuggingFace cache."""
    if not _HF_CACHE.exists():
        return False
    cached = {d.name for d in _HF_CACHE.iterdir() if d.is_dir()}
    for prefix in repo_prefixes:
        slug = "models--" + prefix.replace("/", "--")
        if slug in cached:
            return True
    return False


def _check_animatediff_weights() -> bool:
    return _hf_model_cached(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        "emilianJR/epiCRealism",
        "SG161222/Realistic_Vision_V6.0_B1_noVAE",
    )


def _check_wan21_weights() -> bool:
    return _hf_model_cached("Wan-AI/Wan2.1-T2V-1.3B", "Wan-AI/Wan2.1-T2V-14B")


def _check_cogvideox_weights() -> bool:
    return _hf_model_cached("THUDM/CogVideoX-5b", "THUDM/CogVideoX1.5-5b")


def _check_mochi_weights() -> bool:
    return _hf_model_cached("genmo/mochi-1-preview")


def _check_whisper_large_v3_weights() -> bool:
    pt = Path.home() / ".cache" / "whisper" / "large-v3.pt"
    hf = _hf_model_cached("openai/whisper-large-v3")
    return pt.exists() or hf


def _check_whisper_turbo_weights() -> bool:
    pt = Path.home() / ".cache" / "whisper" / "large-v3-turbo.pt"
    hf = _hf_model_cached("openai/whisper-large-v3-turbo")
    return pt.exists() or hf


def _check_whisper_medium_weights() -> bool:
    pt = Path.home() / ".cache" / "whisper" / "medium.pt"
    hf = _hf_model_cached("openai/whisper-medium")
    return pt.exists() or hf


_INSTALL_CHECKERS = {
    "edge_tts":                  lambda: _check_import("edge_tts"),
    "TTS":                       lambda: _check_import("TTS"),
    "f5_tts":                    lambda: _check_import("f5_tts"),
    "_chatterbox_venv":          lambda: _check_chatterbox_venv(),
    "cosyvoice":                 lambda: _check_import("cosyvoice"),
    "_sadtalker_dir":            lambda: _check_sadtalker_dir(),
    "_echomimic_dir":            lambda: _check_echomimic_dir(),
    "_liveportrait_dir":         lambda: _check_liveportrait_dir(),
    "_musetalk_dir":             lambda: _check_musetalk_dir(),
    "_wav2lip_dir":              lambda: _check_wav2lip_dir(),
    "_animatediff_weights":      lambda: _check_animatediff_weights(),
    "_wan21_weights":            lambda: _check_wan21_weights(),
    "_cogvideox_weights":        lambda: _check_cogvideox_weights(),
    "_mochi_weights":            lambda: _check_mochi_weights(),
    "_whisper_large_v3_weights": lambda: _check_whisper_large_v3_weights(),
    "_whisper_turbo_weights":    lambda: _check_whisper_turbo_weights(),
    "_whisper_medium_weights":   lambda: _check_whisper_medium_weights(),
    "audiocraft":                lambda: _check_import("audiocraft"),
    "stable_audio_tools":        lambda: _check_import("stable_audio_tools"),
    "nemo_toolkit":              lambda: _check_import("nemo"),
}


def is_model_installed(model_id: str) -> bool:
    """Sprawdza czy model jest zainstalowany."""
    m = MODEL_CATALOG.get(model_id)
    if not m:
        return False
    check_key = m.get("installed_check")
    if not check_key:
        return True  # brak sprawdzenia = zawsze dostępny
    checker = _INSTALL_CHECKERS.get(check_key)
    if not checker:
        return False
    try:
        return checker()
    except Exception:
        return False


def get_model_status_all(vram_total_gb: float = 0) -> list[dict]:
    """Zwraca pełny status wszystkich modeli z rekomendacjami."""
    profile = detect_hardware_profile(vram_total_gb)
    active = get_active_models()
    result = []

    for model_id, m in MODEL_CATALOG.items():
        installed = is_model_installed(model_id)
        fits_vram = m["vram_gb"] <= vram_total_gb or m["vram_gb"] == 0
        supports_offload = m.get("supports_cpu_offload", False)
        fits_with_offload = supports_offload and m.get("vram_with_offload_gb", 999) <= vram_total_gb

        result.append({
            **m,
            "installed": installed,
            "active": active.get(m["category"]) == model_id,
            "fits_hardware": fits_vram or fits_with_offload,
            "hardware_profile": profile,
            "recommended": profile in m.get("recommended_for", []),
            "quality_stars": "⭐" * m.get("quality", 0),
            "speed_stars": "⚡" * m.get("speed", 0),
        })

    return result
