#!/bin/bash
# ============================================================
#  Voice Studio AI — Deploy do zdalnego serwera
#  Uruchom: bash deploy.sh "opis zmian"
#  Opcjonalnie: bash deploy.sh "opis" --extras  (LivePortrait, RVC)
#
#  Skonfiguruj zmienne poniżej lub ustaw zmienne środowiskowe:
#    VS_REMOTE_USER, VS_REMOTE_HOST, VS_REMOTE_DIR, VS_SSH_KEY
# ============================================================
set -e

# ── Konfiguracja — edytuj lub ustaw jako zmienne środowiskowe ─
REMOTE_USER="${VS_REMOTE_USER:-your-username}"
REMOTE_HOST="${VS_REMOTE_HOST:-your-server-ip-or-hostname}"
REMOTE_DIR="${VS_REMOTE_DIR:-~/voice-studio}"
SSH_KEY="${VS_SSH_KEY:-~/.ssh/id_ed25519}"

# ── Walidacja ─────────────────────────────────────────────────
if [[ "$REMOTE_USER" == "your-username" ]] || [[ "$REMOTE_HOST" == "your-server-ip-or-hostname" ]]; then
  echo "❌ Ustaw zmienne konfiguracyjne w deploy.sh lub przez zmienne środowiskowe:"
  echo ""
  echo "  export VS_REMOTE_USER=myuser"
  echo "  export VS_REMOTE_HOST=192.168.1.100"
  echo "  export VS_REMOTE_DIR=~/voice-studio   # opcjonalne"
  echo "  export VS_SSH_KEY=~/.ssh/id_rsa        # opcjonalne"
  echo ""
  exit 1
fi

LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"
SSH_CMD="ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST"

echo "============================================================"
echo "  🚀 Voice Studio AI — Deploy"
echo "  Serwer: $REMOTE_USER@$REMOTE_HOST"
echo "  Katalog: $REMOTE_DIR"
echo "  Commit: $MSG"
echo "============================================================"

# ── 1. Kopiuj zmienione pliki na serwer ───────────────────────
echo "[1/3] 📤 Kopiuję pliki..."
cd "$LOCAL_DIR"

tar --exclude='./frontend/node_modules' \
    --exclude='./frontend/dist' \
    --exclude='./.git' \
    --exclude='./backend/__pycache__' \
    --exclude='./.chatterbox-venv' \
    --exclude='./.venv' \
    -czf /tmp/vs-deploy.tar.gz .

scp -i "$SSH_KEY" /tmp/vs-deploy.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/vs-deploy.tar.gz"
echo "  ✅ Pliki skopiowane"

# ── 2. Serwer: extract → build → push → reload ────────────────
echo "[2/3] 🖥️  Aktualizuję serwer..."
$SSH_CMD bash << REMOTE
set -e

mkdir -p $REMOTE_DIR
cd $REMOTE_DIR

# Wypakuj nowe pliki
tar -xzf /tmp/vs-deploy.tar.gz

# Zbuduj frontend
cd $REMOTE_DIR/frontend
npm install --silent 2>/dev/null
npm run build 2>&1 | tail -3

# Git push (jeśli skonfigurowany)
cd $REMOTE_DIR
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "🎙️ $MSG"
    git push origin main && echo "  ✅ GitHub zaktualizowany"
  else
    echo "  ℹ️  Brak zmian git"
  fi
fi

# Przeładuj serwis
if systemctl is-enabled voice-studio &>/dev/null; then
  sudo systemctl restart voice-studio
  sleep 2
  systemctl is-active voice-studio && echo "  ✅ Serwis aktywny" || echo "  ❌ Serwis nieaktywny"
else
  echo "  ℹ️  Serwis voice-studio nie jest skonfigurowany — uruchom ręcznie"
fi
REMOTE

# ── 3. Weryfikacja ─────────────────────────────────────────────
echo "[3/3] 🔍 Weryfikacja..."
sleep 2
HEALTH=$($SSH_CMD "curl -s http://localhost:47821/api/health" 2>/dev/null || echo '{"error":"brak odpowiedzi"}')
echo "  Backend: $HEALTH"

# ── Opcja: instalacja LivePortrait + RVC ──────────────────────
if [[ "${2:-}" == "--extras" ]]; then
  echo ""
  echo "[+] Instalowanie LivePortrait + RVC fairseq..."
  $SSH_CMD bash << EXTRAS
set -e

# LivePortrait
if [ ! -f ~/LivePortrait/inference.py ]; then
  echo "  Klonowanie LivePortrait..."
  git clone --depth=1 https://github.com/KwaiVGI/LivePortrait.git ~/LivePortrait
  $REMOTE_DIR/backend/.venv/bin/pip install -r ~/LivePortrait/requirements.txt -q
  echo "  ✅ LivePortrait zainstalowany"
else
  echo "  ✅ LivePortrait już istnieje"
fi

# RVC fairseq
if [ -f /opt/rvc-venv/bin/pip ]; then
  /opt/rvc-venv/bin/pip install -q fairseq 'faiss-cpu>=1.8' && echo "  ✅ fairseq zainstalowany"
else
  echo "  Tworzenie /opt/rvc-venv..."
  python3.11 -m venv /opt/rvc-venv
  /opt/rvc-venv/bin/pip install -q rvc-python 'numpy<2' torchcrepe fairseq ffmpeg-python 'faiss-cpu>=1.8'
  echo "  ✅ RVC venv gotowy"
fi

if systemctl is-enabled voice-studio &>/dev/null; then
  sudo systemctl restart voice-studio
fi
EXTRAS
fi

echo ""
echo "============================================================"
echo " ✅ Deploy zakończony!"
echo ""
echo "  🌐 http://$REMOTE_HOST:47821"
echo "  📖 http://$REMOTE_HOST:47821/docs"
echo ""
echo "  Extras (LivePortrait + RVC):"
echo "  bash deploy.sh \"opis\" --extras"
echo "============================================================"
