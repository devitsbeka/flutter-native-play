import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 500, height: 946 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('preferredLanguage', 'ka'); } catch { /* ignore */ } });
const p = await ctx.newPage();
await p.goto(process.argv[2], { waitUntil: 'domcontentloaded' });
await p.waitForSelector('h1', { timeout: 20000 });
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const sc = [...document.querySelectorAll('div')].find(d => d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY === 'auto');
  if (sc) sc.scrollTop = sc.scrollHeight;
});
await p.waitForTimeout(600);
await p.screenshot({ path: process.argv[3] });
await b.close();
