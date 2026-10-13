/**
 * The spell book on the home page: a live split editor written as one custom
 * directive, `v-spellbook`, which is also the page's own demonstration of
 * V.directive.
 *
 *   <div v-spellbook="preset"> ... </div>
 *
 * The bound value is the name of the preset. The tabs above the editor are
 * plain Voodoo (`@click="preset = 'todo'"`), so switching a preset is a state
 * change the directive hears in `updated`. Inside, the left page is a textarea
 * over its own highlighted copy, and the right page is a same-origin frame
 * that loads the site's voodoo.full.min.js and Monsoon, exactly what a reader
 * would put in their own .html file.
 *
 * Loaded after the library (which carries data-manual) and before i18n.js,
 * which calls V.start() once everything is registered.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.V) return;

  // ------------------------------------------------------------- presets

  var PRESETS = {
    counter: {
      file: 'counter.html',
      code: [
        '<!-- State lives in an attribute. JSX lives in braces. -->',
        '<div v-data="{ count: 0 }" class="card card-bordered max-w-sm mx-auto">',
        '  <div class="card-body items-center text-center gap-3">',
        '    <p class="text-sm text-muted-foreground">Spells cast</p>',
        '    <p class="text-6xl font-bold text-primary">{ count }</p>',
        '',
        '    <div class="flex gap-2">',
        '      <button class="btn btn-outline" @click="count--">Undo</button>',
        '      <button class="btn btn-primary" @click="count++">Cast a spell</button>',
        '    </div>',
        '',
        '    { count >= 5',
        '        ? <p class="badge badge-success">Archmage reached</p>',
        '        : <p class="text-sm text-muted-foreground">{ 5 - count } to archmage</p> }',
        '  </div>',
        '</div>'
      ]
    },
    todo: {
      file: 'todo-list.html',
      code: [
        '<div v-data="{ text: \'\', todos: [\'Brew a potion\', \'Feed the cat\'] }"',
        '     class="card card-bordered max-w-sm mx-auto">',
        '  <form class="card-body gap-3" @submit.prevent="todos.push(text); text = \'\'">',
        '    <h2 class="card-title">Spell list</h2>',
        '    <div class="flex gap-2">',
        '      <input class="input flex-1" v-model.trim="text" placeholder="A new spell">',
        '      <button class="btn btn-primary" :disabled="!text">Add</button>',
        '    </div>',
        '',
        '    <ul class="space-y-2">',
        '      {todos.map((todo, i) => (',
        '        <li class="flex items-center justify-between rounded-lg bg-muted px-3 py-2">',
        '          <span>{todo}</span>',
        '          <button type="button" class="btn btn-ghost btn-xs"',
        '                  @click="todos.splice(i, 1)">Done</button>',
        '        </li>',
        '      ))}',
        '    </ul>',
        '    <p class="text-sm text-muted-foreground">{ todos.length } left</p>',
        '  </form>',
        '</div>'
      ]
    },
    fetch: {
      file: 'fetch.html',
      code: [
        '<!-- A request, with its loading and error state, in one attribute. -->',
        '<div v-resource="users: https://jsonplaceholder.typicode.com/users"',
        '     class="card card-bordered max-w-sm mx-auto">',
        '  <div class="card-body gap-3">',
        '    <div class="flex items-center justify-between">',
        '      <h2 class="card-title">The coven</h2>',
        '      <button class="btn btn-outline btn-sm" @click="users.reload()">Reload</button>',
        '    </div>',
        '',
        '    <p v-if="users.loading" class="text-muted-foreground">Summoning...</p>',
        '    <p v-else-if="users.error" class="text-danger">{ users.error.message }</p>',
        '    <ul v-else class="divide-y divide-border">',
        '      <li v-for="u in users.data.slice(0, 5)" :key="u.id" class="py-2">',
        '        <p class="font-medium">{ u.name }</p>',
        '        <p class="text-sm text-muted-foreground">{ u.email.toLowerCase() }</p>',
        '      </li>',
        '    </ul>',
        '  </div>',
        '</div>'
      ]
    },
    form: {
      file: 'form-validation.html',
      code: [
        '<form v-validate v-data="{ email: \'\', pass: \'\', sent: false }"',
        '      class="card card-bordered max-w-sm mx-auto" @submit.prevent="sent = true">',
        '  <div class="card-body gap-3">',
        '    <h2 class="card-title">Join the coven</h2>',
        '    <input class="input" name="email" placeholder="Email"',
        '           v-model="email" v-required v-email>',
        '    <input class="input" name="pass" type="password" placeholder="Password"',
        '           v-model="pass" v-required v-minlength="8">',
        '    <progress class="progress" max="8" :value="pass.length"',
        '              :class="pass.length >= 8 ? \'progress-success\' : \'progress-warning\'"></progress>',
        '    <button class="btn btn-primary"',
        '            :disabled="!email.includes(\'@\') || pass.length < 8">Create account</button>',
        '',
        '    { sent ? <p class="callout callout-success">Welcome, { email }!</p> : null }',
        '  </div>',
        '</form>'
      ]
    },
    theme: {
      file: 'theme-toggle.html',
      code: [
        '<!-- One attribute re-themes the card: Monsoon reads data-theme. -->',
        '<section v-data="{ dark: true }" :data-theme="dark ? \'dark\' : \'light\'"',
        '         class="card card-bordered max-w-sm mx-auto">',
        '  <div class="card-body gap-4">',
        '    <div class="flex items-center justify-between gap-4">',
        '      <h2 class="card-title">{ dark ? \'Midnight\' : \'Daylight\' } mode</h2>',
        '      <input type="checkbox" class="toggle" v-model="dark" aria-label="Dark mode">',
        '    </div>',
        '    <p class="text-muted-foreground">',
        '      The toggle writes state, the state writes one attribute.',
        '    </p>',
        '    <div class="flex gap-2">',
        '      <span class="badge badge-primary">v-model</span>',
        '      <span class="badge badge-accent">:data-theme</span>',
        '    </div>',
        '  </div>',
        '</section>'
      ]
    }
  };

  // --------------------------------------------------------- highlighting

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var KEYWORDS = /^(const|let|var|return|if|else|true|false|null|undefined|new|function|async|await|of|in)$/;

  /**
   * A small single-pass highlighter for HTML with JSX in braces, in the VS
   * Code Light+ and Dark+ colours. It only has to be right enough to read
   * while typing; the samples elsewhere on the site are coloured by Shiki.
   */
  function highlight(src) {
    var out = '';
    var i = 0;
    var inTag = false;
    var depth = 0;
    var n = src.length;
    while (i < n) {
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
    // A trailing newline needs a character after it, or the copy is one line
    // shorter than the textarea and the two drift apart at the bottom.
    return out + '\n';
  }

  // ------------------------------------------------------------- the frame

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

  function frameDocument(code) {
    var close = '</' + 'script>';
    return (
      '<!doctype html><html lang="en" data-theme="' + pageTheme() + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<link rel="stylesheet" href="' + monsoonHref() + '">' +
      '<style>:root,[data-theme]{--seed:oklch(0.53 0.25 288);--accent:oklch(0.8 0.15 68)}' +
      'body{min-height:100vh;padding:28px 20px;display:grid;align-content:center}</style>' +
      '<script>addEventListener("error",function(e){parent.postMessage({spell:"error",message:String(e.message||e)},"*")});' +
      'addEventListener("unhandledrejection",function(e){parent.postMessage({spell:"error",message:String(e.reason&&e.reason.message||e.reason)},"*")});' +
      close +
      '</head><body class="bg-background text-foreground antialiased">' +
      code +
      '<script src="' + LIB + '">' + close +
      '</body></html>'
    );
  }

  // -------------------------------------------------------------- sparkles

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPRITE = new URL('assets/art/icons.svg#i-sparkle', document.baseURI).href;

  function sparkle(from, to) {
    if (reduced || !from || !to) return;
    var a = from.getBoundingClientRect();
    var b = to.getBoundingClientRect();
    var x = a.left + a.width / 2;
    var y = a.top + a.height / 2;
    var tx = b.left + b.width / 2;
    var ty = b.top + Math.min(b.height / 2, 160);
    for (var k = 0; k < 16; k++) {
      var s = document.createElement('span');
      s.className = 'vd-sparkle';
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<svg width="18" height="18"><use href="' + SPRITE + '"></use></svg>';
      var spread = (k / 15 - 0.5) * 2;
      var dx = (tx - x) * (0.35 + Math.random() * 0.7) + spread * 60;
      var dy = (ty - y) * (0.35 + Math.random() * 0.7) - 40 - Math.random() * 80;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', dx.toFixed(0) + 'px');
      s.style.setProperty('--dy', dy.toFixed(0) + 'px');
      s.style.setProperty('--s', (0.6 + Math.random() * 0.9).toFixed(2));
      s.style.animationDelay = (k * 18) + 'ms';
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 1300);
    }
  }

  // ------------------------------------------------------------ directive

  function mount(el, name) {
    var src = el.querySelector('[data-src]');
    var hl = el.querySelector('[data-hl]');
    var gutter = el.querySelector('[data-gutter]');
    var frame = el.querySelector('[data-frame]');
    var stage = el.querySelector('[data-stage]');
    var loading = el.querySelector('[data-loading]');
    var file = el.querySelector('[data-file]');
    var url = el.querySelector('[data-url]');
    var error = el.querySelector('[data-error]');
    var errorText = el.querySelector('[data-error-text]');
    var runButton = el.querySelector('[data-run]');
    var resetButton = el.querySelector('[data-reset]');
    var timer = 0;
    var current = name;

    function paint() {
      hl.innerHTML = highlight(src.value);
      var lines = src.value.split('\n').length;
      var nums = '';
      for (var i = 1; i <= lines; i++) nums += i + '\n';
      gutter.textContent = nums;
      syncScroll();
    }

    function syncScroll() {
      hl.scrollTop = src.scrollTop;
      hl.scrollLeft = src.scrollLeft;
      gutter.scrollTop = src.scrollTop;
    }

    function run(cast) {
      error.hidden = true;
      loading.classList.remove('is-done');
      frame.srcdoc = frameDocument(src.value);
      if (cast) {
        sparkle(runButton, stage);
        stage.classList.remove('vd-cast');
        void stage.offsetWidth;
        stage.classList.add('vd-cast');
        document.querySelectorAll('[data-vudu]').forEach(function (v) {
          v.classList.remove('vd-hop', 'vd-float');
          void v.offsetWidth;
          v.classList.add('vd-hop');
          setTimeout(function () {
            v.classList.remove('vd-hop');
            v.classList.add('vd-float');
          }, 700);
        });
      }
    }

    function load(preset, cast) {
      var p = PRESETS[preset] || PRESETS.counter;
      current = preset;
      src.value = p.code.join('\n');
      file.textContent = p.file;
      url.textContent = p.file;
      src.scrollTop = 0;
      paint();
      run(cast);
    }

    frame.addEventListener('load', function () {
      loading.classList.add('is-done');
    });

    window.addEventListener('message', function (event) {
      if (event.source !== frame.contentWindow || !event.data || event.data.spell !== 'error') return;
      errorText.textContent = event.data.message;
      error.hidden = false;
    });

    src.addEventListener('input', function () {
      paint();
      clearTimeout(timer);
      timer = setTimeout(function () {
        run(false);
      }, 450);
    });
    src.addEventListener('scroll', syncScroll);
    src.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        clearTimeout(timer);
        run(true);
        return;
      }
      // Tab indents instead of leaving the editor; Escape then Tab leaves it.
      if (event.key === 'Tab' && !event.shiftKey && !src.dataset.escaped) {
        event.preventDefault();
        var start = src.selectionStart;
        src.setRangeText('  ', start, src.selectionEnd, 'end');
        src.dispatchEvent(new Event('input'));
      }
      src.dataset.escaped = event.key === 'Escape' ? '1' : '';
    });

    runButton.addEventListener('click', function () {
      clearTimeout(timer);
      run(true);
    });
    resetButton.addEventListener('click', function () {
      load(current, true);
    });

    // The result follows the page theme, so a reader on a dark page is not
    // handed a white frame.
    new MutationObserver(function () {
      run(false);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        run(false);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    el.__spellbook = { load: load };
    load(name, false);
  }

  V.directive('spellbook', {
    mounted: function (el, binding) {
      mount(el, binding.value || 'counter');
    },
    updated: function (el, binding) {
      if (el.__spellbook && binding.value !== binding.oldValue) el.__spellbook.load(binding.value, true);
    }
  });

  // The counts come from the running library rather than from a number typed
  // here, so they cannot drift from the release.
  V.data({
    directiveCount: V.directives && V.directives.size ? V.directives.size : 90,
    componentCount: V.components && V.components.size ? V.components.size : 29
  });
})();
