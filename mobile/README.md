# IlmForge Mobile App 📱

React Native (Expo) mobile app for IlmForge School ERP.
Connects to the same backend as the web app.

## Portals
- **Admin** — Dashboard, Students, Attendance, Fee Collection
- **Teacher** — Attendance Marking, Homework, Student List
- **Parent** — Children info, Fees, Results, Attendance
- **Student** — Via parent portal

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your phone (iOS/Android)

### Run for Testing
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** app.

### Build APK (Android)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

### Backend API
Points to: `https://ilmforge-erp.onrender.com/api/v1`

Change in `src/api/client.js` for local testing:
```js
const API_BASE = 'http://YOUR_LOCAL_IP:5000/api/v1';
```

## Files Structure
```
mobile/
├── app/
│   ├── _layout.jsx          ← Root layout + auth check
│   ├── login.jsx            ← Login screen
│   ├── (tabs)/              ← Admin portal tabs
│   │   ├── index.jsx        ← Dashboard
│   │   ├── students.jsx     ← Student list
│   │   ├── attendance.jsx   ← Mark attendance
│   │   ├── fees.jsx         ← Fee collection
│   │   └── profile.jsx      ← User profile
│   ├── parent/              ← Parent portal
│   │   ├── index.jsx        ← Children list
│   │   ├── fees.jsx         ← Fee status
│   │   ├── results.jsx      ← Exam results
│   │   └── attendance.jsx   ← Attendance calendar
│   └── teacher/             ← Teacher portal
│       ├── index.jsx        ← Dashboard
│       ├── attendance.jsx   ← Mark attendance
│       ├── homework.jsx     ← Post homework
│       └── students.jsx     ← Class students
├── src/
│   ├── api/client.js        ← Axios API client
│   └── store/auth.js        ← Token storage
└── assets/                  ← Icons, splash screen
```

## Features
- Role-based navigation (Admin/Teacher/Parent)
- JWT authentication with AsyncStorage
- Pull-to-refresh on all lists
- Offline-aware loading states
- Navy #1B2F6E branding
- Works on both iOS and Android
