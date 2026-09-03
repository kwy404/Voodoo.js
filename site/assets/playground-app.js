/**
 * The playground: an editor on the left, the result on the right.
 *
 * The preview is a sandboxed iframe loading the same public CDN build the
 * documentation hands out, so the code in the box is the code that executes.
 * There is no compiler in this loop, which is the property the whole framework
 * is built around.
 */

(function () {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/voodoojs@0.7/dist/voodoo.full.min.js';
  var examples = window.VOODOO_PLAYGROUND_EXAMPLES || [];

  var code = document.getElementById('code');
  var highlight = document.getElementById('highlight');
  var gutter = document.getElementById('gutter');
  var frame = document.getElementById('frame');
  var fileList = document.getElementById('file-list');
  var filetab = document.getElementById('filetab');
  var descEl = document.getElementById('example-desc');
  var statusExample = document.getElementById('status-example');
  var statusLines = document.getElementById('status-lines');

  var current = examples[0];
  var timer = null;

  var GROUP_LABEL = {
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

  function buildList() {
    var seen = {};
    var html = '';
    examples.forEach(function (ex) {
      if (!seen[ex.group]) {
        seen[ex.group] = true;
        html += '<div class="group">' + (GROUP_LABEL[ex.group] || ex.group) + '</div>';
      }
      html +=
        '<button type="button" data-id="' + ex.id + '" aria-current="false">' + ex.title + '</button>';
    });
    fileList.innerHTML = html;
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
   * The preview carries all three theme states itself.
   *
   * An earlier version picked one scheme in the parent and wrote literal colours
   * into the frame. That broke the v-theme-toggle example: the button flipped
   * data-theme inside the iframe and nothing responded, because no rule was
   * keyed on it. Emitting the same three-state shape the library and the site
   * use means the frame follows the system by default, obeys an explicit choice,
   * and lets a sample toggle its own theme.
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
      '@media (prefers-color-scheme: dark){html:root:not([data-theme="light"]){' +
      tokens(DARK, 'dark') + '}}' +
      'html:root[data-theme="dark"]{' + tokens(DARK, 'dark') + '}' +
      'html:root[data-theme="light"]{' + tokens(LIGHT, 'light') + '}' +

      'body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'margin:0;padding:18px;color:var(--pg-ink);background:var(--pg-paper);line-height:1.6}' +
      '*{box-sizing:border-box}' +
      'button{font:inherit;padding:7px 12px;border:1px solid var(--pg-line);border-radius:7px;' +
      'background:var(--pg-surface);color:var(--pg-ink);cursor:pointer;margin:2px 4px 2px 0}' +
      'button:hover{border-color:var(--pg-accent);color:var(--pg-accent)}' +
      'input,select,textarea{font:inherit;padding:7px 9px;border:1px solid var(--pg-line);' +
      'border-radius:7px;margin:2px 0;background:var(--pg-surface);color:var(--pg-ink)}' +
      'h1,h2,h3,h4{margin:0 0 8px;line-height:1.2;color:var(--pg-ink)}' +
      'p,li,td,th,label,span,div{color:inherit}' +
      'ul,ol{padding-left:20px}' +
      'a{color:var(--pg-accent)}' +
      '.pg-error{margin:12px 0 0;padding:10px 12px;border-radius:8px;' +
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
      OPEN + ' src="' + CDN + '" data-manual>' + CLOSE +
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

    var buttons = fileList.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute(
        'aria-current',
        buttons[i].getAttribute('data-id') === ex.id ? 'true' : 'false'
      );
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

  window.addEventListener('hashchange', openFromHash);

  // ------------------------------------------------------------------- start

  buildList();
  if (!openFromHash() && examples.length) load(examples[0]);
})();
