import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from './app.js';

const listen = (app) => new Promise((r) => { const s = http.createServer(app).listen(0, () => r({ s, url: `http://127.0.0.1:${s.address().port}` })); });
const seen = [];
const upstream = await listen((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { seen.push({ url: req.url, method: req.method, headers: req.headers, body: b }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data: { ok: 1 }, path: req.url })); }); });
const mk = async (env) => { const a = await listen(createApp({ DIST_DIR: '/nonexistent', ...env })); return a; };
test.after(() => upstream.s.close());

test('health reports what is configured, never the secrets', async () => {
  const a = await mk({ MONDAY_TOKEN: 'secret-monday', MONDAY_API_URL: upstream.url + '/v2' }); const j = await (await fetch(a.url + '/api/health')).json();
  assert.deepEqual(j, { ok: true, monday: true, faros: false }); a.s.close();
});
test('monday proxy attaches the server token and returns the response', async () => {
  seen.length = 0; const a = await mk({ MONDAY_TOKEN: 'secret-monday', MONDAY_API_URL: upstream.url + '/v2' });
  const r = await fetch(a.url + '/api/monday', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'browser-should-be-ignored' }, body: JSON.stringify({ query: '{ me { id } }', variables: { a: 1 } }) });
  assert.equal(r.status, 200); assert.deepEqual((await r.json()).data, { ok: 1 });
  assert.equal(seen[0].headers.authorization, 'secret-monday'); assert.equal(seen[0].headers['api-version'], '2024-10'); assert.deepEqual(JSON.parse(seen[0].body), { query: '{ me { id } }', variables: { a: 1 } }); a.s.close();
});
test('monday proxy: 501 without a token, 400 without a query, 403 cross-origin', async () => {
  let a = await mk({}); assert.equal((await fetch(a.url + '/api/monday', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{x}"}' })).status, 501); a.s.close();
  a = await mk({ MONDAY_TOKEN: 't', MONDAY_API_URL: upstream.url });
  assert.equal((await fetch(a.url + '/api/monday', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400);
  assert.equal((await fetch(a.url + '/api/monday', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{"query":"{x}"}' })).status, 403); a.s.close();
});
test('faros passthrough is read-only and attaches the key', async () => {
  seen.length = 0; let a = await mk({}); assert.equal((await fetch(a.url + '/api/faros/deals')).status, 501); a.s.close();
  a = await mk({ FAROS_BASE_URL: upstream.url + '/api/', FAROS_API_KEY: 'fk' });
  const r = await fetch(a.url + '/api/faros/deals?limit=5'); assert.equal(r.status, 200); assert.equal((await r.json()).path, '/api/deals?limit=5'); assert.equal(seen[0].headers.authorization, 'Bearer fk');
  assert.equal((await fetch(a.url + '/api/faros/deals', { method: 'POST' })).status, 404, 'no writes'); a.s.close();
  a = await mk({ FAROS_BASE_URL: upstream.url, FAROS_API_KEY: 'raw', FAROS_AUTH_HEADER: 'x-api-key', FAROS_AUTH_SCHEME: '' }); seen.length = 0; await fetch(a.url + '/api/faros/x'); assert.equal(seen[0].headers['x-api-key'], 'raw'); a.s.close();
});
test('me returns the FaroMaker user id header only', async () => {
  const a = await mk({}); assert.deepEqual(await (await fetch(a.url + '/api/me')).json(), { id: null });
  assert.deepEqual(await (await fetch(a.url + '/api/me', { headers: { 'x-faromaker-user-id': 'u_42', 'x-email': 'a@b.c' } })).json(), { id: 'u_42' }); a.s.close();
});

// ---- Navan card transactions: client-credentials token, per-day requests, cursor paging, scoped to the cardholder, no secrets or other people's records in responses
const navanSeen = [];
const navanUp = await listen((req, res) => {
  const u = new URL(req.url, 'http://x'); navanSeen.push({ path: u.pathname, q: Object.fromEntries(u.searchParams), method: req.method, auth: req.headers.authorization || '' }); res.setHeader('content-type', 'application/json');
  const rec = (id, email) => ({ _type: 'NavanCardTransactionDetails', id, cardholder: { email, name: 'X' }, amount: 10 });
  if (u.pathname === '/auth') return res.end(JSON.stringify({ access_token: 'tok-1', expires_in: 3600 }));
  const d = u.searchParams.get('date'), c = u.searchParams.get('cursor');
  if (d === '2026-01-02' && !c) return res.end(JSON.stringify({ content: [rec('a', 'Me@Faropoint.com')], has_next: true, next_cursor: 'c2' }));
  if (d === '2026-01-02' && c === 'c2') return res.end(JSON.stringify({ content: [rec('b', 'colleague@faropoint.com')], has_next: false }));
  if (d === '2026-01-03') return res.end(JSON.stringify({ content: [rec('c', 'me@faropoint.com'), rec('d', 'other@faropoint.com')], has_next: false }));
  res.end(JSON.stringify({ content: [], has_next: false }));
});
test.after(() => navanUp.s.close());
const navanEnv = { NAVAN_CLIENT_ID: 'cid', NAVAN_CLIENT_SECRET: 'sek', NAVAN_CARDHOLDER: 'me@faropoint.com', NAVAN_AUTH_URL: navanUp.url + '/auth', NAVAN_API_URL: navanUp.url + '/txns' };
test('navan: refuses to return anything without credentials or without a cardholder', async () => {
  let a = await mk({}); assert.deepEqual(await (await fetch(a.url + '/api/navan/status')).json(), { configured: false, needs: 'credentials' });
  assert.equal((await fetch(a.url + '/api/navan/card-transactions?from=2026-01-02&to=2026-01-02')).status, 501); a.s.close();
  a = await mk({ ...navanEnv, NAVAN_CARDHOLDER: '' }); assert.deepEqual(await (await fetch(a.url + '/api/navan/status')).json(), { configured: false, needs: 'cardholder' });
  const r = await fetch(a.url + '/api/navan/card-transactions?from=2026-01-02&to=2026-01-02'); assert.equal(r.status, 501); assert.match((await r.json()).error, /NAVAN_CARDHOLDER/); a.s.close();
});
test('navan: signs in, pages through every day, returns only the cardholder own records, never secrets', async () => {
  navanSeen.length = 0; const a = await mk(navanEnv); assert.deepEqual(await (await fetch(a.url + '/api/navan/status')).json(), { configured: true, needs: null });
  const r = await fetch(a.url + '/api/navan/card-transactions?from=2026-01-01&to=2026-01-03'); assert.equal(r.status, 200); const j = await r.json(), body = JSON.stringify(j);
  assert.deepEqual(j.transactions.map((t) => t.id), ['a', 'c'], 'colleague and other records are dropped'); assert.equal(j.count, 2); assert.equal(j.scoped, true);
  assert.ok(!body.includes('colleague@') && !body.includes('other@') && !body.includes('sek') && !body.includes('tok-1'));
  const auth = navanSeen.find((x) => x.path === '/auth'); assert.equal(auth.method, 'POST'); assert.deepEqual(auth.q, { grant_type: 'client_credentials', client_id: 'cid', client_secret: 'sek' });
  const calls = navanSeen.filter((x) => x.path === '/txns'); assert.ok(calls.every((x) => x.method === 'GET' && x.auth === 'Bearer tok-1')); assert.equal(calls.length, 4, 'one call per day plus the second page');
  assert.equal(navanSeen.filter((x) => x.path === '/auth').length, 1, 'token is reused'); a.s.close();
});
test('navan: a cardholder value that matches nothing returns nothing, with a hint', async () => {
  const a = await mk({ ...navanEnv, NAVAN_CARDHOLDER: 'nobody@faropoint.com' }); const j = await (await fetch(a.url + '/api/navan/card-transactions?from=2026-01-02&to=2026-01-03')).json();
  assert.equal(j.count, 0); assert.deepEqual(j.transactions, []); assert.match(j.note, /none matched NAVAN_CARDHOLDER/); a.s.close();
});
test('navan: the fields helper returns field names only, never values', async () => {
  const a = await mk(navanEnv); const r = await fetch(a.url + '/api/navan/fields'); assert.equal(r.status, 200); const j = await r.json(), body = JSON.stringify(j);
  assert.ok(Array.isArray(j.fields)); assert.ok(!body.includes('@faropoint.com') && !body.includes('NavanCardTransactionDetails')); a.s.close();
});
test('navan: validates the range, is read-only and refuses cross-origin requests', async () => {
  const a = await mk(navanEnv);
  assert.equal((await fetch(a.url + '/api/navan/card-transactions?from=bad&to=2026-01-03')).status, 400);
  assert.equal((await fetch(a.url + '/api/navan/card-transactions?from=2026-01-05&to=2026-01-01')).status, 400);
  assert.equal((await fetch(a.url + '/api/navan/card-transactions?from=2026-01-01&to=2026-06-30')).status, 400);
  assert.equal((await fetch(a.url + '/api/navan/card-transactions?from=2026-01-01&to=2026-01-02', { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(a.url + '/api/navan/card-transactions', { method: 'POST' })).status, 404, 'read-only'); a.s.close();
});
test('navan: matches the Employee / Cardholder Name field, not a merchant that contains the name', async () => {
  const up = await listen((req, res) => { const u = new URL(req.url, 'http://x'); res.setHeader('content-type', 'application/json'); if (u.pathname === '/auth') return res.end(JSON.stringify({ access_token: 't' }));
    res.end(JSON.stringify({ content: [{ id: 'm1', employeeCardholderName: 'Orry Michael', merchantName: 'Ticketmaster' }, { id: 'm2', employeeCardholderName: 'Someone Else', merchantName: 'Orry Michael Catering' }, { id: 'm3', employeeCardholderName: 'orry michael', merchantName: 'Golf' }], has_next: false })); });
  const a = await mk({ NAVAN_CLIENT_ID: 'c', NAVAN_CLIENT_SECRET: 's', NAVAN_CARDHOLDER: 'Orry Michael', NAVAN_AUTH_URL: up.url + '/auth', NAVAN_API_URL: up.url + '/t' });
  const j = await (await fetch(a.url + '/api/navan/card-transactions?from=2026-02-01&to=2026-02-01')).json(); assert.deepEqual(j.transactions.map((x) => x.id), ['m1', 'm3']); a.s.close(); up.s.close();
});
