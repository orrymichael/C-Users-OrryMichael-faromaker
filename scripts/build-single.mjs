// Builds one self-contained HTML file (all code, styles, fonts and icons inside) from the Vite build, so it can be opened by double-click without a server.
// Opened from disk it starts in the sample-data demo; nothing connects to Monday, Outlook, Navan or any ticket site.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist'), out = path.resolve('dist-single');
const read = (p) => fs.readFileSync(path.join(dist, p));
const mime = { '.woff2': 'font/woff2', '.otf': 'font/otf', '.svg': 'image/svg+xml', '.png': 'image/png' };
const dataUri = (p) => `data:${mime[path.extname(p)] || 'application/octet-stream'};base64,${read(p).toString('base64')}`;

let html = read('index.html').toString('utf8');
const cssHref = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/.exec(html), jsSrc = /<script type="module"[^>]*src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/.exec(html);
if (!cssHref || !jsSrc) throw new Error('could not find the built CSS and JS in dist/index.html. Run "npm run build" first.');

let css = read(cssHref[1].slice(1)).toString('utf8');
css = css.replace(/url\((\/fonts\/[^)]+)\)/g, (m, p) => `url(${dataUri(p.slice(1))})`);
const left = [...css.matchAll(/url\((?!data:|#)([^)]+)\)/g)].map((m) => m[1]); if (left.length) throw new Error('unresolved url() in CSS: ' + left.slice(0, 3).join(', '));
const js = read(jsSrc[1].slice(1)).toString('utf8').replace(/<\/script/gi, '<\\/script');

html = html.replace(cssHref[0], () => `<style>${css}</style>`)
  .replace(jsSrc[0], () => '')                                             // the script goes at the end of the body so the page exists when it runs
  .replace(/<link rel="manifest"[^>]*>|<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace(/<link rel="icon" href="\/Favicon.svg">/, () => `<link rel="icon" href="${dataUri('Favicon.svg')}">`)
  .replace('</body>', () => `<script type="module">${js}</script></body>`);
if (/(src|href)="\/(assets|fonts)\//.test(html)) throw new Error('an asset reference is still external');

fs.mkdirSync(out, { recursive: true });
const file = path.join(out, 'Northeast-CRM-Demo.html'); fs.writeFileSync(file, html);
console.log(`wrote ${file} (${(html.length / 1048576).toFixed(2)} MB)`);
