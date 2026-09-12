/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/load-typescript.cjs');

test('click periods use rolling ranges with inclusive starts and exclusive ends', () => {
  const {
    getClickPeriodRange,
    isClickInPeriod,
    parseClickPeriod,
  } = load('src/lib/click-period.ts');
  const now = new Date('2026-09-12T03:30:00.000Z'); // 12:30 in Asia/Tokyo.

  assert.equal(parseClickPeriod('24h'), '24h');
  assert.equal(parseClickPeriod('48h'), '48h');
  assert.equal(parseClickPeriod('72h'), '72h');
  assert.equal(parseClickPeriod(['7d', 'all']), '7d');
  assert.equal(parseClickPeriod('invalid'), 'all');
  assert.equal(parseClickPeriod(undefined), 'all');

  assert.deepEqual(getClickPeriodRange('24h', now), {
    start: '2026-09-11T03:30:00.000Z',
    end: '2026-09-12T03:30:00.000Z',
  });
  assert.deepEqual(getClickPeriodRange('7d', now), {
    start: '2026-09-05T03:30:00.000Z',
    end: '2026-09-12T03:30:00.000Z',
  });
  assert.deepEqual(getClickPeriodRange('48h', now), {
    start: '2026-09-10T03:30:00.000Z',
    end: '2026-09-12T03:30:00.000Z',
  });
  assert.deepEqual(getClickPeriodRange('72h', now), {
    start: '2026-09-09T03:30:00.000Z',
    end: '2026-09-12T03:30:00.000Z',
  });
  assert.deepEqual(getClickPeriodRange('30d', now), {
    start: '2026-08-13T03:30:00.000Z',
    end: '2026-09-12T03:30:00.000Z',
  });
  assert.deepEqual(getClickPeriodRange('all', now), { start: null, end: null });

  const range = getClickPeriodRange('24h', now);
  assert.equal(isClickInPeriod(range.start, range), true);
  assert.equal(isClickInPeriod('2026-09-12T03:29:59.999Z', range), true);
  assert.equal(isClickInPeriod(range.end, range), false);
  assert.equal(isClickInPeriod('invalid', range), false);
});
