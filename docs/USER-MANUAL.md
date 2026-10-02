# IlmForge — School Staff User Manual

**Who this is for:** office staff, accountants, teachers and principals using IlmForge day to day.
No technical knowledge is assumed. Every instruction names the exact button you will see on screen.

**How to use this manual for training:** Part 1 must be done once, in order, before the school
can run. Parts 2 onward are daily tasks — train each person only on the parts their role
uses (see *Who can do what* at the end).

---

## Contents

1. [First-time setup — do this in order](#part-1)
2. [Staff and teachers](#part-2)
3. [Students and admissions](#part-3)
4. [Attendance](#part-4)
5. [Fees](#part-5)
6. [Exams and results](#part-6)
7. [ID cards](#part-7)
8. [Portals — parents, students, teachers](#part-8)
9. [HR, payroll and leaves](#part-9)
10. [Reports and printing](#part-10)
11. [The dashboard](#part-11)
12. [Who can do what](#part-12)
13. [When something goes wrong](#part-13)

---

<a name="part-1"></a>
## Part 1 — First-time setup (do this in order)

**The order matters.** You cannot admit a student before classes exist, and you cannot
generate fees before a fee structure exists. Doing it out of order is the most common
cause of "the system won't let me" during training.

### Step 1: School profile

**Sidebar → School Settings**

1. Fill in **School Identity** — school name, and **Upload Logo**.
2. Fill in **Contact Details** — address, phone, email.
3. Click **Save Profile**.

> The logo and name you set here appear on ID cards, fee vouchers, admission forms,
> result cards and the login page your staff and parents see. Set it properly once.

### Step 2: Academic session

**Sidebar → School Settings → Academic Sessions** (`/settings/sessions`)

1. Click **Add Session**.
2. Enter the session, for example `2025-2026`, with its start and end dates.
3. Save. The active session shows in the top bar of every page.

### Step 3: Classes and sections

**Sidebar → School Settings → Classes** (`/settings/classes`)

1. Under **Add Class**, type the class name (Nursery, KG, Class 1 … Matric) and click **Add Class**.
2. Repeat for every class the school runs.
3. Under **Add Section**, pick the class, type the section name (A, B, C) and click **Add Section**.
4. Switch to the **Subjects** tab and use **Add Subject** to add subjects per class.

**To correct a class name:** click **Rename** on that row, edit it, press Enter (or click **Save**).
Press Escape to cancel. The system will refuse two classes with the same name.

### Step 4: Fee structure

**Sidebar → Invoicing Hub → Fee Structure** (`/fees/structure`)

1. Choose the class.
2. Enter the monthly tuition fee and any other heads (admission fee, exam fee, transport).
3. Click **Save Fee Structure**.

Repeat for every class. Without this, monthly fee generation has nothing to work from.

### Step 5: Add your staff

See [Part 2](#part-2). Add the principal, accountant and teachers before admissions begin,
so students can be assigned a class teacher.

---

<a name="part-2"></a>
## Part 2 — Staff and teachers

### Adding a teacher or other staff member

**Sidebar → Staff Directory → Add Staff** (`/staff/new`)

1. Fill in **Add New Staff Member**: name, father name, CNIC, phone, email, date of joining.
2. Click **Upload Photo** and attach a photograph (used on the staff ID card).
3. Enter the **Designation** — for example *Teacher*, *Accounts Officer*, *Security Guard*.
4. Choose the **Role**. This decides which portal the person gets and what they can see:

   | Role | Gets | Can see |
   |---|---|---|
   | Teacher | Teacher Portal | Their classes, attendance, marks |
   | Accountant | Accountant Portal | Fee collection, vouchers, daily balance |
   | Gatekeeper | Gate Portal | Gate entry, visitors, gate passes |
   | Admin | Admin Dashboard | Everything |

   If you leave Role alone, the system chooses it from the designation — "Accounts Officer"
   becomes an accountant, "Security Guard" becomes a gatekeeper, anything else a teacher.

5. Click **Save Staff Member**.

### The login details — write these down immediately

As soon as the staff member is saved, a box appears with their sign-in details:

- **Portal link** — the web address to open
- **Login ID** — their email address
- **Password** — a temporary password
- **Employee code**
- **Portal** — which portal they will land in

Each line has a **Copy** button, and **Copy all** copies the whole set at once.

> **The password is shown only once.** Copy it and hand it over before closing the box.
> If it is lost, an admin must reset it from the Staff Directory.
> The staff member should change it after first sign-in.

You can look the **portal link** up again any time — see [Part 8](#part-8).

### Editing or removing staff

**Sidebar → Staff Directory** (`/staff`). Switch between **Table** and **Cards** view.
Click a row to open and edit. The Role cannot be changed here after creation — ask an
admin if someone's role must change.

---

<a name="part-3"></a>
## Part 3 — Students and admissions

### Admitting a new student

**Sidebar → New Admission** (`/admissions/wizard`)

The wizard has five steps shown across the top. You cannot skip forward past a step with
missing required fields — required ones are marked with a red asterisk.

1. **Student Info** — name, father name, B-Form/CNIC, date of birth, gender, address,
   mobile number. Use **📷 Camera** to take the student's photo with a webcam, or Browse
   to upload one. Two optional panels at the bottom, *Previous Institutional History* and
   *Health & Emergency Information*, can be filled now or left for later.
2. **Class & Section** — pick the class and section, and the class teacher if asked.
3. **Fee Details** — the fee pulls from the class fee structure. Apply a discount here if
   the school has agreed one, or mark the student as free.
4. **Parent Details** — parent name and **phone number**. The phone number is how the
   parent will sign in, so enter it correctly.
5. **Review & Admit** — check everything, then click **Complete Admission**.

### After admission — two things to print

On the success screen:

- **Print Admission Form** — the full A4 admission form on your school letterhead,
  already filled in, with signature lines for parent, class teacher, coordinator and
  principal. Print it, get it signed, keep it in the student's file.
- **Print Credentials Slip** — the student's and parent's portal sign-in details.
  Hand this to the parent.

> Both are shown only on this screen. If you miss them:
> the admission form can be reprinted any time from **Admissions → Admission Form Print**
> (`/admissions/form-print`) by searching the student and choosing **Filled Form**.

### Blank admission forms

**Admissions → Admission Form Print** → choose **Blank Form** → **Print Blank Form**.
Useful for walk-in enquiries and for keeping printed forms at the front desk.

### Adding many students and staff from Excel

**Sidebar → Import & Export** (`/settings/import-export`)

1. Click **Download template**. You get an Excel workbook with three sheets: **Classes**,
   **Students** and **Staff**. Your existing classes are already filled in.
2. Fill in the **Students** and **Staff** sheets, one person per row. Columns marked * are
   required. Leave **Roll No** and **Employee Code** blank and IlmForge creates them.
3. Click **Choose Excel file** and pick the filled workbook.
4. Read **Check before importing**. It lists every problem by sheet, row and column, for
   example *Class "Class 404" does not exist*. Nothing is saved yet.
5. Click **Import [n] records**. A progress bar shows the import as it runs.
6. Click **Download login details** straight away. It lists every new username and password.

> Dates are day first: **14/03/2014** is 14 March. Type phones as **03001234567**.
> Brothers and sisters with the same parent phone share one parent account.
> Importing the same file twice is safe; anyone already in the school is skipped.

**Where to get the template**

| From | How |
|---|---|
| Inside IlmForge (best: your classes are pre-filled) | **Import & Export → Download template** |
| The in-app manual | **Sidebar → User Manual → Import, Export & Photos → Download template** |
| Without signing in | https://ilmforge-erp.vercel.app/IlmForge-Import-Template.xlsx (blank; type your class names) |

**What goes in each column** (* = required)

| Sheet | Columns |
|---|---|
| Classes | Class\*, Sections (e.g. `A, B`), Order |
| Students | Roll No (leave blank), Student Name\*, Father Name\*, Gender, Date of Birth, B-Form No, Class\*, Section, Parent Phone, Parent Email, Mother Name, Address, Religion, Blood Group, Admission Date, Status |
| Staff | Employee Code (leave blank), Name\*, Designation, Role, Phone or Email\*, CNIC, Gender, Date of Birth, Department, Joining Date, Monthly Salary (Rs), Salary Type |

Each sheet's first row is a grey **Example** row; leave it or delete it, it is never imported.
The class typed for a student must exist on the Classes sheet or already be in IlmForge.

### Adding or changing a photo

Open the student's profile (**Student Registry** › click the student) and click
**Add photo** (or **Change photo**). Pick a picture from the computer or phone.

The photo is saved once, on the student's record, and appears everywhere automatically:
ID card, leaving, character and bonafide certificates, the admission form, result cards
and the student and parent portals. Large phone photos are shrunk automatically.

For staff, add the photo in **Staff Directory** › edit the person, or with the small
camera button on their row in **ID Cards**.

> If a profile shows **"This photo is only on this computer"**, the photo was taken with
> an older version of IlmForge and never reached the record. Click that button once to
> save it properly.

### Moving a school to another server

On the old server, open **Import & Export** and click **Export records**. On the new server,
import that same file. Classes, sections, students, parents and staff move across, with their
roll numbers and employee codes. Fee history, attendance and exam marks are not included, and
everyone gets a new password in the login details sheet.

### Finding and managing students

**Sidebar → Student Registry** (`/students`) — search by name, roll number or father name.
Toggle **Active** / **Inactive**. **Promotion** moves a whole class up at session change.

---

<a name="part-4"></a>
## Part 4 — Attendance

### Marking daily student attendance

**Sidebar → Attendance Tracker** (`/attendance-hub`) → **Student Attendance**

1. Select class, section and the date (today by default).
2. Click **Start Marking →**.
3. Mark each student present, absent or leave.
4. Click **Save & Notify**.

**Save & Notify** saves the register *and* sends absence messages to parents of absent
students. If you only want to save without messaging, check the school's notification
settings first — see Part 5 of the in-app manual or ask your admin.

The attendance hub shows **Attendance Not Marked** so you can see at a glance which
classes still need doing today.

### Staff attendance

**Attendance Tracker → Staff Attendance** (`/attendance/staff`) → **Mark Attendance**.

### Other attendance methods

The school may use any of these instead of marking by hand:

| Method | Where | Status |
|---|---|---|
| ID card scan (QR / barcode) | `/attendance/barcode` | Works: handheld scanner or camera |
| Photo check-in | `/attendance/face-attendance` | Works, but a person taps the photo; it does not recognise faces |
| Fingerprint device | `/attendance/biometric-attendance` | Screen works; a physical machine cannot send punches in yet |
| Spreadsheet import (CSV) | `/attendance/excel` | Works: columns `date` (YYYY-MM-DD), `rollNo`, `status` |
| Period-wise (per subject) | `/attendance/period` | Works |

Whatever the method, a student gets **one** attendance record per day. A scan or punch
marks a student present only if nobody has marked them yet, so it never overwrites a
teacher's "Leave" or "Absent".

### Setting up ID card scanning at the gate

Every student ID card printed from **ID Cards** carries a QR code and a barcode of the
student's **roll number**. Scanning either one marks the student present.

**Option A — a handheld scanner (recommended for a busy gate)**

1. Buy any USB or Bluetooth barcode scanner that reads **QR codes and Code 39**
   (sold as "1D/2D scanner"; roughly Rs 4,000–9,000). It must work in
   "keyboard mode" (HID), which nearly all of them do out of the box. No driver is needed.
2. Plug it into the gate computer. To test, open Notepad and scan a card: the roll number
   should appear followed by a new line. If it doesn't add a new line, scan the
   "Enter suffix / CR" setting code in the scanner's own booklet.
3. Sign in to IlmForge on that computer and open **Attendance → Barcode scan**
   (`/attendance/barcode`). Click once in the scan box.
4. Scan cards. Each scan shows the student's name and photo and marks them present.
   Scanning the same card twice is ignored.

**Option B — a webcam or the computer's own camera**

1. Use any USB webcam (720p is enough) or a laptop camera. Place the card about
   15–25 cm from the camera, in good light.
2. Open **Attendance → Barcode scan** and click **Start Camera**. Allow camera access when
   the browser asks. The page must be opened over `https://` (the live site is), or the
   browser will refuse the camera.
3. Hold the card up; the page reads it by itself, about four times a second.

Use Google Chrome or Microsoft Edge. Staff ID cards are not read by this screen; mark
staff on **Staff Attendance**.

### Photo check-in (no face recognition)

**Attendance Tracker → Photo Check-in** shows the photos of a class. The person on duty taps a
student's photo to mark them present. It does **not** recognise faces by itself, and
no camera is needed. Add student photos first (see *Adding or changing a photo*).

Automatic face recognition is not part of IlmForge yet. It would need a separate
recognition model and good-quality enrolment photos; ask your IlmForge contact if your
school wants it.

### Fingerprint machines

The **Biometric Attendance** screen can list your devices and records punches entered
through it, but a physical fingerprint machine (ZKTeco, eSSL and similar) **cannot yet
send its punches to IlmForge by itself**. Until that link is added:

- Do not buy a fingerprint machine expecting it to mark attendance in IlmForge.
- If you already own one, you can copy its daily log into a spreadsheet with the columns
  `date` (YYYY-MM-DD), `rollNo` and `status` (present/absent/leave/late), save it as CSV and
  load it on **Attendance → Excel import**. For daily use, ID card scanning at the gate is
  far less work.

When the device link is added, setting up a machine will be: enter the machine's serial
number in IlmForge, then on the machine set **Comm → Cloud server (ADMS)** to the
IlmForge server address. Each person's ID on the machine must be their roll number
(students) or employee code (staff).

### Correcting a mistake

**Attendance → Corrections** (`/attendance/corrections`) — for changing a register after
it has been saved. Corrections are recorded, so there is a trail of who changed what.

---

<a name="part-5"></a>
## Part 5 — Fees

### Generating monthly fees

**Sidebar → Invoicing Hub → Generate Monthly Fee** (`/fees/generate`)

1. Choose the month.
2. Click **Generate Fee for [month]**.

This creates one invoice per active student from the fee structure. Run it once a month.
There are also **Generate Custom Fee** (one-off charges) and **Generate Transport Fee**.

### Collecting a fee

**Sidebar → Collect Fee** (`/fees/collect`)

1. Type at least 2 characters of the student's name, roll number or father name.
2. Click the student in the results.
3. Their invoices appear. Click **Collect** on the one being paid.
4. Enter the amount, any discount, and the payment method.
5. Click **Confirm Payment**.

A receipt appears which you can print and hand to the parent. The parent is also notified
automatically if messaging is configured.

> The system will not let you collect more than the amount outstanding on an invoice.
> If you try, it tells you the actual amount due.

### Correcting a wrong amount — important

If the wrong amount was entered, **do not delete anything**. Scroll to the
**Payments Received** panel under the student's invoices:

- **Correct** — enter the right amount and a reason. The original entry stays on record,
  marked *Corrected*, and a new receipt is issued.
- **Void** — cancel the payment entirely, with a reason (for example a bounced cheque).

A reason is required for both. The original is never deleted — this is deliberate, so the
school always has an honest record of what was collected and what was changed. Collection
totals, reports and the dashboard all update to the corrected figure immediately.

### Following up defaulters

**Invoicing Hub → Fee Defaulters** (`/fees/defaulters`) — lists students with outstanding
fees and lets you send reminders.

### Other fee screens

| Task | Where |
|---|---|
| Edit or delete an invoice | `/fees/invoices` |
| Family voucher (siblings on one voucher) | `/fees/family-voucher` |
| Discounted students | `/fees/discounted` |
| Annual fee increase | `/fees/increment` |
| Collection report | `/fees/collection-report` |

---

<a name="part-6"></a>
## Part 6 — Exams and results

### Setting up exam rules (once)

**School Settings → Exam Settings** (`/settings/exam-settings`)

Set **Pass / Fail Criteria**, **Grade Boundaries (%)**, **Division Thresholds (%)** and
**Admit Card Instructions**. Click **Save Exam Settings**.

**Exams → Result Configuration** (`/exams/result-config`)

- **Grade Configuration** — **Add Grade** for each grade band (A+, A, B …)
- **Signatories** — **Add Signatory** for the names printed on result cards
- **Final Remarks** — **Add Remark** for the comments teachers can choose

Click **Save Preferences**.

### How many terms your school runs

**School Settings → Exam Settings → Exam Terms**

Choose how many exam terms your school holds in a session, from 1 to 6. Most schools
run two. The Exam Vault then shows one tab per term — *1st Term*, *2nd Term*, and so on
up to *6th Term*.

Set this before creating exams, so each exam can be filed under the right term.

> Lowering the number later does not delete exams already recorded under a removed term.
> They stay in the system and reappear if you raise the count again.

### Creating an exam

**Sidebar → Exam Vault** (`/exams`)

1. Click **Add Exam**.
2. Enter the exam name (Mid Term, Final Term), class, and dates.
3. Choose the **Term** — the dropdown lists the terms your school has configured.
4. Save.

### Entering marks

From the exam row, click **Marks**. Enter marks per student per subject and save.
Teachers can do this for their own classes from the Teacher Portal.

### Results and printing

| Output | Where |
|---|---|
| Result cards | `/exams/:id/results` |
| Admit cards / exam slips | `/exams/exam-slip` |
| Gazette sheet | `/exams/gazette` |
| Merit list | `/exams/merit-list` |
| Annual report card | `/exams/annual-report` |
| Subject analysis | `/exams/subject-analysis` |
| Exam timetable | `/exams/timetable` |
| Question papers | `/exams/question-papers` |

---

<a name="part-7"></a>
## Part 7 — ID cards

**Sidebar → Student Registry → ID Cards**, or go to `/id-cards`

1. Choose **Students** or **Staff** at the top.
2. Filter by class and section if needed.
3. Tick the people you want cards for — or tick the box in the header row to select all.
4. Choose a **design**. Five are available:

   | Design | Shape | Look |
   |---|---|---|
   | Academic | Portrait | Curved header, round photo |
   | Campus Arc | Portrait | Sweeping arcs |
   | Executive | Landscape | Photo left, QR panel on the back |
   | Minimal | Landscape | Clean, plain |
   | Bold Band | Portrait | Strong colour band, large QR |

5. Change the **Primary** and **Accent** colours to match your school.
6. Add a photo for anyone missing one using the small camera button on their row.
7. Click **Print [n] Cards** — the button shows how many you selected, for example
   *Print 12 Cards*. A preview window opens; click **Print ID Cards** in it to send to the printer.

Every card prints front and back together, with a scannable QR code on **both** sides
and a barcode of the ID. Fields with no value are left off the card rather than printed
as a dash.

> Print on card stock if you have it. The cards are standard CR80 size (the same as a
> bank card), so they fit normal ID card holders and lanyards.

---

<a name="part-8"></a>
## Part 8 — Portals: parents, students, teachers

Everyone at the school gets their own portal, branded with your school's name and logo.

### Where to find the links

**Sidebar → Portal Links** (`/settings/portal-links`)

This page lists the sign-in link for every role, with what each person signs in with:

| Portal | Signs in with |
|---|---|
| Admin Dashboard | Email |
| Teacher Portal | Email |
| Accountant Portal | Email |
| Gate Portal | Email |
| Student Portal | Roll number |
| Parent Portal | Phone number |

Use **Copy** on any row, or **Copy all** to send the whole set. **Open** previews the
sign-in page as that person will see it.

> A link only opens the sign-in page — it is not a password and is safe to share.
> What someone can see is decided by their own account, so a parent opening the
> "Admin" link still only reaches the Parent Portal.

### Giving a parent access

Parent accounts are created automatically during admission. The parent signs in with the
**phone number** entered in step 4 of the wizard. Their password is on the credentials
slip printed at admission.

Common problem: the parent's number was typed wrongly at admission. Correct it on the
student record and the parent can then sign in.

### Giving a teacher access

Created automatically when you add the staff member. Details appear on screen once — see
[Part 2](#part-2). The link is always available from Portal Links.

---

<a name="part-9"></a>
## Part 9 — HR, payroll and leaves

**Sidebar → HR Central** (`/human-resource`) — one screen with tabs:

**Staff · Payroll · Attendance · Appraisals · Leaves · Loans**

### Running payroll

**Sidebar → Payroll Manager** (`/payroll`)

1. Check the month shown at the top.
2. Click **Generate Payroll**.
3. Review each staff member's salary, allowances and deductions.
4. Approve and print salary slips.

### Other HR screens

| Task | Where |
|---|---|
| Leave applications and balances | `/leaves`, `/attendance/leave-balance` |
| Staff loans and advances | `/salary/loans` |
| Appraisals | `/staff/appraisals` |
| Departments | `/staff/departments` |
| Staff birthdays | `/staff/birthdays` |
| CV bank | `/staff/cv-bank` |

---

<a name="part-10"></a>
## Part 10 — Reports and printing

**Sidebar → Insights Hub** (`/reports-hub`) is the starting point for reports.

Commonly used:

| Report | Where |
|---|---|
| Fee collection report | `/fees/collection-report` |
| Attendance report | `/attendance/report` |
| Staff attendance report | `/attendance/staff-report` |
| Daily balance sheet | `/accounting/balancesheet` |
| Accounts ledger | `/accounts` |
| Defaulters | `/fees/defaulters` |

### Printing anything

Click the **Print** button on any page. Only the document prints — the sidebar, menus,
search boxes and buttons are automatically left off the paper. Table headings repeat at
the top of each page for multi-page reports.

To save as PDF instead of printing, choose **Save as PDF** as the destination in your
browser's print dialog.

### Certificates

**Sidebar → Certificates** (`/certificates`) — **Student Certificates** and
**Staff Certificates** tabs. Includes school leaving certificates, character certificates
and bonafide certificates. `/certificates/registry` keeps a record of everything issued.

---

<a name="part-11"></a>
## Part 11 — The dashboard

**Sidebar → Smart Dashboard**

**The blue banner** — your school, the date, and when the figures were last updated
(they refresh by themselves every two minutes; the round-arrow icon refreshes now). Its
buttons open **Mark attendance**, **Collect fee** and **Admission** directly.

**The three Today cards** — student attendance (teal), staff attendance (blue) and fee
collected today (purple). A **TO DO** badge means some people are still not marked; the
bar fills as the register is completed. Click a card to go and finish it.

**Needs attention** — appears only when something is actually outstanding: students not
yet marked, unpaid invoices, or invoices that show **more paid than billed** (usually an
amount typed in the wrong unit — open the invoice and correct its total). When nothing
is outstanding it says *All clear*.

**Quick actions** — twelve large shortcuts to the daily jobs (Mark attendance, Collect
fee, Exam Vault, New admission, Scan ID cards, Generate fee, Defaulters and so on).
Click **Customise** to choose your own: tap a shortcut to add or remove it (up to 12),
then **Done**. **Reset** goes back to the standard set. Your choice is remembered on
that computer for your login.

**School health** — a score out of 100 with the reasons underneath it. Each line shows
what was measured against the target, so you can see immediately which one is pulling the
score down. If something has not been recorded yet, it is left out rather than counted
as zero, and the widget says how much of the picture it had.

**The number row** — students, staff, collected today, collected this month, outstanding,
unpaid invoices. Click any of them to go straight to the underlying list.

**Revenue and expenses** — collected against spent for the last 12 months.

**Why this result?** — explains the change from one month to the next: how much came from
student numbers, from fee changes, from collection rate, and from each expense category.
The figures always add up exactly to the total change.

**Forecast** — appears once the school has six months of fee and expense history.

Some panels will say *"N more months of data needed"* on a new school. This is normal:
they switch on by themselves once there is enough history to be accurate.

**Fee income forecast** — once fee income has been recorded in three different months,
a dashed trend line projects the next three months and says whether income is moving up
or down. It is a guide, not a promise.

**All modules** — every area of the school in four coloured groups (Daily work, Money,
Academics, Reports), the same style as the Reports Hub.

**Export PDF** in the blue banner produces a clean copy for board meetings.

---

<a name="part-12"></a>
## Part 12 — Who can do what

Train each person on only the parts they need.

| Role | Can do | Train on parts |
|---|---|---|
| **Admin / Principal** | Everything | All |
| **Accountant** | Fees, vouchers, defaulters, daily balance, expenses | 5, 10 |
| **Teacher** | Attendance and marks for their own classes | 4, 6 |
| **Gatekeeper** | Gate entry, visitors, gate passes | — |
| **Parent** | Their own children only: fees, attendance, results | 8 |
| **Student** | Their own record only | 8 |

Roles are enforced by the system, not by trust. A teacher who opens an admin address is
turned away rather than shown the page.

---

<a name="part-13"></a>
## Part 13 — When something goes wrong

**"The server could not complete that request"**
The system could not reach the server. Check the internet connection and try again. If it
continues, contact your IT support — nothing you did caused it, and no data was lost.

**A page shows no records but you know there are some**
Clear any search box and filters at the top of the page. If a red message appeared, the
server is unreachable, not the data missing.

**A parent cannot sign in**
They must use the **phone number** recorded at admission, not an email. Check the number
on the student record is correct and complete.

**A student cannot sign in**
Students sign in with their **roll number**, not an email.

**The wrong fee amount was collected**
Do not delete it. Use **Correct** or **Void** in the Payments Received panel — Part 5.

**A class name is spelled wrong**
School Settings → Classes → **Rename** on that row.

**Printing includes the menus and buttons**
It should not — only the document prints. If it does, your browser may be printing a
cached copy of the page: reload the page and print again.

**The password was lost before it was written down**
An admin must reset it from the Staff Directory. Passwords cannot be recovered, only reset.

---

## Quick reference — daily routine

| When | Who | Task |
|---|---|---|
| Every morning | Class teachers | Mark attendance, **Save & Notify** |
| Every morning | Office | Check Attendance Not Marked, chase missing classes |
| Through the day | Accountant | Collect fees, print receipts |
| End of day | Accountant | Daily balance sheet |
| Start of month | Office | Generate Monthly Fee |
| Through the month | Office | Follow up defaulters |
| End of month | Admin | Payroll, review dashboard |
| Exam time | Teachers | Enter marks |
| Exam time | Office | Print admit cards, then result cards |
