#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$PATH:/config/.local/bin"

echo "============================================"
echo "   🎙️  Voice Studio AI – Uruchamianie"
echo "============================================"

PYTHON="$BACKEND_DIR/.venv/bin/python3"
[ -f "$PYTHON" ] || PYTHON=python3
PIP="$BACKEND_DIR/.venv/bin/pip"
[ -f "$PIP" ] || PIP=pip3

# Auto-install GPU packages if CUDA is available and packages missing
if python3 -c "import torch; assert torch.cuda.is_available()" 2>/dev/null; then
    echo "[GPU] CUDA wykryte — sprawdzam pakiety GPU..."
    if ! "$PYTHON" -c "import TTS" 2>/dev/null; then
        echo "[GPU] Instaluję TTS (XTTS-v2)..."
        "$PIP" install TTS torchaudio --quiet
    fi
    if ! "$PYTHON" -c "import diffusers" 2>/dev/null; then
        echo "[GPU] Instaluję diffusers (AnimateDiff)..."
        "$PIP" install diffusers accelerate transformers --quiet
    fi
    echo "[GPU] Pakiety GPU OK."
else
    echo "[GPU] Brak CUDA — tryb audio-only (edge-tts)."
fi

# Kill old instances
pkill -f "uvicorn.*47821" 2>/dev/null || true
pkill -f "vite.*47822"    2>/dev/null || true
sleep 1

# Backend
echo "[1/2] Uruchamiam backend FastAPI na porcie 47821..."
cd "$BACKEND_DIR"
nohup "$PYTHON" -m uvicorn main:app --host 0.0.0.0 --port 47821 > /tmp/vs_backend.log 2>&1 &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

# Frontend
echo "[2/2] Uruchamiam frontend Vite na porcie 47822..."
cd "$FRONTEND_DIR"
nohup npm run dev -- --host 0.0.0.0 > /tmp/vs_frontend.log 2>&1 &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID"

sleep 3

echo ""
echo "============================================"
echo " ✅ Voice Studio AI gotowy!"
echo ""
echo "  🌐 Frontend:  http://localhost:47822"
echo "  🔌 Backend:   http://localhost:47821"
echo "  📖 API Docs:  http://localhost:47821/docs"
echo ""
echo "  Logi backend:  tail -f /tmp/vs_backend.log"
echo "  Logi frontend: tail -f /tmp/vs_frontend.log"
echo "============================================"
