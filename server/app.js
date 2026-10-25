// Backend for the CRM: keeps API credentials out of the browser (Monday token, FarOS key) and serves the built frontend.
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';

export function createApp(env = process.env) {
  const app = express(), dist = path.resolve(env.DIST_DIR || 'dist');
  const monday = { url: env.MONDAY_API_URL || 'https://api.monday.com/v2', token: env.MONDAY_TOKEN || '' };
  const faros = { base: (env.FAROS_BASE_URL || '').replace(/\/+$/, ''), key: env.FAROS_API_KEY || '', header: env.FAROS_AUTH_HEADER || 'Authorization', scheme: env.FAROS_AUTH_SCHEME ?? 'Bearer' };
  const userHeader = (env.FAROMAKER_USER_HEADER || 'x-faromaker-user-id').toLowerCase();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Same-origin only: a page on another site must not be able to spend this app's credentials.
  const sameOrigin = (req, res, next) => {
    const o = req.headers.origin; if (o) { try { if (new URL(o).host !== req.headers.host) return res.status(403).json({ error: 'cross-origin request refused' }); } catch { return res.status(403).json({ error: 'bad origin' }); } }
    next();
  };

  app.get('/api/health', (req, res) => res.json({ ok: true, monday: !!monday.token, faros: !!(faros.base && faros.key) }));

  // Who is using the app. FaroMaker's id only, never an email, so it can go to PostHog under the compliance rule.
  app.get('/api/me', (req, res) => res.json({ id: req.headers[userHeader] ? String(req.headers[userHeader]) : null }));

  app.post('/api/monday', sameOrigin, async (req, res) => {
    if (!monday.token) return res.status(501).json({ error_message: 'MONDAY_TOKEN is not configured on the server.' });
    const { query, variables } = req.body || {}; if (typeof query !== 'string') return res.status(400).json({ error_message: 'query is required' });
    try {
      const r = await fetch(monday.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: monday.token, 'API-Version': '2024-10' }, body: JSON.stringify({ query, variables }) });
      res.status(r.status).type('json').send(await r.text());
    } catch { res.status(502).json({ error_message: 'Could not reach Monday.' }); }
  });

  // FarOS: read-only passthrough (GET). Endpoint paths are decided by FarOS; this only attaches the credential.
  app.get('/api/faros/*splat', sameOrigin, async (req, res) => {
    if (!faros.base || !faros.key) return res.status(501).json({ error: 'FAROS_BASE_URL and FAROS_API_KEY are not configured on the server.' });
    const rest = req.originalUrl.replace(/^\/api\/faros/, '');
    if (rest.includes('..')) return res.status(400).json({ error: 'bad path' });
    try {
      const r = await fetch(faros.base + rest, { headers: { [faros.header]: faros.scheme ? `${faros.scheme} ${faros.key}` : faros.key, Accept: 'application/json' } });
      res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(await r.text());
    } catch { res.status(502).json({ error: 'Could not reach FarOS.' }); }
  });

  if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*splat', (req, res) => res.sendFile(path.join(dist, 'index.html'))); }
  return app;
}
