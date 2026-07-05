# IlmForge v3.3 — School Management System

A full-featured, enterprise-grade School ERP built with Node.js + Express on the backend and React 18 + Vite on the frontend. Supports multi-role portals, attendance automation, fee management, payroll, communication tools, and AI-assisted features.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

---

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings (JWT_SECRET, SMTP credentials, Twilio, Firebase, etc.)
npx prisma migrate dev --name init
npm run db:seed        # optional: seed default users and sample data
npm run dev
```

Backend runs on: **http://localhost:5000**

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:3000**

---

### Default Login Credentials

| Role       | Email                   | Password    |
|------------|-------------------------|-------------|
| Admin      | admin@school.com        | admin123    |
| Teacher    | teacher@school.com      | teacher     |
| Parent     | parent@school.com       | parent      |
| Student    | student@school.com      | student123  |

---

## Architecture

| Layer      | Technology                                                             |
|------------|------------------------------------------------------------------------|
| Backend    | Node.js + Express + Prisma ORM + SQLite (dev) / PostgreSQL (prod)      |
| Frontend   | React 18 + Vite 5 + Zustand + React Query + TailwindCSS + CSS Variables|
| Database   | SQLite (development) — migrate to PostgreSQL for production            |
| Auth       | JWT (jsonwebtoken) + bcryptjs                                          |
| Messaging  | Nodemailer (SMTP) + Twilio (SMS/WhatsApp) + Firebase (push)            |
| Exports    | ExcelJS (spreadsheet exports)                                          |

---

## Features Built

### Core Management
- **Student Management** — enrollment, profiles, documents, promotion, transfer certificates
- **Staff & Payroll** — staff records, salary slips, deductions, pay runs, loan tracking
- **Fee Management** — fee heads, vouchers, collection, reminders, discounts, defaulter reports
- **Class & Section Management** — timetables, subjects, room allocation

### Attendance
- **Manual Attendance** — teacher-marked, bulk mark per class
- **Barcode Attendance** — QR/barcode scan-in via camera
- **Biometric Attendance** — biometric device integration hooks
- **Face Recognition Attendance** — webcam-based face match

### Academic
- **Exams & Results** — exam scheduling, mark entry, result sheets, grade cards
- **Report Cards** — configurable templates, PDF generation
- **Library Management** — book catalog, issue/return, overdue tracking
- **Homework & Assignments** — assignment posting, submission tracking

### Communication & Portals
- **5 Role Portals** — Admin, Teacher, Parent, Student, Accountant
- **SMS / WhatsApp / Email Notifications** — event-driven and bulk broadcast
- **Internal Messenger** — real-time in-app messaging between roles
- **PTM Scheduler** — parent-teacher meeting booking and calendar

### Operations
- **Transport Management** — routes, vehicles, driver assignment
- **Health Records** — student health profiles, clinic visits, vaccination logs
- **Leave Workflow** — staff and student leave requests with approval chain
- **Events Management** — school calendar, event notices, photo galleries
- **Alumni Module** — graduated student registry, alumni portal

### Advanced / AI Tools
- **AI Tools** — report drafting, result analysis, admission inquiry assistant
- **PWA (Progressive Web App)** — installable on mobile, offline-capable shell

---

## Available Scripts

### Backend (`/backend`)

| Script                | Description                                       |
|-----------------------|---------------------------------------------------|
| `npm run dev`         | Start development server with nodemon (port 5000) |
| `npm start`           | Start production server (port 5000)               |
| `npm run build`       | Run `prisma generate` (prepare Prisma client)     |
| `npm run db:generate` | Regenerate Prisma client after schema changes     |
| `npm run db:push`     | Push schema changes without a migration file      |
| `npm run db:migrate`  | Run Prisma migrate dev (creates migration file)   |
| `npm run db:deploy`   | Run Prisma migrate deploy (production)            |
| `npm run db:studio`   | Open Prisma Studio (visual DB browser)            |
| `npm run db:seed`     | Seed database with default users and sample data  |
| `npm run smoke:api`   | Run API smoke tests                               |
| `npm run smoke:smtp`  | Test SMTP email connection                        |

### Frontend (`/frontend`)

| Script            | Description                                       |
|-------------------|---------------------------------------------------|
| `npm run dev`     | Start Vite dev server (port 3000, strict)         |
| `npm run build`   | Build for production (`dist/`)                    |
| `npm run preview` | Preview production build locally (port 3000)      |

---

## API Endpoints

- **Base URL:** `http://localhost:5000/api/v1`
- **Health Check:** `http://localhost:5000/health`

Key route groups:

```
/api/v1/auth            — login, refresh, logout
/api/v1/students        — CRUD, search, promotion
/api/v1/staff           — CRUD, payroll
/api/v1/fees            — vouchers, collection, reports
/api/v1/attendance      — mark, reports, barcode, face
/api/v1/exams           — scheduling, marks, results
/api/v1/classes         — classes, sections, timetables
/api/v1/library         — books, issue, return
/api/v1/transport       — routes, vehicles
/api/v1/events          — calendar, notices
/api/v1/leave           — requests, approvals
/api/v1/messages        — internal messenger
/api/v1/notifications   — SMS/email/WhatsApp dispatch
/api/v1/alumni          — alumni registry
/api/v1/health-records  — clinic, vaccinations
/api/v1/ptm             — parent-teacher meetings
/api/v1/ai              — AI tools endpoints
```

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`. Key variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL="file:./prisma/dev.db"   # SQLite (dev)
# DATABASE_URL="postgresql://..."      # PostgreSQL (prod)

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# Twilio (SMS / WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Frontend URL (CORS)
CLIENT_URL=http://localhost:3000
```

---

## Database Migration

After any schema change to `backend/prisma/schema.prisma`:

```bash
cd backend
npx prisma migrate dev --name description_of_change
npx prisma generate
```

To open the visual database browser:

```bash
cd backend
npm run db:studio
```

---

## Production Deployment

### Backend — Render.com (or Railway / Fly.io)

1. Connect your repository to Render.
2. Set **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
3. Set **Start Command**: `npm start`
4. Add all environment variables from `.env.example` in the Render dashboard.
5. Set `DATABASE_URL` to your PostgreSQL connection string.
6. Set `NODE_ENV=production`.

### Frontend — Vercel (or Netlify)

1. Connect your repository to Vercel, root set to `frontend/`.
2. Set **Build Command**: `npm run build`
3. Set **Output Directory**: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api/v1
   ```

---

## Project Structure

```
app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration history
│   ├── src/
│   │   ├── server.js           # Express entry point
│   │   ├── routes/             # Route definitions (20+ route files)
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── services/           # Business logic (email, SMS, WhatsApp)
│   │   └── utils/              # Helpers, seed, PDF generation
│   ├── scripts/                # Smoke test scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Router and layout
│   │   ├── pages/              # Page-level components per role
│   │   ├── components/         # Shared UI components
│   │   ├── store/              # Zustand state stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── api/                # Axios instances and query functions
│   │   └── assets/             # Static assets
│   ├── index.html
│   └── package.json
├── docker-compose.yml
└── README.md                   # This file
```

---

## Tech Stack Summary

| Concern           | Choice                              |
|-------------------|-------------------------------------|
| Runtime           | Node.js 18+                         |
| API Framework     | Express 4                           |
| ORM               | Prisma 5                            |
| DB (dev)          | SQLite                              |
| DB (prod)         | PostgreSQL                          |
| Auth              | JWT + bcryptjs                      |
| Frontend          | React 18 + Vite 5                   |
| State             | Zustand + React Query (TanStack v5) |
| Forms             | React Hook Form                     |
| Styling           | TailwindCSS 3 + CSS Variables       |
| Charts            | Recharts                            |
| Icons             | Lucide React                        |
| Notifications     | react-hot-toast                     |
| HTTP Client       | Axios                               |
| Email             | Nodemailer                          |
| SMS/WhatsApp      | Twilio                              |
| Push              | Firebase Admin SDK                  |
| Excel Export      | ExcelJS                             |
| Rate Limiting     | express-rate-limit                  |
| Security Headers  | Helmet                              |

---

## License

Private — all rights reserved. For licensing inquiries contact the project maintainer.
