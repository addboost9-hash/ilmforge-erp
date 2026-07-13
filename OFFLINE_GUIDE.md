# IlmForge — Offline / Local Installation Guide
## اِنٹرنیٹ کے بغیر استعمال کریں 🇵🇰

---

## کیا IlmForge بغیر انٹرنیٹ کام کرتا ہے؟

**ہاں!** آپ IlmForge کو اپنے school کے computer پر locally install کر سکتے ہیں۔
پھر پوری school کا WiFi اس ایک computer سے connect ہو جائے گا — بغیر انٹرنیٹ کے۔

---

## تین طریقے

### 🖥️ طریقہ 1: صرف ایک Computer (Simplest)
- صرف جس computer پر install ہے، وہاں کام کرے گا
- باقی devices کو نہیں مل سکتا

### 📡 طریقہ 2: School WiFi/LAN (Recommended)
- ایک computer پر server چلاؤ
- باقی سب mobiles/tablets/PCs WiFi سے connect کریں
- سب کو access ملے گا

### ☁️ طریقہ 3: Cloud + Offline Mix
- Cloud version use کرو جب internet ہو
- Local backup جب net نہ ہو

---

## Installation Steps (Windows)

### Prerequisites (صرف ایک بار)

1. **Node.js install کریں**
   - https://nodejs.org جائیں
   - "LTS" version download کریں (e.g. Node.js 20)
   - Install کریں (سب defaults رکھیں)

2. **IlmForge download کریں**
   - یہ folder (IlmForge_v3.3_Complete) کسی permanent جگہ رکھیں
   - جیسے: `C:\IlmForge\`

### First Time Setup

1. `LOCAL_SETUP.bat` پر double-click کریں
2. انتظار کریں جب تک "Setup Complete" نہ آئے
3. ✅ ایک بار کافی ہے!

### روزانہ Start کرنا

1. `START_LOCAL.bat` پر double-click کریں
2. Browser automatically کھل جائے گا
3. School کا dashboard نظر آئے گا

### بند کرنا

1. `STOP_LOCAL.bat` چلائیں
2. یا بس computer بند کر دیں

---

## School WiFi Setup (LAN)

### Server Computer پر:
1. `START_LOCAL.bat` چلائیں
2. وہ IP address نوٹ کریں جو دکھائے:
   ```
   📡 School Network:  http://192.168.1.100:3000
   ```

### باقی Devices پر (Mobile/Tablet/PC):
1. School WiFi سے connect کریں
2. Browser میں یہ لکھیں: `http://192.168.1.100:3000`
   (اپنا actual IP لکھیں)
3. IlmForge کھل جائے گا!

### Mobile پر App جیسا بنانا:
- **Android:** Chrome → Menu (⋮) → "Add to Home Screen"
- **iPhone:** Safari → Share → "Add to Home Screen"

---

## کیا کام کرتا ہے (Offline میں)

| Feature | Offline میں | Note |
|---------|------------|------|
| ✅ Student Admission | کام کرتا ہے | |
| ✅ Fee Collection | کام کرتا ہے | |
| ✅ Attendance | کام کرتا ہے | |
| ✅ Exam Marks | کام کرتا ہے | |
| ✅ Reports & PDF | کام کرتا ہے | |
| ✅ ID Cards Print | کام کرتا ہے | |
| ✅ Parent Portal | LAN سے | |
| ✅ Teacher Portal | LAN سے | |
| ✅ Fee Voucher | کام کرتا ہے | |
| ✅ Data Backup | Computer پر | |
| ❌ Email Notifications | نہیں | انٹرنیٹ چاہیے |
| ❌ SMS Alerts | نہیں | Twilio چاہیے |
| ❌ WhatsApp | نہیں | انٹرنیٹ چاہیے |
| ❌ Online Payments | نہیں | JazzCash/EasyPaisa |

---

## Data Backup (بہت ضروری!)

### روزانہ Backup لینا:
- IlmForge میں جائیں → Settings → Backup & Restore
- "Create Backup" click کریں
- File automatically download ہو جائے گی
- اسے USB یا Google Drive میں save کریں

### Data کہاں ہے؟
```
C:\IlmForge\app\backend\prisma\dev.db
```
یہ file آپ کا پورا school data ہے۔ اسے regularly copy کریں۔

---

## Troubleshooting

### "Server نہیں چل رہا"
- Node.js install ہے؟ Check: `node --version` command prompt میں
- دوبارہ `LOCAL_SETUP.bat` چلائیں
- Firewall Windows Defender آئے تو "Allow Access" کریں

### "دوسرے devices access نہیں کر رہے"
- کیا server computer اور دوسری device ایک ہی WiFi پر ہیں؟
- Windows Firewall میں Port 3000 اور 5000 allow کریں
- IP address صحیح لکھا ہے؟

### "Data گم ہو گیا"
- `dev.db` file کو backup سے restore کریں
- Settings → Backup → Restore

---

## Minimum Computer Requirements

| | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 | Windows 10/11 |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 5 GB free | 20 GB free |
| **Processor** | Intel i3 | Intel i5+ |
| **Network** | WiFi router | WiFi router |

---

## ابتدائی Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Admin@123 |

**پہلی بار login کے بعد password ضرور تبدیل کریں!**

---

## مزید مدد

- 📞 WhatsApp: 0348-5321483
- 📧 Email: support@ilmforge.pk
- 🌐 Website: ilmforge-erp.vercel.app

---

*IlmForge — Pakistan ka #1 School ERP*
*اِلم کو آسان بنائے 🇵🇰*
