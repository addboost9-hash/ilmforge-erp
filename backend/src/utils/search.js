/**
 * Case-insensitive search filters that work on BOTH database engines.
 *
 * Prisma's `mode: 'insensitive'` is a PostgreSQL-only feature. Passing it
 * while connected to SQLite does not degrade — Prisma rejects the query
 * outright, so every search endpoint returned HTTP 500. That broke student,
 * staff, fee-invoice, library and alumni search, and with them the fee
 * collection screen, which cannot open its payment dialog until a student
 * has been found.
 *
 * SQLite's LIKE is already case-insensitive for ASCII, so omitting `mode`
 * there gives the same behaviour the Postgres branch asks for explicitly.
 */

const isPostgres = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || '');

/** field: { contains: value } — case-insensitive on both engines. */
const contains = (value) =>
  isPostgres ? { contains: value, mode: 'insensitive' } : { contains: value };

/** field: { equals: value } — case-insensitive on both engines. */
const equals = (value) =>
  isPostgres ? { equals: value, mode: 'insensitive' } : { equals: value };

module.exports = { contains, equals, isPostgres };
