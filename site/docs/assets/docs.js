/* ==========================================================================
   Voodoo.js documentation
   Navigation, search, on-this-page index, syntax highlighting and live
   examples. No external dependencies.

   The theme attribute is `data-tema`, with the values `claro` and `escuro`.
   That name is the existing contract across all 44 documentation pages, so it
   stays in Portuguese while everything a reader sees is English.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // 1. Page map. The single source of truth for the navigation.

  //    The ids are the file names on disk and stay in Portuguese; the titles
  //    are what a reader sees, so they are English.
  // ------------------------------------------------------------------------

  var NAVEGACAO = [
    {
      titulo: 'Getting started',
      paginas: [
        { id: '', titulo: 'Documentation', curto: 'Home' },
        { id: 'guia/o-que-e', titulo: 'What Voodoo.js is and when to use it' },
        { id: 'guia/instalacao', titulo: 'Installation and your first file' },
        { id: 'guia/modo-aplicacao', titulo: 'The two modes: attributes and createApp' }
      ]
    },
    {
      titulo: 'Fundamentals',
      paginas: [
        { id: 'guia/estado-e-escopo', titulo: 'State and scope with v-data' },
        { id: 'guia/mostrando-valores', titulo: 'Showing values on screen' },
        { id: 'guia/condicionais', titulo: 'Conditionals' },
        { id: 'guia/listas', titulo: 'Lists, and why the key matters' },
        { id: 'guia/eventos', titulo: 'Events and modifiers' },
        { id: 'guia/campos-e-v-model', titulo: 'Form fields with v-model' },
        { id: 'guia/atributos-classes-estilos', titulo: 'Attributes, classes and styles' }
      ]
    },
    {
      titulo: 'Data and forms',
      paginas: [
        { id: 'guia/buscando-dados', titulo: 'Fetching data from a server' },
        { id: 'guia/formularios', titulo: 'Forms that validate and submit themselves' },
        { id: 'guia/mascaras', titulo: 'Input masks' }
      ]
    },
    {
      titulo: 'Components and state',
      paginas: [
        { id: 'guia/componentes', titulo: 'Components: props, slots, events and lifecycle' },
        { id: 'guia/componentes-prontos', titulo: 'Built-in components' },
        { id: 'guia/stores', titulo: 'Global state with stores' },
        { id: 'guia/estado-persistente', titulo: 'State that persists, syncs and undoes' }
      ]
    },
    {
      titulo: 'Interface and effects',
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
      paginas: [
        { id: 'guia/directives-e-plugins', titulo: 'Custom directives and plugins' },
        { id: 'guia/inspetor', titulo: 'The reactivity inspector' },
        { id: 'guia/depurando', titulo: 'Debugging common problems' }
      ]
    },
    {
      titulo: 'Reference',
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

  // Flat list, used by the previous/next navigation.
  var LINEAR = [];
  NAVEGACAO.forEach(function (grupo) {
    grupo.paginas.forEach(function (pagina) {
      LINEAR.push(pagina);
    });
  });

  // ------------------------------------------------------------------------
  // 2. Paths
  // ------------------------------------------------------------------------

  var esteScript =
    document.currentScript ||
    (function () {
      var lista = document.getElementsByTagName('script');
      return lista[lista.length - 1];
    })();

  var RAIZ = new URL('../', esteScript.src); // .../site/docs/
  var RUNTIME = new URL('../voodoo.full.min.js?v=758edb1c', RAIZ).href; // .../site/voodoo.full.min.js

  // One level above the documentation is the site itself. Resolving it from
  // the script URL rather than from location means the header links work the
  // same from /docs/, /docs/guia/ and /docs/referencia/.
  // .href, not .pathname. On a file:// URL, .pathname is an absolute path that
  // starts with a slash ("/C:/Users/.../site/"), and a browser resolves an href
  // like that from the filesystem root — so every link in the header pointed at
  // nothing and the page looked broken when opened straight off disk. A full
  // href works under both file:// and http://.
  var SITE = new URL('../', RAIZ).href; // .../site/

  // The rest of the site links back here, and now the documentation links out.
  // Before this the docs were an island: nothing in the header led home, to the
  // playground, to the components or to the examples.
  var LINKS_DO_SITE = [
    { href: SITE, texto: 'Home' },
    { href: SITE + 'playground.html', texto: 'Playground' },
    { href: SITE + 'components.html', texto: 'Components' },
    { href: SITE + 'examples/', texto: 'Examples' }
  ];

  // The same mark the landing page draws, inline and painted with currentColor
  // so it follows the theme instead of needing a second file per theme.
  var MARCA =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5h6.4l5.6 15.2L21.6 5H28L18.8 28h-5.6L4 5z" fill="currentColor"/></svg>';

  /** A link to a documentation page, absolute enough to work from any depth. */
  function href(id) {
    return id ? RAIZ.href + id + '.html' : RAIZ.href;
  }

  /**
   * Which page is open, derived by comparing full URLs rather than paths.
   *
   * Comparing location.pathname against RAIZ.pathname looks equivalent and is
   * not: under file:// both carry a drive letter and percent-encoding that do
   * not always match byte for byte, so the highlight silently stopped working
   * off disk. Comparing hrefs, with the query and hash stripped, is the same
   * comparison without that trap.
   */
  function idAtual() {
    var base = RAIZ.href;
    var aqui = decodeURIComponent(location.href.split('#')[0].split('?')[0]);
    var raiz = decodeURIComponent(base);
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

  function tag(classe, texto) {
    return '<span class="' + classe + '">' + esc(texto) + '</span>';
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
      node.appendChild(filho);
    });
    return node;
  }

  function semAcento(texto) {
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  var ICONES = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    fechar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    sol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
    lua: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
    lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    copiar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
  };

  // ------------------------------------------------------------------------
  // 4. Theme
  //
  //    Three states, the same shape the stylesheet uses: the system preference
  //    governs until the reader picks a theme, and an explicit choice then wins
  //    in both directions.
  //
  //    This used to read `data-tema !== "claro" ? "escuro"`, so on a light
  //    system with no saved choice it resolved to dark, pinned data-tema
  //    ="escuro" on the document and wrote that to storage on the very first
  //    load. The page went dark, the reader never asked for it, and the live
  //    example inside the iframe went dark with it while the library's own
  //    palette stayed on the light defaults it picks from prefers-color-scheme
  //    — a white result pane on a dark page.
  // ------------------------------------------------------------------------

  var CHAVE_TEMA = 'voodoo-docs-tema';

  function temaSalvo() {
    try {
      var valor = localStorage.getItem(CHAVE_TEMA);
      return valor === 'claro' || valor === 'escuro' ? valor : null;
    } catch (erro) {
      return null; /* private mode */
    }
  }

  function temaDoSistema() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'escuro'
      : 'claro';
  }

  // The theme actually painted right now: the explicit attribute if the page
  // carries one, then the reader's saved choice, then the system.
  function temaAtual() {
    var marcado = document.documentElement.getAttribute('data-tema');
    if (marcado === 'claro' || marcado === 'escuro') return marcado;
    return temaSalvo() || temaDoSistema();
  }

  // Sets the attribute and remembers the choice. Only the toggle calls this.
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch (erro) {
      /* private mode, carry on without persisting */
    }
    sincronizarTema();
  }

  // Repaints everything that depends on the theme without touching the
  // document attribute, so a reader who never chose keeps following the system.
  function sincronizarTema() {
    var tema = temaAtual();
    var botao = document.getElementById('doc-tema');
    if (botao) {
      var claro = tema === 'claro';
      var rotulo = claro ? 'Switch to dark theme' : 'Switch to light theme';
      botao.innerHTML = claro ? ICONES.lua : ICONES.sol;
      botao.setAttribute('aria-label', rotulo);
      botao.setAttribute('title', rotulo);
    }
    document.querySelectorAll('iframe[data-palco]').forEach(function (quadro) {
      try {
        quadro.contentDocument.documentElement.setAttribute('data-tema', tema);
      } catch (erro) {
        /* still loading */
      }
    });
  }

  function ligarTema() {
    // A saved choice is the reader's own explicit decision, so pin it on the
    // document. Without a saved choice nothing is written and the stylesheet's
    // prefers-color-scheme block governs.
    var salvo = temaSalvo();
    if (salvo) document.documentElement.setAttribute('data-tema', salvo);

    if (window.matchMedia) {
      var consulta = window.matchMedia('(prefers-color-scheme: dark)');
      var aoMudar = function () {
        if (!document.documentElement.hasAttribute('data-tema')) sincronizarTema();
      };
      if (consulta.addEventListener) consulta.addEventListener('change', aoMudar);
      else if (consulta.addListener) consulta.addListener(aoMudar);
    }

    sincronizarTema();
  }

  // ------------------------------------------------------------------------
  // 5. Syntax highlighting
  // ------------------------------------------------------------------------

  var PALAVRAS_JS =
    /^(const|let|var|function|return|if|else|for|while|of|in|new|class|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|this|null|undefined|true|false|delete|void|switch|case|break|continue|do|extends|super|static)$/;

  function realceHtml(fonte) {
    var re = /<!--[\s\S]*?-->|<![a-zA-Z][^>]*>|<\/?[a-zA-Z][^>]*>|\{\{[\s\S]*?\}\}|\{[^{}<>\n]*\}/g;
    var saida = '';
    var ultimo = 0;
    var achado;
    while ((achado = re.exec(fonte)) !== null) {
      saida += esc(fonte.slice(ultimo, achado.index));
      var pedaco = achado[0];
      if (pedaco.slice(0, 4) === '<!--') saida += tag('tk-comentario', pedaco);
      else if (pedaco.slice(0, 2) === '<!') saida += tag('tk-tag', pedaco);
      else if (pedaco.charAt(0) === '<') saida += realceTag(pedaco);
      else saida += tag('tk-interp', pedaco);
      ultimo = re.lastIndex;
    }
    return saida + esc(fonte.slice(ultimo));
  }

  function realceTag(fonte) {
    var cabeca = /^(<\/?)([a-zA-Z][\w:.-]*)([\s\S]*)$/.exec(fonte);
    if (!cabeca) return esc(fonte);
    var saida = tag('tk-pontuacao', cabeca[1]) + tag('tk-tag', cabeca[2]);
    var resto = cabeca[3];
    var re = /"[^"]*"|'[^']*'|[@:.]?[A-Za-z_][\w:.-]*|\/?>|=|[\s\S]/g;
    var peca;
    while ((peca = re.exec(resto)) !== null) {
      var texto = peca[0];
      var inicial = texto.charAt(0);
      if (inicial === '"' || inicial === "'") saida += realceValorAtributo(texto);
      else if (texto === '>' || texto === '/>' || texto === '=') saida += tag('tk-pontuacao', texto);
      else if (/^[A-Za-z@:._-]/.test(inicial)) {
        if (/^(v-|@|:|\.)/.test(texto)) saida += tag('tk-directive', texto);
        else saida += tag('tk-atributo', texto);
      } else saida += esc(texto);
    }
    return saida;
  }

  function realceValorAtributo(texto) {
    var aspas = texto.charAt(0);
    var miolo = texto.slice(1, -1);
    var partes = miolo.split(/(\$[A-Za-z_]\w*)/g);
    var saida = tag('tk-texto', aspas);
    partes.forEach(function (parte) {
      if (!parte) return;
      if (parte.charAt(0) === '$') saida += tag('tk-magia', parte);
      else saida += tag('tk-texto', parte);
    });
    return saida + tag('tk-texto', aspas);
  }

  function realceJs(fonte) {
    var re =
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`\\])*`|'(?:\\[\s\S]|[^'\\\n])*'|"(?:\\[\s\S]|[^"\\\n])*"|\b\d[\w.]*\b|\$[A-Za-z_]\w*|\b[A-Za-z_$][\w$]*\b|[{}()[\];,]/g;
    var saida = '';
    var ultimo = 0;
    var achado;
    while ((achado = re.exec(fonte)) !== null) {
      saida += esc(fonte.slice(ultimo, achado.index));
      var texto = achado[0];
      var inicial = texto.charAt(0);
      if (texto.slice(0, 2) === '//' || texto.slice(0, 2) === '/*') saida += tag('tk-comentario', texto);
      else if (inicial === '`' || inicial === "'" || inicial === '"') saida += tag('tk-texto', texto);
      else if (/^\d/.test(texto)) saida += tag('tk-numero', texto);
      else if (inicial === '$') saida += tag('tk-magia', texto);
      else if (PALAVRAS_JS.test(texto)) saida += tag('tk-palavra', texto);
      else if (/^[{}()[\];,]$/.test(texto)) saida += tag('tk-pontuacao', texto);
      else if (fonte.slice(re.lastIndex).charAt(0) === '(') saida += tag('tk-funcao', texto);
      else if (texto === 'V') saida += tag('tk-magia', texto);
      else saida += esc(texto);
      ultimo = re.lastIndex;
    }
    return saida + esc(fonte.slice(ultimo));
  }

  function realceCss(fonte) {
    var re =
      /\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|@[\w-]+|--[\w-]+|#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|s|ms|vh|vw|fr|deg)?\b|[-\w]+(?=\s*:)|[{}();,:]/g;
    var saida = '';
    var ultimo = 0;
    var achado;
    while ((achado = re.exec(fonte)) !== null) {
      saida += tag('tk-seletor', fonte.slice(ultimo, achado.index));
      var texto = achado[0];
      if (texto.slice(0, 2) === '/*') saida += tag('tk-comentario', texto);
      else if (/^["']/.test(texto)) saida += tag('tk-texto', texto);
      else if (/^[#\d]/.test(texto)) saida += tag('tk-numero', texto);
      else if (/^[{}();,:]$/.test(texto)) saida += tag('tk-pontuacao', texto);
      else if (texto.charAt(0) === '@' || texto.slice(0, 2) === '--') saida += tag('tk-magia', texto);
      else saida += tag('tk-propriedade', texto);
      ultimo = re.lastIndex;
    }
    return saida + tag('tk-seletor', fonte.slice(ultimo));
  }

  function realceBash(fonte) {
    var re = /#[^\n]*|"[^"]*"|'[^']*'|(?:^|\n)\s*[\w./-]+|\s-{1,2}[\w-]+/g;
    var saida = '';
    var ultimo = 0;
    var achado;
    while ((achado = re.exec(fonte)) !== null) {
      saida += esc(fonte.slice(ultimo, achado.index));
      var texto = achado[0];
      if (texto.trimStart().charAt(0) === '#') saida += tag('tk-comentario', texto);
      else if (/^["']/.test(texto)) saida += tag('tk-texto', texto);
      else if (/-{1,2}[\w-]+$/.test(texto)) saida += tag('tk-numero', texto);
      else saida += tag('tk-funcao', texto);
      ultimo = re.lastIndex;
    }
    return saida + esc(fonte.slice(ultimo));
  }

  function realcar(fonte, idioma) {
    try {
      if (idioma === 'html') return realceHtml(fonte);
      if (idioma === 'js' || idioma === 'javascript' || idioma === 'ts') return realceJs(fonte);
      if (idioma === 'css') return realceCss(fonte);
      if (idioma === 'bash' || idioma === 'shell') return realceBash(fonte);
    } catch (erro) {
      /* qualquer falha cai no texto puro */
    }
    return esc(fonte);
  }

  var ROTULOS = {
    html: 'html',
    js: 'javascript',
    javascript: 'javascript',
    css: 'css',
    bash: 'terminal',
    shell: 'terminal',
    txt: 'text'
  };

  // ------------------------------------------------------------------------
  // 6. Code blocks: label, highlighting and copy button
  // ------------------------------------------------------------------------

  function prepararCodigo(raiz) {
    (raiz || document).querySelectorAll('pre[data-lang]').forEach(function (pre) {
      if (pre.closest('.doc-bloco-codigo')) return;

      var codigo = pre.querySelector('code') || pre;
      var fonte = codigo.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var idioma = pre.getAttribute('data-lang') || 'txt';

      codigo.innerHTML = realcar(fonte, idioma);

      var caixa = el('div', { class: 'doc-bloco-codigo' });
      pre.parentNode.insertBefore(caixa, pre);
      caixa.appendChild(pre);

      caixa.appendChild(
        el('span', { class: 'doc-bloco-codigo__rotulo', texto: ROTULOS[idioma] || idioma })
      );

      var botao = el('button', {
        type: 'button',
        class: 'doc-copiar',
        'aria-label': 'Copy the code',
        html: ICONES.copiar + '<span>Copy</span>'
      });
      botao.addEventListener('click', function () {
        copiar(fonte).then(function (deuCerto) {
          botao.innerHTML = deuCerto
            ? ICONES.ok + '<span>Copied</span>'
            : ICONES.copiar + '<span>Failed</span>';
          botao.setAttribute('data-estado', deuCerto ? 'ok' : 'erro');
          setTimeout(function () {
            botao.innerHTML = ICONES.copiar + '<span>Copy</span>';
            botao.removeAttribute('data-estado');
          }, 1800);
        });
      });
      caixa.appendChild(botao);
      caixa.setAttribute('data-fonte', '');
      caixa.__fonte = fonte;
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
  // 7. Live examples
  // ------------------------------------------------------------------------

  // The stage is a separate document, so it needs the design system in full.
  // Three states in the same shape as docs.css, and then the library's own
  // --v-* tokens pointed at those. Every colour below is a token: the previous
  // version hardcoded a dark violet palette here, which is why a stage could
  // not follow the page.
  var TOKENS_IFRAME =
    ':root{' +
    '--ink:#16141c;--ink-soft:#57526a;--ink-faint:#8b8598;' +
    '--bg:#ffffff;--bg-soft:#faf9fb;--bg-code:#f6f5f8;--line:#e7e4ec;' +
    '--accent:#5b2ee5;--accent-soft:#f1ecfe;--fill:#e9e6f0;' +
    'color-scheme:light}' +
    // Two attributes, because two things write the theme in here.
    //
    // The shell stamps `data-tema` on the frame when it builds it, carrying the
    // page's theme in. The library writes `data-theme` when something inside
    // the frame changes it — which is exactly what the v-theme-toggle example
    // on the theme page does. Keying only on `data-tema` meant that button set
    // an attribute nothing listened to: it flipped the state, the text said the
    // theme had changed, and not one colour moved.
    '@media (prefers-color-scheme:dark){' +
    'html:root:not([data-tema="claro"]):not([data-theme="light"]){' +
    '--ink:#f2f0f6;--ink-soft:#b3adc2;--ink-faint:#837d93;' +
    '--bg:#131118;--bg-soft:#191722;--bg-code:#1d1a26;--line:#2b2735;' +
    '--accent:#a688ff;--accent-soft:#221c3a;--fill:#2f2b3d;' +
    'color-scheme:dark}}' +
    'html:root[data-tema="escuro"],html:root[data-theme="dark"]{' +
    '--ink:#f2f0f6;--ink-soft:#b3adc2;--ink-faint:#837d93;' +
    '--bg:#131118;--bg-soft:#191722;--bg-code:#1d1a26;--line:#2b2735;' +
    '--accent:#a688ff;--accent-soft:#221c3a;--fill:#2f2b3d;' +
    'color-scheme:dark}' +
    // An explicit light choice has to beat the system as well, or the toggle
    // only works in one direction on a machine set to dark.
    'html:root[data-theme="light"]{' +
    '--ink:#16141c;--ink-soft:#57526a;--ink-faint:#8b8598;' +
    '--bg:#ffffff;--bg-soft:#faf9fb;--bg-code:#f6f5f8;--line:#e7e4ec;' +
    '--accent:#5b2ee5;--accent-soft:#f1ecfe;--fill:#e9e6f0;' +
    'color-scheme:light}' +
    // The library injects :root{--v-surface:#fff;...} into this document's
    // <head> and only darkens it for prefers-color-scheme or [data-theme].
    // It never sees data-tema, so a reader on a light system who chose the
    // dark theme got white component surfaces on a dark stage. !important is
    // required: V.palette() writes :root:not([data-theme="light"]), which
    // outranks any plain selector, and html:root beats the plain :root the
    // library appends later in source order.
    // --v-surface-3 has no default at all — the progress track, the skeleton
    // fill and the switch rail paint with it and render invisible unmapped.
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
    'body{margin:0;padding:16px;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",' +
    'Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}' +
    // Not transparent. The frame's text is painted with the frame's own --ink,
    // and a transparent body puts it on the card's background instead of its
    // own. When the two resolve different themes -- which they can, since the
    // frame decides its theme from an attribute the shell stamps and the page
    // decides its own -- the result is dark text on a dark card, invisible. A
    // frame that paints its own surface cannot land in that state.

    '[v-cloak]{display:none!important}' +
    'h1,h2,h3,h4,p,ul,ol{margin:0 0 .6rem}' +
    'ul,ol{padding-left:1.2rem}' +
    'button{font:inherit;padding:.4rem .8rem;border:1px solid var(--line);border-radius:7px;' +
    'background:var(--bg-soft);color:var(--ink);cursor:pointer}' +
    'button:hover{border-color:var(--accent)}' +
    'input,select,textarea{font:inherit;padding:.4rem .6rem;border:1px solid var(--line);' +
    'border-radius:7px;background:var(--bg);color:var(--ink);max-width:100%}' +
    'input:focus,select:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:1px}' +
    'input[type=checkbox],input[type=radio]{width:auto;accent-color:var(--accent)}' +
    'label{display:inline-flex;align-items:center;gap:.4rem}' +
    'table{border-collapse:collapse;width:100%;font-size:.9rem}' +
    'th,td{padding:.35rem .5rem;border-bottom:1px solid var(--line);text-align:left}' +
    'code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:.9em}' +
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
      var bloco = exemplo.querySelector('.doc-bloco-codigo');
      if (!bloco) return;

      var fonte = bloco.__fonte || '';
      exemplo.classList.add('doc-exemplo');

      var cabecalho = el('div', {
        class: 'doc-exemplo__cabecalho',
        html: 'Live example <b>&#9679;</b> really runs on this page'
      });

      var corpo = el('div', { class: 'doc-exemplo__corpo' });
      var colunaCodigo = el('div', { class: 'doc-exemplo__codigo' });
      var palco = el('div', { class: 'doc-exemplo__palco' });

      exemplo.insertBefore(cabecalho, exemplo.firstChild);
      exemplo.appendChild(corpo);
      corpo.appendChild(colunaCodigo);
      corpo.appendChild(palco);
      colunaCodigo.appendChild(bloco);

      palco.__fonte = fonte;
      if (observador) observador.observe(palco);
      else carregarPalco(palco);
    });
  }

  function carregarPalco(palco) {
    var quadro = el('iframe', {
      'data-palco': '',
      title: 'Example result',
      loading: 'lazy'
    });
    palco.appendChild(quadro);

    var documento =
      '<!doctype html><html lang="en" data-tema="' +
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

    quadro.srcdoc = documento;

    quadro.addEventListener('load', function () {
      ajustarAltura(quadro);
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
        /* segue com a altura medida uma vez */
      }
      setTimeout(function () {
        ajustarAltura(quadro);
      }, 400);
    });
  }

  /**
   * Sizes the frame to its content.
   *
   * The measurement has to happen with the frame collapsed. `scrollHeight` is
   * read from inside a frame that already carries the previous measurement, so
   * the body reports at least the height it was given: adding 8 to that made
   * every measurement 8px taller than the last, and the card crept upward on
   * each click, each keystroke and each resize observation. Interacting with an
   * example grew it without limit.
   *
   * Setting the height to 0 first forces the body to collapse onto its own
   * content, so what comes back is the content's height rather than an echo of
   * the frame's. The two writes land in one layout pass, so nothing flickers.
   */
  function ajustarAltura(quadro) {
    try {
      var doc = quadro.contentDocument;
      if (!doc || !doc.body) return;

      var anterior = quadro.style.height;
      quadro.style.height = '0px';
      var altura = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight || 0);
      var proxima = Math.max(altura + 8, 96) + 'px';

      // Avoid writing an identical value: a no-op write still invalidates
      // layout, and the ResizeObserver watching the body would see it.
      quadro.style.height = proxima === anterior ? anterior : proxima;
    } catch (erro) {
      quadro.style.height = '220px';
    }
  }

  // ------------------------------------------------------------------------
  // 8. Header
  // ------------------------------------------------------------------------

  function montarTopo() {
    var topo = el('header', { class: 'doc-topo' });

    var botaoMenu = el('button', {
      type: 'button',
      class: 'doc-botao-icone doc-topo__menu-btn',
      id: 'doc-abrir-menu',
      'aria-label': 'Open the navigation menu',
      'aria-expanded': 'false',
      'aria-controls': 'doc-menu',
      html: ICONES.menu
    });
    topo.appendChild(botaoMenu);

    var marca = el('a', {
      class: 'doc-topo__marca',
      href: href(''),
      html:
        MARCA +
        '<span>Voodoo.js</span>' +
        '<span class="doc-topo__etiqueta">Docs</span>'
    });
    topo.appendChild(marca);

    topo.appendChild(montarNavegacaoDoSite());
    topo.appendChild(el('div', { class: 'doc-topo__espaco' }));
    topo.appendChild(montarBusca());

    var acoes = el('div', { class: 'doc-topo__acoes' });
    var tema = el('button', {
      type: 'button',
      class: 'doc-botao-icone',
      id: 'doc-tema',
      'aria-label': 'Switch theme'
    });
    tema.addEventListener('click', function () {
      aplicarTema(temaAtual() === 'claro' ? 'escuro' : 'claro');
    });
    acoes.appendChild(tema);

    acoes.appendChild(
      el('a', {
        class: 'doc-botao-icone',
        href: 'https://github.com/kwy404/Voodoo.js',
        rel: 'noopener',
        target: '_blank',
        'aria-label': 'Repository on GitHub',
        title: 'Repository on GitHub',
        html:
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>'
      })
    );
    topo.appendChild(acoes);

    botaoMenu.addEventListener('click', function () {
      alternarMenu(true);
    });

    return topo;
  }

  function montarNavegacaoDoSite(classe, rotulo) {
    var nav = el('nav', {
      class: classe || 'doc-topo__site',
      'aria-label': rotulo || 'Site'
    });
    LINKS_DO_SITE.forEach(function (link) {
      nav.appendChild(el('a', { href: link.href, texto: link.texto }));
    });
    return nav;
  }

  // ------------------------------------------------------------------------
  // 9. Sidebar
  // ------------------------------------------------------------------------

  var vidro;

  function montarMenu() {
    var menu = el('nav', {
      class: 'doc-menu',
      id: 'doc-menu',
      'aria-label': 'Documentation pages'
    });

    var fechar = el('button', {
      type: 'button',
      class: 'doc-botao-icone doc-menu__fechar',
      'aria-label': 'Close the menu',
      html: ICONES.fechar
    });
    fechar.addEventListener('click', function () {
      alternarMenu(false);
    });
    menu.appendChild(fechar);

    // Below 1080px the header has no room for the site links, so they ride
    // along in the drawer. CSS decides which of the two copies is visible.
    menu.appendChild(montarNavegacaoDoSite('doc-menu__site', 'Site, in the drawer'));

    var contador = 0;
    NAVEGACAO.forEach(function (grupo) {
      var bloco = el('div', { class: 'doc-menu__grupo' });
      bloco.appendChild(el('h2', { class: 'doc-menu__titulo', texto: grupo.titulo }));
      var lista = el('ul', { class: 'doc-menu__lista' });

      grupo.paginas.forEach(function (pagina) {
        var item = el('li');
        var atual = pagina.id === ATUAL;
        var numero = pagina.id.indexOf('guia/') === 0 ? ++contador : null;
        var link = el('a', {
          class: 'doc-menu__link',
          href: href(pagina.id),
          'aria-current': atual ? 'page' : null,
          html:
            (numero ? '<span class="doc-menu__numero">' + numero + '.</span> ' : '') +
            esc(pagina.curto || pagina.titulo)
        });
        item.appendChild(link);
        lista.appendChild(item);
      });

      bloco.appendChild(lista);
      menu.appendChild(bloco);
    });

    return menu;
  }

  function alternarMenu(abrir) {
    var menu = document.getElementById('doc-menu');
    var botao = document.getElementById('doc-abrir-menu');
    if (!menu) return;
    if (abrir) {
      menu.setAttribute('data-aberto', 'sim');
      botao.setAttribute('aria-expanded', 'true');
      if (vidro) vidro.hidden = false;
      var primeiro = menu.querySelector('.doc-menu__fechar');
      if (primeiro) primeiro.focus();
    } else {
      menu.removeAttribute('data-aberto');
      botao.setAttribute('aria-expanded', 'false');
      if (vidro) vidro.hidden = true;
    }
  }

  // ------------------------------------------------------------------------
  // 10. On this page
  // ------------------------------------------------------------------------

  function montarIndice(artigo) {
    var aside = el('aside', { class: 'doc-indice', 'aria-label': 'On this page' });
    var titulos = artigo.querySelectorAll('h2[id], h3[id]');
    if (titulos.length < 2) return aside;

    aside.appendChild(el('h2', { class: 'doc-indice__titulo', texto: 'On this page' }));
    var lista = el('ul', { class: 'doc-indice__lista' });

    titulos.forEach(function (titulo) {
      var item = el('li');
      item.appendChild(
        el('a', {
          class: 'doc-indice__link' + (titulo.tagName === 'H3' ? ' doc-indice__link--n3' : ''),
          href: '#' + titulo.id,
          'data-para': titulo.id,
          texto: titulo.textContent.replace(/#$/, '').trim()
        })
      );
      lista.appendChild(item);
    });

    aside.appendChild(lista);
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

        aside.querySelectorAll('.doc-indice__link').forEach(function (link) {
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
  // 11. Heading anchors
  // ------------------------------------------------------------------------

  function ligarAncoras(artigo) {
    artigo.querySelectorAll('h2[id], h3[id]').forEach(function (titulo) {
      if (titulo.querySelector('.doc-ancora')) return;
      var ancora = el('a', {
        class: 'doc-ancora',
        href: '#' + titulo.id,
        'aria-label': 'Direct link to the section ' + titulo.textContent.trim(),
        texto: '#'
      });
      titulo.appendChild(ancora);
    });
  }

  // ------------------------------------------------------------------------
  // 12. Previous and next page
  // ------------------------------------------------------------------------

  function montarPaginacao() {
    if (INDICE_ATUAL < 0) return null;
    var anterior = LINEAR[INDICE_ATUAL - 1];
    var proxima = LINEAR[INDICE_ATUAL + 1];
    if (!anterior && !proxima) return null;

    var nav = el('nav', { class: 'doc-paginacao', 'aria-label': 'Neighbouring pages' });

    if (anterior) {
      nav.appendChild(
        el('a', {
          class: 'doc-paginacao__link doc-paginacao__link--anterior',
          href: href(anterior.id),
          rel: 'prev',
          html:
            '<span class="doc-paginacao__rotulo">Previous</span>' +
            '<span class="doc-paginacao__titulo">' +
            esc(anterior.titulo) +
            '</span>'
        })
      );
    }

    if (proxima) {
      nav.appendChild(
        el('a', {
          class: 'doc-paginacao__link doc-paginacao__link--proxima',
          href: href(proxima.id),
          rel: 'next',
          html:
            '<span class="doc-paginacao__rotulo">Next</span>' +
            '<span class="doc-paginacao__titulo">' +
            esc(proxima.titulo) +
            '</span>'
        })
      );
    }

    return nav;
  }

  function montarRodape() {
    return el('footer', {
      class: 'doc-rodape',
      html:
        '<p>Voodoo.js 0.6.2 &#183; documentation.</p>' +
        '<p><a href="' +
        SITE +
        '">Home</a> &#183; ' +
        '<a href="' +
        SITE +
        'examples/">Examples</a> &#183; ' +
        '<a href="https://github.com/kwy404/Voodoo.js">Repository</a> &#183; ' +
        '<a href="https://github.com/kwy404/Voodoo.js/releases/tag/v0.5.0">Release notes</a> &#183; ' +
        '<a href="' +
        href('referencia/perguntas-frequentes') +
        '">Frequently asked questions</a></p>'
    });
  }

  // ------------------------------------------------------------------------
  // 13. Search
  // ------------------------------------------------------------------------

  var indiceBusca = null;
  var carregandoIndice = false;

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
    var caixa = el('div', { class: 'doc-busca', role: 'search' });

    caixa.appendChild(el('span', { class: 'doc-busca__lupa', html: ICONES.lupa }));

    var campo = el('input', {
      type: 'search',
      id: 'doc-busca-campo',
      class: 'doc-busca__campo',
      placeholder: 'Search the documentation...',
      autocomplete: 'off',
      role: 'combobox',
      'aria-expanded': 'false',
      'aria-controls': 'doc-busca-resultados',
      'aria-autocomplete': 'list',
      'aria-label': 'Search the documentation'
    });

    var resultados = el('ul', {
      class: 'doc-busca__resultados',
      id: 'doc-busca-resultados',
      role: 'listbox',
      'aria-label': 'Search results'
    });
    resultados.hidden = true;

    caixa.appendChild(campo);
    caixa.appendChild(resultados);

    campo.addEventListener('focus', carregarIndice);
    campo.addEventListener('input', function () {
      buscar(campo.value);
    });

    campo.addEventListener('keydown', function (evento) {
      var itens = resultados.querySelectorAll('.doc-busca__link');
      if (evento.key === 'Escape') {
        fecharBusca();
        campo.blur();
        return;
      }
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
      } else if (evento.key === 'Enter' && indice >= 0) {
        evento.preventDefault();
        itens[indice].click();
      }
    });

    document.addEventListener('click', function (evento) {
      if (!caixa.contains(evento.target)) fecharBusca();
    });

    return caixa;
  }

  function selecionar(itens, indice) {
    itens.forEach(function (item, i) {
      if (i === indice) {
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.removeAttribute('aria-selected');
      }
    });
  }

  function fecharBusca() {
    var lista = document.getElementById('doc-busca-resultados');
    var campo = document.getElementById('doc-busca-campo');
    if (lista) lista.hidden = true;
    if (campo) campo.setAttribute('aria-expanded', 'false');
  }

  function buscar(termo) {
    var lista = document.getElementById('doc-busca-resultados');
    var campo = document.getElementById('doc-busca-campo');
    if (!lista) return;

    var limpo = semAcento(termo).trim();
    if (limpo.length < 2) {
      fecharBusca();
      lista.innerHTML = '';
      return;
    }

    carregarIndice();
    if (!indiceBusca) return;

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

    lista.innerHTML = '';
    if (!achados.length) {
      lista.appendChild(
        el('li', {
          class: 'doc-busca__vazio',
          texto: 'Nothing found for "' + termo.trim() + '".'
        })
      );
    } else {
      achados.forEach(function (achado) {
        var item = achado.item;
        var li = el('li', { role: 'presentation' });
        li.appendChild(
          el('a', {
            class: 'doc-busca__link',
            role: 'option',
            href: href(item.p) + (item.a ? '#' + item.a : ''),
            html:
              '<span class="doc-busca__titulo">' +
              destacar(item.s || item.t, palavras) +
              '</span>' +
              '<span class="doc-busca__caminho">' +
              esc(item.t) +
              '</span>' +
              '<span class="doc-busca__trecho">' +
              destacar(item.e, palavras) +
              '</span>'
          })
        );
        lista.appendChild(li);
      });
    }

    lista.hidden = false;
    if (campo) campo.setAttribute('aria-expanded', 'true');
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
        '<mark class="doc-busca__marca">' +
        saida.slice(pos, pos + palavra.length) +
        '</mark>' +
        saida.slice(pos + palavra.length);
    });
    return saida;
  }

  // ------------------------------------------------------------------------
  // 14. Keyboard shortcuts
  // ------------------------------------------------------------------------

  function ligarAtalhos() {
    document.addEventListener('keydown', function (evento) {
      var campo = document.getElementById('doc-busca-campo');
      var ativo = document.activeElement;
      var digitando = !!ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName);

      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        if (campo) campo.focus();
        return;
      }
      if (evento.key === '/' && !digitando) {
        evento.preventDefault();
        if (campo) campo.focus();
        return;
      }
      if (evento.key === 'Escape') {
        alternarMenu(false);
      }
    });
  }

  // ------------------------------------------------------------------------
  // 15. Assembly
  // ------------------------------------------------------------------------

  function iniciar() {
    var artigo = document.querySelector('.doc-artigo');
    if (!artigo) return;

    var pagina = LINEAR[INDICE_ATUAL];
    var conteudo = el('main', { class: 'doc-conteudo', id: 'conteudo', tabindex: '-1' });
    var layout = el('div', { class: 'doc-layout' });

    // Keep the article aside before emptying the body.
    artigo.parentNode.removeChild(artigo);
    document.body.innerHTML = '';

    document.body.appendChild(
      el('a', { class: 'pular-para-conteudo', href: '#conteudo', texto: 'Skip to content' })
    );
    document.body.appendChild(montarTopo());

    vidro = el('div', { class: 'doc-vidro' });
    vidro.hidden = true;
    vidro.addEventListener('click', function () {
      alternarMenu(false);
    });
    document.body.appendChild(vidro);

    layout.appendChild(montarMenu());
    layout.appendChild(conteudo);
    conteudo.appendChild(artigo);
    document.body.appendChild(layout);

    prepararCodigo(artigo);
    montarExemplos(artigo);
    ligarAncoras(artigo);

    var paginacao = montarPaginacao();
    if (paginacao) conteudo.appendChild(paginacao);
    conteudo.appendChild(montarRodape());

    layout.appendChild(montarIndice(artigo));

    ligarTema();
    ligarAtalhos();

    if (pagina) document.body.setAttribute('data-pagina', pagina.id || 'inicio');

    // Scroll to the anchor now that the content is in place.
    if (location.hash) {
      var alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (alvo) setTimeout(function () {
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
