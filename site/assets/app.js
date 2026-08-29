/**
 * Logica extra da landing page da Voodoo.js.
 *
 * Este arquivo e deliberadamente pequeno. Quase toda a pagina vive nos
 * atributos do HTML, que e exatamente o argumento que a landing defende.
 * O que sobra aqui e o que so faz sentido em JavaScript:
 *
 *   1. configuracao de idioma, tema e paleta;
 *   2. metadados de SEO que mudam junto com o idioma;
 *   3. realce de sintaxe dos blocos de codigo;
 *   4. os dados dos exemplos, do comparativo e dos minigames;
 *   5. alguns auxiliares chamados pelas expressoes do HTML.
 *
 * Ordem de execucao: o navegador carrega `voodoo.full.min.js` e depois este
 * arquivo, os dois com `defer`. Quando este codigo roda, `window.V` ja existe
 * e a biblioteca ainda nao inicializou a pagina, porque ela espera o evento
 * `DOMContentLoaded`. Essa janela e o lugar certo para configurar tudo.
 *
 * Regra de escrita do repositorio: nunca usar travessao.
 */

(function () {
  'use strict';

  var V = window.V;
  if (!V) {
    // eslint-disable-next-line no-console
    console.error('[landing] Voodoo.js nao carregou. Confira o caminho do script.');
    return;
  }

  var GITHUB = 'https://github.com/voodoojs/voodoo';
  var SITE = 'https://voodoojs.dev';
  var CDN = 'https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js';

  // =====================================================================
  // 1. Idioma, tema e paleta
  // =====================================================================

  /** Idioma pedido pela URL, quando ele existe entre os oferecidos. */
  function localeFromUrl() {
    try {
      var wanted = new URL(location.href).searchParams.get('lang');
      if (!wanted) return null;
      var list = window.VOODOO_LOCALES || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].code.toLowerCase() === wanted.toLowerCase()) return list[i].code;
        if (list[i].code.split('-')[0].toLowerCase() === wanted.toLowerCase()) return list[i].code;
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  V.i18n({
    locale: 'pt-BR',
    fallback: 'pt-BR',
    messages: window.VOODOO_MESSAGES,
    currency: 'BRL',
    persist: 'voodoo:locale',
    detect: true,
  });

  var urlLocale = localeFromUrl();
  if (urlLocale) V.setLocale(urlLocale);

  // O tema escuro e o padrao da marca. O script embutido no `head` ja gravou a
  // escolha antes da primeira pintura, entao aqui basta garantir a aplicacao.
  if (V.theme.current === 'system') V.theme.set('dark');
  V.theme.apply();

  // Paleta oficial, gerada a partir das duas cores da marca.
  V.palette({
    primary: '#6D3BF5',
    accent: '#FF3D8B',
    success: '#2ED9A5',
    warning: '#FFB35C',
    danger: '#FF4D4D',
    info: '#9B7BFF',
    radius: '12px',
    font: 'Inter',
    monoFont: 'JetBrains Mono',
    persist: false,
  });

  // =====================================================================
  // 2. Metadados de SEO por idioma
  // =====================================================================

  var META_LOCALE = {
    'pt-BR': 'pt_BR',
    en: 'en_US',
    es: 'es_ES',
    fr: 'fr_FR',
    de: 'de_DE',
  };

  /** Escreve, ou cria, uma tag `meta` identificada por atributo. */
  function setMeta(attribute, name, content) {
    var tag = document.head.querySelector('meta[' + attribute + '="' + name + '"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  /**
   * Mantem titulo, descricao e cartoes sociais no idioma ativo. Roda dentro de
   * um efeito, entao acompanha cada troca de idioma sem nenhum ouvinte.
   */
  V.effect(function () {
    var locale = V.i18n.locale;
    var title = V.t('meta.title');
    var description = V.t('meta.description');

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', V.t('meta.ogTitle'));
    setMeta('property', 'og:description', V.t('meta.ogDescription'));
    setMeta('property', 'og:locale', META_LOCALE[locale] || 'pt_BR');
    setMeta('property', 'og:image:alt', V.t('meta.imageAlt'));
    setMeta('name', 'twitter:title', V.t('meta.ogTitle'));
    setMeta('name', 'twitter:description', V.t('meta.ogDescription'));
    setMeta('name', 'twitter:image:alt', V.t('meta.imageAlt'));
    document.documentElement.lang = locale;
  });

  // =====================================================================
  // 3. Realce de sintaxe
  // =====================================================================

  var HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return HTML_ENTITIES[ch];
    });
  }

  function span(cls, text) {
    return '<span class="vd-t-' + cls + '">' + escapeHtml(text) + '</span>';
  }

  /**
   * Realce de HTML com atributos da Voodoo.js.
   *
   * A varredura e proposital e simples: comentario, tag, atributo, valor e
   * texto. Ela nao tenta ser um analisador de verdade, so precisa deixar o
   * exemplo legivel. Os atributos `v-*`, `@` e `:` ganham destaque proprio,
   * porque sao o assunto da pagina.
   */
  function highlightHtml(code) {
    var out = '';
    var i = 0;

    while (i < code.length) {
      if (code.startsWith('<!--', i)) {
        var endComment = code.indexOf('-->', i);
        if (endComment === -1) endComment = code.length - 3;
        out += span('com', code.slice(i, endComment + 3));
        i = endComment + 3;
        continue;
      }

      if (code[i] === '<') {
        var endTag = code.indexOf('>', i);
        if (endTag === -1) endTag = code.length - 1;
        out += highlightTag(code.slice(i, endTag + 1));
        i = endTag + 1;
        continue;
      }

      var nextTag = code.indexOf('<', i);
      if (nextTag === -1) nextTag = code.length;
      out += escapeHtml(code.slice(i, nextTag));
      i = nextTag;
    }

    return out;
  }

  /** Realce do miolo de uma tag, incluindo nome, atributos e valores. */
  function highlightTag(raw) {
    var match = /^<\/?([a-zA-Z][\w:-]*)/.exec(raw);
    if (!match) return span('punct', raw);

    var nameEnd = match[0].length;
    var out = span('punct', raw.slice(0, match[0].length - match[1].length));
    out += span('tag', match[1]);

    var rest = raw.slice(nameEnd);
    var pattern = /([@:.]?[\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')?|(\s+)|(\/?>)/g;
    var piece;

    while ((piece = pattern.exec(rest)) !== null) {
      if (piece[4]) {
        out += piece[4];
        continue;
      }
      if (piece[5]) {
        out += span('punct', piece[5]);
        continue;
      }
      var attribute = piece[1];
      var isVoodoo = /^(v-|@|:|\.)/.test(attribute);
      out += span(isVoodoo ? 'dir' : 'attr', attribute);
      if (piece[2]) out += span('punct', piece[2]);
      if (piece[3]) out += span('str', piece[3]);
    }

    return out;
  }

  var JS_KEYWORDS =
    /\b(const|let|var|function|return|if|else|for|of|in|new|await|async|class|import|export|from|this|true|false|null|undefined|typeof)\b/g;

  /** Realce de JavaScript, no mesmo espirito simples do de HTML. */
  function highlightJs(code) {
    var out = escapeHtml(code);
    out = out.replace(/(\/\/[^\n]*)/g, '<span class="vd-t-com">$1</span>');
    out = out.replace(/('[^'\n]*'|"[^"\n]*"|`[^`]*`)/g, '<span class="vd-t-str">$1</span>');
    out = out.replace(JS_KEYWORDS, '<span class="vd-t-key">$1</span>');
    out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="vd-t-num">$1</span>');
    out = out.replace(/\b([A-Za-z_$][\w$]*)\(/g, '<span class="vd-t-fn">$1</span>(');
    return out;
  }

  function highlightShell(code) {
    return escapeHtml(code).replace(/^([\w-]+)/gm, '<span class="vd-t-fn">$1</span>');
  }

  /**
   * Aplica o realce em todo bloco marcado com `data-hl`.
   *
   * Roda antes de `V.start()`, de proposito. Assim os elementos criados aqui ja
   * existem quando a Voodoo.js percorre a pagina, e o `v-ignore` do `pre` que
   * envolve o bloco impede que a interpolacao tente ler as chaves do exemplo.
   */
  function paintCode(root) {
    var blocks = (root || document).querySelectorAll('[data-hl]');
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (block.dataset.hlDone === 'true') continue;
      var source = block.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var kind = block.getAttribute('data-hl') || 'html';
      block.dataset.hlDone = 'true';
      block.dataset.source = source;
      if (kind === 'js') block.innerHTML = highlightJs(source);
      else if (kind === 'shell') block.innerHTML = highlightShell(source);
      else block.innerHTML = highlightHtml(source);
    }
  }

  paintCode(document);

  // =====================================================================
  // 4. Dados dos exemplos do playground
  // =====================================================================

  /**
   * Cada exemplo e HTML puro, do jeito que a pessoa escreveria no proprio
   * arquivo. Nada aqui e pre processado: o texto entra inteiro no quadro de
   * pre visualizacao, que carrega a mesma `voodoo.full.min.js` da pagina.
   */
  var EXAMPLES = [
    {
      id: 'state',
      code:
        '<div v-data="{ nome: \'Vudu\', cliques: 0 }">\n' +
        '  <h3>Ola, { nome }!</h3>\n' +
        '  <p>Voce clicou { cliques } vezes.</p>\n\n' +
        '  <input v-model="nome" placeholder="Escreva um nome">\n' +
        '  <button @click="cliques++">Clique aqui</button>\n' +
        '  <button @click="cliques = 0">Zerar</button>\n\n' +
        '  <p v-show="cliques > 4">Ja deu, ne?</p>\n' +
        '</div>',
    },
    {
      id: 'conditional',
      code:
        '<div v-data="{ nivel: 2 }">\n' +
        '  <button @click="nivel = 1">Baixo</button>\n' +
        '  <button @click="nivel = 2">Medio</button>\n' +
        '  <button @click="nivel = 3">Alto</button>\n\n' +
        '  <p v-if="nivel === 1">Uma vela apenas.</p>\n' +
        '  <p v-else-if="nivel === 2">O caldeirao borbulha.</p>\n' +
        '  <p v-else>O ceu ficou roxo.</p>\n\n' +
        '  <p v-show="nivel === 3" class="aviso">\n' +
        '    v-show continua no DOM, so muda a exibicao.\n' +
        '  </p>\n' +
        '</div>',
    },
    {
      id: 'list',
      code:
        '<div v-data="{\n' +
        '  itens: [\n' +
        '    { id: 1, nome: \'Raiz de mandragora\', qtd: 3 },\n' +
        '    { id: 2, nome: \'Po de estrela\', qtd: 7 },\n' +
        '    { id: 3, nome: \'Pena de corvo\', qtd: 1 }\n' +
        '  ]\n' +
        '}">\n' +
        '  <ul>\n' +
        '    <li v-for="(item, i) in itens" :key="item.id">\n' +
        '      { i + 1 }. { item.nome }\n' +
        '      <button @click="item.qtd++">+</button>\n' +
        '      <b>{ item.qtd }</b>\n' +
        '      <button @click="itens = itens.filter(x => x.id !== item.id)">x</button>\n' +
        '    </li>\n' +
        '  </ul>\n' +
        '  <p v-if="!itens.length">O caldeirao esta vazio.</p>\n' +
        '</div>',
    },
    {
      id: 'form',
      code:
        '<div v-data="{ form: { nome: \'\', idade: 0, aceito: false, cor: \'roxo\' } }">\n' +
        '  <label>Nome <input v-model.trim="form.nome"></label>\n' +
        '  <label>Idade <input type="number" v-model.number="form.idade"></label>\n' +
        '  <label><input type="checkbox" v-model="form.aceito"> Aceito o feitico</label>\n' +
        '  <label>Cor\n' +
        '    <select v-model="form.cor">\n' +
        '      <option>roxo</option>\n' +
        '      <option>magenta</option>\n' +
        '      <option>ambar</option>\n' +
        '    </select>\n' +
        '  </label>\n\n' +
        '  <pre v-text="JSON.stringify(form, null, 2)"></pre>\n' +
        '</div>',
    },
    {
      id: 'events',
      code:
        '<div v-data="{ log: [], aberto: false, busca: \'\' }">\n' +
        '  <button @click.once="log.push(\'so uma vez\')">once</button>\n' +
        '  <button @click.stop="log.push(\'nao sobe\')">stop</button>\n' +
        '  <input @keyup.enter="log.push(\'enter: \' + $event.target.value)"\n' +
        '         placeholder="Aperte Enter">\n' +
        '  <input v-model.debounce.400="busca" placeholder="Espera 400ms">\n' +
        '  <p>Busca: <b>{ busca }</b></p>\n\n' +
        '  <div>\n' +
        '    <button @click="aberto = !aberto">Menu</button>\n' +
        '    <div v-show="aberto" @outside="aberto = false" class="menu">\n' +
        '      Clique fora para fechar.\n' +
        '    </div>\n' +
        '  </div>\n\n' +
        '  <ul><li v-for="l in log">{ l }</li></ul>\n' +
        '</div>',
    },
    {
      id: 'http',
      code:
        '<div v-resource="pessoa: https://jsonplaceholder.typicode.com/users/1">\n' +
        '  <p v-if="pessoa.loading">Consultando o oraculo...</p>\n' +
        '  <p v-else-if="pessoa.error">{ pessoa.error.message }</p>\n' +
        '  <div v-else>\n' +
        '    <h3>{ pessoa.data.name }</h3>\n' +
        '    <p>{ pessoa.data.email }</p>\n' +
        '    <p>{ pessoa.data.company.catchPhrase }</p>\n' +
        '  </div>\n' +
        '  <button @click="pessoa.reload()">Recarregar</button>\n' +
        '</div>',
    },
    {
      id: 'component',
      code:
        '<script>\n' +
        '  V.component(\'poção\', {\n' +
        '    props: { nome: { type: \'string\', default: \'Poção\' },\n' +
        '             forca: { type: \'number\', default: 1 } },\n' +
        '    state() { return { doses: 0 } },\n' +
        '    computed: { total() { return this.doses * this.forca } },\n' +
        '    methods: { beber() { this.doses++ } },\n' +
        '    template: `\n' +
        '      <article class="frasco">\n' +
        '        <h4>{ nome } <small>forca { forca }</small></h4>\n' +
        '        <p><slot>Sem descricao.</slot></p>\n' +
        '        <button v-click="beber">Beber</button>\n' +
        '        <b>{ doses } doses, { total } de efeito</b>\n' +
        '      </article>`\n' +
        '  })\n' +
        '<\/script>\n\n' +
        '<poção nome="Elixir violeta" :forca="3">\n' +
        '  Este conteudo entra pelo slot do componente.\n' +
        '</poção>\n' +
        '<poção nome="Xarope ambar" :forca="1"></poção>',
    },
    {
      id: 'validation',
      code:
        '<form v-validate @submit.prevent="enviado = true" v-data="{ enviado: false }">\n' +
        '  <label>Email\n' +
        '    <input name="email" v-required v-email\n' +
        '           v-error-message="Escreva um email de verdade.">\n' +
        '  </label>\n' +
        '  <label>CPF\n' +
        '    <input name="cpf" v-required v-cpf v-mask="cpf">\n' +
        '  </label>\n' +
        '  <label>Senha\n' +
        '    <input name="senha" type="password" v-required v-minlength="8">\n' +
        '  </label>\n' +
        '  <button type="submit">Enviar</button>\n' +
        '  <p v-show="enviado">Formulario valido e enviado.</p>\n' +
        '</form>',
    },
    {
      id: 'mask',
      code:
        '<div v-data="{ cpf: \'\', tel: \'\', dinheiro: \'\', placa: \'\' }">\n' +
        '  <label>CPF <input v-mask="cpf" v-model="cpf"></label>\n' +
        '  <label>Telefone <input v-mask="phone" v-model="tel"></label>\n' +
        '  <label>Dinheiro <input v-mask="currency" v-model="dinheiro"></label>\n' +
        '  <label>Placa <input v-mask="plate" v-model="placa"></label>\n' +
        '  <label>Padrao livre <input v-mask="AAA-9999"></label>\n\n' +
        '  <pre v-text="JSON.stringify({ cpf, tel, dinheiro, placa }, null, 2)"></pre>\n' +
        '</div>',
    },
    {
      id: 'motion',
      code:
        '<div v-data="{ visivel: true }">\n' +
        '  <h3 v-typewriter="JavaScript feels like magic." v-typewriter-speed="55"></h3>\n\n' +
        '  <p>Visitas: <b v-count="128400" v-count-duration="2s"></b></p>\n\n' +
        '  <div v-motion="fadeUp" class="caixa">v-motion="fadeUp"</div>\n' +
        '  <div v-motion="pop" class="caixa">v-motion="pop"</div>\n' +
        '  <div v-motion-hover="{ scale: 1.08, rotate: -3 }" class="caixa">\n' +
        '    passe o mouse\n' +
        '  </div>\n' +
        '  <div v-motion-tap="{ scale: 0.9 }" class="caixa">segure aqui</div>\n\n' +
        '  <button @click="visivel = !visivel">Alternar</button>\n' +
        '  <div v-if="visivel" v-transition="fade" class="caixa">v-transition</div>\n' +
        '</div>',
    },
    {
      id: 'chart',
      code:
        '<div v-data="{\n' +
        '  meses: [\'Jan\', \'Fev\', \'Mar\', \'Abr\', \'Mai\', \'Jun\'],\n' +
        '  vendas: [12, 19, 9, 24, 31, 27]\n' +
        '}">\n' +
        '  <div v-chart="{ type: \'area\', data: vendas, labels: meses, smooth: true }"\n' +
        '       style="height: 190px"></div>\n\n' +
        '  <div v-chart="{ type: \'bar\', data: vendas, labels: meses }"\n' +
        '       style="height: 170px"></div>\n\n' +
        '  <div v-chart="{ type: \'donut\', data: [38, 24, 21, 17],\n' +
        '                  labels: [\'Roxo\', \'Magenta\', \'Ambar\', \'Menta\'] }"\n' +
        '       style="height: 200px"></div>\n\n' +
        '  <button @click="vendas = vendas.map(() => Math.round(Math.random() * 40))">\n' +
        '    Sortear numeros\n' +
        '  </button>\n' +
        '</div>',
    },
    {
      id: 'dnd',
      code:
        '<div v-data="{ afazer: [\'Colher ervas\', \'Ferver agua\', \'Misturar\'],\n' +
        '               pronto: [\'Acender a vela\'] }">\n' +
        '  <h4>A fazer</h4>\n' +
        '  <ul v-sortable v-sortable-group="tarefas" class="coluna">\n' +
        '    <li v-for="t in afazer" :key="t">{ t }</li>\n' +
        '  </ul>\n\n' +
        '  <h4>Pronto</h4>\n' +
        '  <ul v-sortable v-sortable-group="tarefas" class="coluna">\n' +
        '    <li v-for="t in pronto" :key="t">{ t }</li>\n' +
        '  </ul>\n\n' +
        '  <p>Arraste com o mouse, com o dedo ou pelo teclado.</p>\n' +
        '</div>',
    },
    {
      id: 'toast',
      code:
        '<div v-data="{ texto: \'v-copy copia isto\' }">\n' +
        '  <button @click="$toast.success(\'Feitico lancado!\')">Sucesso</button>\n' +
        '  <button @click="$toast.error(\'O caldeirao virou.\')">Erro</button>\n' +
        '  <button @click="$toast.info(\'Largura: \' + $screen.width + \'px\')">Tela</button>\n\n' +
        '  <button v-theme-toggle>Alternar tema</button>\n' +
        '  <p>Tema atual: <b>{ $theme.resolved }</b></p>\n\n' +
        '  <input v-model="texto">\n' +
        '  <button @click="$clipboard.copy(texto); $toast.success(\'Copiado\')">\n' +
        '    Copiar\n' +
        '  </button>\n\n' +
        '  <p v-show="$screen.mobile">Voce esta em uma tela estreita.</p>\n' +
        '  <p v-show="!$network.online">Voce esta offline.</p>\n' +
        '</div>',
    },
    {
      id: 'watch',
      code:
        '<div v-data="{ nota: \'\', salvo: 0 }" v-persist="rascunho">\n' +
        '  <p>Escreva algo e recarregue o quadro. O texto volta.</p>\n' +
        '  <textarea v-model="nota" rows="3"></textarea>\n\n' +
        '  <p v-effect="salvo = nota.length">\n' +
        '    Efeito reativo: <b>{ salvo }</b> caracteres.\n' +
        '  </p>\n\n' +
        '  <input v-model="nota" v-watch="$toast.info(\'mudou para: \' + $value)">\n' +
        '  <p>v-watch avisa a cada mudanca deste campo.</p>\n' +
        '</div>',
    },
  ];

  // =====================================================================
  // 5. Quadro de pre visualizacao
  // =====================================================================

  /** CSS minimo do quadro, para o exemplo nascer legivel sem esforco. */
  var FRAME_CSS = [
    '*{box-sizing:border-box}',
    'body{margin:0;padding:20px;font:15px/1.6 Inter,system-ui,sans-serif;',
    'background:var(--v-surface,#fff);color:var(--v-text,#14111f)}',
    'h3,h4{margin:0 0 10px;font-family:"Space Grotesk",Inter,system-ui,sans-serif}',
    'p{margin:0 0 10px}',
    'label{display:block;margin-bottom:10px;font-size:13px;color:var(--v-text-muted,#6b6580)}',
    'input,select,textarea{display:block;width:100%;max-width:280px;margin-top:4px;padding:9px 12px;',
    'border:1px solid var(--v-border,#e6e0f0);border-radius:10px;background:var(--v-surface-2,#faf7ff);',
    'color:inherit;font:inherit}',
    'button{margin:0 6px 6px 0;padding:9px 16px;border:0;border-radius:999px;cursor:pointer;',
    'background:var(--v-primary,#6d3bf5);color:#fff;font:600 14px/1 Inter,system-ui,sans-serif}',
    'button:hover{filter:brightness(1.08)}',
    'ul{margin:0 0 10px;padding-left:18px}',
    'li{margin-bottom:6px}',
    'pre{background:var(--v-surface-2,#f5f2ff);padding:12px;border-radius:10px;overflow:auto;',
    'font:12px/1.5 "JetBrains Mono",ui-monospace,monospace;border:1px solid var(--v-border,#e6e0f0)}',
    '.caixa{display:inline-grid;place-items:center;width:130px;height:56px;margin:0 8px 8px 0;',
    'border-radius:12px;background:linear-gradient(135deg,#6d3bf5,#ff3d8b);color:#fff;',
    'font:600 12px/1.3 Inter,system-ui,sans-serif;text-align:center;padding:6px}',
    '.menu{margin-top:8px;padding:12px;border-radius:10px;border:1px solid var(--v-border,#e6e0f0);',
    'background:var(--v-surface-2,#faf7ff)}',
    '.aviso{color:var(--v-warning,#b8730a)}',
    '.frasco{margin:0 0 12px;padding:14px;border-radius:12px;border:1px solid var(--v-border,#e6e0f0);',
    'background:var(--v-surface-2,#faf7ff)}',
    '.frasco small{font-weight:400;color:var(--v-text-muted,#6b6580)}',
    '.coluna{list-style:none;padding:8px;margin:0 0 14px;min-height:64px;border-radius:12px;',
    'border:1px dashed var(--v-border,#e6e0f0);background:var(--v-surface-2,#faf7ff)}',
    '.coluna li{padding:9px 12px;margin:0 0 6px;border-radius:9px;background:var(--v-surface,#fff);',
    'border:1px solid var(--v-border,#e6e0f0);cursor:grab}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
  ].join('');

  /** Caminho absoluto da biblioteca, para funcionar dentro do `srcdoc`. */
  var LIB_URL = new URL('voodoo.full.min.js', document.baseURI).href;

  /** Monta o documento completo que vai para dentro do quadro. */
  function frameDocument(html) {
    return (
      '<!doctype html><html lang="' +
      V.i18n.locale +
      '" data-theme="' +
      V.theme.resolved +
      '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>' +
      FRAME_CSS +
      '</style>' +
      '<script src="' +
      LIB_URL +
      '"><\/script>' +
      '</head><body>' +
      html +
      '</body></html>'
    );
  }

  var frameTimers = {};

  /**
   * Escreve o exemplo no quadro, com espera para nao recarregar a cada tecla.
   *
   * @param {string} id     identificador do `iframe` no documento
   * @param {string} html   codigo escrito pela pessoa
   * @param {number} [wait] espera em milissegundos, padrao 420
   */
  function preview(id, html, wait) {
    var frame = document.getElementById(id);
    if (!frame) return;
    if (frameTimers[id]) clearTimeout(frameTimers[id]);
    frameTimers[id] = setTimeout(function () {
      frame.srcdoc = frameDocument(html);
    }, wait === undefined ? 420 : wait);
  }

  // =====================================================================
  // 6. Aplicacoes completas mostradas em quadro
  // =====================================================================

  var DEMOS = {
    todo:
      '<div v-data="{ novo: \'\', filtro: \'todas\', itens: [' +
      '{ id: 1, texto: \'Comprar ervas raras\', feito: false },' +
      '{ id: 2, texto: \'Afiar o alfinete magico\', feito: true },' +
      '{ id: 3, texto: \'Estudar a directive v-for\', feito: false }] }" v-persist="demo-todo">' +
      '<h3>Grimorio de tarefas</h3>' +
      '<form @submit.prevent="novo.trim() && (itens = itens.concat({ id: Date.now(), texto: novo, feito: false })) && (novo = \'\')">' +
      '<input v-model="novo" placeholder="Nova tarefa" style="max-width:100%">' +
      '<button type="submit">Adicionar</button></form>' +
      '<div style="margin:10px 0">' +
      '<button @click="filtro = \'todas\'">Todas</button>' +
      '<button @click="filtro = \'abertas\'">Abertas</button>' +
      '<button @click="filtro = \'feitas\'">Feitas</button></div>' +
      '<ul v-sortable class="coluna">' +
      '<li v-for="item in itens.filter(i => filtro === \'todas\' || (filtro === \'feitas\') === i.feito)" :key="item.id">' +
      '<label style="display:flex;gap:8px;align-items:center;margin:0">' +
      '<input type="checkbox" v-model="item.feito" style="width:auto;margin:0">' +
      '<span :style="{ textDecoration: item.feito ? \'line-through\' : \'none\', opacity: item.feito ? 0.55 : 1 }">{ item.texto }</span>' +
      '</label></li></ul>' +
      '<p>{ itens.filter(i => !i.feito).length } tarefas abertas de { itens.length }.</p>' +
      '<div v-chart="{ type: \'progress\', data: itens.length ? Math.round(itens.filter(i => i.feito).length / itens.length * 100) : 0 }" style="height:110px"></div>' +
      '</div>',

    dash:
      '<div v-data="{ periodo: 6, base: [12, 19, 9, 24, 31, 27, 35, 22, 40, 33, 29, 44],' +
      ' meses: [\'Jan\',\'Fev\',\'Mar\',\'Abr\',\'Mai\',\'Jun\',\'Jul\',\'Ago\',\'Set\',\'Out\',\'Nov\',\'Dez\'] }">' +
      '<h3>Painel do caldeirao</h3>' +
      '<div style="margin-bottom:12px">' +
      '<button @click="periodo = 3">3 meses</button>' +
      '<button @click="periodo = 6">6 meses</button>' +
      '<button @click="periodo = 12">12 meses</button></div>' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:14px">' +
      '<v-stat label="Pocoes" :value="base.slice(0, periodo).reduce((a, b) => a + b, 0)" delta="12" icon="chart"></v-stat>' +
      '<v-stat label="Feiticos" :value="periodo * 8" delta="-4" icon="star"></v-stat>' +
      '<v-stat label="Corvos" :value="periodo * 3" delta="7" icon="bell"></v-stat>' +
      '</div>' +
      '<div v-chart="{ type: \'area\', data: base.slice(0, periodo), labels: meses.slice(0, periodo), smooth: true }" style="height:200px;margin-bottom:14px"></div>' +
      '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' +
      '<div v-chart="{ type: \'bar\', data: base.slice(0, periodo), labels: meses.slice(0, periodo) }" style="height:180px"></div>' +
      '<div v-chart="{ type: \'donut\', data: [38, 24, 21, 17], labels: [\'Roxo\',\'Magenta\',\'Ambar\',\'Menta\'] }" style="height:180px"></div>' +
      '</div></div>',

    table:
      '<div v-data="{ busca: \'\', pagina: 1, porPagina: 5, linhas: [' +
      '{ nome: \'Raiz de mandragora\', tipo: \'Erva\', estoque: 12, preco: 39.9 },' +
      '{ nome: \'Po de estrela\', tipo: \'Mineral\', estoque: 4, preco: 128.5 },' +
      '{ nome: \'Pena de corvo\', tipo: \'Animal\', estoque: 27, preco: 12 },' +
      '{ nome: \'Olho de tritao\', tipo: \'Animal\', estoque: 2, preco: 210 },' +
      '{ nome: \'Cristal violeta\', tipo: \'Mineral\', estoque: 15, preco: 76.4 },' +
      '{ nome: \'Folha de sabugueiro\', tipo: \'Erva\', estoque: 33, preco: 8.9 },' +
      '{ nome: \'Escama de dragao\', tipo: \'Animal\', estoque: 1, preco: 980 },' +
      '{ nome: \'Sal de lua\', tipo: \'Mineral\', estoque: 19, preco: 44 }] }">' +
      '<h3>Estoque do armario</h3>' +
      '<input v-model.debounce.250="busca" placeholder="Buscar ingrediente" style="max-width:100%">' +
      '<v-table :columns="[{ key: \'nome\', label: \'Ingrediente\' }, { key: \'tipo\', label: \'Tipo\' },' +
      ' { key: \'estoque\', label: \'Estoque\', align: \'right\' }, { key: \'preco\', label: \'Preco\', align: \'right\' }]"' +
      ' :rows="linhas.filter(l => l.nome.toLowerCase().includes(busca.toLowerCase()))' +
      '.slice((pagina - 1) * porPagina, pagina * porPagina)" striped></v-table>' +
      '<v-pagination :page="pagina" :total="linhas.filter(l => l.nome.toLowerCase().includes(busca.toLowerCase())).length"' +
      ' :per-page="porPagina" @change="pagina = $detail.page"></v-pagination>' +
      '</div>',

    shop:
      '<div v-data="{ cupom: \'\', carrinho: [], catalogo: [' +
      '{ id: 1, nome: \'Elixir violeta\', preco: 49.9 },' +
      '{ id: 2, nome: \'Xarope ambar\', preco: 32 },' +
      '{ id: 3, nome: \'Tonico de menta\', preco: 27.5 },' +
      '{ id: 4, nome: \'Essencia magenta\', preco: 68 }] }">' +
      '<h3>Loja de pocoes</h3>' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
      '<div v-for="p in catalogo" :key="p.id" class="frasco">' +
      '<b>{ p.nome }</b><p>{ $c(p.preco) }</p>' +
      '<button @click="carrinho = carrinho.concat(p); $toast.success(p.nome + \' no carrinho\')">Adicionar</button>' +
      '</div></div>' +
      '<h4 style="margin-top:16px">Carrinho ({ carrinho.length })</h4>' +
      '<v-empty-state v-if="!carrinho.length" title="Carrinho vazio" description="Escolha uma pocao acima."></v-empty-state>' +
      '<ul v-else class="coluna">' +
      '<li v-for="(item, i) in carrinho" :key="i">{ item.nome } <b>{ $c(item.preco) }</b>' +
      ' <button @click="carrinho = carrinho.filter((_, j) => j !== i)">remover</button></li></ul>' +
      '<label>Cupom <input v-model="cupom" placeholder="VUDU10"></label>' +
      '<p>Total: <b>{ $c(carrinho.reduce((a, b) => a + b.preco, 0) * (cupom.toUpperCase() === \'VUDU10\' ? 0.9 : 1)) }</b></p>' +
      '</div>',
  };

  // =====================================================================
  // 7. Comparativo
  // =====================================================================

  /** Uma celula ou e texto literal, ou uma chave de traducao marcada com `t:`. */
  function cell(value) {
    if (typeof value === 'string' && value.indexOf('t:') === 0) return V.t(value.slice(2));
    return value;
  }

  var COMPARE = {
    tools: ['Voodoo.js', 'Vue 3', 'React 19', 'Alpine.js', 'HTMX', 'jQuery'],
    rows: [
      {
        key: 'size',
        cells: ['85 KB', '34 KB', '45 KB', '16 KB', '14 KB', '30 KB'],
        tone: ['warn', 'yes', 'no', 'yes', 'yes', 'warn'],
      },
      {
        key: 'buildStep',
        cells: [
          't:compare.no',
          't:compare.required',
          't:compare.required',
          't:compare.no',
          't:compare.no',
          't:compare.no',
        ],
        tone: ['yes', 'no', 'no', 'yes', 'yes', 'yes'],
      },
      {
        key: 'curve',
        cells: [
          't:compare.low',
          't:compare.medium',
          't:compare.high',
          't:compare.low',
          't:compare.low',
          't:compare.low',
        ],
        tone: ['yes', 'warn', 'no', 'yes', 'yes', 'yes'],
      },
      {
        key: 'reactivity',
        cells: [
          't:compare.yes',
          't:compare.yes',
          't:compare.yes',
          't:compare.yes',
          't:compare.no',
          't:compare.no',
        ],
        tone: ['yes', 'yes', 'yes', 'yes', 'no', 'no'],
      },
      {
        key: 'components',
        cells: [
          't:compare.yes',
          't:compare.yes',
          't:compare.yes',
          't:compare.partial',
          't:compare.no',
          't:compare.no',
        ],
        tone: ['yes', 'yes', 'yes', 'warn', 'no', 'no'],
      },
      {
        key: 'http',
        cells: [
          't:compare.yes',
          't:compare.no',
          't:compare.no',
          't:compare.no',
          't:compare.yes',
          't:compare.partial',
        ],
        tone: ['yes', 'no', 'no', 'no', 'yes', 'warn'],
      },
      {
        key: 'motion',
        cells: [
          't:compare.yes',
          't:compare.partial',
          't:compare.no',
          't:compare.no',
          't:compare.no',
          't:compare.partial',
        ],
        tone: ['yes', 'warn', 'no', 'no', 'no', 'warn'],
      },
      {
        key: 'i18n',
        cells: [
          't:compare.yes',
          't:compare.no',
          't:compare.no',
          't:compare.no',
          't:compare.no',
          't:compare.no',
        ],
        tone: ['yes', 'no', 'no', 'no', 'no', 'no'],
      },
      {
        key: 'ecosystem',
        cells: [
          't:compare.growing',
          't:compare.huge',
          't:compare.huge',
          't:compare.small',
          't:compare.small',
          't:compare.huge',
        ],
        tone: ['warn', 'yes', 'yes', 'warn', 'warn', 'yes'],
      },
      {
        key: 'bestFor',
        cells: [
          't:compare.bestVoodoo',
          't:compare.bestVue',
          't:compare.bestReact',
          't:compare.bestAlpine',
          't:compare.bestHtmx',
          't:compare.bestJquery',
        ],
        tone: ['', '', '', '', '', ''],
      },
    ],
  };

  // =====================================================================
  // 8. Minigames
  // =====================================================================

  var MEM_ICONS = ['🔮', '🕯️', '🧪', '🪄', '🌙', '🦇', '🍄', '⭐'];

  /** Baralho embaralhado com oito pares. */
  function makeDeck() {
    var deck = [];
    for (var i = 0; i < MEM_ICONS.length; i++) {
      deck.push({ id: i * 2, face: MEM_ICONS[i], up: false, done: false });
      deck.push({ id: i * 2 + 1, face: MEM_ICONS[i], up: false, done: false });
    }
    for (var j = deck.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = deck[j];
      deck[j] = deck[k];
      deck[k] = tmp;
    }
    return deck;
  }

  /**
   * Vira uma carta e resolve o par.
   *
   * A regra e a classica: no maximo duas cartas viradas, e o par errado volta
   * para baixo depois de um instante.
   */
  function memFlip(game, card) {
    if (card.up || card.done || game.locked) return;
    if (!game.started) {
      game.started = Date.now();
      startMemClock(game);
    }

    card.up = true;
    var open = game.deck.filter(function (item) {
      return item.up && !item.done;
    });
    if (open.length < 2) return;

    game.moves++;
    if (open[0].face === open[1].face) {
      open[0].done = true;
      open[1].done = true;
      open[0].up = false;
      open[1].up = false;
      game.pairs++;
      if (game.pairs === MEM_ICONS.length) game.won = true;
      return;
    }

    game.locked = true;
    setTimeout(function () {
      open[0].up = false;
      open[1].up = false;
      game.locked = false;
    }, 760);
  }

  /** Relogio do jogo da memoria, encerrado quando todos os pares aparecem. */
  function startMemClock(game) {
    var timer = setInterval(function () {
      if (game.won || !game.started) {
        clearInterval(timer);
        return;
      }
      game.time = Math.round((Date.now() - game.started) / 1000);
    }, 1000);
  }

  function memReset(game) {
    game.deck = makeDeck();
    game.moves = 0;
    game.pairs = 0;
    game.time = 0;
    game.started = 0;
    game.won = false;
    game.locked = false;
  }

  /** Producao automatica do clicker, um tique por segundo. */
  function clickerStart(game) {
    if (game.ticking) return;
    game.ticking = true;
    setInterval(function () {
      game.potions += game.cauldron + game.familiar * 5;
    }, 1000);
  }

  /** Compra uma melhoria quando ha pocoes suficientes. */
  function clickerBuy(game, name, price) {
    if (game.potions < price) return;
    game.potions -= price;
    game[name]++;
  }

  /** Preco de uma melhoria, que sobe vinte e cinco por cento a cada compra. */
  function clickerCost(base, owned) {
    return Math.round(base * Math.pow(1.25, owned));
  }

  /**
   * Trechos da caca ao bug. Cada um tem exatamente um erro, e o indice da
   * linha errada fica em `wrong`. As explicacoes vivem no dicionario de
   * idiomas, sob `games.bug.e1` ate `games.bug.e5`.
   */
  var BUGS = [
    {
      id: 1,
      lines: ['<div v-data="{ contador: 0 }">', '  <p>{{{ contador }}}</p>', '  <button @click="contador++">+1</button>', '</div>'],
      wrong: 1,
    },
    {
      id: 2,
      lines: ['<ul v-data="{ itens: [1, 2, 3] }">', '  <li v-for="itens in item">{ item }</li>', '</ul>'],
      wrong: 1,
    },
    {
      id: 3,
      lines: ['<div v-data="{ contador: 0 }">', '  <button onclick="contador++">Somar</button>', '  <b>{ contador }</b>', '</div>'],
      wrong: 1,
    },
    {
      id: 4,
      lines: ['<div v-data="{ nome: \'\' }">', '  <input v-bind="nome">', '  <p>Ola, { nome }</p>', '</div>'],
      wrong: 1,
    },
    {
      id: 5,
      lines: ['<div v-resource="post: /api/posts/1">', '  <h3>{ post.title }</h3>', '  <p v-if="post.loading">Carregando</p>', '</div>'],
      wrong: 1,
    },
  ];

  /** Registra a resposta da caca ao bug e avanca a pontuacao. */
  function bugAnswer(game, index) {
    if (game.answered) return;
    game.answered = true;
    game.picked = index;
    game.right = index === BUGS[game.step].wrong;
    if (game.right) game.score++;
  }

  function bugNext(game) {
    if (game.step + 1 >= BUGS.length) {
      game.finished = true;
      return;
    }
    game.step++;
    game.answered = false;
    game.picked = -1;
    game.right = false;
  }

  function bugReset(game) {
    game.step = 0;
    game.score = 0;
    game.answered = false;
    game.picked = -1;
    game.right = false;
    game.finished = false;
  }

  /** Pecas do jogo de montar a directive, na ordem correta de montagem. */
  var BUILDER_ANSWER = ['v-for=', '"item in itens"', ':key=', '"item.id"'];
  var BUILDER_PIECES = ['"item.id"', 'v-for=', ':key=', '"item in itens"', 'v-model=', '"itens in item"'];

  /** Coloca uma peca no primeiro espaco livre, ou no espaco informado. */
  function builderPlace(game, piece, index) {
    var slot = index;
    if (slot === undefined || slot < 0 || game.slots[slot]) {
      slot = game.slots.indexOf('');
    }
    if (slot === -1) return;
    if (game.slots.indexOf(piece) > -1) return;
    game.slots[slot] = piece;
    game.status = '';
  }

  function builderClear(game) {
    game.slots = ['', '', '', ''];
    game.status = '';
    game.solved = false;
  }

  function builderCheck(game) {
    if (game.slots.indexOf('') > -1) {
      game.status = 'incomplete';
      game.solved = false;
      return;
    }
    var ok = game.slots.every(function (value, i) {
      return value === BUILDER_ANSWER[i];
    });
    game.solved = ok;
    game.status = ok ? 'correct' : 'wrong';
  }

  // =====================================================================
  // 9. Auxiliares gerais chamados pelo HTML
  // =====================================================================

  /** Copia texto e devolve um aviso visual pelo proprio botao. */
  function copyText(text, button) {
    V.clipboard.copy(text).then(function (ok) {
      if (!ok) {
        V.toast.error(V.t('hero.copyFail'));
        return;
      }
      if (button) {
        button.dataset.done = 'true';
        setTimeout(function () {
          button.dataset.done = 'false';
        }, 1800);
      }
      V.toast.success(V.t('hero.copied'));
    });
  }

  /** Marca o cabecalho quando a pagina sai do topo. */
  function watchHeader() {
    var header = document.querySelector('.vd-header');
    if (!header) return;
    var apply = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
  }

  /** Troca `?lang=` na URL sem recarregar, para o compartilhamento ficar certo. */
  function syncUrlLocale() {
    V.effect(function () {
      var locale = V.i18n.locale;
      try {
        var url = new URL(location.href);
        if (locale === 'pt-BR') url.searchParams.delete('lang');
        else url.searchParams.set('lang', locale);
        history.replaceState(null, '', url.toString());
      } catch (err) {
        // Ambientes sem history nao quebram a pagina por causa disto.
      }
    });
  }

  // =====================================================================
  // 10. Publicacao no escopo raiz
  // =====================================================================

  V.data({
    site: SITE,
    github: GITHUB,
    cdn: CDN,
    cdnTag: '<script src="' + CDN + '" defer><\/script>',
    npmCmd: 'npm install voodoojs',

    // Numeros medidos por `node scripts/size.mjs` na raiz do repositorio.
    stats: {
      gzip: 85,
      raw: 263,
      brotli: 72,
      essentialGzip: 58,
      directives: V.directives.size,
      components: V.components.size,
      deps: 0,
      build: 0,
      tests: 177,
      leftovers: 0,
    },

    locales: window.VOODOO_LOCALES,
    examples: EXAMPLES,
    demos: DEMOS,
    compare: COMPARE,
    builderPieces: BUILDER_PIECES,
    bugs: BUGS,
    memIcons: MEM_ICONS,

    // Auxiliares chamados pelas expressoes do HTML.
    preview: preview,
    cell: cell,
    copyText: copyText,
    makeDeck: makeDeck,
    memFlip: memFlip,
    memReset: memReset,
    clickerStart: clickerStart,
    clickerBuy: clickerBuy,
    clickerCost: clickerCost,
    bugAnswer: bugAnswer,
    bugNext: bugNext,
    bugReset: bugReset,
    builderPlace: builderPlace,
    builderClear: builderClear,
    builderCheck: builderCheck,

    /** Codigo do exemplo escolhido no playground. */
    exampleCode: function (id) {
      for (var i = 0; i < EXAMPLES.length; i++) {
        if (EXAMPLES[i].id === id) return EXAMPLES[i].code;
      }
      return '';
    },
  });

  // =====================================================================
  // 11. Depois que a pagina esta viva
  // =====================================================================

  document.addEventListener('voodoo:ready', function () {
    watchHeader();
    syncUrlLocale();

    // O tema do quadro de pre visualizacao acompanha o tema da pagina.
    document.addEventListener('voodoo:theme', function () {
      var frames = document.querySelectorAll('iframe[data-live]');
      for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        var doc = frame.contentDocument;
        if (doc && doc.documentElement) {
          doc.documentElement.setAttribute('data-theme', V.theme.resolved);
        }
      }
    });
  });
})();
