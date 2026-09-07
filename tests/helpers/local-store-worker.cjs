/* eslint-disable @typescript-eslint/no-require-imports */
const { load } = require('./load-typescript.cjs');
const store = load('src/lib/local-store.ts');

async function main() {
  const [cardId, count = '0'] = process.argv.slice(2);
  await Promise.all(Array.from({ length: Number(count) }, () => store.addLocalClickLog({
    card_id: cardId, user_agent: 'test', referer: null, ip_hash: null,
  })));
  process.stdout.write(JSON.stringify(await store.getLocalCards()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
