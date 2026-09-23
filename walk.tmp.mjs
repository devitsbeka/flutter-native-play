import {open,snap,save,clickables,W} from './walklib.tmp.mjs';
const {browser,ctx,page}=await open();
page.setDefaultTimeout(6000);
await page.goto('http://localhost:3172/game',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(7000);
console.log('LS', await page.evaluate(()=>localStorage.getItem('mytrivia_guest_plays')));
const btns=page.locator('button:visible'); const n=await btns.count();
for(let i=0;i<n;i++){ const t=(await btns.nth(i).innerText()).trim(); const a=await btns.nth(i).getAttribute('aria-label'); if(!t&&!a){ await btns.nth(i).click().catch(()=>{}); break; } }
await page.waitForTimeout(1500);
await page.getByText('Start!',{exact:true}).click();
const SAFE=/^(Next Question|Continue|Next|Claim|Collect|Done|OK|Got it|Skip|See results|Results)$/i;
let lastQ='', same=0, shot=0;
for(let q=1;q<=60;q++){
  await page.waitForTimeout(2000);
  if(!page.url().startsWith('http://localhost:3172/game')){ console.log('LEFT GAME', page.url()); await snap(page,`31-left-game`); break; }
  const txt=await page.evaluate(()=>document.body.innerText);
  const c=await clickables(page);
  const safe=c.find(t=>SAFE.test(t));
  const isQ=/\nA\n/.test(txt) && /\nD\n/.test(txt);
  const qline=txt.split('\n').find(l=>l.endsWith('?'))||'';
  if(isQ && qline!==lastQ){ shot++; await snap(page,`29-q${shot}`); lastQ=qline; same=0;
    // tap option C
    const loc=page.getByText('C',{exact:true}).first(); await loc.click().catch(e=>console.log('optfail')); await page.waitForTimeout(1200); await snap(page,`29-q${shot}-answered`); continue; }
  if(isQ){ same++; if(same===3) await snap(page,`29-q${shot}-stuck`); if(same>8){console.log('STUCK'); break;} }
  if(safe){ console.log('CLICK',safe); await page.getByText(safe,{exact:true}).first().click().catch(()=>{}); continue; }
  if(!isQ){ await snap(page,`32-post-${q}`); console.log('BTN',JSON.stringify(c)); if(c.some(t=>/play again|rematch|home|new game/i.test(t))) break; }
}
await save(ctx); await browser.close();
