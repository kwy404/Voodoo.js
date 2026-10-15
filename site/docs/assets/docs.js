/* ==========================================================================
   Voodoo.js documentation
   The shell around every page: header, sidebar, search dialog, on-this-page
   index, code frames, live examples, previous and next, footer. Built on
   Monsoon classes, with docs.css for the few things Monsoon cannot express.

   Each page is a static file holding one <article class="doc-artigo">. This
   script lifts the article out, empties the body and rebuilds the page around
   it. Code samples arrive already coloured by Shiki (pre[data-shiki], see
   scripts/highlight-site.mjs), so nothing here highlights code.

   The theme is the one the whole site shares with `V.theme`: the key
   `voodoo:theme` and the `data-theme` attribute, with `light`, `dark` and
   `system`. Identifiers stay in Portuguese while everything a reader sees is
   English.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // 1. Page map. The single source of truth for the navigation.
  //
  //    The ids are the file names on disk and stay in Portuguese; the titles
  //    are what a reader sees, so they are English. scripts/docs-index.mjs
  //    reads the id and titulo pairs below straight from this file, so keep
  //    each page on one line, id first and titulo second.
  // ------------------------------------------------------------------------

  var NAVEGACAO = [
    {
      titulo: 'Getting started',
      icone: 'wand',
      resumo: 'What the library is, how to load it and the two ways of writing an app.',
      paginas: [
        { id: '', titulo: 'Documentation', curto: 'Home' },
        { id: 'guia/o-que-e', titulo: 'What Voodoo.js is and when to use it' },
        { id: 'guia/instalacao', titulo: 'Installation and your first file' },
        { id: 'guia/modo-aplicacao', titulo: 'The two modes: attributes and createApp' }
      ]
    },
    {
      titulo: 'Fundamentals',
      icone: 'book',
      resumo: 'State, interpolation, conditions, lists, JSX, hooks and events.',
      paginas: [
        { id: 'guia/estado-e-escopo', titulo: 'State and scope with v-data' },
        { id: 'guia/mostrando-valores', titulo: 'Showing values on screen' },
        { id: 'guia/condicionais', titulo: 'Conditionals' },
        { id: 'guia/listas', titulo: 'Lists, and why the key matters' },
        { id: 'guia/jsx', titulo: 'JSX in plain HTML' },
        { id: 'guia/hooks', titulo: 'Hooks' },
        { id: 'guia/eventos', titulo: 'Events and modifiers' },
        { id: 'guia/campos-e-v-model', titulo: 'Form fields with v-model' },
        { id: 'guia/atributos-classes-estilos', titulo: 'Attributes, classes and styles' }
      ]
    },
    {
      titulo: 'Data and forms',
      icone: 'potion',
      resumo: 'Talking to a server, validating forms and masking what people type.',
      paginas: [
        { id: 'guia/buscando-dados', titulo: 'Fetching data from a server' },
        { id: 'guia/formularios', titulo: 'Forms that validate and submit themselves' },
        { id: 'guia/mascaras', titulo: 'Input masks' }
      ]
    },
    {
      titulo: 'Components and state',
      icone: 'cauldron',
      resumo: 'Your own components, the built-in ones and state shared across the page.',
      paginas: [
        { id: 'guia/componentes', titulo: 'Components: props, slots, events and lifecycle' },
        { id: 'guia/componentes-prontos', titulo: 'Built-in components' },
        { id: 'guia/stores', titulo: 'Global state with stores' },
        { id: 'guia/estado-persistente', titulo: 'State that persists, syncs and undoes' }
      ]
    },
    {
      titulo: 'Interface and effects',
      icone: 'sparkle',
      resumo: 'Dialogs, motion, sound, charts, routing, languages and themes.',
      paginas: [
        { id: 'guia/interface', titulo: 'Modal, tabs, menu, drawer, drag and drop' },
        { id: 'guia/animacoes', titulo: 'Animations' },
        { id: 'guia/som', titulo: 'Sound' },
        { id: 'guia/graficos', titulo: 'Charts' },
        { id: 'guia/roteador', titulo: 'Router' },
        { id: 'guia/idiomas', titulo: 'Languages' },
        { id: 'guia/tema-e-paleta', titulo: 'Theme and palette' }
      ]
    },
    {
      titulo: 'Extending and debugging',
      icone: 'crystal',
      resumo: 'New directives and plugins, and the tools for seeing what happens.',
      paginas: [
        { id: 'guia/directives-e-plugins', titulo: 'Custom directives and plugins' },
        { id: 'guia/inspetor', titulo: 'The reactivity inspector' },
        { id: 'guia/depurando', titulo: 'Debugging common problems' }
      ]
    },
    {
      titulo: 'Reference',
      icone: 'scroll',
      resumo: 'Everything that exists, without narrative: names, arguments and values.',
      paginas: [
        { id: 'referencia/directives', titulo: 'Directives by category' },
        { id: 'referencia/objeto-v', titulo: 'The V object' },
        { id: 'referencia/magias', titulo: 'Magic variables' },
        { id: 'referencia/componentes-prontos', titulo: 'Built-in components and their props' },
        { id: 'referencia/http', titulo: 'HTTP client' },
        { id: 'referencia/utilitarios', titulo: 'Utilities' },
        { id: 'referencia/validacao', titulo: 'Validation rules' },
        { id: 'referencia/mascaras', titulo: 'Masks' },
        { id: 'referencia/graficos', titulo: 'Chart types' },
        { id: 'referencia/configuracao', titulo: 'Configuration' }
      ]
    },
    {
      titulo: 'Quality and migration',
      icone: 'rune',
      resumo: 'Security, performance, moving over from other libraries, and the FAQ.',
      paginas: [
        { id: 'referencia/seguranca', titulo: 'Security' },
        { id: 'referencia/desempenho', titulo: 'Performance' },
        { id: 'referencia/migracao-jquery', titulo: 'Migrating from jQuery' },
        { id: 'referencia/migracao-alpine', titulo: 'Migrating from Alpine' },
        { id: 'referencia/migracao-vue', titulo: 'Migrating from Vue' },
        { id: 'referencia/perguntas-frequentes', titulo: 'Frequently asked questions' }
      ]
    }
  ];

  // Flat list, used by the previous/next navigation, plus each page's group.
  var LINEAR = [];
  NAVEGACAO.forEach(function (grupo) {
    grupo.paginas.forEach(function (pagina) {
      pagina.grupo = grupo;
      LINEAR.push(pagina);
    });
  });

  // ------------------------------------------------------------------------
  // 2. Paths and the rest of the site
  // ------------------------------------------------------------------------

  var esteScript =
    document.currentScript ||
    (function () {
      var lista = document.getElementsByTagName('script');
      return lista[lista.length - 1];
    })();

  var RAIZ = new URL('../', esteScript.src); // .../site/docs/
  var RUNTIME = new URL('../voodoo.full.min.js?v=c917278b', RAIZ).href; // .../site/voodoo.full.min.js

  // One level above the documentation is the site itself. Resolving it from
  // the script URL rather than from location means the links work the same
  // from /docs/, /docs/guia/ and /docs/referencia/. It is a full href, never a
  // pathname: under file:// a pathname starts with "/C:/..." and a browser
  // resolves that from the filesystem root.
  var SITE = new URL('../', RAIZ).href; // .../site/
  var VERSAO = 'Voodoo.js 1.0.0';

  // The sections of the site, in header order. The same list as SECTIONS in
  // scripts/site-chrome.mjs, which writes the static pages.
  var LINKS = [
    { id: 'learn', href: SITE + 'learn.html', texto: 'Learn' },
    { id: 'docs', href: SITE + 'docs/', texto: 'Docs' },
    { id: 'playground', href: SITE + 'playground.html', texto: 'Playground' },
    { id: 'components', href: SITE + 'components.html', texto: 'Components' },
    { id: 'examples', href: SITE + 'examples/', texto: 'Examples' }
  ];

  var GITHUB = 'https://github.com/kwy404/Voodoo.js';
  var NPM = 'https://www.npmjs.com/package/voodoojs';
  var AUTOR_GITHUB = 'https://github.com/kwy404';
  var AUTOR_LINKEDIN = 'https://www.linkedin.com/in/alexandre-silva-173687256/';

  // The author's other projects, listed in every footer of the site.
  var PROJETOS = [
    ['monsoon', 'Monsoon', 'Utility-first CSS with no build step'],
    ['breakhound', 'breakhound', 'Find bugs in any JavaScript library automatically'],
    ['vueleap', 'vueleap', 'Migrate Vue 2 to Vue 3 with one command'],
    ['graphemely', 'graphemely', 'Emoji safe string functions'],
    ['numberparrot', 'numberparrot', 'Parse localized numbers and currency'],
    ['edgegoat', 'edgegoat', 'Edge case test inputs'],
    ['cookieowl', 'cookieowl', 'Cookie consent banner for LGPD and GDPR'],
    ['installkite', 'installkite', 'Make any website installable and offline capable'],
    ['a11ymedic', 'a11ymedic', 'Accessibility checker that gives the exact fix'],
    ['fontsketch', 'fontsketch', 'Turn your handwriting into a font'],
    ['kastor', 'kastor', 'The TypeScript ORM for almost every database']
  ];

  var MASCOTE = SITE + 'assets/brand/vudu/';

  /** A link to a documentation page, absolute enough to work from any depth. */
  function href(id) {
    return id ? RAIZ.href + id + '.html' : RAIZ.href;
  }

  /**
   * Which page is open, derived by comparing full URLs rather than paths.
   * Under file:// both carry a drive letter and percent-encoding that do not
   * always match byte for byte, so the comparison is on decoded hrefs with the
   * query and hash stripped.
   */
  function idAtual() {
    var aqui = decodeURIComponent(location.href.split('#')[0].split('?')[0]);
    var raiz = decodeURIComponent(RAIZ.href);
    if (aqui.indexOf(raiz) !== 0) return '';
    return aqui
      .slice(raiz.length)
      .replace(/\.html$/, '')
      .replace(/(^|\/)index$/, '')
      .replace(/^\/+|\/+$/g, '');
  }

  var ATUAL = idAtual();
  var INDICE_ATUAL = LINEAR.findIndex(function (p) {
    return p.id === ATUAL;
  });

  // ------------------------------------------------------------------------
  // 3. Helpers
  // ------------------------------------------------------------------------

  function esc(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function el(nome, atributos, filhos) {
    var node = document.createElement(nome);
    if (atributos) {
      Object.keys(atributos).forEach(function (chave) {
        if (atributos[chave] === null || atributos[chave] === false) return;
        if (chave === 'html') node.innerHTML = atributos[chave];
        else if (chave === 'texto') node.textContent = atributos[chave];
        else node.setAttribute(chave, atributos[chave]);
      });
    }
    (filhos || []).forEach(function (filho) {
      if (filho) node.appendChild(filho);
    });
    return node;
  }

  function semAcento(texto) {
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** An icon from the site sprite. */
  function icone(nome, classe) {
    return (
      '<svg class="vd-icon' + (classe ? ' ' + classe : '') + '" aria-hidden="true">' +
      '<use href="' + SITE + 'assets/art/icons.svg#i-' + nome + '"></use></svg>'
    );
  }

  function marca() {
    return (
      '<img src="' + MASCOTE + 'vudu-head.svg" width="32" height="32" alt="">' +
      '<span>Voodoo<span class="text-primary">.js</span></span>'
    );
  }

  // ------------------------------------------------------------------------
  // 4. Theme
  //
  //    The same key, values and attribute as `V.theme`, as on every other page
  //    of the site: `voodoo:theme` holding `light`, `dark` or `system`, and
  //    `data-theme` on the root for an explicit choice. The system preference
  //    governs until the reader picks a theme, an explicit choice then wins in
  //    both directions, and `system` hands the page back to the operating
  //    system. The button walks system, light, dark, the order of
  //    `V.theme.cycle()`, and carries the current choice as
  //    `data-voodoo-theme-mode`, the attribute the library writes on
  //    v-theme-toggle, so site.css shows the same icon as on every other page.
  //
  //    The documentation once kept a theme of its own under the key
  //    `voodoo-docs-tema` (`claro`, `escuro`). A choice saved there is moved
  //    across once.
  // ------------------------------------------------------------------------

  var CHAVE_TEMA = 'voodoo:theme';
  var CHAVE_TEMA_ANTIGA = 'voodoo-docs-tema';
  var MODOS = ['system', 'light', 'dark'];

  // The choice made on this page, for when storage cannot keep it.
  var escolhaDaPagina = null;

  function migrarTemaAntigo() {
    try {
      var antigo = localStorage.getItem(CHAVE_TEMA_ANTIGA);
      if (antigo === null) return;
      localStorage.removeItem(CHAVE_TEMA_ANTIGA);
      var valor = antigo === 'claro' ? 'light' : antigo === 'escuro' ? 'dark' : null;
      if (valor && localStorage.getItem(CHAVE_TEMA) === null) localStorage.setItem(CHAVE_TEMA, valor);
    } catch (erro) {
      /* private mode */
    }
  }

  // The saved choice, or null. Reads the JSON spelling as well, as the library
  // does, so `"dark"` written by an older build is still dark here.
  function temaSalvo() {
    try {
      var valor = localStorage.getItem(CHAVE_TEMA);
      if (valor && valor.charAt(0) === '"') valor = JSON.parse(valor);
      return MODOS.indexOf(valor) > -1 ? valor : null;
    } catch (erro) {
      return null; /* private mode */
    }
  }

  function modoAtual() {
    return escolhaDaPagina || temaSalvo() || 'system';
  }

  function temaDoSistema() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  // The theme actually painted right now, `light` or `dark`.
  function temaAtual() {
    var modo = modoAtual();
    return modo === 'system' ? temaDoSistema() : modo;
  }

  // Writes the choice on the root exactly as `V.theme.apply()` and the inline
  // script in <head> do: the attribute for an explicit theme, none for system.
  function pintarModo() {
    var raiz = document.documentElement;
    var modo = modoAtual();
    if (modo === 'system') {
      raiz.removeAttribute('data-theme');
      raiz.style.colorScheme = '';
    } else {
      raiz.setAttribute('data-theme', modo);
      raiz.style.colorScheme = modo;
    }
  }

  // Remembers the choice and paints it. Only the toggle calls this.
  function aplicarModo(modo) {
    escolhaDaPagina = modo;
    try {
      localStorage.setItem(CHAVE_TEMA, modo);
    } catch (erro) {
      /* private mode, carry on without persisting */
    }
    pintarModo();
    sincronizarTema();
  }

  // Repaints everything that depends on the theme: the button and the frames.
  function sincronizarTema() {
    var modo = modoAtual();
    var tema = temaAtual();
    var botao = document.getElementById('doc-tema');
    if (botao) {
      var proximo = MODOS[(MODOS.indexOf(modo) + 1) % MODOS.length];
      var rotulo =
        'Theme: ' + (modo === 'system' ? 'system (' + tema + ')' : modo) + '. Switch to ' + proximo;
      botao.setAttribute('data-voodoo-theme-mode', modo);
      botao.setAttribute('aria-label', rotulo);
      botao.setAttribute('title', rotulo);
    }
    document.querySelectorAll('iframe[data-palco]').forEach(function (quadro) {
      try {
        // An example that asks Voodoo what theme it is on, like the one on the
        // theme page, reads `data-theme`, and would otherwise answer from the
        // operating system and contradict the page around it.
        quadro.contentDocument.documentElement.setAttribute('data-theme', tema);
      } catch (erro) {
        /* still loading */
      }
    });
  }

  function ligarTema() {
    migrarTemaAntigo();
    pintarModo();

    if (window.matchMedia) {
      var consulta = window.matchMedia('(prefers-color-scheme: dark)');
      var aoMudar = function () {
        if (modoAtual() === 'system') sincronizarTema();
      };
      if (consulta.addEventListener) consulta.addEventListener('change', aoMudar);
      else if (consulta.addListener) consulta.addListener(aoMudar);
    }

    // Another tab, or a live example on this page (its frame shares the
    // storage), changed the choice.
    window.addEventListener('storage', function (evento) {
      if (evento.key !== CHAVE_TEMA && evento.key !== null) return;
      escolhaDaPagina = null;
      pintarModo();
      sincronizarTema();
    });

    sincronizarTema();
  }

  // ------------------------------------------------------------------------
  // 5. Code frames
  //
  //    Every <pre data-lang> goes into a VS Code style frame: a tab with the
  //    file name and a copy button. The colours are already in the markup.
  // ------------------------------------------------------------------------

  var ARQUIVOS = {
    html: ['example.html', 'file'],
    js: ['script.js', 'file'],
    javascript: ['script.js', 'file'],
    ts: ['script.ts', 'file'],
    css: ['styles.css', 'file'],
    json: ['data.json', 'braces'],
    bash: ['terminal', 'terminal'],
    shell: ['terminal', 'terminal'],
    txt: ['plain text', 'scroll'],
    text: ['plain text', 'scroll']
  };

  function prepararCodigo(raiz) {
    (raiz || document).querySelectorAll('pre[data-lang]').forEach(function (pre) {
      if (pre.closest('.vframe')) return;

      var codigo = pre.querySelector('code') || pre;
      var fonte = codigo.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var idioma = pre.getAttribute('data-lang') || 'txt';
      var arquivo = ARQUIVOS[idioma] || [idioma, 'file'];

      var moldura = el('div', { class: 'vframe' });
      pre.parentNode.insertBefore(moldura, pre);

      var barra = el('div', {
        class: 'vframe-bar',
        html:
          '<span class="vframe-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<span class="vframe-tab" data-lang="' + esc(idioma) + '">' +
          icone(arquivo[1]) + esc(arquivo[0]) + '</span>'
      });
      var botao = el('button', {
        type: 'button',
        class: 'vframe-copy',
        'aria-label': 'Copy the code',
        html: icone('copy') + '<span>Copy</span>'
      });
      botao.addEventListener('click', function () {
        copiar(fonte).then(function (deuCerto) {
          botao.innerHTML = deuCerto ? icone('check') + '<span>Copied</span>' : icone('copy') + '<span>Failed</span>';
          botao.setAttribute('data-estado', deuCerto ? 'ok' : 'erro');
          setTimeout(function () {
            botao.innerHTML = icone('copy') + '<span>Copy</span>';
            botao.removeAttribute('data-estado');
          }, 1800);
        });
      });
      barra.appendChild(botao);
      moldura.appendChild(barra);
      moldura.appendChild(pre);
      moldura.__fonte = fonte;
    });
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(
        function () {
          return true;
        },
        function () {
          return copiarAntigo(texto);
        }
      );
    }
    return Promise.resolve(copiarAntigo(texto));
  }

  function copiarAntigo(texto) {
    try {
      var area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(area);
      area.select();
      var certo = document.execCommand('copy');
      area.remove();
      return certo;
    } catch (erro) {
      return false;
    }
  }

  // ------------------------------------------------------------------------
  // 6. Live examples
  // ------------------------------------------------------------------------

  // The stage is a separate document, so it carries its own small stylesheet:
  // two palettes matching the Monsoon surfaces of the page (purple seed), and
  // the library's own --v-* tokens pointed at them.
  //
  // Keyed on `data-theme` alone, the attribute both writers use: the shell
  // stamps it on the frame, carrying the page's theme in, and the library
  // writes it when something inside the frame changes the theme, which is what
  // the v-theme-toggle example on the theme page does. An explicit light
  // choice has to beat a dark system as well, or the toggle only works in one
  // direction.
  var CLARO =
    '--ink:#181721;--ink-soft:#5a586b;--ink-faint:#77758a;' +
    '--bg:#fffeff;--bg-soft:#f4f4fd;--line:#dddceb;--fill:#eaeaf6;' +
    '--accent:#6c35ec;--accent-soft:#efeafe;color-scheme:light';
  var ESCURO =
    '--ink:#f1f0ff;--ink-soft:#a9a8bd;--ink-faint:#8a889e;' +
    '--bg:#16161a;--bg-soft:#1f1e25;--line:#35343f;--fill:#282831;' +
    '--accent:#9e77ff;--accent-soft:#2a2340;color-scheme:dark';

  var TOKENS_IFRAME =
    ':root{' + CLARO + '}' +
    '@media (prefers-color-scheme:dark){html:root:not([data-theme="light"]){' + ESCURO + '}}' +
    'html:root[data-theme="dark"]{' + ESCURO + '}' +
    'html:root[data-theme="light"]{' + CLARO + '}' +
    // The library injects :root{--v-surface:#fff;...} into this document's
    // <head> and only darkens it for prefers-color-scheme or [data-theme].
    // !important is required: V.palette() writes
    // :root:not([data-theme="light"]), which outranks any plain selector, and
    // html:root beats the plain :root the library appends later in source
    // order. --v-surface-3 has no default at all: the progress track, the
    // skeleton fill and the switch rail paint with it and vanish unmapped.
    'html:root{' +
    '--v-surface:var(--bg)!important;' +
    '--v-surface-2:var(--bg-soft)!important;' +
    '--v-surface-3:var(--fill)!important;' +
    '--v-border:var(--line)!important;' +
    '--v-text:var(--ink)!important;' +
    '--v-text-muted:var(--ink-faint)!important;' +
    '--v-primary:var(--accent)!important;' +
    '--v-radius:10px;--v-radius-sm:7px}';

  var BASE_IFRAME =
    TOKENS_IFRAME +
    '*,*::before,*::after{box-sizing:border-box}' +
    // Not transparent. The frame's text is painted with the frame's own --ink,
    // and a transparent body would put it on the page's background instead. A
    // frame that paints its own surface cannot end up as dark text on a dark
    // card. And no height rule on the body, ever: ajustarAltura measures it.
    'body{margin:0;padding:16px;font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",' +
    'Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}' +
    '[v-cloak]{display:none!important}' +
    'h1,h2,h3,h4,p,ul,ol{margin:0 0 .6rem}' +
    'ul,ol{padding-left:1.2rem}' +
    'button{font:inherit;padding:.4rem .8rem;border:1px solid var(--line);border-radius:8px;' +
    'background:var(--bg-soft);color:var(--ink);cursor:pointer}' +
    'button:hover{border-color:var(--accent)}' +
    'input,select,textarea{font:inherit;padding:.4rem .6rem;border:1px solid var(--line);' +
    'border-radius:8px;background:var(--bg);color:var(--ink);max-width:100%}' +
    ':focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
    'input[type=checkbox],input[type=radio]{width:auto;accent-color:var(--accent)}' +
    'label{display:inline-flex;align-items:center;gap:.4rem}' +
    'table{border-collapse:collapse;width:100%;font-size:.9rem}' +
    'th,td{padding:.35rem .5rem;border-bottom:1px solid var(--line);text-align:left}' +
    'code{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}' +
    'a{color:var(--accent)}' +
    '.linha{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.5rem}';

  function montarExemplos(raiz) {
    var alvos = (raiz || document).querySelectorAll('[data-exemplo]');
    if (!alvos.length) return;

    var observador =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            function (entradas) {
              entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;
                observador.unobserve(entrada.target);
                carregarPalco(entrada.target);
              });
            },
            { rootMargin: '300px 0px' }
          )
        : null;

    alvos.forEach(function (exemplo) {
      var moldura = exemplo.querySelector('.vframe');
      if (!moldura) return;
      exemplo.classList.add('docs-example');

      // A "live" badge in the code frame's own bar, before the copy button.
      var barra = moldura.querySelector('.vframe-bar');
      barra.insertBefore(
        el('span', {
          class: 'docs-live',
          html: '<span class="docs-live-dot" aria-hidden="true"></span>Live'
        }),
        barra.querySelector('.vframe-copy')
      );

      var palco = el('div', { class: 'docs-stage' });
      palco.__fonte = moldura.__fonte || '';

      var repetir = el('button', {
        type: 'button',
        class: 'btn btn-ghost btn-xs gap-1',
        html: icone('reset') + '<span>Run again</span>'
      });
      repetir.addEventListener('click', function () {
        carregarPalco(palco);
      });

      var faixa = el('div', {
        class: 'docs-stage-bar',
        html: icone('sparkle') + '<span><b>Result</b>, running on this page</span>'
      });
      faixa.appendChild(repetir);

      exemplo.appendChild(faixa);
      exemplo.appendChild(palco);

      if (observador) observador.observe(palco);
      else carregarPalco(palco);
    });
  }

  function carregarPalco(palco) {
    palco.classList.remove('is-ready');
    palco.innerHTML = '';
    palco.appendChild(
      el('img', {
        class: 'docs-loading',
        src: MASCOTE + 'vudu-loading.svg',
        width: '56',
        height: '56',
        alt: 'Loading the example'
      })
    );

    var quadro = el('iframe', {
      'data-palco': '',
      title: 'Example result',
      loading: 'lazy'
    });
    palco.appendChild(quadro);

    quadro.srcdoc =
      '<!doctype html><html lang="en" data-theme="' +
      temaAtual() +
      '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>' +
      BASE_IFRAME +
      '</style>' +
      '<script src="' +
      RUNTIME +
      '"><\/script>' +
      '</head><body>' +
      palco.__fonte +
      '<\/body><\/html>';

    quadro.addEventListener('load', function () {
      ajustarAltura(quadro);
      // The library mounts just after load; reveal the result once it has,
      // so the raw template never flashes.
      setTimeout(function () {
        ajustarAltura(quadro);
        palco.classList.add('is-ready');
      }, 90);
      try {
        var corpo = quadro.contentDocument.body;
        if ('ResizeObserver' in window) {
          new quadro.contentWindow.ResizeObserver(function () {
            ajustarAltura(quadro);
          }).observe(corpo);
        }
        corpo.addEventListener('click', function () {
          setTimeout(function () {
            ajustarAltura(quadro);
          }, 60);
        });
        corpo.addEventListener('input', function () {
          setTimeout(function () {
            ajustarAltura(quadro);
          }, 60);
        });
      } catch (erro) {
        /* keep the height measured once */
      }
      setTimeout(function () {
        ajustarAltura(quadro);
      }, 400);
    });
  }

  /**
   * Sizes the frame to its content.
   *
   * Measure the body, never `documentElement`. The root element of the inner
   * document fills whatever height the frame was last given, so
   * `documentElement.scrollHeight` reports that height straight back, and
   * taking `Math.max` of the two read the previous measurement, added 8 and
   * wrote a frame 8px taller than before, on every click, keystroke and resize
   * observation. The body is content-driven because the stylesheet this file
   * injects gives it `margin:0;padding:16px` and no height, so it cannot echo
   * the frame. That is why nothing here may add a height rule to the body.
   * scripts/check-frame-height.mjs extracts this function and pins it.
   */
  function ajustarAltura(quadro) {
    try {
      var doc = quadro.contentDocument;
      if (!doc || !doc.body) return;

      var anterior = quadro.style.height;
      var proxima = Math.max(doc.body.scrollHeight + 8, 96) + 'px';

      // Avoid writing an identical value: a no-op write still invalidates
      // layout, and the ResizeObserver watching the body would see it.
      quadro.style.height = proxima === anterior ? anterior : proxima;
    } catch (erro) {
      quadro.style.height = '220px';
    }
  }

  // ------------------------------------------------------------------------
  // 7. Header, the same markup as header() in scripts/site-chrome.mjs, plus
  //    the search trigger.
  // ------------------------------------------------------------------------

  function montarTopo() {
    var links = LINKS.map(function (link) {
      return (
        '<a class="navbar-link" href="' + link.href + '"' +
        (link.id === 'docs' ? ' aria-current="page"' : '') + '>' + link.texto + '</a>'
      );
    }).join('');

    var topo = el('header', {
      class: 'navbar navbar-sticky navbar-blur px-4 lg:px-8 docs-topbar',
      html:
        '<div class="navbar-start">' +
        '<a class="navbar-brand vd-brand" href="' + SITE + '">' + marca() + '</a>' +
        '</div>' +
        '<nav class="navbar-center navbar-nav" aria-label="Main">' + links + '</nav>' +
        '<div class="navbar-end">' +
        '<button type="button" class="btn btn-outline btn-sm gap-2 text-muted-foreground docs-search-btn" data-abrir-busca aria-haspopup="dialog" aria-label="Search the documentation, Ctrl plus K">' +
        icone('search') + '<span class="docs-search-label">Search</span><kbd class="kbd kbd-xs">Ctrl K</kbd></button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-square vd-theme" id="doc-tema" aria-label="Change theme: system, light or dark">' +
        icone('monitor', 'vd-theme-system') + icone('sun', 'vd-theme-light') + icone('moon', 'vd-theme-dark') +
        '</button>' +
        '<a class="btn btn-ghost btn-sm btn-square hidden sm:inline-flex" href="' + GITHUB + '" aria-label="Voodoo.js on GitHub">' + icone('github') + '</a>' +
        '<details class="navbar-mobile">' +
        '<summary class="navbar-burger" aria-label="Menu"></summary>' +
        '<nav class="navbar-mobile-panel" aria-label="Mobile">' + links +
        '<a class="navbar-link" href="' + GITHUB + '">GitHub</a></nav>' +
        '</details>' +
        '</div>'
    });

    topo.querySelector('#doc-tema').addEventListener('click', function () {
      aplicarModo(MODOS[(MODOS.indexOf(modoAtual()) + 1) % MODOS.length]);
    });
    return topo;
  }

  // Below lg the sidebar is a drawer, opened from a slim bar under the header
  // that also says where the reader is.
  function montarSubbarra() {
    var pagina = LINEAR[INDICE_ATUAL];
    var barra = el('div', {
      class: 'docs-subbar',
      html:
        '<button type="button" class="btn btn-ghost btn-sm gap-2" id="doc-abrir-menu" aria-expanded="false" aria-controls="doc-menu">' +
        icone('menu') + '<span>Menu</span></button>' +
        '<span class="docs-subbar-where">' +
        (pagina
          ? '<span>' + esc(pagina.grupo.titulo) + '</span>' + icone('arrow') + '<b>' + esc(pagina.curto || pagina.titulo) + '</b>'
          : '<b>Documentation</b>') +
        '</span>'
    });
    barra.querySelector('#doc-abrir-menu').addEventListener('click', function () {
      alternarMenu(true);
    });
    return barra;
  }

  // ------------------------------------------------------------------------
  // 8. Sidebar
  // ------------------------------------------------------------------------

  var vidro;

  function montarMenu() {
    var menu = el('aside', {
      class: 'sidebar docs-side',
      id: 'doc-menu',
      'aria-label': 'Documentation'
    });

    var cabeca = el('div', {
      class: 'docs-side-head',
      html: '<a class="navbar-brand vd-brand" href="' + SITE + '">' + marca() + '</a>'
    });
    var fechar = el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-sm btn-square',
      'aria-label': 'Close the menu',
      html: icone('close')
    });
    fechar.addEventListener('click', function () {
      alternarMenu(false);
    });
    cabeca.appendChild(fechar);
    menu.appendChild(cabeca);

    var nav = el('nav', { class: 'docs-side-nav', 'aria-label': 'Documentation pages' });
    var contador = 0;
    NAVEGACAO.forEach(function (grupo) {
      var secao = el('div', { class: 'sidebar-section' });
      secao.appendChild(
        el('p', { class: 'sidebar-title', html: icone(grupo.icone) + '<span>' + esc(grupo.titulo) + '</span>' })
      );
      grupo.paginas.forEach(function (pagina) {
        var numero = pagina.id.indexOf('guia/') === 0 ? ++contador : null;
        secao.appendChild(
          el('a', {
            class: 'sidebar-item',
            href: href(pagina.id),
            'aria-current': pagina.id === ATUAL ? 'page' : null,
            html:
              (numero ? '<span class="docs-num" aria-hidden="true">' + (numero < 10 ? '0' : '') + numero + '</span>' : '') +
              '<span class="sidebar-label">' + esc(pagina.curto || pagina.titulo) + '</span>'
          })
        );
      });
      nav.appendChild(secao);
    });
    menu.appendChild(nav);

    menu.appendChild(
      el('div', {
        class: 'sidebar-footer',
        html:
          '<a class="sidebar-item" href="' + SITE + 'learn.html">' + icone('wand') +
          '<span class="sidebar-label">Learn it in 10 minutes</span></a>' +
          '<a class="sidebar-item" href="' + SITE + 'playground.html">' + icone('play') +
          '<span class="sidebar-label">Open the playground</span></a>' +
          '<a class="sidebar-item" href="' + GITHUB + '/releases">' + icone('candle') +
          '<span class="sidebar-label">Release notes</span></a>'
      })
    );
    return menu;
  }

  function alternarMenu(abrir) {
    var menu = document.getElementById('doc-menu');
    var botao = document.getElementById('doc-abrir-menu');
    if (!menu || !botao) return;
    var aberto = menu.hasAttribute('data-aberto');
    if (abrir === aberto) return;
    if (abrir) {
      menu.setAttribute('data-aberto', '');
      botao.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('docs-locked');
      if (vidro) vidro.hidden = false;
      var atual = menu.querySelector('[aria-current="page"]');
      if (atual) atual.scrollIntoView({ block: 'center' });
      var fechar = menu.querySelector('.docs-side-head button');
      if (fechar) fechar.focus();
    } else {
      menu.removeAttribute('data-aberto');
      botao.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('docs-locked');
      if (vidro) vidro.hidden = true;
      botao.focus();
    }
  }

  // ------------------------------------------------------------------------
  // 9. Article furniture: kicker, meta line, callouts, tables, keys, anchors
  // ------------------------------------------------------------------------

  var AVISOS = {
    dica: ['callout-primary', 'sparkle'],
    atencao: ['callout-warning', 'candle'],
    perigo: ['callout-danger', 'pin'],
    roadmap: ['callout-neutral', 'moonstar']
  };

  function vestirArtigo(artigo) {
    artigo.classList.add('prose');

    var migalha = artigo.querySelector('.doc-migalha');
    if (migalha) migalha.classList.add('vd-kicker');

    // Reading time and live examples, under the lead paragraph.
    var resumo = artigo.querySelector('.doc-resumo');
    if (resumo && ATUAL) {
      var palavras = (artigo.textContent.match(/\S+/g) || []).length;
      var minutos = Math.max(1, Math.round(palavras / 220));
      var vivos = artigo.querySelectorAll('[data-exemplo]').length;
      resumo.insertAdjacentElement(
        'afterend',
        el('p', {
          class: 'docs-meta',
          html:
            '<span>' + icone('scroll') + minutos + ' min read</span>' +
            (vivos
              ? '<span>' + icone('sparkle') + vivos + ' live example' + (vivos > 1 ? 's' : '') + '</span>'
              : '')
        })
      );
    }

    artigo.querySelectorAll('.doc-aviso').forEach(function (aviso) {
      var tom = ['callout-info', 'crystal'];
      Object.keys(AVISOS).forEach(function (tipo) {
        if (aviso.classList.contains('doc-aviso--' + tipo)) tom = AVISOS[tipo];
      });
      aviso.classList.add('callout', tom[0]);
      var rotulo = aviso.querySelector('.doc-aviso__rotulo');
      if (rotulo) {
        rotulo.classList.add('callout-title');
        rotulo.insertAdjacentHTML('afterbegin', icone(tom[1]));
      }
    });

    artigo.querySelectorAll('.doc-tabela').forEach(function (caixa) {
      caixa.classList.add('table-wrap');
      var tabela = caixa.querySelector('table');
      if (tabela) tabela.classList.add('table', 'table-hover');
    });

    // Short identifiers stay on one line; long ones may still wrap.
    artigo.querySelectorAll(':not(pre) > code').forEach(function (codigo) {
      if (codigo.textContent.length <= 28) codigo.classList.add('docs-nowrap');
    });

    artigo.querySelectorAll('kbd').forEach(function (tecla) {
      tecla.classList.add('kbd', 'kbd-sm');
    });

    artigo.querySelectorAll('.doc-cartao').forEach(function (cartao) {
      cartao.insertAdjacentHTML('beforeend', icone('arrow', 'doc-cartao__seta'));
    });
  }

  function ligarAncoras(artigo) {
    artigo.querySelectorAll('h2[id], h3[id]').forEach(function (titulo) {
      if (titulo.querySelector('.doc-ancora')) return;
      titulo.appendChild(
        el('a', {
          class: 'doc-ancora',
          href: '#' + titulo.id,
          'aria-label': 'Direct link to the section ' + titulo.textContent.trim(),
          texto: '#'
        })
      );
    });
  }

  // ------------------------------------------------------------------------
  // 10. On this page
  // ------------------------------------------------------------------------

  function listaDoIndice(titulos) {
    var raiz = el('ul', { class: 'toc' });
    var ultimoItem = null;
    var sublista = null;
    titulos.forEach(function (titulo) {
      var link = el('a', {
        href: '#' + titulo.id,
        'data-para': titulo.id,
        texto: titulo.textContent.replace(/#$/, '').trim()
      });
      var item = el('li', null, [link]);
      if (titulo.tagName === 'H3' && ultimoItem) {
        if (!sublista) {
          sublista = el('ul');
          ultimoItem.appendChild(sublista);
        }
        sublista.appendChild(item);
      } else {
        raiz.appendChild(item);
        ultimoItem = item;
        sublista = null;
      }
    });
    return raiz;
  }

  function montarIndice(artigo) {
    var titulos = Array.prototype.slice.call(artigo.querySelectorAll('h2[id], h3[id]'));
    var aside = el('aside', { class: 'docs-toc', 'aria-labelledby': 'doc-indice-titulo' });
    if (titulos.length < 2) return aside;

    aside.appendChild(el('p', { class: 'toc-title', id: 'doc-indice-titulo', texto: 'On this page' }));
    aside.appendChild(listaDoIndice(titulos));
    aside.appendChild(
      el('a', {
        class: 'docs-toc-top',
        href: '#main',
        html: icone('arrow') + 'Back to top'
      })
    );
    aside.appendChild(
      el('a', {
        class: 'docs-toc-card',
        href: SITE + 'playground.html',
        html:
          '<img src="' + MASCOTE + 'vudu-wave.svg" width="48" height="48" alt="">' +
          '<span><b>Try it live</b>Every example runs in the playground too.</span>'
      })
    );

    // Below xl the side index has no room, so the same list sits in a
    // collapsible block at the top of the article.
    var compacto = el('details', { class: 'docs-toc-inline' }, [
      el('summary', { html: icone('scroll') + '<span>On this page</span>' }),
      listaDoIndice(titulos)
    ]);
    compacto.addEventListener('click', function (evento) {
      if (evento.target.closest('a')) compacto.open = false;
    });
    var primeiro = titulos[0];
    primeiro.parentNode.insertBefore(compacto, primeiro);

    ligarObservadorDeSecao(aside, titulos);
    return aside;
  }

  function ligarObservadorDeSecao(aside, titulos) {
    if (!('IntersectionObserver' in window)) return;
    var visiveis = new Set();

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) visiveis.add(entrada.target.id);
          else visiveis.delete(entrada.target.id);
        });

        var ativo = null;
        titulos.forEach(function (titulo) {
          if (!ativo && visiveis.has(titulo.id)) ativo = titulo.id;
        });
        if (!ativo) return;

        aside.querySelectorAll('a[data-para]').forEach(function (link) {
          if (link.getAttribute('data-para') === ativo) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    titulos.forEach(function (titulo) {
      observador.observe(titulo);
    });
  }

  // ------------------------------------------------------------------------
  // 11. Previous and next page
  // ------------------------------------------------------------------------

  function montarPaginacao() {
    if (INDICE_ATUAL < 0) return null;
    var anterior = LINEAR[INDICE_ATUAL - 1];
    var proxima = LINEAR[INDICE_ATUAL + 1];
    if (!anterior && !proxima) return null;

    var nav = el('nav', { class: 'docs-pager', 'aria-label': 'Neighbouring pages' });
    [
      [anterior, 'prev', 'Previous'],
      [proxima, 'next', 'Next']
    ].forEach(function (par) {
      var pagina = par[0];
      if (!pagina) return;
      nav.appendChild(
        el('a', {
          class: 'card card-interactive docs-pager-link docs-pager-' + par[1],
          href: href(pagina.id),
          rel: par[1],
          html:
            '<span class="docs-pager-label">' + icone('arrow') + par[2] + '</span>' +
            '<span class="docs-pager-title">' + esc(pagina.titulo) + '</span>' +
            '<span class="docs-pager-group">' + esc(pagina.grupo.titulo) + '</span>'
        })
      );
    });
    return nav;
  }

  // ------------------------------------------------------------------------
  // 12. Footer, the same markup as footer() in scripts/site-chrome.mjs
  // ------------------------------------------------------------------------

  function montarRodape() {
    var p = SITE;
    var projetos = PROJETOS.map(function (x) {
      return (
        '<li><a href="https://kwy404.github.io/' + x[0] + '/" title="' + esc(x[2]) + '">' +
        '<img src="https://cdn.jsdelivr.net/gh/kwy404/' + x[0] +
        '@main/assets/mascot.svg" alt="" width="20" height="20" loading="lazy" decoding="async">' +
        esc(x[1]) + '</a></li>'
      );
    }).join('');
    var secoes = LINKS.map(function (link) {
      return '<li><a href="' + link.href + '">' + link.texto + '</a></li>';
    }).join('');

    return el('footer', {
      class: 'footer px-4 lg:px-8',
      html:
        '<div class="footer-grid md:grid-cols-4 mx-auto w-full max-w-7xl">' +
        '<div class="footer-brand md:col-span-1">' +
        '<a class="navbar-brand vd-brand text-foreground" href="' + p + '">' + marca() + '</a>' +
        '<p>JSX in plain HTML. No build step, one script tag.</p>' +
        '<div class="footer-social">' +
        '<a href="' + GITHUB + '" aria-label="Voodoo.js on GitHub">' + icone('github') + '</a>' +
        '<a href="' + NPM + '" aria-label="voodoojs on npm">' + icone('npm') + '</a>' +
        '</div></div>' +
        '<nav aria-label="Voodoo.js"><p class="footer-title">Voodoo.js</p><ul class="footer-links">' +
        secoes +
        '<li><a href="' + GITHUB + '">GitHub</a></li><li><a href="' + NPM + '">npm</a></li>' +
        '</ul></nav>' +
        '<nav aria-label="Learn"><p class="footer-title">Learn</p><ul class="footer-links">' +
        '<li><a href="' + href('guia/instalacao') + '">Installation</a></li>' +
        '<li><a href="' + href('guia/jsx') + '">JSX in plain HTML</a></li>' +
        '<li><a href="' + href('referencia/directives') + '">Directives</a></li>' +
        '<li><a href="' + href('referencia/migracao-vue') + '">Coming from Vue</a></li>' +
        '<li><a href="' + href('referencia/perguntas-frequentes') + '">FAQ</a></li>' +
        '</ul></nav>' +
        '<nav aria-label="More from kwy404"><p class="footer-title">More from kwy404</p>' +
        '<ul class="footer-links vd-projects">' + projetos + '</ul></nav>' +
        '</div>' +
        '<div class="footer-bottom mx-auto w-full max-w-7xl">' +
        '<p>Made by <a class="font-medium text-foreground hover:underline" href="' + AUTOR_GITHUB + '" rel="me noopener">Alexandre Kohler</a> ' +
        '(<a class="hover:underline" href="' + AUTOR_GITHUB + '" rel="me noopener">GitHub</a>, ' +
        '<a class="hover:underline" href="' + AUTOR_LINKEDIN + '" rel="me noopener">LinkedIn</a>). MIT licensed. ' + VERSAO + '.</p>' +
        '<p>Built with <a class="font-medium text-foreground hover:underline" href="https://kwy404.github.io/monsoon/">Monsoon</a>. ' +
        'Interactive parts built with <a class="font-medium text-foreground hover:underline" href="https://kwy404.github.io/Voodoo.js/">Voodoo.js</a>.</p>' +
        '</div>'
    });
  }

  // ------------------------------------------------------------------------
  // 13. Documentation home: one card per group of NAVEGACAO
  // ------------------------------------------------------------------------

  function montarMapa(artigo) {
    var alvo = artigo.querySelector('[data-mapa]');
    if (!alvo) return;
    NAVEGACAO.forEach(function (grupo) {
      var paginas = grupo.paginas.filter(function (p) {
        return p.id;
      });
      alvo.appendChild(
        el('section', {
          class: 'doc-mapa__grupo',
          html:
            '<div class="doc-mapa__cabeca"><span class="doc-mapa__icone">' + icone(grupo.icone) + '</span>' +
            '<p class="doc-mapa__titulo">' + esc(grupo.titulo) + '</p>' +
            '<span class="badge badge-soft badge-neutral badge-sm">' + paginas.length + '</span></div>' +
            '<p class="doc-mapa__resumo">' + esc(grupo.resumo) + '</p>' +
            '<ul>' +
            paginas
              .map(function (p) {
                return '<li><a href="' + href(p.id) + '">' + esc(p.titulo) + '</a></li>';
              })
              .join('') +
            '</ul>'
        })
      );
    });
  }

  // ------------------------------------------------------------------------
  // 14. Search, a command palette in a modal dialog
  // ------------------------------------------------------------------------

  var indiceBusca = null;
  var carregandoIndice = false;

  var SUGESTOES = [
    'guia/instalacao',
    'guia/jsx',
    'guia/eventos',
    'referencia/directives',
    'referencia/objeto-v',
    'referencia/perguntas-frequentes'
  ];

  function carregarIndice() {
    if (indiceBusca || carregandoIndice) return;
    carregandoIndice = true;
    var script = document.createElement('script');
    script.src = new URL('assets/busca.js', RAIZ).href;
    script.onload = function () {
      indiceBusca = window.VOODOO_DOCS_BUSCA || [];
      indiceBusca.forEach(function (item) {
        item._chave = semAcento(item.t + ' ' + item.s + ' ' + item.e);
      });
      var campo = document.getElementById('doc-busca-campo');
      if (campo && campo.value.trim()) buscar(campo.value);
    };
    script.onerror = function () {
      indiceBusca = [];
    };
    document.head.appendChild(script);
  }

  function montarBusca() {
    var dialogo = el('dialog', {
      class: 'modal modal-top docs-search',
      id: 'doc-busca',
      'aria-label': 'Search the documentation',
      html:
        '<div class="command-palette">' +
        '<label class="command-palette-search">' +
        '<input type="search" id="doc-busca-campo" class="command-palette-input" placeholder="Search the documentation" ' +
        'autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="doc-busca-resultados" ' +
        'aria-autocomplete="list" aria-label="Search the documentation">' +
        '<kbd class="kbd kbd-xs">Esc</kbd></label>' +
        '<div class="command-palette-list" id="doc-busca-resultados" role="listbox" aria-label="Search results"></div>' +
        '<div class="command-palette-footer"><span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> to move</span>' +
        '<span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span>' +
        '<span class="docs-search-count" aria-live="polite"></span></div>' +
        '</div>'
    });

    var campo = dialogo.querySelector('input');
    var lista = dialogo.querySelector('.command-palette-list');

    campo.addEventListener('input', function () {
      buscar(campo.value);
    });

    campo.addEventListener('keydown', function (evento) {
      var itens = lista.querySelectorAll('.command-palette-item');
      if (!itens.length) return;
      var indice = -1;
      itens.forEach(function (item, i) {
        if (item.getAttribute('aria-selected') === 'true') indice = i;
      });
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        selecionar(itens, (indice + 1) % itens.length);
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        selecionar(itens, (indice - 1 + itens.length) % itens.length);
      } else if (evento.key === 'Enter') {
        evento.preventDefault();
        (itens[indice] || itens[0]).click();
      }
    });

    // A click on the dimmed area around the palette closes it, and so does
    // following a result, which may only move to an anchor on this page.
    dialogo.addEventListener('click', function (evento) {
      if (evento.target === dialogo || evento.target.closest('a')) dialogo.close();
    });
    dialogo.addEventListener('close', function () {
      var gatilho = document.querySelector('.docs-search-btn');
      if (gatilho && !location.hash) gatilho.focus();
    });

    return dialogo;
  }

  function abrirBusca() {
    var dialogo = document.getElementById('doc-busca');
    if (!dialogo) return;
    carregarIndice();
    var campo = document.getElementById('doc-busca-campo');
    if (!dialogo.open) {
      if (dialogo.showModal) dialogo.showModal();
      else dialogo.setAttribute('open', '');
    }
    buscar(campo.value);
    campo.focus();
    campo.select();
  }

  function selecionar(itens, indice) {
    var campo = document.getElementById('doc-busca-campo');
    itens.forEach(function (item, i) {
      if (i === indice) {
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
        if (campo) campo.setAttribute('aria-activedescendant', item.id);
      } else {
        item.removeAttribute('aria-selected');
      }
    });
  }

  function itemDeBusca(i, destino, titulo, caminho, trecho, nomeIcone) {
    return (
      '<a class="command-palette-item docs-hit" role="option" id="doc-hit-' + i + '" href="' + destino + '"' +
      (i === 0 ? ' aria-selected="true"' : '') + '>' +
      icone(nomeIcone) +
      '<span class="docs-hit-text"><span class="docs-hit-title">' + titulo + '</span>' +
      (caminho ? '<span class="docs-hit-path">' + caminho + '</span>' : '') +
      (trecho ? '<span class="docs-hit-snippet">' + trecho + '</span>' : '') +
      '</span>' + icone('arrow', 'docs-hit-go') + '</a>'
    );
  }

  function buscar(termo) {
    var lista = document.getElementById('doc-busca-resultados');
    var contagem = document.querySelector('.docs-search-count');
    if (!lista) return;
    var limpo = semAcento(termo).trim();

    if (limpo.length < 2) {
      lista.innerHTML =
        '<p class="command-palette-heading">Popular pages</p>' +
        SUGESTOES.map(function (id, i) {
          var pagina = LINEAR.filter(function (p) {
            return p.id === id;
          })[0];
          return itemDeBusca(i, href(id), esc(pagina.titulo), esc(pagina.grupo.titulo), '', pagina.grupo.icone);
        }).join('');
      if (contagem) contagem.textContent = '';
      return;
    }

    if (!indiceBusca) {
      lista.innerHTML = '<p class="command-palette-empty">Opening the spell book...</p>';
      carregarIndice();
      return;
    }

    var palavras = limpo.split(/\s+/);
    var achados = [];

    indiceBusca.forEach(function (item) {
      var pontos = 0;
      var todas = palavras.every(function (palavra) {
        var emTitulo = semAcento(item.t).indexOf(palavra) >= 0;
        var emSecao = semAcento(item.s).indexOf(palavra) >= 0;
        var emTexto = item._chave.indexOf(palavra) >= 0;
        if (emTitulo) pontos += 12;
        if (emSecao) pontos += 6;
        if (emTexto) pontos += 1;
        return emTitulo || emSecao || emTexto;
      });
      if (todas) achados.push({ item: item, pontos: pontos });
    });

    achados.sort(function (a, b) {
      return b.pontos - a.pontos;
    });
    achados = achados.slice(0, 12);

    if (!achados.length) {
      lista.innerHTML =
        '<div class="command-palette-empty docs-search-empty">' +
        '<img src="' + MASCOTE + 'vudu-thinking.svg" width="88" height="88" alt="">' +
        '<p><b>Nothing found for "' + esc(termo.trim()) + '".</b></p>' +
        '<p>Try a directive such as <code>v-model</code>, or a plain word like "fetch" or "theme".</p>' +
        '</div>';
      if (contagem) contagem.textContent = 'No results';
      return;
    }

    // Grouped by page, the pages in the order of their best result.
    var grupos = [];
    var porPagina = {};
    achados.forEach(function (achado) {
      var chave = achado.item.p;
      if (!porPagina[chave]) {
        porPagina[chave] = { titulo: achado.item.t, itens: [] };
        grupos.push(porPagina[chave]);
      }
      porPagina[chave].itens.push(achado.item);
    });

    var i = 0;
    lista.innerHTML = grupos
      .map(function (grupo) {
        return (
          '<p class="command-palette-heading">' + esc(grupo.titulo) + '</p>' +
          grupo.itens
            .map(function (item) {
              return itemDeBusca(
                i++,
                href(item.p) + (item.a ? '#' + item.a : ''),
                destacar(item.s || item.t, palavras),
                '',
                destacar(item.e, palavras),
                item.a ? 'braces' : 'book'
              );
            })
            .join('')
        );
      })
      .join('');
    if (contagem) contagem.textContent = achados.length + ' result' + (achados.length > 1 ? 's' : '');
  }

  function destacar(texto, palavras) {
    var saida = esc(texto || '');
    palavras.forEach(function (palavra) {
      if (palavra.length < 2) return;
      var alvo = semAcento(saida);
      var pos = alvo.indexOf(palavra);
      if (pos < 0) return;
      saida =
        saida.slice(0, pos) +
        '<mark>' +
        saida.slice(pos, pos + palavra.length) +
        '</mark>' +
        saida.slice(pos + palavra.length);
    });
    return saida;
  }

  // ------------------------------------------------------------------------
  // 15. Keyboard shortcuts
  // ------------------------------------------------------------------------

  function ligarAtalhos() {
    document.addEventListener('keydown', function (evento) {
      var ativo = document.activeElement;
      var digitando = !!ativo && (/^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) || ativo.isContentEditable);

      if ((evento.ctrlKey || evento.metaKey) && evento.key && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        var dialogo = document.getElementById('doc-busca');
        if (dialogo && dialogo.open) dialogo.close();
        else abrirBusca();
        return;
      }
      if (evento.key === '/' && !digitando) {
        evento.preventDefault();
        abrirBusca();
        return;
      }
      if (evento.key === 'Escape') {
        alternarMenu(false);
      }
    });

    document.addEventListener('click', function (evento) {
      var gatilho = evento.target.closest('[data-abrir-busca]');
      if (gatilho) {
        evento.preventDefault();
        abrirBusca();
      }
    });
  }

  // ------------------------------------------------------------------------
  // 16. Assembly
  // ------------------------------------------------------------------------

  function iniciar() {
    var artigo = document.querySelector('.doc-artigo');
    if (!artigo) return;

    var pagina = LINEAR[INDICE_ATUAL];

    // Keep the article aside before emptying the body.
    artigo.parentNode.removeChild(artigo);
    document.body.innerHTML = '';
    document.body.classList.add('docs-body');
    if (pagina) document.body.setAttribute('data-pagina', pagina.id || 'inicio');

    document.body.appendChild(
      el('a', { class: 'vd-skip btn btn-primary btn-sm', href: '#main', texto: 'Skip to content' })
    );
    document.body.appendChild(montarTopo());
    document.body.appendChild(montarSubbarra());

    vidro = el('div', { class: 'docs-scrim' });
    vidro.hidden = true;
    vidro.addEventListener('click', function () {
      alternarMenu(false);
    });

    var coluna = el('div', { class: 'docs-column' }, [artigo]);
    var grade = el('div', { class: 'docs-grid' }, [coluna]);
    var principal = el('main', { class: 'docs-main', id: 'main', tabindex: '-1' }, [grade]);
    var casca = el('div', { class: 'docs-shell' }, [montarMenu(), vidro, principal]);
    document.body.appendChild(casca);
    document.body.appendChild(montarRodape());
    document.body.appendChild(montarBusca());

    vestirArtigo(artigo);
    montarMapa(artigo);
    prepararCodigo(artigo);
    montarExemplos(artigo);
    grade.appendChild(montarIndice(artigo));
    ligarAncoras(artigo);

    var paginacao = montarPaginacao();
    if (paginacao) coluna.appendChild(paginacao);

    ligarTema();
    ligarAtalhos();

    // The current page in view inside the sidebar, which scrolls on its own.
    var menu = document.getElementById('doc-menu');
    var atual = menu && menu.querySelector('[aria-current="page"]');
    if (atual && atual.offsetTop > menu.clientHeight * 0.6) {
      menu.scrollTop = atual.offsetTop - menu.clientHeight / 3;
    }

    // Scroll to the anchor now that the content is in place.
    if (location.hash) {
      var alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (alvo)
        setTimeout(function () {
          alvo.scrollIntoView();
        }, 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
