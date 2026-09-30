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

| Method | Where |
|---|---|
| Biometric device | `/attendance/biometric-attendance` |
| Face recognition | `/attendance/face-attendance` |
| Barcode / ID card scan | `/attendance/barcode` |
| Excel import | `/attendance/excel` |
| Period-wise (per subject) | `/attendance/period` |

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

### Creating an exam

**Sidebar → Exam Vault** (`/exams`)

1. Click **Add Exam**.
2. Enter the exam name (Mid Term, Final Term), class, and dates.
3. Save.

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

**Export as PDF** at the top right produces a clean copy for board meetings.

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
