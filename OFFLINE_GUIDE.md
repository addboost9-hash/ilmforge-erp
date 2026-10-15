# IlmForge without internet — the desktop app
## اِنٹرنیٹ کے بغیر IlmForge 🇵🇰

**IlmForge desktop** پورا IlmForge ہے جو school کے اپنے computer پر install ہوتا ہے۔
انٹرنیٹ کی ضرورت نہیں۔ School کا سارا record اسی computer پر رہتا ہے، اور school کے
WiFi سے باقی computers اور mobiles بھی استعمال کر سکتے ہیں۔

This guide is for the person who sets IlmForge up at a school. Day-to-day use is in the
staff manual, **Part 14** (`docs/USER-MANUAL.md`, `docs/IlmForge-Staff-Manual.pdf`, and
**User Manual → IlmForge Desktop** inside the app).

---

## What you need

| | Minimum | Recommended |
|---|---|---|
| Windows | 10 (64-bit) | 11 |
| Memory | 4 GB | 8 GB |
| Free disk space | 1 GB | 10 GB (room for records and backups) |
| For other devices | — | A Wi-Fi router the school's devices connect to |

Also: the installer **IlmForge-Setup-<version>.exe**, and a licence from IlmForge.
No Node.js, no command prompt and no internet are needed on the school's computer.

---

## 1. Install

1. Double-click **IlmForge-Setup-<version>.exe**.
   If Windows says *Windows protected your PC*: **More info → Run anyway**.
2. Accept the licence agreement → **Install**. No administrator password is needed.
3. IlmForge opens. A shortcut is put on the desktop and in the Start menu.

## 2. Activate

The licence screen shows **This computer's ID**, for example `A684-640A-00FA-8899`.

- For a licence that works on this computer only, send this ID to IlmForge.
- Paste the licence (it starts with `ILMF1.`) or click **Open a licence file…** → **Activate**.

The licence is checked on the computer itself. It cannot be changed or made up: a
changed licence, one for another computer, or an expired one is refused with a message
saying what to do.

## 3. Set up the school (once)

| Choice | When |
|---|---|
| **Start a new school** | The school has not used IlmForge before. Enter the school name, the admin's name, email and password. |
| **Bring the school from IlmForge online** | The school already uses IlmForge online. Online, an admin opens **Backup & Restore → Download everything for the desktop app**. Bring the **.ilmforge** file to this computer and choose it. Every record comes across, and everyone keeps their sign-in. |
| **Restore a desktop backup** | Moving to a new computer: choose the **.ilmbackup** file saved from the old one. |

> After bringing a school over from online, use the desktop app only. The online school
> is copied, not moved, and the two do not stay in step.

## 4. Let the other computers and phones in

On the IlmForge computer: **This Computer** (sidebar) → **Other computers and phones in
the school** → **On**. It shows an address such as `http://192.168.1.10:8090`.

- On each other device, connected to the same Wi-Fi: open that address in Chrome or Edge.
- When Windows asks about the network, tick **Private networks** → **Allow**.
- Keep IlmForge open on the main computer. Closing its window keeps it running by the
  clock; right-click the IlmForge icon → **Quit IlmForge** to stop it.
- Ask whoever looks after the Wi-Fi router to give the main computer a fixed address
  (a "DHCP reservation"), so the address never changes.

---

## Backups (very important)

- IlmForge backs up the whole school **every day** by itself and keeps the last 14,
  plus one before every update and every restore.
- **Every week**: This Computer → **Save a copy to…** → a USB drive. Keep the USB away
  from the computer. A backup on the same computer does not survive a broken disk,
  theft or a virus.
- To put a backup back: This Computer → **Put back**, or **Restore from a file…**.

The school's files are in `C:\Users\<Windows user>\AppData\Roaming\IlmForge`:

| Folder | What it holds |
|---|---|
| `data` | The records (`ilmforge.db`) |
| `backups` | Automatic and saved backups |
| `logs` | What support may ask for |

Installing, updating or uninstalling IlmForge never touches this folder.

---

## What works without internet

Everything in IlmForge: admissions, fees and receipts, attendance (including ID-card
scanning), exams, question papers, marks and result cards, ID cards, certificates, HR and
payroll, reports and printing, and the parent, student and teacher portals on the school
network.

Needs the internet (works whenever the computer has it): SMS, WhatsApp and email messages
to parents. AI help is not switched on in the desktop app.

---

## Problems

| Problem | What to do |
|---|---|
| Forgot a password | On the main computer: **Forgot Password?** on the sign-in page, or **Help → Reset a password…** |
| Other devices cannot open the address | Same Wi-Fi as the main computer? IlmForge open there? Network **On** in This Computer? Allowed in the Windows firewall question? Check the address in This Computer: it may have changed. |
| "This licence has expired" | Ask IlmForge for a renewal; enter it at the licence screen. The records are untouched. |
| "This computer's date is earlier…" | Set the correct date and time in Windows, then open IlmForge again. |
| IlmForge does not start | Restart the computer. If it still does not start, send the files in the `logs` folder to support. |
| Moving to a new computer | Old: **Save a copy to…** a USB. New: install, activate (a one-computer licence needs a new licence for the new computer's ID), **Restore a desktop backup**. |
| Updating | Run the new installer over the old one. The records stay; the database is updated after a copy is kept. |

---

## The old way (LOCAL_SETUP.bat, START_LOCAL.bat, Setup.ps1)

These scripts installed Node.js from the internet and ran IlmForge from a folder. They
are replaced by the desktop app and are kept only for schools that still use them.

To move such a school to the desktop app:

1. Stop the old IlmForge (`STOP_LOCAL.bat`, or close its windows).
2. Copy its records file, `<old install folder>\backend\prisma\dev.db`, to a USB drive or
   the desktop. Keep this copy until the school has checked everything in the desktop app.
3. Install and activate IlmForge desktop, choose **Restore a desktop backup**, and pick
   that copy of `dev.db`. IlmForge brings it up to the current version by itself, and
   everyone signs in with the passwords they had.

If it says the database could not be updated, nothing was changed: send the message and
the `logs` folder to support.

---

## Help

WhatsApp **0346-5146609**

*IlmForge — اِلم کو آسان بنائے*
