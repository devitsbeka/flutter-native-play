import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 500, height: 946 }, deviceScaleFactor: 2 });
await ctx.addInitScript(([lang]) => { try { localStorage.setItem('preferredLanguage', lang); } catch { /* ignore */ } }, [process.argv[4] || 'ka']);
const p = await ctx.newPage();
await p.goto(process.argv[2], { waitUntil: 'domcontentloaded' });
await p.waitForSelector('h1', { timeout: 20000 });
await p.waitForTimeout(2000);
const box = await p.evaluate(() => {
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  return { icon: q('h1') && q('section') ? undefined : undefined, h1: q('h1'), card: q('section'), h3: q('h3'), start: q('.z-20.shrink-0.px-4 button') };
});
console.log(JSON.stringify(box));
await p.screenshot({ path: process.argv[3], fullPage: process.argv[5] === 'full' });
await b.close();
