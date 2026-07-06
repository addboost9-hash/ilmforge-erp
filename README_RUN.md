# 🚀 IlmForge ERP v3.1 — Run Guide

## Requirements
- Node.js 18+ (https://nodejs.org)
- PostgreSQL database (local ya Render/Neon/Supabase — URL `.env` mein)

## Pehli dafa (ONE TIME)
### Windows: `SETUP.bat` double-click karein
### Linux/Mac: `./setup.sh`
Yeh automatically: backend+frontend libraries install, Prisma client generate, build verify karega.

> Note: `node_modules` zip mein included hain (Linux binaries). Windows pe SETUP.bat chalana ZAROORI hai — Prisma apne Windows engines download karega.

## Database setup (pehli dafa)
```bash
cd backend
# .env mein DATABASE_URL check karein, phir:
npx prisma migrate dev --name init    # local dev
# YA agar existing DB hai:
npx prisma migrate deploy
# Demo data chahiye to:
npm run db:seed
```

## Run karna
### Windows: `START.bat` double-click
### Linux/Mac: `./start.sh`
- Backend: http://localhost:5000
- Frontend: http://localhost:5173 (auto-open hoga)

## Login (seed data ke baad)
- Admin: admin@demo.com / (seed output mein password)
- Ya naya school register karein — credentials popup + email milega

## Deploy (production)
- Backend → Render (render.yaml ready, Dockerfile ready)
- Frontend → Vercel (`VITE_API_URL` env = backend URL)
- Push pe auto-deploy

## Common Errors
| Error | Fix |
|---|---|
| Prisma engine not found | `cd backend && npx prisma generate` |
| Port 5000 busy | backend/.env mein PORT change |
| CORS error | backend/.env FRONTEND_URL check |
| DB connect fail | DATABASE_URL verify karein |
