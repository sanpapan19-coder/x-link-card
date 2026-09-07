/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { load } = require('./helpers/load-typescript.cjs');

test('card counts include click logs beyond the Supabase response limit', async (t) => {
  const cards = [
    {
      id: '00000000-0000-4000-8000-000000000001', title: 'Old card', description: null,
      slug: 'old-card', image_url: 'https://example.com/old.jpg',
      destination_url: 'https://example.com/old', created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000002', title: 'Popular card', description: null,
      slug: 'popular-card', image_url: 'https://example.com/popular.jpg',
      destination_url: 'https://example.com/popular', created_at: '2026-09-07T00:00:00Z',
      updated_at: '2026-09-07T00:00:00Z',
    },
  ];
  const clickLogs = [
    ...Array.from({ length: 1000 }, () => ({ card_id: cards[0].id })),
    ...Array.from({ length: 505 }, () => ({ card_id: cards[1].id })),
  ];
  const requestedStarts = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    response.setHeader('content-type', 'application/json');

    if (url.pathname === '/rest/v1/cards') {
      response.end(JSON.stringify(cards));
      return;
    }
    if (url.pathname === '/rest/v1/click_logs') {
      const start = Number(url.searchParams.get('offset') || 0);
      requestedStarts.push(start);
      // Simulate an API configured to return fewer rows than the requested range.
      const rows = clickLogs.slice(start, start + 400);
      const end = rows.length ? start + rows.length - 1 : start;
      response.statusCode = 206;
      response.setHeader('content-range', `${start}-${end}/${clickLogs.length}`);
      response.end(JSON.stringify(rows));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ message: 'Not found' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const { getCards } = load('src/app/actions/cards.ts');
  const result = await getCards();

  assert.deepEqual(
    Object.fromEntries(result.map((card) => [card.slug, card.click_count])),
    { 'old-card': 1000, 'popular-card': 505 }
  );
  assert.deepEqual(requestedStarts, [0, 400, 800, 1200]);
});
