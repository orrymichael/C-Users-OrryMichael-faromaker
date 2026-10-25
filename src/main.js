import 'leaflet/dist/leaflet.css';
import './styles.css';
import L from 'leaflet';
import { trackEvent, identifyUser, analyticsReady } from './analytics.js';
window.L = L;

'use strict';
{ const rc = Element.prototype.replaceChildren;  // views pass `cond && node`; drop falsy values instead of printing them
  Element.prototype.replaceChildren = function (...k) { rc.apply(this, k.flat(Infinity).filter((c) => c && (c.nodeType || (typeof c === 'string' && c !== '')))); }; }
const $ = (s) => document.querySelector(s);
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v; else if (k === 'list' || k.startsWith('data-') || k.startsWith('aria-')) e.setAttribute(k, v); else if (v !== false && v != null) e[k] = v;
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const ICONS = {
  contacts: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  insights: '<path d="M12 3v9h9"/><path d="M20.5 15.5A9 9 0 1 1 8.5 3.5"/>',
  map: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  capture: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M13 14h3M8 17h3"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  events: '<path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 5v14" stroke-dasharray="2 2.5"/>',
  plan: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pipeline: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  bell: '<path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
};
const icon = (n) => { const w = document.createElement('span'); w.innerHTML = `<svg class="i" viewBox="0 0 24 24">${ICONS[n]}</svg>`; return w.firstChild; };
const LS = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random());
const digits = (s) => String(s || '').replace(/\D/g, '');
// Faropoint data-viz palette (assignment order); Other/blank use neutral grey
const PALETTE = ['#FFAB1F', '#344050', '#858C96', '#E07820', '#1E6A96', '#C04E18', '#2EA8C4', '#8C3015', '#1C2C3C'];
const NEUTRAL = '#D6D9DC';
// ---- dates (all dates are local YYYY-MM-DD strings)
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => iso(new Date());
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
const fmtDate = (s, long) => { if (!s) return ''; const d = parseIso(s), o = { month: 'short', day: 'numeric' }; if (long || d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric'; return d.toLocaleDateString('en-US', o); };
const dateOf = (t) => (/^\d{4}-\d{2}-\d{2}/.test(t || '') ? t.slice(0, 10) : '');
const money = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');

// ---------------------------------------------------------------- config / state
const DEFAULTS = { boardId: '4772242488', token: '', msClientId: '', closedColumn: '', addressColumn: '', pocColumn: '', nextColumn: '', lastColumn: '', cadence: {}, notify: false, hour: 9,
  phKey: '', phHost: 'https://us.i.posthog.com', tmKey: '', sgId: '', markets: ['nyc', 'philly', 'boston', 'dc', 'balt', 'ct', 'pitt'], espn: true, bdGroup: '', bdExclude: 'campaign', officeColumn: '', autoOutlook: false, prices: { Sports: 150, Concerts: 175, Comedy: 90 } };
let cfg = { ...DEFAULTS, ...LS.get('necrm-cfg', {}) };
let data = { contacts: null };
let tab = 'today', shown = 100, demo = false, closedBy = 'firm';
const filters = { q: '', tier: '', spec: '', market: '', company: '', poc: '', kind: '' };
let toastT;
function say(t, cls = '') { document.querySelectorAll('.toast').forEach((x) => x.remove()); const m = el('div', { class: 'toast ' + cls }, t); document.body.append(m); clearTimeout(toastT); toastT = setTimeout(() => m.remove(), cls ? 7000 : 3500); }
const banner = (t) => { const b = el('div', { class: 'err' }, t); $('#view').prepend(b); };

// ---------------------------------------------------------------- Monday API
// FaroMaker: the backend holds the Monday token and proxies calls, so the browser never sees it. Without the backend the app falls back to a token typed in Settings.
const SERVER = { monday: false, faros: false, user: null };
async function initServer() {
  if (location.protocol === 'file:') return;   // opened from disk: no server, sample data only
  try { const h = await (await fetch('/api/health')).json(); SERVER.monday = !!h.monday; SERVER.faros = !!h.faros; } catch { /* no backend: standalone mode */ }
  if (SERVER.monday) cfg.token = 'server-managed'; else if (cfg.token === 'server-managed') cfg.token = '';
  try { const me = await (await fetch('/api/me')).json(); if (me?.id) { SERVER.user = me.id; identifyUser(me.id); } } catch { /* anonymous */ }
}
async function gql(query, variables) {
  if (demo) return /updates\(/.test(query) ? { items: [{ updates: [] }] } : /users\(/.test(query) ? { users: sampleUsers() } : {};
  let r;
  try { r = await fetch(SERVER.monday ? '/api/monday' : 'https://api.monday.com/v2', { method: 'POST', headers: SERVER.monday ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', Authorization: cfg.token, 'API-Version': '2024-10' }, body: JSON.stringify({ query, variables }) }); }
  catch (e) { const err = new Error('Could not reach Monday (offline, or the browser blocked the request).'); err.network = true; throw err; }
  const j = await r.json().catch(() => ({}));
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join('; '));
  if (j.error_message) throw new Error(j.error_message);
  if (!r.ok) throw new Error('Monday returned HTTP ' + r.status);
  return j.data;
}
const ITEM_F = 'id name url updated_at group{ id title } column_values{ id type text } subitems{ id name url created_at column_values{ id type text } }';
async function fetchBoard(id) {
  const d = await gql(`query($ids:[ID!]){ boards(ids:$ids){ id name groups{ id title color } columns{ id title type settings_str } items_page(limit:500){ cursor items{ ${ITEM_F} } } } }`, { ids: [id] });
  const b = d.boards?.[0]; if (!b) throw new Error(`Board ${id} was not found with this token`);
  let { cursor, items } = b.items_page;
  while (cursor) { const n = (await gql(`query($c:String!){ next_items_page(limit:500, cursor:$c){ cursor items{ ${ITEM_F} } } }`, { c: cursor })).next_items_page; items = items.concat(n.items); cursor = n.cursor; }
  // The board that holds the subitems (events under each initiative) has its own columns; read them when the token allows it
  let sub = null; try { const sc = b.columns.find((c) => c.type === 'subtasks'), sid = JSON.parse(sc?.settings_str || '{}').boardIds?.[0];
    if (sid) { const sb = (await gql('query($ids:[ID!]){ boards(ids:$ids){ id columns{ id title type settings_str } } }', { ids: [String(sid)] })).boards?.[0]; sub = { id: String(sid), columns: sb ? sb.columns.map((c) => ({ id: c.id, title: c.title || '', type: c.type, labels: labelsOf(c) })) : null }; } } catch { sub = null; }
  const vals = (cv) => Object.fromEntries((cv || []).map((x) => [x.id, { text: x.text || '' }]));
  return { id: b.id, name: b.name, groups: b.groups, sub, columns: b.columns.map((c) => ({ id: c.id, title: c.title || '', type: c.type, labels: labelsOf(c) })),
    items: items.map((i) => ({ id: i.id, name: i.name, url: i.url, group: i.group, v: vals(i.column_values), subs: (i.subitems || []).map((x) => ({ id: x.id, name: x.name, url: x.url, v: vals(x.column_values) })) })) };
}
function labelsOf(c) {
  if (c.type !== 'status' && c.type !== 'dropdown') return undefined;
  try {
    const s = JSON.parse(c.settings_str || '{}');
    if (c.type === 'dropdown') return (s.labels || []).map((l, n) => ({ label: l.name, color: PALETTE[n % PALETTE.length] }));
    return Object.entries(s.labels || {}).filter(([k]) => !(s.deactivated_labels || []).includes(Number(k))).map(([k, label], n) => ({ label, color: s.labels_colors?.[k]?.color || PALETTE[n % PALETTE.length] }));
  } catch { return undefined; }
}
const setCol = (b, i, c, value) => gql('mutation($b:ID!,$i:ID!,$c:String!,$v:JSON!){ change_column_value(board_id:$b,item_id:$i,column_id:$c,value:$v){ id } }', { b, i, c, v: JSON.stringify(value) });
const createItem = (b, name, vals, g) => gql('mutation($b:ID!,$n:String!,$v:JSON,$g:String){ create_item(board_id:$b,item_name:$n,column_values:$v,group_id:$g){ id } }', { b, n: name, v: JSON.stringify(vals), g: g || null });
const createSubitem = (p, name, vals) => gql('mutation($p:ID!,$n:String!,$v:JSON,$l:Boolean){ create_subitem(parent_item_id:$p,item_name:$n,column_values:$v,create_labels_if_missing:$l){ id } }', { p, n: name, v: JSON.stringify(vals), l: true });
const getUpdates = async (i) => (await gql('query($i:[ID!]){ items(ids:$i){ updates(limit:20){ id text_body created_at creator{ name } } } }', { i: [i] })).items?.[0]?.updates || [];

// ---- tagging Faropoint teammates: email -> Monday user -> @mention (Monday notifies them)
const FP_EMAIL = /^[^\s@]+@faropoint\.com$/i;
const sampleUsers = () => [['Jamie Rowe', 'jamie.rowe@faropoint.com'], ['Dana Cole', 'dana.cole@faropoint.com']].map(([name, email], i) => ({ id: String(900 + i), name, email }));
async function resolveUsers(emails) {
  if (!emails.length) return [];
  const u = (await gql('query($e:[String!]){ users(emails:$e){ id name email } }', { e: emails })).users || [];
  return u;
}
async function loadUsers() { // for autocomplete only; best effort
  if (demo) return sampleUsers();
  try { const u = (await gql('query{ users(kind: non_guests, limit: 500){ id name email } }')).users.filter((x) => FP_EMAIL.test(x.email || '')); LS.set('necrm-users', u); return u; } catch { return LS.get('necrm-users', []); }
}
async function postFeedback(itemId, body, tags) {
  const found = tags?.length ? await resolveUsers(tags) : [];
  const names = found.map((u) => '@' + u.name).join(' ');
  await gql('mutation($i:ID!,$b:String!,$m:[UpdateMention]){ create_update(item_id:$i, body:$b, mentions_list:$m){ id } }', { i: itemId, b: names ? `${body} ${names}` : body, m: found.length ? found.map((u) => ({ id: Number(u.id), type: 'User' })) : null });
}
// Tag picker: type a Faropoint email, press Enter/Add. Only @faropoint.com addresses are accepted.
function tagPicker() {
  const list = [], chips = el('div', { class: 'sec', style: 'margin-top:6px' }), dl = el('datalist', { id: 'dl' + uid().slice(0, 6) });
  const inp = el('input', { type: 'email', placeholder: 'Tag a teammate by email (name@faropoint.com)', list: dl.id, style: 'width:100%' }), err = el('div', { class: 'hint', style: 'color:var(--alert)' });
  loadUsers().then((us) => dl.replaceChildren(...us.map((u) => el('option', { value: u.email }, u.name))));
  const draw = () => chips.replaceChildren(list.map((e) => el('span', { class: 'tag' }, e, el('button', { type: 'button', onclick: () => { list.splice(list.indexOf(e), 1); draw(); } }, '×'))));
  const add = () => { const v = inp.value.trim().toLowerCase(); if (!v) return; if (!FP_EMAIL.test(v)) { err.textContent = 'Use a @faropoint.com email address'; return; } err.textContent = ''; if (!list.includes(v)) list.push(v); inp.value = ''; draw(); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } });
  inp.addEventListener('change', add);
  return { node: el('div', { class: 'f' }, el('label', {}, 'Tag teammates'), inp, dl, err, chips), emails: () => { add(); return [...list]; }, clear: () => { list.length = 0; draw(); } };
}

// ---------------------------------------------------------------- contact model (roles come from the board)
// Column IDs on the Northeast & Mid-Atlantic CRM board; other boards fall back to type/title detection.
const KNOWN = { title: 'text0', company: 'text_mm0ddgbp', phone: 'phone', phone2: 'phone5', email: 'email', specialty: 'status', tier: 'status9__1', market: 'color_mm1592px', poc: 'people' };
function roles(cols) {
  const r = {}, used = () => Object.values(r).filter(Boolean);
  for (const [k, id] of Object.entries(KNOWN)) { const c = cols.find((x) => x.id === id); if (c) r[k] = c; }
  const find = (types, re) => cols.find((c) => !used().includes(c) && types.includes(c.type) && (!re || re.test(c.title)));
  r.phone ||= find(['phone']); r.email ||= find(['email']); r.phone2 ||= find(['phone']);
  r.title ||= find(['text'], /title|position|role/i); r.company ||= find(['text', 'dropdown', 'board_relation'], /company|account|firm|organi[sz]ation/i);
  r.tier ||= find(['status'], /tier|relationship|priority/i); r.specialty ||= find(['status', 'dropdown'], /special|sector|focus|type|product/i);
  r.market ||= find(['status', 'dropdown', 'text'], /market|region|area|territory/i);
  // Faropoint point of contact covering the relationship: the board's People column (first person = main POC)
  r.poc = (cfg.pocColumn && cols.find((c) => c.id === cfg.pocColumn)) || r.poc || find(['people'], /poc|owner|cover|lead|manager|team|assign|person/i) || find(['people']) || find(['dropdown', 'text'], /\bpoc\b|covered by|coverage|relationship (owner|lead|manager)/i);
  // Closed deals + property addresses: chosen in Settings, else matched by column title
  const pickId = (id) => id && cols.find((c) => c.id === id);
  r.next = pickId(cfg.nextColumn) || find(['date'], /next|follow/i);
  r.last = pickId(cfg.lastColumn) || find(['date'], /last|recent|touch|contacted/i);
  r.office = pickId(cfg.officeColumn) || find(['text', 'long_text', 'location'], /office|work address|business address|headquarter|\bhq\b/i);
  r.closed = pickId(cfg.closedColumn) || find(['numbers', 'status', 'dropdown', 'checkbox', 'text'], /closed|deals? (done|won)|transactions?|# ?deals|deals/i);
  r.address = pickId(cfg.addressColumn) || find(['long_text', 'text', 'location'], /propert|deal address|address/i);
  return r;
}
const NOT_CLOSED = /^(no|n|false|none|0|-|not.*|pending|open|active|prospect.*)$/i;
function normContacts(b) {
  const r = roles(b.columns), g = (i, c) => (c ? i.v[c.id]?.text || '' : '');
  const list = b.items.map((i) => {
    const closedText = g(i, r.closed).trim(), n = parseFloat(closedText);
    const weight = !closedText || NOT_CLOSED.test(closedText) ? 0 : r.closed?.type === 'numbers' && Number.isFinite(n) ? n : 1;
    return { id: i.id, name: i.name, group: i.group, title: g(i, r.title), company: g(i, r.company), phone: g(i, r.phone), phone2: g(i, r.phone2), email: g(i, r.email).trim(),
      specialty: g(i, r.specialty), tier: g(i, r.tier), market: g(i, r.market), pocs: g(i, r.poc).split(',').map((x) => x.trim()).filter(Boolean), closed: weight, addresses: g(i, r.address).split(/[\n;]+/).map((x) => x.trim()).filter(Boolean), last: dateOf(g(i, r.last)), next: dateOf(g(i, r.next)), office: g(i, r.office).trim() };
  });
  // No shared date columns on the board: keep follow-up dates on this device instead
  const la = LS.get('necrm-addr', {}); for (const c of list) { const o = la[c.id]; if (o) { if (!r.office && o.office) c.office = o.office; if (!r.address && o.props) c.addresses = o.props; } }
  const loc = LS.get('necrm-fu', {}); for (const c of list) { const o = loc[c.id]; if (o) { if (!r.last && o.last) c.last = o.last; if (!r.next && 'next' in o) c.next = o.next; } }
  return { ...b, roles: r, list, bd: normBd(b) };
}
const pocOf = (c) => c.pocs[0] || '';
// ---- Business Development: initiatives are items in the BD group; the events (attended or planned) are their subitems
const KNOWN_SUB = { owner: 'person', status: 'status', location: 'text1__1', notes: 'long_text_Mjj7jYbS', dates: 'start_date_Mjj7L0qs', firm: 'text_mm0dr4hs', region: 'color_mm0pw0g2', type: 'color_mm1tkr81' };
function subRoles(cols) { // cols is null when the token cannot read the subitem board: fall back to the known column IDs
  const r = {}; for (const [k, id] of Object.entries(KNOWN_SUB)) { const c = cols ? cols.find((x) => x.id === id) : { id, title: '', type: '' }; if (c) r[k] = c; }
  if (cols) { const free = (types, re) => cols.find((c) => !Object.values(r).includes(c) && types.includes(c.type) && (!re || re.test(c.title)));
    r.owner ||= free(['people']); r.status ||= free(['status'], /status/i); r.dates ||= free(['timeline', 'date']); r.location ||= free(['text'], /location|venue|city/i); r.notes ||= free(['long_text']);
    r.firm ||= free(['text'], /firm|company|with|counterpart|client/i); r.region ||= free(['status', 'dropdown'], /region|market/i); r.type ||= free(['status', 'dropdown'], /type|category/i); }
  return r;
}
const ATTENDED = /^(done|attended|completed)$/i, DECLINED = /not attending|cancel/i;
function normBd(b) {
  const r = subRoles(b.sub?.columns), g = (b.groups || []).find((x) => x.id === cfg.bdGroup) || (b.groups || []).find((x) => /business development/i.test(x.title)), excl = new RegExp(cfg.bdExclude || '^$', 'i');
  const parents = g ? b.items.filter((i) => i.group?.id === g.id) : [], t = (x, role) => (role ? x.v[role.id]?.text || '' : ''), events = [];
  for (const p of parents) { if (excl.test(p.name)) continue; for (const x of p.subs || []) { const d = t(x, r.dates).match(/\d{4}-\d{2}-\d{2}/g) || [];
    events.push({ id: x.id, parentId: p.id, parent: p.name, name: x.name, url: x.url, status: t(x, r.status), start: d[0] || '', end: d[1] || d[0] || '', location: t(x, r.location), notes: t(x, r.notes), firm: t(x, r.firm), region: t(x, r.region), type: t(x, r.type), owners: t(x, r.owner).split(',').map((n) => n.trim()).filter(Boolean) }); } }
  return { roles: r, group: g || null, parents: parents.map((p) => ({ id: p.id, name: p.name, excluded: excl.test(p.name) })), events, subBoardId: b.sub?.id || '' };
}
const isPerson = (c) => c.phone || c.phone2 || c.email || c.company;
function fmtPhone(p) { let d = digits(p); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; }
const telHref = (p) => { const d = digits(p); return 'tel:+' + (d.length === 10 ? '1' + d : d); };
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const labelColor = (col, text) => col?.labels?.find((x) => x.label === text)?.color;
const tagChip = (col, text) => { if (!text) return null; const c = labelColor(col, text); return el('span', { class: 'chip', style: c ? `background:${c};color:${/^#?(ffab1f|fdab3d|ffcb00|f)/i.test(c) ? '#2F2F2F' : '#fff'}` : '' }, text); };
// Search is by name or phone number only, never email. Phones match on digits regardless of formatting.
function nameOrPhone(q, names, phones) {
  q = q.trim().toLowerCase(); if (!q) return true;
  if (names.some((n) => n && n.toLowerCase().includes(q))) return true;
  const d = digits(q); return d.length >= 3 && phones.some((p) => digits(p).includes(d));
}

// ---------------------------------------------------------------- sample data (review mode: made-up people, nothing is sent or saved)
function sampleBoard() {
  const b = sampleBoardBase(), Y = new Date().getFullYear(), st = (id, title, labels) => ({ id, title, type: 'status', labels: labels.map(([label, color]) => ({ label, color })) });
  b.groups.push({ id: 'g_bd', title: 'Sourcing & Business Development' });
  b.sub = { id: 'sub1', columns: [{ id: 'person', title: 'Owner', type: 'people' }, st('status', 'Status', [['Done', '#00c875'], ['Confirmed', '#0086c0'], ['Planning Phase', '#fdab3d'], ['Attending', '#a25ddc'], ['Not Attending', '#c4c4c4']]), { id: 'text1__1', title: 'Location', type: 'text' }, { id: 'long_text_Mjj7jYbS', title: 'Notes', type: 'long_text' },
    { id: 'start_date_Mjj7L0qs', title: 'Dates', type: 'timeline' }, { id: 'text_mm0dr4hs', title: 'Firm', type: 'text' }, st('color_mm0pw0g2', 'Region', [['Northeast Regional', '#a25ddc'], ['Mid-Atlantic', '#0086c0'], ['Greater New York', '#e2445c']]), st('color_mm1tkr81', 'Type', [['Sports', '#00c875'], ['Comedy Show', '#fdab3d'], ['Lunch', '#0086c0'], ['Golf', '#037f4c'], ['Conference', '#a25ddc']])] };
  const ev = (n, name, md, status, loc, firm, region, type, owners = 'Jamie Rowe') => ({ id: 'sev' + n, name: name + ' (sample)', url: '', v: { person: { text: owners }, status: { text: status }, text1__1: { text: loc }, long_text_Mjj7jYbS: { text: '' }, start_date_Mjj7L0qs: { text: `${Y}-${md} - ${Y}-${md}` }, text_mm0dr4hs: { text: firm }, color_mm0pw0g2: { text: region }, color_mm1tkr81: { text: type } } });
  const par = (id, name, subs) => ({ id, name, url: '', group: { id: 'g_bd', title: 'Sourcing & Business Development' }, v: {}, subs });
  b.items.push(par('bd1', 'Business Development', [ev(1, 'Knicks vs. Celtics outing', '02-12', 'Done', 'New York, NY', 'Sample Realty Group', 'Greater New York', 'Sports'), ev(2, 'Q1 State of the Market Lunch', '03-05', 'Done', 'Hoboken, NJ', 'Example Advisors', 'Northeast Regional', 'Lunch', 'Jamie Rowe, Dana Cole'),
      ev(3, 'Yankees vs. Orioles', '05-14', 'Done', 'Baltimore, MD', 'Demo Commercial', 'Mid-Atlantic', 'Sports'), ev(4, 'Stand-up Comedy Night', '06-20', 'Done', 'New York, NY', 'Placeholder Partners', 'Greater New York', 'Comedy Show'), ev(5, 'Golf Outing', '07-28', 'Done', 'Bethlehem, PA', 'Example Advisors', 'Northeast Regional', 'Golf', 'Dana Cole'),
      ev(6, 'Giants vs. Cowboys', '12-06', 'Confirmed', 'East Rutherford, NJ', 'Sample Realty Group', 'Northeast Regional', 'Sports'), ev(7, 'Holiday Dinner', '12-12', 'Planning Phase', 'New York, NY', 'Demo Commercial', 'Greater New York', 'Lunch')]),
    par('bd2', 'Conferences & Networking', [ev(8, 'ICON East Conference', '03-18', 'Done', 'Jersey City, NJ', 'Industry', 'Northeast Regional', 'Conference', 'Jamie Rowe, Dana Cole'), ev(9, 'IOREBA Golf Outing', '06-09', 'Done', 'Newark, NJ', 'IOREBA', 'Northeast Regional', 'Golf')]),
    par('bd3', 'Team Initiatives', [ev(10, 'Team Offsite', '04-23', 'Done', 'Shawnee, PA', 'Faropoint', 'Northeast Regional', 'Lunch', 'Jamie Rowe, Dana Cole')]), par('bd4', 'Broker Campaigns', [ev(11, 'Sample Broker Target', '01-13', 'Done', '', 'Example Advisors', 'Mid-Atlantic', 'Lunch')]));
  return b;
}
function sampleBoardBase() {
  const st = (id, title, labels) => ({ id, title, type: 'status', labels: labels.map(([label, color]) => ({ label, color })) });
  const cols = [{ id: 'text0', title: 'Title', type: 'text' }, st('status', 'Specialty', [['Leasing', '#00c875'], ['Capital Markets', '#0086c0'], ['Investment Sales', '#a25ddc'], ['Net Lease', '#fdab3d']]),
    { id: 'phone', title: 'Phone', type: 'phone' }, { id: 'phone5', title: 'Phone 2', type: 'phone' }, { id: 'email', title: 'Email', type: 'email' },
    st('status9__1', 'Tier', [['Tier 1', '#fdab3d'], ['Tier 2', '#579bfc'], ['Not Active', '#c4c4c4']]), { id: 'text_mm0ddgbp', title: 'Company', type: 'text' },
    st('color_mm1592px', 'Market', [['Mid-Atlantic', '#a25ddc'], ['Northern NJ', '#e2445c'], ['Greater Philadelphia', '#037f4c'], ['Baltimore', '#0086c0'], ['Greater New York', '#579bfc']]),
    { id: 'dc', title: 'Deals closed with us', type: 'numbers' }, { id: 'pa', title: 'Property addresses', type: 'long_text' }, { id: 'oa', title: 'Office address', type: 'text' }, { id: 'people', title: 'Faropoint POC', type: 'people' }, { id: 'lc', title: 'Last contact', type: 'date' }, { id: 'nf', title: 'Next follow-up', type: 'date' }];
  const P = [['Alex Morgan', 'Managing Director', 'Leasing', '2015550101', 'Tier 1', 'Sample Realty Group', 'Northern NJ', '3', 'Port Newark, Newark, NJ\nHunts Point Terminal Market, Bronx, NY'],
    ['Jordan Lee', 'Senior Vice President', 'Capital Markets', '6105550102', 'Tier 1', 'Example Advisors', 'Greater Philadelphia', '2', 'Lehigh Valley Industrial Park, Bethlehem, PA'],
    ['Casey Rivera', 'Vice President', 'Investment Sales', '4105550103', 'Tier 2', 'Demo Commercial', 'Baltimore', '1', 'Dundalk Marine Terminal, Baltimore, MD'],
    ['Taylor Brooks', 'Principal', 'Net Lease', '2125550104', 'Tier 2', 'Sample Realty Group', 'Mid-Atlantic', '', ''], ['Sam Patel', 'Director', 'Leasing', '2015550105', 'Not Active', 'Placeholder Partners', 'Northern NJ', '', ''],
    ['Riley Chen', 'Executive VP', 'Capital Markets', '2155550106', 'Tier 1', 'Example Advisors', 'Greater Philadelphia', '1', 'Port of Philadelphia, Philadelphia, PA'], ['Morgan Diaz', 'Associate', 'Leasing', '9175550107', 'Tier 2', 'Placeholder Partners', 'Greater New York', '', ''],
    ['Quinn Foster', 'Partner', 'Investment Sales', '4435550108', 'Tier 1', 'Demo Commercial', 'Baltimore', '', '']];
  return { id: 'sample', name: 'Northeast & Mid-Atlantic CRM', groups: [{ id: 'g_b', title: 'Broker Relationships (All Markets)' }], columns: cols,
    items: P.map((p, i) => ({ id: String(100 + i), name: p[0], group: { id: 'g_b', title: 'Broker Relationships (All Markets)' }, v: { text0: { text: p[1] }, status: { text: p[2] }, phone: { text: '+1' + p[3] }, phone5: { text: '' },
      oa: { text: ['1 Gateway Center, Newark, NJ 07102', '1500 Market St, Philadelphia, PA 19102', '100 Light St, Baltimore, MD 21202', '1000 Wilson Blvd, Arlington, VA 22209', '30 Montgomery St, Jersey City, NJ 07302', '1735 Market St, Philadelphia, PA 19103', '11 Wall St, New York, NY 10005', '300 E Pratt St, Baltimore, MD 21202'][i] },
      email: { text: p[0].toLowerCase().replace(' ', '.') + '@example.com' }, status9__1: { text: p[4] }, text_mm0ddgbp: { text: p[5] }, color_mm1592px: { text: p[6] }, dc: { text: p[7] }, pa: { text: p[8] }, people: { text: i % 3 === 0 ? 'Jamie Rowe, Dana Cole' : i % 3 === 1 ? 'Dana Cole' : 'Jamie Rowe' },
      lc: { text: [addDays(today(), -34), addDays(today(), -20), addDays(today(), -61), '', '', addDays(today(), -29), '', addDays(today(), -5)][i] }, nf: { text: [addDays(today(), -4), addDays(today(), 10), today(), '', '', addDays(today(), 1), '', addDays(today(), 25)][i] } } })) };
}
function startDemo() { demo = true; data = { contacts: normContacts(sampleBoard()) }; plan = samplePlan(); evData = { at: Date.now(), events: sampleEvents(), errors: [] }; setMode(false, 'Sample data'); $('#mode').className = 'pill warn'; tab = 'today'; render(); }

// ---------------------------------------------------------------- loading + offline cache
async function load(quiet) {
  if (demo || !cfg.token) return;
  try { const cb = await fetchBoard(cfg.boardId); LS.set('necrm-cache', { board: cb, at: Date.now() }); data.contacts = normContacts(cb); setMode(true); }
  catch (e) {
    const c = LS.get('necrm-cache', null);
    if (e.network && c) { data.contacts = normContacts(c.board); setMode(false, 'Offline'); $('#mode').title = 'Saved copy from ' + new Date(c.at).toLocaleString(); }
    else if (!quiet) { render(); banner(e.message); return; }
  }
  render(); maybeNotify();
}
function setMode(live, text) { const m = $('#mode'); m.textContent = text || (live ? 'Live' : 'Not connected'); m.className = 'pill' + (live ? ' live' : ''); m.title = live ? 'Connected to Monday.com. Tap to refresh.' : ''; $('#title').textContent = data.contacts?.name || 'Northeast & Mid-Atlantic CRM'; }

// ---------------------------------------------------------------- offline queue
const getQ = () => LS.get('necrm-queue', []);
const setQ = (q) => { LS.set('necrm-queue', q); const b = $('#queue'); b.hidden = !q.length; b.textContent = q.length + ' to sync'; };
let flushing = false;
async function flush() {
  if (flushing || !cfg.token || demo) return; flushing = true;
  try {
    for (const j of getQ()) {
      try {
        if (j.type === 'feedback') await postFeedback(j.itemId, j.body, j.tags);
        else if (j.type === 'contact') await createItem(cfg.boardId, j.name, j.vals, j.groupId);
        else if (j.type === 'column') await setCol(j.boardId, j.itemId, j.columnId, j.value);
        else if (j.type === 'subitem' || j.type === 'initiative') {
          const vals = { ...j.vals }; if (j.owners?.length && j.ownerCol) { const us = await resolveUsers(j.owners); if (us.length) vals[j.ownerCol] = { personsAndTeams: us.map((u) => ({ id: Number(u.id), kind: 'person' })) }; }
          if (j.type === 'subitem') await createSubitem(j.parentId, j.name, vals); else await createItem(cfg.boardId, j.name, vals, j.groupId);
        }
      } catch (e) { if (e.network || /rate|complexity|timeout/i.test(e.message)) break; }  // keep for retry on network/rate errors; drop permanent errors
      setQ(getQ().filter((x) => x.id !== j.id));
    }
  } finally { flushing = false; }
}
async function enqueue(job) { if (demo) return 'Sample mode: nothing was saved'; setQ([...getQ(), { id: uid(), ...job }]); await flush(); return getQ().length ? 'Saved on this device. It will sync when you have signal' : 'Saved to Monday'; }
addEventListener('online', () => { flush().then(() => load(true)); });
// Before queueing a tagged note, confirm every email is a Monday user (skipped when offline).
async function checkTags(emails) {
  if (!emails.length || demo) return true;
  try { const found = (await resolveUsers(emails)).map((u) => (u.email || '').toLowerCase()), miss = emails.filter((e) => !found.includes(e)); if (miss.length) { say('Not found in Monday: ' + miss.join(', '), 'err'); return false; } } catch (e) { if (!e.network) { say(e.message, 'err'); return false; } }
  return true;
}

// ---------------------------------------------------------------- sheet
const openSheet = (...kids) => { $('#sheetIn').replaceChildren(...kids); $('#sheet').classList.add('on'); };
const closeSheet = () => $('#sheet').classList.remove('on');
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

// ---------------------------------------------------------------- navigation
const TABS = [['today', 'Today'], ['contacts', 'Contacts'], ['calendar', 'Calendar'], ['plan', 'BD'], ['pipeline', 'Vcards'], ['insights', 'Insights', 1], ['capture', 'Capture', 1], ['settings', 'Settings', 1]];
$('#tabs').replaceChildren(...TABS.filter((t) => !t[2]).map(([k, label]) => el('button', { 'data-t': k, onclick: () => go(k) }, icon(k), label)),
  el('button', { id: 'moreBtn', onclick: () => openMore() }, icon('more'), 'More'),
  ...TABS.filter((t) => t[2]).map(([k, label]) => el('button', { class: 'mi', 'data-t': k, onclick: () => go(k) }, icon(k), label)));
const go = (t) => { closeSheet(); tab = t; render(); scrollTo(0, 0); };
function openMore() { openSheet(el('h2', {}, 'More'), el('div', { style: 'margin-top:10px' }, TABS.filter((t) => t[2]).map(([k, label]) => el('div', { class: 'row', onclick: () => go(k) }, icon(k), el('div', { class: 'who' }, el('strong', {}, label)))))); }
// ---- PostHog product analytics (off until a project key is set in Settings). Sends only event names and counts, never contact names, phones, emails, search text or Monday data.
const phId = (() => { let i = LS.get('necrm-ph', ''); if (!i) { i = uid(); LS.set('necrm-ph', i); } return i; })();
function track(name, props) {
  if (trackEvent(name, props)) return;
  if (!cfg.phKey || demo || navigator.doNotTrack === '1') return;
  try { fetch(String(cfg.phHost || 'https://us.i.posthog.com').replace(/\/+$/, '') + '/capture/', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: cfg.phKey, event: name, distinct_id: phId, timestamp: new Date().toISOString(), properties: { ...props, app: 'necrm', $lib: 'necrm-standalone', $current_url: location.origin + location.pathname, viewport: innerWidth < 760 ? 'phone' : 'desktop' } }) }).catch(() => {}); } catch { /* analytics must never break the app */ }
}
let lastTab = '';
function render() {
  if (tab !== 'contacts') mapRun++;  // stop locating addresses once the Contacts screen is left
  document.querySelectorAll('#tabs button[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  $('#moreBtn').classList.toggle('on', !!TABS.find((t) => t[0] === tab && t[2]));
  $('#view').classList.toggle('wide', tab === 'contacts'); updateBell(); $('#fab').hidden = !(cfg.token || demo); $('#fab').onclick = openCreateNew;
  if (!cfg.token && !demo && tab !== 'settings') return renderWelcome();
  if (tab !== lastTab) { lastTab = tab; track('tab_viewed', { tab }); }
  ({ today: renderToday, contacts: renderContacts, calendar: renderCalendarTab, events: () => { tab = 'plan'; planView = 'find'; render(); }, plan: renderPlan, pipeline: renderPipeline, insights: renderInsights, capture: renderCapture, settings: renderSettings })[tab]();
}
function renderWelcome() {
  $('#view').replaceChildren(el('div', { class: 'panel' }, el('h2', {}, 'Connect to Monday'), el('p', {}, 'Paste your Monday API token once in Settings. It is kept only in this browser on this device.'),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => go('settings') }, 'Open Settings'), el('button', { class: 'btn', onclick: startDemo }, 'Preview with sample data'))));
}

// ---------------------------------------------------------------- follow-ups: cadence rules, activity logging, reminders
function cadenceFor(c) { // days between touches, by tier; 0 = no automatic follow-up
  const lab = (c.tier || '').trim(), m = cfg.cadence || {};
  if (lab in m && m[lab] !== '' && m[lab] != null && Number.isFinite(Number(m[lab]))) return Number(m[lab]);
  if (/tier\s*1|^a$|priority|key/i.test(lab)) return 30; if (/tier\s*2|^b$/i.test(lab)) return 60; if (/not active|inactive|dormant|lost|archive/i.test(lab)) return 0; return 90;
}
const dueOf = (c) => c.next || (c.last && cadenceFor(c) > 0 ? addDays(c.last, cadenceFor(c)) : '');
const dueState = (d) => { if (!d) return 'none'; const t = today(); return d < t ? 'overdue' : d === t ? 'today' : d <= addDays(t, 7) ? 'soon' : 'later'; };
const isTop = (c) => cadenceFor(c) > 0 && cadenceFor(c) <= 30;
const hasShared = () => !!(data.contacts?.roles.next && data.contacts?.roles.last);
const dueChip = (c) => { const d = dueOf(c), st = dueState(d); return st === 'overdue' ? el('span', { class: 'chip due overdue' }, 'Overdue ' + fmtDate(d)) : st === 'today' ? el('span', { class: 'chip due today' }, 'Due today') : null; };
async function setFollowUp(c, p) {
  const C = data.contacts, R = C.roles;
  if ('last' in p) c.last = p.last || ''; if ('next' in p) c.next = p.next || '';
  for (const k of ['last', 'next']) if (k in p && R[k]) await enqueue({ type: 'column', boardId: C.id, itemId: c.id, columnId: R[k].id, value: p[k] ? { date: p[k] } : {} });
  if ((!R.last && 'last' in p) || (!R.next && 'next' in p)) { const loc = LS.get('necrm-fu', {}); loc[c.id] = { ...(loc[c.id] || {}), ...p }; if (!demo) LS.set('necrm-fu', loc); }
  updateBell(); if ('next' in p) retireFollowUps(c);
}
const activityBody = (kind, text, who) => kind === 'Note' ? feedbackBody(text, who) : `[${kind}] ${text} (${new Date().toLocaleString('en-US')})`.replace(/</g, '&lt;');
// Log an activity on the contact's Monday item; stamps Last contact and schedules the next follow-up from the tier cadence.
async function logActivity(c, kind, text, tagEmails = []) {
  track('activity_logged', { kind, tagged: tagEmails.length });
  const msg = await enqueue({ type: 'feedback', itemId: c.id, body: activityBody(kind, text, c.name), tags: tagEmails });
  const t = today(), cad = cadenceFor(c), old = c.next, next = cad > 0 && (!c.next || c.next <= t) ? addDays(t, cad) : c.next;
  await setFollowUp(c, { last: t, next: next || '' });
  return cad > 0 && next !== old ? `${msg}. Next follow-up ${fmtDate(next)} (${cad}-day cadence)` : msg;
}
async function snooze(c, days) { const t = today(), base = c.next && c.next > t ? c.next : t; await setFollowUp(c, { next: addDays(base, days) }); say(`Follow-up moved to ${fmtDate(c.next)}`); }

// ---- calendar: Outlook only. One tap adds the event to your Outlook calendar (Microsoft Graph); otherwise Outlook on the web opens prefilled, or download an .ics for the Outlook app
const stamp = (d, hm) => `${d.replaceAll('-', '')}T${hm.replace(':', '')}00`;
const endHm = (hm, mins) => { const [h, m] = hm.split(':').map(Number), t = h * 60 + m + mins; return `${pad2(Math.floor(t / 60) % 24)}:${pad2(t % 60)}`; };
function calEvent(c) { const date = dueOf(c) || today(), hm = `${pad2(cfg.hour || 9)}:00`;
  return { uid: `${c.id}-${date}@necrm`, title: `Follow up: ${c.name}${c.company ? ' (' + c.company + ')' : ''}`, date, time: hm, mins: 30, loc: '', desc: [c.phone && 'Phone: ' + fmtPhone(c.phone), c.email && 'Email: ' + c.email, pocOf(c) && 'Faropoint POC: ' + pocOf(c)].filter(Boolean).join('\n') }; }
const icsEsc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
function icsText(ev) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Faropoint//Northeast CRM//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART:${stamp(ev.date, ev.time)}`, `DTEND:${stamp(ev.date, endHm(ev.time, ev.mins))}`, `SUMMARY:${icsEsc(ev.title)}`, ev.desc && `DESCRIPTION:${icsEsc(ev.desc)}`, ev.loc && `LOCATION:${icsEsc(ev.loc)}`,
    ev.url && `URL:${ev.url}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(ev.title)}`, 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
function downloadIcs(ev) { const a = el('a', { href: URL.createObjectURL(new Blob([icsText(ev)], { type: 'text/calendar' })), download: (ev.title.replace(/[^\w]+/g, '-').slice(0, 40) || 'event') + '.ics' }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const outlookCalUrl = (ev) => 'https://outlook.office.com/calendar/0/deeplink/compose?' + new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: ev.title, startdt: `${ev.date}T${ev.time}:00`, enddt: `${ev.date}T${endHm(ev.time, ev.mins)}:00`, body: ev.desc || '', location: ev.loc || '' });
const tzName = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
const oSent = () => LS.get('necrm-oevents', {});   // uid -> {date,title}: what this app has already put on the Outlook calendar
// Add one event to the Outlook calendar. btn/status are optional (automatic mode runs silently). Returns true when the event was added.
async function addToOutlook(ev, btn, status) {
  const say2 = (t) => { if (status) status.textContent = t; };
  if (!ms.connected()) { if (btn) { window.open(outlookCalUrl(ev), '_blank', 'noopener'); say2('Outlook on the web opened with the details filled in. Connect Outlook in Settings to add events in one tap.'); } return false; }
  const done = oSent(); if (done[ev.uid]) { say2('Already on your Outlook calendar'); return false; }
  try {
    if (btn) btn.disabled = true; const tz = tzName();
    const made = await ms.post('/me/events', { subject: ev.title, body: { contentType: 'text', content: ev.desc || '' }, start: { dateTime: `${ev.date}T${ev.time}:00`, timeZone: tz }, end: { dateTime: `${ev.date}T${endHm(ev.time, ev.mins)}:00`, timeZone: tz }, location: ev.loc ? { displayName: ev.loc } : undefined, isReminderOn: true, reminderMinutesBeforeStart: 15, transactionId: String(ev.uid).slice(0, 120) });
    track('outlook_event_added'); done[ev.uid] = { date: ev.date, title: ev.title, id: made?.id || '', time: ev.time, mins: ev.mins, loc: ev.loc, desc: ev.desc }; LS.set('necrm-oevents', done); meetCache = {}; say2('Added to your Outlook calendar'); return true;
  } catch (e) { say2(/403|denied|permission|Authorization|Access/i.test(e.message) ? 'Outlook needs permission to add events: reconnect Outlook and allow calendar access (Calendars.ReadWrite).' : e.message); return false; }
  finally { if (btn) btn.disabled = false; }
}
// Keep Outlook in step with the app: an event the app put on the calendar is moved or deleted there when it is moved or cancelled here.
async function mirrorOutlook(ev, remove) {
  if (!ms.connected()) return; const done = oSent(), rec = done[ev.uid];
  try {
    if (!rec?.id) { if (!remove && cfg.autoOutlook) await addToOutlook(ev); return; }
    if (remove) { await ms.call('DELETE', '/me/events/' + encodeURIComponent(rec.id)); delete done[ev.uid]; LS.set('necrm-oevents', done); meetCache = {}; return; }
    if (rec.date === ev.date && rec.title === ev.title && rec.time === ev.time) return; const tz = tzName();
    await ms.call('PATCH', '/me/events/' + encodeURIComponent(rec.id), { subject: ev.title, body: { contentType: 'text', content: ev.desc || '' }, start: { dateTime: `${ev.date}T${ev.time}:00`, timeZone: tz }, end: { dateTime: `${ev.date}T${endHm(ev.time, ev.mins)}:00`, timeZone: tz }, location: ev.loc ? { displayName: ev.loc } : { displayName: '' } });
    done[ev.uid] = { ...rec, date: ev.date, title: ev.title, time: ev.time, mins: ev.mins, loc: ev.loc, desc: ev.desc }; LS.set('necrm-oevents', done); meetCache = {};
  } catch (e) { say('Outlook did not update: ' + e.message, 'err'); }
}
async function retireFollowUps(c) {   // follow-up dates are part of the event id, so a new date means the old Outlook event moves to it
  if (!ms.connected() || demo) return; const done = oSent(), keep = c.next ? `${c.id}-${c.next}@necrm` : '', old = Object.entries(done).filter(([u, r]) => u.startsWith(c.id + '-') && u.endsWith('@necrm') && u !== keep && r.id);
  for (const [u, r] of old) { await mirrorOutlook({ uid: u }, true); if (c.next && !done[keep]) { const cur = oSent(); if (!cur[keep]) await addToOutlook({ uid: keep, title: r.title, date: c.next, time: r.time || `${pad2(cfg.hour || 9)}:00`, mins: r.mins || 30, loc: r.loc || '', desc: r.desc || '' }); } }
}
const calButtons = (getEv) => { const st = el('div', { class: 'hint', style: 'margin-top:6px' });
  return el('div', {}, el('div', { class: 'acts' }, el('button', { class: 'btn sm pri', onclick: (e) => addToOutlook(getEv(), e.currentTarget, st) }, 'Add to Outlook calendar'), el('button', { class: 'btn sm', title: 'Downloads an .ics file that opens in the Outlook app', onclick: () => downloadIcs(getEv()) }, 'Outlook app (.ics)')), st); };

// ---- Outlook calendar (read-only; needs the Calendars.ReadWrite permission on the Azure app). Loaded one month at a time and cached for 10 minutes.
let meetSync = 0, syncing = false, meetCache = {};   // 'YYYY-MM' -> { at, list, err }
const monthKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const outlookReady = () => demo || !!ms.connected();
function parseMeeting(m) {
  const z = (t) => new Date(t + (/Z|[+-]\d\d:?\d\d$/.test(t) ? '' : 'Z')), people = [m.organizer, ...(m.attendees || [])].map((a) => a?.emailAddress).filter(Boolean), start = z(m.start.dateTime);
  return { title: m.subject, start, end: z(m.end.dateTime), allDay: !!m.isAllDay, day: m.isAllDay ? m.start.dateTime.slice(0, 10) : iso(start), link: m.webLink, location: m.location?.displayName || '', emails: people.map((p) => (p.address || '').toLowerCase()), names: people.map((p) => p.name).filter(Boolean) };
}
let msCals = { at: 0, list: [] };
async function calendars() { if (Date.now() - msCals.at < 36e5) return msCals.list; let list = []; try { list = (await ms.graph('/me/calendars?$select=id,name,isDefaultCalendar&$top=25')).value || []; } catch { /* default calendar only */ } msCals = { at: Date.now(), list }; return list; }
async function fetchMonth(y, mo) {
  const cals = await calendars(), multi = cals.length > 1, q = `startDateTime=${encodeURIComponent(new Date(y, mo, 1).toISOString())}&endDateTime=${encodeURIComponent(new Date(y, mo + 1, 1).toISOString())}&$orderby=start/dateTime&$top=100&$select=subject,start,end,attendees,organizer,location,webLink,isAllDay,isCancelled`, out = [];
  for (const cal of multi ? cals : [null]) { let url = (cal ? `/me/calendars/${encodeURIComponent(cal.id)}` : '/me') + '/calendarView?' + q;
    for (let i = 0; i < 3 && url; i++) { const j = await ms.graph(url); out.push(...j.value.filter((x) => !x.isCancelled).map((x) => ({ ...parseMeeting(x), cal: cal && !cal.isDefaultCalendar ? cal.name : '' }))); url = j['@odata.nextLink']; } }
  const seen = new Set(); return out.filter((m) => { const k = m.day + '|' + m.title + '|' + +m.start; return !seen.has(k) && seen.add(k); });   // an invite can sit on more than one calendar
}
// Make sure every month touched by [fromIso, toIso] is loaded. Resolves true when something new arrived (so the caller can re-render once).
async function ensureMeetings(fromIso, toIso) {
  if (!outlookReady()) return false; let fresh = false;
  for (let d = parseIso(fromIso.slice(0, 8) + '01'); iso(d) <= toIso; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const k = monthKey(d), c = meetCache[k]; if (c && Date.now() - c.at < 18e4) continue;
    meetCache[k] = { at: Date.now(), list: c?.list || [] }; fresh = true;
    try { meetCache[k].list = demo ? sampleMeetings().filter((x) => x.day.startsWith(k)) : await fetchMonth(d.getFullYear(), d.getMonth()); delete meetCache[k].err; meetSync = Date.now(); } catch (e) { meetCache[k].err = e.message; }
  }
  return fresh;
}
// Mirror: refresh Outlook every few minutes, when the app comes back to the front, and when the connection returns.
async function syncNow(force) {
  if (!outlookReady() || demo || syncing || (!force && document.hidden)) return; syncing = true;
  try { if (force) { msCals.at = 0; for (const k in meetCache) meetCache[k].at = 0; } if (!document.querySelector('#sheet.on')) { if (tab === 'calendar') renderCalendarTab(); else if (tab === 'today') renderToday(); else await ensureMeetings(today(), addDays(today(), 7)); } } finally { syncing = false; }
}
setInterval(() => syncNow(false), 18e4); document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - meetSync > 6e4) syncNow(true); }); addEventListener('online', () => syncNow(true));
const allMeetings = () => { const own = new Set(Object.values(oSent()).map((x) => x.date + '|' + x.title)); return Object.values(meetCache).flatMap((c) => c.list).filter((m) => !own.has(m.day + '|' + m.title)).filter(calKeep); };
const meetingsBetween = (a, b) => allMeetings().filter((m) => m.day >= a && m.day <= b).sort((x, y) => x.day.localeCompare(y.day) || (x.allDay === y.allDay ? x.start - y.start : x.allDay ? -1 : 1));
const meetingContacts = (m) => data.contacts.list.filter((c) => c.email && m.emails.includes(c.email.toLowerCase()));
const meetingTime = (m) => (m.allDay ? 'All day' : `${m.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${m.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
function meetingRow(m, withDay) {
  const cs = meetingContacts(m);
  return el('div', { class: 'row', onclick: () => (cs[0] ? openContact(cs[0]) : m.link && window.open(m.link, '_blank', 'noopener')) }, el('div', { class: 'who' }, el('strong', {}, m.title || '(no title)'),
    el('small', {}, [withDay && fmtDate(m.day), meetingTime(m), m.cal].filter(Boolean).join(' · ')), cs.length ? el('small', {}, 'With ' + cs.map((c) => c.name).join(', ')) : m.names.length > 1 ? el('small', {}, m.names.slice(0, 3).join(', ')) : null),
    el('div', { class: 'acts', style: 'flex:none;flex-wrap:nowrap' }, el('button', { class: 'btn sm', title: 'Create an event from this meeting', onclick: (e) => { e.stopPropagation(); openCreateInitiative(seedFromMeeting(m)); } }, '+ Event'),
      m.link && el('a', { class: 'btn sm', href: m.link, target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation() }, 'Outlook')));
}
function seedFromMeeting(m) { const cs = meetingContacts(m);
  return { name: (m.title || '').replace(/ \(sample\)$/, ''), start: m.day, end: m.allDay ? m.day : iso(m.end), location: m.location || '', firm: cs[0]?.company || '', notes: ['From an Outlook meeting', m.names.length ? 'Attendees: ' + m.names.slice(0, 8).join(', ') : ''].filter(Boolean).join('\n') }; }
function sampleMeetings() { // made-up meetings around today so the sample preview shows the Outlook calendar
  const n = new Date(), mk = (off, h, mins, title, emails, allDay) => { const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + off, h, 0), e = new Date(d.getTime() + mins * 60000);
    return { title: title + ' (sample)', start: d, end: e, allDay: !!allDay, day: iso(d), link: 'https://outlook.office.com/calendar', emails, names: emails.map((x) => x.split('@')[0]) }; };
  return [mk(-2, 14, 30, 'Pipeline review', []), mk(0, 17, 30, 'Team standup', []), mk(1, 10, 60, 'Portfolio review call', []), mk(3, 12, 90, 'Lunch with Casey Rivera', ['casey.rivera@example.com']), mk(6, 0, 0, 'Industry conference', [], true), mk(9, 15, 30, 'Call with Jordan Lee', ['jordan.lee@example.com']),
    mk(15, 11, 60, 'Broker roundtable', []), mk(24, 9, 45, 'Quarterly planning', [])];
}

// ---- notifications: bell + optional browser notifications (only while the app is open)
function dueLists() { const t = today(), p = (data.contacts?.list || []).filter(isPerson).map((c) => ({ c, due: dueOf(c) })).filter((x) => x.due);
  return { over: p.filter((x) => x.due < t).sort((a, b) => a.due.localeCompare(b.due)), now: p.filter((x) => x.due === t), soon: p.filter((x) => x.due > t && x.due <= addDays(t, 7)).sort((a, b) => a.due.localeCompare(b.due)), all: p }; }
function updateBell() {
  const b = $('#bell'); if (!b) return; const { over, now } = dueLists(), n = over.length + now.length;
  b.replaceChildren(icon('bell'), n ? el('b', {}, n > 99 ? '99+' : n) : null); b.onclick = openBell;
}
function openBell() {
  const { over, now } = dueLists(), ok = 'Notification' in window && Notification.permission === 'granted' && cfg.notify;
  openSheet(el('h2', {}, 'Follow-ups due'), el('p', { class: 'hint' }, over.length + now.length ? `${over.length} overdue, ${now.length} due today.` : 'Nothing due. You are caught up.'),
    el('div', { class: 'card', style: 'margin:10px 0' }, [...over, ...now].slice(0, 12).map((x) => el('div', { class: 'row', onclick: () => { closeSheet(); openContact(x.c); } }, el('div', { class: 'av' }, initials(x.c.name)), el('div', { class: 'who' }, el('strong', {}, x.c.name), el('small', {}, [x.c.company, fmtDate(x.due)].filter(Boolean).join(' · '))), dueChip(x.c)))),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => go('today') }, 'Open Today'), !ok && el('button', { class: 'btn', onclick: enableNotifications }, 'Turn on device alerts')),
    el('p', { class: 'hint' }, 'Device alerts only appear while this app is open in the browser. Outlook calendar reminders work even when it is closed.'));
}
async function enableNotifications() {
  if (!('Notification' in window)) return say('This browser does not support notifications. Use the calendar buttons instead.', 'err');
  const p = await Notification.requestPermission(); cfg.notify = p === 'granted'; LS.set('necrm-cfg', cfg); say(cfg.notify ? 'Device alerts are on' : 'Notifications were not allowed in the browser settings', cfg.notify ? '' : 'err'); if (cfg.notify) maybeNotify(true);
}
function maybeNotify(force) {
  if (!cfg.notify || !('Notification' in window) || Notification.permission !== 'granted' || !data.contacts || demo) return;
  const { over, now } = dueLists(), list = [...over, ...now], n = list.length; if (!n) return;
  const key = today() + ':' + n; if (!force && LS.get('necrm-notified', '') === key) return; LS.set('necrm-notified', key);
  try { new Notification(`${n} follow-up${n > 1 ? 's' : ''} due`, { body: list.slice(0, 3).map((x) => x.c.name).join(', ') + (n > 3 ? ` and ${n - 3} more` : ''), tag: 'necrm-due' }); } catch { /* some mobile browsers only allow notifications from an installed app */ }
}
setInterval(() => maybeNotify(), 5 * 60 * 1000);

// ---- Today: tasks + calendar
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1), calSel = today();
function taskRow(c, due) {
  const st = dueState(due);
  return el('div', { class: 'row trow', onclick: () => openContact(c) }, el('div', { class: 'av' }, initials(c.name)),
    el('div', { class: 'who' }, el('strong', {}, c.name), el('small', {}, [c.title, c.company].filter(Boolean).join(' · ')), el('small', {}, `${st === 'overdue' ? 'Overdue since ' : st === 'today' ? 'Due ' : 'Due '}${fmtDate(due)}${pocOf(c) ? ' · POC ' + pocOf(c) : ''}`)),
    el('div', { class: 'acts', style: 'flex:none;flex-wrap:nowrap' }, c.phone && el('a', { class: 'btn round', href: telHref(c.phone), title: 'Call', onclick: (e) => e.stopPropagation() }, icon('phone')),
      el('button', { class: 'btn sm', title: 'Mark done and schedule the next follow-up', onclick: async (e) => { e.stopPropagation(); say(await logActivity(c, 'Follow-up', 'Completed')); renderToday(); } }, 'Done'),
      el('button', { class: 'btn sm', title: 'Snooze one week', onclick: async (e) => { e.stopPropagation(); await snooze(c, 7); renderToday(); } }, '+1w')));
}
function renderToday() {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const { over, now, soon } = dueLists(), t = today(); ensureMeetings(t, addDays(t, 7)).then((fresh) => { if (fresh && tab === 'today') renderToday(); });
  const evSoon = plan.events.filter((e) => ['Booked', 'Requested'].includes(e.status) && e.date >= t && e.date <= addDays(t, 14)).sort((a, b) => a.date.localeCompare(b.date));
  const head = el('div', { class: 'bar', style: 'justify-content:space-between' }, el('h2', { style: 'font-size:22px' }, new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })), el('button', { class: 'btn sm', onclick: () => { calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); calSel = today(); go('calendar'); } }, icon('today'), 'Calendar'));
  const sum = el('div', { class: 'sum' }, el('div', { class: 's' + (over.length ? ' bad' : '') }, el('b', {}, over.length), el('span', {}, 'Overdue')), el('div', { class: 's' }, el('b', {}, now.length), el('span', {}, 'Due today')), el('div', { class: 's' }, el('b', {}, soon.length), el('span', {}, 'Next 7 days')), el('div', { class: 's' }, el('b', {}, evSoon.length), el('span', {}, 'Events, 14 days')));
  const setup = !hasShared() && el('div', { class: 'panel', style: 'max-width:none' }, el('b', {}, 'Follow-up dates are stored on this device only. '), 'To share them across the team and phones, add "Next follow-up" and "Last contact" date columns to the Monday board. ',
    el('div', { class: 'bar', style: 'margin:10px 0 0' }, el('button', { class: 'btn', onclick: createFollowUpColumns }, 'Add the columns to the board'), el('button', { class: 'btn', onclick: () => go('settings') }, 'Choose existing columns')));
  const block = (title, rows, empty) => [el('div', { class: 'sec-h' }, el('h2', {}, title), el('span', { class: 'hint' }, rows.length ? rows.length + '' : '')), rows.length ? el('div', { class: 'card' }, rows.map((x) => taskRow(x.c, x.due))) : empty && el('p', { class: 'hint', style: 'margin:0 2px' }, empty)];
  const sugg = C.list.filter((c) => isPerson(c) && !dueOf(c) && !c.last && cadenceFor(c) > 0 && cadenceFor(c) <= 60).sort((a, b) => cadenceFor(a) - cadenceFor(b) || a.name.localeCompare(b.name));
  const mt = meetingsBetween(t, addDays(t, 7)).filter((m) => m.allDay || m.end >= new Date()).slice(0, 8);
  $('#view').replaceChildren(head, sum, setup, block('Overdue', over), block('Due today', now, over.length ? '' : 'No follow-ups due today.'), block('Next 7 days', soon),
    evSoon.length && [el('div', { class: 'sec-h' }, el('h2', {}, 'Upcoming events')), el('div', { class: 'card' }, evSoon.map((e) => el('div', { class: 'row', onclick: () => openPlanEvent(e.id) }, el('div', { class: 'who' }, el('strong', {}, e.title), el('small', {}, `${fmtDate(e.date)} · ${e.status}${e.guestNames?.length ? ' · ' + e.guestNames.length + ' guests' : ''}`)))))],
    mt.length && [el('div', { class: 'sec-h' }, el('h2', {}, 'Outlook meetings, next 7 days'), el('button', { class: 'btn sm', onclick: () => go('calendar') }, 'Calendar')), el('div', { class: 'card' }, mt.map((m) => meetingRow(m, true)))],
    sugg.length && [el('div', { class: 'sec-h' }, el('h2', {}, 'No touch recorded'), el('button', { class: 'btn sm pri', onclick: () => autoSchedule(sugg) }, `Schedule all (${sugg.length})`)),
      el('div', { class: 'card' }, sugg.slice(0, 8).map((c) => el('div', { class: 'row', onclick: () => openContact(c) }, el('div', { class: 'av' }, initials(c.name)), el('div', { class: 'who' }, el('strong', {}, c.name), el('small', {}, [c.company, c.tier].filter(Boolean).join(' · '))), tagChip(C.roles.tier, c.tier)))),
      sugg.length > 8 && el('p', { class: 'hint', style: 'margin:6px 2px' }, `and ${sugg.length - 8} more. "Schedule all" spreads them over the coming weeks, about 5 a day, so nothing piles up.`)]);
}
async function autoSchedule(list) {
  const per = 5, weeks = Math.ceil(list.length / per / 5);
  if (!confirm(`Schedule ${list.length} follow-ups over about ${weeks} week${weeks > 1 ? 's' : ''} (5 per business day, Tier 1 first)? ${hasShared() ? 'This writes a date to each contact in Monday.' : 'Dates are kept on this device.'}`)) return;
  let d = addDays(today(), 1), n = 0, i = 0; for (const c of list) { while ([0, 6].includes(parseIso(d).getDay())) d = addDays(d, 1); await setFollowUp(c, { next: d }); if (++n % per === 0) d = addDays(d, 1); if (++i % 25 === 0) say(`Scheduling… ${i}/${list.length}`); }
  say(`Scheduled ${list.length} follow-ups`); renderToday();
}
async function createFollowUpColumns() {
  const C = data.contacts; if (!confirm(`Add the date columns "Next follow-up" and "Last contact" to the Monday board "${C.name}"? Everyone with access to the board will see them.`)) return;
  try {
    for (const [role, title, key] of [['next', 'Next follow-up', 'nextColumn'], ['last', 'Last contact', 'lastColumn']]) if (!C.roles[role]) {
      const d = await gql('mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:date){ id } }', { b: C.id, t: title }); cfg[key] = d.create_column?.id || cfg[key]; }
    LS.set('necrm-cfg', cfg); say('Columns added. Reloading from Monday…'); await load(true);
  } catch (e) { say(e.message, 'err'); }
}
function renderCalendarTab() {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const t = today(), y = calMonth.getFullYear(), m = calMonth.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), d1 = `${y}-${pad2(m + 1)}-01`, d2 = `${y}-${pad2(m + 1)}-${pad2(days)}`;
  ensureMeetings(d1, d2).then((fresh) => { if (fresh && tab === 'calendar' && calMonth.getFullYear() === y && calMonth.getMonth() === m) renderCalendarTab(); });
  const by = {}, add = (d, k, v) => { (by[d] ||= { f: [], e: [], m: [] })[k].push(v); }, ready = outlookReady(), err = meetCache[monthKey(calMonth)]?.err;
  dueLists().all.forEach((x) => add(x.due, 'f', x.c)); plan.events.filter((e) => e.status !== 'Cancelled').forEach((e) => add(e.date, 'e', e)); meetingsBetween(d1, d2).forEach((mm) => add(mm.day, 'm', mm));
  const cells = [...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => el('div', { class: 'h' }, x)), ...Array(first).fill(0).map(() => el('div', { class: 'd mute' }))];
  for (let d = 1; d <= days; d++) { const k = `${y}-${pad2(m + 1)}-${pad2(d)}`, x = by[k]; cells.push(el('div', { class: 'd' + (k === calSel ? ' sel' : '') + (k === t ? ' now' : ''), onclick: () => { calSel = k; renderCalendarTab(); } }, el('b', {}, d),
    x && el('div', { class: 'dots' }, x.m.slice(0, 3).map(() => el('i', { class: 'm' })), x.f.slice(0, 3).map(() => el('i', {})), x.e.slice(0, 3).map(() => el('i', { class: 'e' }))))); }
  const sel = by[calSel] || { f: [], e: [], m: [] }, nav = (n) => () => { calMonth = new Date(y, m + n, 1); calSel = monthKey(calMonth) === monthKey(new Date()) ? t : `${monthKey(calMonth)}-01`; renderCalendarTab(); };
  const status = ready ? (err ? el('div', { class: 'err' }, 'Outlook calendar could not be loaded: ' + err, el('div', { class: 'bar', style: 'margin:8px 0 0' }, cfg.msClientId && el('button', { class: 'btn sm', onclick: ms.connect }, 'Reconnect Outlook'), el('span', { class: 'hint' }, 'The Azure app needs the Calendars.ReadWrite permission.'))) : (demo ? null : el('div', { class: 'bar', style: 'margin:0 0 10px' }, el('span', { class: 'hint' }, `Mirrored with Outlook${msCals.list.length > 1 ? ` (${msCals.list.length} calendars)` : ''}${meetSync ? ' · synced ' + new Date(meetSync).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`), el('button', { class: 'btn sm', onclick: async (e) => { e.currentTarget.textContent = 'Syncing…'; await syncNow(true); } }, 'Sync now'))))
    : el('div', { class: 'panel', style: 'max-width:none;margin-bottom:12px' }, el('b', {}, 'Outlook is not connected. '), cfg.msClientId ? 'Connect to see your Outlook meetings here, next to follow-ups and events. Once connected it stays connected and syncs by itself.' : 'Add your Azure app (client) ID in Settings to see your Outlook meetings here.',
      el('div', { class: 'bar', style: 'margin:10px 0 0' }, cfg.msClientId ? el('button', { class: 'btn pri', onclick: ms.connect }, 'Connect Outlook') : el('button', { class: 'btn pri', onclick: () => go('settings') }, 'Open Settings')));
  const timed = sel.m, agenda = [...timed.map((mm) => meetingRow(mm)), ...sel.f.map((c) => taskRow(c, calSel)), ...sel.e.map((e) => el('div', { class: 'row', onclick: () => openPlanEvent(e.id) }, el('div', { class: 'who' }, el('strong', {}, e.title), el('small', {}, `Event · ${e.status}${e.venue ? ' · ' + e.venue : ''}`))))];
  $('#view').replaceChildren(el('div', { class: 'bar', style: 'justify-content:space-between' }, el('h2', { style: 'font-size:22px' }, 'Calendar'), el('button', { class: 'btn sm', onclick: () => { calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); calSel = t; renderCalendarTab(); } }, 'Today')), status, calRulesBar(d1, d2),
    el('div', { class: 'bar', style: 'justify-content:space-between' }, el('button', { class: 'btn sm', onclick: nav(-1), 'aria-label': 'Previous month' }, '‹'), el('b', {}, calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })), el('button', { class: 'btn sm', onclick: nav(1), 'aria-label': 'Next month' }, '›')),
    el('div', { class: 'cal' }, cells), el('p', { class: 'hint', style: 'margin:8px 2px' }, el('span', { class: 'lg2 m' }), ' Outlook meetings  ', el('span', { class: 'lg2' }), ' Follow-ups  ', el('span', { class: 'lg2 e' }), ' Planned events'),
    el('div', { class: 'sec-h' }, el('h2', {}, fmtDate(calSel, true)), el('span', { class: 'hint' }, [timed.length && `${timed.length} meeting${timed.length > 1 ? 's' : ''}`, sel.f.length && `${sel.f.length} follow-up${sel.f.length > 1 ? 's' : ''}`].filter(Boolean).join(' · '))),
    agenda.length ? el('div', { class: 'card' }, agenda) : el('div', { class: 'card' }, el('p', { class: 'hint', style: 'padding:14px' }, ready && !err ? 'Nothing scheduled.' : 'No follow-ups or events scheduled.')));
}

// ---------------------------------------------------------------- contacts
function renderContacts() {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const R = C.roles, all = C.list.filter(isPerson);
  const opts = (k) => [...new Set(all.flatMap((c) => (k === 'poc' ? c.pocs : [c[k]])).filter(Boolean))].sort();
  const match = (c) => (!filters.tier || c.tier === filters.tier) && (!filters.kind || kindOf(c) === filters.kind) && (!filters.spec || c.specialty === filters.spec) && (!filters.market || c.market === filters.market) && (!filters.company || c.company === filters.company) && (!filters.poc || c.pocs.includes(filters.poc)) && nameOrPhone(filters.q, [c.name, c.company], [c.phone, c.phone2]);
  const active = ['spec', 'market', 'company', 'poc'].filter((k) => filters[k]).length;
  const sel = (k, key, ph) => { const s = el('select', { onchange: (e) => { filters[k] = e.target.value; shown = 100; renderContacts(); } }, el('option', { value: '' }, ph), opts(key).map((o) => el('option', { value: o }, o))); s.value = filters[k]; return s; };
  const search = el('input', { type: 'search', placeholder: 'Name or phone', value: filters.q, oninput: (e) => { filters.q = e.target.value; shown = 100; renderList(); } });
  const fbtn = el('button', { class: 'btn', onclick: () => $('#filters').classList.toggle('on') }, icon('filter'), active ? `Filters (${active})` : 'Filters');
  // Tier pills: skip blank labels and labels nobody has; order Tier 1, Tier 2, Tier 3, then the rest
  const tierNum = (l) => { const m = /tier\s*(\d+)/i.exec(l); return m ? Number(m[1]) : 99; };
  const tiers = (R.tier?.labels || []).filter((l) => l.label && all.some((c) => c.tier === l.label)).sort((a, b) => tierNum(a.label) - tierNum(b.label) || a.label.localeCompare(b.label));
  const pill = (label, key) => el('button', { class: 'tp' + ((filters.tier || '') === key ? ' on' : ''), onclick: () => { filters.tier = filters.tier === key ? '' : key; shown = 100; renderContacts(); } }, label, el('b', {}, key ? all.filter((c) => c.tier === key).length : all.length));
  const kpill = (label, key) => el('button', { class: 'tp kp' + ((filters.kind || '') === key ? ' on' : ''), style: '--c:' + KIND_COLOR[key], onclick: () => { filters.kind = filters.kind === key ? '' : key; shown = 100; renderContacts(); } }, label, el('b', {}, all.filter((c) => kindOf(c) === key).length)); const listBox = el('div', { class: 'card' }), count = el('div', { class: 'hint', style: 'margin:8px 2px' });
  const renderList = () => {
    const v = all.filter(match).sort((a, b) => a.name.localeCompare(b.name));
    listBox.replaceChildren(v.length ? v.slice(0, shown).map((c) => el('div', { class: 'row tr-' + tierCls(c.tier) + (c.id === cSel ? ' sel' : ''), 'data-id': c.id, onclick: () => (wide() ? selectContact(c, true) : openContact(c)) }, el('div', { class: 'av' }, initials(c.name)),
      el('div', { class: 'who' }, el('strong', {}, c.name), el('small', {}, [c.title, c.company].filter(Boolean).join(' · ')), pocOf(c) && el('small', {}, 'Faropoint POC: ', el('b', { style: 'color:var(--blue);font-weight:500' }, pocOf(c))), el('div', {}, dueChip(c), tierChip(c), kindChip(c), tagChip(R.market, c.market)), c.phone && el('small', {}, phoneLink(c))),
      el('button', { class: 'btn sm detbtn', title: 'Open the full record', onclick: (e) => { e.stopPropagation(); openContact(c); } }, 'Open'),
      (officeOf(c) || c.addresses.length || approxPt(c)) && el('button', { class: 'btn round pinbtn', title: 'Show on map', onclick: (e) => { e.stopPropagation(); focusOnMap(c); } }, icon('map')),
      c.phone && el('a', { class: 'btn round', href: telHref(c.phone), title: 'Call', onclick: (e) => e.stopPropagation() }, icon('phone')))) : el('p', { class: 'hint', style: 'padding:16px' }, 'No matches.'),
      v.length > shown && el('div', { style: 'padding:12px' }, el('button', { class: 'btn', onclick: () => { shown += 100; renderList(); } }, `Show more (${v.length - shown})`)));
    count.textContent = `${v.length} of ${all.length} contacts`; curList = v; clearTimeout(mapT); mapT = setTimeout(() => updateMap(v), 250);
  };
  const mseg = el('div', { class: 'seg seg-m' }, [['list', 'List'], ['map', 'Map']].map(([k, l]) => el('button', { class: mapView === k ? 'on' : '', onclick: () => { mapView = k; split.dataset.v = k; mseg.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', ['list', 'map'][i] === k)); setTimeout(() => cmap?.invalidateSize(), 50); } }, l)));
  const left = el('div', { class: 'listcol' }, el('div', { class: 'sticky' }, el('div', { class: 'search' }, el('span', { class: 'ic' }, icon('search')), search, fbtn),
    el('div', { id: 'filters', class: active ? 'on' : '' }, sel('spec', 'specialty', R.specialty?.title || 'Specialty'), sel('market', 'market', R.market?.title || 'Market'), sel('company', 'company', 'Company'), R.poc && sel('poc', 'poc', 'Faropoint POC')),
    el('div', { class: 'pills' }, pill('All', ''), tiers.map((l) => pill(l.label, l.label))), el('div', { class: 'pills' }, KINDS.filter((k) => all.some((c) => kindOf(c) === k)).map((k) => kpill(k === 'Principal' ? 'Principals' : k, k)))), count, listBox);
  const split = el('div', { class: 'split', 'data-v': mapView }, left, mapColumn());
  $('#view').replaceChildren(el('div', { class: 'mtop' }, mseg), split); renderList(); setTimeout(() => { ensureMap(); cmap?.invalidateSize(); }, 30);
}
function renderContactsKeep() { const sheetOpen = $('#sheet').classList.contains('on'); const sc = $('#sheetIn').scrollTop; renderContacts(); updateMap(curList); }
async function openContact(c) {
  const C = data.contacts, R = C.roles, notes = el('div', {}), mails = el('div', {}), dueBox = el('div', {});
  const pick = (role) => { const col = R[role]; if (!col?.labels) return null; const s = el('select', { onchange: async (e) => { if (!e.target.value) return; c[role] = e.target.value; say(await enqueue({ type: 'column', boardId: C.id, itemId: c.id, columnId: col.id, value: { label: e.target.value } })); renderContacts(); drawDue(); } }, el('option', { value: '' }, '—'), col.labels.filter((l) => l.label).map((l) => el('option', { value: l.label }, l.label))); s.value = c[role]; return el('div', { class: 'f' }, el('label', {}, col.title), s); };
  const drawDue = () => { const d = dueOf(c), st = dueState(d), cad = cadenceFor(c);
    dueBox.replaceChildren(el('div', { class: 'fu ' + st }, el('div', {}, el('label', {}, 'Next follow-up'), d ? el('b', {}, fmtDate(d, true) + (st === 'overdue' ? ' · overdue' : st === 'today' ? ' · today' : '')) : el('b', {}, 'Not scheduled'),
      el('div', { class: 'hint' }, [c.last && 'Last contact ' + fmtDate(c.last), cad ? `${cad}-day cadence` : 'No automatic cadence'].filter(Boolean).join(' · '))),
      el('div', { class: 'acts' }, el('button', { class: 'btn sm pri', onclick: () => openFollowUp(c) }, d ? 'Reschedule' : 'Schedule'), d && el('button', { class: 'btn sm', onclick: async () => { await snooze(c, 7); drawDue(); } }, '+1 week')))); };
  const quick = (label, kind, text) => el('button', { class: 'btn sm', onclick: async () => { say(await logActivity(c, kind, text)); drawDue(); showNotes(c, notes); renderContacts(); } }, label);
  const refresh = () => { if (tab === 'contacts') { renderContactsKeep(); } };
  const offIn = el('input', { value: c.office || '', placeholder: 'Office address (street, city, state)', style: 'width:100%', onchange: async (e) => { await saveAddr(c, { office: e.target.value.trim() }); say('Office address saved'); refresh(); } });
  const bl = el('div', {}), bIn = el('input', { placeholder: 'Add a closed building address', style: 'flex:1' });
  const drawB = () => bl.replaceChildren(c.addresses.map((a, i) => el('div', { class: 'note', style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, el('a', { href: mapsLink(a), target: '_blank', rel: 'noopener' }, a), el('button', { class: 'btn sm', onclick: async () => { const n = [...c.addresses]; n.splice(i, 1); await saveAddr(c, { props: n }); drawB(); refresh(); } }, 'Remove'))));
  const addB = async () => { const v = bIn.value.trim(); if (!v) return; await saveAddr(c, { props: [...c.addresses, v] }); bIn.value = ''; drawB(); say('Building added'); refresh(); };
  bIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addB(); } }); drawB();
  const addrBox = el('div', {}, el('h3', {}, 'Addresses'), el('div', { class: 'f' }, el('label', {}, 'Office'), offIn), el('label', { style: 'display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin-bottom:4px' }, 'Buildings closed with this contact'), bl,
    el('div', { style: 'display:flex;gap:8px;margin-top:6px' }, bIn, el('button', { class: 'btn', onclick: addB }, 'Add')), el('div', { class: 'bar', style: 'margin-top:8px' }, (c.office || c.addresses.length) && el('button', { class: 'btn sm', onclick: () => { closeSheet(); go('contacts'); setTimeout(() => focusOnMap(c), 80); } }, 'Show on map')));
  const ta = el('textarea', { rows: 3, placeholder: 'Feedback or call notes (saved to this contact in Monday)' }), tags = tagPicker();
  const withFirm = c.company && norm(c.company).length >= 4 ? data.contacts.bd.events.filter((e) => e.firm && (norm(e.firm).includes(norm(c.company)) || norm(c.company).includes(norm(e.firm)))).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 3) : [];
  const mm = c.email ? allMeetings().filter((x) => x.emails.includes(c.email.toLowerCase()) && x.day >= today()).sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start).slice(0, 3) : [];
  openSheet(el('div', { style: 'display:flex;gap:12px;align-items:center' }, el('div', { class: 'av' }, initials(c.name)), el('div', {}, el('h2', {}, c.name), el('div', { class: 'hint' }, [c.title, c.company].filter(Boolean).join(' · ')))),
    el('div', { class: 'bar', style: 'margin-top:12px' }, c.phone && el('a', { class: 'btn', href: telHref(c.phone) }, icon('phone'), fmtPhone(c.phone)), c.phone2 && el('a', { class: 'btn', href: telHref(c.phone2) }, 'Call ' + fmtPhone(c.phone2)),
      c.phone && el('a', { class: 'btn', href: 'sms:+' + digits(c.phone) }, 'Text'), c.email && el('a', { class: 'btn', href: 'mailto:' + c.email }, 'Email'), el('button', { class: 'btn', onclick: () => openCreateInitiative({ firm: c.company, notes: 'With ' + c.name }) }, '+ Initiative')),
    dueBox, withFirm.length && [el('h3', {}, 'Events with this firm'), el('div', { class: 'card', style: 'margin:6px 0 12px' }, withFirm.map((e) => el('div', { class: 'row', onclick: () => openBdEvent(e) }, el('div', { class: 'who' }, el('strong', {}, e.name), el('small', {}, [fmtDate(e.start, true), e.status].filter(Boolean).join(' · '))))))], mm.length && [el('h3', {}, 'Upcoming Outlook meetings'), el('div', { class: 'card', style: 'margin:6px 0 12px' }, mm.map((x) => meetingRow(x, true)))], el('label', { class: 'hint', style: 'display:block;margin-bottom:4px' }, 'LOG AN ACTIVITY (stamps last contact and schedules the next follow-up)'),
    el('div', { class: 'acts' }, quick('Spoke', 'Call', 'Spoke with contact'), quick('Voicemail', 'Call', 'Left voicemail'), quick('Emailed', 'Email', 'Sent email'), quick('Met', 'Meeting', 'Met in person')),
    el('div', { style: 'height:12px' }), R.poc && el('div', { class: 'f' }, el('label', {}, 'Faropoint POC'), el('div', {}, pocOf(c) ? el('b', {}, pocOf(c)) : el('span', { class: 'hint' }, 'Not assigned'), c.pocs.length > 1 && el('span', { class: 'hint' }, ' · also ' + c.pocs.slice(1).join(', ')))),
    c.email && el('p', { class: 'hint' }, c.email), pick('tier'), pick('specialty'), pick('market'),
    c.closed > 0 && el('p', {}, el('b', {}, 'Deals closed with us: '), String(c.closed)), addrBox,
    el('h3', {}, 'Add a note'), ta, tags.node,
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: async () => { if (!ta.value.trim()) return; const em = tags.emails(); if (!(await checkTags(em))) return;
      say(await logActivity(c, 'Note', ta.value, em)); ta.value = ''; tags.clear(); drawDue(); showNotes(c, notes); renderContacts(); } }, 'Save note'), el('button', { class: 'btn', onclick: closeSheet }, 'Close')),
    el('h3', {}, 'Activity'), notes, c.email && ms.connected() && el('div', {}, el('h3', {}, 'Recent Outlook emails'), mails));
  drawDue(); showNotes(c, notes); if (c.email && ms.connected()) showMails(c.email, mails, c);
}
function openFollowUp(c) {
  const cad = cadenceFor(c), date = el('input', { type: 'date', value: dueOf(c) || addDays(today(), cad || 30) }), why = el('input', { placeholder: 'Reason (optional), e.g. send Q1 availability' }), tags = tagPicker();
  const quickDates = el('div', { class: 'acts', style: 'margin-bottom:10px' }, [['Tomorrow', 1], ['1 week', 7], ['2 weeks', 14], ['1 month', 30], ['3 months', 90]].map(([l, n]) => el('button', { class: 'btn sm', onclick: () => { date.value = addDays(today(), n); } }, l)));
  openSheet(el('h2', {}, 'Schedule follow-up'), el('p', { class: 'hint' }, `${c.name}${c.company ? ' · ' + c.company : ''}. ${cad ? `${c.tier || 'Default'} cadence is ${cad} days.` : 'This tier has no automatic cadence.'}`),
    el('div', { class: 'f' }, el('label', {}, 'Date'), date), quickDates, el('div', { class: 'f' }, el('label', {}, 'Reason'), why), tags.node,
    el('p', { class: 'hint' }, 'Tagging a teammate posts a note on this contact with an @mention, and Monday notifies them.'),
    el('label', { class: 'hint', style: 'display:block;margin:8px 0 4px' }, 'ADD TO YOUR CALENDAR'), calButtons(() => ({ ...calEvent(c), date: date.value || today(), title: `Follow up: ${c.name}${c.company ? ' (' + c.company + ')' : ''}${why.value ? ' - ' + why.value : ''}` })),
    el('div', { class: 'bar', style: 'margin-top:14px' }, el('button', { class: 'btn pri', onclick: async () => { if (!date.value) return say('Pick a date', 'err'); const em = tags.emails(); if (!(await checkTags(em))) return;
      await setFollowUp(c, { next: date.value }); if (cfg.autoOutlook) addToOutlook({ ...calEvent(c), date: date.value, title: `Follow up: ${c.name}${c.company ? ' (' + c.company + ')' : ''}${why.value ? ' - ' + why.value : ''}`, uid: `${c.id}-${date.value}@necrm` }); if (why.value.trim() || em.length) await enqueue({ type: 'feedback', itemId: c.id, body: activityBody('Follow-up', `due ${fmtDate(date.value, true)}${why.value.trim() ? ': ' + why.value.trim() : ''}`, c.name), tags: em });
      say('Follow-up scheduled for ' + fmtDate(date.value)); openContact(c); if (tab === 'today') renderToday(); } }, 'Save'), el('button', { class: 'btn', onclick: () => openContact(c) }, 'Back')));
}
const feedbackBody = (t, who) => `Field feedback${who ? ' from ' + who : ''} (captured ${new Date().toLocaleString('en-US')}): ${t.trim()}`.replace(/</g, '&lt;');
async function showNotes(c, box) { try { const n = await getUpdates(c.id); box.replaceChildren(n.map((u) => el('div', { class: 'note' }, u.text_body || '', el('small', {}, `${u.creator?.name || ''} · ${new Date(u.created_at).toLocaleString()}`)))); } catch { box.replaceChildren(el('p', { class: 'hint' }, 'Notes unavailable offline.')); } }

// ---------------------------------------------------------------- insights (donut charts)
const NS = 'http://www.w3.org/2000/svg';
function topN(map, n = 7) {
  const arr = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (arr.length <= n) return arr;
  return [...arr.slice(0, n), { label: 'Other', value: arr.slice(n).reduce((a, b) => a + b.value, 0), other: true }];
}
function donut(items, { unit = '', onPick, fmt = (v) => v } = {}) {
  const sum = items.reduce((a, b) => a + b.value, 0), r = 58, L = 2 * Math.PI * r, gap = items.length > 1 ? 2 : 0;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 180 180'); svg.setAttribute('role', 'img');
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const big = mk('text', { x: 90, y: 92, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: '#344050', 'font-family': 'Roboto,Arial' }), small = mk('text', { x: 90, y: 112, 'text-anchor': 'middle', 'font-size': 11, fill: '#5D6673', 'font-family': 'Roboto,Arial' });
  const setBig = (v) => { const t = String(fmt(v)); big.textContent = t; big.setAttribute('font-size', t.length > 7 ? 19 : t.length > 5 ? 23 : 28); }; setBig(sum); small.textContent = unit;
  const legend = el('div', { class: 'lg' }), arcs = []; let cum = 0;
  items.forEach((it, i) => {
    it.color = it.other ? NEUTRAL : PALETTE[i % PALETTE.length]; const frac = it.value / sum;
    const c = mk('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: it.color, 'stroke-width': 26, 'stroke-dasharray': `${Math.max(frac * L - gap, 0.5)} ${L}`, 'stroke-dashoffset': -cum * L, transform: 'rotate(-90 90 90)' });
    const t = mk('title', {}); t.textContent = `${it.label}: ${it.value} (${Math.round(frac * 100)}%)`; c.append(t); cum += frac; arcs.push(c); svg.append(c);
    const row = el('div', { onclick: () => pick(i) }, el('i', { style: 'background:' + it.color }), el('span', {}, it.label), el('b', {}, fmt(it.value)), el('em', {}, Math.round(frac * 100) + '%')); legend.append(row); it.row = row;
  });
  const pick = (i) => { items.forEach((x, j) => { arcs[j].setAttribute('stroke-width', j === i ? 32 : 26); x.row.classList.toggle('on', j === i); }); setBig(items[i].value); small.textContent = items[i].label.length > 22 ? items[i].label.slice(0, 21) + '…' : items[i].label; onPick && onPick(items[i]); };
  arcs.forEach((c, i) => c.addEventListener('click', () => pick(i)));
  svg.append(big, small);
  return el('div', { class: 'dn' }, svg, legend);
}
const closedContacts = () => data.contacts.list.filter((c) => c.closed > 0);
function propertyRows() { // one row per property address on a contact, restricted to closed-deal contacts when a closed column exists
  const base = data.contacts.roles.closed ? closedContacts() : data.contacts.list;
  return base.flatMap((c) => c.addresses.map((a) => ({ addr: a, contact: c })));
}
const cityOf = (a) => { const p = a.split(',').map((x) => x.trim()).filter(Boolean); if (p.length >= 3) return `${p[p.length - 2]}, ${p[p.length - 1].replace(/[\d-]+/g, '').trim()}`; return p.length === 2 ? p[1].replace(/\s*\d{5}(-\d{4})?$/, '') : p[0] || 'Unknown'; };
function needsSetup(what, role) { return el('div', { class: 'panel', style: 'max-width:none;box-shadow:none;background:var(--bg)' }, el('p', { style: 'margin:0 0 10px' }, `Choose which Monday column holds ${what} to see this chart.`), el('button', { class: 'btn', onclick: () => go('settings') }, 'Open Settings')); }
function renderInsights() {
  let c1b = null; const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const R = C.roles, people = C.list.filter(isPerson);
  // 1. contacts by region
  const reg = new Map(); for (const c of people) reg.set(c.market || 'No region set', (reg.get(c.market || 'No region set') || 0) + 1);
  const c1 = el('div', { class: 'card chart' }, el('h2', {}, 'Contacts by region'), el('div', { class: 'sub' }, `${people.length} contacts grouped by ${R.market?.title || 'market'}. Tap a slice, then "View contacts".`));
  const go1 = el('div', { class: 'bar', style: 'margin-top:8px' });
  c1.append(donut(topN(reg, 8), { unit: 'contacts', onPick: (it) => go1.replaceChildren(!it.other && it.label !== 'No region set' && el('button', { class: 'btn sm', onclick: () => { Object.assign(filters, { tier: '', spec: '', company: '', q: '', poc: '', market: it.label }); go('contacts'); } }, `View ${it.label} contacts`)) }), go1);
  // 1b. relationships by Faropoint POC
  if (R.poc) { const pm = new Map(); for (const c of people) pm.set(pocOf(c) || 'Unassigned', (pm.get(pocOf(c) || 'Unassigned') || 0) + 1);
    const goP = el('div', { class: 'bar', style: 'margin-top:8px' });
    c1b = el('div', { class: 'card chart' }, el('h2', {}, 'Relationships by Faropoint POC'), el('div', { class: 'sub' }, `Main POC covering each relationship, from "${R.poc.title}" (first person listed).`),
      donut(topN(pm, 8), { unit: 'relationships', onPick: (it) => goP.replaceChildren(!it.other && it.label !== 'Unassigned' && el('button', { class: 'btn sm', onclick: () => { Object.assign(filters, { tier: '', spec: '', company: '', q: '', market: '', poc: it.label }); go('contacts'); } }, `View ${it.label}'s contacts`)) }), goP); }
  // 2. who we have closed deals with
  const c2 = el('div', { class: 'card chart' }); const seg = el('div', { class: 'seg' }, ['firm', 'contact'].map((k) => el('button', { class: closedBy === k ? 'on' : '', onclick: () => { closedBy = k; renderInsights(); } }, k === 'firm' ? 'By firm' : 'By contact')));
  c2.append(el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('h2', {}, 'Closed deals by counterparty'), R.closed && seg));
  if (!R.closed) c2.append(el('div', { class: 'sub' }, 'Who we have closed deals with'), needsSetup('closed deals (a number, status or checkbox)'));
  else { const cc = closedContacts(), m = new Map(); for (const c of cc) { const k = closedBy === 'firm' ? c.company || c.name : c.name; m.set(k, (m.get(k) || 0) + c.closed); }
    c2.append(el('div', { class: 'sub' }, `From "${R.closed.title}". ${cc.length} contacts with closed deals.`), m.size ? donut(topN(m, 8), { unit: 'closed deals' }) : el('p', { class: 'hint' }, 'No closed deals found in that column.')); }
  // 3. property addresses of the deals
  const c3 = el('div', { class: 'card chart' }, el('h2', {}, 'Deal properties by location')); const rows = propertyRows();
  if (!R.address) c3.append(el('div', { class: 'sub' }, 'Property addresses of closed deals'), needsSetup('property addresses'));
  else if (!rows.length) c3.append(el('div', { class: 'sub' }, `From "${R.address.title}"`), el('p', { class: 'hint' }, 'No property addresses found yet.'));
  else { const m = new Map(); for (const r of rows) m.set(cityOf(r.addr), (m.get(cityOf(r.addr)) || 0) + 1); const list = el('div', {});
    const show = (city) => list.replaceChildren(rows.filter((r) => !city || cityOf(r.addr) === city).map((r) => el('div', { class: 'note' }, el('a', { href: mapsLink(r.addr), target: '_blank', rel: 'noopener' }, r.addr), el('small', {}, `via ${r.contact.name}${r.contact.company ? ' · ' + r.contact.company : ''}${pocOf(r.contact) ? ' · POC ' + pocOf(r.contact) : ''}`))));
    c3.append(el('div', { class: 'sub' }, `${rows.length} properties from "${R.address.title}". Tap a slice to filter the list.`), donut(topN(m, 8), { unit: 'properties', onPick: (it) => show(it.other ? '' : it.label) }), el('h3', { style: 'margin-top:12px;font-size:16px' }, 'Property addresses'), list); show(''); }
  $('#view').replaceChildren(c1, c1b, c2, c3);
}

// ---------------------------------------------------------------- capture
function contactVals(C, f) {
  const R = C.roles, v = {};
  if (f.email && R.email) v[R.email.id] = { email: f.email, text: f.email };
  if (f.phone && R.phone) v[R.phone.id] = { phone: f.phone, countryShortName: 'US' };
  if (f.company && R.company?.type === 'text') v[R.company.id] = f.company;
  if (f.title && R.title) v[R.title.id] = f.title;
  for (const k of ['tier', 'specialty', 'market']) if (f[k] && R[k]) v[R[k].id] = R[k].type === 'dropdown' ? { labels: [f[k]] } : R[k].type === 'status' ? { label: f[k] } : f[k];
  return v;
}
const brokerGroup = () => (data.contacts.groups.find((g) => /broker|contact|relationship/i.test(g.title)) || data.contacts.groups[0])?.id;
const dupOf = (f) => data.contacts.list.find((c) => (f.email && c.email.toLowerCase() === f.email.toLowerCase()) || (digits(f.phone).length >= 7 && [c.phone, c.phone2].some((p) => digits(p).endsWith(digits(f.phone).slice(-10)))));
function renderCapture() {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const who = el('input', { placeholder: 'Contact name or phone', list: 'ppl' }), ppl = el('datalist', { id: 'ppl' }, C.list.filter(isPerson).map((c) => el('option', { value: c.name }, fmtPhone(c.phone))));
  const text = el('textarea', { rows: 5, placeholder: 'Feedback, site notes, next steps' }), tags = tagPicker();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const fb = el('div', { class: 'panel' }, el('h2', {}, 'Log feedback'), el('label', {}, 'Who'), who, ppl, text, tags.node,
    el('div', { class: 'bar' }, SR && el('button', { class: 'btn', onclick: () => { const r = new SR(); r.lang = 'en-US'; r.onresult = (e) => { text.value += (text.value ? ' ' : '') + e.results[0][0].transcript; }; r.start(); } }, 'Dictate'),
      el('button', { class: 'btn pri', onclick: async () => {
        const q = who.value.trim(), hit = C.list.filter((c) => c.name.toLowerCase() === q.toLowerCase() || (digits(q).length >= 7 && [c.phone, c.phone2].some((p) => digits(p).includes(digits(q)))));
        if (hit.length !== 1) return say(hit.length ? 'More than one match; use the full name.' : 'Pick an existing contact (type a name or phone).', 'err');
        if (!text.value.trim()) return; const em = tags.emails(); if (!(await checkTags(em))) return;
        say(await enqueue({ type: 'feedback', itemId: hit[0].id, body: feedbackBody(text.value, hit[0].name), tags: em })); text.value = ''; who.value = ''; tags.clear(); } }, 'Save feedback')));
  const f = { name: el('input', { placeholder: 'Name' }), title: el('input', { placeholder: 'Job title' }), company: el('input', { placeholder: 'Company' }), phone: el('input', { type: 'tel', placeholder: 'Phone' }), email: el('input', { type: 'email', placeholder: 'Email' }) };
  const sels = {}; for (const k of ['tier', 'specialty', 'market']) { const col = C.roles[k]; if (col?.labels) sels[k] = el('select', {}, el('option', { value: '' }, col.title), col.labels.filter((l) => l.label).map((l) => el('option', { value: l.label }, l.label))); }
  const qc = el('div', { class: 'panel' }, el('h2', {}, 'Quick add contact'), Object.values(f), Object.values(sels),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: async () => {
      const v = Object.fromEntries([...Object.entries(f), ...Object.entries(sels)].map(([k, x]) => [k, x.value.trim()]));
      if (!v.name) return say('Name is required', 'err');
      const d = dupOf(v); if (d && !confirm(`${d.name} already has this phone or email. Add anyway?`)) return;
      say(await enqueue({ type: 'contact', name: v.name, vals: contactVals(C, v), groupId: brokerGroup() }));
      [...Object.values(f), ...Object.values(sels)].forEach((x) => { x.value = ''; }); } }, 'Save contact')));
  $('#view').replaceChildren(fb, qc, importPanel());
}

// ---------------------------------------------------------------- imports: vCard / CSV / phone / Outlook
function parseVCard(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n'), out = []; let cur = null;
  for (const line of lines) {
    if (/^BEGIN:VCARD/i.test(line)) { cur = {}; continue; } if (/^END:VCARD/i.test(line)) { if (cur) out.push(cur); cur = null; continue; } if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue; const p = line.slice(0, i).split(';')[0].toUpperCase().replace(/^.*\./, ''), v = line.slice(i + 1).replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
    if (p === 'FN') cur.name = v; else if (p === 'N' && !cur.name) { const [l, f] = v.split(';'); cur.name = [f, l].filter(Boolean).join(' '); } else if (p === 'EMAIL' && !cur.email) cur.email = v;
    else if (p === 'TEL' && !cur.phone) cur.phone = v; else if (p === 'ORG' && !cur.company) cur.company = v.split(';')[0]; else if (p === 'TITLE') cur.title = v;
  }
  return out;
}
function csvTable(text) {
  const rows = []; let row = [], f = '', q = false; const s = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; } else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(Boolean)) rows.push(row); row = []; } else f += ch; }
  row.push(f); if (row.some(Boolean)) rows.push(row);
  return rows;
}
function parseCsv(text) {
  const [head, ...body] = csvTable(text); if (!head) return []; const h = head.map((x) => x.trim().toLowerCase());
  const ix = (...p) => h.findIndex((x) => p.some((y) => (y instanceof RegExp ? y.test(x) : x === y))), g = (r, i) => (i >= 0 ? r[i] || '' : '');
  const c = { name: ix('name', 'full name', 'display name'), fn: ix('first name', 'given name'), ln: ix('last name', 'family name', 'surname'), email: ix('e-mail address', 'email', 'email address', 'e-mail 1 - value', /^e-?mail/),
    phone: ix('mobile phone', 'phone', 'business phone', 'phone 1 - value', /phone/), company: ix('company', 'organization 1 - name', 'organization'), title: ix('job title', 'title', 'organization 1 - title') };
  return body.map((r) => ({ name: g(r, c.name) || [g(r, c.fn), g(r, c.ln)].filter(Boolean).join(' '), email: g(r, c.email), phone: g(r, c.phone), company: g(r, c.company), title: g(r, c.title) }));
}
async function importContacts(list, label) {
  const C = data.contacts, fresh = [], seen = new Set();
  for (const raw of list) { const f = { name: (raw.name || raw.email || raw.phone || '').trim(), email: (raw.email || '').trim(), phone: (raw.phone || '').trim(), company: (raw.company || '').trim(), title: (raw.title || '').trim() };
    const k = (f.email || digits(f.phone) || f.name).toLowerCase(); if (!f.name || seen.has(k) || dupOf(f)) continue; seen.add(k); fresh.push(f); }
  if (!fresh.length) return say(`${label}: nothing new (${list.length} read, all already in Monday).`);
  if (!confirm(`${label}: add ${fresh.length} new contacts to "${C.name}" in Monday? (${list.length - fresh.length} skipped as duplicates)`)) return;
  let n = 0; for (const f of fresh) { await enqueue({ type: 'contact', name: f.name, vals: contactVals(C, f), groupId: brokerGroup() }); n++; }
  say(`${label}: added ${n}.`); await load(true);
}
function importPanel() {
  const file = el('input', { type: 'file', accept: '.vcf,.csv,text/vcard,text/csv', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; const t = await f.text(); await importContacts(/\.csv$/i.test(f.name) ? parseCsv(t) : parseVCard(t), f.name); e.target.value = ''; } });
  const picker = 'contacts' in navigator && 'ContactsManager' in window;
  return el('div', { class: 'panel' }, el('h2', {}, 'Import contacts'), el('p', { class: 'hint' }, 'Contacts already in Monday (same phone or email) are skipped. You confirm before anything is added.'),
    el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: () => file.click() }, 'Upload .vcf / .csv'),
      picker && el('button', { class: 'btn', onclick: async () => { try { const p = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true }); await importContacts(p.map((x) => ({ name: x.name?.[0], email: x.email?.[0], phone: x.tel?.[0] })), 'Phone contacts'); } catch (e) { say(e.message, 'err'); } } }, 'From phone'),
      cfg.msClientId && (ms.connected() ? el('button', { class: 'btn', onclick: () => ms.importContacts().catch((e) => say(e.message, 'err')) }, 'Import from Outlook') : el('button', { class: 'btn', onclick: ms.connect }, 'Connect Outlook')), file));
}

// ---------------------------------------------------------------- Outlook (Microsoft Graph, OAuth PKCE; needs an Azure "Single-page application" registration)
let msRefresh = null;
const ms = {
  redirect: () => location.origin + location.pathname,
  token() { const t = LS.get('necrm-ms', null); return t && t.exp > Date.now() ? t.access : null; },
  connected() { const t = LS.get('necrm-ms', null); return !!(t && (t.exp > Date.now() || t.refresh)); },
  async fresh() {   // a valid access token, renewed quietly from the refresh token when it has expired, so the connection survives past the first hour
    const ok = ms.connected() && ms.token(); if (ok) return ok; const t = LS.get('necrm-ms', null); if (!t?.refresh) throw new Error('Outlook sign-in expired. Reconnect Outlook.');
    msRefresh ||= (async () => { const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cfg.msClientId, grant_type: 'refresh_token', refresh_token: t.refresh, scope: 'offline_access User.Read Contacts.Read Mail.Read Calendars.ReadWrite' }) }); const j = await r.json().catch(() => ({}));
      if (!r.ok) { if (j.error === 'invalid_grant') LS.set('necrm-ms', null); throw new Error('Outlook sign-in expired. Reconnect Outlook.'); } LS.set('necrm-ms', { access: j.access_token, refresh: j.refresh_token || t.refresh, exp: Date.now() + (j.expires_in - 60) * 1000 }); return j.access_token; })().finally(() => { msRefresh = null; }); return msRefresh; },
  async call(method, u, body) { const tk = await ms.fresh(), r = await fetch('https://graph.microsoft.com/v1.0' + u, { method, headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = r.status === 204 ? {} : await r.json().catch(() => ({})); if (!r.ok && !(method === 'DELETE' && r.status === 404)) throw new Error((r.status === 403 ? '403 ' : '') + (j.error?.message || 'Outlook request failed')); return j; },
  async connect() {
    const v = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join(''), state = uid();
    const ch = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sessionStorage.setItem('necrm-pkce', JSON.stringify({ v, state }));
    location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + new URLSearchParams({ client_id: cfg.msClientId, response_type: 'code', redirect_uri: ms.redirect(), response_mode: 'query', scope: 'offline_access User.Read Contacts.Read Mail.Read Calendars.ReadWrite', state, code_challenge: ch, code_challenge_method: 'S256' });
  },
  async finish() {
    const p = new URLSearchParams(location.search), saved = JSON.parse(sessionStorage.getItem('necrm-pkce') || 'null');
    if (!p.get('code') && !p.get('error')) return; history.replaceState(null, '', ms.redirect());
    if (p.get('error')) return say('Outlook: ' + (p.get('error_description') || p.get('error')), 'err');
    if (!saved || saved.state !== p.get('state')) return say('Outlook sign-in state did not match; try again.', 'err');
    sessionStorage.removeItem('necrm-pkce');
    const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: cfg.msClientId, grant_type: 'authorization_code', code: p.get('code'), redirect_uri: ms.redirect(), code_verifier: saved.v, scope: 'offline_access User.Read Contacts.Read Mail.Read Calendars.ReadWrite' }) });
    const j = await r.json(); if (!r.ok) return say('Outlook: ' + (j.error_description || j.error), 'err');
    LS.set('necrm-ms', { access: j.access_token, refresh: j.refresh_token || '', exp: Date.now() + (j.expires_in - 60) * 1000 }); track('outlook_connected'); say('Outlook connected'); setTimeout(() => syncNow(true), 100);
  },
  post: (u, body) => ms.call('POST', u, body),
  async graph(u, extra) { const tk = await ms.fresh(), r = await fetch(u.startsWith('http') ? u : 'https://graph.microsoft.com/v1.0' + u, { headers: { Authorization: 'Bearer ' + tk, ConsistencyLevel: 'eventual', ...(extra || {}) } }); const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Outlook request failed'); return j; },
  async importContacts() {
    let u = '/me/contacts?$top=100&$select=displayName,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle', all = [];
    while (u && all.length < 3000) { const j = await ms.graph(u); all = all.concat(j.value.map((c) => ({ name: c.displayName, email: c.emailAddresses?.[0]?.address, phone: c.mobilePhone || c.businessPhones?.[0], company: c.companyName, title: c.jobTitle }))); u = j['@odata.nextLink']; }
    await importContacts(all, 'Outlook');
  },
};
async function showMails(email, box, contact) {
  try { const j = await ms.graph(`/me/messages?$search="participants:${email.replace(/["\\]/g, '')}"&$top=8&$select=subject,receivedDateTime,bodyPreview,webLink`);
    box.replaceChildren(j.value.length ? j.value.map((m) => el('div', { class: 'note' }, el('a', { href: m.webLink, target: '_blank', rel: 'noopener' }, m.subject || '(no subject)'), el('small', {}, new Date(m.receivedDateTime).toLocaleDateString() + ' · ' + (m.bodyPreview || '').slice(0, 100)), el('button', { class: 'btn sm', style: 'margin-top:6px', onclick: () => openCreateInitiative({ name: m.subject || '', start: iso(new Date(m.receivedDateTime)), firm: contact?.company || '', notes: ['From an Outlook email: ' + (m.subject || ''), (m.bodyPreview || '').slice(0, 300)].join('\n') }) }, '+ Initiative from this email'))) : el('p', { class: 'hint' }, 'No recent messages.')); } catch (e) { box.textContent = e.message; }
}

// ---------------------------------------------------------------- live map beside the contacts: offices and the buildings closed with each contact
// OpenStreetMap tiles + Leaflet (bundled, no API key). Addresses are located with OpenStreetMap's Nominatim, with Photon as a backup, one lookup per second, and remembered on this device.
const mapsLink = (q) => 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(q);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mapHost = el('div', { id: 'cmap' });   // the Leaflet map lives in this node for the whole session, so it stays live while lists re-render
let cmap = null, cLayer = null, cLines = null, mapRun = 0, cSel = '', curList = [], userMoved = false, geoChain = Promise.resolve(), lastGeo = 0, mapView = 'list', mapT = 0, mapOn = { office: true, bldg: true }, mapStatus = el('div', { class: 'hint' });
const wide = () => window.matchMedia('(min-width:900px)').matches;
const geoMem = () => (geoMem.c ||= LS.get('necrm-geo', {})), geoPeek = (a) => geoMem()[a.toLowerCase()];
async function viaNominatim(a) { const j = await jget('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(a)); return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null; }
async function viaPhoton(a) { const j = await jget('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(a)), c = j.features?.[0]?.geometry?.coordinates; return c ? { lat: c[1], lng: c[0] } : null; }
function geocode(addr) { // serialised: public geocoders ask for at most one request per second
  return (geoChain = geoChain.then(async () => {
    const k = addr.toLowerCase(), cache = geoMem(); if (cache[k] !== undefined) return cache[k];
    const wait = lastGeo + 1100 - Date.now(); if (wait > 0) await sleep(wait); lastGeo = Date.now();
    let pos = null, failed = false; try { pos = await viaNominatim(addr); } catch { failed = true; }
    if (!pos) { try { pos = await viaPhoton(addr); failed = false; } catch { /* keep earlier outcome */ } }
    if (!pos && failed) return false;       // network trouble: do not remember a miss
    cache[k] = pos || false; LS.set('necrm-geo', cache); return cache[k];
  }).catch(() => false));
}
function ensureMap() {
  if (cmap || typeof L === 'undefined') return;
  cmap = L.map(mapHost, { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([40.3, -74.8], 7);
  cLayer = L.layerGroup().addTo(cmap); setTileLayer(mapStyle); cLines = L.layerGroup().addTo(cmap);
  cmap.on('dragstart zoomstart', (e) => { if (!cmap._progFit) userMoved = true; });
}
const fitTo = (pts, max = 15) => { if (!pts.length) return; cmap._progFit = true; cmap.fitBounds(pts, { padding: [40, 40], maxZoom: max, animate: false }); setTimeout(() => { cmap._progFit = false; }, 50); };
function selectContact(c, open) {
  cSel = c.id; userMoved = false; document.querySelectorAll('#view .row[data-id]').forEach((r) => r.classList.toggle('sel', r.dataset.id === c.id));
  const row = document.querySelector(`#view .row[data-id="${c.id}"]`); if (row && wide()) row.scrollIntoView({ block: 'nearest' }); updateMap(curList, open);
}
function focusOnMap(c) { if (!wide()) { mapView = 'map'; const sp = document.querySelector('.split'); if (sp) sp.dataset.v = 'map'; setTimeout(() => cmap?.invalidateSize(), 50); } selectContact(c, true); }
async function updateMap(list, openPopup) {
  curList = list; ensureMap(); const run = ++mapRun;
  if (!cmap) { mapStatus.textContent = 'The map library did not load.'; return; }
  cLayer.clearLayers(); cLines.clearLayers(); const pins = new Map(), jobs = [];
  for (const c of mapList(list)) { const o = officeOf(c); if (mapOn.office && o) jobs.push({ c, addr: o, kind: 'office' }); else if (mapOn.office && mapF.approx) { const pt = approxPt(c); if (pt) jobs.push({ c, addr: 'approx:' + c.id, kind: 'approx', pt }); } if (mapOn.bldg) for (const a of c.addresses) jobs.push({ c, addr: a, kind: 'bldg' }); }
  if (mapOn.office && !mapF.tiers.size && !mapF.kinds.size && !mapF.market) for (const [k, name] of Object.entries(firmExtra())) { const a = firmOffices()[k]; if (a && !list.some((c) => firmKey(c.company) === k)) jobs.push({ c: { id: 'firm:' + k, name, company: name, title: '', tier: '', specialty: '', market: '', addresses: [], pocs: [], phone: '', office: a, firmOnly: true }, addr: a, kind: 'office' }); }
  jobs.sort((x, y) => (y.c.id === cSel) - (x.c.id === cSel) || (geoPeek(y.addr) !== undefined) - (geoPeek(x.addr) !== undefined));
  const todo = jobs.slice(0, 500), pending = todo.filter((j) => !j.pt && geoPeek(j.addr) === undefined).length; let done = 0, shown = 0, missing = 0; const pts = [];
  const lines = () => { cLines.clearLayers(); const p = pins.get(cSel); if (!p) return; const o = p.find((x) => x.kind === 'office'); if (o) p.filter((x) => x.kind === 'bldg').forEach((b) => L.polyline([o.pos, b.pos], { color: '#E07820', weight: 2, dashArray: '4 6', interactive: false }).addTo(cLines)); };
  const popup = (c) => el('div', { style: 'max-width:240px' }, el('strong', {}, c.name), el('div', {}, [c.title, c.company].filter(Boolean).join(' · ')), officeOf(c) ? el('div', { class: 'hint' }, 'Office: ' + officeOf(c)) : el('div', { class: 'hint' }, 'Approximate: ' + (c.market || 'market') + ' area'), c.addresses.length ? el('div', { class: 'hint' }, `${c.addresses.length} closed building${c.addresses.length > 1 ? 's' : ''}`) : null,
    c.firmOnly ? null : el('div', { class: 'acts', style: 'margin-top:6px' }, el('button', { class: 'btn sm', onclick: () => openContact(c) }, 'Open record'), c.phone && el('a', { class: 'btn sm', href: telHref(c.phone) }, 'Call')));
  const note = () => { mapStatus.textContent = [`${shown} pin${shown === 1 ? '' : 's'}`, pending && done < pending ? `locating ${done}/${pending}…` : '', missing ? `${missing} address${missing > 1 ? 'es' : ''} not found` : '', jobs.length > 500 ? 'first 500 shown' : ''].filter(Boolean).join(' · '); };
  for (const j of todo) {
    if (run !== mapRun) return; let pos = j.pt ? { lat: j.pt[0], lng: j.pt[1] } : geoPeek(j.addr);
    if (pos === undefined) { pos = await geocode(j.addr); done++; if (run !== mapRun) return; }
    if (!pos) { missing++; note(); continue; }
    const sel = j.c.id === cSel, off = j.kind === 'office', apx = j.kind === 'approx', tc = TIER_COLOR[tierCls(j.c.tier)], m = L.circleMarker([pos.lat, pos.lng], { radius: sel ? 11 : off || apx ? 8 : 7, fillColor: off || apx ? tc : '#FFAB1F', fillOpacity: apx ? 0.4 : 1, color: sel ? '#E07820' : apx ? tc : off ? '#fff' : '#344050', weight: sel ? 3 : 2, dashArray: apx ? '3 3' : null }).addTo(cLayer);
    m.bindPopup(popup(j.c)); m.bindTooltip((apx ? 'Approximate (market area) · ' : off ? 'Office · ' : 'Closed · ') + j.c.name + (off || apx ? '' : ' · ' + j.addr), { direction: 'top' }); m.on('click', () => selectContact(j.c));
    (pins.get(j.c.id) || pins.set(j.c.id, []).get(j.c.id)).push({ kind: j.kind, pos: [pos.lat, pos.lng], m }); shown++; pts.push([pos.lat, pos.lng]);
    if (sel) { lines(); fitTo(pins.get(cSel).map((x) => x.pos)); } else if (!cSel && !userMoved && (shown === 1 || shown % 8 === 0)) fitTo(pts, 11);
    note();
  }
  if (run !== mapRun) return; note(); lines();
  if (cSel && pins.get(cSel)) { fitTo(pins.get(cSel).map((x) => x.pos)); if (openPopup) (pins.get(cSel).find((x) => x.kind === 'office') || pins.get(cSel)[0]).m.openPopup(); }
  else if (cSel && !pins.get(cSel)) mapStatus.textContent = 'No office or building address on file for this contact yet. Add one in their record.';
  else if (!userMoved && pts.length) fitTo(pts, 11);
}
async function saveAddr(c, patch) { // writes to the Monday column when there is a text column, else keeps the address on this device
  const C = data.contacts, R = C.roles, writable = (col) => col && ['text', 'long_text'].includes(col.type), loc = LS.get('necrm-addr', {});
  if ('office' in patch) { c.office = patch.office; if (writable(R.office)) await enqueue({ type: 'column', boardId: C.id, itemId: c.id, columnId: R.office.id, value: R.office.type === 'long_text' ? { text: patch.office } : patch.office }); else { loc[c.id] = { ...(loc[c.id] || {}), office: patch.office }; if (!demo) LS.set('necrm-addr', loc); } }
  if ('props' in patch) { c.addresses = patch.props; if (writable(R.address)) await enqueue({ type: 'column', boardId: C.id, itemId: c.id, columnId: R.address.id, value: R.address.type === 'long_text' ? { text: patch.props.join('\n') } : patch.props.join('; ') }); else { loc[c.id] = { ...(loc[c.id] || {}), props: patch.props }; if (!demo) LS.set('necrm-addr', loc); } }
}
async function createAddressColumns() {
  const C = data.contacts; if (!confirm(`Add the columns "Office address" and "Closed buildings" to the Monday board "${C.name}"? Everyone with access to the board will see them.`)) return;
  try { for (const [role, title, type, key] of [['office', 'Office address', 'text', 'officeColumn'], ['address', 'Closed buildings', 'long_text', 'addressColumn']]) if (!C.roles[role]) {
    const d = await gql('mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:' + type + '){ id } }', { b: C.id, t: title }); cfg[key] = d.create_column?.id || cfg[key]; }
    LS.set('necrm-cfg', cfg); say('Columns added. Reloading from Monday…'); await load(true); } catch (e) { say(e.message, 'err'); }
}
// ---------------------------------------------------------------- Create New: initiatives and events (Monday subitems), from the app or from Outlook
function openCreateNew() {
  const row = (label, sub, fn) => el('div', { class: 'row', onclick: fn }, el('div', { class: 'who' }, el('strong', {}, label), el('small', {}, sub)));
  openSheet(el('h2', {}, 'Create new'), el('div', { class: 'card', style: 'margin-top:10px' },
    row('Event', 'Create an event with Faropoint team members and guests', () => openPlanEvent(null)), row('Contact', 'Add a broker or other contact', () => go('capture')),
    row('Follow-up', 'Schedule a follow-up with a contact', () => { const inp = el('input', { placeholder: 'Contact name or phone', style: 'width:100%' }), res = el('div', {});
      inp.addEventListener('input', () => res.replaceChildren(inp.value.trim().length < 2 ? null : data.contacts.list.filter((c) => isPerson(c) && nameOrPhone(inp.value, [c.name, c.company], [c.phone, c.phone2])).slice(0, 8).map((c) => el('div', { class: 'row', onclick: () => openFollowUp(c) }, el('div', { class: 'who' }, el('strong', {}, c.name), el('small', {}, [c.title, c.company].filter(Boolean).join(' · '))))))); openSheet(el('h2', {}, 'Schedule a follow-up'), el('div', { class: 'f' }, inp), res, el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: closeSheet }, 'Cancel'))); inp.focus(); })));
}
const quickAddLink = (f) => { const base = location.href.split('?')[0].split('#')[0]; return base + '?' + new URLSearchParams({ new: 'initiative', ...(f.name && { title: f.name }), ...(f.start && { date: f.start }), ...(f.end && { end: f.end }), ...(f.location && { loc: f.location }), ...(f.firm && { firm: f.firm }), ...(f.notes && { notes: f.notes }) }); };
function handleDeepLink(q) { if (q.get('new')) openCreateInitiative({ name: q.get('title') || '', start: q.get('date') || '', end: q.get('end') || '', location: q.get('loc') || '', firm: q.get('firm') || '', notes: q.get('notes') || '' }); }
// ---------------------------------------------------------------- events attended (Business Development subitems)
let attYear = new Date().getFullYear();
function planAttended() {
  const C = data.contacts, bd = C.bd, R = bd.roles;
  const bar = el('div', { class: 'bar', style: 'justify-content:space-between' }, el('div', { class: 'bar', style: 'margin:0' }, el('button', { class: 'btn sm', 'aria-label': 'Previous year', onclick: () => { attYear--; renderPlan(); } }, '‹'), el('b', { style: 'font-size:18px' }, attYear), el('button', { class: 'btn sm', 'aria-label': 'Next year', onclick: () => { attYear++; renderPlan(); } }, '›')), el('div', { class: 'bar', style: 'margin:0' }, mondayImportButton(attYear), el('button', { class: 'btn pri', onclick: () => openCreateInitiative() }, '+ Create event')));
  if (!bd.group) return el('div', {}, bar, el('div', { class: 'panel' }, el('h2', {}, 'Business Development group not found'), el('p', {}, 'Choose the group that holds your initiatives in Settings.'), el('button', { class: 'btn pri', onclick: () => go('settings') }, 'Open Settings')));
  const evs = attendedEvents().filter((e) => e.start.startsWith(String(attYear))), done = evs.filter((e) => ATTENDED.test(e.status)).sort((a, b) => a.start.localeCompare(b.start)), up = evs.filter((e) => !ATTENDED.test(e.status) && !DECLINED.test(e.status) && e.start >= today()).sort((a, b) => a.start.localeCompare(b.start));
  const count = (list, k) => { const m = new Map(); list.forEach((e) => m.set(e[k] || 'Not set', (m.get(e[k] || 'Not set') || 0) + 1)); return m; };
  const tile = (n, l) => el('div', { class: 's' }, el('b', {}, n), el('span', {}, l)), firms = new Set(done.map((e) => e.firm).filter(Boolean));
  const row = (e) => el('div', { class: 'row', onclick: () => (e.planId ? openPlanEvent(e.planId) : openBdEvent(e)) }, el('div', { class: 'who' }, el('strong', {}, e.name), el('small', {}, [fmtDate(e.start), e.location, e.firm].filter(Boolean).join(' · ')), el('div', {}, e.type && el('span', { class: 'chip' }, e.type), e.region && el('span', { class: 'chip' }, e.region), !ATTENDED.test(e.status) && e.status && el('span', { class: 'chip' }, e.status))), e.owners.length ? el('small', { style: 'flex:none;max-width:90px;text-align:right;color:var(--mut)' }, e.owners.length + ' people') : null);
  let lastM = ''; const grouped = (list) => list.map((e) => { const m = e.start.slice(0, 7), h = m !== lastM ? el('div', { class: 'sec-h', style: 'margin:12px 14px 2px' }, el('h2', { style: 'font-size:16px' }, parseIso(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))) : null; lastM = m; return [h, row(e)]; });
  const out = el('div', {}, bar, el('div', { class: 'sum' }, tile(done.length, 'Events attended'), tile(up.length, 'Upcoming'), tile(count(done, 'type').size, 'Event types'), tile(firms.size, 'Firms')));
  if (!evs.length) { out.append(el('p', { class: 'hint' }, `No events with a date in ${attYear} under the Business Development initiatives.${bd.events.length ? '' : ' No event subitems were found; check the initiative exclusion in Settings.'}`)); return out; }
  if (done.length) { out.append(el('div', { class: 'card chart' }, el('h2', {}, `Attended in ${attYear}, by type`), el('div', { class: 'sub' }, `Events with status Done under ${bd.parents.filter((p) => !p.excluded).map((p) => p.name).join(', ')}.`), donut(topN(count(done, 'type'), 8), { unit: 'attended' })),
    el('div', { class: 'card chart' }, el('h2', {}, `Attended in ${attYear}, by region`), donut(topN(count(done, 'region'), 8), { unit: 'attended' })), el('div', { class: 'sec-h' }, el('h2', {}, `Attended in ${attYear}`), el('span', { class: 'hint' }, done.length)), el('div', { class: 'card' }, grouped(done))); }
  if (up.length) { lastM = ''; out.append(el('div', { class: 'sec-h' }, el('h2', {}, 'Upcoming and planned'), el('span', { class: 'hint' }, up.length)), el('div', { class: 'card' }, grouped(up))); }
  return out;
}
function openBdEvent(e) {
  const bd = data.contacts.bd, R = bd.roles, labels = (R.status?.labels || []).map((l) => l.label).filter(Boolean), f = (l, v) => v ? el('div', { class: 'f' }, el('label', {}, l), el('div', {}, v)) : null;
  const sel = labels.length && bd.subBoardId && !String(e.id).startsWith('tmp-') ? el('select', { onchange: async (ev) => { e.status = ev.target.value; say(await enqueue({ type: 'column', boardId: bd.subBoardId, itemId: e.id, columnId: R.status.id, value: { label: ev.target.value } })); } }, labels.map((x) => el('option', { value: x }, x))) : null; if (sel) sel.value = e.status;
  const mates = data.contacts.list.filter((c) => isPerson(c) && c.company && e.firm && (norm(c.company).includes(norm(e.firm)) || norm(e.firm).includes(norm(c.company)))).slice(0, 6);
  openSheet(el('h2', {}, e.name), el('p', { class: 'hint' }, e.parent), f('When', [fmtDate(e.start, true), e.end && e.end !== e.start ? ' to ' + fmtDate(e.end, true) : ''].join('')), f('Status', sel || e.status), f('Location', e.location), f('Firm', e.firm), f('Type', e.type), f('Region', e.region), f('Faropoint attendees', e.owners.join(', ')), f('Notes', e.notes),
    mates.length ? el('div', {}, el('h3', {}, 'Contacts at this firm'), mates.map((c) => el('div', { class: 'note', style: 'cursor:pointer', onclick: () => openContact(c) }, c.name, el('small', {}, [c.title, c.company].filter(Boolean).join(' · '))))) : null,
    el('div', { class: 'bar', style: 'margin-top:12px' }, e.url && el('a', { class: 'btn', href: e.url, target: '_blank', rel: 'noopener' }, 'Open in Monday'), el('button', { class: 'btn', onclick: () => { closeSheet(); openCreateInitiative({ firm: e.firm, location: e.location, type: e.type, region: e.region, parentId: e.parentId, name: '' }); } }, 'Create similar'), el('button', { class: 'btn', onclick: closeSheet }, 'Close')));
}
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------------------------------------------------------- BD plan & budget
const PLAN_CATS = ['Sports', 'Concerts', 'Comedy', 'Dining', 'Conferences & travel', 'Gifts & other'];
const PLAN_STATUS = ['Idea', 'Planned', 'Requested', 'Booked', 'Attended', 'Cancelled'];
const ETYPES = ['Big Event', 'Small Outing', 'One-on-One', 'Luncheon', 'Closing Dinner', 'Conference / Industry', 'Travel', 'Gifts & Other'];
const BTIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Mixed', 'Competitor / Principal'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_DEFAULT = { 'Big Event': 1, 'Small Outing': 12, 'One-on-One': 24, 'Luncheon': 6 };   // minimum commitments from the BD Guide / workbook
const QA_DEFAULT = [['Overview', 'Describe your planned approach / strategy for Business Development for the coming year.'], ['Who', 'How are you prioritizing brokers, and how is coverage split across the team?'], ['Plan', 'How does your approach differ across the markets you cover?'],
  ['Plan', "What are the key events and relationships you're focused on (including principals and competitors)?"], ['Execute', 'How will you make sure the plan actually happens?'], ['Monitor', 'How will you track progress and keep the team aligned?'], ['Budget', 'Anything to call out on the budget, including any variance vs. target?']];
const planDefault = () => ({ year: 2027, total: 0, cats: {}, notes: { strategy: '', q1: '', q2: '', q3: '', q4: '' }, events: [], budget: { meta: {}, lines: [], minimums: { ...MIN_DEFAULT }, markets: [], qa: QA_DEFAULT.map(([pillar, question]) => ({ pillar, question, answer: '' })), actuals: [] } });
function normPlan(p) { const d = planDefault(), b = { ...d.budget, ...(p.budget || {}) }; b.minimums = { ...d.budget.minimums, ...(b.minimums || {}) }; if (!b.qa?.length) b.qa = d.budget.qa; return { ...d, ...p, notes: { ...d.notes, ...(p.notes || {}) }, budget: b }; }
let plan = normPlan(LS.get('necrm-plan', {})), planView = 'overview', budView = 'summary', evData = LS.get('necrm-events', { at: 0, events: [], errors: [] }), evF = { cat: '', q: '', month: '' };
const savePlan = () => { if (!demo) LS.set('necrm-plan', plan); };
const evCost = (e) => (e.status === 'Cancelled' ? 0 : Number(e.actual) > 0 ? Number(e.actual) : (Number(e.qty) || 0) * (Number(e.unit) || 0));
function planStats() {
  const ev = plan.events.filter((e) => (e.date || '').startsWith(String(plan.year)) && e.status !== 'Cancelled'), cost = (st) => ev.filter((e) => st.includes(e.status)).reduce((a, e) => a + evCost(e), 0);
  const pipeline = cost(['Idea', 'Planned']), committed = cost(['Requested', 'Booked']), spent = cost(['Attended']), planned = pipeline + committed + spent, byCat = {}, byQ = [0, 0, 0, 0];
  for (const e of ev) { byCat[e.category] = (byCat[e.category] || 0) + evCost(e); byQ[Math.floor((Number(e.date.slice(5, 7)) - 1) / 3)] += evCost(e); }
  return { ev, pipeline, committed, spent, planned, remaining: (Number(plan.total) || 0) - planned, byCat, byQ };
}
function coverage() {
  const tops = data.contacts.list.filter((c) => isPerson(c) && isTop(c)), ids = new Set(plan.events.filter((e) => e.status !== 'Cancelled' && (e.date || '').startsWith(String(plan.year))).flatMap((e) => e.guests || []));
  return { tops, covered: tops.filter((c) => ids.has(c.id)), missing: tops.filter((c) => !ids.has(c.id)) };
}
function renderPlan() {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const seg = el('div', { class: 'seg wrap' }, [['overview', 'Overview'], ['events', 'Planned'], ['attended', 'Attended'], ['find', 'Events'], ['budget', 'Budget'], ['insights', 'Insights'], ['strategy', 'Strategy']].map(([k, l]) => el('button', { class: planView === k ? 'on' : '', onclick: () => { planView = k; renderPlan(); } }, l)));
  const head = el('div', {}, el('div', { class: 'bar', style: 'justify-content:space-between' }, el('h2', { style: 'font-size:22px' }, `${plan.year} business development`), el('div', { class: 'bar', style: 'margin:0' }, el('button', { class: 'btn pri', onclick: () => openPlanEvent(null) }, '+ Create'), workbookButton())), el('div', { class: 'bar' }, seg));
  const note = !demo && el('p', { class: 'hint', style: 'margin:0 2px 12px' }, 'The plan and budget are saved on this device. Use Export on the Strategy tab to back it up or share it.');
  $('#view').replaceChildren(head, note, { overview: planOverview, events: planEvents, attended: planAttended, find: planFind, budget: planBudgetTab, insights: planInsights, strategy: planStrategy }[planView]());
}
// ---------------------------------------------------------------- Budget & Cadence (mirrors the Faropoint BD Plan Workbook; a completed workbook can be imported)
const lcost = (l) => (Number(l.occ) || 0) * (Number(l.cost) || 0), ltouch = (l) => (Number(l.occ) || 0) * (Number(l.brokers) || 0), lqtr = (l) => (l.month ? Math.ceil((MONTHS.indexOf(l.month) + 1) / 3) || 0 : 0);
const COMMITTED = ['Requested', 'Booked', 'Attended'];
const defaultEType = (cat) => ({ 'Conferences & travel': 'Conference / Industry', 'Gifts & other': 'Gifts & Other', Dining: 'Closing Dinner' }[cat] || 'Small Outing');
function bstats() { // totals: budget lines (the plan) vs the cost of events (linked to the lines), against the target annual budget
  const B = plan.budget, yr = String(plan.year), evs = plan.events.filter((e) => (e.date || '').startsWith(yr) && e.status !== 'Cancelled'), com = evs.filter((e) => COMMITTED.includes(e.status));
  const planned = B.lines.reduce((a, l) => a + lcost(l), 0), spend = com.reduce((a, e) => a + evCost(e), 0), target = Number(plan.total) || 0;
  return { B, evs, com, planned, spend, target, touches: B.lines.reduce((a, l) => a + ltouch(l), 0), occ: B.lines.reduce((a, l) => a + (Number(l.occ) || 0), 0), variance: planned - target, unallocated: target - planned, left: target - spend,
    actualOn: (id) => com.filter((e) => e.lineId === id).reduce((a, e) => a + evCost(e), 0), unlinked: com.filter((e) => !B.lines.some((l) => l.id === e.lineId)).reduce((a, e) => a + evCost(e), 0) };
}
function typeRows() { const B = plan.budget, st = bstats(); return ETYPES.map((t) => { const ls = B.lines.filter((l) => l.etype === t), ev = st.com.filter((e) => (e.etype || defaultEType(e.category)) === t);
  return { t, min: B.minimums[t], occ: ls.reduce((a, l) => a + (Number(l.occ) || 0), 0), spend: ls.reduce((a, l) => a + lcost(l), 0), touches: ls.reduce((a, l) => a + ltouch(l), 0), evN: ev.length, evSpend: ev.reduce((a, e) => a + evCost(e), 0) }; }); }
const qOf = (iso2) => Math.ceil(Number(iso2.slice(5, 7)) / 3) || 0;
function actualRows() { return [...plan.budget.actuals.map((a) => ({ date: a.date, etype: a.etype })), ...plan.events.filter((e) => e.status === 'Attended').map((e) => ({ date: e.date, etype: e.etype || defaultEType(e.category) }))].filter((a) => (a.date || '').startsWith(String(plan.year))); }
function planBudgetTab() {
  const B = plan.budget, seg = el('div', { class: 'seg' }, [['summary', 'Summary'], ['lines', 'Lines'], ['check', 'Plan check'], ['calendar', 'Calendar'], ['actuals', 'Actuals']].map(([k, l]) => el('button', { class: budView === k ? 'on' : '', onclick: () => { budView = k; renderPlan(); } }, l)));
  const wb = el('input', { type: 'file', accept: '.xlsx', hidden: true, id: 'wbFile', onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { previewWorkbook(await parseWorkbook(f), f.name); } catch (er) { say('Could not read that workbook: ' + er.message, 'err'); } } });
  const head = el('div', { class: 'bar', style: 'justify-content:space-between' }, seg, el('div', { class: 'bar', style: 'margin:0' }, el('button', { class: 'btn sm', title: 'Reads the BD Plan Workbook after you complete it', onclick: () => wb.click() }, 'Import workbook (.xlsx)'), wb));
  const view = { summary: budSummary, lines: budLines, check: budCheck, calendar: budCalendar, actuals: budActuals }[budView]();
  return el('div', {}, head, view);
}
function budSummary() {
  const st = bstats(), B = st.B, tile = (n, l, bad) => el('div', { class: 's' + (bad ? ' bad' : '') }, el('b', {}, n), el('span', {}, l));
  const target = el('input', { type: 'number', inputMode: 'numeric', value: plan.total || '', placeholder: 'e.g. 200000', style: 'max-width:200px', onchange: (e) => { plan.total = Number(e.target.value) || 0; savePlan(); renderPlan(); } });
  const pct = (n) => (st.target ? Math.min(100, Math.round(n / st.target * 100)) : 0), rows = typeRows().filter((r) => r.spend || r.evSpend || r.evN);
  const meta = (k, label, type = 'text') => el('div', { class: 'f' }, el('label', {}, label), el('input', { type, value: B.meta[k] || '', style: 'width:100%', onchange: (e) => { B.meta[k] = e.target.value; savePlan(); } }));
  return el('div', {}, el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Target annual budget'), el('div', { class: 'bar', style: 'margin:0' }, target, el('span', { class: 'hint' }, 'Baseline is about $200,000 per region (BD Guide). Edit it if your plan needs more or less.'))),
    el('div', { class: 'sum' }, tile(money(st.target), 'Target budget'), tile(money(st.planned), 'Planned (budget lines)'), tile(money(st.unallocated), st.unallocated < 0 ? 'Over target' : 'Unallocated', st.unallocated < 0), tile(money(st.spend), 'Event costs (committed + spent)'), tile(money(st.left), 'Left to spend', st.left < 0)),
    el('div', { class: 'card chart' }, el('h2', {}, 'Event cost against the total budget'), el('div', { class: 'sub' }, `Every event's cost (tickets x price, or the actual) counts toward the target. Link an event to a budget line to see it against that line.`),
      el('div', { class: 'bar', style: 'justify-content:space-between;margin:0 0 4px' }, el('b', {}, `${pct(st.spend)}% of target in event costs`), el('span', { class: 'hint' }, `${money(st.spend)} of ${money(st.target)}`)), el('div', { class: 'bar2' + (st.spend > st.target && st.target ? ' over' : '') }, el('i', { style: `width:${pct(st.spend)}%` })),
      el('div', { class: 'bar', style: 'justify-content:space-between;margin:10px 0 4px' }, el('b', {}, `${pct(st.planned)}% of target planned in budget lines`), el('span', { class: 'hint' }, st.variance ? `${st.variance > 0 ? money(st.variance) + ' over' : money(-st.variance) + ' under'} target` : '')), el('div', { class: 'bar2' + (st.planned > st.target && st.target ? ' over' : '') }, el('i', { style: `width:${pct(st.planned)}%;background:#2EA8C4` })),
      st.unlinked > 0 && el('p', { class: 'hint', style: 'margin:10px 0 0' }, `${money(st.unlinked)} of event costs are not linked to a budget line yet. Open an event and choose its budget line.`)),
    rows.length ? el('div', { class: 'card chart' }, el('h2', {}, 'Cost by event type'), el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Type'), el('th', { class: 'n' }, 'Budget lines'), el('th', { class: 'n' }, 'Events'), el('th', { class: 'n' }, 'Left in lines')),
      rows.map((r) => el('tr', {}, el('td', {}, r.t), el('td', { class: 'n' }, money(r.spend)), el('td', { class: 'n' }, money(r.evSpend)), el('td', { class: 'n', style: r.spend - r.evSpend < 0 ? 'color:var(--alert)' : '' }, money(r.spend - r.evSpend)))),
      el('tr', {}, el('td', {}, el('b', {}, 'Total')), el('td', { class: 'n' }, el('b', {}, money(rows.reduce((a, r) => a + r.spend, 0)))), el('td', { class: 'n' }, el('b', {}, money(rows.reduce((a, r) => a + r.evSpend, 0)))), el('td', { class: 'n' }, '')))) : null,
    el('details', { class: 'card chart', style: 'cursor:pointer' }, el('summary', { style: 'font:500 18px "Clash Display",Arial' }, 'Plan details'), el('div', { style: 'margin-top:10px;cursor:default' }, meta('region', 'Region'), meta('markets', 'Markets covered'), meta('preparedBy', 'Prepared by'), meta('approvedBy', 'Approved by (market officer)'), meta('submitted', 'Date submitted', 'date'), meta('deadline', 'Submission deadline', 'date'))));
}
function budLines() {
  const st = bstats(), B = st.B;
  return el('div', {}, el('div', { class: 'bar', style: 'justify-content:space-between' }, el('button', { class: 'btn pri', onclick: () => openBudgetLine(null) }, '+ Add line'), el('span', { class: 'hint' }, `${B.lines.length} line${B.lines.length === 1 ? '' : 's'} · ${st.occ} occurrences · ${st.touches} broker touches · ${money(st.planned)}`)),
    B.lines.length ? el('div', { class: 'card' }, B.lines.map((l) => { const act = st.actualOn(l.id); return el('div', { class: 'row', onclick: () => openBudgetLine(l.id) }, el('div', { class: 'who' }, el('strong', {}, l.name || '(untitled)'),
      el('small', {}, [l.etype || 'No event type', l.market, l.tier].filter(Boolean).join(' · ')), el('small', {}, `${l.occ || 0} × ${money(l.cost)}${l.cadence ? ' · ' + l.cadence : ''}${l.month ? ' · ' + l.month + (l.locked === 'Y' ? ' (locked)' : '') : ''}`),
      act ? el('div', {}, el('span', { class: 'chip' }, 'Events so far ' + money(act))) : null), el('b', { style: 'color:var(--blue);font-weight:500' }, money(lcost(l)))); }),
      el('div', { class: 'row', style: 'cursor:default;background:var(--bg)' }, el('div', { class: 'who' }, el('strong', {}, 'Total')), el('b', { style: 'color:var(--blue)' }, money(st.planned)))) : el('div', { class: 'panel', style: 'max-width:none' }, el('b', {}, 'No budget lines yet. '), 'Add each activity or event series (for example "Sporting event / suite", 4 times a year at $800), or complete the BD Plan Workbook and use Import workbook above.'));
}
function openBudgetLine(id) {
  const B = plan.budget, isNew = !id || !B.lines.find((l) => l.id === id), l = isNew ? { id: uid(), name: '', etype: '', market: '', tier: '', cadence: '', occ: 1, brokers: '', cost: '', month: '', locked: '', notes: '' } : { ...B.lines.find((x) => x.id === id) };
  const inp = (k, type = 'text', ph = '', list) => el('input', { type, value: l[k] ?? '', placeholder: ph, list, style: 'width:100%', oninput: (e) => { l[k] = e.target.value; calc(); } });
  const sel = (k, opts, blank = '—') => { const s = el('select', { style: 'width:100%', onchange: (e) => { l[k] = e.target.value; calc(); } }, el('option', { value: '' }, blank), opts.map((o) => el('option', { value: o }, o))); s.value = l[k] || ''; return s; };
  const f = (label, node) => el('div', { class: 'f' }, el('label', {}, label), node), row2 = (...n) => el('div', { style: 'display:flex;gap:10px' }, n.map((x) => el('div', { style: 'flex:1' }, x)));
  const out = el('p', { style: 'margin:0 0 10px' }), calc = () => { out.replaceChildren('Estimated annual cost ', el('b', {}, money(lcost(l))), ` · ${ltouch(l)} broker touches${lqtr(l) ? ' · Q' + lqtr(l) : ''}`); };
  const mkts = [...new Set([...B.markets, 'Regional', ...data.contacts.list.map((c) => c.market)].filter(Boolean))];
  calc();
  openSheet(el('h2', {}, isNew ? 'Add budget line' : 'Budget line'), f('Activity / event', inp('name', 'text', 'e.g. Sporting event / suite')), row2(f('Event type', sel('etype', ETYPES)), f('Target tier', sel('tier', BTIERS))), row2(f('Market', inp('market', 'text', 'Market or Regional', 'bl-mk')), f('Cadence', inp('cadence', 'text', 'e.g. Quarterly', 'bl-cad'))),
    row2(f('Occurrences / year', inp('occ', 'number')), f('Brokers per occurrence', inp('brokers', 'number'))), row2(f('Cost per occurrence ($)', inp('cost', 'number')), f('Month (if one-time)', sel('month', MONTHS, 'Recurring'))), f('Date locked?', sel('locked', ['Y', 'N'], '—')), out, f('Notes (co-host, principals invited, etc.)', el('textarea', { rows: 2, value: l.notes || '', oninput: (e) => { l.notes = e.target.value; } })),
    el('datalist', { id: 'bl-mk' }, mkts.map((m) => el('option', { value: m }))), el('datalist', { id: 'bl-cad' }, ['Weekly', '2x / month', 'Monthly', 'Every other month', 'Quarterly', 'Annual', 'One-time'].map((m) => el('option', { value: m }))),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => { if (!String(l.name).trim()) return say('Enter an activity name', 'err'); l.name = l.name.trim(); const i = B.lines.findIndex((x) => x.id === l.id); if (i >= 0) B.lines[i] = l; else B.lines.push(l); savePlan(); closeSheet(); renderPlan(); } }, 'Save'),
      !isNew && el('button', { class: 'btn', onclick: () => { if (confirm('Delete this budget line? Events linked to it stay, unlinked.')) { B.lines = B.lines.filter((x) => x.id !== l.id); savePlan(); closeSheet(); renderPlan(); } } }, 'Delete'), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}
function budCheck() {
  const st = bstats(), B = st.B, rows = typeRows(), tgt = st.target, untagged = B.lines.filter((l) => !l.etype).reduce((a, l) => a + lcost(l), 0), pc = (n) => (tgt ? Math.round(n / tgt * 100) + '%' : '—');
  const minIn = (t, v) => el('input', { type: 'number', value: v ?? '', style: 'width:64px;margin:0;padding:6px', onchange: (e) => { if (e.target.value === '') delete B.minimums[t]; else B.minimums[t] = Number(e.target.value); savePlan(); renderPlan(); } });
  const mk = (n) => B.lines.filter((l) => (l.market || '').toLowerCase() === n.toLowerCase()), sum = (ls, f) => ls.reduce((a, l) => a + f(l), 0), known = new Set([...B.markets, 'Regional'].map((m) => m.toLowerCase())), other = B.lines.filter((l) => !known.has((l.market || '').toLowerCase()));
  const mIn = el('input', { placeholder: 'Add a market you cover', style: 'flex:1' }), addM = () => { const v = mIn.value.trim(); if (v && !B.markets.includes(v)) { B.markets.push(v); savePlan(); renderPlan(); } };
  mIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addM(); } });
  return el('div', {}, el('div', { class: 'card chart' }, el('h2', {}, 'Plan check'), el('div', { class: 'sub' }, 'Minimum commitments from the BD Guide. Edit a minimum if your market officer agrees.'),
    el('div', { style: 'overflow-x:auto' }, el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Event type'), el('th', { class: 'n' }, 'Min / yr'), el('th', { class: 'n' }, 'Planned'), el('th', {}, 'Status'), el('th', { class: 'n' }, 'Spend'), el('th', { class: 'n' }, '% target'), el('th', { class: 'n' }, 'Touches'), el('th', { class: 'n' }, 'Events')),
      rows.map((r) => el('tr', {}, el('td', {}, r.t), el('td', { class: 'n' }, minIn(r.t, r.min)), el('td', { class: 'n' }, r.occ), el('td', { style: r.min == null ? '' : r.occ >= r.min ? 'color:var(--go)' : 'color:var(--alert)' }, r.min == null ? '—' : r.occ >= r.min ? 'Meets minimum' : 'Below minimum'), el('td', { class: 'n' }, money(r.spend)), el('td', { class: 'n' }, pc(r.spend)), el('td', { class: 'n' }, r.touches), el('td', { class: 'n' }, r.evN))),
      el('tr', {}, el('td', {}, 'Untagged'), el('td', {}), el('td', {}), el('td', { style: untagged ? 'color:var(--alert)' : '' }, untagged ? 'Tag every line with an event type' : 'OK'), el('td', { class: 'n' }, money(untagged)), el('td', {}), el('td', {}), el('td', {})))),
    el('p', { class: 'hint', style: 'margin:8px 0 0' }, '"Events" counts logged events that are booked, requested or attended in the plan year.')),
    el('div', { class: 'card chart' }, el('h2', {}, 'Spend by market'), el('div', { class: 'sub' }, 'Tag each budget line with the market it covers; "Regional" is for things that cover the whole territory.'),
      el('div', { class: 'sec', style: 'margin-bottom:8px' }, B.markets.map((m, i) => el('span', { class: 'tag' }, m, el('button', { type: 'button', onclick: () => { B.markets.splice(i, 1); savePlan(); renderPlan(); } }, '×')))), el('div', { style: 'display:flex;gap:8px;margin-bottom:10px' }, mIn, el('button', { class: 'btn', onclick: addM }, 'Add')),
      el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Market'), el('th', { class: 'n' }, 'Planned spend'), el('th', { class: 'n' }, '% target'), el('th', { class: 'n' }, 'Touches')),
        [...B.markets, 'Regional'].map((m) => el('tr', {}, el('td', {}, m), el('td', { class: 'n' }, money(sum(mk(m), lcost))), el('td', { class: 'n' }, pc(sum(mk(m), lcost))), el('td', { class: 'n' }, sum(mk(m), ltouch)))),
        other.length ? el('tr', {}, el('td', {}, 'Other / not tagged'), el('td', { class: 'n' }, money(sum(other, lcost))), el('td', { class: 'n' }, pc(sum(other, lcost))), el('td', { class: 'n' }, sum(other, ltouch))) : null)));
}
let calMode = 'spend';
function budCalendar() {
  const st = bstats(), B = st.B, val = (l, m) => { const v = calMode === 'spend' ? lcost(l) : Number(l.occ) || 0; return l.month ? (MONTHS.indexOf(l.month) === m ? v : 0) : v / 12; };
  const tot = MONTHS.map((_, m) => B.lines.reduce((a, l) => a + val(l, m), 0)), evM = MONTHS.map((_, m) => st.com.filter((e) => Number(e.date.slice(5, 7)) - 1 === m).reduce((a, e) => a + (calMode === 'spend' ? evCost(e) : 1), 0)), fmt = (v) => (calMode === 'spend' ? (v ? money(v) : '') : v ? (Math.round(v * 10) / 10) + '' : '');
  const mx = Math.max(1, ...tot, ...evM), seg = el('div', { class: 'seg' }, [['spend', 'Spend ($)'], ['events', 'Events (count)']].map(([k, l]) => el('button', { class: calMode === k ? 'on' : '', onclick: () => { calMode = k; renderPlan(); } }, l)));
  return el('div', {}, el('div', { class: 'bar', style: 'justify-content:space-between' }, seg, el('span', { class: 'hint' }, 'One-time items land in their month; recurring items spread evenly. Dark: budget lines. Orange: logged events.')),
    el('div', { class: 'card chart' }, el('div', { style: 'display:flex;gap:6px;align-items:flex-end;height:130px' }, MONTHS.map((m, i) => el('div', { style: 'flex:1;text-align:center;min-width:0' }, el('div', { style: 'display:flex;gap:2px;align-items:flex-end;height:96px;justify-content:center' }, el('div', { style: `width:42%;height:${Math.max(2, tot[i] / mx * 92)}px;background:#344050;border-radius:4px 4px 0 0` }), el('div', { style: `width:42%;height:${Math.max(2, evM[i] / mx * 92)}px;background:#FFAB1F;border-radius:4px 4px 0 0` })), el('div', { class: 'hint' }, m))))),
    B.lines.length ? el('div', { class: 'card chart', style: 'overflow-x:auto' }, el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Activity'), el('th', {}, 'Type'), MONTHS.map((m) => el('th', { class: 'n' }, m)), el('th', { class: 'n' }, 'Total')),
      B.lines.map((l) => el('tr', {}, el('td', {}, l.name), el('td', {}, l.etype), MONTHS.map((_, m) => el('td', { class: 'n' }, fmt(val(l, m)))), el('td', { class: 'n' }, fmt(MONTHS.reduce((a, _, m) => a + val(l, m), 0))))),
      el('tr', {}, el('td', {}, el('b', {}, 'Planned')), el('td', {}), tot.map((v) => el('td', { class: 'n' }, el('b', {}, fmt(v)))), el('td', { class: 'n' }, el('b', {}, fmt(tot.reduce((a, b) => a + b, 0))))),
      el('tr', {}, el('td', {}, el('b', {}, 'Logged events')), el('td', {}), evM.map((v) => el('td', { class: 'n' }, fmt(v))), el('td', { class: 'n' }, fmt(evM.reduce((a, b) => a + b, 0)))))) : el('p', { class: 'hint' }, 'Add budget lines to see the calendar.'));
}
function budActuals() {
  const B = plan.budget, rows = actualRows(), types = ETYPES, planQ = (t, q) => B.lines.filter((l) => l.etype === t).reduce((a, l) => a + (l.month ? (lqtr(l) === q ? Number(l.occ) || 0 : 0) : (Number(l.occ) || 0) / 4), 0), actQ = (t, q) => rows.filter((r) => r.etype === t && qOf(r.date) === q).length;
  const log = B.actuals.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), pr = (n) => (Math.round(n * 10) / 10);
  return el('div', {}, el('div', { class: 'card chart', style: 'overflow-x:auto' }, el('h2', {}, 'Event scorecard: are we doing what we said?'), el('div', { class: 'sub' }, 'Planned events from the budget lines against events logged here and attended events in the plan.'),
    el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Event type'), [1, 2, 3, 4].map((q) => [el('th', { class: 'n' }, `Q${q} plan`), el('th', { class: 'n' }, `Q${q} actual`)]), el('th', { class: 'n' }, 'Year done')),
      types.map((t) => { const p = [1, 2, 3, 4].reduce((a, q) => a + planQ(t, q), 0), a = [1, 2, 3, 4].reduce((x, q) => x + actQ(t, q), 0); return el('tr', {}, el('td', {}, t), [1, 2, 3, 4].map((q) => [el('td', { class: 'n' }, pr(planQ(t, q)) || ''), el('td', { class: 'n' }, actQ(t, q) || '')]), el('td', { class: 'n' }, p ? Math.round(a / p * 100) + '%' : ''));  }))),
    el('div', { class: 'sec-h' }, el('h2', {}, 'Activity log'), el('button', { class: 'btn sm pri', onclick: () => openActual(null) }, '+ Log activity')),
    log.length ? el('div', { class: 'card' }, log.map((a) => el('div', { class: 'row', onclick: () => openActual(a.id) }, el('div', { class: 'who' }, el('strong', {}, a.activity || '(untitled)'), el('small', {}, [fmtDate(a.date), a.etype, a.market].filter(Boolean).join(' · ')), a.who ? el('small', {}, a.who) : null), a.count ? el('small', {}, a.count + ' brokers') : null))) : el('p', { class: 'hint' }, 'Nothing logged yet. Log each BD activity here, or import the Actuals Tracker from the workbook.'));
}
function openActual(id) {
  const B = plan.budget, isNew = !id || !B.actuals.find((a) => a.id === id), a = isNew ? { id: uid(), date: today(), market: '', etype: '', activity: '', who: '', count: '', notes: '' } : { ...B.actuals.find((x) => x.id === id) };
  const inp = (k, type = 'text', ph = '') => el('input', { type, value: a[k] ?? '', placeholder: ph, style: 'width:100%', oninput: (e) => { a[k] = e.target.value; } }), f = (label, node) => el('div', { class: 'f' }, el('label', {}, label), node);
  const sel = el('select', { style: 'width:100%', onchange: (e) => { a.etype = e.target.value; } }, el('option', { value: '' }, '—'), ETYPES.map((t) => el('option', { value: t }, t))); sel.value = a.etype || '';
  openSheet(el('h2', {}, isNew ? 'Log activity' : 'Activity'), f('Date', inp('date', 'date')), f('Event type', sel), f('Activity / event', inp('activity', 'text', 'e.g. Knicks game with CBRE')), f('Market', inp('market')), f('Brokers / who', inp('who', 'text', 'Names and firms')), f('Broker count', inp('count', 'number')), f('Follow-up / notes', el('textarea', { rows: 2, value: a.notes || '', oninput: (e) => { a.notes = e.target.value; } })),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => { if (!a.date) return say('Pick a date', 'err'); const i = B.actuals.findIndex((x) => x.id === a.id); if (i >= 0) B.actuals[i] = a; else B.actuals.push(a); savePlan(); closeSheet(); renderPlan(); } }, 'Save'),
      !isNew && el('button', { class: 'btn', onclick: () => { B.actuals = B.actuals.filter((x) => x.id !== a.id); savePlan(); closeSheet(); renderPlan(); } }, 'Delete'), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}

// ---- reading the completed BD Plan Workbook (.xlsx) in the browser: a small zip reader + the sheets' XML. Only the yellow input cells are used; formulas are recomputed here.
async function unzip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('not an .xlsx file'); const n = dv.getUint16(e + 10, true), out = new Map(); let p = dv.getUint32(e + 16, true);
  for (let k = 0; k < n; k++) { const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lh = dv.getUint32(p + 42, true), name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    const lnl = dv.getUint16(lh + 26, true), lxl = dv.getUint16(lh + 28, true); out.set(name, { method, data: u8.subarray(lh + 30 + lnl + lxl, lh + 30 + lnl + lxl + cs) }); p += 46 + nl + xl + cl; }
  return out;
}
async function unzipText(z, name) { const f = z.get(name); if (!f) return null; let d = f.data; if (f.method === 8) d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); return new TextDecoder().decode(d); }
const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
const colNum = (c) => c.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0), colName = (n) => { let s2 = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s2 = String.fromCharCode(65 + (n - 1) % 26) + s2; return s2; };
async function readSheets(file) {
  const z = await unzip(await file.arrayBuffer()), wbx = xml(await unzipText(z, 'xl/workbook.xml')), rels = xml(await unzipText(z, 'xl/_rels/workbook.xml.rels')), ss = await unzipText(z, 'xl/sharedStrings.xml');
  const strings = ss ? [...xml(ss).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [], relMap = {}; for (const r of rels.getElementsByTagName('Relationship')) relMap[r.getAttribute('Id')] = r.getAttribute('Target');
  const sheets = {}; for (const sh of wbx.getElementsByTagName('sheet')) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'), target = (relMap[rid] || '').replace(/^\//, ''), path = target.startsWith('xl/') ? target : 'xl/' + target, t = await unzipText(z, path); if (!t) continue;
    const rows = new Map(); for (const c of xml(t).getElementsByTagName('c')) { const ref = c.getAttribute('r'), m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) continue; const type = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent, isT = c.getElementsByTagName('is')[0]?.textContent; let val = '';
      if (type === 's') val = strings[Number(v)] ?? ''; else if (type === 'inlineStr') val = isT ?? ''; else if (type === 'str') val = v ?? ''; else if (type === 'b') val = v === '1'; else if (v != null && v !== '') val = Number(v); if (val === '' || val == null) continue; const r = Number(m[2]); (rows.get(r) || rows.set(r, {}).get(r))[m[1]] = val; }
    sheets[sh.getAttribute('name')] = rows; }
  return sheets;
}
const serialDate = (v) => { if (typeof v === 'number' && v > 20000 && v < 80000) return iso(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5 + new Date().getTimezoneOffset() * 0)).replace(/^(\d{4})-(\d\d)-(\d\d)$/, '$1-$2-$3'); if (typeof v === 'string') { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v) || null; if (m) return m[0]; const d = new Date(v); return isNaN(d) ? '' : iso(d); } return ''; };
const xlDate = (v) => { if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; } return serialDate(v); };
async function parseWorkbook(file) {
  const S = await readSheets(file), find = (re) => Object.keys(S).find((k) => re.test(k)), res = { meta: {}, lines: [], minimums: {}, markets: [], qa: [], actuals: [], target: null, year: '' };
  const instr = S[find(/instruction/i)], bc = S[find(/budget/i)], strat = S[find(/strateg/i)], act = S[find(/actual/i)];
  if (!bc) throw new Error('no "Budget & Cadence" sheet found');
  const label = (rows, text) => { for (const [r, c] of rows) if (typeof c.A === 'string' && c.A.trim().toLowerCase() === text.toLowerCase()) return c; return null; }, first = (c) => (c ? ['B', 'C', 'D', 'E'].map((k) => c[k]).find((x) => x !== undefined && x !== '') : undefined);
  if (instr) { const g = (t) => first(label(instr, t)); res.year = g('Plan Year:'); Object.assign(res.meta, { region: g('Region:'), markets: g('Markets Covered:'), preparedBy: g('Prepared By:'), approvedBy: g('Approved By (Market Officer):'), submitted: xlDate(g('Date Submitted:')), deadline: xlDate(g('Submission Deadline:')) }); for (const k in res.meta) if (res.meta[k] === undefined || res.meta[k] === '') delete res.meta[k]; }
  const tgt = first(label(bc, 'Target Annual Budget:')); if (tgt !== undefined) res.target = Number(String(tgt).replace(/[^0-9.]/g, '')) || null;
  const hdrs = [...bc].filter(([, c]) => c.A === 'Activity / Event' && c.B === 'Event Type'); if (!hdrs.length) throw new Error('could not find the budget table');
  const [hr, hc] = hdrs[hdrs.length - 1], col = {}; for (const k in hc) col[String(hc[k]).trim().toLowerCase()] = k;   // header text -> column letter (the last table is "YOUR BUDGET"; the first is the examples block)
  const g2 = (c, name) => c[col[name]];
  for (const [r, c] of [...bc].filter(([r]) => r > hr).sort((a, b) => a[0] - b[0])) { if (String(c.A || '').trim().toUpperCase() === 'TOTAL') break; const name = String(g2(c, 'activity / event') ?? '').trim(), occ = g2(c, 'occurrences / year'), cost = g2(c, 'cost per occurrence'); if (!name && occ === undefined && cost === undefined) continue; if (/^↑|examples end/i.test(name)) continue;
    res.lines.push({ name: name || '(untitled)', etype: String(g2(c, 'event type') ?? '').trim(), market: String(g2(c, 'market') ?? '').trim(), tier: String(g2(c, 'target tier') ?? '').trim(), cadence: String(g2(c, 'cadence') ?? '').trim(), occ: Number(occ) || 0, brokers: Number(g2(c, 'brokers per occurrence')) || 0, cost: Number(cost) || 0, month: String(g2(c, 'month (if one-time)') ?? '').trim().slice(0, 3), locked: String(g2(c, 'date locked?') ?? '').trim().toUpperCase().slice(0, 1), notes: String(g2(c, 'notes (co-host, principals invited, etc.)') ?? '').trim() }); }
  const ph = [...bc].find(([, c]) => c.A === 'Event Type' && String(c.B || '').startsWith('Minimum')); if (ph) for (const [r, c] of [...bc].filter(([r]) => r > ph[0]).sort((a, b) => a[0] - b[0])) { if (!c.A || /untagged|spend by market/i.test(String(c.A))) break; if (typeof c.B === 'number') res.minimums[String(c.A).trim()] = c.B; }
  const mh = [...bc].find(([, c]) => c.A === 'Market' && String(c.B || '').startsWith('Planned Spend')); if (mh) for (const [r, c] of [...bc].filter(([r]) => r > mh[0]).sort((a, b) => a[0] - b[0])) { const m = String(c.A || '').trim(); if (!m) continue; if (m.toLowerCase() !== 'regional') res.markets.push(m); }
  if (strat) { const qh = [...strat].find(([, c]) => c.A === 'Pillar' && c.B === 'Question'); if (qh) for (const [r, c] of [...strat].filter(([r]) => r > qh[0]).sort((a, b) => a[0] - b[0])) { if (!c.B || /^\(add your own\)$/i.test(String(c.B)) && !c.C) continue; if (/^to add a question/i.test(String(c.A || ''))) break; res.qa.push({ pillar: String(c.A || ''), question: String(c.B), answer: String(c.C ?? '') }); } }
  if (act) { const hs = [...act].filter(([, c]) => c.A === 'Date' && c.F === 'Activity / Event'); if (hs.length) { const hr2 = hs[hs.length - 1][0]; for (const [r, c] of [...act].filter(([r]) => r > hr2).sort((a, b) => a[0] - b[0])) { const d = xlDate(c.A), activity = String(c.F ?? '').trim(); if (!d || !activity) continue; if (c.K !== undefined && !c.A && !c.F) continue; res.actuals.push({ date: d, market: String(c.D ?? '').trim(), etype: String(c.E ?? '').trim(), activity, who: String(c.G ?? '').trim(), count: Number(c.H) || '', notes: String(c.I ?? '').trim() }); } } }
  return res;
}
function previewWorkbook(w, name) {
  const planned = w.lines.reduce((a, l) => a + lcost(l), 0), untagged = w.lines.filter((l) => !ETYPES.includes(l.etype)).length, row = (l, v) => el('div', { class: 'note' }, l, el('small', {}, v));
  openSheet(el('h2', {}, 'Import workbook'), el('p', { class: 'hint' }, name), w.lines.length || w.actuals.length || w.target ? [
    row('Target annual budget', w.target ? money(w.target) : 'not found'), row('Budget lines', `${w.lines.length} (planned ${money(planned)}, ${w.lines.reduce((a, l) => a + ltouch(l), 0)} broker touches)${untagged ? ` · ${untagged} without a valid event type` : ''}`),
    row('Markets', w.markets.join(', ') || 'none'), row('Strategy answers', `${w.qa.filter((q) => q.answer).length} of ${w.qa.length} answered`), row('Activity log', `${w.actuals.length} entries`), row('Plan details', Object.values(w.meta).filter(Boolean).length ? 'found' : 'not filled in'),
    el('p', { class: 'hint' }, 'Importing replaces the budget lines, markets, minimums, strategy answers and activity log with what is in the workbook. Events and their costs are kept; events stay linked to a budget line when the line name is unchanged. The example rows in the workbook are ignored.')] : el('p', {}, 'The workbook has no budget lines yet. Complete the yellow cells on "Budget & Cadence" and import it again.'),
    el('div', { class: 'bar' }, (w.lines.length || w.target) && el('button', { class: 'btn pri', onclick: () => { applyWorkbook(w); closeSheet(); budView = 'summary'; planView = 'budget'; renderPlan(); say(`Imported ${w.lines.length} budget lines`); } }, 'Replace my budget with this workbook'), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}
function applyWorkbook(w) {
  track('workbook_imported', { lines: w.lines.length, actuals: w.actuals.length });
  const B = plan.budget, used = new Set(); if (w.year && Number(w.year) > 2000) plan.year = Number(w.year); if (w.target) plan.total = w.target; B.meta = { ...B.meta, ...w.meta };
  B.lines = w.lines.map((l) => { let id = 'wb:' + l.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), k = 1; while (used.has(id)) id = id.replace(/(#\d+)?$/, '#' + ++k); used.add(id); return { id, ...l }; });   // stable ids keep event links across re-imports
  B.minimums = { ...MIN_DEFAULT, ...w.minimums }; B.markets = w.markets; if (w.qa.length) B.qa = w.qa; B.actuals = w.actuals.map((a) => ({ id: uid(), ...a })); savePlan();
}

function planOverview() {
  const C = data.contacts, S = planStats(), total = Number(plan.total) || 0, cov = coverage(), pct = total ? Math.min(100, Math.round(S.planned / total * 100)) : 0;
  const tile = (n, l, bad) => el('div', { class: 's' + (bad ? ' bad' : '') }, el('b', {}, n), el('span', {}, l));
  const BS = bstats(), box = el('div', {}, el('div', { class: 'sum' }, tile(money(total), 'Target budget'), tile(money(BS.planned), 'Planned (budget lines)'), tile(money(BS.spend), 'Event costs'), tile(money(BS.left), 'Left to spend', BS.left < 0)),
    total ? el('div', { class: 'card chart' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0 0 8px' }, el('b', {}, `${pct}% of target planned`), el('span', { class: 'hint' }, `Idea/planned ${money(S.pipeline)} · committed ${money(S.committed)} · spent ${money(S.spent)}`)), el('div', { class: 'bar2' + (S.planned > total ? ' over' : '') }, el('i', { style: `width:${pct}%` }))) : el('div', { class: 'panel', style: 'max-width:none' }, 'Set the annual budget in the Budget tab to track spend against it.'));
  const tr = typeRows(), cm = new Map(tr.filter((r) => r.spend > 0).map((r) => [r.t, r.spend])), cm2 = cm.size ? cm : new Map(Object.entries(S.byCat).filter(([, v]) => v > 0));
  const catCard = el('div', { class: 'card chart' }, el('h2', {}, cm.size ? 'Planned spend by event type' : 'Event spend by category'), el('div', { class: 'sub' }, cm.size ? 'From the budget lines. Add or import lines on the Budget tab.' : `${S.ev.length} events in ${plan.year}, excluding cancelled. Add budget lines to plan by event type.`), cm2.size ? donut(topN(cm2, 8).map((x) => ({ ...x, value: Math.round(x.value) })), { unit: 'planned', fmt: money }) : el('p', { class: 'hint' }, 'No events or budget lines yet.'),
    el('table', { class: 'tbl', style: 'margin-top:10px' }, el('tr', {}, el('th', {}, 'Event type'), el('th', { class: 'n' }, 'Lines'), el('th', { class: 'n' }, 'Events'), el('th', { class: 'n' }, 'Min / yr'), el('th', { class: 'n' }, 'Planned')),
      tr.filter((r) => r.spend || r.evSpend || r.min != null).map((r) => el('tr', {}, el('td', {}, r.t), el('td', { class: 'n' }, money(r.spend)), el('td', { class: 'n' }, money(r.evSpend)), el('td', { class: 'n' }, r.min ?? '—'), el('td', { class: 'n', style: r.min != null && r.occ < r.min ? 'color:var(--alert)' : '' }, r.occ)))));
  const qMax = Math.max(1, ...S.byQ), qCard = el('div', { class: 'card chart' }, el('h2', {}, 'Planned spend by quarter'), el('div', { style: 'display:flex;gap:10px;align-items:flex-end;height:120px;margin-top:10px' }, S.byQ.map((v, i) => el('div', { style: 'flex:1;text-align:center' }, el('div', { class: 'hint' }, money(v)), el('div', { style: `height:${Math.max(4, v / qMax * 90)}px;background:${PALETTE[i % PALETTE.length]};border-radius:6px 6px 0 0;margin-top:4px` }), el('div', { class: 'hint' }, 'Q' + (i + 1))))));
  const covCard = el('div', { class: 'card chart' }, el('h2', {}, 'Relationship coverage'), el('div', { class: 'sub' }, `Top-tier contacts (30-day cadence) invited to at least one ${plan.year} event.`),
    cov.tops.length ? [el('div', { class: 'bar', style: 'margin:0 0 8px' }, el('b', { style: 'font-size:22px;color:var(--blue)' }, `${cov.covered.length} of ${cov.tops.length}`), el('span', { class: 'hint' }, `${Math.round(cov.covered.length / cov.tops.length * 100)}% covered`)), el('div', { class: 'bar2' }, el('i', { style: `width:${cov.covered.length / cov.tops.length * 100}%` })),
      cov.missing.length ? [el('h3', { style: 'font-size:16px;margin:12px 0 4px' }, 'Not yet invited'), cov.missing.slice(0, 8).map((c) => el('div', { class: 'note', style: 'cursor:pointer', onclick: () => openContact(c) }, c.name, el('small', {}, [c.company, pocOf(c) && 'POC ' + pocOf(c)].filter(Boolean).join(' · ')))), el('div', { class: 'bar', style: 'margin-top:8px' }, el('button', { class: 'btn sm', onclick: () => go('events') }, 'Find events'))] : null] : el('p', { class: 'hint' }, 'No top-tier contacts found.'));
  // touchpoint plan: expected touches by tier from the cadence rules vs event guest slots
  const tiers = [...new Set(C.list.filter(isPerson).map((c) => c.tier || ''))], guestSlots = (tier) => plan.events.filter((e) => e.status !== 'Cancelled' && (e.date || '').startsWith(String(plan.year))).flatMap((e) => e.guests || []).filter((id) => (C.list.find((c) => c.id === id)?.tier || '') === tier).length;
  const tp = el('div', { class: 'card chart' }, el('h2', {}, 'Touchpoint plan'), el('div', { class: 'sub' }, 'Contacts per tier, the touches per year the cadence rules call for, and event invitations planned.'),
    el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Tier'), el('th', { class: 'n' }, 'Contacts'), el('th', { class: 'n' }, 'Cadence'), el('th', { class: 'n' }, 'Touches/yr'), el('th', { class: 'n' }, 'Event invites')),
      tiers.sort().map((t) => { const n = C.list.filter((c) => isPerson(c) && (c.tier || '') === t), cad = cadenceFor({ tier: t }); return el('tr', {}, el('td', {}, t || 'No tier'), el('td', { class: 'n' }, n.length), el('td', { class: 'n' }, cad ? cad + 'd' : 'none'), el('td', { class: 'n' }, cad ? Math.round(n.length * 365 / cad) : 0), el('td', { class: 'n' }, guestSlots(t))); })));
  const bdE = C.bd.events.filter((e) => e.start.startsWith(String(new Date().getFullYear())) && ATTENDED.test(e.status)), thisY = new Date().getFullYear();
  const attCard = el('div', { class: 'card chart' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('div', {}, el('h2', {}, `Events attended in ${thisY}`), el('div', { class: 'sub' }, 'From the Business Development section of the Monday board.')), el('b', { style: 'font-size:32px;color:var(--blue)' }, bdE.length)),
    el('div', { class: 'bar', style: 'margin:8px 0 0' }, el('button', { class: 'btn sm', onclick: () => { planView = 'attended'; attYear = thisY; renderPlan(); } }, 'View all'), el('button', { class: 'btn sm pri', onclick: () => openCreateInitiative() }, '+ Create new')));
  box.append(attCard, catCard, qCard, covCard, tp); return box;
}
function planEvents() {
  const evs = plan.events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')), by = new Map(); evs.forEach((e) => { const k = (e.date || 'No date').slice(0, 7); (by.get(k) || by.set(k, []).get(k)).push(e); });
  return el('div', {}, el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => openPlanEvent(null) }, '+ Create event'), el('button', { class: 'btn', onclick: () => go('events') }, 'Browse live events')),
    evs.length ? [...by.entries()].map(([k, list]) => [el('div', { class: 'sec-h' }, el('h2', {}, k === 'No date' ? k : parseIso(k + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })), el('span', { class: 'hint' }, money(list.reduce((a, e) => a + evCost(e), 0)))),
      el('div', { class: 'card' }, list.map((e) => el('div', { class: 'row', onclick: () => openPlanEvent(e.id) }, el('div', { class: 'who' }, el('strong', {}, e.title), el('small', {}, [fmtDate(e.date), e.venue, e.category].filter(Boolean).join(' · ')), el('div', {}, el('span', { class: 'chip' }, e.status), (e.guestNames || []).length ? el('span', { class: 'chip' }, e.guestNames.length + ' guests') : null)), el('b', { style: 'color:var(--blue);font-weight:500' }, money(evCost(e))))))]) : el('p', { class: 'hint' }, 'No events in the plan yet.'));
}
function planStrategy() {
  const B = plan.budget, n = plan.notes, qa = (q) => { const t = el('textarea', { rows: 3, value: q.answer || '', placeholder: 'Your answer', style: 'width:100%', onchange: () => { q.answer = t.value; savePlan(); say('Saved'); } }); return el('div', { class: 'f' }, el('label', {}, q.pillar || 'Other'), el('div', { style: 'margin-bottom:4px;font-size:13px' }, q.question), t); };
  const f = (k, label, rows = 3) => { const t = el('textarea', { rows, value: n[k] || '', placeholder: label, onchange: () => { n[k] = t.value; savePlan(); say('Saved'); } }); return el('div', { class: 'f' }, el('label', {}, label), t); };
  const imp = el('input', { type: 'file', accept: '.json', hidden: true, onchange: async (e) => { const f2 = e.target.files[0]; if (!f2) return; try { const j = JSON.parse(await f2.text()); if (!Array.isArray(j.events)) throw new Error('Not a plan export'); plan = normPlan(j); savePlan(); say('Plan imported'); renderPlan(); } catch (er) { say(er.message, 'err'); } } });
  const newQ = el('input', { placeholder: 'Add your own question', style: 'flex:1' });
  return el('div', {}, el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, `${plan.year} strategy and execution`), el('p', { class: 'hint' }, 'The same questions as the workbook, organized like the BD Guide (Who, Plan, Execute, Monitor). Answers fill in when you import the workbook.'), B.qa.map(qa),
      el('div', { style: 'display:flex;gap:8px' }, newQ, el('button', { class: 'btn', onclick: () => { if (newQ.value.trim()) { B.qa.push({ pillar: 'Other', question: newQ.value.trim(), answer: '' }); savePlan(); renderPlan(); } } }, 'Add'))),
    el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Quarterly priorities'), f('q1', 'Q1 priorities'), f('q2', 'Q2 priorities'), f('q3', 'Q3 priorities'), f('q4', 'Q4 priorities'),
      el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: () => saveFile(`bd-plan-${plan.year}.json`, 'application/json', JSON.stringify(plan, null, 2)) }, 'Export plan (JSON)'), el('button', { class: 'btn', onclick: () => saveFile(`bd-events-${plan.year}.csv`, 'text/csv', planCsv()) }, 'Export events (CSV)'), el('button', { class: 'btn', onclick: () => saveFile(`bd-budget-${plan.year}.csv`, 'text/csv', budgetCsv()) }, 'Export budget lines (CSV)'), el('button', { class: 'btn', onclick: () => imp.click() }, 'Import plan'), imp)));
}
const budgetCsv = () => ['Activity / Event,Event Type,Market,Target Tier,Cadence,Occurrences / Year,Brokers per Occurrence,Cost per Occurrence,Est. Annual Cost,Est. Broker Touches,Month,Date Locked?,Notes'].concat(plan.budget.lines.map((l) => [l.name, l.etype, l.market, l.tier, l.cadence, l.occ, l.brokers, l.cost, lcost(l), ltouch(l), l.month, l.locked, l.notes].map(csvCell).join(','))).join('\n');
const csvCell = (v) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const planCsv = () => ['Date,Event,Venue,Category,Status,Tickets,Unit cost,Planned cost,Actual,Guests,Ticket link'].concat(plan.events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((e) => [e.date, e.title, e.venue, e.category, e.status, e.qty, e.unit, evCost(e), e.actual, (e.guestNames || []).join('; '), e.url].map(csvCell).join(','))).join('\n');
function saveFile(name, type, text) { const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function openPlanEvent(id, seed) {
  const isNew = !id || !plan.events.find((e) => e.id === id), e = isNew ? { id: uid(), title: '', date: '', time: '', venue: '', category: 'Sports', status: 'Planned', qty: 4, unit: '', actual: '', url: '', notes: '', guests: [], guestNames: [], source: 'manual', etype: '', lineId: '', ...(seed || {}) } : { ...plan.events.find((x) => x.id === id), ...Object.fromEntries(Object.entries(seed || {}).filter(([, v]) => v !== '' && v != null)), guests: [...(plan.events.find((x) => x.id === id).guests || [])], guestNames: [...(plan.events.find((x) => x.id === id).guestNames || [])] };
  if (!e.etype) e.etype = defaultEType(e.category);
  const inp = (k, type = 'text', ph = '') => el('input', { type, value: e[k] ?? '', placeholder: ph, oninput: (ev) => { e[k] = ev.target.value; recalc(); } });
  const sel = (k, opts) => { const s = el('select', { onchange: (ev) => { e[k] = ev.target.value; } }, opts.map((o) => el('option', { value: o }, o))); s.value = e[k]; return s; };
  const lineSel = el('select', { onchange: (ev) => { e.lineId = ev.target.value; } }), drawLines = () => { const opts = plan.budget.lines.filter((l) => !l.etype || l.etype === e.etype); if (!opts.some((l) => l.id === e.lineId)) e.lineId = ''; lineSel.replaceChildren(el('option', { value: '' }, '— not linked —'), opts.map((l) => el('option', { value: l.id }, `${l.name} (${money(lcost(l))})`))); lineSel.value = e.lineId || ''; }; drawLines();
  const total = el('b', {}), recalc = () => { total.textContent = money(evCost(e)); }; 
  const chips = el('div', { class: 'sec', style: 'margin:6px 0' }), res = el('div', {}), find = el('input', { placeholder: 'Add a guest: search name or phone' });
  const drawChips = () => chips.replaceChildren(e.guestNames.map((n, i) => el('span', { class: 'tag' }, n, el('button', { type: 'button', onclick: () => { e.guests.splice(i, 1); e.guestNames.splice(i, 1); drawChips(); } }, '×'))));
  find.addEventListener('input', () => { const q = find.value; res.replaceChildren(q.trim().length < 2 ? null : data.contacts.list.filter((c) => isPerson(c) && !e.guests.includes(c.id) && nameOrPhone(q, [c.name, c.company], [c.phone, c.phone2])).slice(0, 6).map((c) => el('div', { class: 'row', style: 'min-height:48px', onclick: () => { e.guests.push(c.id); e.guestNames.push(c.name); find.value = ''; res.replaceChildren(); drawChips(); } }, el('div', { class: 'who' }, el('strong', {}, c.name), el('small', {}, [c.company, c.tier].filter(Boolean).join(' · ')))))); });
  drawChips(); recalc();
  const field = (label, node) => el('div', { class: 'f' }, el('label', {}, label), node);
  const calEv = () => ({ uid: `${e.id}@necrm`, title: e.title || 'BD event', date: e.date || today(), time: e.time || '19:00', mins: 180, loc: e.venue, url: e.url, desc: [e.guestNames.length && 'Guests: ' + e.guestNames.join(', '), e.notes].filter(Boolean).join('\n') });
  openSheet(el('h2', {}, isNew ? 'Create event' : 'Edit event'), field('Event', inp('title', 'text', 'e.g. Yankees vs Red Sox')), el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'flex:1' }, field('Date', inp('date', 'date'))), el('div', { style: 'flex:1' }, field('Start time', inp('time', 'time')))), field('Venue', inp('venue')), el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'flex:1' }, field('Firm / relationship', inp('firm'))), el('div', { style: 'flex:1' }, field('Region', inp('region'))), el('div', { style: 'flex:1' }, field('Type label', inp('mtype')))),
    el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'flex:1' }, field('Category', sel('category', PLAN_CATS))), el('div', { style: 'flex:1' }, field('Status', sel('status', PLAN_STATUS)))),
    el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'flex:1' }, field('Event type (budget)', (() => { const s2 = el('select', { onchange: (ev) => { e.etype = ev.target.value; drawLines(); } }, ETYPES.map((o) => el('option', { value: o }, o))); s2.value = e.etype; return s2; })())), el('div', { style: 'flex:1' }, field('Budget line', lineSel))),
    el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'flex:1' }, field('Tickets', inp('qty', 'number'))), el('div', { style: 'flex:1' }, field('Cost per ticket ($)', inp('unit', 'number'))), el('div', { style: 'flex:1' }, field('Actual total ($)', inp('actual', 'number')))),
    el('p', { style: 'margin:0 0 10px' }, 'Cost counted against budget: ', total), field('Ticket link', inp('url', 'url')), field('Guests (clients and brokers)', el('div', {}, find, res, chips)), field('Internal members (Faropoint team)', memberPicker(e).node), field('Notes', el('textarea', { rows: 2, value: e.notes || '', oninput: (ev) => { e.notes = ev.target.value; } })), updatesBox(e),
    el('label', { class: 'hint', style: 'display:block;margin:4px 0' }, 'ADD TO YOUR CALENDAR'), calButtons(calEv), e.url && el('p', {}, el('a', { href: e.url, target: '_blank', rel: 'noopener' }, 'Open ticket page')),
    el('p', { class: 'hint' }, 'The app tracks requests and budget; tickets are purchased on the ticket page. Moving an event to Booked logs an invitation on each guest in Monday and schedules their next follow-up.'),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: async () => {
      if (!e.title.trim() || !e.date) return say('Enter an event name and date', 'err');
      const prev = plan.events.find((x) => x.id === e.id) || {}; e.title = e.title.trim(); let logged = 0;
      for (const [st, flag, kind, what] of [['Booked', 'loggedBooked', 'Event', 'Invited to'], ['Attended', 'loggedAttended', 'Event', 'Attended']]) if (e.status === st && !prev[flag] && !e[flag]) { for (const gid of e.guests) { const c = data.contacts.list.find((x) => x.id === gid); if (c) { await logActivity(c, kind, `${what} ${e.title} on ${fmtDate(e.date, true)}${e.venue ? ' at ' + e.venue : ''}`); logged++; } } e[flag] = true; }
      const i = plan.events.findIndex((x) => x.id === e.id); track('plan_event_saved', { status: e.status, category: e.category, isNew: i < 0 }); if (i >= 0) plan.events[i] = e; else plan.events.push(e); savePlan(); if (e.status === 'Cancelled') mirrorOutlook(calEv(), true); else if (['Booked', 'Requested', 'Attended'].includes(e.status) && (cfg.autoOutlook || oSent()[calEv().uid])) { const ce = calEv(); if (oSent()[ce.uid]) mirrorOutlook(ce); else addToOutlook(ce); } closeSheet(); say(logged ? `Saved. Logged on ${logged} contact${logged > 1 ? 's' : ''}` : 'Event saved'); render(); } }, 'Save'),
      !isNew && el('button', { class: 'btn', onclick: () => { if (confirm('Delete this event from the plan?')) { mirrorOutlook({ uid: `${e.id}@necrm` }, true); plan.events = plan.events.filter((x) => x.id !== e.id); savePlan(); closeSheet(); render(); } } }, 'Delete'), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}

// ---------------------------------------------------------------- live events feed (tri-state): Ticketmaster Discovery API + keyless team schedules
const MARKETS = [{ k: 'nyc', n: 'New York / New Jersey', dma: 345, ll: [40.7549, -73.984] }, { k: 'philly', n: 'Philadelphia', dma: 504, ll: [39.9526, -75.1652] }, { k: 'boston', n: 'Boston', dma: 506, ll: [42.3601, -71.0589] }, { k: 'dc', n: 'Washington, DC', dma: 511, ll: [38.9072, -77.0369] },
  { k: 'balt', n: 'Baltimore', dma: 512, ll: [39.2904, -76.6122] }, { k: 'ct', n: 'Connecticut', dma: 533, ll: [41.7658, -72.6734] }, { k: 'pitt', n: 'Pittsburgh', dma: 508, ll: [40.4406, -79.9959] }];
const mname = (k) => MARKETS.find((m) => m.k === k)?.n || '';
const TEAMS = [['Yankees', 'baseball/mlb', 'nyc'], ['Mets', 'baseball/mlb', 'nyc'], ['Giants', 'football/nfl', 'nyc'], ['Jets', 'football/nfl', 'nyc'], ['Knicks', 'basketball/nba', 'nyc'], ['Nets', 'basketball/nba', 'nyc'], ['Rangers', 'hockey/nhl', 'nyc'], ['Islanders', 'hockey/nhl', 'nyc'], ['Devils', 'hockey/nhl', 'nyc'],
  ['Phillies', 'baseball/mlb', 'philly'], ['Eagles', 'football/nfl', 'philly'], ['76ers', 'basketball/nba', 'philly'], ['Flyers', 'hockey/nhl', 'philly'], ['Red Sox', 'baseball/mlb', 'boston'], ['Patriots', 'football/nfl', 'boston'], ['Celtics', 'basketball/nba', 'boston'], ['Bruins', 'hockey/nhl', 'boston'],
  ['Nationals', 'baseball/mlb', 'dc'], ['Commanders', 'football/nfl', 'dc'], ['Wizards', 'basketball/nba', 'dc'], ['Capitals', 'hockey/nhl', 'dc'], ['Orioles', 'baseball/mlb', 'balt'], ['Ravens', 'football/nfl', 'balt'], ['Pirates', 'baseball/mlb', 'pitt'], ['Steelers', 'football/nfl', 'pitt'], ['Penguins', 'hockey/nhl', 'pitt']];
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const jget = async (u) => { const r = await fetch(u); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.fault?.faultstring || j.message || j.errors?.[0]?.message || `HTTP ${r.status}`); return j; };
const myMarkets = () => MARKETS.filter((m) => (cfg.markets || []).includes(m.k));
const evCat = (t) => (/comed|stand-?up/i.test(t) ? 'Comedy' : / vs\.? | at | @ /i.test(t) ? 'Sports' : 'Concerts');
async function tmEvents(year) { // Ticketmaster: free key from developer.ticketmaster.com, 5 requests/second, 5,000/day
  const out = [];
  for (const m of myMarkets()) for (const [cls, cat] of [['Sports', 'Sports'], ['Music', 'Concerts'], ['Comedy', 'Comedy']]) for (let page = 0; page < 3; page++) {
    const j = await jget('https://app.ticketmaster.com/discovery/v2/events.json?' + new URLSearchParams({ apikey: cfg.tmKey, dmaId: String(m.dma), classificationName: cls, size: '200', page: String(page), sort: 'date,asc', startDateTime: `${year}-01-01T00:00:00Z`, endDateTime: `${year}-12-31T23:59:59Z` }));
    for (const e of j._embedded?.events || []) { const v = e._embedded?.venues?.[0], pr = e.priceRanges?.[0];
      out.push({ ext: 'tm:' + e.id, title: e.name, date: e.dates?.start?.localDate || '', time: (e.dates?.start?.localTime || '').slice(0, 5), venue: [v?.name, v?.city?.name].filter(Boolean).join(', '), category: cat, market: m.k, url: e.url || '', price: pr?.min || 0, priceMax: pr?.max || 0, source: 'Ticketmaster' }); }
    if (page + 1 >= (j.page?.totalPages || 0)) break; await sleep(250);
  }
  return out;
}
async function sgEvents(year) { // SeatGeek: free client_id from seatgeek.com/build, searched around each market
  const out = [];
  for (const m of myMarkets()) for (let page = 1; page <= 2; page++) {
    const j = await jget('https://api.seatgeek.com/2/events?' + new URLSearchParams({ client_id: cfg.sgId, lat: String(m.ll[0]), lon: String(m.ll[1]), range: '40mi', per_page: '100', page: String(page), sort: 'datetime_local.asc', 'datetime_local.gte': `${year}-01-01T00:00:00`, 'datetime_local.lte': `${year}-12-31T23:59:59` }));
    for (const e of j.events || []) { const tx = (e.taxonomies || []).map((t) => t.name).join(' ') + ' ' + (e.type || ''), cat = /comedy/i.test(tx) ? 'Comedy' : /concert|music/i.test(tx) ? 'Concerts' : /sport|mlb|nfl|nba|nhl|ncaa|mls/i.test(tx) ? 'Sports' : ''; if (!cat) continue;
      out.push({ ext: 'sg:' + e.id, title: e.title, date: (e.datetime_local || '').slice(0, 10), time: (e.datetime_local || '').slice(11, 16), venue: [e.venue?.name, e.venue?.city].filter(Boolean).join(', '), category: cat, market: m.k, url: e.url || '', price: e.stats?.lowest_price || 0, source: 'SeatGeek' }); }
    if (!j.events?.length || page * 100 >= (j.meta?.total || 0)) break; await sleep(200);
  }
  return out;
}
async function espnEvents(year) { // unofficial ESPN schedule feed; home games only
  const out = [], mine = new Set((cfg.markets || [])), teams = TEAMS.filter((t) => mine.has(t[2])), rosters = {};
  for (const lg of new Set(teams.map((t) => t[1]))) rosters[lg] = ((await jget(`${ESPN}/${lg}/teams?limit=100`)).sports?.[0]?.leagues?.[0]?.teams || []).map((x) => x.team);
  for (const [nick, lg, mk] of teams) {
    const team = rosters[lg].find((t) => t.nickname === nick || (t.displayName || '').endsWith(nick)); if (!team) continue;
    for (const season of [year - 1, year]) { let j; try { j = await jget(`${ESPN}/${lg}/teams/${team.id}/schedule?season=${season}`); } catch { continue; }
      for (const e of j.events || []) { const comp = e.competitions?.[0], home = comp?.competitors?.find((c) => c.homeAway === 'home'); if (String(home?.team?.id) !== String(team.id)) continue;
        const d = new Date(e.date), date = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); if (!date.startsWith(String(year))) continue;
        out.push({ ext: 'espn:' + e.id, title: e.name || `${nick} home game`, date, time: d.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }), venue: comp?.venue?.fullName || '', category: 'Sports', team: nick, market: mk, price: 0,
          url: comp?.tickets?.[0]?.links?.[0]?.href || 'https://seatgeek.com/search?search=' + encodeURIComponent(nick + ' tickets'), source: 'ESPN schedule' }); } }
  }
  return out;
}
const teamIn = (t) => TEAMS.map((x) => x[0]).find((n) => (t || '').includes(n)) || '';
async function fetchEvents() {
  if (demo) { evData = { at: Date.now(), events: sampleEvents(), errors: [] }; return; }
  const year = Number(plan.year), errors = []; let all = [];
  if (cfg.tmKey) try { all = all.concat(await tmEvents(year)); } catch (e) { errors.push('Ticketmaster: ' + e.message); }
  if (cfg.sgId) try { all = all.concat(await sgEvents(year)); } catch (e) { errors.push('SeatGeek: ' + e.message); }
  if (cfg.espn) try { all = all.concat(await espnEvents(year)); } catch (e) { errors.push('Team schedules: ' + e.message); }
  const rank = { Ticketmaster: 3, SeatGeek: 2 }, seen = new Map();   // one row per event, keeping a ticket link from every source that lists it
  for (const e of all.filter((x) => x.date)) { const k = e.date + '|' + (teamIn(e.title) || norm(e.title)), cur = seen.get(k), link = { source: e.source, url: e.url, price: e.price || 0, id: e.ext };
    if (!cur) seen.set(k, { ...e, links: [link] }); else { if (!cur.links.some((l) => l.source === link.source && l.url === link.url)) cur.links.push(link); if ((rank[e.source] || 0) > (rank[cur.source] || 0)) { const links = cur.links; Object.assign(cur, e, { links }); } cur.price = Math.min(...cur.links.map((l) => l.price).filter(Boolean), Infinity) || 0; if (!isFinite(cur.price)) cur.price = 0; } }
  for (const e of seen.values()) if (e.price === Infinity) e.price = 0;
  evData = { at: Date.now(), events: [...seen.values()].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))), errors }; LS.set('necrm-events', evData);
}
function sampleEvents() {
  const y = plan.year, S = (d, t, title, venue, cat, price, src, mk) => ({ ext: 'sample:' + d + title, date: `${y}-${d}`, time: t, title: title + ' (sample)', venue, category: cat, price, url: 'https://example.com/tickets', source: src || 'Sample', team: teamIn(title), market: mk || (TEAMS.find((x) => x[0] === teamIn(title))?.[2]) || 'nyc', links: [{ source: src || 'Sample', url: 'https://example.com/tickets', price, id: 'sample:' + d + title }] });
  return [S('04-09', '19:05', 'Yankees vs. Red Sox', 'Yankee Stadium', 'Sports', 120, 'ESPN schedule'), S('04-17', '19:10', 'Mets vs. Phillies', 'Citi Field', 'Sports', 95, 'ESPN schedule'), S('05-06', '19:30', 'Knicks vs. Celtics', 'Madison Square Garden', 'Sports', 260, 'Ticketmaster'), S('01-14', '19:00', 'Rangers vs. Bruins', 'Madison Square Garden', 'Sports', 180, 'Ticketmaster'),
    S('09-19', '13:00', 'Giants vs. Cowboys', 'MetLife Stadium', 'Sports', 210, 'ESPN schedule'), S('10-03', '13:00', 'Jets vs. Dolphins', 'MetLife Stadium', 'Sports', 150, 'ESPN schedule'), S('06-12', '20:00', 'Arena Concert Night', 'Barclays Center', 'Concerts', 175, 'Ticketmaster'), S('07-25', '20:00', 'Stadium Concert', 'MetLife Stadium', 'Concerts', 140, 'Ticketmaster'),
    S('03-20', '20:00', 'Stand-up Comedy Special', 'Radio City Music Hall', 'Comedy', 90, 'Ticketmaster'), S('11-06', '19:30', 'Comedy Night', 'Beacon Theatre', 'Comedy', 85, 'Ticketmaster'), S('04-23', '19:05', 'Phillies vs. Mets', 'Citizens Bank Park', 'Sports', 70, 'ESPN schedule'), S('05-14', '19:30', 'Celtics vs. 76ers', 'TD Garden', 'Sports', 240, 'SeatGeek'), S('06-30', '19:05', 'Nationals vs. Orioles', 'Nationals Park', 'Sports', 55, 'SeatGeek', 'dc')];
}
function samplePlan() {
  const y = 2027, g = (ids) => ({ guests: ids, guestNames: ids.map((i) => data.contacts.list.find((c) => c.id === i)?.name).filter(Boolean) });
  return { ...planDefault(), year: y, total: 200000, notes: { strategy: 'Sample: deepen top-tier broker relationships with two events each and add 15 new Tier 2 relationships.', q1: 'Sample: Knicks and Rangers season-ticket outings', q2: 'Sample: Yankees and Mets, spring dining series', q3: 'Sample: summer concerts, ICSC conference', q4: 'Sample: Giants/Jets, year-end gifts' },
    events: [{ id: 'p1', title: 'Rangers vs. Bruins (sample)', date: `${y}-01-14`, time: '19:00', venue: 'Madison Square Garden', category: 'Sports', status: 'Attended', qty: 4, unit: 180, actual: 760, ...g(['100', '101']), source: 'sample' }, { id: 'p2', title: 'Yankees vs. Red Sox (sample)', date: `${y}-04-09`, time: '19:05', venue: 'Yankee Stadium', category: 'Sports', status: 'Booked', qty: 6, unit: 120, actual: '', ...g(['100', '105', '107']), source: 'sample' },
      { id: 'p3', title: 'Knicks vs. Celtics (sample)', date: `${y}-05-06`, time: '19:30', venue: 'Madison Square Garden', category: 'Sports', status: 'Planned', qty: 4, unit: 260, actual: '', ...g(['101']), source: 'sample' }, { id: 'p4', title: 'Arena Concert Night (sample)', date: `${y}-06-12`, time: '20:00', venue: 'Barclays Center', category: 'Concerts', status: 'Planned', qty: 6, unit: 175, actual: '', ...g([]), source: 'sample' },
      { id: 'p5', title: 'Client dinner series (sample)', date: `${y}-03-05`, time: '19:00', venue: 'Midtown', category: 'Dining', status: 'Booked', qty: 8, unit: 250, actual: 2100, ...g(['102']), source: 'sample' }, { id: 'p6', title: 'Giants vs. Cowboys (sample)', date: `${y}-09-19`, time: '13:00', venue: 'MetLife Stadium', category: 'Sports', status: 'Idea', qty: 6, unit: 210, actual: '', ...g([]), source: 'sample' }] };
}
function evDiscover(out) {
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const inPlan = new Map(plan.events.filter((e) => e.ext).map((e) => [e.ext, e])), all = (evNear.on ? evNear.events : (evData.events || [])).slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))), months = [...new Set(all.map((e) => e.date.slice(0, 7)))].sort();
  const list = all.filter((e) => (!evF.cat || e.category === evF.cat) && (!evF.market || e.market === evF.market) && (!evF.month || e.date.startsWith(evF.month)) && (!evF.q || (e.title + ' ' + (e.venue || '')).toLowerCase().includes(evF.q.toLowerCase())));
  const seg = el('div', { class: 'seg' }, [['', 'All'], ['Sports', 'Sports'], ['Concerts', 'Concerts'], ['Comedy', 'Comedy']].map(([k, l]) => el('button', { class: evF.cat === k ? 'on' : '', onclick: () => { evF.cat = k; renderEvents(); } }, l)));
  const msel = el('select', { onchange: (e) => { evF.month = e.target.value; renderEvents(); } }, el('option', { value: '' }, 'All months'), months.map((m) => el('option', { value: m }, parseIso(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })))); msel.value = evF.month;
  const q = el('input', { type: 'search', placeholder: 'Search events or venues', value: evF.q, style: 'flex:1 1 200px', onchange: (e) => { evF.q = e.target.value; renderEvents(); } });
  const refresh = el('button', { class: 'btn pri', onclick: async (ev) => { ev.currentTarget.textContent = 'Refreshing…'; await fetchEvents(); renderEvents(); if (evData.errors?.length) say(evData.errors[0], 'err'); else say(`Found ${evData.events.length} events`); } }, evData.at ? 'Refresh feed' : 'Load events');
  const mkSel = el('select', { onchange: (e) => { evF.market = e.target.value; renderEvents(); } }, el('option', { value: '' }, 'All markets'), myMarkets().map((m) => el('option', { value: m.k }, m.n))); mkSel.value = evF.market || '';
  const none = !all.length && !evNear.on && el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Northeast and Mid-Atlantic events'), el('p', {}, `Tap Load events to pull ${plan.year} home games for ${myMarkets().map((m) => m.n).join(', ') || 'your markets'}${cfg.tmKey || cfg.sgId ? ', plus concerts, comedy and more from ' + [cfg.tmKey && 'Ticketmaster', cfg.sgId && 'SeatGeek'].filter(Boolean).join(' and ') : ''}.`),
    !(cfg.tmKey && cfg.sgId) && el('p', { class: 'hint' }, 'Add a free Ticketmaster key and a SeatGeek client ID in Settings to include concerts, comedy and every other event, with ticket links from both.'));
  let lastM = ''; const rows = list.map((e) => { const m = e.date.slice(0, 7), d = parseIso(e.date), pl = inPlan.get(e.ext), hdr = m !== lastM ? el('div', { class: 'sec-h', style: 'margin:14px 14px 4px' }, el('h2', {}, d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))) : null; lastM = m;
    return [hdr, el('div', { class: 'evd' }, el('div', { class: 'dt' }, el('b', {}, d.getDate()), el('span', {}, d.toLocaleDateString('en-US', { weekday: 'short' }))),
      el('div', { class: 'who' }, el('strong', {}, e.title), el('small', {}, [e.time && new Date(`2000-01-01T${e.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), e.venue].filter(Boolean).join(' · ')),
        el('div', {}, el('span', { class: 'chip' }, e.category), e.price ? el('span', { class: 'chip' }, 'from ' + money(e.price)) : null, e.market && el('span', { class: 'chip' }, mname(e.market).split(' / ')[0]), el('span', { class: 'chip' }, [...new Set((e.links || [{ source: e.source }]).map((l) => l.source))].join(' + ')))),
      el('div', { class: 'acts', style: 'flex:none;flex-direction:column;align-items:stretch' }, el('button', { class: 'btn sm', onclick: () => openCompare(e) }, 'Compare prices'), el('button', { class: 'btn sm' + (pl ? '' : ' pri'), onclick: () => pl ? openPlanEvent(pl.id) : openPlanEvent(null, { title: e.title.replace(/ \(sample\)$/, ''), date: e.date, time: e.time, venue: e.venue, category: e.category, url: e.url, unit: e.price || cfg.prices?.[e.category] || '', ext: e.ext, source: [...new Set((e.links || [{ source: e.source }]).map((l) => l.source))].join(' + ') }) }, pl ? 'In plan' : 'Add to plan'),
        (e.links?.length ? e.links.filter((l) => l.url) : e.url ? [{ source: 'Tickets', url: e.url }] : []).map((l) => el('a', { class: 'btn sm', href: l.url, target: '_blank', rel: 'noopener' }, e.links?.length > 1 ? l.source + (l.price ? ' ' + money(l.price) : '') : 'Tickets'))))]; });
  out.replaceChildren(nearBar(), el('div', { class: 'bar', style: 'justify-content:flex-end' }, refresh), el('div', { class: 'bar' }, seg), el('div', { class: 'bar' }, q, mkSel, msel),
    evData.at ? el('p', { class: 'hint', style: 'margin:0 2px 8px' }, `Updated ${new Date(evData.at).toLocaleString('en-US')} · ${list.length} of ${all.length} events${evData.errors?.length ? ' · ' + evData.errors.join('; ') : ''}`) : null, none, rows.length ? el('div', { class: 'card' }, rows) : (all.length ? el('p', { class: 'hint' }, 'No events match.') : null));
}


// ---------------------------------------------------------------- Tickets & travel (Outlook order emails, pasted confirmations, Navan CSV), and Food & Drink
let evView = 'discover', orders = LS.get('necrm-orders', { at: 0, items: [] }), orderSeen = LS.get('necrm-orders-seen', {});
const ACCOUNTS = [['Ticketmaster', 'https://www.ticketmaster.com/member'], ['SeatGeek', 'https://seatgeek.com/account'], ['Navan', 'https://app.navan.com']];
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const vendorOf = (from, text) => { const f = (from || '').toLowerCase(), t = (text || '').toLowerCase(); return /ticketmaster|livenation/.test(f) ? 'Ticketmaster' : /seatgeek/.test(f) ? 'SeatGeek' : /navan|tripactions/.test(f) ? 'Navan' : /ticketmaster/.test(t) ? 'Ticketmaster' : /seatgeek/.test(t) ? 'SeatGeek' : /navan|tripactions/.test(t) ? 'Navan' : ''; };
function parseOrder(body, subject, from, received) { // heuristic: pulls the event, date, ticket count and total out of a confirmation; you review it before it is added
  const text = String(body || '').replace(/\r/g, '').replace(/[ \t]+/g, ' '), subj = String(subject || '').replace(/^\s*((fw|fwd|re):\s*)+/i, '').trim(), vendor = vendorOf(from, text + ' ' + subj), travel = vendor === 'Navan' || /\b(flight|hotel|itinerary|rental car|train|trip)\b/i.test(subj);
  let title = (text.match(/(?:^|\n)\s*(?:event|show|game|performance|artist)\s*:?\s*\n?\s*([^\n]{4,90})/i) || [])[1]?.trim();
  if (!title) title = subj.replace(/\b(your )?(order |booking |ticket |purchase )?(confirmation|receipt|confirmed)\b\s*(for|of|:|-|–)?/ig, '').replace(/\b(is|are|has been) confirmed\b/ig, '').replace(/^\s*(order|tickets?)\s*(for|:|-)\s*/i, '').replace(/^[\s:\-–|#\d]+|[\s:\-–|]+$/g, '').trim() || subj;
  let date = '', time = ''; const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:[^\n]{0,20}?(\d{1,2}:\d{2}\s*[ap]\.?m))?/ig; let m;
  while ((m = re.exec(text))) { if (/order|purchas|placed|booked on|ordered|transaction|receipt/i.test(text.slice(Math.max(0, m.index - 28), m.index))) continue; date = `${m[3]}-${pad2(MON[m[1].toLowerCase()])}-${pad2(m[2])}`; if (m[4]) { const t = /(\d{1,2}):(\d{2})\s*([ap])/i.exec(m[4]); let h = Number(t[1]) % 12 + (t[3].toLowerCase() === 'p' ? 12 : 0); time = `${pad2(h)}:${t[2]}`; } break; }
  const lab = text.match(/(?:order total|grand total|total (?:charged|paid|amount|cost|price)|amount (?:paid|charged)|total)\D{0,25}\$\s?([\d,]+(?:\.\d{2})?)/i), all = [...text.matchAll(/\$\s?([\d,]+(?:\.\d{2})?)/g)].map((x) => Number(x[1].replace(/,/g, ''))), total = lab ? Number(lab[1].replace(/,/g, '')) : all.length ? Math.max(...all) : 0;
  const qm = text.match(/(\d+)\s*(?:x\s*)?(?:general admission |adult )?(?:tickets?|seats?)\b/i) || text.match(/(?:qty|quantity)\D{0,5}(\d+)/i);
  return { vendor, title: title.slice(0, 120), date, time, qty: travel ? 1 : Number(qm?.[1]) || '', total, travel, guessed: !lab && total > 0, received: (received || '').slice(0, 10) };
}
const isOrderMail = (subject) => /order|confirm|receipt|ticket|itinerary|booking|trip|you'?re going/i.test(subject || '') && !/\b(sale|presale|pre-sale|% off|don'?t miss|deals?|newsletter|rate your|on sale now|just announced)\b/i.test(subject || '');
function orderSeed(o, ext, url) { const cat = o.travel ? 'Conferences & travel' : evCat(o.title);
  return { title: o.title, date: o.date || o.received || '', time: o.time || '', venue: '', category: cat, etype: o.travel ? 'Travel' : defaultEType(cat), status: 'Booked', qty: o.qty || (o.travel ? 1 : 2), unit: '', actual: o.total || '', url: url || '', ext, source: o.vendor ? o.vendor + ' order' : 'Order', notes: o.vendor ? `Imported from a ${o.vendor} confirmation. Check the details.` : '' }; }
function findPlanMatch(o, ext) { // a booking email for a game already in the plan should update it, not add a second copy
  const t = norm(o.title), d = o.date || ''; return plan.events.find((e) => e.status !== 'Cancelled' && (e.ext === ext || (d && e.date === d && ((teamIn(o.title) && teamIn(o.title) === teamIn(e.title)) || (t.length > 3 && (norm(e.title).includes(t) || t.includes(norm(e.title))))))));
}
function openOrder(o, ext, url) { const m = findPlanMatch(o, ext), seed = orderSeed(o, ext, url); if (!m) return openPlanEvent(null, seed); const { title, venue, category, ext: _x, ...upd } = seed; openPlanEvent(m.id, { ...upd, ext: m.ext || ext, notes: m.notes ? m.notes + '\n' + seed.notes : seed.notes }); }
async function scanOrders() {
  track('orders_scanned');
  if (!ms.connected()) return say('Connect Outlook first (Settings, or the Connect Outlook button on Today)', 'err');
  const items = []; let u = '/me/messages?$search="' + encodeURIComponent('(from:ticketmaster) OR (from:seatgeek) OR (from:navan) OR (from:tripactions)').replace(/%20/g, ' ').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%3A/g, ':') + '"&$top=50&$select=id,subject,from,receivedDateTime,body,webLink', pages = 0;
  while (u && pages++ < 3) { const j = await ms.graph(u, { Prefer: 'outlook.body-content-type="text"' }); for (const m of j.value || []) { if (!isOrderMail(m.subject)) continue; const from = m.from?.emailAddress?.address || '', o = parseOrder(m.body?.content, m.subject, from, m.receivedDateTime); if (!o.vendor || (!o.total && !o.date)) continue; if (o.date && !o.date.startsWith(String(plan.year))) continue; items.push({ id: m.id, subject: m.subject, from, link: m.webLink, ...o }); } u = j['@odata.nextLink']; }
  orders = { at: Date.now(), items }; LS.set('necrm-orders', orders); return items.length;
}
function navanRows(text) {
  const [head, ...body] = csvTable(text); if (!head) return []; const h = head.map((x) => x.trim().toLowerCase()), ix = (...p) => { for (const y of p) { const i = h.findIndex((x) => (y instanceof RegExp ? y.test(x) : x === y)); if (i >= 0) return i; } return -1; };
  const c = { date: ix('travel date', 'start date', 'departure date', 'check-in', 'check in', /depart/, /start/, /travel/, /^date/, /date/), amt: ix('total', 'total amount', 'total cost', 'amount', /total/, /amount/, /cost|price|spend/), desc: ix('trip name', 'description', 'merchant', 'vendor', /trip/, /desc|merchant|vendor|itinerary|destination/, /name/), type: ix('type', 'category', 'service', /type|category|service/), who: ix('traveler', 'traveller', 'employee', /travel|employee|passenger/) };
  const g = (r, i) => (i >= 0 ? (r[i] || '').trim() : ''), toIso = (v) => { if (!v) return ''; const m1 = /^(\d{4})-(\d{2})-(\d{2})/.exec(v), m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(v); if (m1) return m1[0]; if (m2) return `${m2[3].length === 2 ? '20' + m2[3] : m2[3]}-${pad2(m2[1])}-${pad2(m2[2])}`; const d = new Date(v); return isNaN(d) ? '' : iso(d); };
  return body.map((r) => ({ date: toIso(g(r, c.date)), amount: Number(g(r, c.amt).replace(/[^0-9.\-]/g, '')) || 0, title: [g(r, c.type), g(r, c.desc)].filter((x, i, a) => x && a.indexOf(x) === i).join(': '), who: g(r, c.who) })).filter((r) => r.amount > 0 && r.title);
}
const hash = (t) => { let x = 0; for (const ch of t) x = (x * 31 + ch.charCodeAt(0)) | 0; return (x >>> 0).toString(36); };
function previewNavan(rows, name) {
  const yr = String(plan.year), inYr = rows.filter((r) => !r.date || r.date.startsWith(yr)), fresh = inYr.filter((r) => !plan.events.some((e) => e.ext === 'navan:' + hash(r.date + r.title + r.amount))), tot = fresh.reduce((a, r) => a + r.amount, 0);
  openSheet(el('h2', {}, 'Import Navan bookings'), el('p', { class: 'hint' }, name), rows.length ? [el('div', { class: 'note' }, 'Rows read', el('small', {}, `${rows.length}${rows.length - inYr.length ? ` (${rows.length - inYr.length} outside ${yr} skipped)` : ''}`)), el('div', { class: 'note' }, 'New for the plan', el('small', {}, `${fresh.length} bookings, ${money(tot)}${inYr.length - fresh.length ? ` (${inYr.length - fresh.length} already imported)` : ''}`)),
    fresh.slice(0, 6).map((r) => el('div', { class: 'row', style: 'cursor:default;min-height:44px' }, el('div', { class: 'who' }, el('strong', {}, r.title), el('small', {}, [fmtDate(r.date), r.who].filter(Boolean).join(' · '))), el('b', {}, money(r.amount)))), fresh.length > 6 && el('p', { class: 'hint' }, `and ${fresh.length - 6} more`),
    el('p', { class: 'hint' }, 'Each becomes a Booked Travel event in the plan, counted toward the budget. Link it to a budget line afterwards.')] : el('p', {}, 'No bookings with an amount were found. Export the trips or expenses report from Navan as CSV and try again.'),
    el('div', { class: 'bar' }, fresh.length > 0 && el('button', { class: 'btn pri', onclick: () => { for (const r of fresh) plan.events.push({ id: uid(), title: r.title, date: r.date || today(), time: '', venue: '', category: 'Conferences & travel', etype: 'Travel', status: 'Booked', qty: 1, unit: '', actual: r.amount, url: '', notes: r.who ? 'Traveler: ' + r.who : '', guests: [], guestNames: [], source: 'Navan', ext: 'navan:' + hash(r.date + r.title + r.amount), lineId: '' }); savePlan(); closeSheet(); renderEvents(); say(`Added ${fresh.length} Navan bookings`); } }, `Add ${fresh.length} to the plan`), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}
function evTickets(out) {
  const spent = plan.events.filter((e) => ['Booked', 'Attended'].includes(e.status) && (e.date || '').startsWith(String(plan.year))), seen = new Set(plan.events.map((e) => e.ext).filter(Boolean)), items = (orders.items || []).filter((o) => !orderSeen[o.id]);
  const nav = el('input', { type: 'file', accept: '.csv,text/csv', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) previewNavan(navanRows(await f.text()), f.name); } });
  const paste = el('textarea', { rows: 4, placeholder: 'Paste the text of an order confirmation (Ticketmaster, SeatGeek, Navan or anything else)', style: 'width:100%' });
  const scan = el('button', { class: 'btn pri', onclick: async (ev) => { ev.currentTarget.textContent = 'Scanning…'; try { const n = await scanOrders(); say(n ? `Found ${n} order emails` : 'No order emails found for ' + plan.year); } catch (er) { say('Outlook: ' + er.message, 'err'); } renderEvents(); } }, orders.at ? 'Scan Outlook again' : 'Scan Outlook for orders');
  const card = (o) => el('div', { class: 'row', onclick: () => { orderSeen[o.id] = 1; LS.set('necrm-orders-seen', orderSeen); openOrder(o, 'mail:' + o.id, o.link); } }, el('div', { class: 'who' }, el('strong', {}, o.title), el('small', {}, [o.date && fmtDate(o.date), !o.travel && o.qty && o.qty + ' tickets', o.total && (o.guessed ? 'about ' : '') + money(o.total)].filter(Boolean).join(' · ')), el('small', {}, o.vendor + ' · ' + o.subject.slice(0, 70))),
    el('div', { class: 'acts', style: 'flex:none' }, el('button', { class: 'btn sm pri', onclick: (ev) => { ev.stopPropagation(); orderSeen[o.id] = 1; LS.set('necrm-orders-seen', orderSeen); openOrder(o, 'mail:' + o.id, o.link); } }, 'Review and add'), el('button', { class: 'btn sm', onclick: (ev) => { ev.stopPropagation(); orderSeen[o.id] = 1; LS.set('necrm-orders-seen', orderSeen); renderEvents(); } }, 'Ignore')));
  out.replaceChildren(
    navanInboxCard(), navanHistoryCard(), el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Bring in your bookings'), el('p', { class: 'hint' }, 'Ticketmaster, SeatGeek and Navan do not let outside apps read an individual account, so bookings come in from the confirmation emails you already receive, or from a Navan export.'),
      el('div', { class: 'bar' }, scan, ms.connected() ? null : el('span', { class: 'hint' }, 'Needs Outlook connected'), el('button', { class: 'btn', onclick: () => nav.click() }, 'Import Navan CSV'), nav, el('button', { class: 'btn', title: 'Reads ticket purchases from your Navan card', onclick: openNavanPull }, 'Pull Navan card transactions')), ACCOUNTS.length && el('div', { class: 'bar' }, el('span', { class: 'hint' }, 'Open your account:'), ACCOUNTS.map(([n, u]) => el('a', { class: 'btn sm', href: u, target: '_blank', rel: 'noopener' }, n)))),
    items.length ? el('div', {}, el('div', { class: 'sec-h' }, el('h2', {}, 'Found in Outlook'), el('span', { class: 'hint' }, 'Check the details before adding')), el('div', { class: 'card' }, items.map(card))) : null,
    el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Paste a confirmation'), paste, el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: () => { if (!paste.value.trim()) return say('Paste the confirmation text first', 'err'); const t = paste.value, first = t.split('\n').find((l) => l.trim()) || ''; const o = parseOrder(t, first, '', today()); openOrder(o, 'paste:' + hash(t), ''); } }, 'Read it'))),
    el('div', { class: 'sec-h' }, el('h2', {}, `Booked and attended in ${plan.year}`), el('span', { class: 'hint' }, `${spent.length} events · ${money(spent.reduce((a, e) => a + evCost(e), 0))}`)),
    spent.length ? el('div', { class: 'card' }, spent.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((e) => el('div', { class: 'row', onclick: () => openPlanEvent(e.id) }, el('div', { class: 'who' }, el('strong', {}, e.title), el('small', {}, [fmtDate(e.date), e.venue, e.status].filter(Boolean).join(' · ')), el('div', {}, e.source && el('span', { class: 'chip' }, e.source), e.lineId && plan.budget.lines.find((l) => l.id === e.lineId) ? el('span', { class: 'chip' }, plan.budget.lines.find((l) => l.id === e.lineId).name) : el('span', { class: 'chip', style: 'color:var(--alert)' }, 'No budget line'))), el('b', { style: 'font-weight:500' }, money(evCost(e)))))) : el('p', { class: 'hint' }, 'Nothing booked yet. Add events from Discover, or bring in your bookings above.'));
}

// ---- Food & Drink: nearby places from OpenStreetMap (no key); ranked by how complete and established each listing is, not by reviews
const FOOD_CATS = { Restaurants: '["amenity"="restaurant"]', 'Bars and pubs': '["amenity"~"^(bar|pub)$"]', 'Coffee and breakfast': '["amenity"="cafe"]', Steakhouses: '["amenity"="restaurant"]["cuisine"~"steak",i]' };
let food = LS.get('necrm-food', { loc: 'nyc', q: '', cat: 'Restaurants', mi: 1 }), foodRes = null;
const miles = (a, b) => { const R = 3958.8, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
function scorePlace(t) { let sc = 0; if (t.wikidata || t.wikipedia) sc += 3; if (t.stars || /michelin/i.test(Object.keys(t).join(' '))) sc += 3; if (t.website || t['contact:website']) sc += 1; if (t.phone || t['contact:phone']) sc += 1; if (t.opening_hours) sc += 1; if (t.cuisine) sc += 1; if (/yes|required|recommended/i.test(t.reservation || '')) sc += 1; if (t.outdoor_seating === 'yes') sc += 0.5; if (t.wheelchair === 'yes') sc += 0.5; if (t['addr:street']) sc += 0.5; return sc; }
async function foodSearch(pt, cat, radiusMi) {
  track('food_search', { category: cat, miles: radiusMi });
  const R = Math.round(radiusMi * 1609), flt = FOOD_CATS[cat], q = `[out:json][timeout:25];(node${flt}["name"](around:${R},${pt.lat},${pt.lng});way${flt}["name"](around:${R},${pt.lat},${pt.lng}););out center tags 300;`;
  let j, err; for (const base of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) { try { const r = await fetch(base, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (!r.ok) throw new Error('HTTP ' + r.status); j = await r.json(); break; } catch (e) { err = e; } }
  if (!j) throw new Error('Could not reach the places service (' + (err?.message || 'offline') + '). Try again in a minute.');
  const seen = new Set();
  return (j.elements || []).map((e) => { const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon; return { name: t.name, t, lat, lng, d: lat == null ? 99 : miles(pt, { lat, lng }), score: scorePlace(t) }; })
    .filter((p) => p.name && p.lat != null && !seen.has(norm(p.name)) && seen.add(norm(p.name))).map((p) => ({ ...p, rank: p.score - p.d * 0.6 })).sort((a, b) => b.rank - a.rank).slice(0, 10);
}
async function resolveFood() {
  if (food.q.trim()) { const p = await geocode(food.q.trim()); if (!p) throw new Error('Could not find "' + food.q.trim() + '". Try a street address or a venue and city.'); return { ...p, label: food.q.trim() }; }
  if (food.loc === 'geo') { const p = await new Promise((res, rej) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((x) => res({ lat: x.coords.latitude, lng: x.coords.longitude }), () => rej(new Error('Location is blocked. Allow location access or type an address.')), { timeout: 10000 }) : rej(new Error('This device cannot share its location.'))); return { ...p, label: 'your location' }; }
  if (food.loc.startsWith('ev:')) { const e = plan.events.find((x) => x.id === food.loc.slice(3)); if (!e?.venue) throw new Error('That event has no venue.'); const p = await geocode(e.venue); if (!p) throw new Error('Could not find ' + e.venue); return { ...p, label: e.venue }; }
  const m = MARKETS.find((x) => x.k === food.loc) || MARKETS[0]; return { lat: m.ll[0], lng: m.ll[1], label: m.n };
}
const evVenues = () => plan.events.filter((e) => e.venue && (e.date || '') >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
function evFood(out) {
  const save = () => LS.set('necrm-food', food), sel = (k, opts) => { const s = el('select', { onchange: (e) => { food[k] = k === 'mi' ? Number(e.target.value) : e.target.value; if (k === 'loc') food.q = ''; save(); renderEvents(); } }, opts.map(([v, l]) => el('option', { value: v }, l))); s.value = String(food[k]); return s; };
  const locSel = sel('loc', [...MARKETS.map((m) => [m.k, m.n + ' (center)']), ['geo', 'Near me'], ...evVenues().map((e) => ['ev:' + e.id, `Near ${e.title.slice(0, 32)} (${fmtDate(e.date)})`])]);
  const q = el('input', { placeholder: 'Or type an address, venue or neighborhood', value: food.q, style: 'flex:1 1 240px', onchange: (e) => { food.q = e.target.value; save(); } }), go = async (ev) => { ev.currentTarget.textContent = 'Searching…'; save(); try { const pt = await resolveFood(); foodRes = { pt, cat: food.cat, mi: food.mi, list: await foodSearch(pt, food.cat, food.mi) }; } catch (er) { foodRes = null; say(er.message, 'err'); } renderEvents(); };
  const cardRow = (p, i) => { const cuisine = (p.t.cuisine || '').split(';').map((x) => x.replace(/_/g, ' ')).join(', '), addr = [p.t['addr:housenumber'], p.t['addr:street']].filter(Boolean).join(' '), city = p.t['addr:city'] || '', web = p.t.website || p.t['contact:website'], phone = p.t.phone || p.t['contact:phone'];
    return el('div', { class: 'row', style: 'align-items:flex-start;cursor:default' }, el('div', { class: 'dt', style: 'min-width:32px' }, el('b', {}, i + 1)), el('div', { class: 'who' }, el('strong', {}, p.name), el('small', {}, [cuisine, addr, `${p.d.toFixed(1)} mi`].filter(Boolean).join(' · ')), p.t.opening_hours && el('small', {}, 'Hours: ' + p.t.opening_hours.slice(0, 70)),
      el('div', {}, p.t.reservation && el('span', { class: 'chip' }, 'Reservations ' + p.t.reservation), p.t.outdoor_seating === 'yes' && el('span', { class: 'chip' }, 'Outdoor seating'), (p.t.wikidata || p.t.wikipedia) && el('span', { class: 'chip' }, 'Well known')),
      el('div', { class: 'acts', style: 'margin-top:6px;flex-wrap:wrap' }, el('a', { class: 'btn sm', target: '_blank', rel: 'noopener', href: `https://www.yelp.com/search?find_desc=${encodeURIComponent(p.name)}&find_loc=${encodeURIComponent(city || foodRes.pt.label)}` }, 'Reviews'), el('a', { class: 'btn sm', target: '_blank', rel: 'noopener', href: `https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}` }, 'Directions'), web && el('a', { class: 'btn sm', target: '_blank', rel: 'noopener', href: web }, 'Website'), phone && el('a', { class: 'btn sm', href: 'tel:' + phone.replace(/[^+\d]/g, '') }, phone),
        el('button', { class: 'btn sm pri', onclick: () => openPlanEvent(null, { title: p.name, venue: [p.name, addr, city].filter(Boolean).join(', '), category: 'Dining', etype: food.cat === 'Coffee and breakfast' ? 'One-on-One' : 'Closing Dinner', status: 'Idea', qty: 4, unit: 100, time: food.cat === 'Coffee and breakfast' ? '08:30' : '19:00', source: 'Food & Drink', url: web || '' }) }, 'Add to plan')))); };
  out.replaceChildren(el('div', { class: 'panel', style: 'max-width:none' }, el('h2', {}, 'Top 10 places to eat and drink'), el('div', { class: 'f' }, el('label', {}, 'Where'), locSel), el('div', { class: 'bar', style: 'margin:0 0 8px' }, q), el('div', { class: 'bar', style: 'margin:0' }, el('div', { class: 'seg' }, Object.keys(FOOD_CATS).map((c) => el('button', { class: food.cat === c ? 'on' : '', onclick: () => { food.cat = c; save(); renderEvents(); } }, c))), sel('mi', [[0.5, 'Within 0.5 mi'], [1, 'Within 1 mi'], [2, 'Within 2 mi'], [5, 'Within 5 mi']]), el('button', { class: 'btn pri', onclick: go }, 'Find top 10'))),
    foodRes ? el('div', {}, el('p', { class: 'hint', style: 'margin:0 2px 8px' }, `${foodRes.list.length} ${foodRes.cat.toLowerCase()} within ${foodRes.mi} mi of ${foodRes.pt.label}. Places are ranked from OpenStreetMap by how well established and complete each listing is (landmark status, hours, reservations, contact details) and by distance. They are not ranked by reviews. Use Reviews to check Yelp before you book.`), foodRes.list.length ? el('div', { class: 'card' }, foodRes.list.map(cardRow)) : el('p', { class: 'hint' }, 'Nothing found. Try a wider radius.')) : el('p', { class: 'hint' }, 'Pick a market, an event venue or an address, then tap Find top 10.'));
}

// ---- Compare prices: SeatGeek resale stats and Ticketmaster price range for one event, side by side, with links to buy.
// The public APIs give price statistics and the lowest listing, not seat-by-seat inventory, so "best seats" are picked on the ticketing site itself.
const priceOf = (n) => (Number(n) > 0 ? Number(n) : 0);
async function sgPrices(ev) {
  const lk = (ev.links || []).find((l) => l.source === 'SeatGeek'), id = /^sg:(\d+)/.exec(lk?.id || ev.ext || '')?.[1]; let e;
  if (id) e = await jget(`https://api.seatgeek.com/2/events/${id}?` + new URLSearchParams({ client_id: cfg.sgId }));
  else { const j = await jget('https://api.seatgeek.com/2/events?' + new URLSearchParams({ client_id: cfg.sgId, q: ev.title.replace(/\s*\(sample\)$/, ''), 'datetime_local.gte': ev.date + 'T00:00:00', 'datetime_local.lte': ev.date + 'T23:59:59', per_page: '3' })); e = j.events?.[0]; }
  if (!e) return { source: 'SeatGeek', none: 'No SeatGeek listing found for this event.' };
  const st = e.stats || {}; return { source: 'SeatGeek', kind: 'Resale market', url: e.url, low: priceOf(st.lowest_price), median: priceOf(st.median_price), avg: priceOf(st.average_price), high: priceOf(st.highest_price), listings: st.listing_count || 0, title: e.title };
}
async function tmPrices(ev) {
  const lk = (ev.links || []).find((l) => l.source === 'Ticketmaster'), id = /^tm:(.+)/.exec(lk?.id || ev.ext || '')?.[1]; let e;
  if (id) e = await jget(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(id)}.json?` + new URLSearchParams({ apikey: cfg.tmKey }));
  else { const j = await jget('https://app.ticketmaster.com/discovery/v2/events.json?' + new URLSearchParams({ apikey: cfg.tmKey, keyword: ev.title.replace(/\s*\(sample\)$/, ''), startDateTime: ev.date + 'T00:00:00Z', endDateTime: ev.date + 'T23:59:59Z', size: '3' })); e = j._embedded?.events?.[0]; }
  if (!e) return { source: 'Ticketmaster', none: 'No Ticketmaster listing found for this event.' };
  const prs = e.priceRanges || [], std = prs.find((p) => p.type === 'standard') || prs[0] || {}; return { source: 'Ticketmaster', kind: 'Face value (official)', url: e.url, low: priceOf(std.min), high: priceOf(std.max), title: e.name };
}
async function comparePrices(ev) {
  const jobs = [];
  if (cfg.sgId) jobs.push(sgPrices(ev).catch((er) => ({ source: 'SeatGeek', none: 'SeatGeek: ' + er.message }))); if (cfg.tmKey) jobs.push(tmPrices(ev).catch((er) => ({ source: 'Ticketmaster', none: 'Ticketmaster: ' + er.message })));
  const rows = await Promise.all(jobs), have = rows.filter((r) => r.low), best = have.length ? Math.min(...have.map((r) => r.low)) : 0; rows.forEach((r) => { r.best = !!r.low && r.low === best && have.length > 1; }); return rows;
}
function openCompare(ev) {
  const q = ev.title.replace(/\s*\(sample\)$/, ''), out = el('div', {}, el('p', { class: 'hint' }, 'Checking SeatGeek and Ticketmaster…')), searchLink = (n, u) => el('a', { class: 'btn sm', href: u, target: '_blank', rel: 'noopener' }, 'Search ' + n);
  const paint = (rows) => out.replaceChildren(
    rows.length ? rows.map((r) => r.none ? el('div', { class: 'note' }, r.source, el('small', {}, r.none)) : el('div', { class: 'card', style: 'padding:12px 14px;margin:0 0 10px' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0 0 6px' }, el('b', {}, r.source), el('span', {}, r.best ? el('span', { class: 'chip', style: 'background:var(--go);color:#fff' }, 'Cheapest') : null, el('span', { class: 'chip' }, r.kind))),
      el('div', { style: 'display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px' }, [['Lowest', r.low], ['Median', r.median], ['Average', r.avg], ['Highest', r.high]].filter(([, v]) => v).map(([l, v]) => el('div', {}, el('div', { style: 'font:500 22px "Clash Display",Arial' }, money(v)), el('small', { class: 'hint' }, l))), r.listings ? el('div', {}, el('div', { style: 'font:500 22px "Clash Display",Arial' }, r.listings), el('small', { class: 'hint' }, 'Listings')) : null),
      el('div', { class: 'acts' }, r.url && el('a', { class: 'btn sm pri', href: r.url, target: '_blank', rel: 'noopener' }, `Pick seats on ${r.source}`), r.low ? el('button', { class: 'btn sm', onclick: () => { closeSheet(); openPlanEvent(null, { title: q, date: ev.date, time: ev.time, venue: ev.venue, category: ev.category, url: r.url || ev.url, unit: r.low, ext: ev.ext, source: r.source }); } }, `Add to plan at ${money(r.low)}`) : null))) : el('p', { class: 'hint' }, 'Add a SeatGeek client ID and a Ticketmaster key in Settings to compare live prices.'),
    el('div', { class: 'bar' }, !cfg.sgId && searchLink('SeatGeek', 'https://seatgeek.com/search?search=' + encodeURIComponent(q)), !cfg.tmKey && searchLink('Ticketmaster', 'https://www.ticketmaster.com/search?q=' + encodeURIComponent(q))),
    el('p', { class: 'hint' }, 'SeatGeek shows resale prices; Ticketmaster shows the official face-value range (resale appears on its event page). Their public data gives price ranges, not seat-by-seat listings, so choose the exact seats on the site. Prices can exclude fees until checkout.'));
  openSheet(el('h2', {}, 'Compare prices'), el('p', { style: 'margin:0 0 10px' }, el('b', {}, q), el('br'), el('small', { class: 'hint' }, [fmtDate(ev.date, true), ev.venue].filter(Boolean).join(' · '))), out, el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: closeSheet }, 'Close')));
  track('prices_compared'); if (!cfg.sgId && !cfg.tmKey) paint([]); else comparePrices(ev).then(paint).catch((er) => out.replaceChildren(el('div', { class: 'err' }, er.message)));
}
function renderEvents() { tab = 'plan'; planView = 'find'; renderPlan(); }

// ---------------------------------------------------------------- settings
function renderSettings() {
  const cols = data.contacts?.columns || [], colSel = (types, cur) => { const s = el('select', {}, el('option', { value: '' }, 'Detect automatically'), cols.filter((c) => types.includes(c.type)).map((c) => el('option', { value: c.id }, `${c.title || c.id} (${c.type})`))); s.value = cur || ''; return s; };
  const hint = (t) => el('p', { class: 'hint', style: 'margin-top:-4px' }, t), num = (v, ph) => el('input', { type: 'number', inputMode: 'numeric', value: v ?? '', placeholder: ph });
  const f = { token: el('input', { type: 'password', value: cfg.token, placeholder: 'Monday API token', autocomplete: 'off' }), boardId: el('input', { value: cfg.boardId, inputMode: 'numeric' }),
    nextColumn: colSel(['date'], cfg.nextColumn), lastColumn: colSel(['date'], cfg.lastColumn), hour: el('select', {}, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h) => el('option', { value: h }, `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`))),
    closedColumn: colSel(['numbers', 'status', 'dropdown', 'checkbox', 'text'], cfg.closedColumn), addressColumn: colSel(['long_text', 'text', 'location'], cfg.addressColumn), officeColumn: colSel(['text', 'long_text', 'location'], cfg.officeColumn), pocColumn: colSel(['people', 'dropdown', 'text'], cfg.pocColumn),
    autoOutlook: (() => { const g = el('select', {}, el('option', { value: '' }, 'Off'), el('option', { value: '1' }, 'On')); g.value = cfg.autoOutlook ? '1' : ''; return g; })(), year: num(plan.year, '2027'), bdGroup: (() => { const g = el('select', {}, el('option', { value: '' }, 'Detect (Business Development)'), (data.contacts?.groups || []).map((x) => el('option', { value: x.id }, x.title))); g.value = cfg.bdGroup || ''; return g; })(), bdExclude: el('input', { value: cfg.bdExclude, placeholder: 'campaign' }), tmKey: el('input', { value: cfg.tmKey, placeholder: 'Optional: Ticketmaster API key', autocomplete: 'off' }), sgId: el('input', { value: cfg.sgId, placeholder: 'Optional: SeatGeek client ID', autocomplete: 'off' }), espn: el('select', {}, el('option', { value: '1' }, 'On'), el('option', { value: '' }, 'Off')),
    phKey: el('input', { value: cfg.phKey, placeholder: 'Optional: PostHog project API key', autocomplete: 'off' }), phHost: (() => { const g = el('select', {}, el('option', { value: 'https://us.i.posthog.com' }, 'US cloud'), el('option', { value: 'https://eu.i.posthog.com' }, 'EU cloud'), el('option', { value: 'custom' }, 'Self-hosted (use the key field URL below)')); g.value = ['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(cfg.phHost) ? cfg.phHost : 'custom'; return g; })(), phCustom: el('input', { value: ['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(cfg.phHost) ? '' : cfg.phHost, placeholder: 'https://posthog.yourcompany.com' }),
    msClientId: el('input', { value: cfg.msClientId, placeholder: 'Optional: Azure app (client) ID' }) }; f.hour.value = cfg.hour || 9; f.espn.value = cfg.espn ? '1' : '';
  const mkBox = Object.fromEntries(MARKETS.map((m) => [m.k, el('input', { type: 'checkbox', checked: (cfg.markets || []).includes(m.k), style: 'width:auto;margin:0' })]));
  const tiers = data.contacts?.roles.tier?.labels?.map((l) => l.label) || ['Tier 1', 'Tier 2', 'Not Active'], cad = Object.fromEntries(tiers.map((t) => [t, num((cfg.cadence || {})[t], String(cadenceFor({ tier: t })))])), prices = Object.fromEntries(['Sports', 'Concerts', 'Comedy'].map((k) => [k, num(cfg.prices?.[k], '')]));
  const notifOn = 'Notification' in window && Notification.permission === 'granted' && cfg.notify;
  $('#view').replaceChildren(el('div', { class: 'panel' }, el('h2', {}, 'Monday connection'), el('label', {}, 'Monday API token'), f.token, hint('Monday: profile menu > Developers > My access tokens. Stored only in this browser. Revoke it if the device is lost.'), location.protocol === 'file:' && el('div', { class: 'err', style: 'margin:6px 0 10px' }, 'This page was opened as a file on your device. Some browsers forget saved settings (token, plan, follow-up dates) when a page is opened this way. For reliable use, host the file at a web address (for example GitHub Pages) and open it from there.'), el('label', {}, 'Contacts board ID'), f.boardId),
    el('div', { class: 'panel' }, el('h2', {}, 'Follow-ups and reminders'), hint(cols.length ? 'Date columns on the Monday board that hold follow-up dates. Without them, dates stay on this device.' : 'Connect first; then pick the columns here.'),
      el('label', {}, 'Next follow-up column'), f.nextColumn, el('label', {}, 'Last contact column'), f.lastColumn, cols.length && !hasShared() && el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: createFollowUpColumns }, 'Add the missing columns to the board')),
      el('label', {}, 'Follow-up cadence (days between touches)'), hint('Automatic rule: after you log an activity, the next follow-up is set this many days out. 0 turns it off for that tier.'), tiers.map((t) => el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('span', { style: 'flex:0 0 130px;font-size:13px' }, t), cad[t]).valueOf()),
      el('label', {}, 'Calendar events start at'), f.hour, el('label', {}, 'Add new follow-ups and booked events to my Outlook calendar automatically'), f.autoOutlook, hint('Needs Outlook connected. Each is added once; Outlook then shows it with a 15-minute reminder.'), el('label', {}, 'Device alerts'), el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: enableNotifications }, notifOn ? 'Alerts are on (tap to re-check)' : 'Turn on device alerts')), hint('Alerts appear while this app is open. Calendar buttons give reminders that work even when it is closed.')),
    el('div', { class: 'panel' }, el('h2', {}, 'Insights columns'), el('label', {}, 'Faropoint POC column'), f.pocColumn, hint('The People column naming who at Faropoint covers the relationship. The first person listed is the main POC.'), el('label', {}, 'Closed deals column'), f.closedColumn, hint('A number of deals, or a Yes/status/checkbox, marking contacts we have closed with.'), el('label', {}, 'Office address column'), f.officeColumn, hint('Where each contact\'s office is. Shown as a pin on the map beside Contacts.'), el('label', {}, 'Closed buildings column'), f.addressColumn, hint('Addresses of buildings closed with the contact, one per line (or separated by semicolons). Shown as pins on the map and in Insights.'),
      cols.length && !(data.contacts.roles.office && data.contacts.roles.address) && el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: createAddressColumns }, 'Add the missing address columns to the board'))),
    el('div', { class: 'panel' }, el('h2', {}, 'Business Development events'), el('label', {}, 'Group with your initiatives'), f.bdGroup, hint('Each item in this group is an initiative; its subitems are the events (attended when the status is Done).'),
      el('label', {}, 'Skip initiatives whose name matches'), f.bdExclude, hint('"campaign" skips Broker Campaigns, whose subitems are broker targets rather than events.')),
    el('div', { class: 'panel' }, el('h2', {}, 'Plan and events feed'), el('label', {}, 'Plan year'), f.year, el('label', {}, 'Markets you cover'), el('div', { class: 'sec', style: 'margin-bottom:8px' }, MARKETS.map((m) => el('label', { style: 'display:inline-flex;align-items:center;gap:6px;margin:0 14px 6px 0;font-weight:400' }, mkBox[m.k], m.n))), el('label', {}, 'Team schedules for those markets (no key needed)'), f.espn,
      el('label', {}, 'Ticketmaster API key'), f.tmKey, hint('Free at developer.ticketmaster.com. Adds concerts, comedy and other events in your markets (5,000 requests a day).'), el('label', {}, 'SeatGeek client ID'), f.sgId, hint('Free at seatgeek.com/build. Adds SeatGeek prices and ticket links next to Ticketmaster for the same event.'),
      el('label', {}, 'Default ticket price when the feed has none ($)'), ['Sports', 'Concerts', 'Comedy'].map((k) => el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('span', { style: 'flex:0 0 130px;font-size:13px' }, k), prices[k]))),
    el('div', { class: 'panel' }, el('h2', {}, 'Usage analytics (PostHog)'), el('label', {}, 'Project API key'), f.phKey, hint('From PostHog: Project settings > Project API key (starts with phc_). This is the public ingestion key, not a personal API key. Leave blank to turn analytics off.'), el('label', {}, 'Region'), f.phHost, el('label', {}, 'Self-hosted URL'), f.phCustom,
      hint('Only event names and counts are sent (screens viewed, activities logged, events saved). No contact names, phone numbers, emails, search text or Monday data. Not sent in sample mode or when the browser has Do Not Track on.')),
    el('div', { class: 'panel' }, el('h2', {}, 'Optional'), el('label', {}, 'Outlook: Azure client ID'), f.msClientId, hint('Azure app type "Single-page application", redirect URI = this page\'s https address, delegated permissions Contacts.Read, Mail.Read, Calendars.ReadWrite, User.Read, offline_access (keeps you signed in). Mirrors your Outlook calendar into Today and Calendar.'), hint('The map uses OpenStreetMap, so no map key is needed.')),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: async () => {
      const v = Object.fromEntries(['token', 'boardId', 'nextColumn', 'lastColumn', 'closedColumn', 'addressColumn', 'pocColumn', 'tmKey', 'sgId', 'msClientId', 'bdGroup', 'bdExclude', 'officeColumn'].map((k) => [k, f[k].value.trim()]));
      cfg = { ...cfg, ...v, phKey: f.phKey.value.trim(), phHost: f.phHost.value === 'custom' ? (f.phCustom.value.trim() || 'https://us.i.posthog.com') : f.phHost.value, markets: MARKETS.filter((m) => mkBox[m.k].checked).map((m) => m.k), autoOutlook: !!f.autoOutlook.value, hour: Number(f.hour.value) || 9, espn: !!f.espn.value, cadence: Object.fromEntries(Object.entries(cad).filter(([, i]) => i.value !== '').map(([t, i]) => [t, Number(i.value)])), prices: Object.fromEntries(Object.entries(prices).map(([k, i]) => [k, Number(i.value) || DEFAULTS.prices[k]])) };
      LS.set('necrm-cfg', cfg); if (f.year.value) { plan.year = Number(f.year.value) || plan.year; savePlan(); } demo = false; tab = 'today'; render(); await load(); } }, 'Save and connect'),
      el('button', { class: 'btn', onclick: startDemo }, 'Preview with sample data'), el('button', { class: 'btn', onclick: () => { if (confirm('Remove token, settings, plan and cached data from this device?')) { localStorage.clear(); location.reload(); } } }, 'Sign out and clear')));
}

// ---------------------------------------------------------------- UI upgrades: colour coding, firm offices and map filters, calendar rules, Business Development sub-tabs, Insights, Vcards
const tierCls = (t) => (/tier\s*1/i.test(t || '') ? 't1' : /tier\s*2/i.test(t || '') ? 't2' : /tier\s*3/i.test(t || '') ? 't3' : /not active|do not call/i.test(t || '') ? 'tx' : 'tn');
const TIER_COLOR = { t1: '#F59E0B', t2: '#2F6FEB', t3: '#6B7A8C', tx: '#B8C0CA', tn: '#9AA5B1' };
const TIER_NAME = { t1: 'Tier 1', t2: 'Tier 2', t3: 'Tier 3', tx: 'Inactive', tn: 'No tier' };
const KIND_COLOR = { Leasing: '#16A36A', 'Capital Markets': '#7C4DDB', Principal: '#1B2A3A', Vendor: '#0E8A9A', Research: '#8A6D3B', Other: '#8793A1' };
const KINDS = ['Leasing', 'Capital Markets', 'Principal', 'Vendor'];
const grpTitle = (c) => (c.group && c.group.title) || '';
function kindOf(c) { // segment used for colour coding; derived from the Primary Value label and the board group
  const s = (c.specialty || '').toLowerCase(), g = grpTitle(c).toLowerCase();
  if (/vendor|service provider|attorney|legal|engineer|inspection|contractor|architect|consultant/.test(s + ' ' + g)) return 'Vendor';
  if (/principal|peer/.test(g) || /developer|family office|investment manager|public reit|principal|owner/.test(s)) return 'Principal';
  if (/leasing/.test(s)) return 'Leasing';
  if (/capital markets|investment sales|net lease|debt|equity|street broker/.test(s)) return 'Capital Markets';
  if (/research/.test(s)) return 'Research';
  return 'Other';
}
const chipC = (txt, color, cls = '') => el('span', { class: 'chip cc ' + cls, style: `background:${color}` }, txt);
const tierChip = (c) => (c.tier ? chipC(c.tier, TIER_COLOR[tierCls(c.tier)], tierCls(c.tier) === 't1' ? 'dk' : '') : null);
const kindChip = (c) => { const k = kindOf(c); return k === 'Other' ? null : chipC(k === 'Principal' ? 'Principal' : k, KIND_COLOR[k]); };
const phoneLink = (c) => (c.phone ? el('a', { class: 'plink', href: telHref(c.phone), title: 'Call with your computer (Bluetooth or Phone Link)', onclick: (e) => e.stopPropagation() }, fmtPhone(c.phone)) : null);

// ---- firm offices: one address per firm gives every contact at that firm a map pin; a contact's own office address wins
const firmKey = (n) => (n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const firmOffices = () => (firmOffices.c ||= LS.get('necrm-firm-office', {}));
const officeOf = (c) => c.office || firmOffices()[firmKey(c.company)] || '';
const MARKET_PT = { 'Greater Philadelphia': [39.9526, -75.1652], 'Northern NJ': [40.8, -74.1], 'Central NJ': [40.45, -74.45], 'Northern & Central NJ': [40.6, -74.3], Baltimore: [39.2904, -76.6122], 'Greater New York': [40.7549, -73.984], 'NYC Boroughs': [40.7306, -73.9352], 'Tri-State Area': [40.75, -74.0], Boston: [42.3601, -71.0589], 'Long Island': [40.79, -73.2], 'Lehigh Valley': [40.6, -75.47], 'Washington D.C.': [38.9072, -77.0369], NoVA: [38.88, -77.17], Connecticut: [41.3, -72.9], 'Lower Hudson Valley': [41.1, -73.8], 'Mid-Atlantic': [39.5, -76.4] };
const hash01 = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return (h >>> 0) % 1000 / 1000; };
const approxPt = (c) => { const p = MARKET_PT[c.market]; return p ? [p[0] + (hash01(c.id + 'a') - 0.5) * 0.07, p[1] + (hash01(c.id + 'b') - 0.5) * 0.09] : null; };
const mapF = { tiers: new Set(), kinds: new Set(), market: '', approx: true };
const mapList = (list) => list.filter((c) => (!mapF.tiers.size || mapF.tiers.has(tierCls(c.tier))) && (!mapF.kinds.size || mapF.kinds.has(kindOf(c))) && (!mapF.market || c.market === mapF.market));
const firmExtra = () => (firmExtra.c ||= LS.get('necrm-firm-extra', {}));   // firms or places added by hand: key -> display name
// ---- map styles: the standard OpenStreetMap map, a light fallback, and an optional provider set at build time (for example by FaroMaker): VITE_MAP_TILE_URL and VITE_MAP_ATTRIBUTION
const ENV_TILE = import.meta.env.VITE_MAP_TILE_URL || '';
const TILE_STYLES = { ...(ENV_TILE ? { platform: { name: 'Platform map', url: ENV_TILE, attr: import.meta.env.VITE_MAP_ATTRIBUTION || '', sub: 'abc' } } : {}),
  osm: { name: 'Standard', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors', sub: 'abc' },
  light: { name: 'Light', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attr: '&copy; OpenStreetMap contributors &copy; CARTO', sub: 'abcd' } };
const mapNote = el('div', { class: 'err', style: 'margin:0 0 8px', hidden: true });
let tileL = null, mapStyle = LS.get('necrm-map-style', ENV_TILE ? 'platform' : 'osm'), tileGood = 0, tileBad = 0;
if (!TILE_STYLES[mapStyle]) mapStyle = Object.keys(TILE_STYLES)[0];
function setTileLayer(k) { // swaps the base map; reports honestly when tiles cannot be reached
  if (!cmap || !TILE_STYLES[k]) return; mapStyle = k; LS.set('necrm-map-style', k); tileGood = 0; tileBad = 0; if (tileL) cmap.removeLayer(tileL); const s = TILE_STYLES[k];
  tileL = L.tileLayer(s.url, { maxZoom: 19, subdomains: s.sub, attribution: s.attr }).addTo(cmap); tileL.bringToBack();
  tileL.on('tileload', () => { tileGood++; mapNote.hidden = true; });
  const sel = document.querySelector('.mapf select[title="Map style"]'); if (sel) sel.value = k; tileL.on('tileerror', () => { tileBad++; if (tileBad === 4 && !tileGood) tileTrouble(); });
}
function tileTrouble() { // no tile has loaded after several failures: say so, and try the next style once
  const keys = Object.keys(TILE_STYLES), next = keys[(keys.indexOf(mapStyle) + 1) % keys.length];
  if (next !== mapStyle && !tileTrouble.tried?.includes(next)) { (tileTrouble.tried ||= [mapStyle]).push(next); mapNote.hidden = false; mapNote.textContent = `The "${TILE_STYLES[mapStyle].name}" map could not be loaded on this network. Trying "${TILE_STYLES[next].name}"…`; setTileLayer(next); }
  else mapNote.hidden = false; mapNote.textContent = 'Map images are blocked on this network (pins still work and are placed from addresses). Ask IT to allow tile.openstreetmap.org or basemaps.cartocdn.com, or set VITE_MAP_TILE_URL to your approved map service.';
}
function openFirmOffices() {
  const C = data.contacts, box = el('div', {}), q = el('input', { type: 'search', placeholder: 'Find a firm', style: 'width:100%' }), form = el('div', { class: 'card', style: 'padding:12px;margin:10px 0', hidden: true });
  const build = () => { const firms = new Map();
    for (const c of C.list.filter(isPerson)) { if (!c.company) continue; const k = firmKey(c.company), f = firms.get(k) || { name: c.company, n: 0, mk: new Map() }; f.n++; if (c.market) f.mk.set(c.market, (f.mk.get(c.market) || 0) + 1); firms.set(k, f); }
    for (const [k, name] of Object.entries(firmExtra())) if (!firms.has(k)) firms.set(k, { name, n: 0, mk: new Map(), added: true });
    return [...firms.entries()].sort((a, b) => (b[1].added ? 1 : 0) - (a[1].added ? 1 : 0) || b[1].n - a[1].n || a[1].name.localeCompare(b[1].name)); };
  const locate = async (inp, v) => { if (!v) { inp.classList.remove('bad'); inp.title = ''; return; } const p = await geocode(v); inp.classList.toggle('bad', !p); inp.title = p ? 'Located' : 'Could not locate this address'; if (!p) say('Could not locate that address. Check the spelling or add the city and state.', 'err'); };
  const draw = () => box.replaceChildren(build().filter(([, f]) => !q.value || f.name.toLowerCase().includes(q.value.toLowerCase())).slice(0, 80).map(([k, f]) => {
    const inp = el('input', { placeholder: 'Street, City, ST ZIP', value: firmOffices()[k] || '', style: 'width:100%', onchange: async (e) => { const v = e.target.value.trim(), m = firmOffices(); if (v) m[k] = v; else delete m[k]; LS.set('necrm-firm-office', m); await locate(inp, v); } });
    return el('div', { class: 'f', style: 'margin:8px 0' }, el('label', { style: 'display:flex;justify-content:space-between;gap:8px' }, el('span', {}, `${f.name} · ${f.n ? `${f.n} contact${f.n > 1 ? 's' : ''}` : 'added by you'}${f.mk.size ? ' · ' + [...f.mk.entries()].sort((a, b) => b[1] - a[1])[0][0] : ''}`),
      f.added ? el('button', { class: 'btn sm', type: 'button', onclick: () => { if (!confirm(`Remove ${f.name} from the list?`)) return; delete firmExtra()[k]; delete firmOffices()[k]; LS.set('necrm-firm-extra', firmExtra()); LS.set('necrm-firm-office', firmOffices()); draw(); } }, 'Remove') : null), inp); }));
  const nm = el('input', { placeholder: 'Firm or place name, e.g. CBRE Newark office', style: 'width:100%' }), ad = el('input', { placeholder: 'Street, City, ST ZIP', style: 'width:100%' });
  const save = el('button', { class: 'btn pri', type: 'button', onclick: async () => { const name = nm.value.trim(), addr = ad.value.trim(); if (!name || !addr) return say('Enter a name and an address', 'err'); const k = firmKey(name);
    firmExtra()[k] = firmExtra()[k] || name; firmOffices()[k] = addr; LS.set('necrm-firm-extra', firmExtra()); LS.set('necrm-firm-office', firmOffices()); nm.value = ''; ad.value = ''; form.hidden = true; q.value = ''; draw();
    const p = await geocode(addr); say(p ? `${name} added and located` : 'Added, but that address could not be located. Check the spelling.', p ? undefined : 'err'); } }, 'Add to the list');
  form.append(el('b', {}, 'Add a firm or place'), el('div', { class: 'f', style: 'margin:8px 0' }, el('label', {}, 'Name'), nm), el('div', { class: 'f', style: 'margin:8px 0' }, el('label', {}, 'Office address'), ad), el('div', { class: 'bar', style: 'margin:0' }, save, el('button', { class: 'btn', type: 'button', onclick: () => { form.hidden = true; } }, 'Cancel')));
  q.addEventListener('input', draw); draw();
  openSheet(el('div', { class: 'bar', style: 'justify-content:space-between' }, el('h2', {}, 'Firm office addresses'), el('button', { class: 'btn pri', type: 'button', onclick: () => { form.hidden = !form.hidden; if (!form.hidden) nm.focus(); } }, '+ Add new')),
    el('p', { class: 'hint' }, 'Enter one office address per firm and every contact at that firm gets a pin. A contact\'s own office address still takes priority. Use Add new for a firm or place that is not in your contact list. Saved on this device.'), form, q, box,
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => { closeSheet(); updateMap(curList); } }, 'Done')));
}
function mapColumn() {
  const C = data.contacts, none = !C.list.some((c) => officeOf(c) || c.addresses.length) && !Object.keys(firmExtra()).length;
  const chip = (set, key, label, color) => { const b = el('button', { class: 'fchip' + (set.has(key) ? ' on' : ''), style: `--c:${color}`, onclick: () => { set.has(key) ? set.delete(key) : set.add(key); b.classList.toggle('on'); updateMap(curList); } }, label); return b; };
  const tg = (get, set, label) => el('label', { class: 'mtg' }, el('input', { type: 'checkbox', checked: get(), onchange: (e) => { set(e.target.checked); updateMap(curList); } }), label);
  const mk = el('select', { onchange: (e) => { mapF.market = e.target.value; updateMap(curList); } }, el('option', { value: '' }, 'All markets'), [...new Set(C.list.map((c) => c.market).filter(Boolean))].sort().map((m) => el('option', { value: m }, m))); mk.value = mapF.market;
  const style = el('select', { title: 'Map style', onchange: (e) => { tileTrouble.tried = null; setTileLayer(e.target.value); } }, Object.entries(TILE_STYLES).map(([k, s]) => el('option', { value: k }, 'Map: ' + s.name))); style.value = mapStyle;
  return el('div', { class: 'mapcol' }, el('div', { class: 'mapf' },
    el('div', { class: 'mrow' }, el('b', {}, 'Tier'), ['t1', 't2', 't3', 'tx', 'tn'].map((k) => chip(mapF.tiers, k, TIER_NAME[k], TIER_COLOR[k]))),
    el('div', { class: 'mrow' }, el('b', {}, 'Type'), KINDS.map((k) => chip(mapF.kinds, k, k === 'Principal' ? 'Principals' : k, KIND_COLOR[k])), mk, style),
    el('div', { class: 'mrow' }, tg(() => mapOn.office, (v) => (mapOn.office = v), 'Offices'), tg(() => mapOn.bldg, (v) => (mapOn.bldg = v), 'Closed buildings'), tg(() => mapF.approx, (v) => (mapF.approx = v), 'Approximate (market area)'), el('button', { class: 'btn sm', onclick: openFirmOffices }, 'Set firm offices'))),
    none && el('div', { class: 'panel', style: 'max-width:none;margin:0 0 8px;padding:12px' }, el('b', {}, 'No office addresses on the board yet. '), 'Faded pins show each contact\'s market area. Use Set firm offices to enter one address per firm, or add a new firm or place, and the pins are placed exactly.'),
    mapNote, mapHost, mapStatus);
}

// ---- calendar: only Outlook events that include a CRM contact, with keywords deciding what is kept
const CAL_DEF = { pos: 'lunch, dinner, breakfast, coffee, drinks, happy hour, golf, tour, site visit, market visit, market update, catch up, catch-up, intro, introduction, broker, reception, cocktail, outing, game, conference', neg: 'all hands, all-hands, town hall, webinar, training, stand-up, standup, team meeting, staff meeting, holiday, out of office, ooo, payroll, compliance, interview, onboarding, investment committee, ic meeting, board meeting, lpac, focus time, office hours, fire drill' };
const calWords = (s) => String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const calHas = (txt, words) => { const t = ' ' + String(txt || '').toLowerCase() + ' '; return words.some((w) => t.includes(w)); };
function calKeep(m) { // a CRM contact must be on the invite; a corporate or ad hoc keyword drops it unless it also has a relationship keyword
  if (cfg.calAll) return true; if (!data.contacts || !meetingContacts(m).length) return false;
  const pos = calWords(cfg.calPos ?? CAL_DEF.pos), neg = calWords(cfg.calNeg ?? CAL_DEF.neg); return !(calHas(m.title, neg) && !calHas(m.title, pos));
}
const hiddenMeetings = (a, b) => { const all = Object.values(meetCache).flatMap((c) => c.list).filter((m) => m.day >= a && m.day <= b); return all.length - all.filter(calKeep).length; };
function openCalKeywords() {
  const pos = el('textarea', { rows: 4, style: 'width:100%' }), neg = el('textarea', { rows: 4, style: 'width:100%' }); pos.value = cfg.calPos ?? CAL_DEF.pos; neg.value = cfg.calNeg ?? CAL_DEF.neg;
  const all = el('input', { type: 'checkbox', checked: !!cfg.calAll, style: 'width:auto' });
  openSheet(el('h2', {}, 'Calendar rules'), el('p', { class: 'hint' }, 'The calendar shows an Outlook event only when a contact from the CRM (matched by email) is on the invite. A skip keyword hides it unless the title also has a keep keyword. Separate words with commas.'),
    el('div', { class: 'f' }, el('label', {}, 'Keep keywords (relationship events)'), pos), el('div', { class: 'f' }, el('label', {}, 'Skip keywords (corporate or ad hoc)'), neg),
    el('label', { class: 'mtg', style: 'margin:8px 0' }, all, 'Show every Outlook event (turn the filter off)'),
    el('div', { class: 'bar' }, el('button', { class: 'btn pri', onclick: () => { cfg.calPos = pos.value; cfg.calNeg = neg.value; cfg.calAll = all.checked; LS.set('necrm-cfg', cfg); closeSheet(); render(); } }, 'Save'), el('button', { class: 'btn', onclick: () => { delete cfg.calPos; delete cfg.calNeg; cfg.calAll = false; LS.set('necrm-cfg', cfg); closeSheet(); render(); } }, 'Reset to defaults'), el('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
}
function calRulesBar(d1, d2) {
  if (!outlookReady()) return null; const h = hiddenMeetings(d1, d2);
  return el('div', { class: 'bar', style: 'margin:0 0 10px' }, el('span', { class: 'hint' }, cfg.calAll ? 'Showing every Outlook event.' : `Showing Outlook events with a CRM contact${h ? ` · ${h} other event${h > 1 ? 's' : ''} hidden` : ''}. Follow-ups follow each contact's cadence.`), el('button', { class: 'btn sm', onclick: openCalKeywords }, 'Calendar rules'));
}

// ---- Business Development: Events (search near a place) and Insights
const evNear = { on: false, q: '', mi: 25, events: [], err: '', busy: false, at: 0 };
const milesBetween = (a, b) => { const R = 3958.8, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dg = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
async function nearFetch(place, mi) {
  const pos = await geocode(place); if (!pos) throw new Error('Could not find that place. Try a city and state, or a street address.');
  const here = [pos.lat, pos.lng], now = new Date().toISOString().slice(0, 19) + 'Z', out = [];
  if (demo) { for (const e of sampleEvents()) { const m = MARKETS.find((x) => x.k === e.market); if (m && milesBetween(here, m.ll) <= mi) out.push({ ...e, venue: `${e.venue} · ${Math.round(milesBetween(here, m.ll))} mi` }); } return out; }
  if (cfg.tmKey) { try { for (let page = 0; page < 2; page++) { const j = await jget('https://app.ticketmaster.com/discovery/v2/events.json?' + new URLSearchParams({ apikey: cfg.tmKey, latlong: `${pos.lat},${pos.lng}`, radius: String(mi), unit: 'miles', size: '100', page: String(page), sort: 'date,asc', startDateTime: now }));
      for (const e of j._embedded?.events || []) { const v = e._embedded?.venues?.[0], seg = e.classifications?.[0]?.segment?.name || '', gen = e.classifications?.[0]?.genre?.name || '', cat = /sport/i.test(seg) ? 'Sports' : /music/i.test(seg) ? 'Concerts' : /comed/i.test(gen + ' ' + e.name) ? 'Comedy' : '', pr = e.priceRanges?.[0], ll = v?.location ? [+v.location.latitude, +v.location.longitude] : null; if (!cat) continue;
        out.push({ ext: 'tm:' + e.id, title: e.name, date: e.dates?.start?.localDate || '', time: (e.dates?.start?.localTime || '').slice(0, 5), venue: [v?.name, v?.city?.name].filter(Boolean).join(', ') + (ll ? ` · ${Math.round(milesBetween(here, ll))} mi` : ''), category: cat, url: e.url || '', price: pr?.min || 0, source: 'Ticketmaster', links: [{ source: 'Ticketmaster', url: e.url || '', price: pr?.min || 0, id: 'tm:' + e.id }] }); }
      if (page + 1 >= (j.page?.totalPages || 0)) break; await sleep(250); } } catch (e) { evNear.err = 'Ticketmaster: ' + e.message; } }
  if (cfg.sgId) { try { const j = await jget('https://api.seatgeek.com/2/events?' + new URLSearchParams({ client_id: cfg.sgId, lat: String(pos.lat), lon: String(pos.lng), range: mi + 'mi', per_page: '100', sort: 'datetime_local.asc', 'datetime_local.gte': now.slice(0, 19) }));
      for (const e of j.events || []) { const tx = (e.taxonomies || []).map((t) => t.name).join(' ') + ' ' + (e.type || ''), cat = /comedy/i.test(tx) ? 'Comedy' : /concert|music/i.test(tx) ? 'Concerts' : /sport|mlb|nfl|nba|nhl|ncaa|mls/i.test(tx) ? 'Sports' : ''; if (!cat) continue; const ll = e.venue?.location ? [e.venue.location.lat, e.venue.location.lon] : null;
        out.push({ ext: 'sg:' + e.id, title: e.title, date: (e.datetime_local || '').slice(0, 10), time: (e.datetime_local || '').slice(11, 16), venue: [e.venue?.name, e.venue?.city].filter(Boolean).join(', ') + (ll ? ` · ${Math.round(milesBetween(here, ll))} mi` : ''), category: cat, url: e.url || '', price: e.stats?.lowest_price || 0, source: 'SeatGeek', links: [{ source: 'SeatGeek', url: e.url || '', price: e.stats?.lowest_price || 0, id: 'sg:' + e.id }] }); } } catch (e) { evNear.err = (evNear.err ? evNear.err + '; ' : '') + 'SeatGeek: ' + e.message; } }
  return out.filter((e) => e.date).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
function nearBar() {
  const q = el('input', { type: 'search', placeholder: 'Near: city, address or venue (e.g. Newark, NJ)', value: evNear.q, style: 'flex:1 1 220px' }), mi = el('select', {}, [10, 25, 50, 100].map((n) => el('option', { value: n }, n + ' miles'))); mi.value = String(evNear.mi);
  const go2 = async () => { if (!q.value.trim()) return say('Type a place first', 'err'); Object.assign(evNear, { q: q.value.trim(), mi: Number(mi.value), busy: true, err: '' }); evNear.on = true; renderEvents();
    try { evNear.events = await nearFetch(evNear.q, evNear.mi); evNear.at = Date.now(); } catch (e) { evNear.err = e.message; evNear.events = []; } evNear.busy = false; renderEvents(); };
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  return el('div', { class: 'card', style: 'padding:12px;margin-bottom:10px' }, el('div', { class: 'bar', style: 'margin:0' }, q, mi, el('button', { class: 'btn pri', onclick: go2 }, evNear.busy ? 'Searching…' : 'Search near'),
    evNear.on && el('button', { class: 'btn', onclick: () => { evNear.on = false; renderEvents(); } }, 'Back to my markets')),
    el('p', { class: 'hint', style: 'margin:6px 2px 0' }, evNear.on ? `${evNear.events.length} sports, concert and comedy events within ${evNear.mi} miles of ${evNear.q}${evNear.err ? ' · ' + evNear.err : ''}${!demo && !cfg.tmKey && !cfg.sgId ? ' · Add a Ticketmaster key or SeatGeek client ID in Settings to search by place.' : ''}` : 'Search any place and radius, or use your saved markets below.'));
}
function planFind() {
  const body = el('div'), seg = el('div', { class: 'seg wrap' }, [['discover', 'Search & discover'], ['compare', 'Compare tickets'], ['tickets', 'Tickets & travel'], ['food', 'Food & drink']].map(([k, l]) => el('button', { class: evView === k ? 'on' : '', onclick: () => { evView = k; renderPlan(); } }, l)));
  ({ discover: evDiscover, compare: evCompare, tickets: evTickets, food: evFood })[evView](body); return el('div', {}, el('div', { class: 'bar' }, seg), body);
}
const tally = (pairs) => { const m = new Map(); for (const [k, v] of pairs) m.set(k, (m.get(k) || 0) + v); return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); };
function barList(rows, { fmt = (v) => v, color = '#344050', max = 8 } = {}) {
  const top = rows.slice(0, max), mx = Math.max(1, ...top.map((r) => r.value));
  return top.length ? el('div', { class: 'bars' }, top.map((r) => el('div', { class: 'brow' }, el('span', { class: 'bl', title: r.label }, r.label), el('div', { class: 'bt' }, el('i', { style: `width:${Math.max(3, r.value / mx * 100)}%;background:${color}` })), el('b', {}, fmt(r.value))))) : el('p', { class: 'hint' }, 'No data yet.');
}
let insYear = 0, insPast = false;
const FIRM_ALIAS = { nmrk: 'Newmark', 'cbre np': 'CBRE', 'cbre national partners': 'CBRE', 'nai james e hanson': 'NAI Hanson', 'nai james hanson': 'NAI Hanson' };
const firmName = (f) => { const k = String(f).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); return FIRM_ALIAS[k] || String(f).replace(/\s*\([^)]*\)\s*/g, ' ').trim(); };
const regionName = (r) => ({ 'Greater PHL': 'Greater Philadelphia' }[r] || r);
function planInsights() {
  const C = data.contacts, t = today(), byId = new Map(C.list.map((c) => [c.id, c]));
  const have = importedIds(), bd = (C.bd?.events || []).filter((e) => ATTENDED.test(e.status) && e.start && !have.has('monday:' + e.id)), years = [...new Set([...bd.map((e) => e.start.slice(0, 4)), ...plan.events.map((e) => (e.date || '').slice(0, 4))].filter(Boolean))].sort().reverse();
  const nowY = String(new Date().getFullYear()); if (!insYear || !years.includes(String(insYear))) insYear = Number(years.includes(nowY) ? nowY : years.includes(String(plan.year)) ? plan.year : years[0] || plan.year);
  const yr = String(insYear), ysel = el('select', { onchange: (e) => { insYear = Number(e.target.value); renderPlan(); } }, (years.length ? years : [yr]).map((y) => el('option', { value: y }, y))); ysel.value = yr;
  const pe = plan.events.filter((e) => (e.date || '').startsWith(yr) && e.status !== 'Cancelled'), pAtt = pe.filter((e) => e.status === 'Attended'), com = pe.filter((e) => COMMITTED.includes(e.status)), bAtt = bd.filter((e) => e.start.startsWith(yr));
  const guestsOf = (e) => (e.guests || []).map((id) => byId.get(id)).filter(Boolean), slots = (e) => Math.max((e.guests || []).length, 0);
  const review = (C.bd?.events || []).filter((e) => !have.has('monday:' + e.id) && e.start && e.start.startsWith(yr) && e.end < t && !ATTENDED.test(e.status) && !DECLINED.test(e.status) && /confirmed|attending|plann/i.test(e.status));
  const attended = [...[...bAtt, ...(insPast ? review : [])].map((e) => ({ region: regionName(e.region) || 'Not set', type: e.type || 'Not set', firms: (e.firm || '').split(/[,/&;]|\band\b/i).map((x) => firmName(x.trim())).filter((x) => x && !/^(na|n\/a|none|-)$/i.test(x)), q: Math.ceil(Number(e.start.slice(5, 7)) / 3), owners: e.owners })),
    ...pAtt.map((e) => ({ region: regionName(e.region) || mname(e.market) || e.market || 'Not set', type: e.mtype || e.etype || defaultEType(e.category), firms: [...new Set([...(e.firm ? e.firm.split(/[,/&;]|\band\b/i).map((x) => firmName(x.trim())) : []), ...guestsOf(e).map((c) => c.company)].filter(Boolean))], q: Math.ceil(Number(e.date.slice(5, 7)) / 3), owners: [] }))];
  const spend = com.reduce((a, e) => a + evCost(e), 0), costed = com.filter((e) => evCost(e) > 0), allSlots = com.reduce((a, e) => a + slots(e), 0), cov = coverage(), people = C.list.filter(isPerson), d90 = addDays(t, -90);
  const touched = people.filter((c) => c.last && c.last >= d90).length, overdue = dueLists().over.length, total = Number(plan.total) || 0;
  const kpi = (n, l, sub) => el('div', { class: 's' }, el('b', {}, n), el('span', {}, l), sub && el('small', { class: 'hint' }, sub));
  const spendBy = (keyFn) => tally(com.flatMap((e) => { const gs = guestsOf(e), keys = keyFn(e, gs); const c = evCost(e); return keys.length ? keys.map((k) => [k, c / keys.length]) : [['No guests logged', c]]; })).map((r) => ({ ...r, value: Math.round(r.value) }));
  const card = (h, sub, node) => el('div', { class: 'card chart' }, el('h2', {}, h), sub && el('div', { class: 'sub' }, sub), node);
  const link = (e) => (e.url ? el('a', { href: e.url, target: '_blank', rel: 'noopener' }, e.name) : e.name);
  const reviewCard = review.length ? card('Past events not marked as attended', `${review.length} event${review.length > 1 ? 's' : ''} in ${yr} already happened but are still Confirmed or Planned on the board. Mark them Done in Monday, or count them here.`, el('div', {},
    el('label', { class: 'mtg', style: 'margin:4px 0 8px' }, el('input', { type: 'checkbox', checked: insPast, onchange: (e) => { insPast = e.target.checked; renderPlan(); } }), 'Count these as attended in the charts'),
    review.slice(0, 15).map((e) => el('div', { class: 'note' }, link(e), el('small', {}, [fmtDate(e.start), e.status, e.region].filter(Boolean).join(' · ')))))) : null;
  const gapDefs = [['Event type', (e) => e.type], ['Region', (e) => e.region], ['Relationship / firm', (e) => e.firm && !/^(na|n\/a)$/i.test(e.firm.trim())], ['Location', (e) => e.location], ['Faropoint team', (e) => e.owners.length]].map(([l, f]) => ({ l, list: bAtt.filter((e) => !f(e)) })).filter((g) => g.list.length);
  const gapsCard = card('Information missing on attended events', `Fill these in on the Monday board and the charts update on the next refresh. Cost and the individual guests are not stored on the board: enter them on the event in the plan.`, gapDefs.length ? el('div', {}, gapDefs.map((g) => el('div', { class: 'note' }, el('b', {}, `${g.l}: ${g.list.length} missing`), el('small', {}, g.list.slice(0, 6).flatMap((e, i) => (i ? [', ', link(e)] : [link(e)])))))) : el('p', { class: 'hint' }, 'Nothing missing.'));
  return el('div', {},
    el('div', { class: 'bar', style: 'justify-content:space-between' }, el('span', { class: 'hint' }, 'Events attended come from the Business Development items on the board and from your plan. Spend comes from the plan.'), el('div', { class: 'bar', style: 'margin:0' }, el('b', {}, 'Year'), ysel)),
    el('div', { class: 'sum' }, kpi(attended.length, 'Events attended'), kpi(money(spend), 'Event spend', `${com.length} booked or attended`), kpi(costed.length ? money(spend / costed.length) : '—', 'Avg cost per event'), kpi(allSlots ? money(spend / allSlots) : '—', 'Cost per guest invited', `${allSlots} invitations`)),
    el('div', { class: 'sum' }, kpi(cov.tops.length ? Math.round(cov.covered.length / cov.tops.length * 100) + '%' : '—', 'Tier 1 invited to an event', `${cov.covered.length} of ${cov.tops.length}`), kpi(people.length ? Math.round(touched / people.length * 100) + '%' : '—', 'Contacted in last 90 days', `${touched} of ${people.length}`), kpi(overdue, 'Overdue follow-ups', undefined), kpi(total ? Math.round(spend / total * 100) + '%' : '—', 'Of annual budget spent', total ? money(total) + ' target' : 'No target set')),
    card('Events attended by region', 'Counts from the board and the plan.', barList(tally(attended.map((a) => [a.region, 1])), { color: '#344050' })),
    card('Events attended by relationship', 'The firm or relationship named on each event.', barList(tally(attended.flatMap((a) => a.firms.map((f) => [f, 1]))), { color: '#2F6FEB', max: 10 })),
    card('Events attended by event type', null, barList(tally(attended.map((a) => [a.type, 1])), { color: '#7C4DDB' })),
    card('Who we have spent the most on (company)', 'Each event cost is split across the companies of the guests invited.', barList(spendBy((e, gs) => [...new Set(gs.map((c) => c.company).filter(Boolean))]), { fmt: money, color: '#F59E0B', max: 10 })),
    card('Who we have spent the most on (contact)', 'Each event cost is split across the guests invited.', barList(spendBy((e, gs) => gs.map((c) => c.name)), { fmt: money, color: '#16A36A', max: 10 })),
    card('Spend by event type', null, barList(tally(com.map((e) => [e.etype || defaultEType(e.category), evCost(e)])).map((r) => ({ ...r, value: Math.round(r.value) })), { fmt: money, color: '#0E8A9A' })),
    card('Events attended by quarter', null, barList([1, 2, 3, 4].map((q) => ({ label: 'Q' + q, value: attended.filter((a) => a.q === q).length })), { color: '#1B2A3A', max: 4 })), reviewCard, gapsCard);
}
// drop a completed BD Plan Workbook anywhere on the Business Development tab and it is read straight away
$('#view').addEventListener('dragover', (e) => { if (tab === 'plan' && e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
$('#view').addEventListener('drop', async (e) => { if (tab !== 'plan') return; const f = [...(e.dataTransfer?.files || [])].find((x) => /\.xlsx$/i.test(x.name)); if (!f) return; e.preventDefault(); try { previewWorkbook(await parseWorkbook(f), f.name); } catch (er) { say('Could not read that workbook: ' + er.message, 'err'); } });
const workbookButton = () => { const wb = el('input', { type: 'file', accept: '.xlsx', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { previewWorkbook(await parseWorkbook(f), f.name); } catch (er) { say('Could not read that workbook: ' + er.message, 'err'); } } }); return el('span', {}, el('button', { class: 'btn sm', title: 'Upload the completed BD Plan Workbook, or drop the file anywhere on this tab', onclick: () => wb.click() }, 'Upload BD workbook (.xlsx)'), wb); };

// ---- Vcards: contacts as cards by tier; drag a card to another tier to re-tier it
const vcF = { q: '', kind: '' };
async function moveTier(c, lab) { const C = data.contacts; if (!c || !lab || c.tier === lab) return; c.tier = lab; say(await enqueue({ type: 'column', boardId: C.id, itemId: c.id, columnId: C.roles.tier.id, value: { label: lab } })); renderPipeline(); }
function renderPipeline() {
  const refocus = !!(document.activeElement && document.activeElement.matches && document.activeElement.matches('#view input[type=search]'));
  if (vcMap) { vcMap.remove(); vcMap = null; }
  const C = data.contacts; if (!C) return $('#view').replaceChildren(el('p', { class: 'hint' }, 'Loading…'));
  const R = C.roles, people = C.list.filter(isPerson), labels = (R.tier?.labels || []).map((l) => l.label).filter(Boolean);
  if (!R.tier) return $('#view').replaceChildren(el('div', { class: 'panel' }, el('h2', {}, 'No tier column'), el('p', {}, 'Vcards groups contacts by the board\'s Tier status column, which was not found.')));
  const tn = (l) => { const m = /tier\s*(\d+)/i.exec(l); return m ? Number(m[1]) : 99; }, ok = (c) => (!vcF.kind || kindOf(c) === vcF.kind) && (!vcF.q || nameOrPhone(vcF.q, [c.name, c.company], [c.phone, c.phone2]));
  const cols = labels.filter((l) => people.some((c) => c.tier === l) || tn(l) < 99).sort((a, b) => tn(a) - tn(b) || a.localeCompare(b)); if (people.some((c) => !labels.includes(c.tier))) cols.push('');
  const board = el('div', { class: 'kan' }, cols.map((lab) => { const all = people.filter((c) => (labels.includes(c.tier) ? c.tier : '') === lab), list = all.filter(ok).sort((a, b) => (dueOf(a) || '9').localeCompare(dueOf(b) || '9')), tc = TIER_COLOR[tierCls(lab)];
    return el('div', { class: 'kc', style: `--tc:${tc}`, ondragover: (e) => { if (lab) { e.preventDefault(); e.currentTarget.classList.add('over'); } }, ondragleave: (e) => e.currentTarget.classList.remove('over'),
      ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); moveTier(C.list.find((x) => x.id === e.dataTransfer.getData('text/plain')), lab); } },
      el('h3', {}, el('span', {}, lab || 'No tier'), el('span', { class: 'cnt' }, list.length === all.length ? list.length : `${list.length} of ${all.length}`)),
      list.slice(0, 40).map((c) => { const k = kindOf(c); return el('div', { class: 'kd', draggable: true, ondragstart: (e) => e.dataTransfer.setData('text/plain', c.id), onclick: () => openContact(c) },
        el('div', { class: 'kd-top' }, el('div', { class: 'av', style: `background:${KIND_COLOR[k]};color:#fff` }, initials(c.name)), el('div', { class: 'kd-who' }, el('strong', {}, c.name), el('small', {}, [c.title, c.company].filter(Boolean).join(' · '))), c.phone && el('a', { class: 'btn round', href: telHref(c.phone), title: 'Call', onclick: (e) => e.stopPropagation() }, icon('phone'))),
        el('div', { class: 'kd-bot' }, kindChip(c), dueChip(c), pocOf(c) && el('small', {}, 'POC ' + pocOf(c))), el('select', { class: 'kd-move', 'aria-label': 'Move to tier', onclick: (e) => e.stopPropagation(), onchange: (e) => moveTier(c, e.target.value) }, el('option', { value: '' }, 'Move to tier…'), cols.filter((x) => x && x !== c.tier).map((l) => el('option', { value: l }, l)))); }), list.length > 40 && el('p', { class: 'hint' }, `+${list.length - 40} more (narrow with search or type)`)); }));
  const search = el('input', { type: 'search', placeholder: 'Search name, company or phone', value: vcF.q, style: 'flex:1 1 200px', oninput: (e) => { vcF.q = e.target.value; clearTimeout(vcT); vcT = setTimeout(renderPipeline, 250); } });
  const pills = el('div', { class: 'pills' }, [['', 'All']].concat(KINDS.filter((k) => people.some((c) => kindOf(c) === k)).map((k) => [k, k === 'Principal' ? 'Principals' : k])).map(([k, l]) => el('button', { class: 'tp' + (vcF.kind === k ? ' on' : ''), style: k ? `--c:${KIND_COLOR[k]}` : '', onclick: () => { vcF.kind = k; renderPipeline(); } }, l)));
  $('#view').replaceChildren(el('div', { class: 'bar', style: 'justify-content:space-between' }, el('h2', { style: 'font-size:22px' }, 'Vcards'), el('span', { class: 'hint' }, 'Drag a card to another tier, or use Move to tier on the card.')), el('div', { class: 'bar' }, search), pills, vcLayout(board)); if (refocus) { search.focus(); const n = search.value.length; search.setSelectionRange(n, n); }
}
let vcT = 0;

// ---------------------------------------------------------------- app-native events: Faropoint team members, updates, and bringing in the Monday history
const fpTeam = () => { const s = new Set(); for (const c of data.contacts?.list || []) c.pocs.forEach((n) => s.add(n)); for (const e of data.contacts?.bd?.events || []) e.owners.forEach((n) => s.add(n)); for (const e of plan.events) (e.members || []).forEach((n) => s.add(n)); (cfg.fpTeamExtra || []).forEach((n) => s.add(n)); return [...s].filter(Boolean).sort((a, b) => a.localeCompare(b)); };
function memberPicker(e) {
  e.members = [...(e.members || [])]; const chips = el('div', { class: 'sec', style: 'margin:6px 0' }), res = el('div', {}), inp = el('input', { placeholder: 'Search Faropoint team by name', style: 'width:100%' });
  const drawChips = () => chips.replaceChildren(e.members.map((n, i) => el('span', { class: 'tag' }, n, el('button', { type: 'button', onclick: () => { e.members.splice(i, 1); drawChips(); } }, '×'))));
  const add = (n) => { if (n && !e.members.some((x) => x.toLowerCase() === n.toLowerCase())) e.members.push(n); inp.value = ''; res.replaceChildren(); drawChips(); };
  inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase(); if (!q) return res.replaceChildren(); const team = fpTeam(), hits = team.filter((n) => n.toLowerCase().includes(q) && !e.members.includes(n)).slice(0, 6);
    res.replaceChildren(hits.map((n) => el('div', { class: 'row', style: 'min-height:44px', onclick: () => add(n) }, el('div', { class: 'who' }, el('strong', {}, n)))), q.length >= 2 && !team.some((n) => n.toLowerCase() === q) ? el('div', { class: 'row', style: 'min-height:44px', onclick: () => { const n = inp.value.trim(); (cfg.fpTeamExtra ||= []).includes(n) || cfg.fpTeamExtra.push(n); LS.set('necrm-cfg', cfg); add(n); } }, el('div', { class: 'who' }, el('strong', {}, `Add "${inp.value.trim()}"`), el('small', {}, 'Not in the team list yet'))) : null); });
  drawChips(); return { node: el('div', {}, inp, res, chips) };
}
function updatesBox(e) {
  e.updates = (e.updates || []).map((u) => ({ ...u })); const list = el('div', {}), ta = el('textarea', { rows: 2, placeholder: 'Add an update: what happened, who attended, next step', style: 'width:100%' });
  const draw = () => list.replaceChildren(e.updates.slice().sort((a, b) => b.at.localeCompare(a.at)).map((u) => el('div', { class: 'note' }, el('div', {}, u.text), el('small', {}, `${new Date(u.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${u.by}${u.edited ? ' · edited' : ''}`),
    el('div', { class: 'acts', style: 'margin-top:4px' }, el('button', { type: 'button', class: 'btn sm', onclick: () => { const t = prompt('Edit update', u.text); if (t != null && t.trim()) { u.text = t.trim(); u.edited = true; draw(); } } }, 'Edit'), el('button', { type: 'button', class: 'btn sm', onclick: () => { if (confirm('Delete this update?')) { e.updates = e.updates.filter((x) => x.id !== u.id); draw(); } } }, 'Delete')))));
  const addBtn = el('button', { type: 'button', class: 'btn sm', onclick: () => { const t = ta.value.trim(); if (!t) return; e.updates.push({ id: uid(), at: new Date().toISOString(), by: cfg.myName || 'You', text: t }); ta.value = ''; draw(); } }, 'Add update');
  draw(); return el('div', { class: 'f' }, el('label', {}, 'Updates'), ta, el('div', { class: 'bar', style: 'margin:6px 0' }, addBtn, el('span', { class: 'hint' }, 'Press Add update, then Save.')), list);
}
const importedIds = () => new Set(plan.events.map((x) => x.ext).filter((x) => /^monday:/.test(x || '')));
const importCategory = (t) => (/sport|game/i.test(t) ? 'Sports' : /concert/i.test(t) ? 'Concerts' : /comedy/i.test(t) ? 'Comedy' : /lunch|dinner|golf/i.test(t) ? 'Dining' : /conference|market visit|ski|trip/i.test(t) ? 'Conferences & travel' : 'Gifts & other');
const importStatus = (s) => (ATTENDED.test(s) ? 'Attended' : DECLINED.test(s) ? 'Cancelled' : /confirmed|attending/i.test(s) ? 'Booked' : /plann/i.test(s) ? 'Planned' : 'Idea');
function mondayImportButton(year) {
  const bd = data.contacts?.bd; if (!bd) return null; const have = importedIds(), todo = bd.events.filter((e) => e.start && e.start.startsWith(String(year)) && !have.has('monday:' + e.id));
  return todo.length ? el('button', { class: 'btn sm', title: 'Copy these events into the app so you can edit them here', onclick: () => importMondayEvents(todo, year) }, `Bring in ${todo.length} from Monday`) : null;
}
function importMondayEvents(list, year) {
  if (!confirm(`Copy ${list.length} ${year} event${list.length > 1 ? 's' : ''} from the Business Development board into this app?\n\nThey become editable here. Nothing is changed in Monday.`)) return;
  for (const e of list) plan.events.push({ id: uid(), ext: 'monday:' + e.id, source: 'Monday', title: e.name, date: e.start, endDate: e.end !== e.start ? e.end : '', time: '', venue: e.location, category: importCategory(e.type), etype: '', mtype: e.type, status: importStatus(e.status), qty: 0, unit: '', actual: '', url: '', notes: e.notes, firm: e.firm, region: e.region, members: [...e.owners], guests: [], guestNames: [], updates: [], lineId: '', mondayParent: e.parent });
  savePlan(); say(`Brought in ${list.length} events`); track('monday_events_imported', { n: list.length }); renderPlan();
}
const appAsBd = (e) => ({ id: 'app:' + e.id, planId: e.id, name: e.title, url: '', status: ({ Attended: 'Done', Booked: 'Confirmed', Planned: 'Planned', Idea: 'Planned', Requested: 'Planned', Cancelled: 'Not Attending' })[e.status] || e.status, start: e.date || '', end: e.endDate || e.date || '', location: e.venue || '', notes: e.notes || '',
  firm: e.firm || [...new Set((e.guests || []).map((id) => data.contacts.list.find((c) => c.id === id)?.company).filter(Boolean))].join(', '), region: e.region || mname(e.market) || '', type: e.mtype || e.etype || '', owners: e.members || [], parent: e.mondayParent || 'Created in the app' });
const attendedEvents = () => { const have = importedIds(); return [...(data.contacts.bd.events || []).filter((e) => !have.has('monday:' + e.id)), ...plan.events.filter((e) => e.date).map(appAsBd)]; };
function openCreateInitiative(seed = {}) { track('create_event_opened'); openPlanEvent(null, { title: seed.name || '', date: seed.start || '', endDate: seed.end && seed.end !== seed.start ? seed.end : '', venue: seed.location || '', firm: seed.firm || '', region: seed.region || '', notes: seed.notes || '', status: 'Planned' }); }

// ---------------------------------------------------------------- Compare tickets: sports events across ticket sites
// SeatGeek and Ticketmaster give prices to apps (with a key). StubHub, TickPick, Vivid Seats and Gametime have no public price feed, so their buttons open that site's search for the game.
const TICKET_SITES = [['SeatGeek', 'https://seatgeek.com/search?search='], ['Ticketmaster', 'https://www.ticketmaster.com/search?q='], ['StubHub', 'https://www.stubhub.com/secure/search?q='], ['TickPick', 'https://www.tickpick.com/search/?q='], ['Vivid Seats', 'https://www.vividseats.com/search?searchTerm='], ['Gametime', 'https://gametime.co/search?q=']];
const evCmp = { q: '', best: false };
function evCompare(out) {
  const all = (evNear.on ? evNear.events : (evData.events || [])).filter((e) => e.category === 'Sports'), term = evCmp.q.toLowerCase();
  const priced = (e) => (e.links || []).filter((l) => l.price > 0).sort((a, b) => a.price - b.price)[0] || null;
  let list = all.filter((e) => !term || (e.title + ' ' + (e.venue || '')).toLowerCase().includes(term)); if (evCmp.best) list = list.filter(priced);
  list = list.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const q = el('input', { type: 'search', placeholder: 'Search a team or venue', value: evCmp.q, style: 'flex:1 1 200px', onchange: (x) => { evCmp.q = x.target.value; renderPlan(); } });
  const only = el('label', { class: 'mtg' }, el('input', { type: 'checkbox', checked: evCmp.best, onchange: (x) => { evCmp.best = x.target.checked; renderPlan(); } }), 'Only games with a live price');
  const card = (e) => { const best = priced(e), d = parseIso(e.date), name = e.title.replace(/ \(sample\)$/, '');
    const btn = ([site, base]) => { const direct = (e.links || []).find((l) => l.source === site && l.url), href = direct ? direct.url : base + encodeURIComponent(name), price = direct && direct.price > 0 ? direct.price : 0, isBest = best && best.source === site;
      return el('a', { class: 'btn sm site' + (isBest ? ' best' : ''), href, target: '_blank', rel: 'noopener', title: direct ? `Open this game on ${site}` : `Search ${site} for this game` }, isBest ? 'Best price · ' : '', site, price ? ' ' + money(price) : ''); };
    return el('div', { class: 'evd cmp' }, el('div', { class: 'dt' }, el('b', {}, d.getDate()), el('span', {}, d.toLocaleDateString('en-US', { month: 'short' }))),
      el('div', { class: 'who' }, el('strong', {}, name), el('small', {}, [d.toLocaleDateString('en-US', { weekday: 'long' }), e.time && new Date(`2000-01-01T${e.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), e.venue].filter(Boolean).join(' · ')),
        el('div', {}, best ? el('span', { class: 'chip cc', style: 'background:#16A36A' }, `Lowest seen ${money(best.price)} on ${best.source}`) : el('span', { class: 'chip' }, 'No live price yet')),
        el('div', { class: 'sites' }, TICKET_SITES.map(btn), el('button', { class: 'btn sm', onclick: () => openCompare(e) }, 'Live price check'), el('button', { class: 'btn sm', onclick: () => openPlanEvent(null, { title: name, date: e.date, time: e.time, venue: e.venue, category: 'Sports', url: (best || {}).url || e.url, unit: best ? best.price : e.price || '', ext: e.ext, source: best ? best.source : e.source }) }, 'Add to plan')))); };
  out.replaceChildren(nearBar(), el('div', { class: 'panel', style: 'max-width:none;margin:0 0 10px;padding:12px' }, el('b', {}, 'How prices are found. '), 'SeatGeek and Ticketmaster prices are read live when their keys are in Settings; "Lowest seen" is the cheapest of those. StubHub, TickPick, Vivid Seats and Gametime do not share prices or seat maps with outside apps, so their buttons open that site\'s search for the game. Pick seats on the site you choose; taxes and fees are added at checkout.'),
    el('div', { class: 'bar' }, q, only), all.length ? (list.length ? el('div', { class: 'card' }, list.slice(0, 80).map(card)) : el('p', { class: 'hint' }, 'No sports events match.')) : el('div', { class: 'panel', style: 'max-width:none' }, 'No sports events loaded yet. Use Search & discover to load your markets, or search near a place above.'));
}

// ---------------------------------------------------------------- Navan card transactions (server-side connector; credentials never reach the browser)
// The server only returns charges that match NAVAN_CARDHOLDER, so this view never sees a colleague's spending.
// UNVERIFIED: Navan's sample does not list the transaction fields, so the amount, date and merchant are detected by field name and shown next to the raw record for you to check.
const NAVAN_TICKET = /ticketmaster|seatgeek|stubhub|tickpick|vivid ?seats|gametime|live ?nation|\baxs\b|ticketweb|eventbrite|ticket/i;
const NAVAN_OUTING = /ticket|golf|country club|steakhouse|restaurant|grill|tavern|bistro|catering|lunch|dinner|entertain|theat(er|re)|stadium|arena|hospitality|suite|brewery|\bbar\b/i;
const NAVAN_SPORTS = new RegExp(NAVAN_TICKET.source + '|stadium|arena|madison square|barclays|metlife|citi ?field|yankee|mets\\b|knicks|nets\\b|rangers|islanders|devils|giants|jets\\b|phillies|eagles|76ers|flyers|red sox|celtics|bruins|patriots|nationals|commanders|capitals|wizards|orioles|ravens|pirates|steelers|penguins|us open|nba|nfl|mlb|nhl|mls', 'i');
const flatObj = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o || {})) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) flatObj(v, key, out); else out[key] = v; } return out; };
function navanRow(t) {
  const f = flatObj(t), keys = Object.keys(f), num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN);
  const ak = keys.find((k) => /amount|total|value/i.test(k) && !/currency|original|fx|rate/i.test(k) && Number.isFinite(num(f[k]))), dk = keys.find((k) => /date|time|posted/i.test(k) && /^\d{4}-\d{2}-\d{2}/.test(String(f[k]))), mk = keys.find((k) => /merchant|vendor|payee|description|name/i.test(k) && typeof f[k] === 'string' && f[k].trim() && !/^\d+$/.test(f[k]));
  const idk = keys.find((k) => /(^|\.)(id|uuid|transactionId)$/i.test(k)), raw = JSON.stringify(t);
  return { amount: ak ? Math.abs(num(f[ak])) : 0, date: dk ? String(f[dk]).slice(0, 10) : '', merchant: mk ? f[mk] : '', key: idk ? String(f[idk]) : hash(raw), fields: { amount: ak || 'not found', date: dk || 'not found', merchant: mk || 'not found' }, ticket: NAVAN_TICKET.test(raw), outing: NAVAN_OUTING.test(raw), sports: NAVAN_SPORTS.test(raw), raw: t };
}
const navanInbox = { at: 0, rows: [], err: '', configured: null, needs: null, busy: false };
const navanGone = () => new Set(LS.get('necrm-navan-dismissed', []));
const navanLinked = () => new Set(plan.events.map((e) => e.navanTx).filter(Boolean));
const navanOpen = () => { const gone = navanGone(), have = navanLinked(); return navanInbox.rows.filter((r) => r.outing && !gone.has(r.key) && !have.has(r.key)); };
// history of sporting-event charges, kept on this device (only the fields needed, no raw records)
const navanHist = () => LS.get('necrm-navan-hist', { rows: [], at: 0, from: '' });
function navanHistMerge(rows) { const h = navanHist(), by = new Map(h.rows.map((r) => [r.key, r])); for (const r of rows.filter((x) => x.sports)) by.set(r.key, { key: r.key, date: r.date, amount: r.amount, merchant: r.merchant, ticket: r.ticket }); h.rows = [...by.values()].sort((a, b) => b.date.localeCompare(a.date)); h.at = Date.now(); LS.set('necrm-navan-hist', h); return h; }
function navanBadge() { const n = navanOpen().length, b = document.querySelector('#tabs button[data-t="plan"]'); if (b) { if (n) b.setAttribute('data-n', n > 9 ? '9+' : String(n)); else b.removeAttribute('data-n'); } }
async function navanFetch(from, to) { const r = await fetch(`/api/navan/card-transactions?from=${from}&to=${to}`), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); if (j.note) navanInbox.err = j.note; return (j.transactions || []).map(navanRow); }
async function navanStatus() { if (location.protocol === 'file:') return false; if (navanInbox.configured === null) { const j = await (await fetch('/api/navan/status')).json(); navanInbox.configured = !!j.configured; navanInbox.needs = j.needs || null; } return navanInbox.configured; }
async function navanAuto() { // checks Navan in the background, so a new outing charge appears without anyone pulling it
  if (navanInbox.busy) return; navanInbox.busy = true;
  try { if (!(await navanStatus())) return; const t = today(); navanInbox.rows = await navanFetch(addDays(t, -14), t); navanHistMerge(navanInbox.rows); navanInbox.at = Date.now(); navanInbox.err = ''; }
  catch (e) { navanInbox.err = e.message; }
  finally { navanInbox.busy = false; navanBadge(); if (tab === 'plan' && planView === 'find' && evView === 'tickets' && !document.querySelector('#sheet.on')) renderPlan(); }
}
setTimeout(navanAuto, 4000); setInterval(navanAuto, 30 * 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - navanInbox.at > 10 * 60000) navanAuto(); });
function navanCard(r, refresh) { // one charge, with the actions to link its cost to an event, add it as an event, or dismiss it
  const cands = plan.events.filter((e) => e.date && !e.navanTx && e.status !== 'Cancelled').sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(r.date || a.date)) - Math.abs(Date.parse(b.date) - Date.parse(r.date || b.date))), close = cands.filter((e) => r.date && Math.abs(Date.parse(e.date) - Date.parse(r.date)) <= 3 * 864e5);
  const link = (e) => { e.actual = r.amount; e.navanTx = r.key; e.status = ['Idea', 'Planned', 'Requested'].includes(e.status) ? 'Booked' : e.status; (e.updates ||= []).push({ id: uid(), at: new Date().toISOString(), by: 'Navan', text: `Navan card charge ${money(r.amount)} on ${fmtDate(r.date)}${r.merchant ? ' at ' + r.merchant : ''}.` }); savePlan(); say('Cost linked to ' + e.title); navanBadge(); refresh(); };
  const pick = el('select', { style: 'max-width:210px' }, el('option', { value: '' }, 'Link to an event…'), cands.slice(0, 15).map((e) => el('option', { value: e.id }, `${e.title} · ${fmtDate(e.date)}`)));
  const acts = el('div', { class: 'acts', style: 'flex:none;flex-wrap:wrap' }, close.length === 1 ? el('button', { class: 'btn sm pri', title: 'The only event within 3 days of this charge', onclick: () => link(close[0]) }, `Link to ${close[0].title.slice(0, 26)}`) : null, pick,
    el('button', { class: 'btn sm', onclick: () => { const e = plan.events.find((x) => x.id === pick.value); if (!e) return say('Choose an event first', 'err'); link(e); } }, 'Link cost'),
    el('button', { class: 'btn sm' + (close.length === 1 ? '' : ' pri'), onclick: () => { closeSheet(); openPlanEvent(null, { title: r.merchant || 'Outing', date: r.date, category: r.ticket ? 'Sports' : 'Dining', status: 'Booked', actual: r.amount, qty: 0, source: 'Navan card', navanTx: r.key, notes: 'Created from a Navan card transaction. Check the event name, date and guests.' }); } }, 'Add as event'),
    el('button', { class: 'btn sm', title: 'Not a client or relationship outing', onclick: () => { const g = LS.get('necrm-navan-dismissed', []); g.push(r.key); LS.set('necrm-navan-dismissed', g); navanBadge(); refresh(); } }, 'Not an outing'));
  return el('div', { class: 'row', style: 'flex-wrap:wrap;cursor:default' }, el('div', { class: 'who' }, el('strong', {}, r.merchant || '(no merchant found)'), el('small', {}, [fmtDate(r.date), r.ticket ? 'ticket merchant' : 'entertainment or dining'].join(' · ')),
    r.raw ? el('details', {}, el('summary', { class: 'hint' }, 'Raw record'), el('pre', { style: 'white-space:pre-wrap;font-size:11px;max-height:140px;overflow:auto' }, JSON.stringify(r.raw, null, 1))) : null), el('b', { style: 'font-weight:500' }, money(r.amount)), acts);
}
function navanInboxCard() { // shown at the top of Tickets & travel whenever there are card charges to review
  const open = navanOpen(); if (!navanInbox.configured) return null;
  return el('div', { class: 'card chart', style: 'border-left:5px solid #16A36A' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('div', {}, el('h2', {}, open.length ? `${open.length} new card charge${open.length > 1 ? 's' : ''} to review` : 'Navan card: nothing new to review'),
    el('div', { class: 'sub' }, navanInbox.err ? 'Could not refresh: ' + navanInbox.err : `Checked ${navanInbox.at ? new Date(navanInbox.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'just now'} · last 14 days · your ticket, golf, dining and entertainment charges`)), el('button', { class: 'btn sm', onclick: async () => { navanInbox.at = 0; await navanAuto(); renderPlan(); } }, 'Check now')),
    open.length ? el('div', {}, open.slice(0, 20).map((r) => navanCard(r, () => renderPlan()))) : null);
}
let navanHistBusy = '';
async function navanLoadHistory(months) { // reads back month by month in 60-day windows and keeps the sporting-event charges
  if (navanHistBusy) return; const t = today(); let end = t, n = 0; const stop = addDays(t, -Math.round(months * 30.5));
  try { await navanStatus(); if (!navanInbox.configured) throw new Error('Navan is not set up on the server yet'); while (end > stop) { const start = addDays(end, -59) < stop ? stop : addDays(end, -59); navanHistBusy = `Reading ${fmtDate(start)} to ${fmtDate(end)}…`; if (tab === 'plan') renderPlan(); navanHistMerge(await navanFetch(start, end)); n++; end = addDays(start, -1); } const h = navanHist(); h.from = stop; LS.set('necrm-navan-hist', h); say('Past charges loaded'); }
  catch (e) { say(e.message, 'err'); } finally { navanHistBusy = ''; if (tab === 'plan') renderPlan(); }
}
function navanHistoryCard() { // every sporting-event charge on the card, with the event it is linked to
  if (!navanInbox.configured) return null; const h = navanHist(), have = new Map(plan.events.filter((e) => e.navanTx).map((e) => [e.navanTx, e])), rows = h.rows, tot = rows.reduce((a, r) => a + r.amount, 0), byYear = tally(rows.map((r) => [r.date.slice(0, 4) || 'No date', r.amount]));
  const list = rows.slice(0, 80).map((r) => { const e = have.get(r.key); return e ? el('div', { class: 'row', onclick: () => openPlanEvent(e.id) }, el('div', { class: 'who' }, el('strong', {}, r.merchant || 'Card charge'), el('small', {}, `${fmtDate(r.date)} · linked to ${e.title}`)), el('b', { style: 'font-weight:500' }, money(r.amount))) : navanCard(r, () => renderPlan()); });
  return el('div', { class: 'card chart' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('div', {}, el('h2', {}, 'Past sporting-event charges'), el('div', { class: 'sub' }, rows.length ? `${rows.length} charges · ${money(tot)}${byYear.length ? ' · ' + byYear.map((y) => `${y.label}: ${money(y.value)}`).join(', ') : ''}${h.from ? ' · back to ' + fmtDate(h.from) : ''}` : 'Load your card history to see every ticket and sporting-event charge.')),
    el('button', { class: 'btn sm' + (rows.length ? '' : ' pri'), disabled: !!navanHistBusy, onclick: () => navanLoadHistory(12) }, navanHistBusy || (rows.length ? 'Reload 12 months' : 'Load past 12 months'))), list.length ? el('div', {}, list) : null, rows.length > 80 ? el('p', { class: 'hint' }, `Showing the latest 80 of ${rows.length}.`) : null);
}
async function openNavanPull() { // any date range, and every transaction, for when the inbox is not enough
  track('navan_pull_opened'); const t = today(); let rows = [], busy = false;
  const from = el('input', { type: 'date', value: addDays(t, -30) }), to = el('input', { type: 'date', value: t }), out = el('div', {}), all = el('input', { type: 'checkbox', style: 'width:auto', onchange: () => draw() });
  const draw = () => { const have = navanLinked(), shown = rows.filter((r) => (all.checked || r.outing) && !have.has(r.key));
    out.replaceChildren(el('p', { class: 'hint' }, `${rows.length} of your card transactions read · ${rows.filter((r) => r.outing).length} look like outings · ${rows.filter((r) => have.has(r.key)).length} already linked. Detected fields (check against Navan): ${rows[0] ? Object.entries(rows[0].fields).map(([k, v]) => `${k} = ${v}`).join(', ') : ''}.`),
      el('label', { class: 'mtg', style: 'margin:4px 0 8px' }, all, 'Show every transaction, not just outings'), shown.length ? el('div', { class: 'card' }, shown.slice(0, 60).map((r) => navanCard(r, draw))) : el('p', { class: 'hint' }, rows.length ? 'No outings in this range.' : 'Choose dates and pull.')); };
  const pull = el('button', { class: 'btn pri', onclick: async (e) => { if (busy) return; busy = true; const b = e.currentTarget; b.textContent = 'Reading Navan…';
    try { rows = await navanFetch(from.value, to.value); navanHistMerge(rows); draw(); track('navan_pulled', { n: rows.length }); } catch (er) { out.replaceChildren(el('div', { class: 'err' }, er.message)); } busy = false; b.textContent = 'Pull transactions'; } }, 'Pull transactions');
  let configured = false; try { configured = await navanStatus(); } catch { /* no server */ }
  const why = navanInbox.needs === 'cardholder' ? 'The Navan credentials are set, but NAVAN_CARDHOLDER is not. The credentials can see the whole company, so the server returns nothing until it knows whose charges to show. Set NAVAN_CARDHOLDER to your email, name or employee ID exactly as it appears on your card charges.'
    : 'Ask your Navan admin for API credentials (a client ID and secret) with access to card transactions, then set NAVAN_CLIENT_ID, NAVAN_CLIENT_SECRET and NAVAN_CARDHOLDER (your own email, name or employee ID) in the server environment. Never type them into the app. EU tenants also set NAVAN_AUTH_URL.';
  openSheet(el('h2', {}, 'Navan card transactions'), configured ? [el('p', { class: 'hint' }, 'Reads your own company card charges from Navan (read-only, up to 62 days at a time). New outing charges also appear on their own in Tickets & travel. Nothing is written to Navan.'), el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, el('div', { class: 'f' }, el('label', {}, 'From'), from), el('div', { class: 'f' }, el('label', {}, 'To'), to)), el('div', { class: 'bar' }, pull), out]
    : el('div', { class: 'panel', style: 'max-width:none;box-shadow:none' }, el('b', {}, 'Navan is not fully set up on the server yet. '), why), el('div', { class: 'bar' }, el('button', { class: 'btn', onclick: closeSheet }, 'Close')));
}

// installable app: cache the shell so the CRM opens from the home screen
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

// ---------------------------------------------------------------- Vcards company panel: when you search a company, show how many brokers we have there, who sends the most deal flow, and where their offices are
// Deal flow comes from the board's "Deals Closed / Won" flag until a FarOS export is imported (a CSV with each broker's email and a deal count); FarOS is not connected live.
const dealFlow = () => (dealFlow.c ||= LS.get('necrm-dealflow', { at: 0, by: {} }));
const flowOf = (c) => { const d = dealFlow().by[(c.email || '').toLowerCase()]; return d ? { n: Number(d.deals) || 0, last: d.last || '', src: 'FarOS export' } : { n: Number(c.closed) || 0, last: '', src: 'board' }; };
function companyHits(q) { // companies whose name matches what was typed, with every contact we have there
  const k = firmKey(q); if (k.length < 2) return []; const m = new Map();
  for (const c of data.contacts.list.filter(isPerson)) { if (!c.company) continue; const ck = firmKey(c.company); if (!ck || !(ck.includes(k) || (ck.length > 2 && k.includes(ck)))) continue; const e = m.get(ck) || { key: ck, name: c.company, list: [] }; e.list.push(c); m.set(ck, e); }
  return [...m.values()].sort((a, b) => b.list.length - a.list.length);
}
let vcMap = null, vcCo = '';
async function vcMiniMap(host, co) {
  if (typeof L === 'undefined') { host.textContent = 'The map library did not load.'; return; } if (vcMap) { vcMap.remove(); vcMap = null; }
  const m = L.map(host).setView([40.3, -74.8], 8); vcMap = m; const st = TILE_STYLES[mapStyle]; L.tileLayer(st.url, { maxZoom: 19, subdomains: st.sub, attribution: st.attr }).addTo(m);
  const pts = [], pin = (lat, lng, label, color, dash) => { L.circleMarker([lat, lng], { radius: 8, fillColor: color, fillOpacity: dash ? 0.4 : 1, color: dash ? color : '#fff', weight: 2, dashArray: dash ? '3 3' : null }).addTo(m).bindTooltip(label); pts.push([lat, lng]); };
  const addrs = new Map(), firm = firmOffices()[co.key]; if (firm) addrs.set(firm, 'Firm office'); for (const c of co.list) if (c.office && !addrs.has(c.office)) addrs.set(c.office, 'Office: ' + c.name);
  for (const [a, label] of addrs) { let pos = geoPeek(a); if (pos === undefined) pos = await geocode(a); if (vcMap !== m) return; if (pos) pin(pos.lat, pos.lng, label, '#1B2A3A', false); }
  if (!pts.length) for (const mk of [...new Set(co.list.map((c) => c.market).filter(Boolean))]) { const p = MARKET_PT[mk]; if (p) pin(p[0], p[1], mk + ' (approximate)', '#F59E0B', true); }
  if (vcMap === m && pts.length) m.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); setTimeout(() => vcMap === m && m.invalidateSize(), 80);
}
function vcImportFlow() {
  const f = el('input', { type: 'file', accept: '.csv,text/csv', hidden: true, onchange: async (e) => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; const [head, ...rows] = csvTable(await file.text()); if (!head) return say('That file is empty', 'err');
    const h = head.map((x) => x.trim().toLowerCase()), ei = h.findIndex((x) => /e-?mail/.test(x)), di = h.findIndex((x) => /deal|count|closed|received|total/.test(x)), li = h.findIndex((x) => /last|date/.test(x));
    if (ei < 0) return say('The file needs an email column (one row per broker)', 'err'); const by = {}; let n = 0;
    for (const r of rows) { const em = (r[ei] || '').trim().toLowerCase(); if (!em) continue; const d = di >= 0 ? Number(String(r[di]).replace(/[^0-9.]/g, '')) || 0 : 1; by[em] = { deals: (by[em]?.deals || 0) + (di >= 0 ? d : 1), last: li >= 0 ? (r[li] || '').trim().slice(0, 10) : by[em]?.last || '' }; n++; }
    const store = { at: Date.now(), by }; LS.set('necrm-dealflow', store); dealFlow.c = store; say(`Deal flow loaded for ${Object.keys(by).length} brokers`); renderPipeline(); } });
  return el('span', {}, el('button', { class: 'btn sm', title: 'A CSV with one row per broker: an email column, and a deal count (and optionally a last deal date)', onclick: () => f.click() }, dealFlow().at ? 'Re-import deal flow (CSV)' : 'Import deal flow (CSV)'), f);
}
function vcCompanyPanel(co, hits) {
  const tiers = { t1: 0, t2: 0, t3: 0, other: 0 }; for (const c of co.list) { const t = tierCls(c.tier); if (t in tiers) tiers[t]++; else tiers.other++; }
  const ranked = co.list.map((c) => ({ c, ...flowOf(c) })).sort((a, b) => b.n - a.n || a.c.name.localeCompare(b.c.name)), totalDeals = ranked.reduce((a, r) => a + r.n, 0), mx = Math.max(1, ...ranked.map((r) => r.n)), imported = dealFlow().at;
  const firm = firmOffices()[co.key], offices = new Map(); for (const c of co.list) if (c.office) offices.set(c.office, (offices.get(c.office) || 0) + 1);
  const markets = [...new Set(co.list.map((c) => c.market).filter(Boolean))], host = el('div', { class: 'vc-map' });
  const panel = el('div', { class: 'vc-panel' },
    hits.length > 1 ? el('div', { class: 'pills', style: 'padding:0 0 8px' }, hits.slice(0, 6).map((h) => el('button', { class: 'tp' + (h.key === co.key ? ' on' : ''), onclick: () => { vcCo = h.key; renderPipeline(); } }, h.name, el('b', {}, h.list.length)))) : null,
    el('div', { class: 'card chart', style: 'margin:0 0 10px' }, el('div', { class: 'sub', style: 'margin:0' }, 'Company'), el('h2', { style: 'margin:0 0 6px' }, co.name),
      el('div', { style: 'display:flex;align-items:baseline;gap:8px' }, el('b', { style: 'font:500 34px "Clash Display",Arial;color:var(--blue)' }, co.list.length), el('span', { class: 'hint' }, `broker${co.list.length === 1 ? '' : 's'} in the CRM`)),
      el('div', { class: 'hint' }, [`Tier 1: ${tiers.t1}`, `Tier 2: ${tiers.t2}`, `Tier 3: ${tiers.t3}`, tiers.other ? `Other: ${tiers.other}` : ''].filter(Boolean).join(' · '))),
    el('div', { class: 'card chart', style: 'margin:0 0 10px' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('h2', { style: 'margin:0' }, 'Deal flow'), vcImportFlow()),
      el('div', { class: 'sub' }, totalDeals ? `${totalDeals} deals from ${ranked.filter((r) => r.n).length} brokers · ${imported ? 'FarOS export' : 'board "Deals Closed / Won" flag'}` : 'No deal flow recorded for this company yet.'),
      totalDeals ? el('div', { class: 'bars' }, ranked.filter((r) => r.n).slice(0, 8).map((r, i) => el('div', { class: 'brow', style: 'cursor:pointer', onclick: () => openContact(r.c) }, el('span', { class: 'bl', title: r.c.name }, (i === 0 ? '★ ' : '') + r.c.name), el('div', { class: 'bt' }, el('i', { style: `width:${Math.max(4, r.n / mx * 100)}%;background:#F59E0B` })), el('b', {}, r.n))))
        : el('p', { class: 'hint', style: 'margin:6px 0 0' }, 'The board only flags closed deals. Import an export from FarOS (broker email and number of deals) to rank who sends the most.')),
    el('div', { class: 'card chart', style: 'margin:0' }, el('div', { class: 'bar', style: 'justify-content:space-between;margin:0' }, el('h2', { style: 'margin:0' }, 'Office locations'), el('button', { class: 'btn sm', onclick: openFirmOffices }, firm || offices.size ? 'Edit' : 'Set address')),
      el('div', { class: 'sub' }, firm || offices.size ? '' : `No office address yet.${markets.length ? ' Pins show the market area: ' + markets.join(', ') + '.' : ''}`),
      firm ? el('div', { class: 'note' }, 'Firm office', el('small', {}, firm)) : null, [...offices].map(([a, n]) => el('div', { class: 'note' }, a, el('small', {}, `${n} contact${n > 1 ? 's' : ''}`))), host));
  setTimeout(() => vcMiniMap(host, co), 60); return panel;
}
function vcLayout(board) { const hits = vcF.q.trim().length >= 2 ? companyHits(vcF.q) : []; if (vcMap && !hits.length) { vcMap.remove(); vcMap = null; } if (!hits.length) return board; const co = hits.find((h) => h.key === vcCo) || hits[0]; vcCo = co.key; return el('div', { class: 'vc-split' }, el('div', { class: 'vc-main' }, board), vcCompanyPanel(co, hits)); }

// ---------------------------------------------------------------- boot
$('#mode').onclick = async () => { if (!cfg.token || demo) return; await flush(); await load(); say('Refreshed from Monday'); };
setQ(getQ());
(async () => { await initServer(); if (location.protocol === 'file:' && !cfg.token) startDemo(); render(); await ms.finish(); if (cfg.token) { await flush(); await load(); const q = new URLSearchParams(location.search); if (q.get('new') && data.contacts) { handleDeepLink(q); history.replaceState(null, '', location.pathname); } } })();
