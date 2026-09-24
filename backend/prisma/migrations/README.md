# Migrations — read before the next deploy

This project ran `prisma db push --accept-data-loss` on every Render build until
now. That command compares `schema.prisma` against the live database and makes
it match — including dropping columns and tables that have diverged, with no
history and no way to roll back. These migrations replace it.

**Provider: PostgreSQL.** `migration_lock.toml` pins it. Production is Neon;
Prisma refuses to run a migration history against a different engine (error
P3019) rather than generating wrong SQL, so this folder is Postgres-only.

---

## The two migrations

| Migration | What it is | Runs on production? |
|---|---|---|
| `20260915000000_baseline_existing_production` | The 80 tables Neon **already has**, as built by the old `db push`. Generated from commit `a0d2a1a`. | **No — mark as applied** |
| `20260915000100_add_visitor_promotion_logs` | The new work: 2 tables, 13 columns, 4 indexes, 6 foreign keys. | **Yes** |

The baseline exists only so Prisma knows where production started. Running it
against Neon would fail — the tables are already there.

---

## One-time setup (do this once, before the next deploy)

Run against production **with `DATABASE_URL` pointing at Neon**:

```bash
# 1. OPTIONAL BUT RECOMMENDED — check Neon matches the baseline.
#    Read-only. Prints the SQL that WOULD be needed to bring the baseline
#    up to your current schema. Expect it to show only the delta migration's
#    changes. Anything else means production has drifted — stop and review.
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# 2. Tell Prisma the baseline is already applied. Writes one row to the
#    _prisma_migrations bookkeeping table. Touches no application data,
#    creates no tables, runs none of the baseline SQL.
npx prisma migrate resolve --applied 20260915000000_baseline_existing_production

# 3. Confirm.
npx prisma migrate status
#    Expect: baseline applied, 20260915000100_add_visitor_promotion_logs pending.
```

After that, every Render deploy runs `prisma migrate deploy` and applies only
what is genuinely new.

---

## What the pending migration will do

No `DROP TABLE`, no `DROP COLUMN`, no `TRUNCATE` — verified. Every added column
is either nullable or has a default, so existing rows are fine.

The only operations that can **fail** (they cannot destroy anything) are six
foreign keys added to tables that already hold data:

| Constraint | Fails if… |
|---|---|
| `Exam.classId → Class` | an Exam row references a missing Class |
| `Test.classId → Class` | a Test row references a missing Class |
| `Test.sectionId → Section` | a Test row references a missing Section |
| `Test.subjectId → Subject` | a Test row references a missing Subject |
| `Quiz.classId → Class` | a Quiz row references a missing Class |
| `BehaviorRecord.studentId → Student` | a BehaviorRecord references a missing Student |

If one fails the migration aborts in a transaction and the database is left
untouched — a failed deploy, not lost data. To check in advance:

```sql
SELECT COUNT(*) FROM "Exam" e
  LEFT JOIN "Class" c ON c.id = e."classId"
  WHERE e."classId" IS NOT NULL AND c.id IS NULL;
-- repeat per row of the table above; every count should be 0
```

Clean up any orphans before deploying.

---

## From here on

```bash
# after changing schema.prisma — creates a migration and applies it locally
npx prisma migrate dev --name describe_the_change

# production (Render runs this automatically)
npx prisma migrate deploy
```

Never reach for `db push --accept-data-loss` against Neon again.

---

## Local SQLite

`schema.prisma` in this working tree is set to `sqlite` for local testing. While
it is, every `prisma migrate` command fails with P3019 — expected, because the
lock says `postgresql`. `prisma db push` still works and is the right tool for
the disposable local `dev.db`.

The consequence: **migrations cannot be tested locally on SQLite.** To verify one
before it reaches production, run it against a Postgres — a Neon branch is the
closest match to production, or `docker compose up postgres` from the repo root.
