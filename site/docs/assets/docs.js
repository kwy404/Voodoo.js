/* ==========================================================================
   Documentação da Voodoo.js
   Navegação, busca, índice lateral, realce de sintaxe e exemplos ao vivo.
   Sem nenhuma dependência externa.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // 1. Mapa de páginas. É a única fonte de verdade da navegação.
  // ------------------------------------------------------------------------

  var NAVEGACAO = [
    {
      titulo: 'Começando',
      paginas: [
        { id: '', titulo: 'Documentação', curto: 'Início' },
        { id: 'guia/o-que-e', titulo: 'O que é a Voodoo.js e quando usar' },
        { id: 'guia/instalacao', titulo: 'Instalação e primeiro arquivo' }
      ]
    },
    {
      titulo: 'Fundamentos',
      paginas: [
        { id: 'guia/estado-e-escopo', titulo: 'Estado e escopo com v-data' },
        { id: 'guia/mostrando-valores', titulo: 'Mostrando valores na tela' },
        { id: 'guia/condicionais', titulo: 'Condicionais' },
        { id: 'guia/listas', titulo: 'Listas e por que a chave importa' },
        { id: 'guia/eventos', titulo: 'Eventos e modificadores' },
        { id: 'guia/campos-e-v-model', titulo: 'Campos de formulário com v-model' },
        { id: 'guia/atributos-classes-estilos', titulo: 'Atributos, classes e estilos' }
      ]
    },
    {
      titulo: 'Dados e formulários',
      paginas: [
        { id: 'guia/buscando-dados', titulo: 'Buscando dados de um servidor' },
        { id: 'guia/formularios', titulo: 'Formulários que validam e enviam sozinhos' },
        { id: 'guia/mascaras', titulo: 'Máscaras de campo' }
      ]
    },
    {
      titulo: 'Componentes e estado',
      paginas: [
        { id: 'guia/componentes', titulo: 'Componentes: props, slots, eventos e ciclo de vida' },
        { id: 'guia/componentes-prontos', titulo: 'Componentes prontos' },
        { id: 'guia/stores', titulo: 'Estado global com stores' },
        { id: 'guia/estado-persistente', titulo: 'Estado que persiste, sincroniza e desfaz' }
      ]
    },
    {
      titulo: 'Interface e efeitos',
      paginas: [
        { id: 'guia/interface', titulo: 'Modal, abas, menu, gaveta, arrastar e soltar' },
        { id: 'guia/animacoes', titulo: 'Animações' },
        { id: 'guia/som', titulo: 'Som' },
        { id: 'guia/graficos', titulo: 'Gráficos' },
        { id: 'guia/roteador', titulo: 'Roteador' },
        { id: 'guia/idiomas', titulo: 'Idiomas' },
        { id: 'guia/tema-e-paleta', titulo: 'Tema e paleta' }
      ]
    },
    {
      titulo: 'Estendendo e depurando',
      paginas: [
        { id: 'guia/directives-e-plugins', titulo: 'Directives próprias e plugins' },
        { id: 'guia/inspetor', titulo: 'O inspetor de reatividade' },
        { id: 'guia/depurando', titulo: 'Depurando problemas comuns' }
      ]
    },
    {
      titulo: 'Referência',
      paginas: [
        { id: 'referencia/directives', titulo: 'Directives por categoria' },
        { id: 'referencia/objeto-v', titulo: 'O objeto V' },
        { id: 'referencia/magias', titulo: 'Variáveis mágicas' },
        { id: 'referencia/componentes-prontos', titulo: 'Componentes prontos e props' },
        { id: 'referencia/http', titulo: 'Cliente HTTP' },
        { id: 'referencia/utilitarios', titulo: 'Utilitários' },
        { id: 'referencia/validacao', titulo: 'Regras de validação' },
        { id: 'referencia/mascaras', titulo: 'Máscaras' },
        { id: 'referencia/graficos', titulo: 'Tipos de gráfico' },
        { id: 'referencia/configuracao', titulo: 'Configuração' }
      ]
    },
    {
      titulo: 'Qualidade e migração',
      paginas: [
        { id: 'referencia/seguranca', titulo: 'Segurança' },
        { id: 'referencia/desempenho', titulo: 'Desempenho' },
        { id: 'referencia/migracao-jquery', titulo: 'Migrando do jQuery' },
        { id: 'referencia/migracao-alpine', titulo: 'Migrando do Alpine' },
        { id: 'referencia/migracao-vue', titulo: 'Migrando do Vue' },
        { id: 'referencia/perguntas-frequentes', titulo: 'Perguntas frequentes' }
      ]
    }
  ];

  // Lista plana, usada pela navegação anterior e próxima.
  var LINEAR = [];
  NAVEGACAO.forEach(function (grupo) {
    grupo.paginas.forEach(function (pagina) {
      LINEAR.push(pagina);
    });
  });

  // ------------------------------------------------------------------------
  // 2. Caminhos
  // ------------------------------------------------------------------------

  var esteScript =
    document.currentScript ||
    (function () {
      var lista = document.getElementsByTagName('script');
      return lista[lista.length - 1];
    })();

  var RAIZ = new URL('../', esteScript.src); // .../site/docs/
  var RUNTIME = new URL('../voodoo.full.min.js', RAIZ).href; // .../site/voodoo.full.min.js
  var MARCA = new URL('../assets/brand/logo/voodoo-mark.svg', RAIZ).href;

  function href(id) {
    return id ? RAIZ.pathname + id + '.html' : RAIZ.pathname;
  }

  function idAtual() {
    var base = RAIZ.pathname;
    var aqui = decodeURIComponent(location.pathname);
    if (aqui.indexOf(base) !== 0) return '';
    return aqui
      .slice(base.length)
      .replace(/\.html$/, '')
      .replace(/(^|\/)index$/, '')
      .replace(/^\/+|\/+$/g, '');
  }

  var ATUAL = idAtual();
  var INDICE_ATUAL = LINEAR.findIndex(function (p) {
    return p.id === ATUAL;
  });

  // ------------------------------------------------------------------------
  // 3. Utilidades
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
  // 4. Tema
  // ------------------------------------------------------------------------

  var CHAVE_TEMA = 'voodoo-docs-tema';

  function temaAtual() {
    return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro';
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch (erro) {
      /* modo privado, segue sem persistir */
    }
    var botao = document.getElementById('doc-tema');
    if (botao) {
      var claro = tema === 'claro';
      botao.innerHTML = claro ? ICONES.lua : ICONES.sol;
      botao.setAttribute('aria-label', claro ? 'Usar tema escuro' : 'Usar tema claro');
      botao.setAttribute('title', claro ? 'Usar tema escuro' : 'Usar tema claro');
    }
    document.querySelectorAll('iframe[data-palco]').forEach(function (quadro) {
      try {
        quadro.contentDocument.documentElement.setAttribute('data-tema', tema);
      } catch (erro) {
        /* ainda carregando */
      }
    });
  }

  // ------------------------------------------------------------------------
  // 5. Realce de sintaxe
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
    txt: 'texto'
  };

  // ------------------------------------------------------------------------
  // 6. Blocos de código: rótulo, realce e botão de copiar
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
        'aria-label': 'Copiar o código',
        html: ICONES.copiar + '<span>Copiar</span>'
      });
      botao.addEventListener('click', function () {
        copiar(fonte).then(function (deuCerto) {
          botao.innerHTML = deuCerto
            ? ICONES.ok + '<span>Copiado</span>'
            : ICONES.copiar + '<span>Falhou</span>';
          botao.setAttribute('data-estado', deuCerto ? 'ok' : 'erro');
          setTimeout(function () {
            botao.innerHTML = ICONES.copiar + '<span>Copiar</span>';
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
  // 7. Exemplos ao vivo
  // ------------------------------------------------------------------------

  var BASE_IFRAME =
    '*,*::before,*::after{box-sizing:border-box}' +
    'html{color-scheme:dark}' +
    'html[data-tema="claro"]{color-scheme:light}' +
    'body{margin:0;padding:16px;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
    'background:transparent;color:#ece9f5}' +
    'html[data-tema="claro"] body{color:#1d182c}' +
    '[v-cloak]{display:none!important}' +
    'h1,h2,h3,h4,p,ul,ol{margin:0 0 .6rem}' +
    'ul,ol{padding-left:1.2rem}' +
    'button{font:inherit;padding:.4rem .8rem;border:1px solid #3d3560;border-radius:8px;' +
    'background:#221d38;color:#ece9f5;cursor:pointer}' +
    'button:hover{border-color:#6d3bf5}' +
    'html[data-tema="claro"] button{background:#f5f0ff;color:#1d182c;border-color:#cec4e2}' +
    'input,select,textarea{font:inherit;padding:.4rem .6rem;border:1px solid #3d3560;border-radius:8px;' +
    'background:#191527;color:#ece9f5;max-width:100%}' +
    'html[data-tema="claro"] input,html[data-tema="claro"] select,html[data-tema="claro"] textarea' +
    '{background:#fff;color:#1d182c;border-color:#cec4e2}' +
    'input[type=checkbox],input[type=radio]{width:auto;accent-color:#6d3bf5}' +
    'label{display:inline-flex;align-items:center;gap:.4rem}' +
    'table{border-collapse:collapse;width:100%;font-size:.9rem}' +
    'th,td{padding:.35rem .5rem;border-bottom:1px solid #2c2643;text-align:left}' +
    'code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}' +
    'a{color:#9b7bff}' +
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
        html: 'Exemplo ao vivo <b>&#9679;</b> roda de verdade nesta página'
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
      title: 'Resultado do exemplo',
      loading: 'lazy'
    });
    palco.appendChild(quadro);

    var documento =
      '<!doctype html><html lang="pt-BR" data-tema="' +
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

  function ajustarAltura(quadro) {
    try {
      var doc = quadro.contentDocument;
      if (!doc || !doc.body) return;
      var altura = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight || 0);
      quadro.style.height = Math.max(altura + 8, 96) + 'px';
    } catch (erro) {
      quadro.style.height = '220px';
    }
  }

  // ------------------------------------------------------------------------
  // 8. Cabeçalho
  // ------------------------------------------------------------------------

  function montarTopo() {
    var topo = el('header', { class: 'doc-topo' });

    var botaoMenu = el('button', {
      type: 'button',
      class: 'doc-botao-icone doc-topo__menu-btn',
      id: 'doc-abrir-menu',
      'aria-label': 'Abrir o menu de navegação',
      'aria-expanded': 'false',
      'aria-controls': 'doc-menu',
      html: ICONES.menu
    });
    topo.appendChild(botaoMenu);

    var marca = el('a', {
      class: 'doc-topo__marca',
      href: href(''),
      html:
        '<img src="' +
        MARCA +
        '" alt="" width="28" height="28"><span>Voodoo<em>.js</em></span>' +
        '<span class="doc-topo__etiqueta">Docs</span>'
    });
    topo.appendChild(marca);

    topo.appendChild(el('div', { class: 'doc-topo__espaco' }));
    topo.appendChild(montarBusca());

    var acoes = el('div', { class: 'doc-topo__acoes' });
    var tema = el('button', {
      type: 'button',
      class: 'doc-botao-icone',
      id: 'doc-tema',
      'aria-label': 'Alternar tema'
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
        'aria-label': 'Repositório no GitHub',
        title: 'Repositório no GitHub',
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

  // ------------------------------------------------------------------------
  // 9. Menu lateral
  // ------------------------------------------------------------------------

  var vidro;

  function montarMenu() {
    var menu = el('nav', {
      class: 'doc-menu',
      id: 'doc-menu',
      'aria-label': 'Páginas da documentação'
    });

    var fechar = el('button', {
      type: 'button',
      class: 'doc-botao-icone doc-menu__fechar',
      'aria-label': 'Fechar o menu',
      html: ICONES.fechar
    });
    fechar.addEventListener('click', function () {
      alternarMenu(false);
    });
    menu.appendChild(fechar);

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
  // 10. Índice da página
  // ------------------------------------------------------------------------

  function montarIndice(artigo) {
    var aside = el('aside', { class: 'doc-indice', 'aria-label': 'Índice desta página' });
    var titulos = artigo.querySelectorAll('h2[id], h3[id]');
    if (titulos.length < 2) return aside;

    aside.appendChild(el('h2', { class: 'doc-indice__titulo', texto: 'Nesta página' }));
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
  // 11. Âncoras dos títulos
  // ------------------------------------------------------------------------

  function ligarAncoras(artigo) {
    artigo.querySelectorAll('h2[id], h3[id]').forEach(function (titulo) {
      if (titulo.querySelector('.doc-ancora')) return;
      var ancora = el('a', {
        class: 'doc-ancora',
        href: '#' + titulo.id,
        'aria-label': 'Link direto para a seção ' + titulo.textContent.trim(),
        texto: '#'
      });
      titulo.appendChild(ancora);
    });
  }

  // ------------------------------------------------------------------------
  // 12. Navegação anterior e próxima
  // ------------------------------------------------------------------------

  function montarPaginacao() {
    if (INDICE_ATUAL < 0) return null;
    var anterior = LINEAR[INDICE_ATUAL - 1];
    var proxima = LINEAR[INDICE_ATUAL + 1];
    if (!anterior && !proxima) return null;

    var nav = el('nav', { class: 'doc-paginacao', 'aria-label': 'Páginas vizinhas' });

    if (anterior) {
      nav.appendChild(
        el('a', {
          class: 'doc-paginacao__link doc-paginacao__link--anterior',
          href: href(anterior.id),
          rel: 'prev',
          html:
            '<span class="doc-paginacao__rotulo">Anterior</span>' +
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
            '<span class="doc-paginacao__rotulo">Próxima</span>' +
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
        '<p>Voodoo.js 0.1.0 &#183; documentação em português do Brasil.</p>' +
        '<p><a href="https://github.com/kwy404/Voodoo.js">Repositório</a> &#183; ' +
        '<a href="https://github.com/kwy404/Voodoo.js/releases/tag/v0.1.0">Notas da versão</a> &#183; ' +
        '<a href="' +
        href('referencia/perguntas-frequentes') +
        '">Perguntas frequentes</a></p>'
    });
  }

  // ------------------------------------------------------------------------
  // 13. Busca
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
      placeholder: 'Buscar na documentação...',
      autocomplete: 'off',
      role: 'combobox',
      'aria-expanded': 'false',
      'aria-controls': 'doc-busca-resultados',
      'aria-autocomplete': 'list',
      'aria-label': 'Buscar na documentação'
    });

    var resultados = el('ul', {
      class: 'doc-busca__resultados',
      id: 'doc-busca-resultados',
      role: 'listbox',
      'aria-label': 'Resultados da busca'
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
          texto: 'Nada encontrado para "' + termo.trim() + '".'
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
  // 14. Atalhos de teclado
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
  // 15. Montagem
  // ------------------------------------------------------------------------

  function iniciar() {
    var artigo = document.querySelector('.doc-artigo');
    if (!artigo) return;

    var pagina = LINEAR[INDICE_ATUAL];
    var conteudo = el('main', { class: 'doc-conteudo', id: 'conteudo', tabindex: '-1' });
    var layout = el('div', { class: 'doc-layout' });

    // Guarda o artigo antes de mexer no body.
    artigo.parentNode.removeChild(artigo);
    document.body.innerHTML = '';

    document.body.appendChild(
      el('a', { class: 'pular-para-conteudo', href: '#conteudo', texto: 'Pular para o conteúdo' })
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

    aplicarTema(temaAtual());
    ligarAtalhos();

    if (pagina) document.body.setAttribute('data-pagina', pagina.id || 'inicio');

    // Rola até a âncora, agora que o conteúdo já está no lugar.
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
