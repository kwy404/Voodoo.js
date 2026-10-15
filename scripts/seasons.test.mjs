/**
 * The date logic behind the special dates (site/assets/seasons.js).
 *
 *   node --test scripts/seasons.test.mjs
 *
 * The file runs in a bare context with no document, which is exactly the
 * path that only exports window.VoodooSeasons, so this tests the shipped code.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync('site/assets/seasons.js', 'utf8'), context);
const { easter, detect, resolve, IDS } = context.window.VoodooSeasons;

const day = (y, m, d) => new Date(y, m - 1, d);
const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

test('Easter Sunday, 2024 to 2030', () => {
  const known = {
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
  };
  for (const [year, date] of Object.entries(known)) assert.equal(iso(easter(Number(year))), date, `Easter ${year}`);
});

test('New Year runs from December 30 to January 2', () => {
  assert.equal(detect(day(2026, 12, 29), 'en'), null);
  assert.equal(detect(day(2026, 12, 30), 'en'), 'newyear');
  assert.equal(detect(day(2026, 12, 31), 'en'), 'newyear');
  assert.equal(detect(day(2027, 1, 1), 'en'), 'newyear');
  assert.equal(detect(day(2027, 1, 2), 'en'), 'newyear');
  assert.equal(detect(day(2027, 1, 3), 'en'), null);
});

test('Christmas runs from December 18 to 26', () => {
  assert.equal(detect(day(2026, 12, 17), 'en'), null);
  assert.equal(detect(day(2026, 12, 18), 'en'), 'christmas');
  assert.equal(detect(day(2026, 12, 26), 'en'), 'christmas');
  assert.equal(detect(day(2026, 12, 27), 'en'), null);
});

test('Halloween runs from October 24 to 31', () => {
  assert.equal(detect(day(2026, 10, 23), 'en'), null);
  assert.equal(detect(day(2026, 10, 24), 'en'), 'halloween');
  assert.equal(detect(day(2026, 10, 31), 'en'), 'halloween');
  assert.equal(detect(day(2026, 11, 1), 'en'), null);
});

test('Carnival runs from the Saturday before Ash Wednesday through Ash Wednesday', () => {
  // 2026: Easter April 5, Ash Wednesday February 18, so Saturday February 14.
  assert.equal(detect(day(2026, 2, 13), 'en'), null);
  assert.equal(detect(day(2026, 2, 14), 'en'), 'carnival');
  assert.equal(detect(day(2026, 2, 17), 'en'), 'carnival');
  assert.equal(detect(day(2026, 2, 18), 'en'), 'carnival');
  assert.equal(detect(day(2026, 2, 19), 'en'), null);
  // 2025: Easter April 20, Ash Wednesday March 5.
  assert.equal(detect(day(2025, 3, 1), 'en'), 'carnival');
  assert.equal(detect(day(2025, 3, 5), 'en'), 'carnival');
  assert.equal(detect(day(2025, 3, 6), 'en'), null);
  // 2024: Easter March 31, Ash Wednesday February 14, which wins over Valentine's.
  assert.equal(detect(day(2024, 2, 10), 'en'), 'carnival');
  assert.equal(detect(day(2024, 2, 14), 'en'), 'carnival');
});

test('Easter runs from Good Friday to Easter Sunday', () => {
  assert.equal(detect(day(2026, 4, 2), 'en'), null);
  assert.equal(detect(day(2026, 4, 3), 'en'), 'easter');
  assert.equal(detect(day(2026, 4, 5), 'en'), 'easter');
  assert.equal(detect(day(2026, 4, 6), 'en'), null);
  assert.equal(detect(day(2027, 3, 26), 'en'), 'easter');
  assert.equal(detect(day(2027, 3, 28), 'en'), 'easter');
});

test("Valentine's Day is February 14, and June 12 in Brazilian Portuguese", () => {
  assert.equal(detect(day(2026, 2, 13), 'en'), null);
  // 2026-02-14 is carnival; use 2027, when carnival starts February 6.
  assert.equal(detect(day(2027, 2, 14), 'en'), 'valentine');
  assert.equal(detect(day(2027, 2, 15), 'en'), null);
  assert.equal(detect(day(2026, 6, 12), 'pt-BR'), 'valentine');
  assert.equal(detect(day(2026, 6, 12), 'pt'), 'valentine');
  assert.equal(detect(day(2026, 6, 12), 'en'), null);
  assert.equal(detect(day(2026, 6, 12), 'pt-PT'), null);
});

test('Festa Junina runs from June 13 to 29', () => {
  assert.equal(detect(day(2026, 6, 13), 'pt-BR'), 'junina');
  assert.equal(detect(day(2026, 6, 29), 'pt-BR'), 'junina');
  assert.equal(detect(day(2026, 6, 30), 'pt-BR'), null);
  // Everyone else sees the same art as Midsummer.
  assert.equal(detect(day(2026, 6, 13), 'en'), 'junina');
  assert.equal(detect(day(2026, 6, 29), 'ko'), 'junina');
});

test('an ordinary day has no season', () => {
  for (const [m, d] of [[3, 15], [5, 1], [8, 20], [9, 30], [11, 15]]) assert.equal(detect(day(2026, m, d), 'en'), null);
});

test('?season= forces a season or turns it off', () => {
  const ordinary = day(2026, 8, 20);
  assert.deepEqual({ ...resolve('?season=halloween', ordinary, 'en') }, { id: 'halloween', forced: true, off: false });
  assert.deepEqual({ ...resolve('?a=1&season=christmas', ordinary, 'en') }, { id: 'christmas', forced: true, off: false });
  assert.deepEqual({ ...resolve('?season=off', day(2026, 10, 30), 'en') }, { id: null, forced: true, off: true });
  // An unknown name is ignored and the date decides.
  assert.equal(resolve('?season=summer', day(2026, 10, 30), 'en').id, 'halloween');
  assert.equal(resolve('', ordinary, 'en').id, null);
  for (const id of IDS) assert.equal(resolve('?season=' + id, ordinary, 'en').id, id);
});
