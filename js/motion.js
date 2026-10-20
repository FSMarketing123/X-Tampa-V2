/* ═══════════════════════════════════════════════════════
   MOTION ENGINE — Franklin Street retail deck
   Smooth inertia scroll · intro curtain · split-text reveals ·
   scroll-scrubbed scenes · counters/odometers · tilt · magnetic ·
   custom cursor · chapter rail · clicker / arrow-key navigation
   Zero dependencies.
══════════════════════════════════════════════════════ */
(function(){
'use strict';
if (window.__fsMotion) return; window.__fsMotion = true;

var $  = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
var lerp  = function(a, b, t){ return a + (b - a) * t; };
var easeOut3 = function(t){ return 1 - Math.pow(1 - t, 3); };
var easeIO4  = function(t){ return t < .5 ? 8*t*t*t*t : 1 - Math.pow(-2*t + 2, 4) / 2; };
var root = document.documentElement, body = document.body;
var FINE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
var isDesk = function(){ return window.innerWidth > 900; };
var pinnedMQ = window.matchMedia('(min-width:901px)');
root.classList.add('m-js');
try { history.scrollRestoration = 'manual'; } catch(e) {}

/* ── helpers ─────────────────────────────────────────── */
function mk(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function textNodes(el){
  var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  while (w.nextNode()) out.push(w.currentNode);
  return out;
}
function onView(els, fn, opts){
  opts = opts || {};
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ fn(e.target); if (!opts.repeat) io.unobserve(e.target); }
    });
  }, { threshold: opts.threshold != null ? opts.threshold : 0.12, rootMargin: opts.margin || '0px 0px -8% 0px' });
  els.forEach(function(el){ if (el) io.observe(el); });
  return io;
}
function getCard(){ try { return typeof curCard === 'number' ? curCard : 0; } catch (e) { return 0; } }
function idx(list){ list.forEach(function(el, i){ el.style.setProperty('--i', i); }); }

/* ── 1. SPLIT TEXT ───────────────────────────────────── */
function splitWords(el, delayMs){
  if (!el || el.__split) return; el.__split = true;
  var n = 0;
  (function walk(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(c){
      if (c.nodeType === 3){
        var parts = c.nodeValue.split(/([ \t\n\r]+)/);
        if (parts.length === 1 && !parts[0]) return;
        var frag = document.createDocumentFragment();
        parts.forEach(function(p){
          if (!p) return;
          if (/^[ \t\n\r]+$/.test(p)){ frag.appendChild(document.createTextNode(' ')); return; }
          var sw = mk('span', 'sw'), swi = mk('span', 'swi');
          swi.textContent = p; swi.style.setProperty('--i', n++);
          sw.appendChild(swi); frag.appendChild(sw);
        });
        c.parentNode.replaceChild(frag, c);
      } else if (c.nodeType === 1 && c.tagName !== 'BR'){
        walk(c);
      }
    });
  })(el);
  el.classList.add('m-split');
  if (delayMs) el.style.setProperty('--d', delayMs + 'ms');
}
function splitChars(el, start){
  var n = start || 0;
  textNodes(el).forEach(function(t){
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(t.nodeValue, function(ch){
      if (/\s/.test(ch)){ frag.appendChild(document.createTextNode(ch)); return; }
      var s = mk('span', 'ch'); s.textContent = ch; s.style.setProperty('--i', n++); frag.appendChild(s);
    });
    t.parentNode.replaceChild(frag, t);
  });
  return n;
}
function splitBlurWords(el){
  var n = 0;
  textNodes(el).forEach(function(t){
    var frag = document.createDocumentFragment();
    t.nodeValue.split(/(\s+)/).forEach(function(p){
      if (!p) return;
      if (/^\s+$/.test(p)){ frag.appendChild(document.createTextNode(p)); return; }
      var s = mk('span', 'bw'); s.textContent = p; s.style.setProperty('--i', n++); frag.appendChild(s);
    });
    t.parentNode.replaceChild(frag, t);
  });
}

/* ── 2. TEXT SCRAMBLE (eyebrows) ─────────────────────── */
var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+*#';
function scramble(el, dur){
  if (el.__scr) return; el.__scr = true;
  var nodes = textNodes(el).filter(function(n){ return n.nodeValue.trim(); });
  var orig = nodes.map(function(n){ return n.nodeValue; });
  var total = orig.join('').length; if (!total) return;
  dur = dur || 900;
  var t0 = performance.now();
  (function frame(t){
    var p = clamp((t - t0) / dur, 0, 1), k = 0, cut = p * total * 1.05;
    nodes.forEach(function(n, i){
      var o = orig[i], s = '';
      for (var j = 0; j < o.length; j++, k++){
        var c = o[j];
        s += (k < cut || c === ' ' || c === '·' || c === '&') ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      n.nodeValue = s;
    });
    if (p < 1) requestAnimationFrame(frame); else nodes.forEach(function(n, i){ n.nodeValue = orig[i]; });
  })(t0);
}

/* ── 3. COUNTERS + ODOMETERS ─────────────────────────── */
function countUp(el, delay){
  if (el.__cnt) return; el.__cnt = true;
  var raw = el.textContent;
  var m = raw.match(/^([^\d]*)([\d,]*\.?\d+)([\s\S]*)$/);
  if (!m) return;
  var pre = m[1], numS = m[2].replace(/,/g, ''), suf = m[3];
  var target = parseFloat(numS), dec = (numS.split('.')[1] || '').length;
  el.style.fontVariantNumeric = 'tabular-nums';
  el.textContent = pre + (0).toFixed(dec) + suf;
  setTimeout(function(){
    var t0 = performance.now(), dur = 2000;
    (function f(t){
      var p = clamp((t - t0) / dur, 0, 1), v = target * easeOut3(p);
      el.textContent = pre + v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(f); else { el.textContent = raw; el.style.fontVariantNumeric = ''; }
    })(t0);
  }, delay || 0);
}
function buildOdo(el){
  var txt = el.textContent.trim();
  if (!/^\d{4}$/.test(txt) || el.__odo) return false;
  el.__odo = { digits: [] };
  el.textContent = '';
  var w = mk('span', 'odo'); w.setAttribute('aria-label', txt);
  Array.prototype.forEach.call(txt, function(d, i){
    var od = mk('span', 'od'); od.style.setProperty('--i', i);
    var ph = mk('span', 'ph'); ph.textContent = d;
    var col = mk('span', 'ods'); col.setAttribute('aria-hidden', 'true');
    for (var r = 0; r < 3; r++) for (var k = 0; k < 10; k++){ var s = mk('span'); s.textContent = k; col.appendChild(s); }
    col.style.transform = 'translate3d(0,' + (-d) + 'em,0)';
    od.appendChild(ph); od.appendChild(col); w.appendChild(od);
    el.__odo.digits.push({ od: od, col: col, d: +d });
  });
  el.appendChild(w);
  return true;
}
function rollOdo(el, delayMs){
  var o = el.__odo; if (!o || o.rolled) return; o.rolled = true;
  el.style.setProperty('--d', (delayMs || 0) + 'ms');
  o.digits.forEach(function(g){
    g.col.style.transform = 'translate3d(0,' + (-(20 + g.d)) + 'em,0)';
  });
}

/* ── 4. SMOOTH SCROLL + TWEENED SCROLL ───────────────── */
var nativeScrollTo = window.scrollTo.bind(window);
var SS = { on: FINE, y: window.scrollY, target: window.scrollY, mode: 'idle', tw: null, locked: true };
function maxScroll(){ return Math.max(0, root.scrollHeight - window.innerHeight); }
if (SS.on) root.classList.add('m-ss');
function canScrollInside(t, dy){
  while (t && t !== body && t !== root){
    if (t.nodeType === 1){
      var cs = getComputedStyle(t);
      if (/(auto|scroll)/.test(cs.overflowY) && t.scrollHeight > t.clientHeight + 1){
        if ((dy > 0 && t.scrollTop + t.clientHeight < t.scrollHeight - 1) || (dy < 0 && t.scrollTop > 0)) return true;
      }
    }
    t = t.parentNode;
  }
  return false;
}
window.addEventListener('wheel', function(e){
  if (SS.locked){ e.preventDefault(); return; }
  if (!SS.on || e.ctrlKey || e.defaultPrevented) return;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  var d = e.deltaY * (e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? window.innerHeight : 1);
  if (canScrollInside(e.target, d)) return;
  e.preventDefault();
  if (SS.mode !== 'lerp'){ SS.y = window.scrollY; SS.target = SS.y; }
  SS.mode = 'lerp'; SS.tw = null;
  SS.target = clamp(SS.target + d, 0, maxScroll());
}, { passive: false });
window.addEventListener('scroll', function(){
  if (SS.mode === 'idle'){ SS.y = SS.target = window.scrollY; }
}, { passive: true });
function tweenTo(y, dur){
  y = clamp(Math.round(y), 0, maxScroll());
  var from = window.scrollY, dist = Math.abs(y - from);
  if (dist < 2) return;
  SS.tw = { from: from, to: y, t0: performance.now(), dur: dur || clamp(700 + dist * 0.18, 900, 1700) };
  SS.mode = 'tween';
}
window.__mScrollTo = tweenTo;
window.scrollTo = function(a, b){
  if (a && typeof a === 'object' && a.behavior === 'smooth' && typeof a.top === 'number'){ tweenTo(a.top); return; }
  return nativeScrollTo.apply(window, arguments);
};
function stepScroll(now, dt){
  if (SS.mode === 'lerp'){
    var k = 1 - Math.pow(1 - 0.09, dt / 16.67);
    SS.target = clamp(SS.target, 0, maxScroll());
    SS.y = lerp(SS.y, SS.target, k);
    if (Math.abs(SS.target - SS.y) < 0.4){ SS.y = SS.target; SS.mode = 'idle'; }
    nativeScrollTo(0, SS.y);
  } else if (SS.mode === 'tween' && SS.tw){
    var tw = SS.tw, p = clamp((now - tw.t0) / tw.dur, 0, 1);
    SS.y = lerp(tw.from, tw.to, easeIO4(p));
    nativeScrollTo(0, SS.y);
    if (p >= 1){ SS.mode = 'idle'; SS.tw = null; SS.target = SS.y; }
  }
}
document.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a) return;
  var id = a.getAttribute('href');
  if (id.length < 2) return;
  var t = document.querySelector(id);
  if (!t) return;
  e.preventDefault();
  tweenTo(id === '#hero' ? 0 : sectionStop(t));
});
['keydown', 'touchstart'].forEach(function(ev){
  window.addEventListener(ev, function(e){
    if (ev === 'keydown' && !/^(ArrowUp|ArrowDown|Space| |PageUp|PageDown|Home|End)$/.test(e.key)) return;
    if (SS.mode === 'lerp'){ SS.mode = 'idle'; }
  }, { passive: true });
});

/* ── 5. INTRO / HERO CHOREOGRAPHY ────────────────────── */
var hero = $('#hero');
var heroText = $('.hero-text'), heroCard = $('.hero-card'), heroBg = $('.hero-map-bg');
if (heroCard) heroCard.classList.remove('r-r');
var heroGlow = mk('div', 'hero-glow');
if (hero){ var ov = $('.hero-map-overlay', hero); if (ov) ov.after(heroGlow); }
var hc = 0;
$$('.hero-h1 .word > span').forEach(function(s){ hc = splitChars(s, hc); });
$$('.hero-sub').forEach(splitBlurWords);
idx($$('.hero-awards .award-chip'));
idx($$('.hsc-stat'));
$$('.hero-awards .ay').forEach(buildOdo);

function startHero(){
  body.classList.add('hero-go');
  var eb = $('.hero-eyebrow'); if (eb) setTimeout(function(){ scramble(eb, 1100); }, 150);
  $$('.hero-awards .ay').forEach(function(el, i){ setTimeout(function(){ rollOdo(el, 0); }, 1250 + i * 120); });
  var c18 = $('.hero-stat-card .counter');
  if (c18){ c18.textContent = (c18.dataset.target || '18') + (c18.dataset.suffix || ''); countUp(c18, 1500); }
  $$('.hsc-n').forEach(function(n){ if (!n.querySelector('.counter') && /^\s*\d+\s*$/.test(n.textContent)) countUp(n, 1750); });
}

var intro = $('#m-intro');
var introDone = false;
function finishIntro(fast){
  if (introDone) return; introDone = true;
  if (!intro){ SS.locked = false; startHero(); return; }
  intro.style.setProperty('--p', 1);
  intro.classList.add('go', 'out');
  setTimeout(function(){ intro.classList.add('lift'); }, fast ? 60 : 250);
  setTimeout(function(){ startHero(); SS.locked = false; }, fast ? 200 : 420);
  setTimeout(function(){ intro.classList.add('done'); showHint(); }, fast ? 1500 : 1700);
}
function runIntro(){
  nativeScrollTo(0, 0);
  if (!intro){ finishIntro(true); return; }
  intro.classList.add('go');
  var line = $('.mi-line span', intro), num = $('.mi-count span', intro);
  var t0 = performance.now(), dur = 1500;
  (function f(t){
    if (introDone) return;
    var p = clamp((t - t0) / dur, 0, 1), e = easeIO4(p);
    if (line) line.style.transform = 'scaleX(' + e + ')';
    if (num) num.textContent = Math.round(e * 100);
    intro.style.setProperty('--p', e); // pattern draws outward with the counter
    if (p < 1) requestAnimationFrame(f); else setTimeout(function(){ finishIntro(false); }, 180);
  })(t0);
  var skip = function(){ finishIntro(true); };
  intro.addEventListener('click', skip);
  window.addEventListener('keydown', function k(){ if (!introDone){ finishIntro(true); } window.removeEventListener('keydown', k); });
}

/* ── 6. REVEALS ──────────────────────────────────────── */
// headline splits (remove parent-level reveal classes where the words carry the motion)
[['.adv-h2', 350], ['.res-h2', 250], ['.team-h2', 0], ['.plat-h2', 0], ['.market-h2', 0], ['.asgn-h2', 0],
 ['.proc-h2', 0], ['.tl-h2', 0], ['.web-h2', 250], ['.cta-h2', 300], ['.tc-name', 450]].forEach(function(p){
  $$(p[0]).forEach(function(el){ el.classList.remove('r'); splitWords(el, p[1]); });
});
onView($$('.m-split'), function(el){ el.classList.add('split-in'); }, { threshold: 0.2, margin: '0px 0px -6% 0px' });

// generic reveal classes
onView($$('.r,.r-l,.r-r,.stg'), function(el){ el.classList.add('in'); });

// eyebrows: tick draw + scramble
onView($$('.ey,.plat-eyebrow,.acc-eyebrow,.tl-end-label').filter(function(e){ return !e.closest('#hero'); }), function(el){
  el.classList.add('m-on');
  setTimeout(function(){ scramble(el, 800); }, 120);
}, { threshold: 0.6, margin: '0px' });

// advantage
// NB: Chrome's IntersectionObserver honours a target's own clip-path, so clipped elements are observed via a parent
var advVid = $('.adv-video-wrap'); if (advVid){ advVid.classList.remove('r-r'); onView([$('.adv-inner') || advVid], function(){ advVid.classList.add('in'); }, { threshold: 0.25 }); }
idx($$('.val-chip'));

// results
var resMap = $('.res-map-bg'); if (resMap) onView([$('#results')], function(){ resMap.classList.add('in'); }, { threshold: 0.2 });
idx($$('.res-row'));
onView($$('.res-row-val .big'), function(el){ countUp(el, 350); }, { threshold: 0.6 });

// team
$$('.team-card-mag').forEach(function(c, i){
  c.classList.remove('r-l', 'r-r');
  var ph = $('.tc-photo', c);
  if (ph){ ph.classList.add('m-wipe'); ph.style.setProperty('--d', (i * 0.14) + 's'); }
});
onView($$('.team-card-mag'), function(el){ var p = $('.tc-photo', el); if (p) p.classList.add('in'); }, { threshold: 0.25 });
idx($$('.accolade'));
$$('.acc-year').forEach(function(el){ if (!buildOdo(el)) el.__plain = true; });
onView($$('.acc-year'), function(el){
  var i = $$('.acc-year').indexOf(el);
  if (el.__plain) countUp(el, 300 + i * 100); else setTimeout(function(){ rollOdo(el, 0); }, 250 + i * 110);
}, { threshold: 0.6 });

// market map
var mapWrap = $('.map-wrap');
if (mapWrap){
  var tint = $('.map-aerial-tint', mapWrap);
  var rings = mk('div', 'map-rings', '<i></i><i></i><i></i>');
  var radar = mk('div', 'map-radar');
  if (tint){ tint.after(radar); radar.after(rings); }
  idx($$('.map-dot', mapWrap)); idx($$('.map-label', mapWrap));
  onView([mapWrap], function(el){ el.classList.add('in'); }, { threshold: 0.25 });
}

// carousel entrance
var c3 = $('#carousel3d');
if (c3 && isDesk()){
  c3.classList.add('m-stacked');
  onView([$('.carousel-stage')], function(){
    var cards = $$('.c3d', c3);
    cards.forEach(function(c){
      var d = Math.abs(parseInt(c.dataset.i, 10) - getCard());
      c.style.setProperty('--d', (0.1 + Math.min(d, 5 - d) * 0.12) + 's');
    });
    c3.classList.remove('m-stacked');
    setTimeout(function(){ cards.forEach(function(c){ c.style.setProperty('--d', '0s'); }); }, 1800);
  }, { threshold: 0.3 });
}

// timeline
var tlTrack = $('.tl-track'), tlPhases = $$('.tl-phase'), tlEnd = $('.tl-end'), comet = null;
if (tlTrack){
  tlPhases.forEach(function(p){ p.classList.remove('r'); idx($$('.tl-item', p)); });
  if (tlEnd) tlEnd.classList.remove('r');
  comet = mk('span', 'tl-comet'); tlTrack.appendChild(comet);
}

// website browser
var browser = $('.browser');
if (browser){ browser.classList.remove('r', 'fc'); browser.classList.add('m-3d'); browser.style.transition = ''; }

// cta
var cta = $('#cta');
if (cta){
  var rg = mk('div', 'cta-rings', '<i></i><i></i><i></i>');
  cta.insertBefore(rg, cta.firstChild);
  onView([cta], function(el){ el.classList.add('m-seen'); }, { threshold: 0.2 });
}
idx($$('.contact-card'));
$$('.contact-card').forEach(function(c, i){ var p = $('.cc-photo', c); if (p) p.style.setProperty('--i', i); });
onView($$('.contact-cards'), function(el){ el.classList.add('in'); }, { threshold: 0.2 });

/* ── 7. TILT · MAGNETIC · CURSOR ─────────────────────── */
function tilt(el, max){
  if (!el || !FINE) return;
  el.classList.add('m-tilt');
  var g = mk('span', 'm-glare'); el.appendChild(g);
  el.addEventListener('mousemove', function(e){
    var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('m-move');
    el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * max).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * max).toFixed(2) + 'deg) scale(1.025)';
    el.style.setProperty('--gx', (x * 100) + '%'); el.style.setProperty('--gy', (y * 100) + '%');
  });
  el.addEventListener('mouseleave', function(){ el.classList.remove('m-move'); el.style.transform = ''; });
}
tilt($('.hero-stat-card'), 10);
$$('.tc-photo').forEach(function(p){ tilt(p, 14); });
tilt(mapWrap, 7);

function magnetic(el, s){
  if (!el || !FINE) return;
  s = s || 0.35;
  el.style.transition = (el.style.transition ? el.style.transition + ',' : '') + 'translate .6s cubic-bezier(.16,1,.3,1)';
  el.addEventListener('mousemove', function(e){
    var r = el.getBoundingClientRect();
    el.style.translate = ((e.clientX - r.left - r.width / 2) * s).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * s).toFixed(1) + 'px';
  });
  el.addEventListener('mouseleave', function(){ el.style.translate = ''; });
}
$$('.cta-btn,.nav-cta,.carousel-side-btn,.map-cta-btn,.asgn-btn').forEach(function(b){ magnetic(b, 0.32); });

var dot = null, ring = null, ringLb = null;
var cur = { x: -100, y: -100, rx: -100, ry: -100, seen: false };
if (FINE){
  root.classList.add('m-cursor');
  dot = mk('div', '', ''); dot.id = 'm-dot';
  ring = mk('div', '', '<span class="rg"></span><span class="lb"></span>'); ring.id = 'm-ring';
  ringLb = $('.lb', ring);
  body.appendChild(dot); body.appendChild(ring);
  document.addEventListener('mousemove', function(e){
    cur.x = e.clientX; cur.y = e.clientY;
    if (!cur.seen){ cur.rx = cur.x; cur.ry = cur.y; cur.seen = true; }
    root.classList.add('c-show');
  }, { passive: true });
  document.addEventListener('mouseout', function(e){ if (!e.relatedTarget) root.classList.remove('c-show'); });
  document.addEventListener('mousedown', function(){ root.classList.add('c-down'); });
  document.addEventListener('mouseup', function(){ root.classList.remove('c-down'); });
  document.addEventListener('mouseover', function(e){
    var t = e.target;
    if (t.tagName === 'IFRAME' || t.tagName === 'VIDEO'){ root.classList.remove('c-show', 'c-link', 'c-label'); return; }
    var label = '';
    if (t.closest('.c3d:not(.active)')) label = 'View';
    else if (t.closest('.map-link')) label = 'Open';
    else if (t.closest('.carousel-stage') && !t.closest('button,a,.c3d.active')) label = 'Drag';
    if (label){ ringLb.textContent = label; root.classList.add('c-label'); root.classList.remove('c-link'); return; }
    root.classList.remove('c-label');
    root.classList.toggle('c-link', !!t.closest('a,button,[onclick],.plat-tab,.proc-tab,.val-chip,.award-chip,.c3d-dot,#m-rail button'));
  });
}

/* carousel drag / swipe */
var stage = $('.carousel-stage');
if (stage && typeof window.goCard === 'function'){
  var drag = null, dragged = false;
  stage.addEventListener('pointerdown', function(e){
    if (e.target.closest('button,a')) return;
    drag = { x: e.clientX, y: e.clientY }; dragged = false;
  });
  window.addEventListener('pointerup', function(e){
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null;
    stage.classList.remove('m-drag');
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)){ dragged = true; window.goCard(dx < 0 ? 1 : -1); }
  });
  window.addEventListener('pointermove', function(e){ if (drag && Math.abs(e.clientX - drag.x) > 10) stage.classList.add('m-drag'); }, { passive: true });
  stage.addEventListener('click', function(e){ if (dragged){ e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
}

/* ── 8. CHAPTER RAIL · PROGRESS · NAV INK · HINT ─────── */
var CH = Array.prototype.map.call(document.querySelectorAll('section[data-ch]'), function(s){ return [s.id, s.getAttribute('data-ch')]; })
  .map(function(c){ return { el: document.getElementById(c[0]), id: c[0], name: c[1] }; })
  .filter(function(c){ return c.el; });
var DARK = {}; Array.prototype.forEach.call(document.querySelectorAll('section[data-dark]'), function(s){ DARK[s.id] = 1; });
var progress = mk('div'); progress.id = 'm-progress'; body.appendChild(progress);
var rail = mk('nav'); rail.id = 'm-rail'; rail.setAttribute('aria-label', 'Sections');
CH.forEach(function(c, i){
  var b = mk('button', '', '<i></i><span>' + String(i + 1).padStart(2, '0') + ' · ' + c.name + '</span>');
  b.setAttribute('aria-label', c.name);
  b.addEventListener('click', function(){ tweenTo(c.id === 'hero' ? 0 : sectionStop(c.el)); });
  if (!c.el.hasAttribute('data-major')) b.classList.add('minor');
  c.btn = b; rail.appendChild(b);
});
body.appendChild(rail);
var hint = mk('div', '', 'Use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> or a clicker to advance'); hint.id = 'm-hint'; body.appendChild(hint);
function showHint(){
  if (!isDesk()) return;
  setTimeout(function(){ hint.classList.add('show'); }, 900);
  setTimeout(function(){ hint.classList.remove('show'); }, 6500);
}
var navUl = $('.nav-links'), ink = null, NAVMAP = {};
if (navUl){
  ink = mk('span', 'nav-ink'); navUl.appendChild(ink);
  $$('a[href^="#"]', navUl).forEach(function(a){ NAVMAP[a.getAttribute('href').slice(1)] = a; });
}
var NAVALIAS = { results: 'team', timeline: 'process' };
var activeId = null, flashT = null;
function setActive(id){
  if (id === activeId) return; activeId = id;
  CH.forEach(function(c){ c.btn.classList.toggle('on', c.id === id); c.btn.classList.remove('flash'); });
  var c = CH.filter(function(c){ return c.id === id; })[0];
  if (c && introDone){ c.btn.classList.add('flash'); clearTimeout(flashT); flashT = setTimeout(function(){ c.btn.classList.remove('flash'); }, 1600); }
  rail.classList.toggle('dark', !!DARK[id]);
  if (ink){
    var a = NAVMAP[NAVALIAS[id] || id];
    if (a){
      var ur = navUl.getBoundingClientRect(), ar = a.getBoundingClientRect();
      ink.style.width = ar.width + 'px'; ink.style.transform = 'translateX(' + (ar.left - ur.left) + 'px)'; ink.style.opacity = '1';
    } else ink.style.opacity = '0';
  }
}

/* ── 9. KEYBOARD / CLICKER NAVIGATION ────────────────── */
function topOf(el){ return el.getBoundingClientRect().top + window.scrollY; }
function trackStops(track, n){
  n = n || track.querySelectorAll('.plat-tab, .proc-tab').length || 1; // one stop per tab
  var sc = track.offsetHeight - window.innerHeight, t = topOf(track), out = [];
  for (var i = 0; i < n; i++) out.push(Math.round(t + (i + 0.5) / n * sc));
  return out;
}
function sectionStop(el){
  if (!el) return 0;
  if (pinnedMQ.matches){
    if (el.id === 'platforms'){ var pt = $('#platScrollTrack'); if (pt) return trackStops(pt)[0]; }
    if (el.id === 'process'){ var pr = $('#procScrollTrack'); if (pr) return trackStops(pr)[0]; }
  }
  if (el.id === 'timeline') return topOf(el) + 140;
  return topOf(el);
}
function buildStops(){
  var vh = window.innerHeight, out = [{ y: 0 }];
  CH.forEach(function(c){
    if (c.id === 'hero') return;
    if (pinnedMQ.matches && (c.id === 'platforms' || c.id === 'process')){
      var tr = c.id === 'platforms' ? $('#platScrollTrack') : $('#procScrollTrack');
      if (tr){ trackStops(tr).forEach(function(y){ out.push({ y: y }); }); return; }
    }
    var y0 = sectionStop(c.el), h = c.el.offsetHeight - (y0 - topOf(c.el));
    out.push({ y: y0, carousel: c.id === 'assignments' });
    if (h - vh > vh * 0.3){
      for (var y = y0 + vh * 0.8; y < y0 + h - vh - vh * 0.3; y += vh * 0.8) out.push({ y: y });
      out.push({ y: y0 + h - vh });
    }
  });
  var mx = maxScroll();
  out.forEach(function(s){ s.y = clamp(Math.round(s.y), 0, mx); });
  out.sort(function(a, b){ return a.y - b.y; });
  return out.filter(function(s, i){ return i === 0 || s.y - out[i - 1].y > 40; });
}
function go(dir){
  var stops = buildStops(), y = SS.mode === 'tween' && SS.tw ? SS.tw.to : window.scrollY;
  var here = stops.filter(function(s){ return Math.abs(s.y - y) < 12; })[0];
  if (here && here.carousel && typeof window.goCard === 'function'){
    var cc = getCard();
    if (dir > 0 && cc < $$('#carousel3d .c3d').length - 1){ window.goCard(1); return; }
    if (dir < 0 && cc > 0){ window.goCard(-1); return; }
  }
  var nxt = null;
  if (dir > 0){ for (var i = 0; i < stops.length; i++) if (stops[i].y > y + 12){ nxt = stops[i]; break; } }
  else { for (var j = stops.length - 1; j >= 0; j--) if (stops[j].y < y - 12){ nxt = stops[j]; break; } }
  if (nxt) tweenTo(nxt.y);
}
window.addEventListener('keydown', function(e){
  if (!introDone || e.altKey || e.ctrlKey || e.metaKey) return;
  var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown'){ e.preventDefault(); go(1); hint.classList.remove('show'); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); go(-1); hint.classList.remove('show'); }
});

/* ── 10. SCROLL-DRIVEN SCENES (single rAF loop) ──────── */
var teamCards = $$('.team-card-mag'), TEAMK = [-46, 34, -46];
var market = $('#market'), kband = $('.kband'), kb1 = $('.kb-1'), kb2 = $('.kb-2');
var platTrack = $('#platScrollTrack'), procTrack = $('#procScrollTrack'), procBg = $('.proc-bg');
var mapImg = $('.map-aerial'), ctaRings = null;
var lmAnims = [], lmRate = 1;
setTimeout(function(){ $$('.lm-row').forEach(function(r){ if (r.getAnimations) lmAnims = lmAnims.concat(r.getAnimations()); }); }, 300);

var last = { y: -1, w: 0, h: 0, mx: 0, my: 0 }, vel = 0, dirty = true;
var mouse = { tx: 0, ty: 0, x: 0, y: 0 };
if (hero && FINE){
  hero.addEventListener('mousemove', function(e){
    var r = hero.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width * 2 - 1; mouse.ty = (e.clientY - r.top) / r.height * 2 - 1;
    heroGlow.style.setProperty('--gx', (e.clientX - r.left) + 'px'); heroGlow.style.setProperty('--gy', (e.clientY - r.top) + 'px');
  });
  hero.addEventListener('mouseleave', function(){ mouse.tx = 0; mouse.ty = 0; });
}
window.addEventListener('resize', function(){ dirty = true; });
if (window.ResizeObserver) new ResizeObserver(function(){ dirty = true; }).observe(body);

function pinProgress(track){
  var vh = window.innerHeight, sc = track.offsetHeight - vh;
  if (sc <= 0) return -1;
  return (window.scrollY - topOf(track)) / sc;
}
function scenes(vh, vw, y){
  if (y > 240 && hint.classList.contains('show')) hint.classList.remove('show');
  // progress bar
  var mx = maxScroll();
  progress.style.transform = 'scaleX(' + (mx ? y / mx : 0).toFixed(4) + ')';

  // active chapter
  var probe = vh * 0.45, found = null;
  for (var i = 0; i < CH.length; i++){ var r = CH[i].el.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe){ found = CH[i].id; break; } }
  if (found) setActive(found);

  // hero scroll-out + pointer parallax
  if (hero){
    var hr = hero.getBoundingClientRect();
    if (hr.bottom > 0){
      var hp = clamp(-hr.top / hr.height, 0, 1);
      if (heroBg){ heroBg.style.translate = (-mouse.x * 22).toFixed(1) + 'px ' + (hp * 220 - mouse.y * 14).toFixed(1) + 'px'; heroBg.style.transform = 'scale(' + (1 + hp * 0.18).toFixed(4) + ')'; }
      if (heroText){ heroText.style.translate = (mouse.x * 8).toFixed(1) + 'px ' + (-hp * 160 + mouse.y * 6).toFixed(1) + 'px'; heroText.style.opacity = clamp(1 - hp * 1.5, 0, 1).toFixed(3); }
      if (heroCard){ heroCard.style.translate = (mouse.x * 16).toFixed(1) + 'px ' + (-hp * 70 + mouse.y * 12).toFixed(1) + 'px'; }
    }
  }

  // team staggered parallax
  teamCards.forEach(function(c, i){
    var r = c.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
    var p = (r.top + r.height / 2 - vh / 2) / vh;
    c.style.translate = '0 ' + (p * TEAMK[i % 3]).toFixed(1) + 'px';
  });

  // kinetic band
  if (kband){
    var kr = kband.getBoundingClientRect();
    if (kr.bottom > 0 && kr.top < vh){
      var kp = (vh - kr.top) / (vh + kr.height), sk = 0; // skew removed for a calmer, more refined band
      if (kb1) kb1.style.transform = 'translate3d(' + (-300 - kp * 900).toFixed(1) + 'px,0,0) skewX(' + sk + 'deg)';
      if (kb2) kb2.style.transform = 'translate3d(' + (-1400 + kp * 900).toFixed(1) + 'px,0,0) skewX(' + sk + 'deg)';
    }
  }

  // section clip expansions
  [market, cta].forEach(function(s){
    if (!s) return;
    var r = s.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0){ return; }
    var p = easeOut3(clamp((vh - r.top) / (vh * 0.9), 0, 1));
    var ix = ((1 - p) * vw * 0.07).toFixed(1), rad = ((1 - p) * 56).toFixed(1);
    s.style.clipPath = p >= 0.999 ? 'none' : 'inset(0 ' + ix + 'px round ' + rad + 'px)';
  });

  // market aerial drift
  if (mapImg){
    var mr = mapImg.getBoundingClientRect();
    if (mr.bottom > 0 && mr.top < vh){ var mp = (mr.top + mr.height / 2 - vh / 2) / vh; mapImg.style.translate = '0 ' + (mp * 50).toFixed(1) + 'px'; }
  }

  // platforms: active tab progress fill
  if (platTrack && pinnedMQ.matches){
    var pp = pinProgress(platTrack);
    if (pp > -0.3 && pp < 1.3){
      var pi = clamp(Math.floor(pp * 5), 0, 4), pl = clamp(pp * 5 - pi, 0, 1);
      var at = $('#platTabs .plat-tab.active'); if (at) at.style.setProperty('--tp', Math.max(0.04, pl).toFixed(3));
    }
  }

  // process: ken burns, tab progress, big word drift
  if (procTrack && pinnedMQ.matches){
    var qp = pinProgress(procTrack);
    if (qp > -0.5 && qp < 1.5){
      var qc = clamp(qp, 0, 1);
      if (procBg) procBg.style.setProperty('--kb', (1.16 - qc * 0.16).toFixed(4));
      var qi = clamp(Math.floor(qp * 5), 0, 4), ql = clamp(qp * 5 - qi, 0, 1);
      var ptab = $('#procTabs .proc-tab.active'); if (ptab) ptab.style.setProperty('--tp', ql.toFixed(3));
      var big = $('.proc-panel.active .pp-num-large'); if (big) big.style.translate = ((0.5 - ql) * 90).toFixed(1) + 'px 0';
    }
  }

  // timeline spine draw
  if (tlTrack){
    var tr = tlTrack.getBoundingClientRect();
    if (tr.top < vh && tr.bottom > -200){
      var L = Math.max(1, tr.height - 78), tip = clamp(vh * 0.62 - tr.top - 18, 0, L);
      tlTrack.style.setProperty('--tl', (tip / L).toFixed(4));
      tlTrack.classList.toggle('m-live', tip > 2 && tip < L - 2);
      if (comet) comet.style.transform = 'translate3d(0,' + tip.toFixed(1) + 'px,0)';
      tlPhases.forEach(function(p){ if (p.offsetTop + 40 <= tip + 26) p.classList.add('lit'); });
      if (tlEnd && tip >= L - 4) tlEnd.classList.add('lit');
    }
  }

  // website browser rises into place
  if (browser){
    var br = browser.getBoundingClientRect();
    if (br.top < vh + 100 && br.bottom > -100){
      var bp = easeOut3(clamp((vh - br.top) / (vh * 0.85), 0, 1));
      browser.style.transform = 'perspective(2200px) rotateX(' + ((1 - bp) * 34).toFixed(2) + 'deg) scale(' + (0.84 + bp * 0.16).toFixed(4) + ') translate3d(0,' + ((1 - bp) * 30).toFixed(1) + 'px,0)';
      browser.style.opacity = (0.35 + bp * 0.65).toFixed(3);
    }
  }

  // cta rings parallax
  if (cta){
    ctaRings = ctaRings || $('.cta-rings', cta);
    var cr = cta.getBoundingClientRect();
    if (ctaRings && cr.top < vh && cr.bottom > 0){ var cp = (vh - cr.top) / (vh + cr.height); ctaRings.style.translate = '0 ' + ((0.5 - cp) * 160).toFixed(1) + 'px'; ctaRings.style.scale = (0.8 + cp * 0.35).toFixed(3); }
  }
}

var lastT = performance.now();
function loop(now){
  var dt = Math.min(64, now - lastT); lastT = now;
  stepScroll(now, dt);
  var y = window.scrollY, vh = window.innerHeight, vw = window.innerWidth;
  var dy = y - (last.y < 0 ? y : last.y);
  vel = lerp(vel, dy * (16.67 / Math.max(dt, 1)), 0.18);
  if (Math.abs(vel) < 0.01) vel = 0;
  var mk2 = 1 - Math.pow(1 - 0.08, dt / 16.67);
  mouse.x = lerp(mouse.x, mouse.tx, mk2); mouse.y = lerp(mouse.y, mouse.ty, mk2);
  var mouseMoving = Math.abs(mouse.x - last.mx) > 0.0005 || Math.abs(mouse.y - last.my) > 0.0005;
  if (dirty || y !== last.y || vh !== last.h || vw !== last.w || mouseMoving || Math.abs(vel) > 0.02){
    dirty = false; last.y = y; last.h = vh; last.w = vw; last.mx = mouse.x; last.my = mouse.y;
    try { scenes(vh, vw, y); } catch (err) { console.warn('[motion]', err); }
  }
  // velocity-reactive logo marquee
  var want = 1 + Math.min(Math.abs(vel) * 0.09, 5);
  lmRate = lerp(lmRate, want, 0.12);
  if (lmAnims.length && Math.abs(lmRate - (lmAnims[0].playbackRate || 1)) > 0.02){
    lmAnims.forEach(function(a){ try { a.playbackRate = lmRate; } catch (e) {} });
  }
  // cursor
  if (dot){
    var ck = 1 - Math.pow(1 - 0.2, dt / 16.67);
    cur.rx = lerp(cur.rx, cur.x, ck); cur.ry = lerp(cur.ry, cur.y, ck);
    dot.style.transform = 'translate3d(' + cur.x + 'px,' + cur.y + 'px,0)';
    ring.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0)';
  }
  requestAnimationFrame(loop);
}

/* ── 11. BOOT ────────────────────────────────────────── */
function boot(){
  requestAnimationFrame(loop);
  var started = false;
  var start = function(){ if (started) return; started = true; runIntro(); };
  try { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function(){ setTimeout(start, 160); }); } catch (e) {}
  setTimeout(start, 1400);
}
boot();

/* safety net: never leave content invisible */
setTimeout(function(){
  if (!introDone) finishIntro(true);
}, 7000);
window.__motionDebug = { go: go, stops: buildStops, tweenTo: tweenTo, SS: SS };
})();
