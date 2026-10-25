// Browser smoke test against the real build + backend. Needs Playwright installed globally (NODE_PATH) and `npm run build` done.
import { createRequire } from 'node:module';
import http from 'node:http';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createApp } from '../server/app.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const listen = (app) => new Promise((r) => { const s = http.createServer(app).listen(0, () => r({ s, url: `http://127.0.0.1:${s.address().port}` })); });
const upstreamSeen = [];
const upstream = await listen((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { upstreamSeen.push({ auth: req.headers.authorization, body: b }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ errors: [{ message: 'mock monday' }] })); }); });
const b = await chromium.launch(), errs = [];

// 1. No server credentials: welcome screen, sample preview works.
{ const app = await listen(createApp({ DIST_DIR: 'dist' })), p = await b.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(app.url); await p.waitForSelector('text=Preview with sample data'); await p.click('text=Preview with sample data'); await p.waitForSelector('.sum');
  assert.equal(await p.textContent('#mode'), 'Sample data'); await p.click('[data-t=contacts]'); await p.waitForSelector('.split'); await p.waitForSelector('.leaflet-container'); assert.ok(await p.evaluate(() => typeof L !== 'undefined' && !!document.querySelector('.leaflet-container')), 'map renders from the bundled Leaflet');
  await p.close(); app.s.close(); }

// 2. Server-managed Monday: the browser never holds or sends the token.
{ const app = await listen(createApp({ DIST_DIR: 'dist', MONDAY_TOKEN: 'srv-token', MONDAY_API_URL: upstream.url })), ctx = await b.newContext(), p = await ctx.newPage(), reqs = [];
  p.on('request', (r) => reqs.push({ url: r.url(), headers: r.headers() })); await p.goto(app.url); await p.waitForTimeout(1500);
  assert.ok(reqs.some((r) => r.url.endsWith('/api/monday')), 'app calls the backend proxy'); assert.ok(!reqs.some((r) => r.url.includes('api.monday.com')), 'never calls Monday directly');
  assert.ok(reqs.filter((r) => r.url.endsWith('/api/monday')).every((r) => !r.headers.authorization), 'no Authorization header from the browser'); assert.ok(upstreamSeen.length && upstreamSeen.every((s) => s.auth === 'srv-token'), 'server attaches the token');
  assert.ok(!(await p.evaluate(() => JSON.stringify(localStorage))).includes('srv-token'), 'token never reaches the browser'); await ctx.close(); app.s.close(); }

// 3. PostHog: key and host come from build-time env (Hub injects them); identify by FaroMaker user id only.
{ execFileSync('npx', ['vite', 'build', '--outDir', 'dist-ph', '--logLevel', 'error'], { env: { ...process.env, VITE_POSTHOG_KEY: 'phc_testkey', VITE_POSTHOG_HOST: 'https://ph.example' }, stdio: 'inherit' });
  const app = await listen(createApp({ DIST_DIR: 'dist-ph' })), ctx = await b.newContext({ extraHTTPHeaders: { 'x-faromaker-user-id': 'u_42' } }), p = await ctx.newPage(), events = [];
  await ctx.route('https://ph.example/**', async (r) => { const buf = r.request().postDataBuffer(); if (buf) { let t; try { t = zlib.gunzipSync(buf).toString(); } catch { t = buf.toString(); } events.push(t); } await r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' }); });
  await p.goto(app.url); await p.waitForSelector('text=Preview with sample data'); await p.click('text=Preview with sample data'); await p.waitForSelector('.sum');
  for (let i = 0; i < 30 && !events.length; i++) await p.waitForTimeout(500);
  const all = events.join('\n'); assert.ok(all.includes('phc_testkey') || all.includes('$identify'), 'PostHog received events: ' + all.slice(0, 300)); assert.ok(all.includes('u_42'), 'identified by FaroMaker user id'); assert.ok(!all.includes('@'), 'no email or other PII');
  await ctx.close(); app.s.close(); }
await b.close(); upstream.s.close();
assert.deepEqual(errs, [], 'no page errors'); console.log('smoke OK'); process.exit(0);
