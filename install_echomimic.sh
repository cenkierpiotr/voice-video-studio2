#!/bin/bash
# ============================================================
#  Instalacja EchoMimic — diffusion talking head dla Voice Studio
#  Uruchom: bash install_echomimic.sh
#
#  Wymagania:
#   - NVIDIA GPU, min. 10 GB VRAM (12 GB zalecane)
#   - CUDA 12.x
#   - ~15 GB miejsca (repo + wagi HuggingFace)
#
#  Po instalacji: sudo systemctl restart voice-studio
# ============================================================
set -e

ECHOMIMIC_DIR="${ECHOMIMIC_DIR:-$HOME/EchoMimic}"
VENV_DIR="${VENV_DIR:-$HOME/echomimic-env}"

echo "============================================================"
echo "  EchoMimic — diffusion talking head"
echo "  Repo:  $ECHOMIMIC_DIR"
echo "  Venv:  $VENV_DIR"
echo "============================================================"

# ── 1. Klonuj repozytorium ───────────────────────────────────
if [ -d "$ECHOMIMIC_DIR/.git" ]; then
    echo "[1/5] Aktualizuję EchoMimic..."
    git -C "$ECHOMIMIC_DIR" pull origin main
else
    echo "[1/5] Klonuję EchoMimic..."
    git clone https://github.com/BadToBest/EchoMimic.git "$ECHOMIMIC_DIR"
fi

# ── 2. Środowisko Python ─────────────────────────────────────
echo "[2/5] Tworzę venv: $VENV_DIR (Python 3.12)"
mkdir -p "$(dirname "$VENV_DIR")"
# PyTorch requires Python <=3.12; use explicit version if system python is newer
PYTHON_BIN=$(which python3.12 2>/dev/null || which python3.11 2>/dev/null || which python3)
echo "  Używam: $PYTHON_BIN ($($PYTHON_BIN --version))"
$PYTHON_BIN -m venv "$VENV_DIR"
VENV_PY="$VENV_DIR/bin/python3"
VENV_PIP="$VENV_DIR/bin/pip"

$VENV_PIP install --quiet --upgrade pip

echo "[2/5] Instaluję PyTorch + CUDA 12.1..."
$VENV_PIP install --quiet \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

echo "[2/5] Instaluję zależności EchoMimic..."
if [ -f "$ECHOMIMIC_DIR/requirements.txt" ]; then
    $VENV_PIP install --quiet -r "$ECHOMIMIC_DIR/requirements.txt"
fi
# Doinstaluj co może brakować
$VENV_PIP install --quiet \
    "numpy<2" \
    "huggingface_hub>=0.23,<0.24" \
    "diffusers==0.27.2" \
    transformers \
    accelerate \
    omegaconf \
    einops \
    "moviepy==1.0.3" \
    imageio \
    imageio-ffmpeg \
    opencv-python-headless \
    pillow \
    tqdm \
    facenet-pytorch \
    insightface \
    onnxruntime-gpu

# ── 3. Pobierz wagi z HuggingFace ────────────────────────────
echo "[3/5] Pobieram wagi EchoMimic z HuggingFace (~10 GB)..."
WEIGHTS_DIR="$ECHOMIMIC_DIR/pretrained_weights"
mkdir -p "$WEIGHTS_DIR"

$VENV_PY - <<PYEOF
import os
from pathlib import Path
from huggingface_hub import snapshot_download

weights_dir = Path("$WEIGHTS_DIR")
weights_dir.mkdir(parents=True, exist_ok=True)

# 1. Główne wagi EchoMimic (denoising_unet, reference_unet, face_locator, motion_module, whisper)
print("  Pobieranie EchoMimic checkpoints...")
snapshot_download(
    repo_id="BadToBest/EchoMimic",
    local_dir=str(weights_dir),
    ignore_patterns=["*.git*", "*.md", "*.txt"],
)

# 2. Base diffusion model (wymagany przez EchoMimic jako reference UNet backbone)
print("  Pobieranie sd-image-variations-diffusers...")
snapshot_download(
    repo_id="lambdalabs/sd-image-variations-diffusers",
    local_dir=str(weights_dir / "sd-image-variations-diffusers"),
    ignore_patterns=["*.git*", "*.md", "*.txt", "*.msgpack", "*.h5", "flax_model*"],
)

# 3. VAE
print("  Pobieranie sd-vae-ft-mse...")
snapshot_download(
    repo_id="stabilityai/sd-vae-ft-mse",
    local_dir=str(weights_dir / "sd-vae-ft-mse"),
    ignore_patterns=["*.git*", "*.md", "*.txt"],
)

print("  Wagi pobrane!")
PYEOF

# ── 4. CPU offload patch ──────────────────────────────────────
echo "[4/5] Aplikuję CPU offload patch (VRAM overflow → RAM)..."
INFER_SCRIPT="$ECHOMIMIC_DIR/infer_audio2vid.py"

# Zastąp pipe.to("cuda") na enable_model_cpu_offload() z flagą env
# Patch: jeśli ECHOMIMIC_CPU_OFFLOAD=1 to użyj offload, domyślnie zostaje na GPU
if ! grep -q "ECHOMIMIC_CPU_OFFLOAD" "$INFER_SCRIPT"; then
    # Backup oryginału
    cp "$INFER_SCRIPT" "${INFER_SCRIPT}.orig"

    python3 - <<PATCHPY
import re

with open("$INFER_SCRIPT", "r") as f:
    content = f.read()

old = '    pipe = pipe.to("cuda", dtype=weight_dtype)'
new = '''    if os.environ.get("ECHOMIMIC_CPU_OFFLOAD", "0") == "1":
        print("[EchoMimic] CPU offload enabled — slower but uses less VRAM")
        pipe.enable_model_cpu_offload()
    else:
        pipe = pipe.to("cuda", dtype=weight_dtype)'''

if old in content:
    content = content.replace(old, new)
    with open("$INFER_SCRIPT", "w") as f:
        f.write(content)
    print("  Patch zastosowany pomyślnie.")
else:
    print("  Nie znaleziono linii do patch — pomiń lub sprawdź ręcznie.")
PATCHPY
else
    echo "  Patch już zastosowany, pomijam."
fi

# ── 5. Test instalacji ────────────────────────────────────────
echo "[5/5] Weryfikacja..."
$VENV_PY -c "
import torch, cv2, diffusers
print(f'  PyTorch:   {torch.__version__}')
print(f'  CUDA:      {torch.cuda.is_available()}')
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_properties(0)
    print(f'  GPU:       {gpu.name}')
    print(f'  VRAM:      {gpu.total_memory // 1024**3} GB')
print(f'  diffusers: {diffusers.__version__}')
print(f'  OpenCV:    {cv2.__version__}')
from pathlib import Path
ok = (Path('$ECHOMIMIC_DIR') / 'infer_audio2vid.py').exists()
print(f'  infer_audio2vid.py: {\"OK\" if ok else \"BRAK!\"}')
w_ok = (Path('$WEIGHTS_DIR') / 'denoising_unet.pth').exists()
print(f'  denoising_unet.pth: {\"OK\" if w_ok else \"BRAK — sprawdź HuggingFace\"}')
sd_ok = (Path('$WEIGHTS_DIR') / 'sd-image-variations-diffusers' / 'unet').exists()
print(f'  sd-image-variations: {\"OK\" if sd_ok else \"BRAK\"}')
"

echo ""
echo "============================================================"
echo " EchoMimic zainstalowany!"
echo ""
echo " Zrestartuj Voice Studio:"
echo "   sudo systemctl restart voice-studio"
echo ""
echo " Sprawdź status:"
echo "   curl http://localhost:47821/api/ai/status | python3 -m json.tool | grep echomimic"
echo ""
echo " Tryb CPU offload (jeśli OOM na GPU):"
echo "   Dodaj do /etc/systemd/system/voice-studio.service:"
echo "   Environment=\"ECHOMIMIC_CPU_OFFLOAD=1\""
echo "   sudo systemctl daemon-reload && sudo systemctl restart voice-studio"
echo ""
echo " UWAGA: Pierwszy render trwa 3-8 min (wczytanie modeli)."
echo "        CPU offload = ~2x wolniej ale działa z każdą ilością VRAM."
echo "============================================================"
