#!/bin/bash
# wsl2_deploy.sh — Serendipity Web · Deploy en WSL2 Ubuntu
# Uso: bash wsl2_deploy.sh /opt/sofia/serendipity-web
# José: correr desde WSL2 terminal (ubuntu)

set -e

APP_DIR="${1:-/opt/sofia/serendipity-web}"
DB_NAME="sofia"
DB_USER="postgres"
DB_PASS="Abundancia2026"
APP_PORT="3000"

echo "========================================"
echo " Serendipity Web — WSL2 Deploy"
echo " Dir: $APP_DIR"
echo "========================================"

# ── 1. Node.js ────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "[1/7] Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "[1/7] Node.js $(node -v) — OK"
fi

# ── 2. PM2 ────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "[2/7] Instalando PM2..."
  sudo npm install -g pm2
else
  echo "[2/7] PM2 $(pm2 -v) — OK"
fi

# ── 3. PostgreSQL ─────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  echo "[3/7] Instalando PostgreSQL..."
  sudo apt-get install -y postgresql postgresql-contrib
  sudo service postgresql start
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"
else
  echo "[3/7] PostgreSQL — OK"
  sudo service postgresql start 2>/dev/null || true
fi

# Create DB if not exists
echo "[3/7] Creando base de datos '$DB_NAME'..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || PGPASSWORD=$DB_PASS psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

# ── 4. App directory ─────────────────────────────────────
echo "[4/7] Preparando directorio $APP_DIR..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

# Copy files (assumes script is run from repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
rsync -av --exclude node_modules --exclude .next --exclude .git "$REPO_ROOT/" "$APP_DIR/"

# ── 5. .env.production ───────────────────────────────────
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "[5/7] Creando .env.production..."
  cat > "$APP_DIR/.env.production" <<EOF
# ── PostgreSQL (WSL2 local) ──────────────────────────────
PG_HOST=localhost
PG_PORT=5432
PG_DB=$DB_NAME
PG_USER=$DB_USER
PG_PASSWORD=$DB_PASS

# ── App ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:$APP_PORT
NEXT_PUBLIC_ORIGIN=http://localhost:$APP_PORT
NODE_ENV=production

# ── Google Sheets (pegar credenciales reales) ────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL=serendipity-sync@onne-app-484403.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=REEMPLAZAR_CON_CLAVE_PRIVADA
GOOGLE_CHEM_SHEET_ID=REEMPLAZAR_CON_ID_DEL_SHEET
EOF
  echo "  ⚠️  Completar .env.production con las credenciales reales"
else
  echo "[5/7] .env.production ya existe — sin cambios"
fi

# ── 6. Migrations ────────────────────────────────────────
echo "[6/7] Corriendo migraciones SQL..."
cd "$APP_DIR"

for sql_file in sql/phase2_finance_and_sheets.sql sql/phase3_mes_schema.sql sql/phase4_inventory_and_purchasing.sql; do
  if [ -f "$sql_file" ]; then
    echo "  → $sql_file"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -f "$sql_file" 2>&1 | grep -v NOTICE || true
  fi
done

# ── 7. Build & PM2 ───────────────────────────────────────
echo "[7/7] Build y arranque con PM2..."
cd "$APP_DIR"
npm install --production=false
npm run build

# PM2 ecosystem config
cat > ecosystem.config.js <<'PMEOF'
module.exports = {
  apps: [{
    name:        'serendipity-web',
    script:      'node_modules/.bin/next',
    args:        'start',
    cwd:         __dirname,
    env_production: {
      NODE_ENV: 'production',
      PORT:     3000,
    },
    instances:   1,
    autorestart: true,
    watch:       false,
    max_memory_restart: '500M',
  }]
};
PMEOF

pm2 stop serendipity-web 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "========================================"
echo " ✅ Deploy completo"
echo " App corriendo en: http://localhost:$APP_PORT"
echo " Thanh mobile:     http://localhost:$APP_PORT/lab/mobile"
echo " PM2 status:       pm2 status"
echo " Logs:             pm2 logs serendipity-web"
echo "========================================"
