#!/usr/bin/env python3
"""Regenerate src/main.js, src/styles.css and index.html from the standalone app source, re-applying the FaroMaker changes
(server-held Monday token, PostHog via posthog-js). Usage: python3 scripts/sync-from-standalone.py path/to/crm/standalone/app.src.html"""
import re, sys, os
SRC = sys.argv[1]; root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
s = open(SRC).read()
css = s[s.index('<style>')+7:s.index('</style>')]
css = css.replace('/*FONTS*/', "@font-face{font-family:'Clash Display';font-weight:500;font-display:swap;src:url('/fonts/ClashDisplay-Medium.otf') format('opentype')}\n@font-face{font-family:'Roboto';font-weight:400;font-display:swap;src:url('/fonts/roboto.woff2') format('woff2')}").replace('/*LEAFLET_CSS*/', '')
open('src/styles.css', 'w').write(css.strip()+'\n')
body = s[s.index('</style></head><body>')+len('</style></head><body>'):s.index('<script>/*LEAFLET_JS*/</script>')]
logo = open(os.path.join(os.path.dirname(SRC), '..', 'public', 'FP-logo_light.svg')).read()
logo = re.sub(r'<\?xml[^>]*>', '', logo).replace('<svg ', '<svg aria-label="Faropoint" ', 1).strip()
open('index.html', 'w').write(s[:s.index('<style>')]+'<link rel="icon" href="/Favicon.svg">\n</head><body>'+body.replace('<!--LOGO-->', logo)+'<script type="module" src="/src/main.js"></script>\n</body></html>\n')
js = s[s.index('<script>\n', s.index('LEAFLET_JS'))+9:s.rindex('</script>')]
def sub(a, b):
    global js
    assert a in js, 'standalone source changed; update this script: ' + a[:70]
    js = js.replace(a, b, 1)
sub("try { r = await fetch('https://api.monday.com/v2', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: cfg.token, 'API-Version': '2024-10' }, body: JSON.stringify({ query, variables }) }); }",
    "try { r = await fetch(SERVER.monday ? '/api/monday' : 'https://api.monday.com/v2', { method: 'POST', headers: SERVER.monday ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', Authorization: cfg.token, 'API-Version': '2024-10' }, body: JSON.stringify({ query, variables }) }); }")
sub("async function gql(query, variables) {", """// FaroMaker: the backend holds the Monday token and proxies calls, so the browser never sees it. Without the backend the app falls back to a token typed in Settings.
const SERVER = { monday: false, faros: false, user: null };
async function initServer() {
  try { const h = await (await fetch('/api/health')).json(); SERVER.monday = !!h.monday; SERVER.faros = !!h.faros; } catch { /* no backend: standalone mode */ }
  if (SERVER.monday) cfg.token = 'server-managed'; else if (cfg.token === 'server-managed') cfg.token = '';
  try { const me = await (await fetch('/api/me')).json(); if (me?.id) { SERVER.user = me.id; identifyUser(me.id); } } catch { /* anonymous */ }
}
async function gql(query, variables) {""")
sub("function track(name, props) {\n  if (!cfg.phKey", "function track(name, props) {\n  if (trackEvent(name, props)) return;\n  if (!cfg.phKey")
sub("(async () => { render(); await ms.finish();", "(async () => { await initServer(); render(); await ms.finish();")
pre = "import 'leaflet/dist/leaflet.css';\nimport './styles.css';\nimport L from 'leaflet';\nimport { trackEvent, identifyUser, analyticsReady } from './analytics.js';\nwindow.L = L;\n\n"
open('src/main.js', 'w').write(pre+js)
print('synced', len(js)//1024, 'KB')
