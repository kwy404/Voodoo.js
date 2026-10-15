/**
 * The playground: an editor on the left, the result on the right.
 *
 * The preview is a sandboxed iframe loading the very build this site ships,
 * so the code in the box is the code that executes. There is no compiler in
 * this loop, which is the property the whole framework is built around.
 */

(function () {
  'use strict';

  /**
   * The library the preview loads: this site's own copy, not the CDN.
   *
   * It used to be a pinned CDN URL, and that made the playground permanently
   * behind. A release had to reach npm before the playground could show it, and
   * then jsDelivr caches at the edge, so a fix took hours more to appear.
   *
   * Resolved against this script's own URL, so it is whatever was deployed
   * alongside it: on GitHub Pages, from a file:// checkout, or from a local
   * server. There is nothing left to keep in sync.
   */
  var SCRIPT_URL = document.currentScript.src;
  var RUNTIME = new URL('../voodoo.full.min.js?v=c917278b', SCRIPT_URL).href;
  var VUDU_ERROR = new URL('brand/vudu/vudu-error.svg', SCRIPT_URL).href;
  var VUDU_THINKING = new URL('brand/vudu/vudu-thinking.svg', SCRIPT_URL).href;

  /**
   * Monsoon, inside the preview.
   *
   * The examples are meant to look like software somebody shipped, not like
   * test fixtures, and utility classes are how that gets written inline in a
   * sample that has to stay readable as a teaching artefact. The stylesheet
   * brings the utilities, the components and a reset; monsoon.js compiles the
   * bracket values (text-[11px], hover:bg-[#f8fafc], ring-(--primary)/20) in
   * the browser, the same way the page would in production without a build.
   */
  var MONSOON_CSS = 'https://cdn.jsdelivr.net/npm/monsooncss@0.2.0/dist/monsoon.min.css';
  var MONSOON_JS = 'https://cdn.jsdelivr.net/npm/monsooncss@0.2.0/dist/monsoon.js';

  /**
   * The examples arrive in three files and are joined here.
   *
   * Each is maintained on its own, so an edit to one set cannot disturb
   * another, and a missing file costs only its own examples rather than the
   * page. Ids are deduplicated on the way in: a later file wins, which makes
   * overriding a sample a matter of redeclaring its id.
   */
  var examples = (function () {
    var sources = [
      window.VOODOO_PLAYGROUND_STARTERS,
      window.VOODOO_PLAYGROUND_EXAMPLES,
      window.VOODOO_PLAYGROUND_EXAMPLES_JSX,
      window.VOODOO_PLAYGROUND_EXAMPLES_SHOWCASE,
    ];
    var byId = Object.create(null);
    var order = [];
    sources.forEach(function (list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (ex) {
        if (!ex || !ex.id) return;
        if (!(ex.id in byId)) order.push(ex.id);
        byId[ex.id] = ex;
      });
    });
    return order.map(function (id) {
      return byId[id];
    });
  })();

  var app = document.getElementById('main');
  var code = document.getElementById('code');
  var highlight = document.getElementById('highlight');
  var gutter = document.getElementById('gutter');
  var frame = document.getElementById('frame');
  var fileList = document.getElementById('file-list');
  var filetab = document.getElementById('filetab');
  var descEl = document.getElementById('example-desc');
  var titleEl = document.getElementById('toolbar-title');
  var statusExample = document.getElementById('status-example');
  var statusLines = document.getElementById('status-lines');
  var statusCursor = document.getElementById('status-cursor');
  var statusState = document.getElementById('status-state');
  var breadcrumb = document.getElementById('breadcrumb');
  var quickopen = document.getElementById('quickopen');
  var splitter = document.getElementById('splitter');
  var bench = splitter && splitter.parentNode;
  var shareLabel = document.getElementById('share-label');
  var starters = document.querySelector('.pg-starters');

  /** Lights the starter button for the open example, if it is one. */
  function markStarter(id) {
    if (!starters) return;
    var all = starters.querySelectorAll('button[data-start]');
    for (var i = 0; i < all.length; i++) {
      all[i].setAttribute('aria-pressed', all[i].getAttribute('data-start') === id ? 'true' : 'false');
    }
  }

  var current = null;
  var timer = null;

  var GROUP_LABEL = {
    // The five starters: a counter, a todo list, a form, a request and a
    // blank page. Opened first, so the first thing on screen is short.
    start: 'Start here',
    // Next on purpose. It is the thing this library has that the others do
    // not, so it is the first thing somebody opening the playground sees.
    jsx: 'JSX in plain HTML',
    hooks: 'Hooks',
    basics: 'Basics',
    forms: 'Forms',
    events: 'Events',
    components: 'Components',
    http: 'HTTP',
    ui: 'Interface',
    visual: 'Visual',
    state: 'State',
    advanced: 'Advanced',
  };

  // ---------------------------------------------------------------- painting

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * One regex, one pass.
   *
   * The old site coloured code by chaining .replace() calls over their own
   * output, so a later pass could rewrite markup an earlier pass had emitted:
   * the keyword `class` rewrote the class attribute of the spans already
   * produced, and raw markup leaked onto the page as visible text. A single
   * regex with a replacer cannot do that, because no pass ever sees another
   * pass's output.
   */
  var TOKENS = /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w-]*)([^<>]*?)(\/?>)|(\{[^{}<>\n]*\})/g;
  var ATTRS = /([\w:@.\-[\]$]+)(\s*=\s*)("[^"]*"|'[^']*')?/g;

  function paintAttributes(raw) {
    return escapeHtml(raw).replace(ATTRS, function (all, name, eq, value) {
      var out = '<span class="tk-attr">' + name + '</span>';
      if (eq) out += '<span class="tk-punct">' + eq + '</span>';
      if (value) out += '<span class="tk-str">' + value + '</span>';
      return out;
    });
  }

  function paint(source) {
    var out = '';
    var last = 0;

    source.replace(TOKENS, function (match, comment, open, name, attrs, close, interp, index) {
      out += escapeHtml(source.slice(last, index));
      last = index + match.length;

      if (comment) {
        out += '<span class="tk-com">' + escapeHtml(comment) + '</span>';
      } else if (name) {
        out +=
          '<span class="tk-bracket">' + escapeHtml(open) + '</span>' +
          '<span class="tk-tag">' + name + '</span>' +
          paintAttributes(attrs || '') +
          '<span class="tk-bracket">' + escapeHtml(close) + '</span>';
      } else if (interp) {
        out += '<span class="tk-interp">' + escapeHtml(interp) + '</span>';
      }
      return match;
    });

    out += escapeHtml(source.slice(last));
    // A trailing newline needs something after it, or the final line has no
    // height and the two layers drift apart by one row.
    return out + '\n';
  }

  function repaint() {
    highlight.firstChild.innerHTML = paint(code.value);
    syncScroll();
  }

  function syncScroll() {
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
    gutter.scrollTop = code.scrollTop;
  }

  // ------------------------------------------------------------------ layout

  /**
   * Groups appear in the order GROUP_LABEL declares, not the order the example
   * files list them in. Those files are appended to, so their order is whatever
   * editing history left behind; sorting here keeps the intent in the one place
   * that states it. The sort is stable, so examples keep their order in a group.
   */
  var GROUP_ORDER = Object.keys(GROUP_LABEL);

  examples = examples
    .map(function (ex, i) {
      var at = GROUP_ORDER.indexOf(ex.group);
      return { ex: ex, group: at === -1 ? GROUP_ORDER.length : at, index: i };
    })
    .sort(function (a, b) {
      return a.group - b.group || a.index - b.index;
    })
    .map(function (row) {
      return row.ex;
    });

  function byId(id) {
    for (var i = 0; i < examples.length; i++) if (examples[i].id === id) return examples[i];
    return null;
  }

  /**
   * The explorer tree.
   *
   * Built with DOM calls rather than a string, so a title can never be read as
   * markup. Folders really do fold: a chevron that only points is worse than no
   * chevron, and eleven groups need somewhere to go.
   */
  function buildList() {
    var items = null;
    fileList.textContent = '';

    examples.forEach(function (ex, i) {
      if (i === 0 || examples[i - 1].group !== ex.group) {
        var count = 0;
        for (var j = i; j < examples.length && examples[j].group === ex.group; j++) count++;

        var folder = document.createElement('button');
        folder.type = 'button';
        folder.className = 'pg-group';
        folder.setAttribute('data-group', ex.group);
        folder.setAttribute('aria-expanded', 'true');
        var chev = document.createElement('span');
        chev.className = 'pg-chev';
        chev.setAttribute('aria-hidden', 'true');
        var label = document.createElement('span');
        label.textContent = GROUP_LABEL[ex.group] || ex.group;
        var badge = document.createElement('span');
        badge.className = 'pg-count';
        badge.textContent = count;
        folder.appendChild(chev);
        folder.appendChild(label);
        folder.appendChild(badge);

        items = document.createElement('div');
        items.className = 'pg-items';
        fileList.appendChild(folder);
        fileList.appendChild(items);
      }

      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'pg-file';
      row.setAttribute('data-id', ex.id);
      row.setAttribute('aria-current', 'false');
      row.title = ex.title;
      row.textContent = ex.title;
      items.appendChild(row);
    });
  }

  /** Reveals a row that a collapsed folder or an active filter is hiding. */
  function revealRow(btn) {
    if (!btn) return;
    btn.style.display = '';
    var items = btn.parentNode;
    if (items && items.className === 'pg-items') {
      items.style.display = '';
      var folder = items.previousElementSibling;
      if (folder) {
        folder.style.display = '';
        folder.setAttribute('aria-expanded', 'true');
      }
    }
  }

  /**
   * The explorer filter, narrowing the tree as you type.
   *
   * Rows are hidden rather than removed so the aria-current bookkeeping in
   * load() keeps working on the same nodes throughout.
   */
  function filterList(query) {
    var needle = query.trim().toLowerCase();
    var groups = fileList.querySelectorAll('.pg-group');
    var hits = 0;

    for (var g = 0; g < groups.length; g++) {
      var folder = groups[g];
      var items = folder.nextElementSibling;
      var rows = items.querySelectorAll('.pg-file');
      var groupHit = (GROUP_LABEL[folder.getAttribute('data-group')] || '').toLowerCase().indexOf(needle) !== -1;
      var shown = 0;

      for (var r = 0; r < rows.length; r++) {
        var match =
          !needle ||
          groupHit ||
          rows[r].textContent.toLowerCase().indexOf(needle) !== -1 ||
          rows[r].getAttribute('data-id').indexOf(needle) !== -1;
        rows[r].style.display = match ? '' : 'none';
        if (match) shown++;
      }

      hits += shown;
      folder.style.display = shown ? '' : 'none';
      items.style.display = shown ? '' : 'none';
      // A search that has to be unfolded by hand is not a search.
      if (needle && shown) folder.setAttribute('aria-expanded', 'true');
    }

    var empty = fileList.querySelector('.pg-empty');
    if (!hits && !empty) {
      empty = document.createElement('div');
      empty.className = 'pg-empty';
      var img = document.createElement('img');
      img.src = VUDU_THINKING;
      img.alt = '';
      img.width = 72;
      img.height = 72;
      var text = document.createElement('p');
      text.textContent = 'No example matches that. Try a directive, such as v-model, or a word like table.';
      empty.appendChild(img);
      empty.appendChild(text);
      fileList.appendChild(empty);
    } else if (hits && empty) {
      fileList.removeChild(empty);
    }
  }

  var lastCount = -1;
  var lastLine = -1;

  function drawGutter() {
    var n = code.value.split('\n').length;
    statusLines.textContent = n + (n === 1 ? ' line' : ' lines');
    if (n !== lastCount) {
      lastCount = n;
      lastLine = -1;
      var out = '';
      for (var i = 1; i <= n; i++) out += '<span>' + i + '</span>';
      gutter.innerHTML = out;
    }
    drawCursor();
  }

  /** Ln and Col in the status bar, and the current line number lit in the gutter. */
  function drawCursor() {
    var before = code.value.slice(0, code.selectionStart);
    var line = before.split('\n').length;
    var col = before.length - before.lastIndexOf('\n');
    statusCursor.textContent = 'Ln ' + line + ', Col ' + col;
    if (line === lastLine) return;
    var spans = gutter.children;
    if (spans[lastLine - 1]) spans[lastLine - 1].className = '';
    if (spans[line - 1]) spans[line - 1].className = 'is-current';
    lastLine = line;
  }

  // ------------------------------------------------------------------- theme

  /**
   * The site theme, as it resolves right now.
   *
   * The header toggle (v-theme-toggle.cycle) writes data-theme on the root
   * for an explicit choice and removes it for "system", so the attribute wins
   * and the operating system decides otherwise.
   */
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function siteTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  var frameTheme = siteTheme();

  /**
   * Hands a theme change to the running preview without restarting it, so
   * whatever somebody typed into the example survives the switch.
   */
  function syncTheme() {
    // Posted even when the resolved theme looks unchanged: an example may have
    // moved the frame's own theme, and the page's choice is the one that wins.
    var theme = siteTheme();
    frameTheme = theme;
    if (frame.contentWindow) frame.contentWindow.postMessage({ pg: 'theme', theme: theme }, '*');
  }

  // The toggle on this page, the operating system, and another tab: each one
  // can move the theme, and the preview follows all three.
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  document.addEventListener('voodoo:theme', syncTheme);
  if (darkQuery) {
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme);
    else if (darkQuery.addListener) darkQuery.addListener(syncTheme);
  }
  window.addEventListener('storage', function (event) {
    if (event.key !== 'voodoo:theme' && event.key !== null) return;
    // The library applies the stored choice itself when it is loaded. This
    // covers the moment before it is, with the same rule as the head script.
    var t = null;
    try {
      t = localStorage.getItem('voodoo:theme');
      if (t && t.charAt(0) === '"') t = JSON.parse(t);
    } catch (err) {
      /* storage unavailable: nothing to follow */
    }
    var root = document.documentElement;
    if (t === 'light' || t === 'dark') {
      root.setAttribute('data-theme', t);
      root.style.colorScheme = t;
    } else if (t === 'system' || t === null) {
      root.removeAttribute('data-theme');
      root.style.colorScheme = '';
    }
    syncTheme();
  });

  // ----------------------------------------------------------------- running

  var OPEN = '<scr' + 'ipt';
  var CLOSE = '</scr' + 'ipt>';

  /**
   * The preview follows the site theme, and the examples follow with it.
   *
   * The samples are drawn on a light palette (bg-white cards, slate text), so
   * on their own they would stay light in a dark frame, and anything that
   * inherited the dark text colour would vanish on a white card. The rules
   * below repaint that palette from Monsoon's theme tokens when the frame is
   * dark: white surfaces become --surface, slate text becomes --foreground,
   * pale tints become a wash of their hue over the surface. They sit inside
   * :where([data-theme=dark]), so they weigh exactly as much as the utility
   * they replace and any hover, focus or arbitrary class still wins.
   *
   * Keyed on data-theme rather than decided once, so an example that toggles
   * its own theme (the v-theme-toggle sample) moves the whole frame with it.
   */
  var HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
    'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

  function darkCss() {
    var D = ':where([data-theme=dark]) ';
    var out = '';
    var rule = function (cls, decl, state) {
      out += D + '.' + cls.replace(/([:/.])/g, '\\$1') + (state || '') + '{' + decl + '}';
    };
    var mix = function (color, pct, base) {
      return 'color-mix(in oklab,' + color + ' ' + pct + '%,' + (base || 'var(--surface)') + ')';
    };
    var bg = function (v) {
      return 'background-color:' + v;
    };

    // Surfaces.
    rule('bg-white', bg('var(--surface)'));
    ['50', '70', '80', '90'].forEach(function (a) {
      rule('bg-white/' + a, bg(mix('var(--surface)', a, 'transparent')));
    });
    rule('bg-slate-50', bg('var(--background)'));
    rule('bg-slate-100', bg('var(--surface-2)'));
    rule('bg-slate-200', bg('var(--surface-3)'));
    rule('bg-slate-300', bg(mix('var(--foreground)', 22)));
    rule('bg-slate-400', bg(mix('var(--foreground)', 34)));
    // Near-black buttons and chips would sink into a dark surface: lift them
    // to a slate that still carries white text.
    rule('bg-slate-800', bg('var(--color-slate-700)'));
    rule('bg-slate-900', bg('var(--color-slate-700)'));
    rule('hover:bg-white', bg('var(--surface)'), ':hover');
    rule('hover:bg-slate-700', bg('var(--color-slate-600)'), ':hover');

    // Text, darkest to faintest.
    rule('text-slate-900', 'color:var(--foreground)');
    rule('text-slate-800', 'color:var(--foreground)');
    rule('text-slate-700', 'color:' + mix('var(--foreground)', 86, 'var(--muted-foreground)'));
    rule('text-slate-600', 'color:' + mix('var(--foreground)', 50, 'var(--muted-foreground)'));
    rule('text-slate-500', 'color:var(--muted-foreground)');
    rule('text-slate-400', 'color:' + mix('var(--muted-foreground)', 78, 'var(--background)'));
    rule('text-slate-300', 'color:' + mix('var(--muted-foreground)', 50, 'var(--surface)'));
    rule('text-slate-200', 'color:' + mix('var(--muted-foreground)', 40, 'var(--surface)'));
    rule('hover:text-slate-700', 'color:var(--foreground)', ':hover');
    rule('hover:text-slate-600', 'color:var(--foreground)', ':hover');

    // Lines.
    ['50', '100', '200'].forEach(function (s) {
      rule('border-slate-' + s, 'border-color:var(--border)');
    });
    rule('border-slate-300', 'border-color:' + mix('var(--foreground)', 18, 'var(--border)'));
    rule('border-white', 'border-color:var(--surface)');
    rule('ring-white', '--m-ring-color:var(--surface)');

    // Pale tints become a wash of the hue; dark ink on them becomes light ink.
    HUES.forEach(function (h) {
      var c = 'var(--color-' + h + '-500)';
      rule('bg-' + h + '-50', bg(mix(c, 13)));
      rule('bg-' + h + '-100', bg(mix(c, 20)));
      rule('bg-' + h + '-200', bg(mix(c, 30)));
      // Mid tints carry -800 and -900 ink in the samples; deepen them so the
      // ink, lifted to -200 below, still reads.
      rule('bg-' + h + '-300', bg(mix(c, 48)));
      rule('border-' + h + '-100', 'border-color:' + mix(c, 26));
      rule('border-' + h + '-200', 'border-color:' + mix(c, 36));
      rule('border-' + h + '-300', 'border-color:' + mix(c, 50));
      rule('text-' + h + '-600', 'color:var(--color-' + h + '-400)');
      rule('text-' + h + '-700', 'color:var(--color-' + h + '-300)');
      rule('text-' + h + '-800', 'color:var(--color-' + h + '-200)');
      rule('text-' + h + '-900', 'color:var(--color-' + h + '-200)');
      ['50', '100'].forEach(function (s) {
        var pct = s === '50' ? 13 : 20;
        rule('from-' + h + '-' + s, '--m-gradient-from:' + mix(c, pct));
        rule('via-' + h + '-' + s, '--m-gradient-via:' + mix(c, pct));
        rule('to-' + h + '-' + s, '--m-gradient-to:' + mix(c, pct));
      });
    });
    return out;
  }

  function frameCss() {
    return (
      // Voodoo's own seed, so primary, ring and focus colours match the site.
      ':root{--seed:oklch(0.53 0.25 288);' +
      // The library's own widgets (VInput, the modal, the toasts, v-sortable)
      // pointed at the same surfaces as everything else.
      '--v-surface:var(--surface)!important;--v-surface-2:var(--surface-2)!important;' +
      '--v-border:var(--border)!important;--v-text:var(--foreground)!important;' +
      '--v-text-muted:var(--muted-foreground)!important;--v-primary:var(--primary)!important}' +
      'html,body{height:100%}' +
      'body{line-height:1.6}' +

      /* Two baselines, split on whether the element carries a class.
       *
       * Monsoon's reset strips the browser's chrome from every element, which
       * is right for a designed example and wrong for markup somebody typed
       * by hand: a bare <button> would be plain text and a bare <h1> body
       * sized. So an element WITHOUT a class gets friendly defaults back, and
       * one with a class is left to its utilities. Every rule sits inside
       * :where(), so it carries no specificity at all. */
      ':where(button:not([class])){padding:7px 12px;border:1px solid var(--border);border-radius:7px;' +
      'background:var(--surface);color:var(--foreground);margin:2px 4px 2px 0}' +
      ':where(button:not([class]):hover){border-color:var(--primary);color:var(--primary)}' +
      ':where(input:not([class]):not([type=checkbox]):not([type=radio]):not([type=range]),' +
      'select:not([class]),textarea:not([class])){padding:7px 9px;border:1px solid var(--border);' +
      'border-radius:7px;margin:2px 0;background:var(--surface);color:var(--foreground)}' +
      ':where(h1:not([class]),h2:not([class]),h3:not([class]),h4:not([class])){margin:0 0 8px;' +
      'line-height:1.2;font-weight:650}' +
      ':where(h1:not([class])){font-size:1.75rem}:where(h2:not([class])){font-size:1.375rem}' +
      ':where(h3:not([class])){font-size:1.125rem}' +
      ':where(p:not([class])){margin:0 0 8px}' +
      ':where(ul:not([class])){list-style:disc;padding-left:20px}' +
      ':where(ol:not([class])){list-style:decimal;padding-left:20px}' +
      ':where(a:not([class])){color:var(--primary);text-decoration:underline}' +
      // Hand-typed markup wants breathing room; a designed example brings its
      // own and wants the full frame. A class on a top-level element is the
      // tell. The error panel is excluded so reporting cannot reflow the page.
      'body:not(:has(>[class]:not(.pg-errors))){padding:18px}' +
      // Inline icons stay inline unless a class says otherwise.
      ':where(svg:not([class])){display:inline-block}' +

      darkCss() +

      '.pg-errors{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;display:flex;' +
      'gap:12px;align-items:flex-start;max-height:45%;overflow:auto;padding:12px 14px;border-radius:12px;' +
      'border:1px solid ' + 'color-mix(in oklab,var(--danger) 45%,var(--border));' +
      'background:color-mix(in oklab,var(--danger) 10%,var(--surface));color:var(--foreground);' +
      'box-shadow:var(--m-shadow-lg);font:13px/1.5 var(--font-sans)}' +
      '.pg-errors img{width:56px;height:56px;flex:none}' +
      '.pg-errors b{display:block;margin-bottom:4px;color:var(--danger)}' +
      '.pg-errors pre{margin:0;white-space:pre-wrap;font:12.5px/1.5 var(--font-mono)}'
    );
  }

  /**
   * The few lines the preview runs before the example: answer theme changes,
   * and report errors both inside the frame and up to the page.
   *
   * Surfacing runtime errors matters more here than anywhere: a silent failure
   * in a playground reads as "the framework is broken" rather than "line 4 has
   * a typo".
   */
  function bridge(run) {
    return (
      '(function(){var R=' + run + ',root=document.documentElement,box=null;' +
      'addEventListener("message",function(e){var d=e.data;if(d&&d.pg==="theme"){' +
      'root.setAttribute("data-theme",d.theme);root.style.colorScheme=d.theme;}});' +
      'var seen={};window.__pgError=function(msg){msg=String(msg||"Unknown error");' +
      'if(seen[msg])return;seen[msg]=1;' +
      'try{parent.postMessage({pg:"error",run:R,message:msg},"*")}catch(x){}' +
      'if(!document.body)return;if(!box){box=document.createElement("div");box.className="pg-errors";' +
      'box.setAttribute("role","alert");var i=document.createElement("img");i.alt="";' +
      'i.src=' + JSON.stringify(VUDU_ERROR) + ';var w=document.createElement("div");' +
      'var b=document.createElement("b");b.textContent="The spell did not take";w.appendChild(b);' +
      'box.appendChild(i);box.appendChild(w);document.body.appendChild(box);}' +
      'var p=document.createElement("pre");p.textContent=msg;box.lastChild.appendChild(p);};' +
      'addEventListener("error",function(e){if(e.message)__pgError(e.message)});' +
      'addEventListener("unhandledrejection",function(e){var r=e.reason;' +
      '__pgError(r&&r.message?r.message:r)});' +
      // The library reports a bad expression with console.error and carries
      // on rendering, which is right for a page and silent in a playground.
      'var ce=console.error;console.error=function(a,b){ce.apply(console,arguments);' +
      'if(typeof a==="string"&&a.indexOf("[Voodoo]")===0)' +
      '__pgError(a.replace(/^\\[Voodoo\\]\\s*/,"")+(b&&b.message?" "+b.message:""))};' +
      '})();'
    );
  }

  /** What the preview shows for an empty file, instead of a blank frame. */
  var EMPTY =
    '<div class="pg-empty-frame" style="display:grid;place-items:center;min-height:90vh;padding:24px;' +
    'text-align:center;color:var(--muted-foreground);font:15px/1.5 var(--font-sans)">' +
    '<div><img src="' + VUDU_THINKING + '" alt="" width="88" height="88" style="margin:0 auto 8px">' +
    '<p style="margin:0">The file is empty. Write some HTML on the left, or pick a starter above.</p></div></div>';

  var BOOT =
    'if(window.V&&V.start){try{V.start()}catch(e){__pgError(e&&e.message?e.message:e)}}' +
    'else{__pgError("The Voodoo.js bundle did not load.")}';

  var runId = 0;
  var errors = 0;
  var loadingTimer = null;

  function setState(state) {
    app.setAttribute('data-state', state);
    statusState.textContent =
      state === 'running' ? 'Running' : state === 'error' ? errors + (errors === 1 ? ' error' : ' errors') : 'Ready';
  }

  function run() {
    runId++;
    errors = 0;
    setState('running');
    frameTheme = siteTheme();
    // Vudu only appears for a run slower than a blink, so typing never flickers.
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(function () {
      app.setAttribute('data-loading', '');
    }, 260);

    // The library must load BEFORE the sample's own <script> blocks. An inline
    // script runs while the document parses, so a deferred library would still
    // be missing when an example calls V.store(). Load it first, hold rendering
    // with data-manual, then start once the sample's scripts have had their turn.
    frame.srcdoc =
      '<!doctype html><html lang="en" data-theme="' + frameTheme + '" style="color-scheme:' + frameTheme + '">' +
      '<head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link rel="stylesheet" href="' + MONSOON_CSS + '">' +
      '<style>' + frameCss() + '</style>' +
      OPEN + '>' + bridge(runId) + CLOSE +
      OPEN + ' src="' + RUNTIME + '" data-manual>' + CLOSE +
      OPEN + ' src="' + MONSOON_JS + '">' + CLOSE +
      '</head><body>' +
      (code.value.trim() ? code.value : EMPTY) +
      OPEN + '>' + BOOT + CLOSE +
      '</body></html>';
  }

  frame.addEventListener('load', function () {
    clearTimeout(loadingTimer);
    app.removeAttribute('data-loading');
    setState(errors ? 'error' : 'ready');
    // The library in the frame applies a stored theme choice when it starts,
    // and "system" clears data-theme. Say once more which theme the page is
    // in, so the preview and the page agree after every run.
    if (frame.contentWindow) frame.contentWindow.postMessage({ pg: 'theme', theme: frameTheme }, '*');
  });

  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.pg !== 'error' || data.run !== runId) return;
    errors++;
    setState('error');
  });

  function scheduleRun() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 420);
  }

  function markDirty(dirty) {
    filetab.classList.toggle('is-dirty', dirty);
  }

  /**
   * Edits survive a reload. Each example keeps the last code typed into it,
   * so closing the tab by accident costs nothing, and Reset is how to go back
   * to the original. Only the most recent few are kept.
   */
  var DRAFTS_KEY = 'voodoo.playground.drafts';
  var DRAFTS_MAX = 20;

  function readDrafts() {
    try {
      var all = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      return all && typeof all === 'object' ? all : {};
    } catch (err) {
      return {};
    }
  }

  function writeDraft(id, text) {
    var all = readDrafts();
    delete all[id];
    if (text !== null) all[id] = text;
    var ids = Object.keys(all);
    // Insertion order is age order: drop the oldest beyond the limit.
    while (ids.length > DRAFTS_MAX) delete all[ids.shift()];
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    } catch (err) {
      /* private mode, or storage full: edits just do not persist */
    }
  }

  var draftTimer = null;

  function saveDraft() {
    if (!current) return;
    var ex = current;
    var text = code.value;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      writeDraft(ex.id, text === ex.code.join('\n') ? null : text);
    }, 300);
  }

  function showMeta(title, group, desc, id) {
    descEl.textContent = desc;
    descEl.title = desc;
    titleEl.textContent = title;
    statusExample.textContent = id;
    breadcrumb.textContent = group;
  }

  function load(ex, keepHash, fresh) {
    current = ex;
    var draft = fresh ? null : readDrafts()[ex.id];
    code.value = typeof draft === 'string' ? draft : ex.code.join('\n');
    code.scrollTop = 0;
    code.scrollLeft = 0;
    code.setSelectionRange(0, 0);
    showMeta(ex.title, GROUP_LABEL[ex.group] || ex.group, ex.desc, ex.id);
    markDirty(typeof draft === 'string');
    repaint();
    drawGutter();
    run();

    var rows = fileList.querySelectorAll('.pg-file');
    for (var i = 0; i < rows.length; i++) {
      var on = rows[i].getAttribute('data-id') === ex.id;
      rows[i].setAttribute('aria-current', on ? 'true' : 'false');
      if (on) {
        revealRow(rows[i]);
        scrollIntoList(rows[i]);
      }
    }
    if (!keepHash) history.replaceState(null, '', '#' + ex.id);
    markStarter(ex.id);
  }

  /** Keeps the open example visible in the explorer without moving the page. */
  function scrollIntoList(row) {
    if (!row.offsetParent) return;
    var top = row.offsetTop - fileList.offsetTop;
    if (top < fileList.scrollTop || top + row.offsetHeight > fileList.scrollTop + fileList.clientHeight) {
      fileList.scrollTop = Math.max(0, top - fileList.clientHeight / 3);
    }
  }

  // ------------------------------------------------------------------ shares

  function encode(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function decode(text) {
    return decodeURIComponent(escape(atob(text)));
  }

  function openFromHash() {
    var hash = location.hash.slice(1);
    if (!hash) return false;

    if (hash.indexOf('code=') === 0) {
      try {
        code.value = decode(hash.slice(5));
        current = null;
        showMeta('Shared code', 'shared', 'Shared code', 'shared');
        markDirty(true);
        repaint();
        drawGutter();
        run();
        var rows = fileList.querySelectorAll('.pg-file');
        for (var i = 0; i < rows.length; i++) rows[i].setAttribute('aria-current', 'false');
        return true;
      } catch (err) {
        /* not decodable, fall through to the example list */
      }
    }

    // A hash can arrive percent-encoded from a chat app or a mail client.
    var id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch (err) {
      /* keep it as it came */
    }
    var ex = byId(id);
    if (ex) {
      load(ex, true);
      return true;
    }
    return false;
  }

  function flash(text, ms) {
    shareLabel.textContent = text;
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () {
      shareLabel.textContent = 'Share';
    }, ms);
  }

  function share() {
    var url = location.href.split('#')[0] + '#code=' + encode(code.value);
    // Without a secure context there is no clipboard API at all; the address
    // bar still gets the link, so it can be copied from there.
    history.replaceState(null, '', url);
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      flash('Link in the address bar', 2200);
      return;
    }
    navigator.clipboard.writeText(url).then(
      function () {
        flash('Copied', 1400);
      },
      function () {
        flash('Link in the address bar', 2200);
      }
    );
  }

  function reset() {
    if (!current) return;
    clearTimeout(draftTimer);
    writeDraft(current.id, null);
    load(current, false, true);
  }

  // ------------------------------------------------------------------ wiring

  fileList.addEventListener('click', function (event) {
    var folder = event.target.closest('.pg-group');
    if (folder) {
      folder.setAttribute('aria-expanded', folder.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      return;
    }

    var row = event.target.closest('.pg-file');
    if (!row) return;
    var ex = byId(row.getAttribute('data-id'));
    if (!ex) return;
    load(ex);
    // On a phone the list covers the editor; picking a file is the cue to go
    // and look at it.
    if (isNarrow()) setView('code');
  });

  code.addEventListener('input', function () {
    markDirty(true);
    saveDraft();
    repaint();
    drawGutter();
    scheduleRun();
  });

  code.addEventListener('keydown', function (event) {
    // Tab indents rather than leaving the field: the one keyboard behaviour
    // people expect from a code box and rarely get. Escape then Tab still
    // leaves it, so the editor is never a keyboard trap.
    if (event.key === 'Tab' && !event.shiftKey && !code.dataset.escaped) {
      event.preventDefault();
      var start = code.selectionStart;
      var end = code.selectionEnd;
      code.value = code.value.slice(0, start) + '  ' + code.value.slice(end);
      code.selectionStart = code.selectionEnd = start + 2;
      markDirty(true);
      repaint();
      drawGutter();
      scheduleRun();
      return;
    }
    if (event.key === 'Escape') {
      code.dataset.escaped = '1';
      return;
    }
    delete code.dataset.escaped;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });

  ['keyup', 'click', 'select'].forEach(function (type) {
    code.addEventListener(type, drawCursor);
  });

  // Both layers scroll together, horizontally as well, or the colours slide off
  // the glyphs they belong to.
  code.addEventListener('scroll', syncScroll);

  document.getElementById('btn-run').addEventListener('click', run);

  // The starter buttons in the toolbar: one click to a working example.
  if (starters) {
    starters.addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-start]');
      if (!btn) return;
      var ex = byId(btn.getAttribute('data-start'));
      if (!ex) return;
      load(ex);
      if (isNarrow()) setView('code');
    });
  }
  document.getElementById('btn-reset').addEventListener('click', reset);
  document.getElementById('btn-share').addEventListener('click', share);

  document.querySelector('.pg-widths').addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-w]');
    if (!btn) return;
    var all = this.querySelectorAll('button');
    for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-pressed', 'true');
    frame.style.maxWidth = btn.getAttribute('data-w');
  });

  // ------------------------------------------------------------ phone views

  var narrow = window.matchMedia ? window.matchMedia('(max-width: 1000px)') : null;

  function isNarrow() {
    return !!(narrow && narrow.matches);
  }

  function setView(view) {
    app.setAttribute('data-view', view);
    var radios = document.querySelectorAll('input[name="pg-view"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === view;
  }

  document.querySelector('.pg-views').addEventListener('change', function (event) {
    if (event.target.name === 'pg-view') setView(event.target.value);
  });

  // ---------------------------------------------------------------- splitter

  /**
   * The pane divider, dragged.
   *
   * Anybody who has used a code pen reaches for the seam between the code and
   * the result. The width survives a reload, because the split somebody chose
   * is a preference, not a gesture they want to repeat on every visit.
   */
  var SPLIT_KEY = 'voodoo.playground.split';
  var SPLIT_MIN = 18;
  var SPLIT_MAX = 82;

  function setSplit(percent, remember) {
    var value = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, percent));
    document.documentElement.style.setProperty('--split', value.toFixed(2) + '%');
    splitter.setAttribute('aria-valuenow', String(Math.round(value)));
    if (!remember) return;
    try {
      localStorage.setItem(SPLIT_KEY, String(value));
    } catch (err) {
      /* private mode, or storage full. The split just does not persist. */
    }
  }

  function splitAt(clientX) {
    var box = bench.getBoundingClientRect();
    return box.width ? ((clientX - box.left) / box.width) * 100 : 50;
  }

  if (splitter && bench) {
    var saved = null;
    try {
      saved = localStorage.getItem(SPLIT_KEY);
    } catch (err) {
      /* nothing stored, nothing to restore */
    }
    if (saved && !isNaN(parseFloat(saved))) setSplit(parseFloat(saved), false);

    var endDrag = function (event) {
      if (!app.classList.contains('is-dragging')) return;
      app.classList.remove('is-dragging');
      try {
        splitter.releasePointerCapture(event.pointerId);
      } catch (err) {
        /* the pointer was already gone */
      }
      setSplit(splitAt(event.clientX), true);
    };

    splitter.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      // Capture, because the drag crosses an iframe: without it the preview
      // swallows the first pointermove and the divider sticks mid-screen.
      splitter.setPointerCapture(event.pointerId);
      app.classList.add('is-dragging');
    });

    splitter.addEventListener('pointermove', function (event) {
      if (!app.classList.contains('is-dragging')) return;
      setSplit(splitAt(event.clientX), false);
    });

    splitter.addEventListener('pointerup', endDrag);
    splitter.addEventListener('pointercancel', endDrag);

    splitter.addEventListener('dblclick', function () {
      setSplit(50, true);
    });

    splitter.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 10 : 2;
      var now = parseFloat(splitter.getAttribute('aria-valuenow')) || 50;
      var box = splitter.getBoundingClientRect();
      if (box.width) now = splitAt(box.left);
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSplit(now - step, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSplit(now + step, true);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSplit(50, true);
      }
    });
  }

  // -------------------------------------------------------------- quick open

  function focusSearch() {
    if (app.classList.contains('no-explorer')) toggleExplorer(true);
    if (isNarrow()) setView('files');
    quickopen.focus();
    quickopen.select();
  }

  quickopen.addEventListener('input', function () {
    filterList(quickopen.value);
  });

  quickopen.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      quickopen.value = '';
      filterList('');
      code.focus();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    // offsetParent is null for anything a filter or a folded group is hiding,
    // which makes it the cheapest "first visible row" there is.
    var rows = fileList.querySelectorAll('.pg-file');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].offsetParent) {
        rows[i].click();
        break;
      }
    }
  });

  // ------------------------------------------------------------- activity bar

  var explorerBtn = document.querySelector('.pg-rail [data-act="explorer"]');

  function toggleExplorer(force) {
    var show = typeof force === 'boolean' ? force : app.classList.contains('no-explorer');
    app.classList.toggle('no-explorer', !show);
    explorerBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
  }

  document.querySelector('.pg-rail').addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'explorer') toggleExplorer();
    else if (act === 'search') focusSearch();
    else if (act === 'run') run();
    else if (act === 'share') share();
    else if (act === 'reset') reset();
  });

  document.addEventListener('keydown', function (event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      focusSearch();
    } else if (event.key === 'Enter' && event.target !== code) {
      event.preventDefault();
      run();
    }
  });

  window.addEventListener('hashchange', openFromHash);

  // ------------------------------------------------------------- page layout

  /**
   * The workbench is the viewport minus the sticky site header, so the editor,
   * the preview and the status bar all fit on one screen and the footer waits
   * below. The header changes height with the font and the breakpoint, so it
   * is measured rather than guessed.
   */
  var header = document.querySelector('body > header');

  function measureHeader() {
    if (header) document.documentElement.style.setProperty('--pg-top', header.offsetHeight + 'px');
  }

  measureHeader();
  if (header && window.ResizeObserver) new ResizeObserver(measureHeader).observe(header);
  else window.addEventListener('resize', measureHeader);

  // ------------------------------------------------------------------- start

  buildList();
  if (!openFromHash() && examples.length) load(examples[0]);
})();
