// MyTrivia TV — the web big screen (plans/tv-mode-v2.md §3.1, task A).
//
// Read-only and anonymous: the page shows a random 4-digit code and polls the
// CloudKit public-DB record `TVScreen` named `tvs.<code>`. The HOST iPhone
// creates/claims that record when someone types the code (CloudKit JS cannot
// write the public DB without an iCloud sign-in, and a TV must not need one).
// The page accepts a claim only if it is newer than the code it is showing and
// then pins that party; it draws everything from the record's `payload`
// (TVScreenState JSON, MTTV/Engine/TVScreenState.swift) and runs clocks locally
// from phaseStartsAt / phaseEndsAt.
//
// No input needed beyond loading the page. No purchases, no ads, no tracking,
// no third-party scripts (only Apple's CloudKit JS, loaded from Apple's CDN).
(function () {
  'use strict';

  const CFG = window.MTTV_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const CODE_ROTATE_MS = 5 * 60 * 1000;   // unclaimed codes rotate every 5 min
  const CLAIM_GRACE_MS = 5000;            // accept claims up to 5 s older than the code on screen
  const POLL_PAIRING_MS = 1500;
  const POLL_BOUND_MS = 1000;
  const LOST_AFTER_MS = 90 * 1000;        // no readable record this long while bound → new code

  const $stage = document.getElementById('stage');
  const $root = document.getElementById('root');
  const $net = document.getElementById('net');
  const $lane = document.getElementById('lane');

  // ---------- Stage scaling (1920×1080 grid → any screen) ----------
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    // #stage sits at 50%/50% with origin 0 0: scale, then pull back by half its scaled size.
    $stage.style.transform = `translate(${-960 * s}px, ${-540 * s}px) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n) => { try { return new Intl.NumberFormat(window.MTLang).format(n); } catch (_) { return String(n); } };
  const PALETTE = [['#8B5CF6', '#EC4899'], ['#38BDF8', '#6366F1'], ['#F59E0B', '#EF4444'], ['#10B981', '#0EA5E9'], ['#F472B6', '#A855F7'], ['#22D3EE', '#14B8A6'], ['#FB923C', '#F43F5E'], ['#A3E635', '#16A34A']];
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) | 0; return Math.abs(h); }
  function initials(name) { // kept for i18n-less fallbacks
    const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    const a = Array.from(parts[0] || '?')[0] || '?';
    const b = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] : '';
    return (a + b).toUpperCase();
  }
  // Avatar: the state's preset id ("a1"…"a10" → assets/avatars/), an https
  // image URL, or an emoji; older payloads carry none → a stable preset from
  // the player id (FNV-1a, the same pick MTTV makes host-side).
  function preset(id) {
    let h = 2166136261;
    for (const b of new TextEncoder().encode(String(id || ''))) h = Math.imul(h ^ b, 16777619) >>> 0;
    return 'a' + ((h % 10) + 1);
  }
  function avatarInner(p) {
    const a = p.avatar;
    if (typeof a === 'string' && /^a\d{1,2}$/.test(a)) return `<img src="assets/avatars/${a}.png" alt="">`;
    if (typeof a === 'string' && /^https:\/\//.test(a)) return `<img src="${esc(a)}" alt="" referrerpolicy="no-referrer">`;
    if (typeof a === 'string' && a && Array.from(a).length <= 2) return `<span class="emo">${esc(a)}</span>`;
    return `<img src="assets/avatars/${preset(p.id || p.name)}.png" alt="">`;
  }
  function avatar(p, cls) {
    const [c1, c2] = PALETTE[hash(p.id || p.name) % PALETTE.length];
    return `<span class="av ${cls || ''}" style="--c1:${c1};--c2:${c2}">${avatarInner(p)}</span>`;
  }
  const digits = (code) => `<div class="digits">${Array.from(code).map((d) => `<div class="digit">${esc(d)}</div>`).join('')}</div>`;
  const wordmark = '<img class="wordmark" src="assets/art/wordmark.svg" alt="MyTrivia">';
  const RING_R = 56, RING_C = 2 * Math.PI * RING_R;
  const ring = (cls) => `<div class="ring ${cls || ''}" data-clock><svg viewBox="0 0 132 132"><circle class="track" cx="66" cy="66" r="${RING_R + 4}" stroke-width="0"/><circle class="bar" cx="66" cy="66" r="${RING_R}" stroke-width="12" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg><div class="num"></div></div>`;

  // ---------- Clock (host epoch seconds → local) ----------
  // Host times are the host's wall clock. Phones and TVs are normally NTP-synced;
  // we estimate skew from sentAt vs receive time (min over recent samples = least
  // latency) and apply it only when it is clearly a skew, not just latency.
  const skewSamples = [];
  let skewMs = 0;
  function noteSkew(sentAtSec) {
    if (typeof sentAtSec !== 'number') return;
    skewSamples.push(Date.now() - sentAtSec * 1000);
    if (skewSamples.length > 20) skewSamples.shift();
    const m = Math.min.apply(null, skewSamples);
    skewMs = Math.abs(m) > 1500 ? m : 0;
  }
  const hostNow = () => (Date.now() - skewMs) / 1000;

  // ---------- App state ----------
  let mode = 'pairing';           // pairing | bound
  let code = '';
  let shownAt = 0;
  let pinnedParty = null;
  let lastGood = 0;
  let state = null;               // current TVScreenState
  let assetURLs = {};             // record asset field → Apple CDN downloadURL
  let screenKey = '';
  let seenPlayers = new Set();
  let failures = 0;

  // A reload (or the TV browser restarting the tab) mid-party keeps the same code and
  // bound party, so the host doesn't have to pair again: {code, shownAt, party, at}.
  const KEEP_KEY = 'mt.tv2.screen';
  const KEEP_MS = 15 * 60 * 1000;         // = the record's expiry window
  function keep() {
    if (DEMO) return;
    try { localStorage.setItem(KEEP_KEY, JSON.stringify({ code, shownAt, party: pinnedParty, at: Date.now() })); } catch (_) { /* private mode */ }
  }
  function restore() {
    try {
      const k = JSON.parse(localStorage.getItem(KEEP_KEY) || 'null');
      if (!k || !/^[1-9]\d{3}$/.test(k.code) || Date.now() - k.at > KEEP_MS) return false;
      code = k.code; shownAt = k.shownAt; pinnedParty = k.party || null;
      mode = pinnedParty ? 'bound' : 'pairing';
      lastGood = Date.now();
      // Pairing again (no party yet): the code may be near its rotation — that's fine.
      renderPairing(!!pinnedParty);
      return true;
    } catch (_) { return false; }
  }

  function newCode() {
    const a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    code = String(1000 + (a[0] % 9000));
    shownAt = Date.now();
    mode = 'pairing'; pinnedParty = null; state = null; assetURLs = {};
    seenPlayers = new Set();
    keep();
    renderPairing();
  }

  // ---------- Rendering ----------
  function swap(key, html, staticRedraw) {
    if (key === screenKey && staticRedraw) {
      $root.firstElementChild.classList.add('static');
      $root.firstElementChild.classList.remove('enter');
      $root.firstElementChild.innerHTML = html;
      return;
    }
    screenKey = key;
    const el = document.createElement('div');
    el.className = 'screen enter';
    el.innerHTML = html;
    const old = $root.firstElementChild;
    if (old) { old.classList.add('leave'); setTimeout(() => old.remove(), 300); }
    $root.appendChild(el);
    tick();
  }

  function renderPairing(connected) {
    const html = `
      <div class="topbar">${wordmark}<span class="pill">📺 ${esc(t('brand'))}</span></div>
      <div class="pair">
        <div>
          <h1 class="display">${esc(t('pairTitle'))}</h1>
          <ol class="steps">
            <li><span class="n">1</span><span>${esc(t('step1'))}</span></li>
            <li><span class="n">2</span><span>${t('step2') /* trusted: our own strings with <br>/<small> */}</span></li>
            <li class="hot"><span class="n">3</span><span>${esc(t('step3'))}</span></li>
          </ol>
        </div>
        <div class="card codecard">
          <img class="tvart" src="assets/art/retro-tv-3d.png" alt="">
          <div class="label">${esc(t('step3'))}</div>
          ${digits(code)}
          <div class="wait">${connected ? esc(t('connected')) : esc(t('waitingHost'))} <span class="dots"><i></i><i></i><i></i></span></div>
        </div>
      </div>
      ${CFG.apiToken || DEMO ? '' : `<div class="note">${esc(t('setup'))}</div>`}`;
    swap('pair-' + code + (connected ? '-c' : ''), html);
  }

  function headPills(s) {
    const pills = [];
    if (s.roundTitle) pills.push(`<span class="pill">${esc(s.roundTitle)}</span>`);
    if (s.totalRounds > 1) pills.push(`<span class="pill">${esc(t('roundOf', { i: s.roundNumber, n: s.totalRounds }))}</span>`);
    return pills.join('');
  }

  function render(s, fresh) {
    const q = s.question;
    const key = [s.partyID, s.phase, s.roundNumber, q ? q.index : '', s.phase === 'countdown' ? Math.round(s.phaseEndsAt || 0) : ''].join('|');
    const same = key === screenKey;
    const players = (s.players || []).filter((p) => !p.isObserver || s.phase === 'lobby');
    let html = '';
    switch (s.phase) {
      case 'lobby': {
        const connected = (s.players || []).filter((p) => p.isConnected);
        const chips = (s.players || []).slice(0, 12).map((p) => {
          const isNew = !seenPlayers.has(p.id); seenPlayers.add(p.id);
          return `<div class="chip ${isNew ? 'new' : ''} ${p.isConnected ? '' : 'off'}">${avatar(p)}<span class="nm">${esc(p.name)}</span>${p.isHost ? '<img class="crown" src="assets/art/crown-3d.png" alt="">' : ''}</div>`;
        }).join('');
        const counting = s.phaseEndsAt && s.phaseEndsAt > hostNow();
        html = `
          <div class="topbar">${wordmark}${s.roomName ? `<span class="pill">${esc(s.roomName)}</span>` : ''}</div>
          <div class="lobby">
            <div>
              <h1 class="display">${esc(t('lobbyTitle'))}</h1>
              <div class="how">${t('lobbyHow')}</div>
              ${digits(s.code || code)}
              <div class="status">${counting ? ring('sm') + `<span class="gold">${esc(t('startingSoon'))}</span>` : `<span class="muted">${esc(t('waitingPlayers'))}</span> <span class="dots"><i></i><i></i><i></i></span>`}</div>
            </div>
            <div class="roster">
              <h2>${esc(t('players', { n: connected.length }))}</h2>
              <div class="grid">${chips}</div>
              ${(s.players || []).length > 12 ? `<div class="more">+${(s.players || []).length - 12}</div>` : ''}
            </div>
          </div>`;
        break;
      }
      case 'poll': {
        const total = Math.max(1, (s.poll || []).reduce((a, o) => a + (o.votes || 0), 0));
        html = `
          <div class="qhead"><span class="pill">🗳️ ${esc(t('poll'))}</span><span class="grow"></span>${s.phaseEndsAt ? ring() : ''}</div>
          <div class="poll">${(s.poll || []).map((o) => `
            <div class="pbar"><span class="fill" style="width:${(100 * (o.votes || 0)) / total}%"></span>
              <span>${esc(o.title)}</span>${o.suggestedBy ? `<span class="by">${esc(o.suggestedBy)}</span>` : ''}<span class="v">${nf(o.votes || 0)}</span></div>`).join('')}
          </div>`;
        break;
      }
      case 'loading':
      case 'roundIntro':
        html = `
          <div class="topbar">${wordmark}${s.roomName ? `<span class="pill">${esc(s.roomName)}</span>` : ''}</div>
          <div class="center">
            <img class="hero" src="assets/art/retro-tv-3d.png" alt="">
            <div class="big display">${esc(s.roundTitle || t('getReady'))}</div>
            <div class="sub">${esc(s.phase === 'loading' ? t('loading') : (s.totalRounds > 1 ? t('roundOf', { i: s.roundNumber, n: s.totalRounds }) : t('getReady')))}</div>
          </div>`;
        break;
      case 'countdown':
        html = `<div class="center"><div class="sub display">${esc(t('getReady'))}</div><div class="count" data-count></div></div>`;
        break;
      case 'question':
      case 'reveal': {
        if (!q) { html = ''; break; }
        const revealed = s.phase === 'reveal' && typeof q.correctIndex === 'number';
        const tally = q.tally || [];
        const maxT = Math.max(1, ...tally);
        const answeredN = players.filter((p) => p.answered).length;
        const long = (q.text || '').length > 110;
        // Picture questions (owner): the picture ONLY, large and centred — no question text.
        // `question.image` names the record's asset field holding it (e.g. "picture");
        // older payloads say `hasPicture` (field "picture"). No URL yet → text fallback.
        const imgKey = q.image || (q.hasPicture ? 'picture' : null);
        const picURL = imgKey ? (/^(https?:|fixtures\/)/.test(imgKey) ? imgKey : (assetURLs[imgKey] || null)) : null;
        const pic = picURL ? `<img src="${esc(picURL)}" alt="">` : '';
        const tiles = (q.options || []).map((o, i) => {
          const right = revealed && q.correctIndex === i;
          const cls = revealed ? (right ? 'right' : 'wrong') : '';
          const n = tally[i] || 0;
          return `<div class="ans ${cls}"><span class="fill" style="width:${revealed ? (100 * n) / maxT : 0}%"></span>
            <span class="letter">${'ABCD'[i] || i + 1}</span><span class="txt ${String(o).length > 38 ? 'long' : ''}">${esc(o)}</span>
            ${revealed ? `<span class="cnt">${nf(n)}</span>` : ''}</div>`;
        }).join('');
        const nobody = revealed && !(tally[q.correctIndex] > 0);
        html = `
          <div class="lanegap"></div>
          <div class="qhead">
            <span class="pill">${esc(t('questionOf', { i: q.index + 1, n: q.count }))}</span>${headPills(s)}
            <span class="grow"></span>
            ${revealed ? `<span class="banner ${nobody ? 'none' : ''}">${nobody ? esc(t('nobody')) : '✓ ' + esc(t('correct'))}</span>` : `<span class="pill cnt" data-answered>${esc(t('answered', { n: answeredN }))}</span>${ring()}`}
          </div>
          <div class="card qcard ${long ? 'long' : ''} ${pic ? 'pic' : ''}">${pic || `<div class="qt">${esc(q.text)}</div>`}</div>
          <div class="answers ${revealed ? 'reveal' : ''}">${tiles}</div>`;
        html = `<div class="${revealed ? 'reveal' : ''}" style="display:contents">${html}</div>`;
        break;
      }
      case 'roundResults': {
        html = leaderboard(s, t('leaderboard'));
        break;
      }
      case 'completed': {
        const st = standingsOf(s);
        const [a, b, c] = [st[0], st[1], st[2]];
        const byId = {}; (s.players || []).forEach((pl) => { byId[pl.id] = pl; });
        const step = (p, n, img) => p ? `<div class="step p${n}"><img class="trophy" src="assets/art/${img}.png" alt="">${avatar(Object.assign({ id: p.playerID, name: p.name }, byId[p.playerID] ? { avatar: byId[p.playerID].avatar } : {}), 'big')}<div class="who">${esc(p.name)}</div><div class="pts">${nf(p.score)} ${esc(t('pts'))}</div><div class="block">${n}</div></div>` : '';
        html = `
          <div class="topbar">${wordmark}<span class="pill">🏆 ${esc(t('finalResults'))}</span></div>
          <div class="podium">${step(b, 2, 'trophy-silver')}${step(a, 1, 'trophy-gold')}${step(c, 3, 'trophy-bronze')}</div>
          <div class="confetti">${confetti()}</div>`;
        break;
      }
      case 'ended':
        html = `<div class="center"><img class="hero" src="assets/art/retro-tv-3d.png" alt=""><div class="big display">${esc(t('thanks'))}</div><div class="sub">${esc(t('ended'))}</div></div>`;
        break;
      default:
        html = `<div class="center"><div class="sub">${esc(t('waitingHost'))}</div></div>`;
    }
    swap(key, html, same && !fresh);
    updateLane(s);
  }

  // ---------- Answer lane (question + reveal) ----------
  // The 1.x TV's lane (TVQuestionScreenV4), rebuilt for the 1920 stage: every
  // player's avatar sits centred with a yellow ring while they think; the
  // moment their answer arrives (`correct` is published per player as soon as
  // they answer) it springs to the right edge (green) if right, the left edge
  // (red) if wrong. At the time-out the ones who never answered go left too.
  // Arrivals stack inward from each edge in answer order, so nobody already
  // there moves; several arrivals in one poll are staggered. The next question
  // pulls everyone back to the middle. The lane lives outside the swapped
  // screen so the same nodes move between phases instead of being redrawn.
  const LANE_W = 1728, AV = 96, GAP = 20, HALF = LANE_W * 0.47, SIDE_GAP = 48;
  const laneEls = new Map();
  let laneQ = null, laneSeq = 0;
  const laneOrder = new Map();  // player id → arrival order on its side (this question)
  const ICON = {
    wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    locked: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  ICON.right = ICON.locked;
  ICON.wrong = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';
  function spread(n, width) { return n > 1 ? Math.min(AV + GAP, (width - AV) / (n - 1)) : 0; }
  function natural(n) { return n ? AV + (n - 1) * (AV + GAP) : 0; }
  function laneState(p, revealed) {
    if (p.correct === true) return 'right';
    if (p.correct === false || revealed) return 'wrong';
    return p.answered ? 'locked' : 'wait';
  }
  function updateLane(s) {
    const q = s.question;
    const on = !!q && (s.phase === 'question' || s.phase === 'reveal');
    $lane.classList.toggle('on', on);
    if (!on) {
      if (laneEls.size) setTimeout(() => { if (!$lane.classList.contains('on')) { $lane.innerHTML = ''; laneEls.clear(); laneOrder.clear(); laneQ = null; } }, 500);
      return;
    }
    const players = (s.players || []).filter((p) => !p.isObserver);
    const revealed = s.phase === 'reveal';
    const qid = s.partyID + ':' + s.roundNumber + ':' + q.index;
    const nextQ = laneQ !== null && laneQ !== qid;
    if (laneQ !== qid) { laneOrder.clear(); laneSeq = 0; }
    laneQ = qid;
    const ids = new Set(players.map((p) => p.id));
    for (const [id, el] of laneEls) {
      if (!ids.has(id)) { el.classList.add('gone'); setTimeout(() => el.remove(), 450); laneEls.delete(id); laneOrder.delete(id); }
    }
    const states = new Map(players.map((p) => [p.id, laneState(p, revealed)]));
    // Arrival order per side: already-placed ones keep theirs; new arrivals in
    // this poll follow the roster order.
    players.forEach((p) => {
      const st = states.get(p.id);
      if ((st === 'right' || st === 'wrong') && !laneOrder.has(p.id)) laneOrder.set(p.id, laneSeq++);
      if (st !== 'right' && st !== 'wrong') laneOrder.delete(p.id);
    });
    const byArrival = (x, y) => laneOrder.get(x.id) - laneOrder.get(y.id);
    const right = players.filter((p) => states.get(p.id) === 'right').sort(byArrival);
    const wrong = players.filter((p) => states.get(p.id) === 'wrong').sort(byArrival);
    const mid = players.filter((p) => { const st = states.get(p.id); return st !== 'right' && st !== 'wrong'; });
    const sided = right.length + wrong.length > 0;
    const midW = mid.length ? Math.min(natural(mid.length), sided ? LANE_W * 0.36 : LANE_W) : 0;
    const sideW = mid.length ? (LANE_W - midW) / 2 - SIDE_GAP : HALF;
    const pos = new Map();
    const sl = spread(wrong.length, sideW), sr = spread(right.length, sideW);
    wrong.forEach((p, i) => pos.set(p.id, i * sl));                      // first wrong at the left edge
    right.forEach((p, i) => pos.set(p.id, LANE_W - AV - i * sr));         // first right at the right edge
    const sm = spread(mid.length, midW);
    const x0 = (LANE_W - (AV + sm * (mid.length - 1))) / 2;
    mid.forEach((p, i) => pos.set(p.id, x0 + i * sm));
    let movers = 0;
    players.forEach((p, i) => {
      const state = states.get(p.id);
      let el = laneEls.get(p.id);
      const x = pos.get(p.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'lav';
        el.innerHTML = `<span class="face"></span><span class="badge"></span><span class="sc"></span>`;
        el.style.transition = 'none';
        el.style.transform = `translateX(${x}px)`;
        el.style.setProperty('--d', `${i * 45}ms`);
        el.classList.add('pop');
        $lane.appendChild(el); laneEls.set(p.id, el);
        void el.offsetWidth; el.style.transition = '';
      }
      const face = avatarInner(p);
      if (el.dataset.face !== face) { el.querySelector('.face').innerHTML = face; el.dataset.face = face; }
      const prev = el.dataset.state;
      const moves = prev !== state && (state === 'right' || state === 'wrong');
      if (prev !== state) {
        el.dataset.state = state;
        el.querySelector('.badge').innerHTML = ICON[state];
        if (prev === 'wait' && state === 'locked') { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
      }
      // Arrivals in the same poll slide one after another; the reset to the
      // middle ripples quickly; everyone else just settles.
      el.style.transitionDelay = moves ? `${60 + 110 * movers++}ms` : nextQ ? `${i * 25}ms` : '0ms';
      el.style.transform = `translateX(${x}px)`;
      el.style.zIndex = String(state === 'right' ? 300 - (laneOrder.get(p.id) || 0) : 100 + i);
      el.querySelector('.sc').textContent = nf(p.score || 0);
      el.classList.toggle('scored', revealed);
    });
  }

  function standingsOf(s) {
    if (s.standings && s.standings.length) return s.standings.slice().sort((x, y) => (x.place || 0) - (y.place || 0) || y.score - x.score);
    return (s.players || []).map((p) => ({ playerID: p.id, name: p.name, score: p.score })).sort((x, y) => y.score - x.score).map((p, i) => Object.assign(p, { place: i + 1 }));
  }

  function leaderboard(s, title) {
    const st = standingsOf(s);
    const byId = {}; (s.players || []).forEach((p) => { byId[p.id] = p; });
    const rows = st.slice(0, 6).map((p, i) => {
      const pl = byId[p.playerID] || { id: p.playerID, name: p.name };
      const delta = pl.roundScore && pl.score !== p.score ? `<span class="delta">+${nf(pl.roundScore)}</span>` : '';
      return `<div class="row ${p.place === 1 ? 'first' : ''}" style="animation-delay:${0.08 * i}s"><span class="rk">${p.place || i + 1}</span>${avatar({ id: p.playerID, name: p.name, avatar: pl.avatar })}<span class="nm">${esc(p.name)}</span>${delta}<span class="sc" data-to="${p.score}">${nf(p.score)}</span></div>`;
    }).join('');
    return `
      <div class="topbar">${wordmark}<span style="display:flex;gap:18px">${headPills(s)}<span class="pill">🏆 ${esc(title)}</span></span></div>
      <div class="board">${rows}${st.length > 6 ? `<div class="more">+${st.length - 6}</div>` : ''}</div>`;
  }

  function confetti() {
    const cols = ['#FCD34D', '#F472B6', '#38BDF8', '#4ADE80', '#A78BFA', '#FB923C'];
    let h = '';
    for (let i = 0; i < 70; i++) {
      h += `<i style="left:${(i * 137) % 1920}px;background:${cols[i % cols.length]};animation-duration:${4 + (i % 7) * 0.7}s;animation-delay:${-((i * 0.53) % 6)}s;transform:rotate(${i * 29}deg)"></i>`;
    }
    return h;
  }

  // ---------- Local clocks (every frame) ----------
  function tick() {
    if (!state) return;
    const now = hostNow();
    const ends = state.phaseEndsAt, starts = state.phaseStartsAt;
    let total = ends && starts ? Math.max(1, ends - Math.max(starts, ends - 60)) : 15;
    if (state.phase === 'question') total = ends && starts ? ends - starts : 15;
    const rem = ends ? Math.max(0, Math.min(total, ends - now)) : 0;
    for (const el of $root.querySelectorAll('[data-clock]')) {
      const secs = Math.ceil(rem);
      const num = el.querySelector('.num');
      if (num.textContent !== String(secs)) num.textContent = secs;
      el.querySelector('.bar').style.strokeDashoffset = String(RING_C * (1 - rem / total));
      el.classList.toggle('low', state.phase === 'question' && rem <= 5);
    }
    const c = $root.querySelector('[data-count]');
    if (c) {
      const n = String(Math.max(1, Math.ceil(rem)));
      if (c.textContent !== n) { c.textContent = n; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
    }
  }
  (function loop() { tick(); requestAnimationFrame(loop); })();

  // ---------- Applying a record ----------
  function accept(s, assets) {
    noteSkew(s.sentAt);
    const fresh = !state || state.partyID !== s.partyID;
    if (state && s.revision < state.revision && !fresh) return; // stale read
    if (state && s.revision === state.revision && !fresh) return;
    assetURLs = assets || {};
    state = s;
    if (s.phase === 'ended') {
      render(s, fresh);
      setTimeout(() => { if (state === s) newCode(); }, 6000);
      return;
    }
    render(s, fresh);
  }

  // ---------- CloudKit ----------
  let db = null;
  function ck() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      if (!CFG.apiToken || !CFG.containerIdentifier) return reject(new Error('config'));
      const go = () => {
        try {
          window.CloudKit.configure({
            containers: [{
              containerIdentifier: CFG.containerIdentifier,
              apiTokenAuth: { apiToken: CFG.apiToken, persist: false },
              environment: CFG.environment || 'production',
            }],
          });
          db = window.CloudKit.getDefaultContainer().publicCloudDatabase;
          resolve(db);
        } catch (e) { reject(e); }
      };
      if (window.CloudKit) return go();
      window.addEventListener('cloudkitloaded', go, { once: true });
      const sc = document.createElement('script');
      sc.src = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js';
      sc.async = true;
      sc.onerror = () => reject(new Error('cloudkit.js'));
      document.head.appendChild(sc);
    });
  }

  const tsMs = (f) => (f == null ? null : (typeof f.value === 'number' ? f.value : Date.parse(f.value)));

  async function poll() {
    if (document.hidden) return schedule(POLL_PAIRING_MS);
    if (mode === 'pairing' && Date.now() - shownAt > CODE_ROTATE_MS) newCode();
    try {
      const d = await ck();
      const res = await d.fetchRecords(['tvs.' + code]);
      failures = 0; $net.classList.remove('show');
      const rec = res.records && res.records[0];
      if (!rec || rec.serverErrorCode || !rec.fields) {
        if (mode === 'bound' && Date.now() - lastGood > LOST_AFTER_MS) newCode();
      } else {
        const f = rec.fields;
        const claimedAt = tsMs(f.claimedAt), expiresAt = tsMs(f.expiresAt);
        const party = f.partyID && f.partyID.value;
        const live = expiresAt == null || expiresAt > Date.now() - skewMs;
        if (mode === 'pairing') {
          // Only a claim made after this code appeared, still live, can bind the screen.
          if (live && claimedAt != null && claimedAt >= shownAt - CLAIM_GRACE_MS - skewMs && party) {
            mode = 'bound'; pinnedParty = party; keep();
          }
        }
        if (mode === 'bound' && party !== pinnedParty && Date.now() - lastGood > LOST_AFTER_MS) newCode();
        else if (mode === 'bound' && party === pinnedParty) {
          if (!live) { newCode(); }
          else {
            if (Date.now() - lastGood > 60000) keep();   // refresh the reload window now and then
            lastGood = Date.now();
            let s = null;
            try { s = JSON.parse(f.payload.value); } catch (_) { /* malformed payload: ignore this read */ }
            if (s && s.partyID === pinnedParty) {
              const assets = {};
              for (const k in f) { const v = f[k] && f[k].value; if (v && v.downloadURL) assets[k] = v.downloadURL; }
              accept(s, assets);
            } else if (!state) renderPairing(true);
          }
        }
      }
    } catch (e) {
      failures++;
      if (failures > 3) { $net.textContent = t(e && e.message === 'config' ? 'setup' : 'offline'); $net.classList.add('show'); }
      return schedule(Math.min(15000, POLL_PAIRING_MS * Math.pow(1.6, failures)));
    }
    schedule(mode === 'bound' ? POLL_BOUND_MS : POLL_PAIRING_MS);
  }
  let timer = null;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(poll, ms); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(50); });

  // ---------- Demo mode (?demo=1) — replays fixtures/demo-game.json locally ----------
  // ?demo=1           plays pairing → lobby → … → podium, then loops
  // ?demo=1&step=N    shows step N (0 = pairing) and holds it (for screenshots)
  // ?demo=1&step=N&then=1   shows step N, 1.5 s later step N+1, then holds (mid-animation shots)
  async function demo() {
    const steps = await (await fetch('fixtures/demo-game.json', { cache: 'no-store' })).json();
    const hold = params.has('step') ? parseInt(params.get('step'), 10) : null;
    let rev = 0;
    const play = (i) => {
      if (i === 0) { newCode(); if (hold === 0) return; return setTimeout(() => play(1), 5000); }
      const st = steps[(i - 1) % steps.length];
      const now = Date.now() / 1000;
      const s = JSON.parse(JSON.stringify(st.state));
      s.code = code; s.partyID = 'demo'; s.revision = ++rev; s.sentAt = now;
      if (st.phaseSecs != null) { s.phaseStartsAt = now; s.phaseEndsAt = now + st.phaseSecs; }
      if (st.remaining != null && s.phaseEndsAt) { s.phaseStartsAt = now - (st.phaseSecs - st.remaining); s.phaseEndsAt = now + st.remaining; }
      mode = 'bound'; pinnedParty = 'demo';
      accept(s, st.picture ? { picture: st.picture } : {});
      if (hold != null) { if (params.has('then') && i === hold) setTimeout(() => play(i + 1), 1500); return; }
      setTimeout(() => (i >= steps.length ? play(0) : play(i + 1)), (st.hold || 3) * 1000);
    };
    if (hold != null && hold > 0) { newCode(); play(hold); } else play(0);
  }

  // ?fixture=<name>  draws one example from fixtures/tv-state.json (the shared contract's samples).
  async function fixture(name) {
    const all = await (await fetch('fixtures/tv-state.json', { cache: 'no-store' })).json();
    const s = all[name]; if (!s) return;
    const shift = Date.now() / 1000 - s.sentAt;
    ['sentAt', 'phaseStartsAt', 'phaseEndsAt'].forEach((k) => { if (typeof s[k] === 'number') s[k] += shift; });
    code = s.code; mode = 'bound'; pinnedParty = s.partyID;
    accept(s, {});
  }

  if (params.has('fixture')) fixture(params.get('fixture'));
  else if (DEMO) demo();
  else { if (!restore()) newCode(); schedule(300); }
})();
