#!/bin/bash
# ============================================================
#  Instalacja SadTalker — lip sync dla Voice Studio AI
#  Uruchom: bash install_sadtalker.sh
#
#  Wymagania:
#   - NVIDIA GPU z CUDA 12.x (min. 4 GB VRAM, 6 GB+ zalecane)
#   - Python 3.10–3.12
#   - ffmpeg (już powinien być)
#   - ~8 GB miejsca na dysku (repo + modele)
#
#  Po instalacji zrestartuj serwis:
#   sudo systemctl restart voice-studio
# ============================================================
set -e

SADTALKER_DIR="${SADTALKER_DIR:-$HOME/SadTalker}"
VENV_DIR="${VENV_DIR:-$HOME/sadtalker-env}"
PYTHON_BASE="${PYTHON_BASE:-python3}"

echo "============================================================"
echo "  SadTalker — lip sync dla Voice Studio AI"
echo "  Repo:  $SADTALKER_DIR"
echo "  Venv:  $VENV_DIR"
echo "============================================================"

# ── 1. Klonuj SadTalker ──────────────────────────────────────
if [ -d "$SADTALKER_DIR/.git" ]; then
    echo "[1/5] Aktualizuję SadTalker..."
    git -C "$SADTALKER_DIR" pull origin main
else
    echo "[1/5] Klonuję SadTalker..."
    git clone https://github.com/OpenTalker/SadTalker.git "$SADTALKER_DIR"
fi

# ── 2. Wirtualne środowisko Python ───────────────────────────
echo "[2/5] Tworzę venv: $VENV_DIR"
mkdir -p "$(dirname "$VENV_DIR")"
$PYTHON_BASE -m venv "$VENV_DIR"
VENV_PY="$VENV_DIR/bin/python3"
VENV_PIP="$VENV_DIR/bin/pip"

# Upgrade pip
$VENV_PIP install --quiet --upgrade pip

echo "[2/5] Instaluję PyTorch z CUDA 12.1..."
$VENV_PIP install --quiet \
    torch torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

echo "[2/5] Instaluję zależności SadTalker..."
$VENV_PIP install --quiet \
    face-alignment==1.4.1 \
    imageio==2.19.3 \
    imageio-ffmpeg==0.4.7 \
    librosa==0.9.2 \
    numba \
    numpy \
    opencv-python-headless \
    scikit-image \
    scipy \
    tqdm \
    pyyaml \
    joblib \
    yacs \
    basicsr \
    facexlib \
    gfpgan

# ── 3. Pobierz wagi modeli ────────────────────────────────────
echo "[3/5] Pobieram wagi modeli SadTalker..."
CKPT_DIR="$SADTALKER_DIR/checkpoints"
GFPGAN_DIR="$SADTALKER_DIR/gfpgan/weights"
mkdir -p "$CKPT_DIR" "$GFPGAN_DIR"

download_if_missing() {
    local dest="$1"
    local url="$2"
    if [ ! -f "$dest" ]; then
        echo "  Pobieranie $(basename "$dest")..."
        wget -q --show-progress -O "$dest" "$url"
    else
        echo "  $(basename "$dest") już istnieje, pomijam."
    fi
}

# Główne wagi SadTalker
BASE_URL="https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc"
download_if_missing "$CKPT_DIR/SadTalker_V0.0.2_256.safetensors" "$BASE_URL/SadTalker_V0.0.2_256.safetensors"
download_if_missing "$CKPT_DIR/SadTalker_V0.0.2_512.safetensors" "$BASE_URL/SadTalker_V0.0.2_512.safetensors"
download_if_missing "$CKPT_DIR/mapping_00109-model.pth.tar"       "$BASE_URL/mapping_00109-model.pth.tar"
download_if_missing "$CKPT_DIR/mapping_00229-model.pth.tar"       "$BASE_URL/mapping_00229-model.pth.tar"

# BFM modele twarzy (potrzebne do animacji 3D)
for zname in BFM_Fitting.zip hub.zip; do
    if [ ! -d "$CKPT_DIR/${zname%.zip}" ] && [ ! -f "$CKPT_DIR/$zname" ]; then
        echo "  Pobieranie $zname..."
        wget -q --show-progress -O "$CKPT_DIR/$zname" "$BASE_URL/$zname"
        unzip -q "$CKPT_DIR/$zname" -d "$CKPT_DIR/" && rm "$CKPT_DIR/$zname"
    fi
done

# ── 4. Wagi GFPGAN (odszumianie twarzy) ──────────────────────
echo "[4/5] Pobieram wagi GFPGAN..."
download_if_missing "$GFPGAN_DIR/detection_Resnet50_Final.pth" \
    "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth"
download_if_missing "$GFPGAN_DIR/parsing_parsenet.pth" \
    "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth"
download_if_missing "$GFPGAN_DIR/GFPGANv1.4.pth" \
    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth"

# ── 5. Test instalacji ────────────────────────────────────────
echo "[5/5] Weryfikacja..."
$VENV_PY -c "
import torch, cv2, face_alignment
print(f'  PyTorch:      {torch.__version__}')
print(f'  CUDA:         {torch.cuda.is_available()}')
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_properties(0)
    print(f'  GPU:          {gpu.name}')
    print(f'  VRAM:         {gpu.total_memory // 1024**3} GB')
print(f'  OpenCV:       {cv2.__version__}')
print(f'  face-align:   OK')
from pathlib import Path
st_ok = (Path('$SADTALKER_DIR') / 'inference.py').exists()
print(f'  inference.py: {\"OK\" if st_ok else \"BRAKUJE!\"}')
"

echo ""
echo "============================================================"
echo " Instalacja zakończona!"
echo ""
echo " Zrestartuj Voice Studio:"
echo "   sudo systemctl restart voice-studio"
echo ""
echo " Sprawdź czy SadTalker jest widoczny w API:"
echo "   curl http://localhost:47821/api/ai/status | python3 -m json.tool | grep sadtalker"
echo ""
echo " UWAGA: Pierwszy render (~30s audio) trwa 3-5 minut."
echo "        Kolejne klipy są szybsze (~1-2 min)."
echo "============================================================"
