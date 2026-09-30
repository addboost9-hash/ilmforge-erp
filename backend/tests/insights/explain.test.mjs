/**
 * The contract this engine has to keep: the drivers it reports must add up to
 * the change it is explaining, on every pair of months, with no residual.
 * If that ever stops being true the explanation is fiction, so it is asserted
 * on all 23 consecutive pairs rather than one hand-picked example.
 */
import { describe, it, expect } from 'vitest';
// Source stays CommonJS; ESM imports it as a default object.
import explainMod from '../../src/services/insights/explain.js';
const { explain } = explainMod;
import fixtureMod from '../fixtures/school24.js';
const { buildHistory } = fixtureMod;

const history = buildHistory(24);
const toMonth = (h) => ({
  students: h.students,
  billed: h.billed,
  collected: h.collected,
  expensesByCategory: h.expensesByCategory,
});

describe('explain() — driver reconciliation', () => {
  it('reconciles exactly on every consecutive month pair', () => {
    for (let i = 1; i < history.length; i++) {
      const r = explain(toMonth(history[i - 1]), toMonth(history[i]));
      const sum = r.drivers.reduce((t, d) => t + d.impact, 0);
      expect(
        sum,
        `drivers must sum to netChange for ${history[i - 1].label} → ${history[i].label}`,
      ).toBe(r.netChange);
      expect(r.reconciles).toBe(true);
    }
  });

  it('reports net change equal to actual net difference', () => {
    for (let i = 1; i < history.length; i++) {
      const r = explain(toMonth(history[i - 1]), toMonth(history[i]));
      expect(r.netChange).toBe(history[i].net - history[i - 1].net);
    }
  });

  it('attributes a pure strength change entirely to strength', () => {
    const base = { students: 100, billed: 100 * 350000, collected: 100 * 350000, expensesByCategory: { Rent: 1000 } };
    const more = { students: 120, billed: 120 * 350000, collected: 120 * 350000, expensesByCategory: { Rent: 1000 } };
    const r = explain(base, more);
    const byKey = Object.fromEntries(r.drivers.map(d => [d.key, d.impact]));
    expect(byKey.strength).toBe(20 * 350000);
    expect(byKey.avgFee).toBe(0);
    expect(byKey.collection).toBe(0);
  });

  it('attributes a pure fee rise entirely to average fee', () => {
    const base = { students: 100, billed: 100 * 350000, collected: 100 * 350000, expensesByCategory: {} };
    const up = { students: 100, billed: 100 * 385000, collected: 100 * 385000, expensesByCategory: {} };
    const r = explain(base, up);
    const byKey = Object.fromEntries(r.drivers.map(d => [d.key, d.impact]));
    expect(byKey.avgFee).toBe(100 * 35000);
    expect(byKey.strength).toBe(0);
    expect(byKey.collection).toBe(0);
  });

  it('carries expense increases as a negative impact', () => {
    const base = { students: 10, billed: 1000, collected: 1000, expensesByCategory: { Electricity: 500 } };
    const worse = { students: 10, billed: 1000, collected: 1000, expensesByCategory: { Electricity: 900 } };
    const r = explain(base, worse);
    const el = r.drivers.find(d => d.key === 'expense:Electricity');
    expect(el.impact).toBe(-400);
    expect(r.netChange).toBe(-400);
  });
});

describe('explain() — the July vacation month', () => {
  // June → July in year one: collection collapses to 58% and electricity
  // spikes. This is the month a school owner most needs explained.
  const june = history.find(h => h.month === 6);
  const july = history.find(h => h.month === 7);

  it('is a loss month', () => {
    expect(july.net).toBeLessThan(0);
  });

  it('is the ONLY month that loses money', () => {
    // If the fixture ever drifts into losing money every month it stops
    // being a test of a vacation dip and becomes a test of a failing school.
    const losses = history.filter(h => h.net < 0);
    expect(losses.every(h => h.month === 7)).toBe(true);
    expect(losses).toHaveLength(2); // two Julys in 24 months
  });

  it('keeps a normal month comfortably in surplus', () => {
    const september = history.find(h => h.month === 9);
    expect(september.net).toBeGreaterThan(0);
  });

  it('names collection rate as the biggest driver of the fall', () => {
    const r = explain(toMonth(june), toMonth(july));
    expect(r.direction).toBe('worsened');
    expect(r.biggestDriver.key).toBe('collection');
    expect(r.biggestDriver.impact).toBeLessThan(0);
  });

  it('still reconciles despite several drivers moving at once', () => {
    const r = explain(toMonth(june), toMonth(july));
    expect(r.drivers.reduce((t, d) => t + d.impact, 0)).toBe(r.netChange);
  });

  it('surfaces the electricity spike as a negative driver', () => {
    const r = explain(toMonth(june), toMonth(july));
    const el = r.drivers.find(d => d.key === 'expense:Electricity');
    expect(el).toBeDefined();
    expect(el.impact).toBeLessThan(0);
  });
});

describe('explain() — degenerate input', () => {
  it('survives a month with no students and no money', () => {
    const empty = { students: 0, billed: 0, collected: 0, expensesByCategory: {} };
    const r = explain(empty, empty);
    expect(r.netChange).toBe(0);
    expect(r.reconciles).toBe(true);
  });

  it('handles a school starting from zero', () => {
    const none = { students: 0, billed: 0, collected: 0, expensesByCategory: {} };
    const first = { students: 50, billed: 50 * 300000, collected: 50 * 300000, expensesByCategory: { Rent: 100000 } };
    const r = explain(none, first);
    expect(r.reconciles).toBe(true);
    expect(r.netChange).toBe(50 * 300000 - 100000);
  });

  it('accepts undefined months without throwing', () => {
    expect(() => explain(undefined, undefined)).not.toThrow();
  });
});
