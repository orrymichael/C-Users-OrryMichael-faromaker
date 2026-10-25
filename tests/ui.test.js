// Browser test of the map, Today and Vcards features, run against the single-file demo build (npm run build:single) with its made-up sample data. Needs Playwright (NODE_PATH) and Chrome.
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const file = pathToFileURL(path.resolve('dist-single/Northeast-CRM-Demo.html')).href;
const b = await chromium.launch({ channel: 'chrome' }), errs = [];
const open = async (vp = { width: 1360, height: 900 }) => { const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(file); await p.waitForTimeout(1200); return { ctx, p }; };
const tab = async (p, t) => { await p.locator('#tabs button', { hasText: t }).first().click(); await p.waitForTimeout(700); };

{ // opens straight into the sample demo
  const { ctx, p } = await open(); assert.equal(await p.textContent('#mode'), 'Sample data'); await ctx.close(); }

{ // map: FarOS layer, filters, contact assets, hide and show
  const { ctx, p } = await open(); await tab(p, 'Contacts'); await p.waitForTimeout(2000);
  const bar = () => p.evaluate(() => document.querySelector('.mapf.fp').innerText), diamonds = () => p.evaluate(() => document.querySelectorAll('.fp-dia').length);
  assert.match(await bar(), /Closed · \d+ deals/); assert.match(await bar(), /In pipeline · \d+ deals/); const all = await diamonds(); assert.ok(all > 0, 'pipeline pins are drawn');
  await p.locator('.mapf.fp .fchip', { hasText: 'In pipeline' }).click(); await p.waitForTimeout(400); assert.equal(await diamonds(), 0, 'pipeline switched off');
  await p.locator('.mapf.fp .fchip', { hasText: 'In pipeline' }).click(); await p.waitForTimeout(400); assert.equal(await diamonds(), all);
  await p.locator('.mapf.fp .fchip', { hasText: 'Fund 1' }).click(); await p.waitForTimeout(400); assert.ok((await diamonds()) < all, 'fund filter narrows the pipeline'); await p.locator('.mapf.fp .fchip', { hasText: 'Fund 1' }).click();
  await p.locator('#view .row', { hasText: 'Casey Rivera' }).first().click(); await p.waitForTimeout(1500);
  assert.match(await p.evaluate(() => document.querySelector('.mapcol .card.chart')?.innerText || ''), /Casey Rivera: \d+ FarOS deals/);
  await p.getByRole('button', { name: 'Hide map' }).click(); assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.mapcol')).display), 'none'); await p.getByRole('button', { name: 'Show map' }).click(); await ctx.close(); }

{ // firm offices: add a new item
  const { ctx, p } = await open(); await tab(p, 'Contacts'); await p.waitForTimeout(1500); await p.getByText('Set firm offices').click(); await p.getByRole('button', { name: '+ Add new' }).click();
  await p.locator('#sheetIn input[placeholder^="Firm or place"]').fill('Test Firm'); await p.locator('#sheetIn input[placeholder="Street, City, ST ZIP"]').first().fill('1 Main St, Newark, NJ 07102'); await p.getByRole('button', { name: 'Add to the list' }).click(); await p.waitForTimeout(800);
  assert.match(await p.evaluate(() => document.querySelector('#sheetIn').innerText), /test firm . added by you/i); await ctx.close(); }

{ // today: a short list, tiles, and the map switch
  const { ctx, p } = await open(); const n = await p.evaluate(() => document.querySelectorAll('.prio').length); assert.ok(n <= 8, 'priority list is capped'); assert.ok(await p.evaluate(() => document.querySelectorAll('.kpis .k').length >= 4));
  assert.ok(await p.evaluate(() => !!document.querySelector('.today-map')), 'map on by default on a wide screen'); await p.getByRole('button', { name: 'Hide map' }).click(); assert.ok(await p.evaluate(() => !document.querySelector('.today-map'))); await ctx.close(); }

{ // vcards: filters and the company panel
  const { ctx, p } = await open(); await tab(p, 'Vcards'); const cards = () => p.evaluate(() => document.querySelectorAll('.kd').length); const all = await cards(); assert.ok(all > 3);
  await p.locator('.vc-filters select').nth(3).selectOption('overdue'); await p.waitForTimeout(400); assert.ok((await cards()) < all, 'follow-up filter narrows the board');
  await p.getByRole('button', { name: /Clear filters/ }).click(); await p.waitForTimeout(400); assert.equal(await cards(), all);
  await p.locator('#view input[type=search]').click(); await p.keyboard.type('demo comm', { delay: 40 }); await p.waitForTimeout(1200);
  assert.match(await p.evaluate(() => document.querySelector('.vc-panel')?.innerText || ''), /brokers in the CRM/); await ctx.close(); }

{ // phone: no sideways scroll on the new screens, and Move to tier is available
  const { ctx, p } = await open({ width: 390, height: 844 }); for (const t of ['Today', 'Contacts', 'BD', 'Vcards']) { await tab(p, t); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${t} fits the phone width`); }
  assert.ok(await p.evaluate(() => getComputedStyle(document.querySelector('.kd-move')).display !== 'none'), 'Move to tier shows on touch'); await ctx.close(); }

await b.close(); assert.deepEqual(errs, [], 'no page errors'); console.log('ui OK');
