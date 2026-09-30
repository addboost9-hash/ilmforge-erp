# Migrations — read before the next deploy

This project ran `prisma db push --accept-data-loss` on every Render build until
now. That command compares `schema.prisma` against the live database and makes
it match — including dropping columns and tables that have diverged, with no
history and no way to roll back. These migrations replace it.

**Provider: PostgreSQL.** `migration_lock.toml` pins it. Production is Neon;
Prisma refuses to run a migration history against a different engine (error
P3019) rather than generating wrong SQL, so this folder is Postgres-only.

---

## The migrations

| Migration | What it is | Runs on production? |
|---|---|---|
| `20260915000000_baseline_existing_production` | The 80 tables Neon **already has**, as built by the old `db push`. Generated from commit `a0d2a1a`. | **No — mark as applied** |
| `20260915000100_add_visitor_promotion_logs` | The new work: 2 tables, 13 columns, 4 indexes, 6 foreign keys. | **No — `db push` already applied it** |
| `20260929000000_add_payment_corrections` | Fee payment corrections: 4 nullable columns, 1 unique index, 1 index, 1 self-referencing foreign key on `FeePayment`. | **Yes — genuinely new** |

Neither runs against Neon. The baseline describes where production started;
the delta was already applied by the last `db push` deploy. Both are simply
recorded so Prisma knows where the history begins.

---

## One-time setup (do this once, before switching render.yaml)

**Both migrations are already reflected in production.** The deploy that
shipped these files still ran `db push --accept-data-loss`, which applied the
new tables and columns to Neon before `migrate deploy` was ever switched on.
So both are marked as applied — neither is executed.

Run against production, with `DATABASE_URL` pointing at Neon:

```bash
cd backend

# 1. OPTIONAL BUT RECOMMENDED — confirm Neon already matches the schema.
#    Read-only. Prints the SQL that WOULD be needed to reconcile them.
#    Expect EMPTY output. Anything printed means production has drifted —
#    stop and review before going further.
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# 2. Record both migrations as applied. Each writes one row to the
#    _prisma_migrations bookkeeping table. No application data is touched,
#    no table is created, none of the migration SQL runs.
npx prisma migrate resolve --applied 20260915000000_baseline_existing_production
npx prisma migrate resolve --applied 20260915000100_add_visitor_promotion_logs

# 3. Confirm. Expect: "Database schema is up to date!" with both applied.
npx prisma migrate status
```

### The third migration is different

`20260929000000_add_payment_corrections` was written **after** the switch away
from `db push`, so unlike the first two it has **not** been applied to Neon.
Do not `migrate resolve` it. It runs on the next deploy, or manually with
`npx prisma migrate deploy`.

It adds four nullable columns, two indexes and one self-referencing foreign
key to `FeePayment`. Nothing is dropped and no existing row is rewritten:
every payment already recorded simply reads as "not voided". The SQL was
checked against `prisma migrate diff` output for a PostgreSQL datamodel and
matches it exactly.

Only after step 3 reports clean, switch the build command over:

```bash
git add render.yaml backend/render.yaml
git commit -m "Use prisma migrate deploy instead of db push"
git push origin main
```

From that point every deploy applies only genuinely new migrations, and a
failure stops the build instead of rewriting the database.

## What these migrations contain (already applied in production)

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

These applied cleanly during the deploy that shipped them, which means no
orphaned rows existed. Kept here for reference if you rebuild from scratch:

```sql
SELECT COUNT(*) FROM "Exam" e
  LEFT JOIN "Class" c ON c.id = e."classId"
  WHERE e."classId" IS NOT NULL AND c.id IS NULL;
-- repeat per row of the table above; every count should be 0
```


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
