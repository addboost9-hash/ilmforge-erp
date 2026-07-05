#!/bin/bash
echo "═══ IlmForge ERP — Setup ═══"
echo "[1/4] Backend libraries..."
cd backend && npm install
echo "[2/4] Prisma client..."
npx prisma generate
echo "[3/4] Frontend libraries..."
cd ../frontend && npm install
echo "[4/4] Build verify..."
npm run build
cd ..
echo "✅ SETUP COMPLETE — ab ./start.sh chalayen"
