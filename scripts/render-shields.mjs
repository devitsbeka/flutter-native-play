import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// 4x: crisp on 3x iPhones with margin to spare.
const page = await browser.newPage({ viewport: { width: 300, height: 300 }, deviceScaleFactor: 4 });

for (const [name, cssW, cssH] of [
  ['shield-outer', 74.4, 101.621],
  ['shield-inner', 86.9824, 114.034],
]) {
  const svg = readFileSync(`src/assets/figma-home/${name}.svg`, 'utf8');
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}#box{width:${cssW}px;height:${cssH}px}</style><div id="box">${svg.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div>`
  );
  await page.waitForTimeout(300);
  const el = page.locator('#box');
  await el.screenshot({ path: `src/assets/figma-home/${name}.png`, omitBackground: true });
  console.log(name, 'rendered');
}
await browser.close();
