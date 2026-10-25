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
