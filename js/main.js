// ── NAV ──────────────────────────────────────────────
const nav = document.getElementById('nav');
const ctaEl = document.getElementById('cta');
window.addEventListener('scroll', () => {
  // Hide chrome on hero (top) and on cta (last section), show in between
  const ctaTop = ctaEl ? ctaEl.getBoundingClientRect().top : Infinity;
  const onLastSlide = ctaTop <= 80;
  nav.classList.toggle('scrolled', scrollY > 60 && !onLastSlide);
}, {passive:true});

// ── SCROLL REVEAL ────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target);} });
}, {threshold:0.12});
/* reveals handled by motion engine */

// ── COUNTERS ─────────────────────────────────────────
const cObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const start = performance.now();
    const update = t => {
      const p = Math.min((t-start)/dur, 1);
      const v = Math.round(target * (1-Math.pow(1-p,3)));
      el.textContent = v >= 1000 ? v.toLocaleString() + suffix : v + suffix;
      if(p<1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
    cObs.unobserve(el);
  });
}, {threshold:0.3});
/* counters handled by motion engine */

// ── MARKET BARS ──────────────────────────────────────
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.querySelectorAll('.mbar-fill').forEach((b,i) => {
      setTimeout(() => { b.style.width = b.parentElement.parentElement.querySelector('.mbar-fill').style.getPropertyValue('--w') || getComputedStyle(b).getPropertyValue('--w'); }, i*120);
    });
    barObs.unobserve(e.target);
  });
},{threshold:0.3});

// Duplicate each logo-marquee row for a seamless infinite loop
document.querySelectorAll('#logoMarquee .lm-row').forEach(row => {
  row.innerHTML += row.innerHTML;
});

// Trigger bars via direct obs on the bars container
document.querySelectorAll('.market-bars').forEach(el => {
  const barTrigger = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      e.target.querySelectorAll('.mbar-fill').forEach((b,i) => {
        const p = b.style.cssText.match(/--w:([^;]+)/)?.[1] || '0%';
        setTimeout(() => { b.style.width = p; }, i*140);
      });
      barTrigger.unobserve(e.target);
    });
  },{threshold:0.3});
  barTrigger.observe(el);
});

// ── 3D CAROUSEL ──────────────────────────────────────
let curCard = 0;
const TOTAL = document.querySelectorAll('#carousel3d .c3d').length; // counts the cards automatically
function applyCarousel() {
  document.querySelectorAll('.c3d').forEach(c => {
    const i = parseInt(c.dataset.i);
    let d = i - curCard;
    if(d > TOTAL/2) d -= TOTAL;
    if(d < -TOTAL/2) d += TOTAL;
    const angle = d * 72 * Math.PI / 180;
    const R = 680;
    const tx = Math.sin(angle) * R;
    const tz = Math.cos(angle) * R - R;
    const sc = d===0 ? 1 : Math.max(0.6, 1-Math.abs(d)*0.2);
    const op = d===0 ? 1 : Math.max(0.62, 1-Math.abs(d)*0.18);
    c.style.transform = `translateX(${tx}px) translateZ(${tz}px) rotateY(${(-d*24)}deg) scale(${sc})`;
    c.style.opacity   = op;
    c.style.zIndex    = d===0 ? 10 : 10-Math.abs(d);
    c.style.filter    = d===0 ? 'none' : 'brightness(0.88)';
    c.style.cursor    = d===0 ? 'default' : 'pointer';
    c.onclick         = d===0 ? null : () => setCard(i);
    const inner = c.querySelector('.c3d-inner');
    if(inner) inner.style.pointerEvents = d===0 ? 'auto' : 'none';
    c.classList.toggle('active', d===0);
  });
  document.querySelectorAll('#c3dDots .c3d-dot').forEach((d,i) => {
    d.classList.toggle('active', i===curCard);
  });
  if(window.VID) window.VID.update(true);
}
function goCard(dir) { curCard = (curCard+dir+TOTAL)%TOTAL; applyCarousel(); }
function setCard(i)  { curCard = i; applyCarousel(); }
applyCarousel();

// ── UNIFIED VIDEO CONTROLLER (autoplay-on-view / pause-on-leave for ALL videos) ──
window.VID = (function(){
  const hasSDK = !!window.Vimeo;
  const players = new Map();
  if(hasSDK){
    document.querySelectorAll('iframe.js-vimeo').forEach(f => {
      try{ const p = new Vimeo.Player(f); p.setMuted(true).catch(()=>{}); players.set(f, p); }catch(e){}
    });
  }
  const inView = { advantage:false, platforms:false, assignments:false };
  function sectionKey(el){
    if(el.closest('#advantage'))   return 'advantage';
    if(el.closest('#platforms'))   return 'platforms';
    if(el.closest('#assignments')) return 'assignments';
    return null;
  }
  function shouldPlay(el){
    const sec = sectionKey(el);
    if(!sec || !inView[sec]) return false;
    if(sec === 'advantage') return true;
    if(sec === 'platforms'){ const p = el.closest('.plat-panel'); return !!(p && p.classList.contains('active')); }
    if(sec === 'assignments'){ const c = el.closest('.c3d'); return !!(c && c.classList.contains('active')); }
    return false;
  }
  function robustPlay(p, restart, f){
    // Play FIRST, then (optionally) rewind. On a cold Vimeo player a
    // setCurrentTime(0) issued before the video has loaded hangs/rejects and
    // silently kills the play() that follows it — which is why navigating the
    // carousel onto a card failed the first time but worked after scrolling
    // away and back (that path never seeked). We retry with backoff and
    // re-check shouldPlay each time so a card you've left doesn't keep trying.
    const delays = [0, 250, 600, 1200, 2000, 3000];
    let attempt = 0;
    const tryPlay = () => {
      if(f && !shouldPlay(f)) return;           // card no longer active — abort
      const ready = (p.ready ? p.ready() : Promise.resolve());
      ready.then(() => p.setMuted(true)).catch(()=>{})
        .then(() => p.play())
        .then(() => { if(restart) return p.setCurrentTime(0).catch(()=>{}); })
        .catch(() => {
          attempt++;
          if(attempt < delays.length){ setTimeout(tryPlay, delays[attempt]); }
        });
    };
    tryPlay();
  }
  function update(restart){
    players.forEach((p, f) => {
      if(shouldPlay(f)){
        robustPlay(p, restart, f);
      } else { p.pause().catch(()=>{}); }
    });
    document.querySelectorAll('video[data-plat-video-native]').forEach(v => {
      if(shouldPlay(v)){
        if(restart){ try{ v.currentTime = 0; }catch(e){} }
        v.play().catch(()=>{});
      } else { v.pause(); }
    });
  }
  [['advantage','#advantage'],['platforms','.plat-sticky'],['assignments','#assignments']].forEach(([key,sel]) => {
    const sec = document.querySelector(sel);
    if(!sec) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { inView[key] = e.isIntersecting && e.intersectionRatio > 0.3; });
      update(false);
    }, {threshold:[0, 0.3, 0.6]});
    obs.observe(sec);
  });
  window.addEventListener('load', () => setTimeout(() => update(false), 500));
  return { update };
})();

// ── PROCESS TABS (scroll-driven, pinned) ─────────────
function switchTab(i) {
  document.querySelectorAll('#procTabs .proc-tab').forEach((t,j) => {
    const on = j===i;
    t.classList.toggle('active', on);
    // Inline active styling — reliable regardless of cascade re-evaluation quirks.
    t.style.borderBottomColor = on ? 'var(--green)' : '';
    const title = t.querySelector('.pt-title');
    const num = t.querySelector('.pt-num');
    if(title) title.style.color = on ? '#fff' : '';
    if(num) num.style.color = on ? '#fff' : '';
  });
  document.querySelectorAll('.proc-panel').forEach((p,j) => p.classList.toggle('active', j===i));
}
(function(){
  const track = document.getElementById('procScrollTrack');
  const tabs  = document.querySelectorAll('#procTabs .proc-tab');
  if(!track || !tabs.length) return;
  const N = tabs.length;
  track.style.setProperty('--proc-steps', N);
  const pinned = () => window.matchMedia('(min-width:901px)').matches;
  const dusk = document.getElementById('procBgDusk');
  let cur = 0;

  window.goProcess = function(i){
    if(!pinned()){ switchTab(i); return; }
    const scrollable = track.offsetHeight - window.innerHeight;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const frac = (i + 0.5) / N;
    window.scrollTo({ top: Math.round(trackTop + frac * scrollable), behavior:'smooth' });
  };

  let ticking = false;
  function sync(){
    ticking = false;
    if(!pinned()) return;
    const scrollable = track.offsetHeight - window.innerHeight;
    if(scrollable <= 0) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const p = (window.scrollY - trackTop) / scrollable;
    // Crossfade daytime → dusk across the whole pinned scroll.
    if(dusk){ let op = p; if(op<0) op=0; if(op>1) op=1; dusk.style.opacity = op; }
    let idx = Math.floor(p * N);
    if(idx < 0) idx = 0; if(idx > N-1) idx = N-1;
    if(idx !== cur){ cur = idx; switchTab(idx); }
  }
  window.addEventListener('scroll', () => {
    if(!ticking){ ticking = true; requestAnimationFrame(sync); }
  }, {passive:true});
  window.addEventListener('resize', sync);
  window.addEventListener('load', sync);
  switchTab(0);
  sync();
})();

// ── NAV LOGO COLOR ───────────────────────────────────
// White logo on dark sections (hero, market, cta); navy #003349 on light sections.
const navLogoImg = document.querySelector('.nav-logo img');
const DARK_IDS  = new Set([...document.querySelectorAll('section[data-dark]')].map(s => s.id));
const LIGHT_IDS = new Set([...document.querySelectorAll('section[id]')].map(s => s.id).filter(id => !DARK_IDS.has(id)));
const trackedSections = [...document.querySelectorAll('section[id]')]
  .filter(s => LIGHT_IDS.has(s.id) || DARK_IDS.has(s.id));

function updateLogoColor(){
  const probeY = 60; // line just below nav logo
  let current = null;
  for(const s of trackedSections){
    const r = s.getBoundingClientRect();
    if(r.top <= probeY && r.bottom > probeY){ current = s; break; }
  }
  // Footer fallback (light)
  if(!current){
    const footer = document.querySelector('footer');
    if(footer){
      const r = footer.getBoundingClientRect();
      if(r.top <= probeY && r.bottom > probeY){
        navLogoImg.classList.add('on-light');
        return;
      }
    }
    return;
  }
  if(LIGHT_IDS.has(current.id)) navLogoImg.classList.add('on-light');
  else navLogoImg.classList.remove('on-light');
}
window.addEventListener('scroll', updateLogoColor, {passive:true});
window.addEventListener('resize', updateLogoColor);
updateLogoColor();
