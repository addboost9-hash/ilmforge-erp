# 🎓 EduManage Pro — School Management ERP v2.0

## Pakistan's #1 School Management System — Your Own Platform

A **complete, production-ready, multi-tenant School ERP** with:
- ✅ 20 fully functional modules
- ✅ React.js frontend (all pages)
- ✅ Node.js + Express REST API (all routes)
- ✅ PostgreSQL with Prisma ORM
- ✅ JWT Auth + Phone OTP + Email Verification
- ✅ 5-step onboarding wizard
- ✅ WhatsApp + SMS + Email notifications
- ✅ PDF vouchers & marksheets
- ✅ Excel/CSV export
- ✅ Demo seed data included

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Step 1 — Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2 — Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

Minimum required in `.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/edumanage"
JWT_SECRET="your-random-secret-here"
JWT_REFRESH_SECRET="another-random-secret"
```

### Step 3 — Setup Database

```bash
cd backend
npx prisma db push        # Create all tables
npm run db:seed           # Add demo data
```

### Step 4 — Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# API running at http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# App running at http://localhost:3000
```

### Step 5 — Login

Open http://localhost:3000

| Role       | Email                    | Password   |
|------------|--------------------------|------------|
| Admin      | admin@demo.com           | Admin@123  |
| Teacher    | teacher1@demo.com        | teacher    |
| Accountant | accountant@demo.com      | accountant |
| Parent     | parent1@demo.com         | parent     |

---

## 📁 Project Structure

```
edumanage/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # 35+ DB models
│   ├── src/
│   │   ├── app.js                 # Express app
│   │   ├── server.js              # Entry point
│   │   ├── config/
│   │   │   └── prisma.js          # DB client
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js # JWT verification
│   │   │   ├── tenant.middleware.js # Multi-tenant isolation
│   │   │   └── error.middleware.js
│   │   ├── routes/                # 20 route files
│   │   │   ├── auth.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── student.routes.js
│   │   │   ├── admission.routes.js
│   │   │   ├── fee.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── staff.routes.js
│   │   │   ├── exam.routes.js
│   │   │   ├── salary.routes.js
│   │   │   ├── expense.routes.js
│   │   │   ├── product.routes.js
│   │   │   ├── homework.routes.js
│   │   │   ├── transport.routes.js
│   │   │   ├── timetable.routes.js
│   │   │   ├── notification.routes.js
│   │   │   ├── complaint.routes.js
│   │   │   ├── report.routes.js
│   │   │   ├── pdf.routes.js
│   │   │   ├── class.routes.js
│   │   │   ├── parent.routes.js
│   │   │   └── settings.routes.js
│   │   ├── services/
│   │   │   ├── auth.service.js    # Full auth logic
│   │   │   ├── sms.service.js     # Twilio SMS
│   │   │   ├── email.service.js   # Nodemailer
│   │   │   └── whatsapp.service.js
│   │   └── utils/
│   │       ├── seed.js            # Demo data
│   │       └── pdf.helper.js      # Voucher + marksheet HTML
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js          # Axios + interceptors
    │   ├── store/
    │   │   └── auth.store.js      # Zustand auth state
    │   ├── layouts/
    │   │   └── AdminLayout.jsx    # Sidebar + header
    │   ├── pages/                 # 35+ page components
    │   │   ├── auth/              # Login, Register, OTP, Onboarding
    │   │   ├── dashboard/         # Main dashboard with KPIs
    │   │   ├── students/          # Students, Profiles, Birthdays, Parents
    │   │   ├── admission/         # Admit student, Inquiries
    │   │   ├── fees/              # Generate, Collect, Defaulters, Structure
    │   │   ├── attendance/        # Manual, Barcode, Staff, Reports
    │   │   ├── staff/             # Staff list & form
    │   │   ├── salary/            # Generate & issue salary
    │   │   ├── exams/             # Exams, Marks, Results
    │   │   ├── expenses/          # Add & view expenses
    │   │   ├── stock/             # Products & POS
    │   │   ├── homework/          # Diary management
    │   │   ├── transport/         # Routes
    │   │   ├── timetable/         # Weekly timetable
    │   │   ├── notifications/     # SMS, WhatsApp, History
    │   │   ├── reports/           # Report center
    │   │   ├── complaints/        # Parent complaints
    │   │   └── settings/          # School info, Classes, Sessions
    │   ├── index.css              # Global styles + design system
    │   ├── App.jsx                # Router + all routes
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## 🔧 Configuration

### SMS (Twilio)
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### WhatsApp (WASender — easiest for Pakistan)
```
WHATSAPP_API_URL=https://api.wasender.app/api
WHATSAPP_API_KEY=your-wasender-key
```

### Email (Gmail SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📱 All 20 Modules

| # | Module | Status |
|---|--------|--------|
| 1 | Dashboard (KPIs, Charts, Class-strength table) | ✅ |
| 2 | Admission Management (Admit, Bulk, Inquiries) | ✅ |
| 3 | Student Management (Profile, Promote, Certs) | ✅ |
| 4 | Parent Accounts (Portal, Wallet, Gate Pass) | ✅ |
| 5 | Staff Management (Teachers, Profiles, IDs) | ✅ |
| 6 | Fee Management (Generate, Collect, Vouchers) | ✅ |
| 7 | Attendance (Manual, Barcode, Biometric) | ✅ |
| 8 | Exams & Tests (Marks, Results, Marksheets) | ✅ |
| 9 | Salary Management (Generate, Issue, Loans) | ✅ |
| 10 | Expense Management (Add, Categories, Reports) | ✅ |
| 11 | Stock / POS (Products, Sell, Reports) | ✅ |
| 12 | Homework Diary (Add, Notify, View) | ✅ |
| 13 | Transport Management (Routes, Assign) | ✅ |
| 14 | Timetable Management (Weekly schedule) | ✅ |
| 15 | Online Notifications (SMS, WhatsApp, Push) | ✅ |
| 16 | Reports Center (Excel, PDF, Print) | ✅ |
| 17 | Parent Complaints (Submit, Track, Resolve) | ✅ |
| 18 | Settings (School Info, Classes, Sessions) | ✅ |
| 19 | Auth (Login, Register, OTP, Onboarding) | ✅ |
| 20 | PDF Generation (Vouchers, Marksheets) | ✅ |

---

## 🌐 API Endpoints Summary

Base URL: `http://localhost:5000/api/v1`

- `POST /auth/register` — Register new school
- `POST /auth/verify-phone` — Verify OTP
- `POST /auth/login` — Login
- `GET /dashboard/stats` — Dashboard KPIs
- `GET /students` — List students
- `POST /students` — Admit student
- `POST /fees/generate` — Generate monthly fee
- `POST /fees/payments` — Record payment
- `POST /attendance/save` — Save attendance + SMS
- `GET /reports/students/excel` — Download Excel
- `GET /pdf/voucher/:id` — Fee voucher HTML
- Full API: see each route file in `backend/src/routes/`

---

## 🏗️ Deployment (Production)

### AWS EC2 + RDS
1. Provision EC2 t3.medium + RDS PostgreSQL
2. Upload project, run `npm install` in both folders
3. Set production `.env` values
4. Run `npx prisma migrate deploy` for DB
5. Use PM2: `pm2 start src/server.js --name edumanage-api`
6. Build frontend: `npm run build` → serve with Nginx

### Docker (coming soon)
```bash
docker-compose up -d
```

---

## 💡 Customization

1. **Your Logo**: Replace `/public/logo.png` and update `AdminLayout.jsx`
2. **School Name**: Set in Settings → School Info after login
3. **Colors**: Edit CSS variables in `src/index.css` (`:root { --navy: ... }`)
4. **Domain**: Update `FRONTEND_URL` in backend `.env`

---

Made with ❤️ — EduManage Pro v2.0
