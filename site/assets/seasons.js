/**
 * Special dates. Picks the season for the visitor's local date, sets
 * data-season on <html>, dresses Vudu for it, adds the hero accent and a chip
 * with an off switch, and loads the particles (seasons-fx.js) only when
 * there is a hero to put them in and motion is welcome.
 *
 *   ?season=halloween   forces a season (previews and tests)
 *   ?season=off         turns it off for this view
 *
 * Turning a season off from the chip is remembered per season in
 * localStorage. The date logic is exported as window.VoodooSeasons so it can
 * be tested without a browser.
 */
(function (w) {
  'use strict';

  var IDS = ['newyear', 'carnival', 'easter', 'valentine', 'junina', 'halloween', 'christmas'];

  /** Easter Sunday, by the anonymous Gregorian algorithm. Month is 0-based. */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    return new Date(y, month - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }

  /** The season id for a date and a language, or null. Windows are inclusive. */
  function detect(now, lang) {
    var y = now.getFullYear(), m = now.getMonth(), dd = now.getDate();
    var t = new Date(y, m, dd).getTime();
    var pt = /^pt(-br)?$/i.test(lang || '');
    var e = easter(y);
    var at = function (offset) {
      return new Date(y, e.getMonth(), e.getDate() + offset).getTime();
    };
    if ((m === 11 && dd >= 30) || (m === 0 && dd <= 2)) return 'newyear';
    if (m === 11 && dd >= 18 && dd <= 26) return 'christmas';
    if (m === 9 && dd >= 24) return 'halloween';
    // Ash Wednesday is Easter minus 46 days; carnival starts the Saturday before.
    if (t >= at(-50) && t <= at(-46)) return 'carnival';
    if (t >= at(-2) && t <= at(0)) return 'easter';
    if ((m === 1 && dd === 14) || (pt && m === 5 && dd === 12)) return 'valentine';
    if (m === 5 && dd >= 13 && dd <= 29) return 'junina';
    return null;
  }

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (err) {
      /* storage unavailable: the choice lasts for this view only */
    }
    return null;
  }

  /** The language that decides the pt-BR dates: the site's choice, else the browser's. */
  function language() {
    var saved = store('voodoo:locale');
    if (saved && saved.charAt(0) === '"') saved = saved.slice(1, -1);
    return saved || (w.navigator && navigator.language) || '';
  }

  /** What should show for this view: { id, forced, off }. */
  function resolve(search, now, lang) {
    var q = /[?&]season=([a-z]+)/.exec(search || '');
    if (q && q[1] === 'off') return { id: null, forced: true, off: true };
    if (q && IDS.indexOf(q[1]) !== -1) return { id: q[1], forced: true, off: false };
    var id = detect(now, lang);
    return { id: id, forced: false, off: !!id && store('voodoo:season-off:' + id) === '1' };
  }

  var api = (w.VoodooSeasons = { IDS: IDS, easter: easter, detect: detect, resolve: resolve });
  var d = w.document;
  if (!d) return;

  var root = d.documentElement;
  var BASE = new URL('seasons/', d.currentScript ? d.currentScript.src : location.href).href;
  var NAMES = { newyear: 'New Year', carnival: 'Carnival', easter: 'Easter', valentine: "Valentine's Day",
    junina: 'Midsummer', halloween: 'Halloween', christmas: 'Christmas' };
  var state = resolve(location.search, new Date(), language());
  api.state = state;
  if (!state.id) return;

  var reduced = w.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkQuery = w.matchMedia && matchMedia('(prefers-color-scheme: dark)');
  var fx = null;

  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : !!(darkQuery && darkQuery.matches);
  }

  function t(key, fallback, params) {
    var V = w.V;
    if (V && typeof V.t === 'function') {
      var text = V.t(key, params);
      if (text && text !== key) return text;
    }
    return fallback;
  }

  function name() {
    return t('season.' + state.id, NAMES[state.id]);
  }

  function art(file) {
    return BASE + state.id + '/' + file;
  }

  // ------------------------------------------------------------- the art

  function paintMascots() {
    var imgs = d.querySelectorAll('img[data-vudu]');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.hasAttribute('data-plain')) img.setAttribute('data-plain', img.getAttribute('src'));
      var on = root.hasAttribute('data-season');
      var tone = img.classList.contains('when-dark') ? 'dark' : img.classList.contains('when-light') ? 'light' : isDark() ? 'dark' : 'light';
      img.src = on ? art('vudu-' + tone + '.svg') : img.getAttribute('data-plain');
    }
  }

  function addAccent() {
    var hero = d.querySelector('.vd-aura');
    if (!hero || hero.querySelector('.vd-season-accent')) return;
    var box = d.createElement('div');
    box.className = 'vd-season-accent';
    box.setAttribute('aria-hidden', 'true');
    var html =
      '<img class="vd-season-strip when-light" alt="" src="' + art('accent-light.svg') + '">' +
      '<img class="vd-season-strip when-dark" alt="" src="' + art('accent-dark.svg') + '">';
    for (var i = 1; i <= 3; i++) {
      html += '<svg class="vd-season-icon vd-season-icon-' + i + '"><use href="' + art('icons.svg#s-' + i) + '"></use></svg>';
    }
    box.innerHTML = html;
    hero.appendChild(box);
    if (!reduced) {
      var s = d.createElement('script');
      s.src = BASE.replace(/seasons\/$/, 'seasons-fx.js');
      s.onload = function () {
        if (w.VoodooSeasonFx && root.hasAttribute('data-season')) fx = w.VoodooSeasonFx(hero, state.id);
      };
      d.head.appendChild(s);
    }
  }

  function removeAccent() {
    var box = d.querySelector('.vd-season-accent');
    if (box) box.parentNode.removeChild(box);
    if (fx) fx.stop();
    fx = null;
  }

  // ------------------------------------------------------------- the chip

  var chip = null;

  function drawChip() {
    var on = root.hasAttribute('data-season');
    var label = on ? t('season.turnOff', 'Turn off ' + name() + ' mode', { name: name() })
      : t('season.turnOn', 'Turn on ' + name() + ' mode', { name: name() });
    chip.className = 'vd-season-chip' + (on ? '' : ' is-off');
    chip.innerHTML =
      '<svg class="vd-icon" aria-hidden="true"><use href="' + art('icons.svg#s-1') + '"></use></svg>' +
      '<span class="vd-season-name">' + t('season.mode', name() + ' mode', { name: name() }) + '</span>' +
      '<span class="vd-season-switch" aria-hidden="true"><i></i></span>';
    chip.setAttribute('role', 'switch');
    chip.setAttribute('aria-checked', on ? 'true' : 'false');
    chip.setAttribute('aria-label', label);
    chip.title = label;
  }

  function set(on) {
    if (on) root.setAttribute('data-season', state.id);
    else root.removeAttribute('data-season');
    store('voodoo:season-off:' + state.id, on ? null : '1');
    paintMascots();
    if (on) addAccent();
    else removeAccent();
    drawChip();
  }

  function start() {
    chip = d.createElement('button');
    chip.type = 'button';
    chip.addEventListener('click', function () {
      set(!root.hasAttribute('data-season'));
    });
    d.body.appendChild(chip);
    drawChip();
    if (!state.off) {
      paintMascots();
      addAccent();
    }
    // The chip follows the language picker and the mascots follow the theme.
    d.addEventListener('change', function (event) {
      if (event.target && event.target.classList && event.target.classList.contains('vd-lang')) setTimeout(drawChip, 0);
    });
    new MutationObserver(paintMascots).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (!state.off) root.setAttribute('data-season', state.id);
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
