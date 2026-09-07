/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { load } = require('./helpers/load-typescript.cjs');

test('card opens persist and are shown on reload and server restart', { timeout: 60000 }, async (t) => {
  const initialCwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'post-tool-http-test-'));
  process.chdir(directory);
  const store = load('src/lib/local-store.ts');
  let server;
  let baseUrl;
  const password = crypto.randomUUID();
  const authorization = `Basic ${Buffer.from(`test:${password}`).toString('base64')}`;
  async function start() {
    server = fork(path.join(__dirname, 'helpers/test-server.cjs'), [], {
      cwd: directory,
      env: { ...process.env, NODE_ENV: 'production', ADMIN_USERNAME: 'test', ADMIN_PASSWORD: password,
        NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'placeholder' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    const [{ port }] = await once(server, 'message', { signal: AbortSignal.timeout(20000) });
    baseUrl = `http://127.0.0.1:${port}`;
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = once(server, 'exit');
    server.send('stop');
    await exited;
  }
  t.after(async () => {
    await stop();
    process.chdir(initialCwd);
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('post-tool-http-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  await store.createLocalCard({
    title: 'Count integration', description: null, slug: 'count-test',
    image_url: 'http://localhost/test.png', destination_url: 'https://example.com',
  });
  await start();
  async function open(options = {}) {
    const response = await fetch(`${baseUrl}/x/count-test`, {
      ...options, headers: { 'user-agent': 'Mozilla/5.0', ...options.headers },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200);
    await response.text();
  }
  const count = async () => (await store.getLocalCards())[0].click_count;
  async function checkAdmin(expected) {
    const response = await fetch(`${baseUrl}/admin/cards`, { headers: { authorization } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`${expected}<!-- --> クリック`), 'reload must show the persisted count');
    assert.equal(await count(), expected);
  }

  await checkAdmin(0);
  await open(); // HTTP only: no JavaScript or destination navigation.
  assert.equal(await count(), 1);
  await open();
  await checkAdmin(2);
  await open({ method: 'HEAD' });
  await open({ headers: { 'user-agent': 'Twitterbot/1.0' } });
  await open({ headers: { purpose: 'prefetch' } });
  await open({ headers: { 'sec-purpose': 'prefetch;prerender' } });
  assert.equal(await count(), 2);
  await Promise.all(Array.from({ length: 30 }, () => open()));
  await checkAdmin(32);
  await stop();
  await start();
  await checkAdmin(32);
  await open();
  await checkAdmin(33);
});
