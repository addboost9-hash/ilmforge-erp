/**
 * Fee received for several months at once, and bank challans.
 *
 * Money split the wrong way is quiet and costly: a later month marked paid
 * while an older one stays owing, a challan number that two students share,
 * a bank statement credit matched to the wrong challan. The server's split
 * (services/feeCollect.service.js) and the screen's preview of it
 * (frontend/src/utils/feeChallan.js) must agree, so both are tested here.
 */
import { describe, it, expect } from 'vitest';
import svc from '../../src/services/feeCollect.service.js';
import {
  planMonths, oldestFirst as uiOldestFirst, amountInWords, defaultDueDate, findChallanNo,
  toYmd, moneyToPaisa, parseCsv, guessColumns, statementRows,
} from '../../../frontend/src/utils/feeChallan.js';

const { oldestFirst, planAllocation, challanPrefix, challanNumber, cleanChallanNo, bankFor, challanSettings, pkDayOf, dueDay } = svc;
const RS = 100;
const bill = (id, month, year, due, o = {}) => ({ id, month, year, dueAmount: due * RS, feeTitle: 'Monthly Fee', ...o });

describe('oldest month first', () => {
  const bills = [bill(3, '11', 2026, 2500), bill(1, 'September', 2026, 2500), bill(2, 'Oct', 2026, 2500), bill(4, '1', 2027, 2500), bill(5, '12', 2025, 1000)];

  it('orders by the month billed, whatever way the month was written', () => {
    expect([...bills].sort(oldestFirst).map((b) => b.id)).toEqual([5, 1, 2, 3, 4]);
    expect([...bills].sort(uiOldestFirst).map((b) => b.id)).toEqual([5, 1, 2, 3, 4]);
  });

  it('a bill without a month (admission, custom) comes by its due date', () => {
    const adm = { id: 9, month: null, year: null, dueAmount: 500, dueDate: '2026-01-05' };
    expect([bill(1, '7', 2026, 1), adm].sort(oldestFirst)[0].id).toBe(9);
  });
});

describe('splitting what was received', () => {
  const sorted = [bill(1, '9', 2026, 2500), bill(2, '10', 2026, 2500), bill(3, '11', 2026, 2500)];

  it('pays each month in full before the next; the last one reached is part paid', () => {
    const { lines, left } = planAllocation(sorted, 6000 * RS);
    expect(lines.map((l) => [l.pay / RS, l.balance / RS])).toEqual([[2500, 0], [2500, 0], [1000, 1500]]);
    expect(left).toBe(0);
  });

  it('months not reached keep their whole balance', () => {
    const { lines } = planAllocation(sorted, 1000 * RS);
    expect(lines.map((l) => l.pay / RS)).toEqual([1000, 0, 0]);
    expect(lines.map((l) => l.balance / RS)).toEqual([1500, 2500, 2500]);
  });

  it('says what is left over when more is received than owed', () => {
    expect(planAllocation(sorted, 8000 * RS).left).toBe(500 * RS);
  });

  it('a part-paid month owes only its balance', () => {
    const { lines } = planAllocation([bill(1, '9', 2026, 700), bill(2, '10', 2026, 2500)], 1000 * RS);
    expect(lines.map((l) => [l.pay / RS, l.balance / RS])).toEqual([[700, 0], [300, 2200]]);
  });

  it('the screen shows the same split the server makes, in any order the bills come', () => {
    const shuffled = [sorted[2], sorted[0], sorted[1]];
    for (const amount of [1, 2500, 2501, 5000, 6000, 7500]) {
      const server = planAllocation([...shuffled].sort(oldestFirst), amount * RS).lines.map((l) => [l.invoiceId, l.pay]);
      const screen = planMonths(shuffled, amount * RS).lines.map((l) => [l.inv.id, l.pay]);
      expect(screen).toEqual(server);
    }
    expect(planMonths(sorted, 6000 * RS).lines.map((l) => l.state)).toEqual(['paid', 'paid', 'part']);
  });
});

describe('challan numbers', () => {
  it('digits only: year and month issued, the student, the challan of the month', () => {
    expect(challanPrefix(new Date('2026-11-16T10:00:00Z'))).toBe('2611');
    // 30 Nov, 22:00 UTC is already 1 December in Pakistan.
    expect(challanPrefix(new Date('2026-11-30T22:00:00Z'))).toBe('2612');
    expect(challanNumber('2611', 123, 1)).toBe('261100012301');
    expect(challanNumber('2611', 1234567, 12)).toBe('2611123456712');
  });

  it('two students never share a number', () => {
    const seen = new Set();
    for (const id of [1, 12, 123456, 1234567, 12345671]) for (let seq = 1; seq <= 99; seq += 1) seen.add(challanNumber('2611', id, seq));
    expect(seen.size).toBe(5 * 99);
  });

  it('a typed or scanned number loses its spaces and dashes', () => {
    expect(cleanChallanNo(' 2611-000123-01 ')).toBe('261100012301');
    expect(cleanChallanNo('2611 000123 01')).toBe('261100012301');
  });

  it('is found inside a bank statement line', () => {
    expect(findChallanNo('IBFT FROM ALI HASSAN REF 261100012301 MEEZAN')).toBe('261100012301');
    expect(findChallanNo('Cash deposit challan 2611-000123-01')).toBe('261100012301');
    expect(findChallanNo('Account 0101234567890123 transfer')).toBe(''); // 16 digits: an account number
    expect(findChallanNo('Ref 991300012301')).toBe(''); // month 13 is not a month
    expect(findChallanNo('Salary transfer')).toBe('');
  });
});

describe('the bank account on a challan', () => {
  const payment = {
    bank: { bankName: 'Meezan Bank', branch: 'Main', accountTitle: 'ABC School', accountNumber: 'PK36MEZN0001' },
    campusBanks: { 2: { bankName: 'HBL', accountTitle: 'ABC School Girls Campus', accountNumber: 'PK11HABB0002' }, 3: { bankName: '', accountNumber: '' } },
  };

  it("a campus with its own account gets it; the others get the school's", () => {
    expect(bankFor(payment, 2).bankName).toBe('HBL');
    expect(bankFor(payment, 1).bankName).toBe('Meezan Bank');
    expect(bankFor(payment, 3).bankName).toBe('Meezan Bank');
  });

  it('no account at all: no bank on the challan (a slip paid at the school office)', () => {
    expect(bankFor({}, 1)).toBeNull();
    expect(bankFor({ bank: { bankName: 'X', accountNumber: '' } }, 1)).toBeNull();
  });

  it('challan settings fall back to sensible values', () => {
    expect(challanSettings({})).toEqual({ dueDay: 10, lateFee: 0, note: '' });
    expect(challanSettings({ challan: { dueDay: 31, lateFee: -5 } })).toEqual({ dueDay: 10, lateFee: 0, note: '' });
    expect(challanSettings({ challan: { dueDay: 5, lateFee: 50000, note: 'Pay at HBL' } })).toEqual({ dueDay: 5, lateFee: 50000, note: 'Pay at HBL' });
  });

  it('a due date is the same Pakistan day in every zone', () => {
    expect(pkDayOf(dueDay('2026-11-25'))).toBe('2026-11-25');
    expect(dueDay('2026-11-25').toISOString()).toBe('2026-11-25T07:00:00.000Z');
  });
});

describe('on the printed challan', () => {
  it('the amount in words, as written in Pakistan', () => {
    expect(amountInWords(12500 * RS)).toBe('Rupees Twelve Thousand Five Hundred Only');
    expect(amountInWords(105000 * RS)).toBe('Rupees One Lakh Five Thousand Only');
    expect(amountInWords(25000000 * RS)).toBe('Rupees Two Crore Fifty Lakh Only');
    expect(amountInWords(999 * RS)).toBe('Rupees Nine Hundred Ninety Nine Only');
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });

  it("the due date starts on the school's due day, or a week ahead once it has passed", () => {
    expect(defaultDueDate('2026-11-03', 10)).toBe('2026-11-10');
    expect(defaultDueDate('2026-11-10', 10)).toBe('2026-11-10');
    expect(defaultDueDate('2026-11-16', 10)).toBe('2026-11-23');
    expect(defaultDueDate('2026-12-28', 10)).toBe('2027-01-04');
  });
});

describe('reading a bank statement', () => {
  it('dates in the forms banks use', () => {
    expect(toYmd('14/03/2026')).toBe('2026-03-14');
    expect(toYmd('14-03-26')).toBe('2026-03-14');
    expect(toYmd('2026-03-14')).toBe('2026-03-14');
    expect(toYmd('14-Mar-2026')).toBe('2026-03-14');
    expect(toYmd('14 Sept 2026')).toBe('2026-09-14');
    expect(toYmd(new Date(Date.UTC(2026, 2, 14)))).toBe('2026-03-14');
    expect(toYmd('31/02/2026')).toBe('');
    expect(toYmd('')).toBe('');
  });

  it('money received, not money paid out', () => {
    expect(moneyToPaisa('12,500.00')).toBe(1250000);
    expect(moneyToPaisa('Rs 7,500')).toBe(750000);
    expect(moneyToPaisa('7,500 CR')).toBe(750000);
    expect(moneyToPaisa(2500)).toBe(250000);
    expect(moneyToPaisa('-2,500')).toBe('');
    expect(moneyToPaisa('(2,500)')).toBe('');
    expect(moneyToPaisa('2,500 DR')).toBe('');
    expect(moneyToPaisa('')).toBe('');
  });

  it('finds the header, the date, the credit column and each challan number', () => {
    const csv = [
      'Meezan Bank Limited,,,,',
      'Account Statement 01/11/2026 to 16/11/2026,,,,',
      'Transaction Date,Description,Debit,Credit,Balance',
      '05/11/2026,"Cash deposit challan 2611-000123-01, ALI",,"7,500.00","107,500.00"',
      '06/11/2026,IBFT REF 261100045601 FROM SANA,,"2,500.00","110,000.00"',
      '07/11/2026,Electricity bill,"12,000.00",,"98,000.00"',
      '08/11/2026,Deposit without a number,,"3,000.00","101,000.00"',
    ].join('\n');
    const table = parseCsv(csv);
    const cols = guessColumns(table);
    expect(cols.headerRow).toBe(2);
    expect(table[2][cols.date]).toBe('Transaction Date');
    expect(table[2][cols.amount]).toBe('Credit');
    const rows = statementRows(table, cols);
    expect(rows.map((r) => [r.challanNo, r.amount, r.date])).toEqual([
      ['261100012301', 750000, '2026-11-05'],
      ['261100045601', 250000, '2026-11-06'],
      ['', 300000, '2026-11-08'],
    ]);
  });

  it('reads semicolon CSV and quoted cells', () => {
    expect(parseCsv('a;b\n"x;y";"he said ""hi"""\n')).toEqual([['a', 'b'], ['x;y', 'he said "hi"']]);
  });
});
