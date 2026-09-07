/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { load } = require('./helpers/load-typescript.cjs');

const run = promisify(execFile);
const worker = path.join(__dirname, 'helpers/local-store-worker.cjs');

test('local counts survive concurrency, edits, failed writes and a new process', async (t) => {
  const initialCwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'post-tool-count-test-'));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(initialCwd);
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('post-tool-count-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const store = load('src/lib/local-store.ts');
  const input = {
    title: 'Count test', description: null, slug: 'count-test',
    image_url: 'http://localhost/test.png', destination_url: 'https://example.com',
  };
  await store.createLocalCard(input);
  const [card] = await store.getLocalCards();
  const click = { card_id: card.id, user_agent: 'test', referer: null, ip_hash: null };

  await t.test('every open counts, including repeated visits by the same user', async () => {
    await store.addLocalClickLog(click);
    await store.addLocalClickLog(click);
    assert.equal((await store.getLocalCards())[0].click_count, 2);
  });

  await t.test('30 simultaneous writes retain all 30 records', async () => {
    await Promise.all(Array.from({ length: 30 }, () => store.addLocalClickLog(click)));
    assert.equal((await store.getLocalCards())[0].click_count, 32);
  });

  await t.test('multiple processes and card edits cannot overwrite click records', async () => {
    await Promise.all([
      run(process.execPath, [worker, card.id, '30'], { cwd: directory }),
      run(process.execPath, [worker, card.id, '30'], { cwd: directory }),
      ...Array.from({ length: 30 }, () => store.addLocalClickLog(click)),
      store.updateLocalCard(card.id, { ...input, title: 'Edited' }),
      ...Array.from({ length: 20 }, () => store.getLocalCards()),
    ]);
    const [updated] = await store.getLocalCards();
    assert.equal(updated.click_count, 122);
    assert.equal(updated.title, 'Edited');
  });

  await t.test('a failed write releases the lock without resetting the count', async () => {
    await assert.rejects(store.addLocalClickLog({ ...click, card_id: 'missing' }), /Card not found/);
    await store.addLocalClickLog(click);
    assert.equal((await store.getLocalCards())[0].click_count, 123);
  });

  await t.test('a new process reads the persisted count and dashboard agrees', async () => {
    const { stdout } = await run(process.execPath, [worker], { cwd: directory });
    assert.equal(JSON.parse(stdout)[0].click_count, 123);
    assert.equal((await store.getLocalDashboardStats()).totalClicks, 123);
  });
});

test('count page opens, excluding crawlers, HEAD and speculative requests', () => {
  const { shouldRecordCardOpen } = load('src/lib/click-tracking.ts');
  const headers = new Headers({ 'x-card-request-method': 'GET', 'user-agent': 'Mozilla/5.0' });
  assert.equal(shouldRecordCardOpen(headers), true);
  headers.set('user-agent', 'Mozilla/5.0 Line/14.0.0');
  assert.equal(shouldRecordCardOpen(headers), true);
  for (const userAgent of ['Twitterbot/1.0', 'facebookexternalhit/1.1', 'Googlebot']) {
    headers.set('user-agent', userAgent);
    assert.equal(shouldRecordCardOpen(headers), false);
  }
  headers.set('user-agent', 'Mozilla/5.0');
  headers.set('x-card-request-method', 'HEAD');
  assert.equal(shouldRecordCardOpen(headers), false);
  headers.set('x-card-request-method', 'GET');
  for (const [key, value] of [['next-router-prefetch', '1'], ['purpose', 'prefetch'], ['sec-purpose', 'prefetch;prerender']]) {
    headers.set(key, value);
    assert.equal(shouldRecordCardOpen(headers), false);
    headers.delete(key);
  }
});
