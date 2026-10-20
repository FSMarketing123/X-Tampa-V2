/* ═══════════════════════════════════════════════════════
   THEME — palette, headline style and spacing for the deck.
   Replaces the design tool's React "Tweaks" panel with plain JS.

   Change the look by editing DECK_THEME below:
     palette   : 'teal' (Franklin Street brand) | 'warm' | 'minimal'
     typeStyle : 'editorial' (Libre Baskerville) | 'modern' (Arial Narrow caps)
     energy    : 'refined' (120px section padding) | 'bold' (72px, heavier shadows)

   Preview without editing: add ?palette=warm&typeStyle=modern&energy=bold
   to the page URL.
══════════════════════════════════════════════════════ */
(function () {
  var DECK_THEME = {
    palette: 'teal',
    typeStyle: 'editorial',
    energy: 'refined'
  };

  var q = new URLSearchParams(location.search);
  ['palette', 'typeStyle', 'energy'].forEach(function (k) {
    if (q.get(k)) DECK_THEME[k] = q.get(k);
  });

  var PALETTES = {
    teal:    { navy: '#003349', teal: '#005670', sky: '#7BA7BC', green: '#00939D', cream: '#E8F0F4', body: '#ffffff' },
    warm:    { navy: '#1a1208', teal: '#5c3d1e', sky: '#c9a264', green: '#c9a264', cream: '#faf6ef', body: '#faf6ef' },
    minimal: { navy: '#111111', teal: '#333333', sky: '#999999', green: '#111111', cream: '#f4f4f4', body: '#ffffff' }
  };

  function apply(t) {
    var root = document.documentElement;
    var p = PALETTES[t.palette] || PALETTES.teal;
    ['navy', 'teal', 'sky', 'green', 'cream'].forEach(function (k) {
      root.style.setProperty('--' + k, p[k]);
    });
    document.body.style.background = p.body;

    document.querySelectorAll(
      '.hero-h1, .adv-h2, .team-h2, .market-h2, .asgn-h2, .proc-h2, .cta-h2, .res-h2, .pp-h3, .c3d-title'
    ).forEach(function (el) {
      if (t.typeStyle === 'modern') {
        el.style.fontFamily = "'Arial Narrow', Arial, sans-serif";
        el.style.letterSpacing = '-0.01em';
        el.style.fontWeight = '700';
        el.style.textTransform = 'uppercase';
      } else {
        el.style.fontFamily = "'Libre Baskerville', serif";
        el.style.letterSpacing = '-0.02em';
        el.style.fontWeight = '400';
      }
    });

    var bold = t.energy === 'bold';
    var pad = bold ? 72 : 120;
    // Sections that need tighter spacing than the default (px). Assignments → Process
    // would otherwise stack two full paddings of empty space before the Process photo.
    var PAD_OVERRIDES = {
      advantage: { bottom: 24 },   // video flows straight into the National Reach map
      results: { top: 80 },
      assignments: { bottom: 48 },
      process: { top: 0 }
    };
    document.querySelectorAll('section').forEach(function (s) {
      var o = PAD_OVERRIDES[s.id] || {};
      s.style.paddingTop = (o.top != null ? o.top : pad) + 'px';
      s.style.paddingBottom = (o.bottom != null ? o.bottom : pad) + 'px';
    });
    document.querySelectorAll('.fc, .adv-text-card, .pp-right').forEach(function (el) {
      el.style.boxShadow = bold ? '0 24px 80px rgba(0,51,73,0.22), 0 4px 12px rgba(0,51,73,0.1)' : '';
    });
    var greenBar = document.querySelector('.hsc-green');
    if (greenBar) greenBar.style.height = bold ? '6px' : '3px';
  }

  apply(DECK_THEME);
  window.DeckTheme = { apply: apply, current: DECK_THEME };
})();
