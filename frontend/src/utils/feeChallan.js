/**
 * Fee for several months, and bank challans: the parts with no screen.
 *
 *   oldestFirst(a, b)               the order bills are paid in (as the server pays them)
 *   planMonths(invoices, amount)    how an amount is split: oldest month first, each in
 *                                   full before the next -> { lines, left, total }
 *   amountInWords(paisa)            'Rupees Twelve Thousand Five Hundred Only'
 *   defaultDueDate(today, dueDay)   this month's due day, or a week from today once it has passed
 *   addDays(ymd, n)
 *   CHALLAN_STATUS                  how each status reads and looks
 *   findChallanNo(text)             a challan number inside a statement's description
 *   toYmd(value)                    a statement's date, in any usual form -> 'YYYY-MM-DD' | ''
 *   moneyToPaisa(value)             '12,500.00' -> 1250000 (credits only; '' for none)
 *   parseCsv(text)                  rows of cells
 *   guessColumns(table)             { headerRow, date, amount, reference } column numbers
 *   statementRows(table, cols)      [{ line, challanNo, amount, date, text }] money received
 */
import { monthNumber } from './feeMonth';

const periodKey = (inv) => (Number(inv.year) || 0) * 100 + (monthNumber(inv.month) || 0);
const timeOf = (v) => (v ? new Date(v).getTime() : 0);
export const oldestFirst = (a, b) =>
  (periodKey(a) - periodKey(b)) || (timeOf(a.dueDate || a.createdAt) - timeOf(b.dueDate || b.createdAt)) || ((a.id || 0) - (b.id || 0));

/** An amount over the chosen bills, oldest month first. */
export function planMonths(invoices, amount) {
  let left = Math.max(0, Math.round(Number(amount) || 0));
  const sorted = [...invoices].sort(oldestFirst);
  const lines = sorted.map((inv) => {
    const due = Math.max(0, Math.round(Number(inv.dueAmount) || 0));
    const pay = Math.min(due, left);
    left -= pay;
    return { inv, due, pay, balance: due - pay, state: pay === 0 ? 'none' : pay === due ? 'paid' : 'part' };
  });
  return { lines, left, total: lines.reduce((t, l) => t + l.due, 0) };
}

/* ── Amount in words, as written on a challan in Pakistan ──────────────── */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
const three = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ''}` : two(n));
function words(n) {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1000);
  const rest = n % 1000;
  return [
    crore && `${words(crore)} Crore`,
    lakh && `${two(lakh)} Lakh`,
    thousand && `${two(thousand)} Thousand`,
    rest && three(rest),
  ].filter(Boolean).join(' ');
}
export const amountInWords = (paisa) => `Rupees ${words(Math.max(0, Math.round(Number(paisa || 0) / 100)))} Only`;

/* ── Dates ─────────────────────────────────────────────────────────────── */
export const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** The school's due day this month; once it has passed, a week from today. */
export function defaultDueDate(today, dueDay = 10) {
  const day = Math.min(Math.max(parseInt(dueDay, 10) || 10, 1), 28);
  return Number(today.slice(8, 10)) <= day ? `${today.slice(0, 8)}${String(day).padStart(2, '0')}` : addDays(today, 7);
}

export const CHALLAN_STATUS = {
  open: { label: 'Not paid yet', bg: '#FEF3C7', fg: '#92400E' },
  paid: { label: 'Paid', bg: '#DCFCE7', fg: '#166534' },
  part_paid: { label: 'Part paid', bg: '#FFEDD5', fg: '#9A3412' },
  replaced: { label: 'Replaced', bg: '#E5E7EB', fg: '#374151' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B' },
};

/* ── Bank statements ───────────────────────────────────────────────────── */

/**
 * A challan number written anywhere in a line: 12 or 13 digits (year and
 * month issued, the student, the challan of the month), spaces or dashes
 * allowed between the parts. The year and month must be real.
 */
export function findChallanNo(text) {
  const re = /(?<!\d)(\d{2})(\d{2})[\s-]?(\d{6,7})[\s-]?(\d{2})(?!\d)/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const yy = Number(m[1]); const mm = Number(m[2]);
    if (yy >= 24 && yy <= 60 && mm >= 1 && mm <= 12) return `${m[1]}${m[2]}${m[3]}${m[4]}`;
  }
  return '';
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const ymd = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : '';
};
/** 14/03/2026, 14-03-26, 2026-03-14, 14-Mar-2026, 14 March 2026, a spreadsheet date. */
export function toYmd(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return ymd(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  const s = String(v ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(s);
  if (m) return ymd(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/,-]+(\d{2}|\d{4})\b/.exec(s);
  const mo = m && MON[m[2].slice(0, 3).toLowerCase()];
  if (mo) return ymd(m[3].length === 2 ? 2000 + +m[3] : +m[3], mo, +m[1]);
  return '';
}

/** Money received: '12,500.00', 'Rs 12500', 12500, '12,500 CR'. A debit (negative, DR) is not. */
export function moneyToPaisa(v) {
  if (typeof v === 'number') return v > 0 ? Math.round(v * 100) : '';
  const s = String(v ?? '').trim();
  if (!s || /^\(.*\)$/.test(s) || /^-/.test(s) || /\bdr\b/i.test(s)) return '';
  const n = Number(s.replace(/\b(rs|pkr|cr)\b\.?/gi, '').replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : '';
}

/** Rows of cells from CSV text: commas or semicolons, quoted cells, "" inside quotes. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

const HEAD = {
  date: /\bdate\b/i,
  amount: /credit|deposit|received|^cr\.?$|amount/i,
  notAmount: /debit|withdraw|balance|^dr\.?$|\bdate\b/i,
  reference: /narration|description|particular|detail|reference|ref\b|remarks|memo|challan|consumer/i,
};
const text = (c) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? '').trim());

/** Which row is the header, and which columns hold the date, the money received and the reference. */
export function guessColumns(table) {
  let headerRow = -1;
  for (let r = 0; r < Math.min(table.length, 40); r += 1) {
    const cells = table[r].map(text);
    const hits = [HEAD.date, HEAD.amount, HEAD.reference].filter((re) => cells.some((c) => c.length < 40 && re.test(c))).length;
    if (hits >= 2) { headerRow = r; break; }
  }
  const head = headerRow >= 0 ? table[headerRow].map(text) : [];
  const find = (ok) => head.findIndex(ok);
  const credit = find((c) => /credit|deposit|received|^cr\.?$/i.test(c) && !HEAD.notAmount.test(c));
  const amount = credit >= 0 ? credit : find((c) => /amount/i.test(c) && !HEAD.notAmount.test(c));
  return {
    headerRow,
    date: find((c) => HEAD.date.test(c)),
    amount,
    reference: -1, // -1: look in every column of the row
  };
}

/** The statement's lines of money received, each with the challan number found in it. */
export function statementRows(table, cols) {
  const out = [];
  for (let r = cols.headerRow + 1; r < table.length; r += 1) {
    const row = table[r];
    const amount = cols.amount >= 0 ? moneyToPaisa(row[cols.amount]) : '';
    if (amount === '') continue;
    const where = cols.reference >= 0 ? [row[cols.reference]] : row.filter((_, i) => i !== cols.amount && i !== cols.date);
    const challanNo = where.map((c) => findChallanNo(text(c))).find(Boolean) || '';
    out.push({ line: r + 1, challanNo, amount, date: cols.date >= 0 ? toYmd(row[cols.date]) : '', text: row.map(text).filter(Boolean).join(' · ').slice(0, 160) });
  }
  return out;
}

/** A spreadsheet (.xlsx) or CSV file as rows of cells. */
export async function readTableFile(file) {
  if (/\.csv$|\.txt$/i.test(file.name) || /csv|text\/plain/.test(file.type)) return parseCsv(await file.text());
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      let v = cell.value;
      if (v && typeof v === 'object' && !(v instanceof Date)) v = v.result ?? v.text ?? (v.richText ? v.richText.map((t) => t.text).join('') : '');
      cells[col - 1] = v ?? '';
    });
    rows.push(Array.from(cells, (c) => c ?? ''));
  });
  return rows;
}
