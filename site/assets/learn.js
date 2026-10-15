/**
 * The ten minute lesson: eight steps, each with a short explanation, a task,
 * a live editor and a check that runs against the rendered result.
 *
 * Plain script on purpose. The lesson text is full of braces that are code,
 * so the whole section carries v-ignore and this file writes it. The text
 * comes from V.t inside V.effect, so switching the language in the header
 * rewrites the open step without touching the code being edited.
 *
 * The result frame is same-origin srcdoc, like the spell book on the home
 * page, so a check can read the rendered document directly. It only ever
 * runs code the visitor typed into this page.
 *
 * Loaded after the library (which carries data-manual) and learn-i18n.js,
 * and before i18n.js, which registers the dictionaries and calls V.start().
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.V) return;

  // ---------------------------------------------------------------- steps

  /**
   * Each check receives the frame document and the source. It is lenient on
   * purpose: any reasonable way of doing the task passes, and a check never
   * looks for one exact spelling of the answer.
   */
  function text(doc, sel) {
    var el = doc.querySelector(sel);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function count(doc, sel) {
    return doc.querySelectorAll(sel).length;
  }

  var STEPS = [
    {
      id: 's1',
      file: 'hello.html',
      code: [
        '<div v-data="{ name: \'Vudu\' }">',
        '  <h1>Hello, { name }!</h1>',
        '  <p>Welcome to Voodoo.</p>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ name: \'Ana\' }">',
        '  <h1>Hello, { name }!</h1>',
        '  <p>Welcome to Voodoo.</p>',
        '</div>'
      ],
      check: function (doc, src) {
        var h = text(doc, 'h1');
        return /\{\s*name\s*\}/.test(src) && /^Hello, .+!$/.test(h) && h !== 'Hello, Vudu!' && h.indexOf('{') === -1;
      }
    },
    {
      id: 's2',
      file: 'braces.html',
      code: [
        '<div v-data="{ name: \'Vudu\', potions: 3 }">',
        '  <h1>Hello, { name.toUpperCase() }!</h1>',
        '  <p>{ potions } potions cost { potions * 4 } coins.</p>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ name: \'Vudu\', potions: 3 }">',
        '  <h1>Hello, { name.toUpperCase() }!</h1>',
        '  <p>{ potions } potions cost { potions * 4 } coins.</p>',
        '  <p>{ name.length } letters</p>',
        '</div>'
      ],
      check: function (doc, src) {
        return /\{[^{}]*name\.length[^{}]*\}/.test(src) && doc.body.textContent.indexOf('name.length') === -1;
      }
    },
    {
      id: 's3',
      file: 'click.html',
      code: [
        '<div v-data="{ count: 0 }">',
        '  <p>Spells cast: { count }</p>',
        '  <button @click="count++">Cast a spell</button>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ count: 0 }">',
        '  <p>Spells cast: { count }</p>',
        '  <button @click="count++">Cast a spell</button>',
        '  <button @click="count = 0">Reset</button>',
        '</div>'
      ],
      check: function (doc, src) {
        return count(doc, 'button') >= 2 && /(@click|v-on:click)\s*=\s*["']\s*count\s*=\s*0\s*;?\s*["']/.test(src);
      }
    },
    {
      id: 's4',
      file: 'model.html',
      code: [
        '<div v-data="{ spell: \'\' }">',
        '  <input v-model="spell" placeholder="Type a spell">',
        '  <p>You typed: { spell }</p>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ spell: \'\' }">',
        '  <input v-model="spell" placeholder="Type a spell">',
        '  <p>You typed: { spell }</p>',
        '  <p>{ spell.length } characters</p>',
        '</div>'
      ],
      check: function (doc, src) {
        return /\{[^{}]*spell\.length[^{}]*\}/.test(src) && count(doc, 'input') >= 1;
      }
    },
    {
      id: 's5',
      file: 'chest.html',
      code: [
        '<div v-data="{ open: false }">',
        '  <button @click="open = !open">Open the chest</button>',
        '  <p v-if="open">You found 100 coins!</p>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ open: false }">',
        '  <button @click="open = !open">Open the chest</button>',
        '  <p v-if="open">You found 100 coins!</p>',
        '  <p v-else>The chest is closed.</p>',
        '</div>'
      ],
      check: function (doc, src) {
        return /\sv-else[\s>=]/.test(src) && count(doc, 'p') >= 1;
      }
    },
    {
      id: 's6',
      file: 'potions.html',
      code: [
        '<div v-data="{ potions: [\'Sleep\', \'Speed\', \'Luck\'] }">',
        '  <ul>',
        '    <li v-for="p in potions">{ p }</li>',
        '  </ul>',
        '  <button @click="potions.push(\'Mystery\')">Brew one more</button>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\'] }">',
        '  <ul>',
        '    <li v-for="p in potions">{ p }</li>',
        '  </ul>',
        '  <button @click="potions.push(\'Mystery\')">Brew one more</button>',
        '</div>'
      ],
      check: function (doc, src) {
        // Four items written in the array itself, not four clicks on the button.
        var m = /potions\s*:\s*\[([^\]]*)\]/.exec(src);
        var items = m ? m[1].split(',').filter(function (s) { return s.trim(); }).length : 0;
        return items >= 4 && count(doc, 'li') >= 4;
      }
    },
    {
      id: 's7',
      file: 'jsx.html',
      code: [
        '<div v-data="{ potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\'] }">',
        '  <ul>',
        '    { potions.map(p => <li>{ p }</li>) }',
        '  </ul>',
        '</div>'
      ],
      answer: [
        '<div v-data="{ potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\'] }">',
        '  <ul>',
        '    { potions.filter(p => p.length > 4).map(p => <li>{ p }</li>) }',
        '  </ul>',
        '</div>'
      ],
      check: function (doc, src) {
        var n = count(doc, 'li');
        return /\.filter\s*\(/.test(src) && n >= 1 && n < 4;
      }
    },
    {
      id: 's8',
      file: 'fetch.html',
      code: [
        '<div v-resource="users: https://jsonplaceholder.typicode.com/users">',
        '  <p v-if="users.loading">Loading...</p>',
        '  <p v-else-if="users.error">{ users.error.message }</p>',
        '  <ul v-else>',
        '    <li v-for="u in users.data">{ u.name }</li>',
        '  </ul>',
        '</div>'
      ],
      answer: [
        '<div v-resource="users: https://jsonplaceholder.typicode.com/users">',
        '  <p v-if="users.loading">Loading...</p>',
        '  <p v-else-if="users.error">{ users.error.message }</p>',
        '  <ul v-else>',
        '    <li v-for="u in users.data.slice(0, 3)">{ u.name }</li>',
        '  </ul>',
        '</div>'
      ],
      check: function (doc, src) {
        // Offline, the request fails; the code is still right, so the source
        // alone decides once the error is on the page.
        var right = /\.slice\s*\(\s*0\s*,\s*3\s*\)/.test(src);
        return right && (count(doc, 'li') === 3 || (count(doc, 'li') === 0 && !!text(doc, 'p') && text(doc, 'p') !== 'Loading...'));
      }
    }
  ];

  var TOTAL = STEPS.length;

  // ---------------------------------------------------------- persistence

  var KEY = 'voodoo:learn';
  var saved = { step: 0, done: {}, code: {} };

  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      saved.step = Math.min(Math.max(0, raw.step | 0), TOTAL);
      saved.done = raw.done && typeof raw.done === 'object' ? raw.done : {};
      saved.code = raw.code && typeof raw.code === 'object' ? raw.code : {};
    }
  } catch (err) {
    /* private mode or a damaged value: start fresh */
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch (err) {
      /* storage unavailable: the lesson still works, it just will not resume */
    }
  }

  // --------------------------------------------------------- highlighting

  // The same small single-pass highlighter as the spell book on the home page.
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var KEYWORDS = /^(const|let|var|return|if|else|true|false|null|undefined|new|function|async|await|of|in)$/;

  function highlight(src) {
    var out = '';
    var i = 0;
    var inTag = false;
    var depth = 0;
    while (i < src.length) {
      var rest = src.slice(i);
      var m;
      if ((m = /^<!--[\s\S]*?(-->|$)/.exec(rest))) {
        out += '<span class="tk-c">' + esc(m[0]) + '</span>';
      } else if ((m = /^<\/?[A-Za-z][\w.-]*/.exec(rest))) {
        out += '<span class="tk-p">' + esc(m[0].charAt(1) === '/' ? '</' : '<') + '</span>';
        out += '<span class="tk-t">' + esc(m[0].replace(/^<\/?/, '')) + '</span>';
        inTag = true;
      } else if (inTag && (m = /^\/?>/.exec(rest))) {
        out += '<span class="tk-p">' + esc(m[0]) + '</span>';
        inTag = false;
      } else if (inTag && (m = /^[@:]?[A-Za-z_][\w:.-]*/.exec(rest))) {
        out += '<span class="tk-a">' + esc(m[0]) + '</span>';
      } else if ((inTag || depth > 0) && (m = /^("[^"\n]*"?|'[^'\n]*'?|`[^`]*`?)/.exec(rest))) {
        out += '<span class="tk-s">' + esc(m[0]) + '</span>';
      } else if ((m = /^[{}]/.exec(rest))) {
        depth = Math.max(0, depth + (m[0] === '{' ? 1 : -1));
        out += '<span class="tk-b">' + m[0] + '</span>';
      } else if (depth > 0 && (m = /^\d+(\.\d+)?/.exec(rest))) {
        out += '<span class="tk-n">' + m[0] + '</span>';
      } else if (depth > 0 && (m = /^[A-Za-z_$][\w$]*/.exec(rest)) && KEYWORDS.test(m[0])) {
        out += '<span class="tk-k">' + m[0] + '</span>';
      } else if ((m = /^[A-Za-z_$][\w$]*|^\s+/.exec(rest))) {
        out += esc(m[0]);
      } else {
        m = [rest.charAt(0)];
        out += esc(m[0]);
      }
      i += m[0].length;
    }
    return out + '\n';
  }

  // ------------------------------------------------------------ the frame

  var LIB = new URL('voodoo.full.min.js', document.baseURI).href;

  function monsoonHref() {
    var link = document.querySelector('link[rel="stylesheet"][href*="monsoon"]');
    return link ? link.href : '';
  }

  function pageTheme() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set === 'light' || set === 'dark') return set;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * The lesson code is bare HTML with no classes, so the frame gives plain
   * tags friendly defaults back after Monsoon's reset.
   */
  var FRAME_CSS =
    ':root,[data-theme]{--seed:oklch(0.53 0.25 288);--accent:oklch(0.8 0.15 68)}' +
    'body{min-height:100vh;margin:0;padding:28px 24px;font:16px/1.6 var(--font-sans)}' +
    'h1{font-size:1.9rem;line-height:1.2;font-weight:700;margin:0 0 .5rem;letter-spacing:-.01em}' +
    'p{margin:0 0 .6rem}' +
    'ul{list-style:disc;padding-left:1.4rem;margin:0 0 .8rem}li{margin:.2rem 0}' +
    'button{padding:.45rem .9rem;margin:.2rem .4rem .2rem 0;border-radius:.6rem;border:1px solid var(--primary);' +
    'background:var(--primary);color:var(--primary-foreground);font-weight:600;cursor:pointer;transition:transform .15s}' +
    'button+button{background:transparent;color:var(--primary)}' +
    'button:active{transform:scale(.96)}' +
    'input{display:block;width:100%;max-width:22rem;padding:.5rem .7rem;margin:0 0 .8rem;border:1px solid var(--border);' +
    'border-radius:.6rem;background:var(--surface);color:var(--foreground)}' +
    'input:focus{outline:2px solid var(--ring);outline-offset:1px}';

  function frameDocument(code) {
    var close = '</' + 'script>';
    return (
      '<!doctype html><html lang="en" data-theme="' + pageTheme() + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<link rel="stylesheet" href="' + monsoonHref() + '">' +
      '<style>' + FRAME_CSS + '</style>' +
      '<script>addEventListener("error",function(e){parent.postMessage({lesson:"error",message:String(e.message||e)},"*")});' +
      'addEventListener("unhandledrejection",function(e){parent.postMessage({lesson:"error",message:String(e.reason&&e.reason.message||e.reason)},"*")});' +
      'var ce=console.error;console.error=function(a,b){ce.apply(console,arguments);if(typeof a==="string"&&a.indexOf("[Voodoo]")===0)' +
      'parent.postMessage({lesson:"error",message:a.replace(/^\\[Voodoo\\]\\s*/,"")+(b&&b.message?" "+b.message:"")},"*")};' +
      close +
      '</head><body class="bg-background text-foreground antialiased">' +
      code +
      '<script src="' + LIB + '">' + close +
      '</body></html>'
    );
  }

  // -------------------------------------------------------------- motion

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPRITE = new URL('assets/art/icons.svg#i-sparkle', document.baseURI).href;

  /** A short burst of sparkles out of an element, for a solved task. */
  function burst(from) {
    if (reduced || !from) return;
    var a = from.getBoundingClientRect();
    var x = a.left + 26;
    var y = a.top + a.height / 2;
    for (var k = 0; k < 14; k++) {
      var s = document.createElement('span');
      s.className = 'vd-sparkle';
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<svg width="18" height="18"><use href="' + SPRITE + '"></use></svg>';
      var angle = (k / 14) * Math.PI * 2;
      var dist = 50 + Math.random() * 60;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      s.style.setProperty('--dy', (Math.sin(angle) * dist - 20).toFixed(0) + 'px');
      s.style.setProperty('--s', (0.6 + Math.random() * 0.8).toFixed(2));
      s.style.animationDelay = k * 14 + 'ms';
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 1200);
    }
  }

  /** Restarts a CSS animation class on an element. */
  function replay(el, cls) {
    if (reduced || !el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ------------------------------------------------------------- the page

  function start() {
    var q = function (sel) {
      return document.querySelector(sel);
    };
    var lesson = q('[data-lesson]');
    if (!lesson) return;

    var card = q('[data-card]');
    var stepLabel = q('[data-step-label]');
    var titleEl = q('[data-title]');
    var bodyEl = q('[data-body]');
    var taskBox = q('[data-task-box]');
    var taskLabel = q('[data-task-label]');
    var taskEl = q('[data-task]');
    var statusEl = q('[data-status]');
    var hintBtn = q('[data-hint-btn]');
    var hintEl = q('[data-hint]');
    var answerBtn = q('[data-answer]');
    var resetBtn = q('[data-reset]');
    var backBtn = q('[data-back]');
    var nextBtn = q('[data-next]');
    var src = q('[data-src]');
    var hl = q('[data-hl]');
    var gutter = q('[data-gutter]');
    var frame = q('[data-frame]');
    var stage = q('[data-stage]');
    var fileEl = q('[data-file]');
    var urlEl = q('[data-url]');
    var errorEl = q('[data-error]');
    var errorText = q('[data-error-text]');
    var dots = q('[data-dots]');
    var fill = q('[data-fill]');
    var end = q('[data-end]');
    var recap = q('[data-recap]');
    var vudu = q('[data-vudu]');

    var current = saved.step;
    var passed = false;
    var timer = 0;
    var poll = 0;
    var hintOpen = false;

    var t = function (key, params) {
      return V.t(key, params);
    };

    // A step can be opened straight from the address: learn.html#step-3.
    var fromHash = /^#step-(\d+)$/.exec(location.hash);
    if (fromHash) current = Math.min(Math.max(0, (fromHash[1] | 0) - 1), TOTAL - 1);
    else if (location.hash === '#done') current = TOTAL;

    // ---------------------------------------------------------- the dots

    for (var i = 0; i < TOTAL; i++) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ln-dot';
      b.setAttribute('data-go', String(i));
      b.innerHTML = '<span>' + (i + 1) + '</span>' +
        '<svg class="vd-icon" aria-hidden="true"><use href="assets/art/icons.svg#i-check"></use></svg>';
      li.appendChild(b);
      dots.appendChild(li);
    }

    function paintDots() {
      var all = dots.querySelectorAll('.ln-dot');
      for (var k = 0; k < all.length; k++) {
        var step = STEPS[k];
        all[k].classList.toggle('is-done', !!saved.done[step.id]);
        if (k === current) all[k].setAttribute('aria-current', 'step');
        else all[k].removeAttribute('aria-current');
      }
      var doneCount = Object.keys(saved.done).filter(function (id) {
        return saved.done[id];
      }).length;
      // The bar runs from the first dot to the last, so it ends on a dot.
      var reached = current >= TOTAL ? TOTAL : Math.max(current + 1, doneCount);
      fill.style.transform = 'scaleX(' + Math.max(0, (reached - 1) / (TOTAL - 1)) + ')';
    }

    // ------------------------------------------------------------ editor

    function paint() {
      hl.innerHTML = highlight(src.value);
      var lines = src.value.split('\n').length;
      var nums = '';
      for (var k = 1; k <= lines; k++) nums += k + '\n';
      gutter.textContent = nums;
      syncScroll();
    }

    function syncScroll() {
      hl.scrollTop = src.scrollTop;
      hl.scrollLeft = src.scrollLeft;
      gutter.scrollTop = src.scrollTop;
    }

    function run() {
      errorEl.hidden = true;
      clearInterval(poll);
      frame.srcdoc = frameDocument(src.value);
    }

    // ------------------------------------------------------------- checks

    function check() {
      var step = STEPS[current];
      if (!step) return;
      var doc;
      try {
        doc = frame.contentDocument;
      } catch (err) {
        return;
      }
      if (!doc || !doc.body) return;
      var ok = false;
      try {
        ok = !!step.check(doc, src.value);
      } catch (err) {
        ok = false;
      }
      setPassed(ok, true);
    }

    function setPassed(ok, celebrate) {
      var was = passed;
      passed = ok;
      taskBox.setAttribute('data-state', ok ? 'passed' : 'waiting');
      nextBtn.className = ok ? 'btn btn-primary ln-next-ready' : 'btn btn-ghost';
      if (ok && !was && celebrate) {
        clearInterval(poll);
        var step = STEPS[current];
        var first = !saved.done[step.id];
        saved.done[step.id] = true;
        persist();
        paintDots();
        replay(taskBox, 'ln-pop');
        if (first) {
          burst(taskBox);
          cheer();
        }
      }
      texts();
    }

    function cheer() {
      if (!vudu) return;
      vudu.src = 'assets/brand/vudu/vudu-happy.svg';
      replay(vudu, 'vd-hop');
      clearTimeout(cheer.timer);
      cheer.timer = setTimeout(function () {
        vudu.src = 'assets/brand/vudu/vudu-wave.svg';
      }, 2400);
    }

    frame.addEventListener('load', function () {
      // The library starts on DOMContentLoaded inside the frame; one frame
      // later the first render is on the page and the check can read it.
      setTimeout(check, 80);
      // A request settles later than the load event, so the last step keeps
      // looking for a few seconds.
      var tries = 0;
      clearInterval(poll);
      poll = setInterval(function () {
        if (passed || ++tries > 12) return clearInterval(poll);
        check();
      }, 500);
    });

    window.addEventListener('message', function (event) {
      if (event.source !== frame.contentWindow || !event.data || event.data.lesson !== 'error') return;
      errorText.textContent = event.data.message;
      errorEl.title = event.data.message;
      errorEl.hidden = false;
    });

    // -------------------------------------------------------------- texts

    /** Every translated string on the lesson. Runs again on a language change. */
    function texts() {
      var total = TOTAL;
      if (current < TOTAL) {
        var step = STEPS[current];
        var base = 'learn.' + step.id;
        stepLabel.textContent = t('learn.ui.step', { n: current + 1, total: total });
        titleEl.textContent = t(base + '.title');
        bodyEl.innerHTML = '<p>' + t(base + '.body') + '</p>';
        taskEl.innerHTML = t(base + '.task');
        hintEl.innerHTML = '<p>' + t(base + '.hint') + '</p>';
      }
      taskLabel.textContent = t('learn.ui.task');
      statusEl.textContent = passed ? t('learn.ui.passed') : t('learn.ui.waiting');
      q('[data-hint-label]').textContent = t('learn.ui.hint');
      q('[data-answer-label]').textContent = t('learn.ui.answer');
      q('[data-reset-label]').textContent = t('learn.ui.reset');
      q('[data-back-label]').textContent = t('learn.ui.back');
      q('[data-next-label]').textContent =
        current === TOTAL - 1 ? t('learn.ui.finish') : passed ? t('learn.ui.next') : t('learn.ui.skip');
      q('[data-live]').textContent = t('learn.ui.live');
      src.setAttribute('aria-label', t('learn.ui.editor'));
      frame.setAttribute('title', t('learn.ui.frame'));
      q('[data-track]').setAttribute('aria-label', t('learn.ui.progress'));

      var all = dots.querySelectorAll('.ln-dot');
      for (var k = 0; k < all.length; k++) {
        var label = t('learn.ui.jump', { n: k + 1, title: t('learn.' + STEPS[k].id + '.title') });
        all[k].setAttribute('aria-label', label);
        all[k].title = label;
      }

      q('[data-end-kicker]').textContent = t('learn.end.kicker');
      q('[data-end-title]').textContent = t('learn.end.title');
      q('[data-end-lead]').textContent = t('learn.end.lead');
      q('[data-end-next]').textContent = t('learn.end.next');
      q('[data-end-play]').textContent = t('learn.end.play');
      q('[data-end-docs]').textContent = t('learn.end.docs');
      q('[data-end-examples]').textContent = t('learn.end.examples');
      q('[data-restart]').textContent = t('learn.end.restart');
      var done = STEPS.filter(function (s) {
        return saved.done[s.id];
      }).length;
      q('[data-end-score]').textContent = t('learn.end.score', { n: done, total: total });
      recap.innerHTML = '';
      STEPS.forEach(function (s, k) {
        var item = document.createElement('li');
        item.className = saved.done[s.id] ? 'is-done' : '';
        item.style.setProperty('--i', String(k));
        var go = document.createElement('button');
        go.type = 'button';
        go.setAttribute('data-go', String(k));
        go.innerHTML =
          '<svg class="vd-icon" aria-hidden="true"><use href="assets/art/icons.svg#i-' +
          (saved.done[s.id] ? 'check' : 'arrow') + '"></use></svg>';
        var span = document.createElement('span');
        span.textContent = t('learn.' + s.id + '.title');
        go.appendChild(span);
        item.appendChild(go);
        recap.appendChild(item);
      });
    }

    // ------------------------------------------------------------ showing

    function show(index, animate) {
      clearTimeout(timer);
      clearInterval(poll);
      current = Math.min(Math.max(0, index), TOTAL);
      saved.step = current;
      persist();
      hintOpen = false;
      hintEl.hidden = true;
      hintBtn.setAttribute('aria-expanded', 'false');
      history.replaceState(null, '', current >= TOTAL ? '#done' : '#step-' + (current + 1));

      if (current >= TOTAL) {
        lesson.hidden = true;
        end.hidden = false;
        passed = false;
        texts();
        paintDots();
        replay(end, 'ln-enter');
        if (animate) burst(q('.ln-end-vudu'));
        return;
      }

      lesson.hidden = false;
      end.hidden = true;
      var step = STEPS[current];
      src.value = typeof saved.code[step.id] === 'string' ? saved.code[step.id] : step.code.join('\n');
      src.scrollTop = 0;
      fileEl.textContent = step.file;
      urlEl.textContent = step.file;
      backBtn.disabled = current === 0;
      passed = false;
      taskBox.setAttribute('data-state', 'waiting');
      nextBtn.className = 'btn btn-ghost';
      paint();
      texts();
      paintDots();
      run();
      if (animate) replay(card, 'ln-enter');
    }

    function edited() {
      var step = STEPS[current];
      if (!step) return;
      saved.code[step.id] = src.value;
      persist();
      paint();
      clearTimeout(timer);
      timer = setTimeout(run, 380);
    }

    // ------------------------------------------------------------- wiring

    src.addEventListener('input', edited);
    src.addEventListener('scroll', syncScroll);
    src.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        clearTimeout(timer);
        run();
        return;
      }
      // Tab indents instead of leaving the editor; Escape then Tab leaves it.
      if (event.key === 'Tab' && !event.shiftKey && !src.dataset.escaped) {
        event.preventDefault();
        src.setRangeText('  ', src.selectionStart, src.selectionEnd, 'end');
        edited();
      }
      src.dataset.escaped = event.key === 'Escape' ? '1' : '';
    });

    hintBtn.addEventListener('click', function () {
      hintOpen = !hintOpen;
      hintEl.hidden = !hintOpen;
      hintBtn.setAttribute('aria-expanded', hintOpen ? 'true' : 'false');
      if (hintOpen) replay(hintEl, 'ln-enter');
    });

    answerBtn.addEventListener('click', function () {
      var step = STEPS[current];
      if (!step) return;
      src.value = step.answer.join('\n');
      edited();
      clearTimeout(timer);
      run();
      replay(q('.ln-pane-code'), 'ln-flash');
    });

    resetBtn.addEventListener('click', function () {
      var step = STEPS[current];
      if (!step) return;
      delete saved.code[step.id];
      persist();
      src.value = step.code.join('\n');
      paint();
      setPassed(false, false);
      run();
    });

    backBtn.addEventListener('click', function () {
      show(current - 1, true);
    });

    nextBtn.addEventListener('click', function () {
      show(current + 1, true);
      if (current < TOTAL) card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    });

    document.addEventListener('click', function (event) {
      var go = event.target.closest && event.target.closest('[data-go]');
      if (!go) return;
      show(Number(go.getAttribute('data-go')), true);
    });

    q('[data-restart]').addEventListener('click', function () {
      saved = { step: 0, done: {}, code: {} };
      persist();
      show(0, true);
    });

    // The result follows the page theme.
    new MutationObserver(function () {
      if (current < TOTAL) run();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Text follows the language: V.t reads the reactive locale, so this
    // effect runs again whenever the picker in the header changes it.
    if (typeof V.effect === 'function') V.effect(texts);

    show(current, false);
  }

  // Deferred scripts all run before DOMContentLoaded, so by then i18n.js has
  // registered the dictionaries and the first text is already translated.
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
