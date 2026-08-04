#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          EduManage Pro v2.0 — Setup Script           ║"
echo "║         Pakistan's #1 School Management ERP          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VER=$(node -v)
echo "✅ Node.js: $NODE_VER"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✅ npm: $(npm -v)"

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

echo ""
echo "⚙️  Setting up backend configuration..."
cd ../backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from template"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and set your DATABASE_URL"
    echo "   Example: DATABASE_URL=\"postgresql://user:password@localhost:5432/edumanage\""
else
    echo "✅ .env already exists"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                    NEXT STEPS                        ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  1. Edit backend/.env — set your DATABASE_URL        ║"
echo "║  2. cd backend && npx prisma db push                 ║"
echo "║  3. cd backend && npm run db:seed                    ║"
echo "║  4. cd backend && npm run dev    (Terminal 1)        ║"
echo "║  5. cd frontend && npm run dev   (Terminal 2)        ║"
echo "║  6. Open http://localhost:3000                       ║"
echo "║                                                      ║"
echo "║  Demo login: admin@demo.com / Admin@123              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
