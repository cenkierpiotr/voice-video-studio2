#!/bin/bash
# ============================================================
#  Voice Studio AI — Instalacja i aktualizacja na serwerze
#  Uruchom: bash install_dell.sh
#  Jeden port 47821 obsługuje frontend + backend API
#
#  Skonfiguruj zmienne poniżej lub ustaw jako zmienne env:
#    VS_REPO_DIR, VS_REPO_URL, VS_PORT
# ============================================================
set -e

REPO_DIR="${VS_REPO_DIR:-$HOME/voice-studio}"
PORT="${VS_PORT:-47821}"
REPO_URL="${VS_REPO_URL:-https://github.com/YOUR_USERNAME/voice-studio.git}"

echo "============================================================"
echo "  🎙️  Voice Studio AI — Instalacja na serwerze"
echo "  Katalog: $REPO_DIR"
echo "  Port: $PORT"
echo "============================================================"

# ── 1. Klonuj lub aktualizuj repo ────────────────────────────
if [ -d "$REPO_DIR/.git" ]; then
  echo "[1/5] Aktualizuję repozytorium..."
  cd "$REPO_DIR"
  git pull origin main
else
  echo "[1/5] Klonuję repozytorium..."
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

# ── 2. Python dependencies ────────────────────────────────────
echo "[2/5] Instaluję zależności Python..."
pip3 install --quiet --break-system-packages \
  "edge-tts>=7.2" "fastapi>=0.100" "uvicorn>=0.27" \
  "httpx>=0.27" "aiofiles>=23.0" "pydub>=0.25" \
  "python-multipart>=0.0.9" 2>&1 | tail -5

# ── 3. Frontend build ─────────────────────────────────────────
echo "[3/5] Buduję frontend React..."
cd "$REPO_DIR/frontend"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

npm install --silent
npm run build
echo "  ✅ Frontend zbudowany: $REPO_DIR/frontend/dist"

# ── 4. Serwis systemd ─────────────────────────────────────────
echo "[4/5] Konfiguruję serwis systemd..."

PYTHON_BIN=$(which python3)
SERVICE_FILE="/etc/systemd/system/voice-studio.service"

sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Voice Studio AI (FastAPI + React SPA)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR/backend
ExecStart=$PYTHON_BIN -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment="PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable voice-studio
sudo systemctl restart voice-studio
sleep 3

# ── 5. Status ─────────────────────────────────────────────────
echo "[5/5] Sprawdzam status..."
if systemctl is-active --quiet voice-studio; then
  echo "  ✅ Serwis voice-studio AKTYWNY"
else
  echo "  ❌ Serwis nieaktywny, sprawdź: journalctl -u voice-studio -n 30"
  journalctl -u voice-studio -n 20 --no-pager
fi

SERVER_IP=$(hostname -I | awk '{print $1}')
TAILSCALE_IP=$(ip addr show tailscale0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 || echo "")

echo ""
echo "============================================================"
echo " ✅ Voice Studio AI gotowy!"
echo ""
echo "  🌐 Lokalne:    http://$SERVER_IP:$PORT"
[ -n "$TAILSCALE_IP" ] && echo "  🔒 Tailscale:  http://$TAILSCALE_IP:$PORT"
echo "  📖 API Docs:   http://$SERVER_IP:$PORT/docs"
echo ""
echo "  Logi: journalctl -u voice-studio -f"
echo "  Stop: sudo systemctl stop voice-studio"
echo "============================================================"
