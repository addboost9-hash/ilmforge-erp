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

### Step 6 (only if the school ran before IlmForge): bring in past records

Old fee bills and payments, each student's previous balance, past salaries and past
expenses come in from one Excel workbook, each filed on the date it really happened, so
reports and every student's fee record are complete from the first day.
See [Past records](#past-records) in Part 5.

---

<a name="part-2"></a>
## Part 2 — Staff and teachers

### Adding a teacher or other staff member

**Sidebar → Staff Directory → Add Staff** (`/staff/new`)

1. Fill in **Add New Staff Member**: name, CNIC, phone, email, department, date of joining. An email **or** a phone number is enough: without an email the person signs in with their phone number.
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
- **Login ID** — their email address, or their phone number if no email was given
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

The list shows **every** staff member (it used to stop at 25). Use the search box, or the
department buttons above the list (*All*, *English*, *Science*, … *No department*) to see
one department. **Group by department** shows the list in department sections.

### Departments

A teacher's department is chosen on the staff form (**Department**). If the one you need
is not in the list, click **+ New** next to it, type the name and click **Add**: it is
created and picked straight away. Choose **— No department —** to take someone out of
their department.

**Staff Directory → Manage departments** (`/staff/departments`) lists the departments
with how many staff work in each. Click **View / assign** on a department to see its staff:

- **Remove** takes one person out of the department.
- Tick people on the right (those with no department are listed first) and click
  **Add … to (department)** to move several at once.

Departments are also a filter on **Staff Attendance** (mark one department at a time) and
on the **Staff Attendance Report**.

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

**Typed something wrong?** Click **✏️ Correct a mistake in this admission** on the same
screen, fix it, save, and then print. Every field of the admission form can be corrected
later too — see *Correcting an admission* below.

### Correcting an admission

Anything missed or typed wrongly at admission can be put right later **in the same
admission form** you used to admit the student (`/students/<id>/edit`). Open it with:

- **Edit** on the student's row in the **Student Registry**,
- **Edit** (or **Correct details**) on the student's profile,
- **Edit details** on **Admission Form Print → Filled Form**.

The form opens with the student's record already filled in, step by step as at admission:

| Step | What you can fill in or correct |
|---|---|
| 1 Student Info | Photo, family number, admission date, admission test marks, B-Form, names (also in Urdu), father's and mother's details, gender, date of birth, caste, nationality, province, city, religion, addresses, mobile numbers, email, previous school, health |
| 2 Class & Section | Class, section, roll number, status (active, left school, passed out) |
| 3 Fee Details | Free student. Fee amounts and discounts on bills are changed in the student's **Fee Details** or **Collect Fee** |
| 4 Parent Details | Parent mobile (the parent's sign-in), parent's email and CNIC |
| 5 Review & Save | Every change, old value → new value, with **Undo** on each |

- Click any step at the top to go straight to it. The top of the form shows how many
  changes are not saved yet; **Save changes now** saves from any step.
- Only what you change is saved. A value that is wrong (a CNIC with a digit missing, a
  date in the future) is explained on its step and nothing is saved until it is right.
- The parent's mobile cannot be emptied (the parent signs in with it). A new roll number
  becomes the student's sign-in. The parent's email and CNIC are on the parent account, so a
  change also shows for brothers and sisters.
- After saving, the list of what changed is shown with **Print Admission Form** for the
  corrected form.

For a one-line fix, **Quick edit** (the ⚡ button on the row, or on the profile) opens a
short pop-up form with the same fields in tabs. The **Personal Info** tab of the profile
shows every detail that has been filled in.

### Blank admission forms

**Admissions → Admission Form Print** → choose **Blank Form** → **Print Blank Form**.
Useful for walk-in enquiries and for keeping printed forms at the front desk.

### A filled paper form came back: read it in instead of typing

When a parent returns the blank form filled in by hand (or sends a photo of it on
WhatsApp), IlmForge can read it and fill the admission wizard for you.

1. **Admission Form Print → 📄 Filled form came back? Read it in**, or on the first step of
   **New Admission** click **Got a filled paper form back?**
2. Add the pages: **Choose photo / scan / PDF**, **📷 Take a photo** (on a phone or
   tablet), drag the files onto the box, or press **Ctrl+V** to paste a picture you have
   copied. You can also click **Paste details as text** and paste a message with the
   details. Take photos straight on, in good light, one page per photo.
3. Click **Read the form** (10 to 40 seconds).
4. Check the list of what was read. Correct anything in the boxes, untick what you do not
   want. Boxes marked **· check** were hard to read; anything that could not be read at
   all is listed to fill in by hand.
5. Click **Fill the admission form**. The wizard is filled in, including class and section,
   and a green note lists the fields to look at closely. Go through every step against the
   paper, add the student's photo, and click **Complete Admission** as usual.

Nothing is saved until you complete the admission. The pages are sent to an AI reading
service to be read and are not stored by IlmForge.

> If the panel says *Reading paper forms is not switched on yet*, the server needs an AI
> key. Whoever runs your IlmForge server sets `ANTHROPIC_API_KEY` (Claude) or
> `GEMINI_API_KEY` (Google Gemini) in the server settings.

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
7. Underneath, **Imported students** lists everyone just added. Filter **Incomplete**,
   **No photo**, **No date of birth** or **No parent phone** and fix each one right there
   with **Edit** or the photo button, or delete a row added by mistake.

> Dates are day first: **14/03/2014** is 14 March. Type phones as **03001234567**.
> Brothers and sisters with the same parent phone share one parent account.
> Importing the same file twice is safe; anyone already in the school is skipped.
> Students who have already left can be added with **Status = Inactive**, and staff who have
> left with **Status = Left**, when you will bring in their old fees or salaries
> ([Past records](#past-records)). Staff marked Left get no login.

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
| Staff | Employee Code (leave blank), Name\*, Designation, Role, Phone or Email\*, CNIC, Gender, Date of Birth, Department, Joining Date, Monthly Salary (Rs), Salary Type, Status (Active / Left) |

Each sheet's first row is a grey **Example** row; leave it or delete it, it is never imported.
The class typed for a student must exist on the Classes sheet or already be in IlmForge.

### Adding or changing a photo

A student's photo can be added or changed wherever you need it:

| Where | How |
|---|---|
| Student Registry | Click the photo (or the empty photo box) on the student's row |
| Student profile | **Add photo** / **Change photo** |
| ID Cards | A card without a photo says **No photo · Add photo**. **Show only these** lists all of them |
| Certificates | The photo button next to the student's name |
| Admission Form Print | The photo button on the filled form, next to **Edit details** |
| Online admission form | Parents attach it when applying; it comes across when you admit the application |

Pick a picture from the computer or phone: **JPG, PNG or WEBP, up to 5 MB**. It is shrunk
automatically to about 40 KB, so large phone photos are fine.

The photo is saved once, on the student's record, and appears everywhere automatically:
ID card, leaving, character and bonafide certificates, the admission form, result cards
and the student and parent portals.

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

### Finding and fixing student records

**Sidebar → Student Registry** (`/students`)

- Search by name, roll number or father name, or choose a class in **All classes** to list
  the whole class.
- **Active** / **Inactive** switches between current students and those who have left.
- The **Record** column says **Missing: photo, date of birth, …** for anything not filled in yet.
- **Edit** fixes any wrong or missing detail from the admission form (see *Correcting an
  admission* above). Only what you change is saved. If the parent mobile changes, the
  parent signs in with the new number from then on; IlmForge tells you when that happens.
- **Delete** gives two choices:
  - **Mark as left school** — for a student who has left. Everything is kept; the student
    moves to Inactive and can still be given a leaving or character certificate.
  - **Delete record** — only for an entry made by mistake. Unpaid bills are cancelled and
    the logins switched off. It is refused once any fee has been paid: use
    **Mark as left school** instead.

**Promotion** moves a whole class up at session change.

### Online admissions: your school's own admission form

Every school on IlmForge has its own **web name** and its own pages. For Future Foundation
School, for example:

| Page | Link | Who uses it |
|---|---|---|
| School page | `ilmforge-erp.vercel.app/s/future-foundation-school` | Anyone — one link for everything |
| Admission form | `…/s/future-foundation-school/apply` | Parents applying for admission |
| Fee slip | `…/s/future-foundation-school/fees` | Parents printing a fee voucher by roll number |

Each page shows **your** school's name, logo and colours, lists **your** classes and
campuses, and sends everything to **your** school only. Another school's form can never
send an application to you, and yours never to them.

**Where to find your links:** **Sidebar → Portal Links** (`/settings/portal-links`), under
*Share with families*. Each link has **Copy**, **Open** and **QR code**. The admission form's
QR panel also has **Print "Admissions open" poster** — an A4 poster with your logo, name,
QR code and phone number for the gate, the notice board or a banner.

**A parent applies** on the admission form: student's name, class, father's name and mobile
number are required; date of birth, CNIC, email, address and previous school are optional,
and they can attach the child's photo (JPG, PNG or WEBP, up to 5 MB). They get a reference
number such as **ADM-00042** on screen.

**The school is told at once:**

1. The **bell** at the top of every admin page shows a red count of new items. Open it to
   see *New admission application — Online form* with the child's name, class and phone.
2. The dashboard's **Needs attention** says *"1 new admission application waiting for a
   call back"*.
3. An email goes to the school's registered email address (when email is set up).
4. If the office has IlmForge open, a short message pops up within a minute.

**Following it up:** **Admissions → Admission Inquiries** (`/admissions/inquiries`). New
applications are under **New**. For each one you can:

- click the arrow to see everything the parent wrote;
- **call** or **WhatsApp** the parent with one click;
- change the status to **Contacted**, **Admitted** or **Closed**;
- click **Admit** — the admission wizard opens with the child's and father's details,
  the class and the photo already filled in. After admitting, the inquiry is marked
  **Admitted** by itself.

Walk-in and phone enquiries can be added with **Add inquiry**, so every enquiry is in one list.

**Changing your web name:** on Portal Links, **Change web name**, e.g. from
`future-foundation-school` to `future-foundation`. Use small letters, numbers and single
dashes. Links you already shared with the old name stop working, so share the new ones.

> The old address `/apply-admission` without a school name asks the parent *which school*
> instead of guessing. Always share your school's own link.

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
To mark one department at a time, choose it in the **All departments** box first; **Mark
All** then applies only to that department.

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
marks a student present; a student marked *Absent* or *Leave* who then scans in is changed to present (they are there). It never changes a
teacher's "Leave" or "Absent".

### Scanning ID cards for attendance (like a shop till)

Every ID card printed from **ID Cards** carries a QR code and a barcode: a student's
**roll number**, a staff member's **employee code**. A scanner reads them the way a shop
till reads products.

**Option A — a handheld scanner (recommended: fastest)**

1. Buy any USB or Bluetooth barcode scanner that reads **QR codes and Code 39**
   (sold as a "1D/2D scanner"; roughly Rs 4,000–9,000). It works as a keyboard (HID
   mode), which nearly all do out of the box. No driver is needed.
2. Plug it in. To test, open Notepad and scan a card: the roll number should appear
   followed by a new line. If there is no new line, scan the "Enter suffix / CR" code in
   the scanner's own booklet.
3. Sign in to IlmForge on that computer and open **Attendance → Barcode scan**
   (`/attendance/barcode`). **Full screen** makes it a gate screen.
4. Scan card after card. There is no need to click anywhere first: the page catches the
   scanner even when nothing is selected, and every card is saved the moment it is
   scanned, so scanning quickly loses nothing. Each scan shows the photo, name, class
   and roll number:

   | Screen says | Meaning |
   |---|---|
   | **PRESENT** (green) | Marked present now |
   | **LATE** (amber) | Scanned after the late time (see below) |
   | **ALREADY MARKED** (blue) | Scanned earlier today; the first time is shown and nothing changes |
   | **STAFF CHECKED IN / OUT** | A staff card: first scan is arrival, a scan 30 minutes or more later is leaving |
   | **NOT MARKED** (red) | Unknown card, or a student who has left the school; the reason is shown |

   A short beep tells you the result without looking (**Sound on / off**).
5. **Mark late after**: tick it and set the time (for example 08:00); students scanned
   after it are marked *Late*. The setting stays on that computer.
6. **Present today** counts everyone marked so far. **Today's register** opens the class
   registers to mark the rest absent or on leave.

If the internet drops, scans are kept on that computer and sent when it is back
(the screen says *SAVED OFFLINE*).

**Option B — a webcam or phone camera**

On the same screen click **Use camera**, allow camera access, and hold the card's QR code
15–25 cm from the camera in good light. The page must be opened on `https://` (the
live site is).

Use Google Chrome or Microsoft Edge.

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

1. Choose the month and year.
2. Click **Generate Fee for [month]**.

This creates one invoice per active student from the fee structure. Run it once a month.
There are also **Generate Custom Fee** (one-off charges) and **Generate Transport Fee**.

A student who already has that month's fee is skipped, including months brought in from
[Past records](#past-records), so running it twice never bills anyone twice. An admission or
transport fee in the same month does not stop the monthly fee.

### Collecting a fee

**Sidebar → Collect Fee** (`/fees/collect`)

1. Type at least 2 characters of the student's name, roll number or father name.
2. Click the student in the results.
3. Their invoices appear. Click **Collect** on the one being paid.
4. Enter the amount, any discount, and the payment method.
5. **Payment date** is today. If the money was received on an earlier day, choose that day:
   the payment is filed on that date in every report. The message to the parent switches to
   **Do not notify**; change it back if they should be told.
6. Click **Confirm Payment**.

A receipt appears, with the payment date, which you can print and hand to the parent. The
parent is also notified automatically if messaging is configured.

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
fees and lets you send reminders. Each student's parent gets **one** message with the total
still due and the months it covers.

### Other fee screens

| Task | Where |
|---|---|
| Edit or delete an invoice | `/fees/invoices` |
| Family voucher (siblings on one voucher) | `/fees/family-voucher` |
| Discounted students | `/fees/discounted` |
| Annual fee increase | `/fees/increment` |
| Collection report (payments received in a month, with the day each was entered) | `/fees/collection-report` |

<a name="past-records"></a>
### Past records: fees, salaries and expenses from before IlmForge

**Sidebar → Past Records** (`/settings/past-records`) — admin only.

A school that has been running for years can bring its history in, so the dashboard, the
reports, each student's fee record and the payroll are complete from the first day.

**First**, add every student and staff member with [Import & Export](#part-3), including
those who have left: students with **Status = Inactive**, staff with **Status = Left**. Past
records find them by roll number and employee code.

1. Click **Download template**. The workbook has four sheets, plus two lists of your
   students and staff to copy roll numbers and employee codes from.
2. Fill in only the sheets you need:

   | Sheet | One row per | Columns (\* = required) |
   |---|---|---|
   | Fee History | student per month | Roll No\*, Student Name, Fee Month\* (07/2025), Fee Title (blank = Monthly Fee), Fee Amount (Rs)\*, Concession (Rs), Late Fine (Rs), Paid (Rs), Paid On, Method, Receipt No, Remarks |
   | Previous Balance | student | Roll No\*, Student Name, Balance Due (Rs)\*, As Of (date), Remarks |
   | Salary History | staff member per month | Employee Code (or CNIC or Phone), Name, Salary Month\*, Basic Salary (Rs)\*, Allowances, Bonus, Absent / Late / Loan Deduction (Rs), Net Salary (Rs) (a check), Status (Paid / Unpaid), Paid On, Remarks |
   | Expenses | expense | Date\*, Category\*, Amount (Rs)\*, Description, Paid To |

3. Click **Choose Excel file**. **Check before importing** lists every problem by sheet, row
   and column, and the rupee totals (billed, received, owed, salaries paid, spent) to compare
   with your old registers. Nothing is saved yet.
4. Click **Import [n] rows**.

**How it is recorded**

- Every row is filed on its own date: a fee paid on 8 July 2025 counts in July 2025 in every
  report. A row with no **Paid On** date counts on the 10th of its fee month (salaries: the
  last day of the month).
- **Previous Balance** becomes one unpaid bill per student, *Previous Balance (Arrears)*,
  collected in Fee Collection like any other bill. Use **either** Fee History **or**
  Previous Balance for the same months, not both, or the dues are counted twice.
- Anything left unpaid is a real due: parents see it on their portal, and it appears in
  Fee Defaulters and fee reminders. Enter an amount the school has written off as
  **Concession**.
- A paid salary is also recorded under **Expenses › Salaries** on its paid-on day. Do not
  list it again on the Expenses sheet.
- No message is sent to parents or staff, and old fees are not counted as any accountant's
  cash on the daily balance sheet.
- A month already in IlmForge is skipped, so importing the same file twice adds nothing. A
  bill generated in IlmForge but paid by hand gets that payment added to it.
- Months are written **07/2025** (Jul 2025 also works); dates day first, **08/07/2025**;
  amounts in rupees.

**Undo:** **Earlier imports** at the bottom of the page lists each import and what is still
in IlmForge from it. **Undo** removes all of it, after you confirm. Undo is refused once a
fee has been collected or a salary paid in IlmForge against something from that import, so
those receipts stay correct.

> **Only a few entries?** Enter them directly with their real date: **Payment date** in Fee
> Collection, **Paid on** in Payroll Manager, **Date** in Expense Tracker.

---

<a name="part-6"></a>
## Part 6 — Exams and results

**Sidebar → Exam Vault** (`/examination`) takes an exam from start to finish in six
numbered steps, in the order a school works: **1 Exam Setup → 2 Date Sheet → 3 Syllabus →
4 Question Papers → 5 Marks Entry → 6 Results**.

### Before the first exam (once)

**School Settings → Exam Settings** (`/settings/exam-settings`): set the **pass mark**,
**grade boundaries** (A+, A, B, C, D; below D is F), **division thresholds** and **exam
terms** (how many terms your school runs in a session, 1 to 6; most run two). Before a
school changes them, grades are A+ 90, A 80, B 65, C 50, D 40 (40% passes).

**Settings → Subjects** (`/settings/subjects`): add each class's subjects with **Max marks
in exams**: what the subject is marked out of (for example Urdu 75, Drawing 50). Marks
entry, question papers and result cards all use it.

### Step 1 — Exam Setup

1. Choose the term (*1st Term*, *2nd Term*…) and click **Add Exam**.
2. Pick **all the classes** the exam is for (one *First Term* exam can cover the whole
   school), name it, and set the dates. **Submit**.
3. Each exam row shows its classes and dates, and its next steps: **Date sheet**,
   **Papers**, **Roll no. slips**, **Enter marks**, **Results**. **PDF** and **Word** at the
   top give the term's exam list.

### Step 2 — Date Sheet

Choose the exam. Only that exam's classes are listed, with how many papers are planned
for each. **Edit** adds a subject with its date and time (one class can be copied to all).
**Print** prints a class's date sheet; **Print all date sheets** prints every class, one
per page. The bin clears a class's date sheet.

### Step 3 — Syllabus

Each class shows how many of its subjects have a syllabus, and which are missing.
**Write / edit** opens the syllabus page; **Print** prints the class's whole syllabus.

### Step 4 — Question Papers

1. **Paper setup (defaults)** (once per class): the instructions and part headings every
   new paper starts with.
2. Choose the **exam** and **class**: every subject of the class is listed with its paper,
   or *No paper yet*. Click **Make**.
3. Write the paper. Choose time in minutes; each part has a heading, a note and, if
   wanted, **Attempt any N**. Add questions with the buttons: **Multiple choice** (tick the
   correct option), **True / False**, **Fill in the blank**, **Short question**, **Long
   question**, each with its marks. Questions can be moved, copied and deleted. Urdu
   is written right to left automatically.
4. The total is worked out as you go (with *attempt any* counted), and the screen warns
   when it differs from the subject's maximum marks.
5. **Suggest with AI** writes questions on a topic for you to tick and add (it needs an
   AI key on the server; read every question before using it).
6. **Save draft**, or **Save · ready to print**. **Print paper** prints it on A4 with your
   letterhead and boxes for name and roll number; **Answer key** prints it with the
   answers for the teacher.
7. In the list, **Copy** makes the same paper for another section, class or exam (then
   change what differs).

### Roll number slips

From the exam row, **Roll no. slips** (`/exams/exam-slip`) prints each student's slip
with the date sheet.

### Step 5 — Marks Entry

The tab shows each class of the exam with how many marks are in (*Not started*, *In
progress*, *Complete*). Click **Enter marks** for a class to open its sheet:

- Each subject column says what it is out of. Type the marks; **A** means absent.
- **Enter** or **↓** moves to the next student, **↑** back, **Tab** across.
- An orange box is changed but not saved; a red one needs fixing (more than the maximum,
  or half marks: marks are whole numbers).
- Each student's total, percentage and grade update as you type.
- **Save N changes** saves only what changed. Empty a box and save to take a mark out.
- Teachers can enter marks only for the classes they teach.

### Step 6 — Results

Choose the exam, class and section: the screen shows students, passed, failed, average
and the top positions.

- **Result sheet and report cards**: the whole class with every subject, total,
  percentage, grade, **position in the class** and pass/fail; **Print result sheet**
  (landscape) and **Print report cards (A4)**, one per student with photo, father's name,
  subjects, totals, position, division and signatures.
- **Gazette**, **Merit list** and **Failed students** open for the class (and section)
  chosen.
- **Publish result** shows the result to parents and students in their portal; **Hide
  again** takes it back. A result cannot be published before any marks are entered.
- **Result card settings** (the second sub-tab) only changes how result cards look; it
  does not publish anything.

A student passes when the overall grade is not F and no subject is F. Absent from a paper
counts as failing that paper. Positions are within the student's own class.

| Also available | Where |
|---|---|
| Annual report card (all terms) | `/exams/annual-report` |
| Subject analysis | `/exams/subject-analysis` |
| BISE-style result card | `/exams/bise-result-card` |

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
6. **School Logo** (top left): if it says *No logo yet*, click **Add logo** (admin). The logo is
   saved to the school's profile, so it prints on every card, certificate and voucher, on every
   computer.
7. Add a photo for anyone missing one: **Add photo** (or the camera button) on their row.
8. Click **Print [n] Cards** — the button shows how many you selected, for example
   *Print 12 Cards*. A preview window opens; click **Print ID Cards** in it to send to the printer.

Every card prints front and back together, with a scannable QR code on **both** sides
and a barcode of the ID. The school's full name is printed; a long name takes two lines.
Fields with no value are left off the card rather than printed as a dash.

> Print on card stock if you have it. The cards are standard CR80 size (the same as a
> bank card), so they fit normal ID card holders and lanyards.

---

<a name="part-8"></a>
## Part 8 — Portals: parents, students, teachers

Everyone at the school gets their own portal, branded with your school's name and logo.

### Where to find the links

**Sidebar → Portal Links** (`/settings/portal-links`)

The top of the page has your public links (school page, admission form, fee slip — see
*Online admissions* in Part 3). Below them, the sign-in link for every role, with what each
person signs in with:

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

1. Choose the month and year at the top (it opens on the current month).
2. Click **Generate Payroll**. Staff who joined after that month are left out of it.
3. Review each staff member's salary, allowances and deductions. **Edit** changes a month
   that is not paid yet; a paid month cannot be changed.
4. Set **Paid on** to the day the salaries were paid (today, unless it was earlier), then
   **Pay** one person or **Pay all**.
5. Print salary slips.

Each paid salary is also recorded under **Expenses › Salaries** on its paid-on day, so the
dashboard's spending and the profit and loss include it. A month cannot be paid twice.

### Recording expenses

**Sidebar → Expense Tracker** (`/expenses`)

Add an expense with its **date** (today unless it was spent earlier), category, amount and a
description. The list shows one month at a time with its total; choose another month, or
**All**, at the top. A wrong entry can be edited or deleted.

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

### Daily balance sheet

**Accounts Ledger → Daily Balance Sheet**, or **Insights Hub** (`/accounting/balancesheet`), shows
each accountant's cash in hand: what they collected since they last handed over cash, less what they spent.

- Cash is counted by when a payment was **entered**. A payment entered today but dated an
  earlier day is counted today (the cash is still in hand) and is marked with the date
  written on it.
- Old records brought in from Past records are shown apart: they are nobody's cash.
- **Settle** records that the cash was handed over; the sheet then starts again from zero.

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
| **Admin / Principal** | Everything, including Import & Export and Past Records | All |
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

### Working without internet

IlmForge keeps working when the school's internet drops:

| | Without internet |
|---|---|
| Opening IlmForge | Opens as normal on a computer or phone that has used it before. |
| Pages you opened earlier | Show the data they had when you last saw them. |
| **Marking attendance** (class register, Mark Now, teacher portal, staff attendance) | **Saved on this device** and sent automatically when the internet is back. |
| Anything else (fees, admissions, marks, settings) | Needs the internet. You are told "You are offline" and nothing is lost from the form; save again when the connection is back. |

While offline, a dark bar at the bottom says **You're offline** and how many attendance
saves are waiting. When the connection returns it says **Back online**, sends them by
itself and shows *"2 attendance saves sent"*. If any are still waiting, an amber bar has a
**Send now** button.

> Keep the device signed in until the waiting attendance has been sent. Absence messages to
> parents go out when the register reaches the server. Fee payments are never saved
> offline: a receipt only exists once the server has confirmed the payment.

A weak signal no longer signs anyone out. Signing out removes this device's saved copies of
your data, so the next person on a shared office computer cannot see them.

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

**A fee, salary or expense happened on an earlier day**
Enter it with that date: **Payment date** in Fee Collection, **Paid on** in Payroll Manager, **Date**
in Expense Tracker. It is filed on that date in every report.

**A past-records file was imported by mistake**
**Past Records → Earlier imports → Undo** removes everything that import added. If it is
refused, fees were collected or salaries paid against it since; the message names them.

**A student's details are wrong or missing**
**Student Registry** → find the student → **Edit**. See Part 3.

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
