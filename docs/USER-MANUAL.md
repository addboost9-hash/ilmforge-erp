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
14. [IlmForge desktop — no internet needed](#part-14)
15. [The Visitor Desk — everyone who comes to the school](#part-15)

---

<a name="part-1"></a>
## Part 1 — First-time setup (do this in order)

**The order matters.** You cannot admit a student before classes exist, and you cannot
generate fees before a fee structure exists. Doing it out of order is the most common
cause of "the system won't let me" during training.

### Step 1: School profile

**Sidebar → School Settings**

1. Fill in **School Identity** — school name, and **Upload Logo**. To print without a logo,
   click **Remove Logo**. The name can be changed here at any time.
2. Fill in **Contact Details** — address, phone, email.
3. Click **Save Profile**. A logo removed here disappears from every computer the next time
   it opens IlmForge.

> The logo and name you set here appear on ID cards, fee vouchers, admission forms,
> result cards and the login page your staff and parents see. Set it properly once.

**The school stamp** (same page, right side). Stamp the school's stamp on plain white paper,
take a clear photo from above, and click **Upload the stamp**: the paper's white is removed.
Under **Print it on**, choose the papers that carry it: roll number slips, result cards, date
sheets, fee cards and the fee register, and the attendance register. It prints over the left of
the principal's signature. Only the admin or the principal can change it; teachers and the
accountant print with it, parents and students never receive the picture.

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
   Leave the roll number empty and IlmForge makes one. A roll number you type must be new
   in the school (capitals do not matter) and use only letters, digits and - / _ . with no
   spaces, because it is also the student's sign-in and ID card code.
3. **Fee Details** — the fee pulls from the class fee structure. Apply a discount here if
   the school has agreed one, or mark the student as free.
4. **Parent Details** — parent name and **phone number**. The phone number is how the
   parent will sign in, so enter it correctly.
5. **Review & Admit** — check everything, then click **Complete Admission**.

**The same child is never admitted twice.** Admission is refused, with the name, class and
roll number of the record already there, when:

- the **B-Form number** already belongs to a student (with or without dashes), or
- the **same name and father's name** are already admitted with the **same date of birth**
  or the **same parent's phone**.

This also stops a second record when **Complete Admission** is clicked twice. A student
who has left is not admitted again: open their record and set them to *Active*. Two
children with the same names but a different phone and date of birth are admitted as
usual. The same check applies to Excel imports and to admission leads.

### After admission — two things to print

On the success screen:

- **Print Admission Form** — the full A4 admission form on your school letterhead,
  already filled in, with signature lines for parent, class teacher, coordinator and
  principal. Print it, get it signed, keep it in the student's file.
- **Print Credentials Slip** — the student's and parent's portal sign-in details.
  Hand this to the parent. The passwords on it are random and shown only on this slip;
  at the first sign-in the student and the parent are asked to choose their own.

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
> **Nobody is added twice.** A student already in the school is skipped (*Already in this
> school: … Will be skipped*): the same roll number, the same B-Form number (with or
> without dashes), or the same name and father's name with the same date of birth or
> parent phone. A student listed twice in the file is added once. Importing the same file
> again is safe. A roll number in the file that belongs to a *different* student is shown
> as a problem to fix.
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
| Students | Roll No (leave blank), Student Name\*, Father Name\*, Father CNIC, Gender, Date of Birth, B-Form No, Class\*, Section, Parent Phone, Parent Email, Mother Name, Address, Religion, Blood Group, Admission Date, Status |
| Staff | Employee Code (leave blank), Name\*, Designation, Role, Phone or Email\*, CNIC, Gender, Date of Birth, Department, Joining Date, Monthly Salary (Rs), Salary Type, Status (Active / Left) |

Each sheet's first row is a grey **Example** row; leave it or delete it, it is never imported.
The class typed for a student must exist on the Classes sheet or already be in IlmForge.

### Adding every student's photo at once

After the students are imported, **Import & Export → Student photos in bulk** (at the
bottom of the page) adds all the photos in one go.

1. **Name each photo file with the student's roll number**, for example `NUR-26-001.jpg`.
   **Download the photo list**: every student with their class, roll number and the file
   name to give their photo (a `/` in a roll number is written `-`). The B-Form number
   (`3520212345671.jpg`) or the student's full name (`Ayesha Khan.jpg`, when no other
   student has that name) also work.
2. Click **Choose photos** and select them all (in the folder press **Ctrl + A**), or
   **Choose a folder**. Large camera photos are fine: each is made small (about 40 KB)
   before it is sent.
3. The list shows who each photo is for: **Ready**, **Has a photo: kept**, or why a photo
   was not matched (for example a camera name like `IMG_2041.jpg`). Nothing is saved yet.
4. Click **Upload**. A student who already has a photo keeps it, unless **Replace photos
   students already have** is ticked.

Photos not matched are left out: rename them and choose them again. Choosing the same
photos twice is harmless.

> Quickest way: give the photographer the photo list, class by class, and ask for each
> photo to be saved with the roll number as its name.

### New students from their photos

When all you have is each student's photo and name, **Import & Export → New students from
photos** (`/students/from-photos`) registers them in one go.

1. Name each photo with the student's name: `Ali Raza.jpg`. (`ali raza.jpg` becomes
   *Ali Raza*; a camera name such as `IMG_2041.jpg` is pointed out, and you type the name.)
   **The class can be part of the name** (a file name cannot hold `/`): `9th Zaria khan.jpg`
   is *Zaria Khan* in Class 9; `Class Five Ali Raza.jpg`, `9th A Zaria khan.jpg` (section A)
   and `Ali Raza 5th.jpg` work too. A class the school does not have (`11th …`) is asked
   for, never guessed. *Nur Muhammad* stays a name, not Nursery.
2. Choose the **class and section**, and if you like the gender and admission date.
   **The whole school at once:** keep one folder with a folder per class
   (`School Photos/Class Five/Ali Raza.jpg`, sections as `Class Five/A/…` if you like) and
   click **Choose a folder**. Each class folder finds its class however it is written:
   *Class Five*, *Class 5*, *5th*, *Grade 5* and *Class V* are all Class 5; *PG* is Play
   Group, *Nur* Nursery. A table shows each folder with its class, how many photos are
   ready and how many students are already registered; a folder that names no class asks
   for its class there.
3. What is not known yet is filled the same for everyone: **father's name `.`**, **father's
   CNIC `11111111111`**, **parent phone `111111`**. Change them on the page if you want
   other stand-ins.
4. Choose the photos. Each is framed as a **passport photo (35 × 45 mm, head and
   shoulders)**: the head is found on the plain wall behind. Click a photo to move or zoom
   its frame. A name already in the class, or twice in the photos, is left out unless you
   tick it.
5. Click **Register**, then **Download login details**.

Each student gets a roll number, the passport photo, and a parent account of their own: a
stand-in phone never joins two students as brother and sister. In the Student Registry
they show as **incomplete** (father's name, parent phone, father's CNIC) until you put in
the real details with **Edit**; the real phone then becomes the parent's sign-in.

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

To move the whole school, with fees, attendance and results, to IlmForge desktop on the
school's own computer, see Part 14.

### Roll numbers: rearrange and renumber a class

**Student Registry → Roll Numbers** (`/students/roll-numbers`). Roll numbers are made
automatically at admission; here a class gets the order and the numbers the school wants.

1. Choose the **class** (and section, to number each section on its own).
2. **Put them in order**: by name, father's name, admission date, current roll number, or
   girls or boys first. Move any student by hand with the ↑ ↓ buttons, or drag the row.
3. **Number them**: a prefix (for example `NUR-` or `2026/`), the first number and how many
   digits (`1`, `01`, `001`), then **Number in this order**. Or type any student's new roll
   number yourself.
4. Two students with the same number, or a number with a space, is marked in red and cannot
   be saved. A number already used by a student of another class is refused when saving.
5. **Save roll numbers** shows every change (old → new) first. After saving, **Undo** puts them
   back.

Roll number slips, result cards, the fee and attendance registers follow the new order.

> **Important:** the roll number is also on each student's **ID card** (barcode and QR) and is
> used at the attendance kiosk, the fee scanner and to sign in. After renumbering, print new ID
> cards for those students. They sign in with the new roll number and the same password; marks,
> fees and attendance stay with the student. Every change is kept in the audit log.

**Print roll list** prints the class with its roll numbers.

### Finding and fixing student records

**A child recorded twice** (admitted again, imported from Excel and then registered from
photos, a form saved twice): **Students → Duplicates** lists every child recorded more than
once, the records side by side with what each holds (fee payments, bills, attendance, marks,
photo, roll number), and marks the one to **keep**. **Delete** the extra one (it asks first),
or **Delete all the extra records** for the groups that are surely one child (same B-Form, or
same name and father). "Possibly the same child" (same name in the class, father's name
missing) is for you to check one by one. A record with fee payments cannot be deleted: keep
that one. Roll number slips also warn about children recorded twice and link here.

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
| Face attendance | `/attendance/face-attendance` | A phone recognises faces: Auto or Confirm (see *Face attendance* below) |
| Fingerprint machine | `/attendance/biometric-attendance` | Works: ZKTeco machines in Cloud server (ADMS) mode (see *Fingerprint machines* below) |
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

### Face attendance: a phone that recognises faces

A phone or tablet on a stand at the gate (or a classroom door) with IlmForge open recognises
the faces of students and staff and marks them, in the same register as the fingerprint
machine (present, late after the school's time, left on a later pass).

**Where:** the admin: **Attendance Tracker → Face Attendance**. The gate: sign in with the
**Gatekeeper** account → **Face Attendance**.

**1. Teach it the faces (admin, once):** **Face Attendance → Teach faces → Learn faces**. It
reads the photo on each student's (or staff member's) record and keeps only 128 numbers for
the face. Photos in which no face is found are listed: change the photo, or use **Add a face
with the camera** (2–3 photos looking at the camera, in the light of the place where the
phone will stand). Run **Learn faces** again after changing photos (tick *Again for everyone*).

**2. Put the phone on a stand** at face height, facing the line, and press **Start**. The
first time it downloads the face models (about 7 MB); after that they are kept on the phone.

**3. Choose the mode** (the phone remembers it):

| Mode | What happens | Use it when |
|---|---|---|
| **Confirm** | The name and photo appear; the person on duty taps **Yes, mark** (or **Not this person**) | Starting out, or no-one watches the line closely |
| **Auto** | Marked by itself as soon as the face is surely recognised (twice in a row, clearly nearer than anyone else) | Someone on duty can see the phone |

- **Who**: everyone, students only or staff only; **Class**: one class only (a classroom door).
- **Strictness**: Normal; **Strict** if it mixes up children who look alike; **Easy** if it
  often fails to recognise.
- The same person within a minute is not marked again.
- Not recognised? **Find by name or roll no.** under the camera and tap **Mark**.
- No internet? The mark is kept on the phone with its time and sent when the internet is back.

**Good to know:** in Auto mode a photo held up to the camera could be taken for the person,
so keep the phone where someone on duty can see it (a fingerprint or face *machine* is harder
to fool). Faces are recognised on the phone itself; only the 128 numbers per face are kept,
and **Delete their face data** removes them for anyone (for example when a parent asks).

### Fingerprint machines

**Attendance Tracker → Fingerprint Machines** (`/attendance/biometric-attendance`). A ZKTeco
machine (K40, MB160, MB20, SpeedFace and others with **Cloud Server Setting** or **ADMS** in
its menu) sends every punch to IlmForge by itself over the internet; no software runs on the
school's computer. Students are marked present (late after the school's time); staff are
checked in and out. The page has five tabs.

**Buying a machine:** check with the dealer that its menu has **Comm → Cloud Server Setting**
(or ADMS) before you buy. A machine with both finger and face (MB160, SpeedFace) helps people
whose fingerprints are worn.

**1. Machines: connect one**

1. **Add machine** with a name ("Main gate") and its serial number (on the machine:
   **Menu → System Info → Device Info**, or the sticker on the back).
2. On the machine, **Menu → Comm. → Cloud Server Setting**: type the server address and port
   shown under *What to type into the fingerprint machine*, with HTTPS on (online).
3. Within a minute the card says **Connected** and shows what is on the machine: users,
   fingers, faces, punches stored, its fingerprint version.

Each machine's card also shows the work going to it ("Names put on: 120 of 300 done") and
what the office can ask of it:

| Button | What it does |
|---|---|
| **Put names on it** | Everyone's name and Device ID onto the machine (everyone, students, staff or one class) |
| **Copy fingers here** | The fingerprints IlmForge keeps, onto this machine: enrol once, every machine knows the finger. Tick *reset or replaced* to send everything back to a machine that lost its users |
| **Fetch punches again** | The punches of chosen days, sent again (after the internet was down). Nothing is counted twice |
| **Get users and fingers** | Everyone on the machine, with their fingerprints, sent to IlmForge (an old machine) |
| **Remove people who left** | Takes students and staff who left off the machine, with their fingerprints |
| **Set clock** | Sets the machine's clock. IlmForge warns when a machine's clock is more than 5 minutes off |
| **Machine log** | The work sent to it, the machine's answers, and the last exchanges: for when something does not work |
| **Restart**, **Switch off**, **Remove** | A switched-off or removed machine's punches are refused |

Work for a machine that is off waits and goes when it connects; work it never answers is sent
again. The bell tells the office when a machine has been silent for 15 minutes in the school day.

**2. People & fingers: who is enrolled**

- Each person's **Device ID** (1 then the student's number; 2 then the staff member's number),
  the machines they are on, and how many fingerprints IlmForge **keeps** (a backup: a machine
  sends the fingerprint after it is enrolled).
- Tick **No fingerprint kept yet** and **Print list** for the people still to enrol.
- **Enrol** starts enrolment from the office: the connected machine asks for the finger
  three times. Some models cannot be started this way; then enrol on the machine
  (**Menu → User Mgt.**).
- **Users on the machines**: everyone enrolled, by user number. A machine that had users
  before IlmForge: press **Get users and fingers** on it, then link each user here once (by the
  suggested name, or **Find…**); **Link clear matches by name** links all the sure ones. Their
  fingers need not be enrolled again. Punches from a user not linked are kept, and marked at
  their own time when the user is linked.
- A Device ID already used on a machine by someone else is never overwritten: it is reported.

**3. Punch log:** every punch and scan of any days, by machine, students or staff, not linked
yet, or how (finger, face, card); CSV.

**4. Staff timesheet** (administrator): each staff member's month against their shift: arrived,
left, hours, late and early minutes, half days, overtime, absent days (a working day with no
attendance and no approved leave), days with no check-out. Open a name for the day by day,
and the pencil to correct a day: a reason is required and kept in the audit log. CSV (opens in
Excel) and Print. Days before the school kept staff attendance, or before someone joined,
are not counted absent.

**5. Rules**

- **Auto-absent:** at the time you choose (for example 09:30), on school days and not on
  holidays, every student with no attendance yet in the chosen classes is marked absent (or
  leave when a leave is approved), and parents get the register's absent message. Choose only
  the classes that punch on a machine. **Safety:** if far fewer students arrived by machine
  than usual (a machine off or offline), nobody is marked and the bell says why. **Run now**
  and **Undo today** (only the automatic marks nobody changed).
- **Staff shifts:** start, end, grace minutes (late after start + grace; early when leaving
  more than the grace before the end), half day when fewer hours were worked, overtime after
  the end, working days; then who works which shift. Shifts past midnight are not supported.
- **Late times and check-out:** students' late time, staff without a shift, minutes before a
  second punch counts as leaving, the machines' time zone.
- **Late rule for payroll:** "every 3 lates count as 1 day" shows on the timesheet as
  *Lates as days*. Salaries are not changed by it.

**Good to know:** IlmForge keeps fingerprints exactly as the machine sends them; they copy only
to machines with the same fingerprint version (shown on each card). Machines must be on the
internet (online edition) or on the same network as the school's computer (desktop edition).

### The attendance register

**Attendance Tracker → Attendance Register** (`/attendance/register`; in the teacher portal,
the **Attendance Register** tab). A class's month the way the register book is kept: a row
for each student, a column for each day.

| In a day's box | Means |
|---|---|
| **P** (green) | Present |
| **A** (red) | Absent |
| **L** (yellow) | Leave |
| **Lt** (blue) | Late (counts as present) |
| · | Not marked |
| grey column | Sunday or a holiday (holidays come from the school calendar) |

- Whatever is marked anywhere (the daily register, the kiosk, a fingerprint machine) shows
  here at once; this month's register refreshes itself every 30 seconds.
- The last columns give each student's present, absent, leave, late and **attendance %**; the
  bottom rows give each day's present and absent counts.
- **Show** picks out students below 75%, absent 3 or more days, absent today or not marked today.
- **Correct a day:** the class teacher or the admin clicks the day and chooses Present, Absent,
  Leave, Late or Not marked. It shows who marked it and how (register, ID card scan,
  fingerprint). No message goes to parents from here; every change is kept in the audit log.
- **A student's year:** click the name. The months appear as calendars, with the totals and the
  attendance %; choose a session or calendar year at the top. **Print / Save as PDF** prints it
  on one page.
- **Print / Save as PDF** prints the month on A4 landscape, each section from a new page, with
  signature lines and the school stamp. **Excel** downloads the same register.

### Correcting a mistake

**Attendance → Corrections** (`/attendance/corrections`) — for changing a register after
it has been saved. Corrections are recorded, so there is a trail of who changed what. The
class teacher or the admin can also correct a day straight from the attendance register.

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

### Collecting for several months at once

When a parent pays for some of the months owing, use the **Collect fee — choose the months**
panel under the fee calendar (in the accountant portal it is on **Fee Collection**).

1. Only the months still **unpaid** are listed, oldest first, all ticked. Untick the months
   not being paid now (or click a month's **Collect** on the calendar to tick just that one).
2. Type the **amount received**. It starts as the total of the ticked months.
3. Before saving, each month shows what happens: the amount pays the **oldest ticked month
   first**, each in full before the next. The last month reached may be **part paid**; the
   rest stay unpaid. The line below says what is left as balance.
4. Choose the day received, how it was paid and whether to message the parent, then click
   **Collect**. One receipt lists every month: what it owed, what was paid now and what is
   still owing. **Print receipt** prints it (A5).

**Print bank challan** (or **Print fee slip** when the school has no bank account) prints
just the ticked months for the parent to pay; see [Bank challans](#bank-challans).

<a name="bank-challans"></a>
### Bank challans: parents pay at the bank

**Invoicing Hub → Bank Challans** (accountant portal: **Bank Challans** tab)

The parent deposits the challan at the bank, so the money goes straight into the school's
account, and the school records the deposit against the challan number.

**Set up once (admin): Settings → Payment Settings → Bank Settings**

- **Bank account details**: the school's account (bank, branch, branch code, account title,
  account number or IBAN).
- **Campus accounts**: tick a campus to give it its own account; its students' challans then
  name that account. Other campuses use the school's.
- **Bank Challan**: the due day of the month, a fixed **late fee** after the due date (0 for
  none), and a note printed on the challan.
- **Voucher Settings → Number of Copies**: 3 prints Bank, School and Parent copies.

With no bank account, the same page prints as a **fee slip** (School and Parent copies),
paid at the school office.

**Print challans**

1. Choose the class (or all classes), the section if wanted, and the **due date**.
2. Click **Make and print**. Each student who owes gets one challan on its own A4 page:
   the copies side by side to cut apart, every unpaid month (more than nine: the oldest
   are one line of earlier dues), the total payable by the due date and after it, the
   amount in words, the account, and a box for the bank's stamp.
3. Printing again with nothing changed gives the same challan numbers. If a student's
   months changed, a new number is issued and the old challan is marked **Replaced**.

A challan number is 12 digits, for example **261100012301** (year and month issued, the
student, the challan of the month). Paying online, the parent writes it as the reference.

**Record deposits** (from the bank's stamped copy)

1. Type or scan the challan number and press Enter. The student and the months on the
   challan show, with what each still owes.
2. Check the amount deposited and the day, add the bank's reference if there is one, and
   click **Record deposit**. The months are marked paid, oldest first, as a bank payment.

Deposited after the due date with the late fee: the late fee is added to the newest month
and paid. A part deposit pays the oldest months first and the challan shows **Part paid**.
A challan already recorded is refused, so nothing is counted twice.

**Bank statement**

1. Download the account statement from internet banking as Excel (.xlsx) or CSV.
2. Open it here. The date and credit columns are found on their own; change them if needed.
3. **Check** compares each credit that has a challan number with the challan: *Matches*,
   *Amount differs*, *Already recorded* or *No challan*. Matches are ticked.
4. **Record** the ticked ones. Credits without a challan number are left for you to look at.

**All challans** lists them by status (not paid yet, paid, part paid, replaced, cancelled),
class or search; print one again, or cancel one printed by mistake.

### A student's fee year: the fee calendar

When a student is chosen on **Collect Fee**, a **Fee calendar** shows the whole session (or
year) month by month, above the list of invoices:

- **Paid** (green): the fee, the amount paid, the **day it was collected** and the receipt number.
- **Part paid** (yellow) and **Unpaid** (red): the balance still owed, with a **Collect**
  button that opens the payment for that month.
- **Due** (blue): this month's fee, not late yet.
- **Not billed** (grey): no fee was generated for that month. **Upcoming**: a month still to come.

The line above the months says how many months are pending and which ones (for example
*3 months pending — Rs. 7,500 (Sep, Oct, Nov)*), any **earlier dues** from before the
session, and the last day a fee was collected.

- Choose another session or calendar year from the list at the top right. It opens on the
  session today falls in, or this calendar year if no session covers today.
- **Fee card** prints the student's year on one page: each month's fee, discount, paid,
  balance, the day collected and receipt number, with the pending months, the total balance
  and signature lines for the accountant and the principal. Choose **Save as PDF** in the
  print dialog to keep it as a file.
- **Class register** opens the Fee Register on the student's class.

### The fee register: a whole class month by month

**Invoicing Hub → Fee Register** (`/hub/fees?tab=register`). In the accountant portal it is
the **Fee Register** tab.

Like the school's fee register book: a row for each student, a column for each month.

| In a month's box | Means |
|---|---|
| ✓ 05/09 (green) | Paid, collected on 5 September |
| P 1,500 (yellow) | Part paid; Rs. 1,500 still owed |
| 2,500 (red) | Unpaid |
| 2,500 (blue) | Due this month, not late yet |
| — | Not billed |

1. Choose the **Class** (or **All classes**), the **Section**, and the **Session or year**.
2. **Show** picks out students: *With pending fees*, *2 or more months pending*,
   *3 or more months pending*, or *Nothing pending*. The boxes at the top (Students with fees
   pending, 3 or more months pending) do the same when clicked.
3. The last columns give each student's **months pending**, **earlier dues** (from before the
   session) and **balance**. The bottom rows give each month's total collected, the balance
   still owed, and how many students have paid.
4. Click a month to see its bills and every payment with date, method and receipt number.
   Click a student's name to collect their fee.
5. **Print / Save as PDF** prints the register on A4 landscape, each class (and section) from
   a new page, with signature lines for the accountant and the principal. **Excel** downloads
   the same register as a spreadsheet.

> A voided payment is not counted: the month shows as owing again, as it is on the invoice.

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
| Fee register (each student month by month, with the day each fee was collected) | `/hub/fees?tab=register` |
| Bank challans (print, record deposits, bank statement) | `/hub/fees?tab=challans` |

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

**Sidebar → Exam Vault** (`/examination`) takes an exam from start to finish in seven
numbered steps, in the order a school works: **1 Exam Setup → 2 Date Sheet → 3 Syllabus →
4 Roll No. Slips → 5 Question Papers → 6 Marks Entry → 7 Results**.

### Before the first exam (once)

**School Settings → Exam Settings** (`/settings/exam-settings`): set the **pass mark**,
**grade boundaries** (A+, A, B, C, D; below D is F), **division thresholds** and **exam
terms** (how many terms your school runs in a session, 1 to 6; most run two). Before a
school changes them, grades are A+ 90, A 80, B 65, C 50, D 40 (40% passes).

**Settings → Subjects** (`/settings/subjects`): add each class's subjects with **Max marks
in exams**: what the subject is marked out of (for example Urdu 75, Drawing 50). Marks
entry, question papers and result cards all use it.

### Step 1 — Exam Setup

1. Choose the term (*1st Term*, *2nd Term*…) and click **Add Exam**. The form opens on the
   term you are looking at. **Add a term** (next to the term tabs, admin) adds a 3rd, 4th…
   term, up to six; **Remove** takes the last one away (only once it has no exams).
2. Pick **all the classes** the exam is for (one *First Term* exam can cover the whole
   school), name it, and set the dates. **Submit**.
3. Each exam row shows its classes and dates, its **progress** (how many class-sections
   have a date sheet, how much of the marks are in, and whether the result is
   published) and its steps: **Date sheet**, **Roll no. slips**, **Papers**, **Marks**,
   **Results**, each opening on that exam. **PDF** and **Word** at the top give the term's
   exam list.

### Step 2 — Date Sheet

Choose the exam. Only that exam's classes are listed, with how many papers are planned
for each. **Edit** opens the class's papers:

- **Add every subject** lists the class's subjects; **Add a paper** adds one by hand.
- **Quick fill dates** gives the papers one day after another from the first date
  (Sundays skipped), all at the same time. Move papers up or down first to set the order.
- Each paper has a subject, date, start and end time, and a room if wanted.
- **These papers are for**: all sections of the class (the usual) or one section only.
- Two papers on one day, or a paper outside the exam's dates, is pointed out; the same
  subject twice, or a paper that ends before it starts, cannot be saved.
- **Save papers** saves the whole list at once.

**Print** prints a class's date sheet; **Print all date sheets** prints every class, one
per page. The bin clears a class's date sheet. The same papers are printed on the roll
number slips.

### Step 3 — Syllabus

The syllabus is written **for each exam**: what each class prepares, subject by subject.

1. Choose the **term** and the **exam**. Each class of the exam shows how many subjects are
   written (a green bar when all are).
2. Click **Write** (or **Open**) on a class. Its subjects are on the left (✓ when written); the
   open subject shows the **date of its paper** from the date sheet.
3. Write the **chapters**: the chapter or unit, and what to prepare (pages, topics, exercises).
   Press **Enter** in a chapter to add the next one; move them up or down; add notes for
   parents and students.
4. Faster ways:
   - **Paste a list**: one chapter per line, from Word or WhatsApp. What to prepare can follow a
     dash or a tab, e.g. `Chapter 1: Numbers - pages 1 to 20`.
   - **Copy from…**: the same subject in another exam, in another class, or the class syllabus
     written before; then change what differs.
5. **Save** (or Ctrl+S). Going to another subject, or back to all classes, saves on its own;
   **Save and next** moves through the subjects one by one.
6. **Print** one class, or **Print all classes** (each class on its own page): the school's
   letterhead, each subject with the date of its paper, its chapters and notes, signature lines
   and the school stamp. Choose *Save as PDF* to send it on WhatsApp.

The question paper editor shows this syllabus, so papers are set from it.

### Step 4 — Roll No. Slips

Choose the term and the exam (or click **Roll no. slips** on the exam's row). Three steps:

1. **Subjects and date sheet** — each class of the exam, with how many papers it has.
   Choose a class and set its papers exactly as in the Date Sheet step (it is the same
   list). **Same papers for every class** copies the open class to every class of the
   exam.
2. **Design the slip** — the preview on the right is exactly what prints.
   - **Title** (for example *Roll Number Slip* or *Admit Card*) and **colour**.
   - **Two slips on an A4 page** (saves paper; cut along the dashed line) or **one, larger**.
   - **School name and logo**: the name printed on the slip (empty: the name in School
     Profile), **Print the logo on the slip** (untick to print without it) and, for the
     admin, **Add logo / Change logo** (the school's logo everywhere).
   - **Roll number**, one of three:
     - **the student's own** roll number;
     - **exam roll numbers, class by class**: every student of the first class, then the
       next class;
     - **mixed exam roll numbers, to stop copying**: one student of each class in turn.
       From 5001: the first student of Play Group 5001, of Nursery 5002, of Prep 5003… then
       the second student of each class, and so on. Seat the hall in number order (print
       the **Seating list**) and no student sits beside a classmate. Classes follow the
       order in School Settings → Classes.

     Exam roll numbers can have a prefix (such as *T1-*) and a first number (such as 5001).
     They are **fixed the first time the slips are printed**: a slip printed again later
     keeps its number, and a student admitted since gets the next number after the highest,
     so no number is ever given twice. Before the slips are handed out, the admin or
     principal can **Number this exam afresh**.
   - **On the slip**: photo, father's name, day and time of each paper, room, marks of each
     paper, an invigilator's signature column, instructions, and the signatures at the
     bottom: the **student's**, the **principal's** and, if wanted, the class teacher's.
     Untick any of them to leave it off every slip. Untick **Father's name** to print the
     slips (and the seating list) without it, e.g. while students registered from photos
     still have the stand-in `.`; with it ticked, a `.` prints as "—".
   - **Principal**: name, title and a **picture of the signature** (sign on white paper and
     take a clear photo; the white is removed). Without a picture, the principal signs each
     slip by hand. If the result card settings have the principal's signature, the slip
     uses it until another is chosen.
   - **Instructions** (one per line; the same as Exam Settings) and a **footer line**.
   - **Save design**.
3. **Print and download**
   - **Download all classes (PDF)** prints every student's slip, class by class, each
     class starting on a new page. In the print window choose **Save as PDF** to download.
   - Or one class (**Print**), one section, or **one student** (search by name or roll
     number).
   - The **Check** column shows a class with no date sheet, students without a roll number
     and students without a photo, so they can be fixed first.
   - **Seating list** (with exam roll numbers): every candidate in number order with class
     and an empty *Seat / room* column, to arrange the hall.
   - Every student gets **one** slip. A child recorded twice in a class (the same name and
     father's name) is printed once, and a yellow note names the extra record so it can be
     removed in Students.

The slips are also at `/exams/exam-slip`.

### Step 5 — Question Papers

1. **Paper setup (defaults)** (once per class): the instructions and part headings every
   new paper starts with.
2. Choose the **term** and **exam**. Every class of the exam is listed with its subjects:
   grey = no paper, yellow = draft (with how many questions are still to write), green = ready.
   Click a subject to make or open its paper.
3. **Start from a pattern.** A new paper offers three patterns, each adding up to the
   subject's marks: *Objective and subjective (board style)*, *Junior classes* (fill in the
   blanks, true or false, MCQs, short questions) and *Short and long questions*. Change any
   count, "attempt any" or marks, and click **Lay out the paper**: the parts are made with
   empty questions (shaded yellow) to write in. Or **Start empty**.
4. **Write the questions**, in any of these ways, in each part:
   - type them (Multiple choice with the correct option ticked, True / False, Fill in the blank,
     Short, Long, each with its marks);
   - **Paste questions** typed in Word or WhatsApp: numbered `1.` `2.`…; options `a)` `b)`… on
     their own lines or one line make a multiple-choice question (`*` after the right one);
     `______` makes a fill in the blank; `(True/False)` at the end a true or false question;
   - **From earlier papers**: questions of earlier papers of the same subject (any class),
     to tick and add;
   - **Suggest with AI** on a chapter: the exam's syllabus is shown above the questions;
     click a chapter to have questions suggested on it (needs an AI key; read every question).
5. The total is worked out as you go (with *attempt any* counted) and checked against the
   subject's marks. **Preview as printed** shows the page exactly as it prints.
6. **Save draft** (Ctrl+S) keeps unwritten questions; **Save · ready to print** needs every
   question written.
7. **Print paper**: choose **lines to write the answers on** (for classes that answer on the
   paper) and **larger text** (junior classes); the choice is remembered. **Answer key**
   prints the answers for the teacher. **Print all** on a class prints all its papers (ready
   ones, when there are) each from a new page; **Keys** their answer keys.
8. In the list, **Copy** makes the same paper for another section, class or exam (then
   change what differs).

### Step 6 — Marks Entry

The tab shows each class of the exam with how many marks are in (*Not started*, *In
progress*, *Complete*). Click **Enter marks** for a class to open its sheet:

- Each subject column says what it is out of. Type the marks; **A** means absent.
- **Enter** or **↓** moves to the next student, **↑** back, **Tab** across.
- An orange box is changed but not saved; a red one needs fixing (more than the maximum,
  or half marks: marks are whole numbers).
- Each student's total, percentage and grade update as you type.
- **Save N changes** saves only what changed. Empty a box and save to take a mark out.
- Teachers can enter marks only for the classes they teach.

### Step 7 — Results

Choose the exam, class and section: the screen shows students, passed, failed, average
and the top positions.

- **Result sheet and result cards**: the whole class with every subject, total,
  percentage, grade, **position in the class** and pass/fail; **Print result sheet**
  (A4 landscape: the class's figures, top three marked) and **Print result cards (A4)**,
  or the printer button on a row for one student.
- **The result card** is one framed A4 page per student: the school's letterhead (logo,
  name, motto, address and contact), the roll number, the student's details and photo,
  each subject with maximum marks, marks obtained, percentage (with a small bar), grade and
  pass or fail, the totals, position *of how many*, division, a PASSED / FAILED seal, the
  final remark with lines for the class teacher's remarks, the school's grading scale with
  the class's highest percentage, and the signatories with the stamp. The school's logo
  prints faintly behind the page. The **result card header text** in Exam Settings, if
  set, prints under the title.
- Parents and students print the same card from their portal (**Download Result Card** /
  **Result card**) once the result is published, as a **provisional copy**: without the
  signature pictures and stamp, which stay on the card the school issues.
- **Gazette**, **Merit list**, **Failed students** and **Subject analysis** open for the
  class (and section) chosen; **Whole-year result (all terms)** opens the class's annual
  result card.
- **Publish result** shows the result to parents and students in their portal; **Hide
  again** takes it back. A result cannot be published before any marks are entered.
- **Result card settings** (the second sub-tab) only changes how result cards look; it
  does not publish anything. There: the grades, the **signatories** (each can have a
  picture of the signature; **Add picture**), the **final remarks** for each percentage
  range (From %, To %, Remark; add or remove), and what the card shows.

A student passes when the overall grade is not F and no subject is F. Absent from a paper
counts as failing that paper. Positions are within the student's own class.

**Annual result card** (`/exams/annual-report`, or *Whole-year result*): choose the session,
class and section. Every exam of the class in that session is counted (an exam saved
without a session counts in the session it was held in, else the current one). Each
student's year shows each exam's marks per subject, the year's total, percentage, grade,
position in the class and pass or fail; print all cards or one. The card adds attendance
(days present) when *Show attendance on marksheet* is on in Exam Settings, and a *Promoted
to class* line for students who passed.

All printed exam papers (result cards, result sheet, annual cards, date sheets, roll number
slips) share one style: the letterhead with a double rule, a title ribbon, the logo faint
behind the page, and the school's colour (navy unless a darker colour is chosen in the
School Profile). The fee register and fee card, attendance register, syllabus, fee challan
and receipt, and salary letter use the same letterhead style.

| Also available | Where |
|---|---|
| Annual result card (every exam of the session, subject by subject) | `/exams/annual-report` |
| Subject analysis | `/exams/subject-analysis` |
| BISE-style result card | `/exams/bise-result-card` |

---

<a name="part-7"></a>
## Part 7 — ID cards

**Sidebar → Student Registry → ID Cards**, or go to `/id-cards`

1. Choose **Students** or **Staff** at the top.
2. Filter by class and section if needed.
3. Tick the people you want cards for — or tick the box in the header row to select all.
4. Choose a **design** from the pictures under **Card Design**: each is drawn in your
   colours. **Portrait**, **Landscape**, **Students** and **Teachers & staff** narrow the list.
   Eleven are available:

   | Design | Shape | Look | Suits |
   |---|---|---|---|
   | Academic | Portrait | Curved header, round photo | Everyone |
   | Campus Arc | Portrait | Sweeping arcs | Everyone |
   | Executive | Landscape | Photo left, QR panel on the back | Everyone |
   | Minimal | Landscape | Clean, plain | Everyone |
   | Bold Band | Portrait | Strong colour band, large QR | Everyone |
   | Geometric | Landscape | Faceted colour band, round photo on a white ring, barcode under it | Everyone |
   | Ribbon | Landscape | Bold title, hanging ribbon with the logo, underlined fields, *valid until* | Everyone |
   | Playful | Portrait | Bright shapes and stars, big ringed photo, name band; terms and large QR on the back | Junior classes |
   | Diagonal | Portrait | Angled colour bands, framed photo, QR tile; contact details on the back | Teachers and staff |
   | Night Curve | Portrait | Dark card, white curved panel with the photo, QR tile | Teachers and staff |
   | Arch | Portrait | Large rounded colour arch behind the photo, QR tile | Everyone |

   The title follows the person: **Student ID Card**, **Teacher ID Card** (a designation with
   *teacher*, *lecturer* or *instructor*) or **Staff ID Card**. A staff card shows the
   designation, department, employee ID, joining date and phone; a student card the class,
   father's name, roll number and date of birth.

5. Change the **Primary** and **Accent** colours to match your school. Under **On the Card**,
   **Valid until** (for example *March 2027*) prints on the designs that show it. The design,
   colours and validity are remembered on this computer.
6. **School Logo** (top left): if it says *No logo yet*, click **Add logo** (admin). The logo is
   saved to the school's profile, so it prints on every card, certificate and voucher, on every
   computer.
7. Add a photo for anyone missing one: **Add photo** (or the camera button) on their row.
8. Click **Print [n] Cards** — the button shows how many you selected, for example
   *Print 12 Cards*. A preview window opens; click **Print ID Cards** in it to send to the printer.

Every card prints front and back together, with a scannable QR code and a barcode of the
ID (the roll number or employee code, which the attendance kiosk reads). The colours print
as designed: there is no need to tick *Background graphics* in the print dialog. The school's full name is printed; a long name takes two lines.
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
slip printed at admission, and they choose a new one at the first sign-in.

> **First passwords.** Students and parents admitted before this change may still have the
> old password made from their roll number or phone number. Anyone who signs in with such a
> password is now asked to set a new one (at least 8 characters) before anything else opens.
> When a password is changed or reset, every other device signed in to that account is
> signed out.

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

### Paying salaries through the bank

1. Give each staff member their account: **Staff → Edit → Salary bank account** (bank,
   account title, account number or IBAN). Leave it empty for staff paid in cash.
2. **Payroll Manager** → choose the month → **Pay through bank**.
3. Staff with an account are listed with their net salary (pending ones ticked); staff
   without one are listed apart, to be paid in cash.
4. Choose the account the salaries are paid **from** (the school's or a campus's, from
   Payment Settings), the date and, if wanted, the cheque number.
5. **Print letter for the bank**: the letter on your letterhead asking the bank to debit the
   school's account and credit each person, with the list, the total in figures and words,
   and lines for the authorised signatories. Or **Download sheet (CSV)** for the bank's
   bulk upload in internet banking.
6. Once the bank has paid, **Mark as paid**: those salaries are paid on that date and
   added to Expenses, as **Pay** does.

### Recording expenses

**Sidebar → Expense Tracker** (`/expenses`)

Add an expense with its **date** (today unless it was spent earlier), category, amount and a
description. The list shows one month at a time with its total; choose another month, or
**All**, at the top. A wrong entry can be edited or deleted.

### Other HR screens

| Task | Where |
|---|---|
| Leave applications and balances | `/leaves`, `/attendance/leave-balance` (see below) |
| Staff loans and advances | `/salary/loans` |
| Appraisals | `/staff/appraisals` |
| Departments | `/staff/departments` |
| Staff birthdays | `/staff/birthdays` |
| CV bank | `/staff/cv-bank` |

---

### Leave applications

- To record a student's leave from the office, enter the student's **roll number** and the
  dates; the list shows the student's name and class.
- **Approve** takes the days off the student's (or staff member's) leave balance for the
  session the leave starts in, once. Rejecting a leave that was approved puts the days back.
- Leave is decided by the admin or the principal.

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
| **Gatekeeper** (also the receptionist) | Gate entry, the Visitor Desk, gate passes | 15 |
| **Parent** | Their own children only: fees, attendance, results | 8 |
| **Student** | Their own record only | 8 |

Roles are enforced by the system, not by trust. A teacher who opens an admin address is
turned away rather than shown the page.

---

<a name="part-13"></a>
## Part 13 — When something goes wrong

### Working without internet

IlmForge keeps working when the school's internet drops. (To run the school with no internet
at all, use **IlmForge desktop**: see Part 14.)

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

<a name="part-14"></a>
## Part 14 — IlmForge desktop: no internet needed

IlmForge desktop is the whole of IlmForge installed on one of the school's own Windows
computers. It needs no internet. The school's records are kept on that computer, and other
computers, tablets and phones in the school can use it over the school's Wi-Fi or network.
Everything in Parts 1 to 13 works the same way in it.

### Installing

You need a Windows 10 or 11 computer (64-bit) with about 1 GB of free space, the installer
(**IlmForge-Setup-<version>.exe**) and a licence from IlmForge (WhatsApp 0346-5146609).

1. Double-click the installer. If Windows says **Windows protected your PC**, click
   **More info → Run anyway**. (Windows says this about programs not yet signed with a
   code-signing certificate.)
2. Accept the licence agreement, keep the suggested folder (or choose another) and click
   **Install**. No administrator password is needed.
3. IlmForge opens. It also has a shortcut on the desktop and in the Start menu.

### Activating

The first time, IlmForge asks for the licence. The screen shows **This computer's ID**
(four groups such as `A684-640A-00FA-8899`). A licence can be made for one computer only;
for that, send this ID to IlmForge.

Paste the licence (it starts with `ILMF1.`) or click **Open a licence file…**, then
**Activate**. It is checked on the computer itself, with no internet.

| Message | What to do |
|---|---|
| That is not an IlmForge desktop licence | Copy the whole licence, from `ILMF1.` to the end. |
| This licence was not issued by IlmForge, or it was changed | Copy it again exactly as you received it. |
| This licence is for a different computer | Ask IlmForge for a licence for this computer's ID. |
| This licence has expired | Ask IlmForge for a renewal. |
| This computer's date is earlier than when IlmForge last ran | Set the correct date and time in Windows, then open IlmForge again. |

### Setting up the school (once)

After the licence, choose how to begin:

- **Start a new school**: the school's name, your name, your email (your sign-in) and a
  password. No email is sent. Then do Part 1 of this manual.
- **Bring the school from IlmForge online**: for a school already using IlmForge on the
  internet. First, online, an admin opens **Backup & Restore** and clicks **Download
  everything for the desktop app**. That saves a file ending in **.ilmforge**; bring it to
  this computer (USB drive, email, WhatsApp) and choose it. Every record comes across:
  students, parents, staff, classes, fees and payments, attendance, exams and marks,
  settings and photos. Everyone signs in with the same email or phone and password as
  online.
- **Restore a desktop backup**: for a school moving to a new computer (see below).

> The online school is copied, not moved, and the two do not stay in step afterwards. Once
> the school works on the desktop app, enter everything there: records added online later
> do not reach the desktop.

### Every day

Open IlmForge from the desktop shortcut and sign in as usual. Admins have **This Computer**
in the sidebar (also **Help → This computer**): the school's data folder, backups, the
licence and the school network.

Close IlmForge at the end of the day like any program. If no backup was made in the last
four hours, one is made as it closes.

### Other computers and phones in the school

1. On the IlmForge computer: **This Computer → Other computers and phones in the school →
   On** (or the **School network** menu).
2. It shows an address such as `http://192.168.1.10:8090`. On another computer, tablet or
   phone connected to the same Wi-Fi or network, open that address in Chrome or Edge and
   sign in.
3. The first time, Windows may ask whether IlmForge may use the network: tick **Private
   networks** and click **Allow**.

Keep IlmForge open on the main computer while others use it. With the network on, closing
its window keeps it running next to the clock (the IlmForge icon); right-click that icon
and choose **Quit IlmForge** to stop it.

> If the address stops working after the Wi-Fi router restarts, the main computer may have
> been given a new address: **This Computer** shows the current one. Whoever looks after the
> Wi-Fi can give that computer a fixed address so it does not change.

Attendance marked on another device while the network is down is kept on that device and
sent when it is connected again, as in Part 13.

### Backups

IlmForge makes a complete backup of the school by itself:

- every day while it is open (the last 14 are kept);
- when it closes, if none was made in the last four hours;
- before an update, and before a backup is put back.

On **This Computer**, **Back up now** makes one straight away and **Save a copy to…** saves
one wherever you choose. **Do this every week to a USB drive and keep it away from the
computer**: a backup on the same computer does not survive a broken disk, theft or a virus.

To put a backup back: **This Computer → Put back** next to it, or **Restore from a file…**
for a copy on a USB drive. IlmForge asks first and keeps the current data as a backup
(*Before a restore*); then everyone signs in again.

The school's files are in `C:\Users\<Windows user>\AppData\Roaming\IlmForge`
(**This Computer → Open folder**): `data` holds the records, `backups` the backups and
`logs` what support may ask for.

### A forgotten password

On the main computer, click **Forgot Password?** on the sign-in page (or **Help → Reset a
password…**), choose the person, type the new password twice and click **Save the new
password**. No emailed code is needed. On other computers the sign-in page says to ask an
admin or use the main computer. An admin can also give teachers, parents and students a new
password in **Portal Management**.

### Moving to a new computer

1. On the old computer: **This Computer → Save a copy to…** onto a USB drive.
2. On the new computer: install IlmForge and enter the licence. A licence for one computer
   does not work on another: ask IlmForge for a licence for the new computer's ID.
3. Choose **Restore a desktop backup** and pick the file from the USB drive.

### Updating IlmForge

Run the new installer; there is no need to uninstall first. The school's records stay. When
it first opens, IlmForge brings the database up to the new version by itself, after keeping
a copy (*Before an update* in the backups list).

### The licence

**This Computer** shows who it is licensed to, until when, and the days left. From 14 days
before the end, IlmForge reminds you each time it opens. To renew, get a new licence from
IlmForge and click **Enter a new licence** (or **Help → Licence…**).

If the licence ends, IlmForge opens at the licence screen until a new one is entered. The
records stay on the computer, untouched. When the computer has internet, IlmForge checks that
the licence is still in good standing; only the licence number is sent.

### What still needs the internet

SMS, WhatsApp and email messages to parents go out only while the computer has internet.
AI help (AI Copilot, reading a paper admission form, question suggestions) is not switched on
in the desktop app.

### Removing IlmForge

Windows **Settings → Apps → IlmForge School Management → Uninstall** removes the program
only: the school's records and backups stay in the folder above. To remove those too, first
save a backup copy somewhere safe, then delete that folder.

---

<a name="part-15"></a>
## Part 15 — The Visitor Desk: everyone who comes to the school

Parents, people asking about admission, someone with a complaint, a parent paying the fee or
taking a child early, a job candidate, a vendor: each is written down at reception, with why
they came, which child it is about, what they said, and when they left. The admin sees it all
as it happens.

**Where:** the admin: sidebar → **Visitor Desk**. Reception: sign in with a **Gatekeeper**
account (make one for the receptionist under Staff) → **Visitor** tab → **Open the Visitor Desk**.

### A visitor comes in

1. Type their **CNIC** (the dashes come by themselves). Someone who came before is found at
   once: name, mobile, address, how many visits and the last one. No CNIC? Tick **No CNIC**:
   the mobile number finds them instead.
2. A first visit: write the **name**, **mobile** and **address** (not needed for a delivery).
   A **photo** of the visitor and of the **CNIC card** can be taken with the computer's camera.
   Both are optional: no camera, no photo.
3. Choose **why they came**: Admission, Complaint, Fee, Meet a teacher, Meet the principal,
   Take a child early, Result, Certificate / documents, Job interview, Vendor, Other.
   - **Complaint**: choose what it is about (teacher, studies, transport, fee, cleanliness,
     bullying / safety, uniform / books). It goes to **Complaints** for the principal.
   - **Admission**: the child's name and class. It becomes a lead in **Admission CRM**.
   - **Take a child early**: a **gate pass** is made for each child whose record has the
     visitor's CNIC (or the father's typed). Any other child: the desk is told not to release
     the child until the office has checked.
4. **The child**: a CNIC finds the children whose record has it as the father's CNIC, so
   whoever comes (mother, uncle) types the **father's CNIC**. Or find the child by **name, roll
   number or B-Form**. For a fee visit, the fee still due shows with each child.
5. **Remarks**: what the visitor said (it shows on the admin's live feed, and in the
   complaint), and **office notes**, which only the office ever sees.
6. **Check in**, then **Print the slip**. The slip has a number (V-1042) and a QR code.

### A child whose record lacks the father's details

Students registered from their photos have the father's name `.`, CNIC `11111-1111111-1`
and phone `111111`. That stand-in CNIC finds nobody, so find the child by name. The desk then
asks for the father's name, CNIC and mobile, which are offered from the visitor when he is
the father. They are **not** written to the record straight away: the admin approves them
under **Visitor Desk → Approvals** (the bell says when some wait). Approved, they go on the
child's record, and the parent's sign-in moves to the real mobile number.

### Leaving

At the gate, scan the slip's **QR code** (a USB scanner types it into the box by itself; or
**Camera**), or type the **slip number**, and choose the result: **Resolved**, **Follow-up
needed** or **Called again**. Without the slip: **Inside now** → **Check out**. Before closing,
**Inside now** shows who is still in the school, which is also the list to check in an emergency.

### The admin's live feed

**Visitor Desk → Live feed**, and the top of the dashboard: everyone who came today, newest
first, with what they said, how long they have been in and who wrote them down. It updates by
itself every few seconds and works on a phone. A child being taken early or a bullying /
safety complaint shows in **red**, and pops up on the admin's screen through the bell.
CNICs show in part (35202-•••••••-1) on lists, the feed and the slip.

### The kiosk: visitors fill the form themselves

A tablet at reception, in **Urdu or English** with big buttons.

1. The admin: **Visitor Desk → Kiosk tablets → Add a kiosk tablet**. Open the link it shows
   on the tablet once (scan its QR code with the tablet's camera). The tablet remembers it.
2. The visitor chooses why they came, writes their details, and gets a number (V-1043).
   Their entry waits under **From the kiosk** at the desk until reception **Confirms** it.
3. A parent sees their children only with the **father's CNIC and the last 4 digits of the
   mobile number the school has**, and then only first names and classes: the kiosk never
   shows photos and cannot search children by name, so a stranger cannot look children up.
4. With nobody using it for a minute, the form clears itself for the next visitor.
5. A lost or stolen tablet: **Remove** it under Kiosk tablets; it can do nothing after that.

### When a device does not work

| Not working | Instead |
|---|---|
| Camera | Skip the photo; it is optional |
| QR scanner | Type the slip number, or Inside now → Check out |
| Printer | Tell the visitor the slip number |
| Kiosk tablet | Reception enters the visitor at the desk |
| Internet or computer | **Write in later → Print the paper register** (print a few in advance). Write visitors on it; when the system is back, enter each line under **Write in later** with the times on the paper. |

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
