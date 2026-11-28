/**
 * Machines of any make: what a Hikvision terminal or another machine posts to
 * its link (services/punchFormats.js), and a machine's log file read into
 * punches (frontend/src/utils/punchFile.js).
 */
import { describe, it, expect } from 'vitest';
import F from '../../src/services/punchFormats.js';
import {
  splitRows, detect, buildPunches, readStamp, dateOrder, readDir,
} from '../../../frontend/src/utils/punchFile.js';

const hik = (o) => ({
  ipAddress: '192.168.1.64', portNo: 80, protocol: 'HTTP', macAddress: 'a4:d5:c2:00:11:22', channelID: 1,
  dateTime: '2026-11-28T08:01:02+05:00', activePostCount: 1, eventType: 'AccessControllerEvent', eventState: 'active',
  eventDescription: 'Access Controller Event',
  AccessControllerEvent: { deviceName: 'Access Controller', majorEventType: 5, subEventType: 75, name: 'Ali Raza', cardReaderNo: 1, employeeNoString: '1843', serialNo: 412, userType: 'normal', currentVerifyMode: 'cardOrFaceOrFp', attendanceStatus: 'checkIn', mask: 'no', ...o },
});

/* As the terminal sends it: the JSON in UTF-8, the photo as raw bytes. */
function multipart(json, withPhoto = true) {
  const B = 'MIME_boundary';
  const j = Buffer.from(json, 'utf8');
  return {
    contentType: `multipart/form-data; boundary=${B}`,
    body: Buffer.concat([
      Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="event_log"\r\nContent-Type: application/json\r\nContent-Length: ${j.length}\r\n\r\n`, 'latin1'),
      j,
      Buffer.from('\r\n', 'latin1'),
      withPhoto ? Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="Picture"; filename="Picture.jpg"\r\nContent-Type: image/jpeg\r\n\r\n\xff\xd8\xff\xe0JFIF\x00\x01binary\r\n`, 'latin1') : Buffer.alloc(0),
      Buffer.from(`--${B}--\r\n`, 'latin1'),
    ]),
  };
}

describe('Hikvision terminals (HTTP listening)', () => {
  it('reads a recognised face from multipart, and skips the photo', () => {
    const r = F.readPush(multipart(JSON.stringify(hik())));
    expect(r.format).toBe('hikvision');
    expect(r.punches).toHaveLength(1);
    expect(r.punches[0]).toMatchObject({ pin: '1843', method: 'face', name: 'Ali Raza' });
    expect(r.punches[0].at.toISOString()).toBe('2026-11-28T03:01:02.000Z');
  });

  it('keeps an Urdu name intact through multipart', () => {
    const r = F.readPush(multipart(JSON.stringify(hik({ name: 'علی رضا' })), false));
    expect(r.punches[0].name).toBe('علی رضا');
  });

  it('reads JSON alone, and a fingerprint', () => {
    const r = F.readPush({ contentType: 'application/json', body: JSON.stringify(hik({ subEventType: 38 })) });
    expect(r).toMatchObject({ format: 'hikvision', punches: [{ pin: '1843', method: 'fingerprint' }] });
  });

  it('a heartbeat only says the machine is on', () => {
    const r = F.readPush({ contentType: 'application/json', body: JSON.stringify({ ipAddress: '1.2.3.4', dateTime: '2026-11-28T08:00:00+05:00', eventType: 'heartBeat', eventState: 'active' }) });
    expect(r.heartbeat).toBe(true);
    expect(r.punches).toHaveLength(0);
  });

  it('ignores failures, strangers and door events', () => {
    expect(F.readPush(multipart(JSON.stringify(hik({ subEventType: 76 })))).punches).toHaveLength(0);
    const stranger = F.readPush(multipart(JSON.stringify(hik({ employeeNoString: undefined }))));
    expect(stranger.punches).toHaveLength(0);
    expect(stranger.ignored[0]).toMatch(/no employee number/);
    const door = F.readPush({ contentType: 'application/json', body: JSON.stringify(hik({ majorEventType: 3, subEventType: 112 })) });
    expect(door.punches).toHaveLength(0);
    expect(door.ignored[0]).toMatch(/3\/112/);
  });

  it('reads older firmware XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EventNotificationAlert version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<ipAddress>192.168.1.64</ipAddress><dateTime>2026-11-28T08:01:02+05:00</dateTime><eventType>AccessControllerEvent</eventType>
<AccessControllerEvent><majorEventType>5</majorEventType><subEventType>1</subEventType><employeeNoString>25</employeeNoString><name>Sana</name></AccessControllerEvent>
</EventNotificationAlert>`;
    const r = F.readPush({ contentType: 'application/xml', body: xml });
    expect(r).toMatchObject({ format: 'hikvision', punches: [{ pin: '25', method: 'card', name: 'Sana' }] });
  });

  it('reads the event sent as a form field', () => {
    const r = F.readPush({ contentType: 'application/x-www-form-urlencoded', body: `event_log=${encodeURIComponent(JSON.stringify(hik()))}` });
    expect(r).toMatchObject({ format: 'hikvision', punches: [{ pin: '1843' }] });
  });
});

describe('any other machine or program', () => {
  it('reads one JSON punch on the machine clock', () => {
    const r = F.readPush({ contentType: 'application/json', body: '{"id":"1843","time":"2026-11-28 08:01:02"}' });
    expect(r).toMatchObject({ format: 'json', punches: [{ pin: '1843', stamp: '2026-11-28 08:01:02', method: 'fingerprint' }] });
  });

  it('reads a list, other field names, epoch times and a date and time apart', () => {
    const r = F.readPush({
      contentType: 'application/json',
      body: JSON.stringify({ punches: [{ user_id: '25', timestamp: 1764298862, verify_mode: 'face' }, { EmpCode: 'T7', Date: '2026/11/28', Time: '08:05' }, { EmpCode: 'T-7', time: '2026-11-28 08:06:00' }, { name: 'nobody' }] }),
    });
    expect(r.punches).toHaveLength(2);
    expect(r.punches[0]).toMatchObject({ pin: '25', method: 'face' });
    expect(r.punches[0].at.getTime()).toBe(1764298862000);
    expect(r.punches[1]).toMatchObject({ pin: 'T7', stamp: '2026-11-28 08:05:00' });
    expect(r.bad).toHaveLength(2); // "T-7" is not a user number; the last has none
  });

  it('reads a form, the query string and text lines', () => {
    expect(F.readPush({ contentType: 'application/x-www-form-urlencoded', body: 'pin=31&checktime=2026-11-28%2008%3A10%3A00' }).punches[0]).toMatchObject({ pin: '31', stamp: '2026-11-28 08:10:00' });
    expect(F.readPush({ method: 'GET', query: { id: '31', time: '2026-11-28T08:10:00+05:00' } })).toMatchObject({ format: 'query', punches: [{ pin: '31' }] });
    const t = F.readPush({ contentType: 'text/plain', body: '1843\t2026-11-28 08:01:02\t0\t1\n25 2026-11-28 08:02:00\nrubbish' });
    expect(t.punches.map((p) => p.pin)).toEqual(['1843', '25']);
    expect(t.bad).toHaveLength(1);
  });

  it('a link opened in a browser is "empty", not a punch', () => {
    expect(F.readPush({ method: 'GET', query: {} }).format).toBe('empty');
    expect(F.readPush({ method: 'GET', query: { key: 'x' } }).format).toBe('empty');
  });

  it('reads times', () => {
    expect(F.parseWhen('2026-11-28T08:01:02Z').at.toISOString()).toBe('2026-11-28T08:01:02.000Z');
    expect(F.parseWhen('2026-11-28T08:01:02+0500').at.toISOString()).toBe('2026-11-28T03:01:02.000Z');
    expect(F.parseWhen('2026/11/28 8:01')).toBeNull(); // hours need two digits here; files go through punchFile
    expect(F.parseWhen('2026/11/28 08:01')).toEqual({ stamp: '2026-11-28 08:01:00' });
    expect(F.parseWhen('2026-13-01 08:00:00')).toBeNull();
    expect(F.onClock('2026-11-28 08:01:02', '+05:00').toISOString()).toBe('2026-11-28T03:01:02.000Z');
  });
});

describe('a machine log file', () => {
  it('reads a ZKTeco attlog.dat, oldest first, each punch once', () => {
    const rows = splitRows('     1843\t2026-11-28 08:01:02\t1\t0\t1\t0\n       25\t2026-11-28 07:55:10\t1\t0\t1\t0\n     1843\t2026-11-28 08:01:02\t1\t0\t1\t0\n');
    const d = detect(rows);
    expect(d).toMatchObject({ header: -1, kind: 'zk-attlog', cols: { id: 0, dateTime: 1 } });
    const r = buildPunches(rows, { ...d, order: dateOrder(rows.map((x) => x[1])) });
    expect(r.punches).toEqual([{ pin: '25', stamp: '2026-11-28 07:55:10' }, { pin: '1843', stamp: '2026-11-28 08:01:02' }]);
    expect(r.people).toBe(2);
  });

  it('reads a GLG file: empty headings, zero-padded numbers', () => {
    const text = 'No\tMchn\tEnNo\t\tName\t\tMode\tIOMd\tDateTime\t\n000001\t1\t000000001\tAli\t1\t0\t2026/11/28  08:55:13\n000002\t1\t000000025\tSana\t1\t1\t2026/11/28  14:02:00\n';
    const rows = splitRows(text);
    const d = detect(rows);
    expect(d.kind).toBe('zk-glog');
    expect(d.stripZeros).toBe(true);
    const r = buildPunches(rows, { ...d, order: 'ymd' });
    expect(r.punches.map((p) => [p.pin, p.stamp, p.name])).toEqual([['1', '2026-11-28 08:55:13', 'Ali'], ['25', '2026-11-28 14:02:00', 'Sana']]);
  });

  it('reads a CSV export with a date and a time column, day first, and its in/out column when asked', () => {
    const rows = splitRows('AC-No.,Name,Date,Time,State\n1843,"Raza, Ali",28/11/2026,08:01,C/In\n1843,"Raza, Ali",28/11/2026,14:10,C/Out\n25,Sana,13/11/2026,7:59 AM,C/In\n');
    const d = detect(rows);
    expect(d).toMatchObject({ header: 0, kind: 'zk-export', cols: { id: 0, date: 2, time: 3, dir: 4, name: 1 } });
    const order = dateOrder(rows.slice(1).map((x) => x[2]));
    expect(order).toBe('dmy');
    const r = buildPunches(rows, { ...d, order, useDir: true });
    expect(r.punches).toEqual([
      { pin: '25', stamp: '2026-11-13 07:59:00', dir: 'in', name: 'Sana' },
      { pin: '1843', stamp: '2026-11-28 08:01:00', dir: 'in', name: 'Raza, Ali' },
      { pin: '1843', stamp: '2026-11-28 14:10:00', dir: 'out', name: 'Raza, Ali' },
    ]);
    expect(buildPunches(rows, { ...d, order }).punches[0].dir).toBeUndefined();
  });

  it('reads a Hikvision export', () => {
    const rows = [['Employee ID', 'Name', 'Department', 'Time', 'Attendance Status', 'Authentication Type'],
      ['1843', 'Ali', 'Class 5', '2026-11-28 08:01:02', 'Check In', 'Face'], ['25', 'Sana', 'Staff', '2026-11-28 08:03:40', 'Check In', 'Fingerprint']];
    const d = detect(rows);
    expect(d).toMatchObject({ kind: 'hikvision', cols: { id: 0, dateTime: 3, name: 1 } });
    expect(buildPunches(rows, d).punches).toHaveLength(2);
  });

  it('tells month-first dates from the data, and leaves "either" to the school', () => {
    expect(dateOrder(['11/28/2026 8:01 AM', '11/27/2026 2:05 PM'])).toBe('mdy');
    expect(dateOrder(['05/06/2026 08:00', '07/06/2026 08:00'])).toBe('either');
    expect(dateOrder(['2026-11-28 08:00'])).toBe('ymd');
    expect(readStamp('11/28/2026 2:05 PM', null, 'mdy')).toBe('2026-11-28 14:05:00');
    expect(readStamp('12/28/2026 12:05 AM', null, 'mdy')).toBe('2026-12-28 00:05:00');
    expect(readStamp('05/06/2026 08:00', null, 'dmy')).toBe('2026-06-05 08:00:00');
    expect(readStamp('28-Nov-2026', '8:01 am')).toBe('2026-11-28 08:01:00');
    expect(readStamp('2026-11-28T08:01:02+05:00')).toBe('2026-11-28 08:01:02');
    expect(readStamp('28/11/2026')).toBeNull(); // a date with no time is not a punch
  });

  it('reads Excel cells: dates, serial numbers, times as fractions', () => {
    const d = new Date(Date.UTC(2026, 10, 28, 8, 1, 2));
    expect(readStamp(d)).toBe('2026-11-28 08:01:02');
    expect(readStamp(46354 + (8 * 3600 + 60) / 86400)).toBe('2026-11-28 08:01:00');
    expect(readStamp(new Date(Date.UTC(2026, 10, 28)), (8 * 3600 + 120) / 86400)).toBe('2026-11-28 08:02:00');
    expect(readStamp(new Date(Date.UTC(2026, 10, 28)), new Date(Date.UTC(1899, 11, 30, 7, 45)))).toBe('2026-11-28 07:45:00');
  });

  it('finds the columns of a file with no headings, and reports rows it cannot read', () => {
    const good = ['1843', '25', '31', '32', '33', '34', '35', '36'].map((id, i) => [id, '28-Nov-2026', `8:0${i} AM`, 'gate']);
    const rows = [...good, ['???', '28-Nov-2026', '8:09 AM', 'gate'], ['37', 'soon', '', '']];
    const d = detect(rows);
    expect(d.cols).toMatchObject({ id: 0, date: 1, time: 2 });
    const r = buildPunches(rows, d);
    expect(r.punches.map((p) => p.pin)).toEqual(['1843', '25', '31', '32', '33', '34', '35', '36']);
    expect(r.bad.map((b) => b.row)).toEqual([9, 10]);
  });

  it('reads in and out words', () => {
    expect(['Check In', 'C/In', '0', 'IN', 'Duty On'].map(readDir)).toEqual(['in', 'in', 'in', 'in', 'in']);
    expect(['Check Out', 'c/out', '1', 'Exit'].map(readDir)).toEqual(['out', 'out', 'out', 'out']);
    expect(readDir('Break Out')).toBeUndefined();
  });
});
