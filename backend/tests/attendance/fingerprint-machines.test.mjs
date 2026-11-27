/**
 * Fingerprint machines, organisation level: what a ZKTeco machine uploads
 * (users, fingerprints, faces, its details), the work we send it, names on
 * the machine matched to people, staff shifts and the auto-absent check.
 */
import { describe, it, expect } from 'vitest';
import P from '../../src/services/biometricProtocol.js';
import iclock from '../../src/routes/iclock.routes.js';

const TMP = 'TU9TUzIxAAAD9vsECAUHCc7QAAAb9mkBAAAAgx8Z';

describe('records a machine uploads', () => {
  it('reads a user', () => {
    expect(P.readRecord('USER PIN=1843\tName=Ali Raza\tPri=0\tPasswd=\tCard=0012345\tGrp=1\tTZ=0000000000000000'))
      .toEqual({ what: 'user', pin: '1843', name: 'Ali Raza', card: '0012345' });
  });

  it('reads a push 3 user answer (small letters)', () => {
    expect(P.readRecord('user uid=4\tcardno=\tpin=25\tpassword=\tgroup=1\tname=Sana Bibi\tprivilege=0'))
      .toMatchObject({ what: 'user', pin: '25', name: 'Sana Bibi', card: '' });
  });

  it('reads a fingerprint (push 1-2)', () => {
    expect(P.readRecord(`FP PIN=1843\tFID=6\tSize=1184\tValid=1\tTMP=${TMP}`))
      .toMatchObject({ what: 'template', pin: '1843', kind: 'finger', slot: 6, format: 'fp', size: 1184, valid: 1, data: TMP });
  });

  it('reads a face (push 2) and BIODATA (push 3)', () => {
    expect(P.readRecord(`FACE PIN=25\tFID=3\tSIZE=2048\tVALID=1\tTMP=${TMP}`)).toMatchObject({ kind: 'face', slot: 30, format: 'fp' });
    expect(P.readRecord(`BIODATA Pin=1843\tNo=2\tIndex=0\tValid=1\tDuress=0\tType=1\tMajorVer=10\tMinorVer=0\tFormat=0\tTmp=${TMP}`))
      .toMatchObject({ kind: 'finger', slot: 2, format: 'bio', bioType: 1, majorVer: '10' });
    expect(P.readRecord(`BIODATA Pin=1843\tNo=0\tIndex=4\tValid=1\tDuress=0\tType=9\tMajorVer=5\tMinorVer=8\tFormat=0\tTmp=${TMP}`))
      .toMatchObject({ kind: 'face', slot: 40, bioType: 9 });
  });

  it('leaves out what is not a user or a template, and anything broken', () => {
    expect(P.readRecord('OPLOG 4\t0\t2026-11-10 07:52:10\t0\t0\t0\t0')).toBeNull();
    expect(P.readRecord('FP PIN=1843\tFID=12\tSize=10\tValid=1\tTMP=abc')).toBeNull(); // finger 12
    expect(P.readRecord('FP PIN=1843\tFID=1\tSize=10\tValid=1\tTMP=<script>')).toBeNull();
    expect(P.readRecord('USER PIN=12 34\tName=x')).toBeNull(); // a PIN with a space
    expect(P.readRecord('')).toBeNull();
  });
});

describe("the machine's details", () => {
  it('reads INFO sent with every poll', () => {
    expect(P.parseInfo('Ver 6.60 Apr 2 2016,25,30,512,192.168.1.201,10,7,12,4,111')).toEqual({
      firmware: 'Ver 6.60 Apr 2 2016', users: 25, fingers: 30, punches: 512, ip: '192.168.1.201', fpVersion: '10', faceVersion: '7', faces: 4,
    });
    expect(P.parseInfo('')).toBeNull();
  });

  it('reads answers to commands, and the INFO answer', () => {
    const r = P.parseCmdResults('ID=12&Return=0&CMD=DATA\nID=13&Return=-1002&CMD=DATA\nID=14&Return=0&CMD=INFO\n~DeviceName=MB160\nUserCount=50\nFPCount=48\n~ZKFPVersion=10\nFWVersion=Ver 6.60');
    expect(r.results).toEqual([{ id: 12, ret: 0, cmd: 'DATA' }, { id: 13, ret: -1002, cmd: 'DATA' }, { id: 14, ret: 0, cmd: 'INFO' }]);
    expect(r.info).toEqual({ model: 'MB160', users: 50, fingers: 48, fpVersion: '10', firmware: 'Ver 6.60' });
  });
});

describe('work sent to a machine', () => {
  it('puts a person on it as a normal user, never an administrator', () => {
    expect(P.userCmd('2.4.1', '1843', 'Muhammad Ali Raza Khan Niazi Sahib', '')).toBe('DATA UPDATE USERINFO PIN=1843\tName=Muhammad Ali Raza Khan N\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\tVerify=0');
    expect(P.userCmd('1.0', '25', 'Sana', '123')).toBe('DATA USER PIN=25\tName=Sana\tPri=0\tPasswd=\tCard=123\tGrp=1\tTZ=');
    expect(P.userCmd('2.4', '25', 'Ali\tPri=14', 'x1')).toContain('Name=Ali Pri 14\tPri=0\tPasswd=\tCard=\t');
  });

  it('copies a fingerprint in the words of the machine it goes to', () => {
    const t = { pin: '1843', kind: 'finger', slot: 6, size: 1184, valid: 1, data: TMP, majorVer: '10' };
    expect(P.templateCmd('2.4', t)).toBe(`DATA UPDATE FINGERTMP PIN=1843\tFID=6\tSize=1184\tValid=1\tTMP=${TMP}`);
    expect(P.templateCmd('1.0', t)).toBe(`DATA FP PIN=1843\tFID=6\tSize=1184\tValid=1\tTMP=${TMP}`);
    expect(P.templateCmd('3.1.2', t)).toBe(`DATA UPDATE BIODATA Pin=1843\tNo=6\tIndex=0\tValid=1\tDuress=0\tType=1\tMajorVer=10\tMinorVer=0\tFormat=0\tTmp=${TMP}`);
    expect(P.templateCmd('2.4', { ...t, kind: 'face', slot: 30 })).toBe(`DATA UPDATE FACE PIN=1843\tFID=3\tSize=1184\tValid=1\tTMP=${TMP}`);
  });

  it('does not send a template made by another algorithm version', () => {
    expect(P.versionFits({ kind: 'finger', majorVer: '10' }, { fpVersion: '10' })).toBe(true);
    expect(P.versionFits({ kind: 'finger', majorVer: '10' }, { fpVersion: '9' })).toBe(false);
    expect(P.versionFits({ kind: 'face', majorVer: '7' }, { fpVersion: '10' })).toBe(true); // face version unknown
    expect(P.versionFits({ kind: 'finger', majorVer: null }, { fpVersion: '9' })).toBe(true);
  });

  it('fetches punches of chosen days, removes a user, starts enrolment', () => {
    expect(P.cmds.fetchPunches('2026-11-01', '2026-11-03')).toBe('DATA QUERY ATTLOG StartTime=2026-11-01 00:00:00\tEndTime=2026-11-03 23:59:59');
    expect(P.cmds.removeUser('1843')).toBe('DATA DELETE USERINFO PIN=1843');
    expect(P.cmds.enrolFinger('1843', 6)).toBe('ENROLL_FP PIN=1843\tFID=6\tRETRY=3\tOVERWRITE=1');
  });

  it('sets the clock in ZKTeco\'s encoding, at the school\'s time', () => {
    // 2026-11-10 07:52:10 Pakistan time
    const at = new Date('2026-11-10T02:52:10Z');
    expect(P.zkTime(at, '+05:00')).toBe(((((26 * 12 * 31) + (10 * 31) + 10 - 1) * 86400) + ((7 * 60 + 52) * 60) + 10));
    expect(P.cmds.setClock(at, '+05:00')).toMatch(/^SET OPTION DateTime=\d+$/);
  });

  it('cuts templates out of what the office sees', () => {
    expect(P.redact(`DATA UPDATE FINGERTMP PIN=1\tFID=6\tTMP=${TMP}`)).toBe('DATA UPDATE FINGERTMP PIN=1\tFID=6\tTMP=…');
  });

  it('gives the machine its time zone', () => {
    expect(iclock.tzOption('+05:00')).toBe('5');
    expect(iclock.tzOption('+05:30')).toBe('330');
    expect(iclock.tzOption('-03:00')).toBe('-3');
  });
});

describe('a name on the machine to a person', () => {
  it('counts the spellings of Muhammad as one', () => {
    expect(P.nameScore('Mohd Ali', 'Muhammad Ali')).toBe(1);
    expect(P.nameScore('M. Usman', 'Muhammad Usman')).toBe(1);
  });

  it('accepts a long name the machine cut at 24 letters', () => {
    expect(P.nameScore('Muhammad Abdul Rehman Kh', 'Muhammad Abdul Rehman Khan')).toBe(0.95);
  });

  it('does not match two people who only share "Muhammad"', () => {
    expect(P.nameScore('Muhammad Ali', 'Muhammad Usman')).toBeLessThan(0.5);
    expect(P.nameScore('Ali Raza', 'Raza Ali')).toBe(0.9);
    expect(P.nameScore('', 'Ali')).toBe(0);
  });
});

describe('staff shifts', () => {
  const shift = P.cleanShift({ name: 'Teachers', start: '08:00', end: '14:00', graceIn: 10, graceOut: 10, halfDayMin: 240, overtimeAfter: 30 });
  const pk = (hhmm) => new Date(`2026-11-10T${hhmm}:00+05:00`);

  it('is late only past the grace, counted from the start', () => {
    expect(P.evalStaffDay({ checkIn: pk('08:10'), checkOut: pk('14:00') }, shift).lateMin).toBe(0);
    expect(P.evalStaffDay({ checkIn: pk('08:11'), checkOut: pk('14:00') }, shift).lateMin).toBe(11);
  });

  it('leaving early, worked hours, overtime, half day, no check-out', () => {
    expect(P.evalStaffDay({ checkIn: pk('08:00'), checkOut: pk('13:40') }, shift)).toMatchObject({ earlyMin: 20, workedMin: 340, halfDay: false });
    expect(P.evalStaffDay({ checkIn: pk('08:00'), checkOut: pk('15:00') }, shift)).toMatchObject({ overtimeMin: 60 });
    expect(P.evalStaffDay({ checkIn: pk('08:00'), checkOut: pk('11:00') }, shift)).toMatchObject({ halfDay: true, earlyMin: 180 });
    expect(P.evalStaffDay({ checkIn: pk('08:00'), checkOut: null }, shift)).toMatchObject({ missingOut: true, workedMin: 0 });
  });

  it('refuses a shift that ends before it starts, and keeps numbers sensible', () => {
    expect(P.cleanShift({ start: '20:00', end: '04:00' })).toBeNull();
    expect(P.cleanShift({ start: '08:00', end: '14:00', graceIn: 9999, days: [1, 9, 2] })).toMatchObject({ graceIn: 10, days: [1, 2] });
  });
});

describe('auto-absent: not when the machines were silent', () => {
  it('runs on a normal day', () => {
    expect(P.autoAbsentCheck({ today: 280, history: [300, 310, 295], inScope: 320 }).ok).toBe(true);
  });

  it('stops when far fewer arrived than usual (a machine off)', () => {
    const r = P.autoAbsentCheck({ today: 12, history: [300, 310, 295], inScope: 320 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/only 12 student arrivals/);
  });

  it('on the first days uses half the students as usual', () => {
    expect(P.autoAbsentCheck({ today: 30, history: [], inScope: 300 }).ok).toBe(false);
    expect(P.autoAbsentCheck({ today: 60, history: [], inScope: 300 }).ok).toBe(true);
  });
});
