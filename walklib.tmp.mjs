import { chromium } from 'playwright';
import fs from 'fs';
export const W='/private/tmp/claude-501/-Users-mako/f8341422-3bf2-4662-98f4-b581b1366784/scratchpad/walk';
export const BASE='http://localhost:3172';
const KW=/\b(bet|bets|betting|stake|stakes|pot|wager\w*|jackpot|luck|lucky|spin\w*|casino|slots?|gambl\w*|winner takes|entry|cost|not enough coins|odds|mystery|surprise|prize\w*)\b/gi;
export async function open(){
  const browser=await chromium.launch();
  const ctxOpts={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'};
  if(fs.existsSync(W+'/state.json')) ctxOpts.storageState=W+'/state.json';
  const ctx=await browser.newContext(ctxOpts);
  const page=await ctx.newPage();
  page.on('console',m=>{ if(['error','warning'].includes(m.type())) fs.appendFileSync(W+'/console.log',`[${m.type()}] ${page.url()} :: ${m.text().slice(0,400)}\n`);});
  page.on('pageerror',e=>fs.appendFileSync(W+'/console.log',`[pageerror] ${page.url()} :: ${e.message.slice(0,400)}\n`));
  page.on('response',r=>{ if(r.status()>=400) fs.appendFileSync(W+'/console.log',`[http ${r.status()}] ${r.url().slice(0,200)}\n`);});
  return {browser,ctx,page};
}
export async function snap(page,name){
  await page.waitForTimeout(600);
  await page.screenshot({path:`${W}/${name}.png`});
  let t=''; try{ t=await page.evaluate(()=>document.body.innerText);}catch{}
  fs.writeFileSync(`${W}/${name}.txt`,page.url()+'\n'+t);
  const hits=[...new Set((t.match(KW)||[]).map(s=>s.toLowerCase()))];
  console.log(`== ${name} ${page.url()} hits:${hits.join(',')}`);
  console.log(t.replace(/\n+/g,' | ').slice(0,700));
}
export async function save(ctx){ await ctx.storageState({path:W+'/state.json'}); }
export async function clickables(page){
  return page.evaluate(()=>[...document.querySelectorAll('button,a,[role=button],[onclick]')].filter(e=>e.offsetParent!==null).map(e=>(e.innerText||e.getAttribute('aria-label')||e.getAttribute('href')||'').trim().replace(/\s+/g,' ').slice(0,50)).filter(Boolean));
}
