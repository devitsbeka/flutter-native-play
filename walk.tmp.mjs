import {open,snap,save,clickables,W} from './walklib.tmp.mjs';
const {browser,ctx,page}=await open();
page.setDefaultTimeout(6000);
await page.goto('http://localhost:3172/words',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(5000);
const P={A:[195,590],B:[285,655],O:[250,760],U:[140,760],T:[105,655]};
async function word(w){ const pts=[...w].map(c=>P[c]); await page.mouse.move(...pts[0]); await page.mouse.down(); for(const p of pts.slice(1)){ await page.mouse.move(p[0],p[1],{steps:6}); await page.waitForTimeout(80);} await page.mouse.up(); await page.waitForTimeout(1500); }
let k=0;
for(const w of ['ABOUT','AUTO','BOAT','TUBA','TAB','BUT','OUT','TUB','OAT','BOA','BAT','TAU','BOUT']){
  await word(w); k++;
  const t=await page.evaluate(()=>document.body.innerText);
  console.log(w, t.replace(/\n+/g,' | ').slice(0,200));
  if(k===1) await snap(page,'36-words-after-first');
  if(!/MOUNTAIN 1\/3/.test(t) || /complete|bonus|great|excellent|next/i.test(t)){ await snap(page,`37-words-event-${w}`); }
}
await page.waitForTimeout(3000); await snap(page,'38-words-end'); console.log(await clickables(page));
await save(ctx); await browser.close();
