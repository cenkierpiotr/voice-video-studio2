#!/usr/bin/env bash
# ============================================================
#  Voice & Video Studio AI — Instalator
#  Działa na: Ubuntu/Debian, macOS, Windows (WSL2)
#
#  Użycie:
#    bash install.sh          — instaluje WSZYSTKO automatycznie
#    bash install.sh --docker — tryb Docker (najprostszy)
#    bash install.sh --cpu    — tylko CPU (bez GPU deps)
# ============================================================
set -euo pipefail
trap 'err "Instalacja przerwana w linii $LINENO."' ERR

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'
BOLD='\033[1m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}${BOLD}  ✔  ${NC}${GREEN}$1${NC}"; }
err()  { echo -e "${RED}${BOLD}  ✘  $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}${BOLD}  !  ${NC}${YELLOW}$1${NC}"; }
hdr()  { echo -e "\n${CYAN}${BOLD}══ $1 ══${NC}"; }

REPO_URL="https://github.com/YOUR_USERNAME/voice-studio.git"
INSTALL_DIR="${VOICE_STUDIO_DIR:-$HOME/voice-studio}"
_CPU_ONLY=false
[[ "${1:-}" == "--cpu" ]] && _CPU_ONLY=true

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  🎙  Voice & Video Studio AI             ║"
echo "  ║      Instalator — wersja 1.1             ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Tryb Docker ───────────────────────────────────────────────
if [[ "${1:-}" == "--docker" ]]; then
  hdr "Tryb Docker"
  command -v docker &>/dev/null || err "Docker nie znaleziony. Zainstaluj: https://docs.docker.com/get-docker/"
  command -v git &>/dev/null || err "Git nie znaleziony."
  if [ ! -d "$INSTALL_DIR/.git" ]; then
    git clone "$REPO_URL" "$INSTALL_DIR"
  else
    git -C "$INSTALL_DIR" pull --ff-only
  fi
  cd "$INSTALL_DIR"
  if command -v nvidia-smi &>/dev/null; then
    echo "  GPU wykryte — uruchamiam z obsługą CUDA..."
    docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
  else
    docker compose up -d
  fi
  ok "Docker uruchomiony!"
  echo -e "  🌐 ${BOLD}http://localhost:47822${NC}"
  exit 0
fi

# ── 1. Wykrywanie OS ──────────────────────────────────────────
hdr "Wykrywanie systemu"
_OS="$(uname -s)"
if [[ "$_OS" == "Linux" ]]; then
  if grep -qi microsoft /proc/version 2>/dev/null; then
    ok "Windows WSL2"
  elif [ -f /etc/debian_version ]; then
    ok "Linux Ubuntu/Debian"
  else
    warn "Linux (nieznana dystrybucja)"
  fi
  PKG_MGR="apt"
elif [[ "$_OS" == "Darwin" ]]; then
  ok "macOS"
  PKG_MGR="brew"
  command -v brew &>/dev/null || err "Homebrew wymagany: https://brew.sh"
else
  err "Nieobsługiwany OS. Użyj WSL2 lub: bash install.sh --docker"
fi

# ── 2. Zależności systemowe ───────────────────────────────────
hdr "Zależności systemowe"

_apt_updated=false
_apt() {
  if ! $_apt_updated; then sudo apt-get update -qq; _apt_updated=true; fi
  sudo apt-get install -y -qq "$@"
}

# git
command -v git &>/dev/null && ok "git $(git --version | awk '{print $3}')" || {
  warn "Instaluję git..."
  [[ "$PKG_MGR" == "apt" ]] && _apt git || brew install git
  ok "git zainstalowany"
}

# Python 3.11+ (preferujemy 3.11 dla max kompatybilności z TTS/whisperx)
_py=""
for _c in python3.11 python3.12 python3.13 python3; do
  if command -v "$_c" &>/dev/null && "$_c" -c 'import sys; exit(0 if sys.version_info>=(3,11) else 1)' 2>/dev/null; then
    _py="$_c"; ok "Python: $("$_py" --version)"; break
  fi
done
if [ -z "$_py" ]; then
  warn "Python 3.11+ nie znaleziony — instaluję..."
  if [[ "$PKG_MGR" == "apt" ]]; then
    _apt software-properties-common
    sudo add-apt-repository -y ppa:deadsnakes/ppa
    sudo apt-get update -qq
    _apt python3.11 python3.11-venv python3.11-dev
    _py="python3.11"
  else
    brew install python@3.11
    _py="$(brew --prefix python@3.11)/bin/python3.11"
  fi
  ok "Python 3.11 zainstalowany"
fi

# Node.js 20+
_node_ok=false
if command -v node &>/dev/null; then
  _nmaj=$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')
  [ "$_nmaj" -ge 20 ] && { ok "Node.js $(node --version)"; _node_ok=true; } || warn "Node.js za stary (wymaga 20+)"
fi
if ! $_node_ok; then
  warn "Instaluję Node.js 20..."
  if [[ "$PKG_MGR" == "apt" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    _apt nodejs
  else
    brew install node@20
    brew link --overwrite node@20 2>/dev/null || true
  fi
  ok "Node.js $(node --version)"
fi

# ffmpeg
command -v ffmpeg &>/dev/null && ok "ffmpeg" || {
  warn "Instaluję ffmpeg..."
  [[ "$PKG_MGR" == "apt" ]] && _apt ffmpeg || brew install ffmpeg
  ok "ffmpeg zainstalowany"
}

# ── 3. GPU ────────────────────────────────────────────────────
hdr "Sprawdzanie GPU"
_HAS_GPU=false
if ! $_CPU_ONLY && command -v nvidia-smi &>/dev/null; then
  _gpu=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | head -1)
  ok "NVIDIA GPU: $_gpu"
  _HAS_GPU=true
else
  warn "Brak NVIDIA GPU — pomijam zależności CUDA (TTS, wideo, transkrypcja wymagają GPU)"
fi

# ── 4. Kod źródłowy ───────────────────────────────────────────
hdr "Pobieranie kodu"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  echo "  Klonuję do $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  ok "Repozytorium sklonowane"
else
  git -C "$INSTALL_DIR" pull --ff-only
  ok "Repozytorium zaktualizowane"
fi

# ── 5. Python venv + deps ─────────────────────────────────────
hdr "Instalacja backendu Python"
cd "$INSTALL_DIR/backend"
if [ ! -d ".venv" ]; then
  echo "  Tworzę venv..."
  "$_py" -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip --quiet

echo "  Instaluję zależności rdzeniowe..."
pip install --quiet \
  "fastapi>=0.100" \
  "uvicorn[standard]>=0.27" \
  "python-multipart>=0.0.9" \
  "httpx>=0.27" \
  "psutil>=5.9" \
  "edge-tts>=7.2" \
  "soundfile>=0.12" \
  "pydub>=0.25" \
  "aiofiles>=23.0" \
  "python-pptx>=0.6" \
  "PyMuPDF>=1.23" \
  "Pillow>=10.0" \
  "pyparsing>=3.0" \
  "ebooklib>=0.18" \
  "slowapi>=0.1" \
  "bcrypt>=4.0"
ok "Zależności rdzeniowe zainstalowane"

if $_HAS_GPU; then
  # Wykryj CUDA version i dobierz właściwe koło torch
  _cuda_ver=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}' | cut -d. -f1,2 | tr -d .)
  if [ "${_cuda_ver:-0}" -ge 128 ]; then
    _torch_index="https://download.pytorch.org/whl/cu128"
    _torch_tag="cu128"
  else
    _torch_index="https://download.pytorch.org/whl/cu121"
    _torch_tag="cu121"
  fi
  echo "  Instaluję PyTorch (CUDA $_torch_tag)..."
  pip install --quiet "torch==2.8.0+${_torch_tag}" "torchaudio==2.8.0+${_torch_tag}" \
    --index-url "$_torch_index"
  ok "PyTorch 2.8.0+${_torch_tag} zainstalowany"

  echo "  Instaluję XTTS-v2 (klonowanie głosu)..."
  # --no-deps: coqui-tts chce torch>=2.1 co nadpisuje nasz torch 2.8+cu128
  # Instalujemy bez deps, a zależności (numpy, scipy itp.) doinstalowujemy ręcznie
  _py_ver=$("$_py" -c 'import sys; print(sys.version_info.minor)')
  if [ "${_py_ver:-0}" -ge 12 ]; then
    pip install --quiet --no-deps "coqui-tts>=0.25.0" || pip install --quiet --no-deps TTS --ignore-requires-python || warn "Nie udało się zainstalować TTS"
    pip install --quiet "gruut[cs,de,es,fr,it,nl,ru,sv]" "coqpit>=0.0.16" "inflect" "anyascii" "bangla" "blinker" "cython" "g2pkk" "hangul-romanize" "jamo" "jieba" "mecab-python3" "num2words" "pysbd" "umalat" 2>/dev/null || true
  else
    pip install --quiet --no-deps "TTS>=0.22.0" || warn "Nie udało się zainstalować TTS"
    pip install --quiet "gruut[cs,de,es,fr,it,nl,ru,sv]" "coqpit>=0.0.16" "inflect" "anyascii" 2>/dev/null || true
  fi
  # Przywróć torch po instalacji coqui-tts (na wypadek gdyby cokolwiek go nadpisało)
  pip install --quiet --force-reinstall "torch==2.8.0+${_torch_tag}" "torchaudio==2.8.0+${_torch_tag}" \
    --index-url "$_torch_index"
  ok "XTTS-v2 zainstalowany + torch 2.8.0+${_torch_tag} przywrócony"

  echo "  Instaluję transformers + accelerate..."
  # 4.56.0: ma is_torchcodec_available (wymagane przez coqui-tts), bez keras_nlp bug (4.57+)
  pip install --quiet "transformers==4.56.0" "accelerate>=0.20.0"
  ok "transformers + accelerate"

  echo "  Instaluję diffusers (WAN 2.1 / AnimateDiff)..."
  pip install --quiet "diffusers>=0.38.0"
  ok "diffusers zainstalowany"

  echo "  Instaluję opencv..."
  pip install --quiet "opencv-python-headless"
  ok "opencv zainstalowany"

  echo "  Instaluję WhisperX (transkrypcja + diaryzacja)..."
  pip install --quiet whisperx || warn "WhisperX: błąd instalacji (opcjonalne)"
  ok "WhisperX zainstalowany"

  echo "  Instaluję Demucs (separacja ścieżek audio)..."
  pip install --quiet demucs
  ok "Demucs zainstalowany"

  echo "  Instaluję DeepFilterNet (redukcja szumów)..."
  pip install --quiet deepfilternet || warn "DeepFilterNet: pominięto (opcjonalne)"
fi

deactivate

# ── 5b. Chatterbox TTS (oddzielny venv — torch 2.6 vs nasz torch 2.8, nie mogą współistnieć) ──
if $_HAS_GPU; then
  hdr "Instalacja Chatterbox TTS (EN Turbo + Multilingual V3)"
  _CHTRBX_VENV="$INSTALL_DIR/backend/.chatterbox-venv"
  if [ ! -d "$_CHTRBX_VENV" ]; then
    echo "  Tworzę oddzielny venv dla Chatterbox..."
    "$_py" -m venv "$_CHTRBX_VENV"
    ok "Chatterbox venv utworzony"
  fi
  "$_CHTRBX_VENV/bin/pip" install --upgrade pip --quiet
  echo "  Instaluję chatterbox-tts (pobieranie modeli ~2GB)..."
  "$_CHTRBX_VENV/bin/pip" install --quiet chatterbox-tts || warn "Chatterbox TTS: błąd instalacji"
  ok "Chatterbox TTS zainstalowany w .chatterbox-venv"
fi

# ── 6. RVC venv (izolowany, Python 3.11) ─────────────────────
if $_HAS_GPU && command -v python3.11 &>/dev/null; then
  hdr "Instalacja RVC (izolowany venv)"
  if [ ! -d /opt/rvc-venv ]; then
    echo "  Tworzę /opt/rvc-venv z Python 3.11..."
    python3.11 -m venv /opt/rvc-venv
  fi
  /opt/rvc-venv/bin/pip install --quiet \
    rvc-python "numpy<2" torchcrepe fairseq ffmpeg-python "faiss-cpu>=1.8" || \
    warn "RVC: część zależności nie zainstalowana (opcjonalne)"
  ok "RVC venv gotowy (/opt/rvc-venv)"
fi

# ── 7. Frontend ───────────────────────────────────────────────
hdr "Budowanie frontendu React"
cd "$INSTALL_DIR/frontend"
npm ci --silent
npm run build
ok "Frontend zbudowany → dist/"

# ── 8. Skrypt startowy ────────────────────────────────────────
_SITE="$INSTALL_DIR/backend/.venv/lib/python3.12/site-packages"
_TORCH_LIB="$_SITE/torch/lib"
_TORCHAUDIO_LIB="$_SITE/torchaudio/lib"

cat > "$INSTALL_DIR/start.sh" << STARTSCRIPT
#!/usr/bin/env bash
DIR="\$(cd "\$(dirname "\$0")" && pwd)"
export PYTHONPATH="$_SITE"
export LD_LIBRARY_PATH="$_TORCH_LIB:$_TORCHAUDIO_LIB"
echo "🎙  Voice Studio AI — http://localhost:47821"
exec /usr/bin/python3.12 -m uvicorn main:app --app-dir "\$DIR/backend" --host 0.0.0.0 --port 47821
STARTSCRIPT
chmod +x "$INSTALL_DIR/start.sh"

# Opcjonalny serwis systemd (Linux)
if [[ "$PKG_MGR" == "apt" ]] && command -v systemctl &>/dev/null; then
  cat > /tmp/voice-studio.service << SVCFILE
[Unit]
Description=Voice Studio AI (FastAPI + React SPA)
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=$INSTALL_DIR/backend
Environment=PYTHONPATH=$_SITE
Environment=LD_LIBRARY_PATH=$_TORCH_LIB:$_TORCHAUDIO_LIB
ExecStart=/usr/bin/python3.12 -m uvicorn main:app --host 0.0.0.0 --port 47821 --workers 1 --access-log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCFILE
  if sudo cp /tmp/voice-studio.service /etc/systemd/system/voice-studio.service 2>/dev/null; then
    sudo systemctl daemon-reload
    sudo systemctl enable voice-studio 2>/dev/null || true
    ok "Serwis systemd skonfigurowany"
  fi
fi

# ── 9. Podsumowanie ───────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗"
echo -e "║  ✅  Instalacja zakończona!              ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Uruchom: ${BOLD}bash $INSTALL_DIR/start.sh${NC}"
echo -e "  Otwórz:  ${BOLD}http://localhost:47821${NC}"
echo ""

# Opcjonalny autostart
read -t 10 -p "  Uruchomić serwer teraz? [Y/n] " _ans || _ans="y"
if [[ "${_ans:-y}" =~ ^[Yy]?$ ]]; then
  source "$INSTALL_DIR/backend/.venv/bin/activate"
  (sleep 3 && {
    command -v xdg-open &>/dev/null && xdg-open http://localhost:47821 ||
    command -v open &>/dev/null && open http://localhost:47821 || true
  }) &
  cd "$INSTALL_DIR/backend"
  exec uvicorn main:app --host 0.0.0.0 --port 47821
fi
