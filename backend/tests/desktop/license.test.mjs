/**
 * Desktop licences: signed by the platform owner's private key, checked by
 * the app with only the public key, so they cannot be made up or altered.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/utils/desktopLicense.js';

const { generateKeyPair, signLicense, verifyLicense } = mod;
const keys = generateKeyPair();
const other = generateKeyPair();
const now = new Date('2026-10-15T10:00:00Z');
const make = (extra = {}) => signLicense({ lid: 'D1-ABCD', school: 'Future Foundation School', plan: 'standard', expires: '2027-06-30', issued: now, ...extra }, keys.privateKey);

describe('desktop licences', () => {
  it('a licence from the platform is accepted, with its details', () => {
    const r = verifyLicense(make(), keys.publicKey, { now });
    expect(r.valid).toBe(true);
    expect(r.payload).toMatchObject({ lid: 'D1-ABCD', school: 'Future Foundation School', plan: 'standard', expires: '2027-06-30' });
    expect(r.daysLeft).toBeGreaterThan(250);
  });

  it('cannot be made up or changed', () => {
    const lic = make();
    const [p, body, sig] = lic.split('.');
    const longer = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64').toString()), expires: '2099-12-31' })).toString('base64url');
    expect(verifyLicense(`${p}.${longer}.${sig}`, keys.publicKey, { now }).reason).toBe('signature');
    expect(verifyLicense(signLicense({ lid: 'X', school: 'Fake', expires: '2099-01-01' }, other.privateKey), keys.publicKey, { now }).reason).toBe('signature');
    expect(verifyLicense('ILM-0001-STAN-ABCDEF123456', keys.publicKey, { now }).reason).toBe('format');
    expect(verifyLicense('', keys.publicKey, { now }).reason).toBe('format');
  });

  it('stops after its expiry day', () => {
    expect(verifyLicense(make({ expires: '2026-10-15' }), keys.publicKey, { now }).valid).toBe(true);
    expect(verifyLicense(make({ expires: '2026-10-14' }), keys.publicKey, { now }).reason).toBe('expired');
  });

  it('a licence for one computer works only there', () => {
    const lic = make({ machine: 'ab12-cd34-ef56' });
    expect(verifyLicense(lic, keys.publicKey, { now, machine: 'AB12-CD34-EF56' }).valid).toBe(true);
    expect(verifyLicense(lic, keys.publicKey, { now, machine: 'ZZ99-ZZ99-ZZ99' }).reason).toBe('machine');
  });

  it('turning the computer\'s date back does not help', () => {
    const r = verifyLicense(make(), keys.publicKey, { now, lastSeen: '2026-11-20T00:00:00Z' });
    expect(r.reason).toBe('clock');
  });

  it('refuses to sign without the private key', () => {
    expect(() => signLicense({ lid: 'X', expires: '2027-01-01' }, '')).toThrow(/LICENSE_PRIVATE_KEY/);
  });
});
