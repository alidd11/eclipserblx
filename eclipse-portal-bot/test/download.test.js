import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DISCORD_CUSTOMER_BOT_TOKEN ||= 'test-token';
process.env.BOT_GATEWAY_SECRET ||= 'test-gateway-secret';

const { requestDownload } = await import('../src/download.js');

const PRODUCT_ID = '81ec77a4-8a3d-4dc7-8b6d-a6813939941d';
const USER_ID = '11111111-2222-4333-8444-555555555555';

test('requestDownload authenticates and returns the edge-function response', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({
      fileBase64: 'dGVzdA==',
      fileName: 'Protected.lua',
      inline: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await requestDownload({ productId: PRODUCT_ID, userId: USER_ID, fileIndex: 2 });
    assert.equal(result.fileName, 'Protected.lua');
    assert.equal(captured.url, 'https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/download-asset');
    assert.equal(captured.init.headers['x-bot-secret'], 'test-gateway-secret');
    assert.deepEqual(JSON.parse(captured.init.body), {
      productId: PRODUCT_ID,
      userId: USER_ID,
      fileIndex: 2,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestDownload throws the edge-function error on a non-2xx response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: 'You have not purchased this product' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  try {
    await assert.rejects(
      requestDownload({ productId: PRODUCT_ID, userId: USER_ID }),
      /download-asset failed \(status 403\): You have not purchased this product/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
