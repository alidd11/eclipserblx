import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk,
  assetFilename,
  extractProductIds,
  matchProduct,
  UUID_RE,
} from '../src/commands/retrieve-helpers.js';

const UUID_A = '81ec77a4-8a3d-4dc7-8b6d-a6813939941d';
const UUID_B = '11111111-2222-3333-4444-555555555555';

test('chunk splits into fixed-size batches and handles the tail', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 50), []);
  assert.deepEqual(chunk([1, 2], 50), [[1, 2]]);
});

test('assetFilename combines product name with the original extension', () => {
  assert.equal(
    assetFilename({ name: 'Police Cruiser', asset_file_url: 'store/172-abc.rbxm' }),
    'Police Cruiser.rbxm',
  );
});

test('assetFilename strips unsafe characters from the product name', () => {
  const out = assetFilename({ name: 'Cool/VFX: v2 <pack>', asset_file_url: 'x/y.lua' });
  assert.equal(out, 'CoolVFX v2 pack.lua');
});

test('assetFilename does not double-append an extension already present', () => {
  assert.equal(
    assetFilename({ name: 'thing.rbxm', asset_file_url: 'x/y.rbxm' }),
    'thing.rbxm',
  );
});

test('assetFilename degrades gracefully with missing fields', () => {
  assert.equal(assetFilename({}), 'download');
  assert.equal(assetFilename(null), 'download');
  assert.equal(assetFilename({ name: 'no ext', asset_file_url: 'folder/file' }), 'no ext');
});

test('extractProductIds keeps only unique, valid UUIDs', () => {
  const rows = [
    { product_id: UUID_A },
    { product_id: UUID_A },          // duplicate
    { product_id: UUID_B },
    { product_id: null },            // null
    { product_id: 'not-a-uuid' },    // junk
    { product_id: 12345 },           // wrong type
    {},                              // missing
  ];
  assert.deepEqual(extractProductIds(rows), [UUID_A, UUID_B]);
});

test('extractProductIds tolerates empty / nullish input', () => {
  assert.deepEqual(extractProductIds([]), []);
  assert.deepEqual(extractProductIds(null), []);
  assert.deepEqual(extractProductIds(undefined), []);
});

test('UUID_RE rejects non-UUIDs and accepts canonical UUIDs', () => {
  assert.ok(UUID_RE.test(UUID_A));
  assert.ok(!UUID_RE.test('81ec77a4-8a3d-4dc7-8b6d'));
  assert.ok(!UUID_RE.test(''));
});

const PRODUCTS = [
  { id: UUID_A, name: 'Metropolitan Police Cruiser' },
  { id: UUID_B, name: 'Paramedic Uniform Bundle' },
];

test('matchProduct finds a product by a substring of its name', () => {
  assert.equal(matchProduct(PRODUCTS, 'police')?.id, UUID_A);
  assert.equal(matchProduct(PRODUCTS, 'PARAMEDIC')?.id, UUID_B);
});

test('matchProduct matches when the search phrase contains a significant word', () => {
  // "cruiser" (>3 chars) appears in the product name
  assert.equal(matchProduct(PRODUCTS, 'the blue cruiser please')?.id, UUID_A);
});

test('matchProduct does not match on trivial short words', () => {
  // A product literally named "a b c" should not be matched by an unrelated phrase
  const items = [{ id: UUID_A, name: 'a b c' }];
  assert.equal(matchProduct(items, 'something entirely different'), null);
});

test('matchProduct returns null for empty term, no match, or bad input', () => {
  assert.equal(matchProduct(PRODUCTS, ''), null);
  assert.equal(matchProduct(PRODUCTS, '   '), null);
  assert.equal(matchProduct(PRODUCTS, 'firetruck'), null);
  assert.equal(matchProduct(null, 'police'), null);
});
