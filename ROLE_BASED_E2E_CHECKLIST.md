# Role-Based E2E Checklist (SQA)

## Scope
- Covers Admin, Teacher, Accountant, Parent, Student, Gatekeeper portals.
- Focuses on real end-to-end behavior: auth, permissions, data updates, exports, and error states.

## Pre-Run Setup
- Backend and frontend are running.
- Seed/demo data exists for all main roles.
- School, class, section, subjects, session, and fee structures are configured.
- At least one student has invoices and attendance records.

## Admin Portal
- Login, refresh token flow, and logout work.
- Dashboard loads cards/charts without 404 API errors.
- Settings pages save and reload correctly:
  - Payment settings
  - Theme settings
  - Website settings
- Class, section, and subject CRUD works.
- Student admission, promotion, and profile updates persist.
- Attendance daily and period flows save and reload correctly.
- Fees: generate invoices, collect payments, view receipts.
- Notifications history logs entries after sends.
- Public fee voucher URL resolves by roll number.

## Teacher Portal
- Teacher can login and sees only allowed modules.
- Teacher can mark attendance (if permitted).
- Teacher can create/manage homework.
- Teacher can enter marks for assigned class/subjects.
- Teacher is blocked from finance-only routes (fees/salary sensitive actions).

## Accountant Portal
- Accountant login works and menu is finance-focused.
- Invoice generation and payment collection work.
- Defaulters list and reminders work.
- Finance exports (CSV/XLS/PDF where applicable) download successfully.
- Accountant is blocked from admin-only settings and permission controls.

## Parent Portal
- Parent login works with linked student account.
- Parent can view own child fee and attendance only.
- Parent cannot access other students' records.
- Fee voucher and payment history are visible for linked child.

## Student Portal
- Student login works.
- Student can view own attendance, results, and notices.
- Student cannot access admin/finance endpoints.

## Gatekeeper Portal
- Gatekeeper login works.
- Gatepass operations are usable.
- Gatekeeper cannot access restricted admin/finance settings.

## Security and Permission Tests
- Invalid/expired token returns proper 401 behavior.
- Cross-campus override is rejected for non-admin roles.
- Role mismatch returns 403 with clear message.
- Password reset endpoints require auth and valid payload.

## API Reliability Checks
- All major frontend endpoints map to real backend routes.
- Error state UX appears (no silent failures).
- Critical modules avoid local-only persistence for production settings.

## Export/Document Checks
- Attendance export produces valid file format.
- Fee exports produce valid file format.
- Printable reports/vouchers render complete content.

## Regression Smoke (minimum before release)
- Auth login + me
- Dashboard stats
- Classes subjects
- Sessions
- Payment/theme/website settings
- Attendance period
- Public fee voucher by roll

## Signoff Template
- Build version:
- Date:
- Tester:
- Passed checks:
- Failed checks:
- Known issues:
- Go/No-Go:
