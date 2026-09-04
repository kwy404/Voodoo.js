/**
 * The playground: an editor on the left, the result on the right.
 *
 * The preview is a sandboxed iframe loading the very build this site ships,
 * documentation hands out, so the code in the box is the code that executes.
 * There is no compiler in this loop, which is the property the whole framework
 * is built around.
 */

(function () {
  'use strict';

  /**
   * The library the preview loads: this site's own copy, not the CDN.
   *
   * It used to be a pinned CDN URL, and that made the playground permanently
   * behind. A release had to reach npm before the playground could show it, and
   * then jsDelivr caches at the edge, so a fix took hours more to appear. Every
   * report of "the playground is on the old version" traced back to this line,
   * and the fix each time was to publish and wait.
   *
   * Resolved against this script's own URL, so it is whatever was deployed
   * alongside it — on GitHub Pages, from a file:// checkout, or from a local
   * server. There is nothing left to keep in sync.
   */
  var RUNTIME = new URL('../voodoo.full.min.js?v=4b8f9c6f', document.currentScript.src).href;
  /**
   * The examples arrive in three files and are joined here.
   *
   * Each is maintained on its own, so an edit to one set cannot disturb
   * another, and a missing file costs only its own examples rather than the
   * page. Ids are deduplicated on the way in: a later file wins, which makes
   * overriding a sample a matter of redeclaring its id rather than hunting for
   * the original.
   */
  var examples = (function () {
    var sources = [
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

  var code = document.getElementById('code');
  var highlight = document.getElementById('highlight');
  var gutter = document.getElementById('gutter');
  var frame = document.getElementById('frame');
  var fileList = document.getElementById('file-list');
  var filetab = document.getElementById('filetab');
  var descEl = document.getElementById('example-desc');
  var statusExample = document.getElementById('status-example');
  var statusLines = document.getElementById('status-lines');

  var breadcrumb = document.getElementById('breadcrumb');
  var quickopen = document.getElementById('quickopen');
  var splitter = document.getElementById('splitter');
  var workbench = splitter && splitter.parentNode;

  var current = examples[0];
  var timer = null;

  var GROUP_LABEL = {
    // First on purpose. It is the thing this library has that the others do
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
          '<span class="tk-punct">' +
          escapeHtml(open) +
          '</span><span class="tk-tag">' +
          name +
          '</span>' +
          paintAttributes(attrs || '') +
          '<span class="tk-punct">' +
          escapeHtml(close) +
          '</span>';
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
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
  }

  // ------------------------------------------------------------------ layout

  /**
   * Groups appear in the order GROUP_LABEL declares, not the order the examples
   * file happens to list them in.
   *
   * That file is appended to, so the order was whatever editing history left
   * behind: JSX, the reason to open this page at all, had drifted to the very
   * bottom under nine other groups. Sorting here keeps the intent in the one
   * place that states it, and adding an example no longer risks moving a group.
   *
   * The sort is stable, so examples keep their order within a group.
   */
  var GROUP_ORDER = Object.keys(GROUP_LABEL);

  function inGroupOrder(list) {
    return list
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
  }

  examples = inGroupOrder(examples);
  current = examples[0];

  /**
   * The explorer tree.
   *
   * Folders really do fold. A chevron that only points is worse than no
   * chevron, and eleven groups on a laptop screen need somewhere to go.
   */
  function buildList() {
    var html = '';
    var open = false;

    examples.forEach(function (ex, i) {
      var first = i === 0 || examples[i - 1].group !== ex.group;
      if (!first) {
        html += '<button type="button" data-id="' + ex.id + '" aria-current="false">' +
          ex.title + '</button>';
        return;
      }

      var count = 0;
      for (var j = i; j < examples.length && examples[j].group === ex.group; j++) count++;

      if (open) html += '</div>';
      open = true;
      html +=
        '<button type="button" class="group" data-group="' + ex.group + '" aria-expanded="true">' +
        '<span class="chev" aria-hidden="true"></span>' +
        (GROUP_LABEL[ex.group] || ex.group) +
        '<span class="count">' + count + '</span>' +
        '</button><div class="group-items">' +
        '<button type="button" data-id="' + ex.id + '" aria-current="false">' + ex.title + '</button>';
    });

    if (open) html += '</div>';
    fileList.innerHTML = html;
  }

  /** Reveals a row that a collapsed folder or an active filter is hiding. */
  function revealRow(btn) {
    if (!btn) return;
    btn.style.display = '';
    var items = btn.parentNode;
    if (items && items.className === 'group-items') {
      items.style.display = '';
      if (items.previousSibling) items.previousSibling.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * The title-bar field, filtering the tree as you type.
   *
   * Rows are hidden rather than removed so the aria-current bookkeeping in
   * load() keeps working on the same nodes throughout.
   */
  function filterList(query) {
    var needle = query.trim().toLowerCase();
    var groups = fileList.querySelectorAll('.group');
    var hits = 0;

    for (var g = 0; g < groups.length; g++) {
      var header = groups[g];
      var items = header.nextSibling;
      var rows = items.querySelectorAll('button[data-id]');
      var shown = 0;

      for (var r = 0; r < rows.length; r++) {
        var match =
          !needle ||
          rows[r].textContent.toLowerCase().indexOf(needle) !== -1 ||
          rows[r].getAttribute('data-id').indexOf(needle) !== -1 ||
          (GROUP_LABEL[header.getAttribute('data-group')] || '').toLowerCase().indexOf(needle) !== -1;
        rows[r].style.display = match ? '' : 'none';
        if (match) shown++;
      }

      hits += shown;
      header.style.display = shown ? '' : 'none';
      items.style.display = shown ? '' : 'none';
      // A search that has to be unfolded by hand is not a search.
      if (needle && shown) header.setAttribute('aria-expanded', 'true');
    }

    var empty = fileList.querySelector('.empty');
    if (!hits && !empty) {
      empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No example matches that.';
      fileList.appendChild(empty);
    } else if (hits && empty) {
      fileList.removeChild(empty);
    }
  }

  var lastCount = -1;
  function drawGutter() {
    var n = code.value.split('\n').length;
    statusLines.textContent = n + (n === 1 ? ' line' : ' lines');
    if (n === lastCount) return;
    lastCount = n;
    var out = '';
    for (var i = 1; i <= n; i++) out += '<span>' + i + '</span>';
    gutter.innerHTML = out;
  }

  // ----------------------------------------------------------------- running

  var OPEN = '<scr' + 'ipt';
  var CLOSE = '</scr' + 'ipt>';

  /**
   * The preview carries its theme states itself.
   *
   * An earlier version picked one scheme in the parent and wrote literal colours
   * into the frame. That broke the v-theme-toggle example: the button flipped
   * data-theme inside the iframe and nothing responded, because no rule was
   * keyed on it. Keying the tokens on data-theme is what makes a sample able to
   * toggle its own theme, and that is the half that has to stay.
   *
   * What is gone is the third state, the one that followed the desktop. Every
   * example now paints a light canvas of its own, so on a dark desktop the frame
   * was handing the library's widgets dark tokens and they came out as dark
   * fields on white cards — the VInput in the component gallery had a navy body
   * and a label nobody could read. Light is the ground the samples are drawn on,
   * so light is the default, and data-theme still moves it.
   *
   * The --v-* mapping matters just as much: without it the library paints its
   * built-in widgets from its own tokens, which is how a v-sortable list ended
   * up as dark rows with invisible labels on white paper.
   */
  var LIGHT = {
    ink: '#16141c', soft: '#57526a', faint: '#8b8598',
    paper: '#ffffff', surface: '#ffffff', surface2: '#faf9fb',
    line: '#e7e4ec', accent: '#5b2ee5',
    errBg: '#fde8e8', errInk: '#9b1c1c',
  };

  var DARK = {
    ink: '#f2f0f6', soft: '#b3adc2', faint: '#837d93',
    paper: '#131118', surface: '#191722', surface2: '#211d2d',
    line: '#2b2735', accent: '#a688ff',
    errBg: '#3b1d1d', errInk: '#ffb4b4',
  };

  function tokens(t, scheme) {
    return (
      'color-scheme:' + scheme + ';' +
      '--pg-ink:' + t.ink + ';--pg-soft:' + t.soft + ';--pg-faint:' + t.faint + ';' +
      '--pg-paper:' + t.paper + ';--pg-surface:' + t.surface + ';--pg-line:' + t.line + ';' +
      '--pg-accent:' + t.accent + ';--pg-err-bg:' + t.errBg + ';--pg-err-ink:' + t.errInk + ';' +
      // The library's own widgets, pointed at the same surfaces.
      '--v-surface:' + t.surface + ' !important;--v-surface-2:' + t.surface2 + ' !important;' +
      '--v-border:' + t.line + ' !important;--v-text:' + t.ink + ' !important;' +
      '--v-text-muted:' + t.faint + ' !important;--v-primary:' + t.accent + ' !important;'
    );
  }

  function frameCss() {
    return (
      ':root{' + tokens(LIGHT, 'light') + '}' +
      'html:root[data-theme="dark"]{' + tokens(DARK, 'dark') + '}' +
      'html:root[data-theme="light"]{' + tokens(LIGHT, 'light') + '}' +

      'html,body{height:100%}' +
      'body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'margin:0;padding:0;color:var(--pg-ink);background:var(--pg-paper);line-height:1.6}' +
      '*{box-sizing:border-box}' +

      /* Tailwind's border utilities set a width and a colour and nothing else,
       * because Preflight is what normally declares the style. Preflight is off
       * here, so `border border-slate-200` drew nothing at all: the initial
       * border-style is none, and a 1px none border is invisible. */
      ':where(*,::before,::after){border-width:0;border-style:solid;border-color:#e2e8f0}' +
      ':where(hr){border-top-width:1px}' +

      /* Two baselines, split on whether the element carries a class.
       *
       * Without a class, the element is hand-typed — somebody's own code in the
       * box, or a shared link — and gets the friendly defaults that have always
       * been here, so raw markup never looks abandoned.
       *
       * With a class, the element is being designed with utilities, so the
       * browser's own chrome comes off and one utility is enough to style it.
       * That is Tailwind's Preflight, kept this narrow on purpose: a blanket
       * reset would also strip the library's own widgets, which bring their own
       * stylesheet and expect to keep it.
       *
       * Every rule sits inside :where() so it carries no specificity at all.
       * Author rules still beat the browser's, and any single utility class
       * still beats these. */
      ':where(button:not([class])){font:inherit;padding:7px 12px;' +
      'border:1px solid var(--pg-line);border-radius:7px;background:var(--pg-surface);' +
      'color:var(--pg-ink);cursor:pointer;margin:2px 4px 2px 0}' +
      ':where(button:not([class]):hover){border-color:var(--pg-accent);color:var(--pg-accent)}' +
      ':where(input:not([class]),select:not([class]),textarea:not([class]))' +
      '{font:inherit;padding:7px 9px;border:1px solid var(--pg-line);border-radius:7px;' +
      'margin:2px 0;background:var(--pg-surface);color:var(--pg-ink)}' +
      ':where(h1:not([class]),h2:not([class]),h3:not([class]),h4:not([class]))' +
      '{margin:0 0 8px;line-height:1.2;color:var(--pg-ink)}' +
      ':where(ul:not([class]),ol:not([class])){padding-left:20px}' +
      ':where(a:not([class])){color:var(--pg-accent)}' +
      // Hand-typed markup wants breathing room; a designed example brings its
      // own and wants the full frame. The presence of a class on a top-level
      // element is the tell. .pg-error is excluded because an error appearing
      // must not reflow the page it is reporting on.
      'body:not(:has(>[class]:not(.pg-error))){padding:18px}' +

      // border-WIDTH, not the border shorthand: the shorthand also resets the
      // style to none, and a `border border-slate-200` button then drew nothing
      // at all, because the rule above is the only thing declaring solid.
      ':where(button[class]){appearance:none;-webkit-appearance:none;border-width:0;' +
      'margin:0;padding:0;background:transparent;color:inherit;font:inherit;' +
      'line-height:inherit;text-align:inherit;cursor:pointer}' +
      // Checkbox, radio, range and colour keep the native control: there is no
      // utility that draws one, and a stripped one is an invisible one.
      ':where(input[class]:not([type=checkbox]):not([type=radio]):not([type=range])' +
      ':not([type=color]):not([type=file])),:where(textarea[class],select[class])' +
      '{appearance:none;-webkit-appearance:none;border-width:0;margin:0;padding:0;' +
      'background:transparent;color:inherit;font:inherit;line-height:inherit}' +
      ':where(h1[class],h2[class],h3[class],h4[class],h5[class],h6[class],p[class],' +
      'ul[class],ol[class],dl[class],dd[class],figure[class],pre[class],blockquote[class])' +
      '{margin:0;padding:0}' +
      ':where(ul[class],ol[class]){list-style:none}' +
      ':where(table[class]){border-collapse:collapse;border-spacing:0}' +
      ':where(a[class]){color:inherit;text-decoration:none}' +
      ':where(svg[class]){display:block}' +
      ':where(img[class]){display:block;max-width:100%;height:auto}' +

      '.pg-error{margin:12px;padding:10px 12px;border-radius:8px;' +
      'background:var(--pg-err-bg);color:var(--pg-err-ink);' +
      'font:12.5px ui-monospace,monospace;white-space:pre-wrap}'
    );
  }

  // Surfacing runtime errors matters more here than anywhere: a silent failure
  // in a playground reads as "the framework is broken" rather than "line 4 has
  // a typo".
  var BOOT =
    'window.addEventListener("error",function(e){' +
    'var b=document.createElement("pre");b.className="pg-error";' +
    'b.textContent=e.message;document.body.appendChild(b);});' +
    'if(window.V&&V.start){try{V.start()}catch(e){' +
    'var b=document.createElement("pre");b.className="pg-error";' +
    'b.textContent=e.message;document.body.appendChild(b);}}';

  /**
   * Tailwind, inside the preview only.
   *
   * The examples are meant to look like software somebody shipped, not like
   * test fixtures, and utility classes are how that gets written inline in a
   * sample that has to stay readable as a teaching artefact. It goes in the
   * frame and nowhere near the page chrome, which is hand-written CSS.
   *
   * Preflight is off. It would reset the library's own widgets — VButton,
   * VBadge, the modal, the toasts — which arrive with a stylesheet of their own
   * and expect to keep it. frameCss() does the small part of the job that is
   * actually needed instead.
   */
  var TAILWIND = 'https://cdn.tailwindcss.com';
  var TAILWIND_CONFIG =
    'if(window.tailwind)tailwind.config={corePlugins:{preflight:false}};';

  function run() {
    // The library must load BEFORE the sample's own <script> blocks. An inline
    // script runs while the document parses, so a deferred library would still
    // be missing when an example calls V.store() — which is exactly how the
    // store and directive examples were dying with "V is not defined" and
    // rendering empty values. Load it first, hold rendering with data-manual,
    // then start once the sample's scripts have had their turn.
    frame.srcdoc =
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      OPEN + ' src="' + RUNTIME + '" data-manual>' + CLOSE +
      OPEN + ' src="' + TAILWIND + '">' + CLOSE +
      OPEN + '>' + TAILWIND_CONFIG + CLOSE +
      '<style>' + frameCss() + '</style></head><body>' +
      code.value +
      OPEN + '>' + BOOT + CLOSE +
      '</body></html>';
  }

  function scheduleRun() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 420);
  }

  function markDirty(dirty) {
    filetab.className = dirty ? 'filetab dirty' : 'filetab';
  }

  function load(ex, keepHash) {
    current = ex;
    code.value = ex.code.join('\n');
    descEl.textContent = ex.desc;
    statusExample.textContent = ex.id;
    markDirty(false);
    repaint();
    drawGutter();
    run();

    if (breadcrumb) breadcrumb.textContent = GROUP_LABEL[ex.group] || ex.group;

    var buttons = fileList.querySelectorAll('button[data-id]');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-id') === ex.id;
      buttons[i].setAttribute('aria-current', on ? 'true' : 'false');
      if (on) revealRow(buttons[i]);
    }
    if (!keepHash) history.replaceState(null, '', '#' + ex.id);
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
        descEl.textContent = 'Shared code';
        statusExample.textContent = 'shared';
        if (breadcrumb) breadcrumb.textContent = 'shared';
        markDirty(true);
        repaint();
        drawGutter();
        run();
        return true;
      } catch (err) {
        /* not decodable, fall through to the example list */
      }
    }

    for (var i = 0; i < examples.length; i++) {
      if (examples[i].id === hash) {
        load(examples[i], true);
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ wiring

  fileList.addEventListener('click', function (event) {
    var folder = event.target.closest('button.group');
    if (folder) {
      folder.setAttribute(
        'aria-expanded',
        folder.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
      );
      return;
    }

    var btn = event.target.closest('button[data-id]');
    if (!btn) return;
    for (var i = 0; i < examples.length; i++) {
      if (examples[i].id === btn.getAttribute('data-id')) {
        load(examples[i]);
        document.body.classList.remove('show-files');
        break;
      }
    }
  });

  code.addEventListener('input', function () {
    markDirty(true);
    repaint();
    drawGutter();
    scheduleRun();
  });

  code.addEventListener('keydown', function (event) {
    // Tab indents rather than leaving the field: the one keyboard behaviour
    // people expect from a code box and rarely get.
    if (event.key === 'Tab') {
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
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });

  // Both layers scroll together, horizontally as well, or the colours slide off
  // the glyphs they belong to.
  code.addEventListener('scroll', function () {
    gutter.scrollTop = code.scrollTop;
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
  });

  document.getElementById('btn-run').addEventListener('click', run);

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (current) load(current);
  });

  document.getElementById('btn-share').addEventListener('click', function (event) {
    var url = location.origin + location.pathname + '#code=' + encode(code.value);
    var btn = event.currentTarget;
    navigator.clipboard.writeText(url).then(
      function () {
        btn.textContent = 'Copied';
        setTimeout(function () {
          btn.textContent = 'Share';
        }, 1400);
      },
      function () {
        btn.textContent = 'Press Ctrl+C';
        setTimeout(function () {
          btn.textContent = 'Share';
        }, 1800);
      }
    );
  });

  document.querySelector('.widths').addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-w]');
    if (!btn) return;
    var all = this.querySelectorAll('button');
    for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-pressed', 'true');
    frame.style.maxWidth = btn.getAttribute('data-w');
  });

  document.getElementById('btn-files').addEventListener('click', function () {
    document.body.classList.toggle('show-files');
  });

  document.getElementById('btn-view').addEventListener('click', function (event) {
    document.body.classList.toggle('show-preview');
    event.currentTarget.textContent = document.body.classList.contains('show-preview')
      ? 'Code'
      : 'Preview';
  });

  // ---------------------------------------------------------------- splitter

  /**
   * The pane divider, dragged.
   *
   * This is the one habit borrowed from a pen rather than from an editor:
   * anybody who has used one reaches for the seam between the code and the
   * result, and until now there was nothing there to take hold of. The width
   * survives a reload because the split somebody chose is a preference, not a
   * gesture they want to repeat on every visit.
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
    var box = workbench.getBoundingClientRect();
    return box.width ? ((clientX - box.left) / box.width) * 100 : 50;
  }

  if (splitter && workbench) {
    var saved = null;
    try {
      saved = localStorage.getItem(SPLIT_KEY);
    } catch (err) {
      /* nothing stored, nothing to restore */
    }
    if (saved && !isNaN(parseFloat(saved))) setSplit(parseFloat(saved), false);

    var endDrag = function (event) {
      if (!document.body.classList.contains('dragging')) return;
      document.body.classList.remove('dragging');
      try {
        splitter.releasePointerCapture(event.pointerId);
      } catch (err) {
        /* the pointer was already gone */
      }
      setSplit(splitAt(event.clientX), true);
    };

    splitter.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      // Capture, because the drag crosses an iframe: without it the preview
      // swallows the first pointermove and the divider sticks mid-screen.
      splitter.setPointerCapture(event.pointerId);
      document.body.classList.add('dragging');
    });

    splitter.addEventListener('pointermove', function (event) {
      if (!document.body.classList.contains('dragging')) return;
      setSplit(splitAt(event.clientX), false);
    });

    splitter.addEventListener('pointerup', endDrag);
    splitter.addEventListener('pointercancel', endDrag);

    splitter.addEventListener('dblclick', function () {
      setSplit(50, true);
    });

    splitter.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 10 : 2;
      var now = splitAt(splitter.getBoundingClientRect().left);
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

  if (quickopen) {
    quickopen.addEventListener('input', function () {
      filterList(quickopen.value);
    });

    quickopen.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        quickopen.value = '';
        filterList('');
        quickopen.blur();
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      // offsetParent is null for anything a filter or a folded group is
      // hiding, which makes it the cheapest "first visible row" there is.
      var rows = fileList.querySelectorAll('button[data-id]');
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].offsetParent) {
          rows[i].click();
          break;
        }
      }
    });
  }

  // ------------------------------------------------------------- activity bar

  document.querySelector('.activitybar').addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');

    if (act === 'explorer') {
      var hidden = document.body.classList.toggle('no-explorer');
      btn.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    } else if (act === 'run') {
      run();
    } else if (act === 'share' || act === 'reset') {
      document.getElementById('btn-' + act).click();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!quickopen) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key !== 'p' && event.key !== 'P') return;
    event.preventDefault();
    quickopen.focus();
    quickopen.select();
  });

  window.addEventListener('hashchange', openFromHash);

  // ------------------------------------------------------------------- start

  buildList();
  if (!openFromHash() && examples.length) load(examples[0]);
})();
