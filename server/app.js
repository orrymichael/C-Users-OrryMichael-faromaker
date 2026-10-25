// Backend for the CRM: keeps API credentials out of the browser (Monday token, FarOS key) and serves the built frontend.
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';

export function createApp(env = process.env) {
  const app = express(), dist = path.resolve(env.DIST_DIR || 'dist');
  const monday = { url: env.MONDAY_API_URL || 'https://api.monday.com/v2', token: env.MONDAY_TOKEN || '' };
  const faros = { base: (env.FAROS_BASE_URL || '').replace(/\/+$/, ''), key: env.FAROS_API_KEY || '', header: env.FAROS_AUTH_HEADER || 'Authorization', scheme: env.FAROS_AUTH_SCHEME ?? 'Bearer' };
  const userHeader = (env.FAROMAKER_USER_HEADER || 'x-faromaker-user-id').toLowerCase();
  // Navan card transactions (read-only). OAuth client credentials per Navan's sample; EU tenants set NAVAN_AUTH_URL to https://app-fra.tripactions.com/ta-auth/oauth/token
  const navan = { auth: env.NAVAN_AUTH_URL || 'https://app.navan.com/ta-auth/oauth/token', api: env.NAVAN_API_URL || 'https://api.navan.com/v1/expense/card-transactions', id: env.NAVAN_CLIENT_ID || '', secret: env.NAVAN_CLIENT_SECRET || '', who: String(env.NAVAN_CARDHOLDER || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) };
  // The Navan credentials see the whole company's card transactions, so nothing is returned unless NAVAN_CARDHOLDER names the person whose charges these are (email, name or employee id as it appears in the records). Records that do not match never leave the server.
  const flatScalars = (o, p = '', out = []) => { for (const [k, v] of Object.entries(o || {})) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object') flatScalars(v, key, out); else if (typeof v === 'string') out.push([key, v.toLowerCase().trim()]); } return out; };
  // Match on the cardholder, employee or user fields when the record has them (Navan expense records carry an Employee / Cardholder Name); only if there are none, fall back to every text field.
  const IDENT = /card.?holder|employee|spender|user|owner/i;
  const isMine = (t) => { const all = flatScalars(t), ids = all.filter(([k]) => IDENT.test(k)), pool = (ids.length ? ids : all).map(([, v]) => v); return navan.who.some((w) => pool.some((v) => (/\s/.test(w) ? v.includes(w) : v === w))); };
  const fieldPaths = (o, p = '', out = new Set()) => { for (const [k, v] of Object.entries(o || {})) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) fieldPaths(v, key, out); else out.add(key); } return out; };
  const navanTok = { v: '', exp: 0 };

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

  const navanToken = async (force) => {
    if (!force && navanTok.v && Date.now() < navanTok.exp) return navanTok.v;
    const r = await fetch(navan.auth + '?' + new URLSearchParams({ grant_type: 'client_credentials', client_id: navan.id, client_secret: navan.secret }), { method: 'POST' });
    if (!r.ok) throw Object.assign(new Error('Navan sign-in was refused'), { status: r.status });
    const j = await r.json(); if (!j.access_token) throw new Error('Navan returned no access token');
    navanTok.v = j.access_token; navanTok.exp = Date.now() + Math.max(30, (Number(j.expires_in) || 300) - 30) * 1000; return navanTok.v;
  };
  const isoDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
  app.get('/api/navan/status', sameOrigin, (req, res) => res.json({ configured: !!(navan.id && navan.secret && navan.who.length), needs: !(navan.id && navan.secret) ? 'credentials' : !navan.who.length ? 'cardholder' : null }));
  // Field names only, never values: shows which fields could identify a cardholder so NAVAN_CARDHOLDER can be set correctly.
  app.get('/api/navan/fields', sameOrigin, async (req, res) => {
    if (!navan.id || !navan.secret) return res.status(501).json({ error: 'NAVAN_CLIENT_ID and NAVAN_CLIENT_SECRET are not configured on the server.' });
    try { const day = new Date(Date.now() - 864e5).toISOString().slice(0, 10), r = await fetch(navan.api + '?' + new URLSearchParams({ date: day }), { headers: { Authorization: `Bearer ${await navanToken()}`, Accept: 'application/json' } }); if (!r.ok) return res.status(502).json({ error: `Navan returned ${r.status}` });
      const j = await r.json(), set = new Set(); for (const t of (j.content || []).slice(0, 10)) fieldPaths(t, '', set); res.json({ date: day, sampled: Math.min((j.content || []).length, 10), fields: [...set].sort() }); } catch (e) { res.status(502).json({ error: e.status ? `${e.message} (${e.status})` : 'Could not reach Navan.' }); }
  });
  // One request per day (the API takes a single date), following next_cursor until has_next is false. At most 62 days per call.
  app.get('/api/navan/card-transactions', sameOrigin, async (req, res) => {
    if (!navan.id || !navan.secret) return res.status(501).json({ error: 'NAVAN_CLIENT_ID and NAVAN_CLIENT_SECRET are not configured on the server.' });
    if (!navan.who.length) return res.status(501).json({ error: 'NAVAN_CARDHOLDER is not set, so the server cannot tell which card charges are yours. Set it to your email, name or employee id as Navan shows it.' });
    const { from, to } = req.query; if (!isoDay(from) || !isoDay(to)) return res.status(400).json({ error: 'from and to are required as YYYY-MM-DD' });
    const days = []; for (let t = Date.parse(from + 'T00:00:00Z'); t <= Date.parse(to + 'T00:00:00Z'); t += 864e5) days.push(new Date(t).toISOString().slice(0, 10));
    if (!days.length || days.length > 62) return res.status(400).json({ error: 'Choose a range of 1 to 62 days' });
    try {
      let token = await navanToken(), retried = false; const out = [];
      for (const date of days) { let cursor = null;
        for (let page = 0; page < 50; page++) {
          const q = new URLSearchParams({ date }); if (cursor) q.set('cursor', cursor);
          let r = await fetch(navan.api + '?' + q, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
          if (r.status === 401 && !retried) { retried = true; token = await navanToken(true); r = await fetch(navan.api + '?' + q, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }); }
          if (!r.ok) return res.status(502).json({ error: `Navan returned ${r.status} for ${date}` });
          const j = await r.json(); out.push(...(j.content || [])); if (!j.has_next) break; cursor = j.next_cursor;
        } }
      const mine = out.filter(isMine); res.json({ from, to, days: days.length, count: mine.length, transactions: mine, scoped: true, note: out.length && !mine.length ? 'Navan returned records for this range but none matched NAVAN_CARDHOLDER. Check that value against the fields list.' : '' });
    } catch (e) { res.status(502).json({ error: e.status ? `${e.message} (${e.status})` : 'Could not reach Navan.' }); }
  });

  if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*splat', (req, res) => res.sendFile(path.join(dist, 'index.html'))); }
  return app;
}
