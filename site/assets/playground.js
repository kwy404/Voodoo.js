/**
 * Playground interativo da Voodoo.js.
 *
 * Editor de HTML a esquerda, resultado ao vivo a direita, rodando dentro de um
 * quadro isolado que carrega a mesma biblioteca da pagina. Escrito com a
 * propria Voodoo, entao a pagina serve de prova de que a biblioteca aguenta uma
 * interface de verdade.
 *
 * Recursos: 24 exemplos por categoria, numeracao de linhas, tabulacao dentro do
 * editor, atalho para executar, console capturado do quadro, larguras de
 * celular, tablet e computador, copiar, abrir em aba nova e link compartilhavel.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.V) return;

  // =====================================================================
  // 1. Exemplos
  // =====================================================================

  /**
   * Cada exemplo tem categoria, titulo curto, uma linha de explicacao e o
   * codigo. O titulo e a explicacao passam pelo dicionario de idiomas quando a
   * chave existir, e caem no texto em portugues quando nao existir.
   */
  var EXEMPLOS = [
    // ---------------------------------------------------------------- base
    {
      id: 'estado',
      grupo: 'base',
      titulo: 'Estado e interpolacao',
      desc: 'v-data cria o escopo, e { variavel } escreve o valor no texto.',
      code: [
        '<div v-data="{ nome: \'Vudu\', cliques: 0 }">',
        '  <h3>Ola, { nome }!</h3>',
        '  <p>Voce clicou { cliques } vezes.</p>',
        '',
        '  <input v-model="nome" placeholder="Escreva um nome">',
        '  <button @click="cliques++">Clique aqui</button>',
        '  <button @click="cliques = 0">Zerar</button>',
        '',
        '  <p v-show="cliques > 4">Ja deu, ne?</p>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'condicional',
      grupo: 'base',
      titulo: 'Condicionais',
      desc: 'v-if insere e remove do DOM. v-show apenas esconde.',
      code: [
        '<div v-data="{ nota: 10 }">',
        '  <label>Nota: { nota }</label><br>',
        '  <input type="range" min="0" max="10" v-model.number="nota">',
        '',
        '  <h3 v-if="nota >= 9">Otimo</h3>',
        '  <h3 v-else-if="nota >= 6">Bom</h3>',
        '  <h3 v-else>Precisa melhorar</h3>',
        '',
        '  <p v-show="nota === 10">Nota cheia, parabens.</p>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'lista',
      grupo: 'base',
      titulo: 'Listas com v-for',
      desc: 'A chave em :key faz a Voodoo reaproveitar os elementos existentes.',
      code: [
        '<div v-data="{ novo: \'\', itens: [',
        '  { id: 1, texto: \'Estudar v-for\' },',
        '  { id: 2, texto: \'Fazer um cafe\' }',
        '] }">',
        '  <form @submit.prevent="itens.push({ id: Date.now(), texto: novo }); novo = \'\'">',
        '    <input v-model="novo" placeholder="Novo item">',
        '    <button>Adicionar</button>',
        '  </form>',
        '',
        '  <ul>',
        '    <li v-for="(item, i) in itens" :key="item.id">',
        '      { i + 1 }. { item.texto }',
        '      <button @click="itens = itens.filter(x => x.id !== item.id)">x</button>',
        '    </li>',
        '  </ul>',
        '',
        '  <p>Total: { itens.length }</p>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'computado',
      grupo: 'base',
      titulo: 'Valores derivados',
      desc: 'Qualquer expressao pode ser calculada na hora, direto no HTML.',
      code: [
        '<div v-data="{ precos: [19.9, 45, 12.5, 99], desconto: 10 }">',
        '  <p>Itens: { precos.length }</p>',
        '  <p>Subtotal: { precos.reduce((s, p) => s + p, 0).toFixed(2) }</p>',
        '  <p>Desconto: { desconto }%</p>',
        '  <p><strong>Total: R$ {',
        '    (precos.reduce((s, p) => s + p, 0) * (1 - desconto / 100)).toFixed(2)',
        '  }</strong></p>',
        '',
        '  <input type="range" min="0" max="50" v-model.number="desconto">',
        '</div>',
      ].join('\n'),
    },

    // ------------------------------------------------------------ formulario
    {
      id: 'formulario',
      grupo: 'formulario',
      titulo: 'Ligacao de dois sentidos',
      desc: 'v-model funciona em texto, numero, caixa, radio, select e textarea.',
      code: [
        '<div v-data="{ nome: \'\', idade: 25, aceito: false, uf: \'SP\', cor: \'azul\', bio: \'\' }">',
        '  <input v-model="nome" placeholder="Nome">',
        '  <input type="number" v-model.number="idade">',
        '',
        '  <label><input type="checkbox" v-model="aceito"> Aceito os termos</label>',
        '',
        '  <label><input type="radio" value="azul" v-model="cor"> Azul</label>',
        '  <label><input type="radio" value="verde" v-model="cor"> Verde</label>',
        '',
        '  <select v-model="uf">',
        '    <option>SP</option><option>RJ</option><option>MG</option>',
        '  </select>',
        '',
        '  <textarea v-model="bio" placeholder="Fale de voce"></textarea>',
        '',
        '  <pre>{ JSON.stringify({ nome, idade, aceito, uf, cor, bio }, null, 2) }</pre>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'validacao',
      grupo: 'formulario',
      titulo: 'Validacao sem JavaScript',
      desc: 'As regras ficam no proprio campo, e a mensagem aparece sozinha.',
      code: [
        '<form v-validate @submit.prevent>',
        '  <p><input name="nome" v-required v-minlength="3" placeholder="Nome completo"></p>',
        '  <p><input name="email" v-required v-email placeholder="E-mail"></p>',
        '  <p><input name="cpf" v-mask="cpf" v-cpf placeholder="CPF"></p>',
        '  <p><input name="tel" v-mask="phone" placeholder="Telefone"></p>',
        '  <p><input name="senha" type="password" v-strong-password placeholder="Senha forte"></p>',
        '  <p><input name="senha2" type="password" v-match="senha" placeholder="Repita a senha"></p>',
        '  <button type="submit">Enviar</button>',
        '</form>',
        '',
        '<p><small>Saia de cada campo para ver a validacao.</small></p>',
      ].join('\n'),
    },
    {
      id: 'mascara',
      grupo: 'formulario',
      titulo: 'Mascaras de campo',
      desc: 'Quinze formatos prontos, e voce pode declarar o seu.',
      code: [
        '<div v-data="{}">',
        '  <p><input v-mask="cpf" placeholder="CPF"></p>',
        '  <p><input v-mask="cnpj" placeholder="CNPJ"></p>',
        '  <p><input v-mask="phone" placeholder="Telefone"></p>',
        '  <p><input v-mask="cep" placeholder="CEP"></p>',
        '  <p><input v-mask="date" placeholder="Data"></p>',
        '  <p><input v-mask="currency" placeholder="Valor"></p>',
        '  <p><input v-mask="card" placeholder="Cartao"></p>',
        '  <p><input v-mask="AAA-9999" placeholder="Padrao proprio"></p>',
        '</div>',
      ].join('\n'),
    },

    // ---------------------------------------------------------------- eventos
    {
      id: 'eventos',
      grupo: 'eventos',
      titulo: 'Eventos e modificadores',
      desc: 'Atalhos de teclado, clique fora, segurar e gestos, tudo por atributo.',
      code: [
        '<div v-data="{ log: [], aberto: false }">',
        '  <button @click="log.push(\'clique\')">Clique</button>',
        '  <button @click.once="log.push(\'so uma vez\')">Uma vez</button>',
        '  <button @hold.1s="log.push(\'segurou 1 segundo\')">Segure</button>',
        '',
        '  <input @keyup.enter="log.push(\'Enter: \' + $event.target.value)"',
        '         placeholder="Digite e aperte Enter">',
        '',
        '  <div style="border:1px solid #8886;padding:10px;margin-top:10px"',
        '       @click="aberto = true" @outside="aberto = false">',
        '    Clique aqui dentro e depois fora. Estado: { aberto ? \'aberto\' : \'fechado\' }',
        '  </div>',
        '',
        '  <ul><li v-for="(l, i) in log.slice(-6)" :key="i">{ l }</li></ul>',
        '  <button @click="log = []">Limpar</button>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'teclas',
      grupo: 'eventos',
      titulo: 'Atalho global de teclado',
      desc: 'v-hotkey registra a combinacao na pagina inteira.',
      code: [
        '<div v-data="{ acoes: [] }">',
        '  <p>Experimente <kbd>Ctrl</kbd> + <kbd>K</kbd> e depois <kbd>Ctrl</kbd> + <kbd>S</kbd>.</p>',
        '',
        '  <button v-hotkey="ctrl+k" @click="acoes.push(\'busca aberta\')">Buscar</button>',
        '  <button v-hotkey="ctrl+s" @click="acoes.push(\'salvo\')">Salvar</button>',
        '',
        '  <ul><li v-for="(a, i) in acoes" :key="i">{ a }</li></ul>',
        '</div>',
      ].join('\n'),
    },

    // ------------------------------------------------------------- componente
    {
      id: 'componente',
      grupo: 'componente',
      titulo: 'Componente com props e slot',
      desc: 'Registre uma vez e use como tag, com props, slot e evento.',
      code: [
        '<div v-data="{ ultimo: \'nenhum\' }">',
        '  <cartao-produto nome="Caneca" preco="39.9" @comprou="ultimo = $event"></cartao-produto>',
        '  <cartao-produto nome="Camiseta" preco="79" @comprou="ultimo = $event">',
        '    <small>Frete gratis</small>',
        '  </cartao-produto>',
        '',
        '  <p>Ultimo comprado: <strong>{ ultimo }</strong></p>',
        '</div>',
        '',
        '<script>',
        '  V.component(\'cartao-produto\', {',
        '    props: { nome: { type: \'string\' }, preco: { type: \'number\' } },',
        '    state: () => ({ qtd: 1 }),',
        '    methods: {',
        '      comprar() { this.emit(\'comprou\', this.nome + \' x\' + this.qtd); }',
        '    },',
        '    template: `',
        '      <div style="border:1px solid #8886;border-radius:10px;padding:12px;margin:8px 0">',
        '        <strong>{ nome }</strong>',
        '        <div>R$ { preco.toFixed(2) }</div>',
        '        <slot></slot>',
        '        <button v-click="qtd > 1 && qtd--">-</button>',
        '        <span> { qtd } </span>',
        '        <button v-click="qtd++">+</button>',
        '        <button v-click="comprar">Comprar</button>',
        '      </div>`',
        '  });',
        '<\/script>',
      ].join('\n'),
    },
    {
      id: 'prontos',
      grupo: 'componente',
      titulo: 'Componentes prontos',
      desc: 'Vinte e nove componentes acessiveis, com aparencia propria.',
      code: [
        '<div v-data="{ uf: \'\', aceito: false, nota: 3 }">',
        '  <VButton variant="primary">Primario</VButton>',
        '  <VButton variant="secondary">Secundario</VButton>',
        '  <VButton variant="danger">Perigo</VButton>',
        '',
        '  <VBadge tone="success">Ativo</VBadge>',
        '  <VBadge tone="warning">Pendente</VBadge>',
        '',
        '  <VInput label="Seu nome" placeholder="Escreva aqui"></VInput>',
        '  <VSwitch label="Receber avisos"></VSwitch>',
        '  <VProgress value="64"></VProgress>',
        '  <VAlert tone="info">Isto e um aviso informativo.</VAlert>',
        '  <VAvatar name="Ana Souza"></VAvatar>',
        '</div>',
      ].join('\n'),
    },

    // -------------------------------------------------------------------- http
    {
      id: 'recurso',
      grupo: 'http',
      titulo: 'Buscar dados de uma API',
      desc: 'v-resource entrega dados, carregando e erro em uma linha.',
      code: [
        '<div v-resource="pokemon: https://pokeapi.co/api/v2/pokemon?limit=8">',
        '',
        '  <p v-if="pokemon.loading">Carregando...</p>',
        '  <p v-else-if="pokemon.error">Falhou: { pokemon.error.message }</p>',
        '',
        '  <ul v-else>',
        '    <li v-for="p in pokemon.data.results" :key="p.name">{ p.name }</li>',
        '  </ul>',
        '',
        '  <button @click="pokemon.reload()">Atualizar</button>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'requisicao',
      grupo: 'http',
      titulo: 'Requisicao por atributo',
      desc: 'v-get busca e injeta o resultado no alvo, sem escrever JavaScript.',
      code: [
        '<div v-data="{}">',
        '  <button v-get="https://api.github.com/repos/vuejs/core"',
        '          v-target="#saida"',
        '          v-json-path="stargazers_count"',
        '          v-loading-class="carregando">',
        '    Buscar estrelas do Vue',
        '  </button>',
        '',
        '  <div id="saida" style="margin-top:12px;padding:10px;border:1px dashed #8886">',
        '    O resultado aparece aqui.',
        '  </div>',
        '</div>',
      ].join('\n'),
    },

    // -------------------------------------------------------------- interface
    {
      id: 'modal',
      grupo: 'interface',
      titulo: 'Modal e dialogos',
      desc: 'Foco preso, fecha no Escape e devolve o foco ao sair.',
      code: [
        '<div v-data="{ resposta: \'\' }">',
        '  <button v-modal="#exemplo">Abrir modal</button>',
        '  <button @click="V.confirm(\'Tem certeza?\').then(r => resposta = r ? \'sim\' : \'nao\')">',
        '    Confirmar',
        '  </button>',
        '  <button @click="V.toast.success(\'Deu certo!\')">Aviso</button>',
        '',
        '  <p>Resposta: { resposta }</p>',
        '',
        '  <div id="exemplo" v-modal-content>',
        '    <h3>Ola do modal</h3>',
        '    <p>Aperte Escape ou clique fora para fechar.</p>',
        '    <button v-modal-close>Fechar</button>',
        '  </div>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'abas',
      grupo: 'interface',
      titulo: 'Abas e sanfona',
      desc: 'Navegacao por setas e papeis ARIA corretos, de graca.',
      code: [
        '<div v-tabs>',
        '  <button v-tab="a">Perfil</button>',
        '  <button v-tab="b">Ajustes</button>',
        '  <button v-tab="c">Cobranca</button>',
        '',
        '  <div v-tab-panel="a"><p>Conteudo do perfil.</p></div>',
        '  <div v-tab-panel="b"><p>Conteudo dos ajustes.</p></div>',
        '  <div v-tab-panel="c"><p>Conteudo da cobranca.</p></div>',
        '</div>',
        '',
        '<hr>',
        '',
        '<div v-accordion v-accordion-single>',
        '  <div v-accordion-item>',
        '    <button v-collapse-toggle="#p1">Como instalar?</button>',
        '    <div id="p1" v-collapse><p>Baixe o arquivo e coloque uma tag script.</p></div>',
        '  </div>',
        '  <div v-accordion-item>',
        '    <button v-collapse-toggle="#p2">Precisa de build?</button>',
        '    <div id="p2" v-collapse><p>Nao precisa de nenhum passo de compilacao.</p></div>',
        '  </div>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'arrastar',
      grupo: 'interface',
      titulo: 'Arrastar para reordenar',
      desc: 'v-sortable funciona no mouse, no toque e pelo teclado.',
      code: [
        '<div v-data="{ tarefas: [\'Primeira\', \'Segunda\', \'Terceira\', \'Quarta\'] }">',
        '  <p>Arraste os itens para reordenar.</p>',
        '  <ul v-sortable>',
        '    <li v-for="t in tarefas" :key="t"',
        '        style="padding:8px;margin:4px 0;border:1px solid #8886;border-radius:8px;cursor:grab">',
        '      { t }',
        '    </li>',
        '  </ul>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'tooltip',
      grupo: 'interface',
      titulo: 'Dicas, menu e copiar',
      desc: 'Posicionamento que evita sair da tela, e area de transferencia.',
      code: [
        '<div v-data="{}">',
        '  <button v-tooltip="Isto e uma dica" v-tooltip-position="top">Passe o mouse</button>',
        '  <button v-copy="PROMO10">Copiar cupom</button>',
        '',
        '  <button v-dropdown="#menu">Acoes</button>',
        '  <div id="menu" v-dropdown-menu>',
        '    <button>Editar</button>',
        '    <button>Duplicar</button>',
        '    <button>Excluir</button>',
        '  </div>',
        '</div>',
      ].join('\n'),
    },

    // ---------------------------------------------------------------- visual
    {
      id: 'animacao',
      grupo: 'visual',
      titulo: 'Animacao com fisica',
      desc: 'Molas de verdade, e tudo respeita quem prefere menos movimento.',
      code: [
        '<div v-data="{ mostrar: true }">',
        '  <button @click="mostrar = !mostrar">Alternar</button>',
        '',
        '  <div v-if="mostrar" v-motion="{ opacity: [0,1], y: [24,0], spring: true }"',
        '       style="padding:20px;border:1px solid #8886;border-radius:12px;margin-top:12px">',
        '    <h3>Entrei com mola</h3>',
        '    <p>Numero animado: <strong v-count="1250" v-count-duration="900">0</strong></p>',
        '    <p v-typewriter="JavaScript feels like magic."></p>',
        '  </div>',
        '',
        '  <button v-motion-hover="{ scale: 1.08 }" v-motion-tap="{ scale: 0.94 }"',
        '          style="margin-top:12px">Passe o mouse aqui</button>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'grafico',
      grupo: 'visual',
      titulo: 'Graficos reativos',
      desc: 'SVG puro, sem biblioteca externa. Mudou o dado, redesenha.',
      code: [
        '<div v-data="{ dados: [12, 28, 19, 34, 22, 40] }">',
        '  <button @click="dados = dados.map(() => Math.round(Math.random() * 50) + 5)">',
        '    Sortear novos numeros',
        '  </button>',
        '',
        '  <div v-chart="{ type: \'line\', data: dados, smooth: true }" style="height:150px"></div>',
        '  <div v-chart="{ type: \'bar\', data: dados }" style="height:150px"></div>',
        '  <div v-chart="{ type: \'donut\', data: dados.slice(0, 4), showLegend: true }" style="height:180px"></div>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'tema',
      grupo: 'visual',
      titulo: 'Tema e paleta',
      desc: 'A escala inteira de cores nasce das cores que voce escolher.',
      code: [
        '<div v-data="{}">',
        '  <button v-theme-toggle>Alternar claro e escuro</button>',
        '',
        '  <p style="margin-top:12px">Trocar a paleta muda a interface toda:</p>',
        '  <button @click="V.palette({ preset: \'violeta\' })">Violeta</button>',
        '  <button @click="V.palette({ preset: \'oceano\' })">Oceano</button>',
        '  <button @click="V.palette({ preset: \'floresta\' })">Floresta</button>',
        '  <button @click="V.palette({ primary: \'#FF3D8B\' })">Rosa</button>',
        '',
        '  <div style="margin-top:14px">',
        '    <VButton variant="primary">Botao</VButton>',
        '    <VBadge tone="success">Etiqueta</VBadge>',
        '    <VProgress value="70"></VProgress>',
        '  </div>',
        '</div>',
      ].join('\n'),
    },

    // ---------------------------------------------------------------- estado
    {
      id: 'persistencia',
      grupo: 'estado',
      titulo: 'Estado que sobrevive ao F5',
      desc: 'v-persist guarda o escopo. v-history da desfazer e refazer.',
      code: [
        '<div v-data="{ texto: \'\' }" v-persist="playground-rascunho" v-history>',
        '  <p>Escreva algo, recarregue a pagina e veja que o texto continua.</p>',
        '  <textarea v-model="texto" rows="4" style="width:100%"></textarea>',
        '',
        '  <button v-undo :disabled="!$history.canUndo">Desfazer</button>',
        '  <button v-redo :disabled="!$history.canRedo">Refazer</button>',
        '',
        '  <p><small>Passos guardados: { $history.size }</small></p>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'loja',
      grupo: 'estado',
      titulo: 'Estado global compartilhado',
      desc: 'Um store e visivel de qualquer canto da pagina por $store.',
      code: [
        '<div v-data="{}">',
        '  <h4>Vitrine</h4>',
        '  <button @click="$store.carrinho.adicionar(\'Caneca\', 39.9)">Caneca R$ 39,90</button>',
        '  <button @click="$store.carrinho.adicionar(\'Camiseta\', 79)">Camiseta R$ 79,00</button>',
        '</div>',
        '',
        '<div v-data="{}" style="margin-top:16px;padding:12px;border:1px solid #8886;border-radius:10px">',
        '  <h4>Carrinho ({ $store.carrinho.itens.length })</h4>',
        '  <ul>',
        '    <li v-for="(i, k) in $store.carrinho.itens" :key="k">{ i.nome }: R$ { i.preco.toFixed(2) }</li>',
        '  </ul>',
        '  <strong>Total: R$ { $store.carrinho.total.toFixed(2) }</strong>',
        '  <button @click="$store.carrinho.limpar()">Esvaziar</button>',
        '</div>',
        '',
        '<script>',
        '  V.store(\'carrinho\', {',
        '    itens: [],',
        '    get total() { return this.itens.reduce((s, i) => s + i.preco, 0); },',
        '    adicionar(nome, preco) { this.itens.push({ nome: nome, preco: preco }); },',
        '    limpar() { this.itens = []; }',
        '  });',
        '<\/script>',
      ].join('\n'),
    },
    {
      id: 'abas-sync',
      grupo: 'estado',
      titulo: 'Sincronia entre abas',
      desc: 'v-sync espelha o estado nas outras abas abertas, sem servidor.',
      code: [
        '<div v-data="{ contador: 0, texto: \'\' }" v-sync="playground-demo">',
        '  <p>Abra este playground em outra aba do navegador e mexa aqui.</p>',
        '',
        '  <button @click="contador++">Somar: { contador }</button>',
        '  <input v-model="texto" placeholder="Digite e veja na outra aba">',
        '</div>',
      ].join('\n'),
    },

    // ----------------------------------------------------------------- extra
    {
      id: 'directive',
      grupo: 'extra',
      titulo: 'Directive propria',
      desc: 'Estenda a biblioteca com o seu proprio atributo.',
      code: [
        '<div v-data="{ cor: \'#FFB35C\' }">',
        '  <input type="color" v-model="cor">',
        '  <p v-destaque="cor">Este paragrafo usa uma directive escrita na hora.</p>',
        '  <p v-inverter>este texto sai ao contrario</p>',
        '</div>',
        '',
        '<script>',
        '  V.directive(\'destaque\', {',
        '    mounted(el, b) { el.style.background = b.value; el.style.padding = \'6px\'; },',
        '    updated(el, b) { el.style.background = b.value; }',
        '  });',
        '',
        '  V.directive(\'inverter\', el => {',
        '    el.textContent = el.textContent.split(\'\').reverse().join(\'\');',
        '  });',
        '<\/script>',
      ].join('\n'),
    },
    {
      id: 'magias',
      grupo: 'extra',
      titulo: 'Variaveis magicas',
      desc: 'Trinta e nove valores globais disponiveis em qualquer expressao.',
      code: [
        '<div v-data="{}">',
        '  <p>Largura da tela: { $screen.width }px</p>',
        '  <p>Celular: { $screen.mobile ? \'sim\' : \'nao\' }</p>',
        '  <p>Conexao: { $network.online ? \'conectado\' : \'offline\' }</p>',
        '  <p>Tema atual: { $theme.resolved }</p>',
        '',
        '  <button @click="$clipboard.copy(\'copiado pela magia\')">Copiar</button>',
        '  <button @click="$toast.info(\'A largura e \' + $screen.width)">Mostrar largura</button>',
        '',
        '  <input v-ref="alvo" placeholder="Campo com referencia">',
        '  <button @click="$refs.alvo.focus()">Focar no campo</button>',
        '</div>',
      ].join('\n'),
    },
    {
      id: 'teleporte',
      grupo: 'extra',
      titulo: 'Teleporte e visibilidade',
      desc: 'Mova um elemento no documento e reaja quando ele entra na tela.',
      code: [
        '<div v-data="{ apareceu: false }">',
        '  <p>Role o quadro para baixo.</p>',
        '  <div style="height:220px"></div>',
        '',
        '  <div @visible="apareceu = true"',
        '       style="padding:16px;border:1px solid #8886;border-radius:10px">',
        '    { apareceu ? \'Voce me viu, entao eu apareci.\' : \'Ainda nao apareci.\' }',
        '  </div>',
        '',
        '  <div style="height:120px"></div>',
        '</div>',
      ].join('\n'),
    },
  ];

  var GRUPOS = [
    { id: 'base', titulo: 'Basico' },
    { id: 'formulario', titulo: 'Formularios' },
    { id: 'eventos', titulo: 'Eventos' },
    { id: 'componente', titulo: 'Componentes' },
    { id: 'http', titulo: 'Dados' },
    { id: 'interface', titulo: 'Interface' },
    { id: 'visual', titulo: 'Visual' },
    { id: 'estado', titulo: 'Estado' },
    { id: 'extra', titulo: 'Avancado' },
  ];

  // =====================================================================
  // 2. Documento do quadro
  // =====================================================================

  /** Caminho absoluto da biblioteca, para funcionar dentro do `srcdoc`. */
  var LIB = new URL('voodoo.full.min.js', document.baseURI).href;

  var CSS_QUADRO = [
    '*{box-sizing:border-box}',
    'body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:18px;',
    'background:var(--v-surface,#fff);color:var(--v-text,#14111F)}',
    'h3,h4{margin:.2em 0 .5em}',
    'button{font:inherit;padding:.45rem .8rem;margin:0 .3rem .3rem 0;border-radius:.55rem;',
    'border:1px solid var(--v-border,#E6E0F0);background:var(--v-surface-2,#FBF7F2);',
    'color:inherit;cursor:pointer}',
    'button:hover{border-color:var(--v-primary,#6D3BF5)}',
    'input,select,textarea{font:inherit;padding:.45rem .6rem;border-radius:.55rem;',
    'border:1px solid var(--v-border,#E6E0F0);background:var(--v-surface,#fff);color:inherit;',
    'max-width:100%;margin:0 0 .3rem}',
    'ul{padding-left:1.1rem}',
    'li{margin:.2rem 0}',
    'pre{background:var(--v-surface-2,#FBF7F2);padding:10px;border-radius:8px;overflow:auto;font-size:13px}',
    'kbd{background:var(--v-surface-2,#FBF7F2);border:1px solid var(--v-border,#E6E0F0);',
    'border-radius:5px;padding:1px 5px;font-size:.85em}',
    'hr{border:0;border-top:1px solid var(--v-border,#E6E0F0);margin:1rem 0}',
    'label{display:inline-block;margin:0 .6rem .3rem 0}',
  ].join('');

  /**
   * Monta o documento do quadro. O script de captura roda antes da biblioteca
   * para que qualquer erro do exemplo apareca no console do playground.
   */
  function documentoDoQuadro(html) {
    // `V.i18n.locale` fica congelado no valor inicial, porque o modulo monta o
    // objeto com Object.assign e isso achata o getter. `V.getLocale()` le o
    // estado reativo de verdade.
    var locale = (window.V.getLocale && window.V.getLocale()) || 'pt-BR';
    var tema = window.V.theme.resolved;

    return [
      '<!doctype html><html lang="', locale, '" data-theme="', tema, '">',
      '<head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<style>', CSS_QUADRO, '</style>',
      '<script>',
      '(function(){',
      'function envia(tipo, args){',
      '  try{',
      '    var texto = Array.prototype.map.call(args, function(a){',
      '      if (a instanceof Error) return a.message;',
      '      if (typeof a === "object" && a !== null) { try { return JSON.stringify(a); } catch(e) { return String(a); } }',
      '      return String(a);',
      '    }).join(" ");',
      '    parent.postMessage({ voodooPlayground: true, tipo: tipo, texto: texto }, "*");',
      '  }catch(e){}',
      '}',
      'var original = { log: console.log, warn: console.warn, error: console.error };',
      '["log","warn","error"].forEach(function(nivel){',
      '  console[nivel] = function(){ envia(nivel, arguments); original[nivel].apply(console, arguments); };',
      '});',
      'window.addEventListener("error", function(e){ envia("error", [e.message]); });',
      'window.addEventListener("unhandledrejection", function(e){ envia("error", [String(e.reason)]); });',
      '})();',
      '<\/script>',
      '<script src="', LIB, '"><\/script>',
      '</head><body>', html, '</body></html>',
    ].join('');
  }

  // =====================================================================
  // 3. Componente do playground
  // =====================================================================

  var LARGURAS = { telefone: 380, tablet: 768, tela: 0 };

  function exemploPorId(id) {
    for (var i = 0; i < EXEMPLOS.length; i++) {
      if (EXEMPLOS[i].id === id) return EXEMPLOS[i];
    }
    return EXEMPLOS[0];
  }

  /** Le o codigo compartilhado por link, quando existir. */
  function codigoDaUrl() {
    try {
      var hash = location.hash || '';
      var marca = '#codigo=';
      if (hash.indexOf(marca) !== 0) return null;
      return decodeURIComponent(escape(atob(hash.slice(marca.length))));
    } catch (e) {
      return null;
    }
  }

  V.component('vd-playground', {
    state: function () {
      var compartilhado = codigoDaUrl();
      var inicial = compartilhado || EXEMPLOS[0].code;

      return {
        grupos: GRUPOS,
        exemplos: EXEMPLOS,
        atual: EXEMPLOS[0].id,
        grupoAberto: 'base',
        codigo: inicial,
        larguras: ['telefone', 'tablet', 'tela'],
        largura: 'tela',
        console: [],
        consoleAberto: false,
        rodando: false,
        copiado: false,
        linkCopiado: false,
        automatico: true,
      };
    },

    computed: {
      /** Exemplos do grupo aberto, para a lista lateral. */
      exemplosDoGrupo: function () {
        var grupo = this.grupoAberto;
        return EXEMPLOS.filter(function (e) {
          return e.grupo === grupo;
        });
      },
      exemploAtual: function () {
        return exemploPorId(this.atual);
      },
      linhas: function () {
        return String(this.codigo || '').split('\n').length;
      },
      numeros: function () {
        var out = [];
        for (var i = 1; i <= this.linhas; i++) out.push(i);
        return out;
      },
      erros: function () {
        return this.console.filter(function (l) {
          return l.tipo === 'error';
        }).length;
      },
      estiloDoQuadro: function () {
        var largura = LARGURAS[this.largura];
        return largura ? { width: largura + 'px', margin: '0 auto' } : { width: '100%' };
      },
    },

    methods: {
      /** Troca o exemplo mostrado e executa na hora. */
      escolher: function (id) {
        this.atual = id;
        this.codigo = exemploPorId(id).code;
        this.console = [];
        this.executar(0);
      },

      abrirGrupo: function (id) {
        this.grupoAberto = id;
      },

      restaurar: function () {
        this.codigo = this.exemploAtual.code;
        this.console = [];
        this.executar(0);
      },

      /** Escreve o codigo no quadro, com espera para nao recarregar a cada tecla. */
      executar: function (espera) {
        var self = this;
        var quadro = this.$refs.quadro;
        if (!quadro) return;

        clearTimeout(this._timer);
        this.rodando = true;

        this._timer = setTimeout(function () {
          self.console = [];
          quadro.srcdoc = documentoDoQuadro(self.codigo);
          setTimeout(function () {
            self.rodando = false;
          }, 260);
        }, espera === undefined ? 420 : espera);
      },

      /** Tabulacao dentro do editor, em vez de pular para o proximo campo. */
      teclado: function (evento) {
        var area = evento.target;

        if (evento.key === 'Tab') {
          evento.preventDefault();
          var inicio = area.selectionStart;
          var fim = area.selectionEnd;
          area.value = area.value.slice(0, inicio) + '  ' + area.value.slice(fim);
          area.selectionStart = area.selectionEnd = inicio + 2;
          this.codigo = area.value;
          return;
        }

        if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
          evento.preventDefault();
          this.executar(0);
        }
      },

      copiar: function () {
        var self = this;
        V.clipboard.copy(this.codigo).then(function () {
          self.copiado = true;
          setTimeout(function () {
            self.copiado = false;
          }, 1600);
        });
      },

      /** Gera um link com o codigo embutido, para compartilhar o exemplo. */
      compartilhar: function () {
        var self = this;
        var codificado = btoa(unescape(encodeURIComponent(this.codigo)));
        var link = location.origin + location.pathname + '#codigo=' + encodeURIComponent(codificado);
        V.clipboard.copy(link).then(function () {
          self.linkCopiado = true;
          setTimeout(function () {
            self.linkCopiado = false;
          }, 1600);
        });
      },

      /** Abre o exemplo sozinho em uma aba nova. */
      abrirEmAba: function () {
        var blob = new Blob([documentoDoQuadro(this.codigo)], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 30000);
      },

      limparConsole: function () {
        this.console = [];
      },
    },

    mounted: function () {
      var self = this;

      // Recebe o que o quadro escreveu no console.
      this._ouvinte = function (evento) {
        var dados = evento.data;
        if (!dados || !dados.voodooPlayground) return;
        self.console.push({ tipo: dados.tipo, texto: dados.texto, hora: new Date().toLocaleTimeString() });
        if (self.console.length > 60) self.console.shift();
        if (dados.tipo === 'error') self.consoleAberto = true;
      };
      window.addEventListener('message', this._ouvinte);

      // Redesenha o quadro quando o tema da pagina muda.
      this._tema = function () {
        self.executar(0);
      };
      document.addEventListener('voodoo:theme', this._tema);

      // Se o codigo veio por link, mostra a aba de exemplos correspondente.
      this.executar(0);
    },

    beforeUnmount: function () {
      window.removeEventListener('message', this._ouvinte);
      document.removeEventListener('voodoo:theme', this._tema);
      clearTimeout(this._timer);
    },

    template: [
      '<div class="vdp">',

      // Trilha de grupos.
      '  <div class="vdp-grupos" role="tablist" aria-label="Categorias de exemplos">',
      '    <button v-for="g in grupos" :key="g.id" type="button" role="tab"',
      '            class="vdp-grupo" :class="{ \'is-on\': grupoAberto === g.id }"',
      '            :aria-selected="grupoAberto === g.id"',
      '            v-click="abrirGrupo(g.id)" v-text="g.titulo"></button>',
      '  </div>',

      '  <div class="vdp-corpo">',

      // Lista de exemplos do grupo.
      '    <aside class="vdp-lista">',
      '      <button v-for="ex in exemplosDoGrupo" :key="ex.id" type="button"',
      '              class="vdp-item" :class="{ \'is-on\': atual === ex.id }"',
      '              v-click="escolher(ex.id)">',
      '        <strong v-text="ex.titulo"></strong>',
      '        <small v-text="ex.desc"></small>',
      '      </button>',
      '    </aside>',

      '    <div class="vdp-painel">',

      // Editor.
      '      <div class="vdp-caixa">',
      '        <div class="vdp-barra">',
      '          <span class="vdp-rotulo">HTML</span>',
      '          <span class="vdp-espaco"></span>',
      '          <button type="button" class="vdp-acao" v-click="executar(0)" title="Ctrl + Enter">Executar</button>',
      '          <button type="button" class="vdp-acao" v-click="restaurar()">Restaurar</button>',
      '          <button type="button" class="vdp-acao" v-click="copiar()"',
      '                  v-text="copiado ? \'Copiado!\' : \'Copiar\'"></button>',
      '          <button type="button" class="vdp-acao" v-click="compartilhar()"',
      '                  v-text="linkCopiado ? \'Link copiado!\' : \'Compartilhar\'"></button>',
      '        </div>',
      '        <div class="vdp-editor">',
      '          <div class="vdp-numeros" aria-hidden="true">',
      '            <span v-for="n in numeros" :key="n" v-text="n"></span>',
      '          </div>',
      '          <textarea class="vdp-area" v-model="codigo" spellcheck="false"',
      '                    autocapitalize="off" autocorrect="off" aria-label="Editor de HTML"',
      '                    @keydown="teclado($rawEvent || $event)"',
      '                    @input="automatico && executar()"></textarea>',
      '        </div>',
      '      </div>',

      // Resultado.
      '      <div class="vdp-caixa">',
      '        <div class="vdp-barra">',
      '          <span class="vdp-rotulo">Resultado</span>',
      '          <span class="vdp-vivo" :class="{ \'is-on\': rodando }" aria-hidden="true"></span>',
      '          <span class="vdp-espaco"></span>',
      '          <button v-for="l in larguras" :key="l" type="button" class="vdp-acao"',
      '                  :class="{ \'is-on\': largura === l }" v-click="largura = l" v-text="l"></button>',
      '          <button type="button" class="vdp-acao" v-click="abrirEmAba()">Abrir</button>',
      '        </div>',
      '        <div class="vdp-quadro-area">',
      '          <iframe class="vdp-quadro" v-ref="quadro" :style="estiloDoQuadro"',
      '                  title="Resultado ao vivo" sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"></iframe>',
      '        </div>',
      '        <div class="vdp-console" :class="{ \'is-open\': consoleAberto }">',
      '          <button type="button" class="vdp-console-topo" v-click="consoleAberto = !consoleAberto">',
      '            <span>Console</span>',
      '            <span class="vdp-tag" v-show="console.length" v-text="console.length"></span>',
      '            <span class="vdp-tag vdp-tag-erro" v-show="erros" v-text="erros + \' erro\'"></span>',
      '            <span class="vdp-espaco"></span>',
      '            <span v-text="consoleAberto ? \'fechar\' : \'abrir\'"></span>',
      '          </button>',
      '          <div class="vdp-console-lista" v-show="consoleAberto">',
      '            <p v-if="!console.length" class="vdp-vazio">Nada por aqui. O que o exemplo escrever no console aparece nesta area.</p>',
      '            <div v-for="(l, i) in console" :key="i" class="vdp-linha" :class="\'is-\' + l.tipo">',
      '              <code v-text="l.texto"></code>',
      '              <time v-text="l.hora"></time>',
      '            </div>',
      '            <button type="button" class="vdp-acao" v-show="console.length" v-click="limparConsole()">Limpar</button>',
      '          </div>',
      '        </div>',
      '      </div>',

      '    </div>',
      '  </div>',

      '  <p class="vdp-dica">',
      '    <strong v-text="exemploAtual.titulo"></strong>',
      '    <span v-text="exemploAtual.desc"></span>',
      '    <span class="vdp-atalho">Ctrl + Enter executa. Tab indenta.</span>',
      '  </p>',
      '</div>',
    ].join('\n'),
  });

  // =====================================================================
  // 4. Estilos do playground
  // =====================================================================

  V.injectStyle(
    'playground',
    [
      '.vdp{display:flex;flex-direction:column;gap:14px}',

      '.vdp-grupos{display:flex;flex-wrap:wrap;gap:6px}',
      '.vdp-grupo{font:600 13px/1 inherit;padding:.5rem .85rem;border-radius:999px;cursor:pointer;',
      'border:1px solid var(--v-border);background:transparent;color:var(--v-text-muted);transition:.16s}',
      '.vdp-grupo:hover{color:var(--v-text);border-color:var(--v-primary)}',
      '.vdp-grupo.is-on{background:var(--v-primary);border-color:var(--v-primary);color:#fff}',

      '.vdp-corpo{display:grid;grid-template-columns:250px 1fr;gap:14px;align-items:start}',
      '@media (max-width:1000px){.vdp-corpo{grid-template-columns:1fr}}',

      '.vdp-lista{display:flex;flex-direction:column;gap:6px;max-height:640px;overflow:auto;padding-right:4px}',
      '@media (max-width:1000px){.vdp-lista{flex-direction:row;overflow-x:auto;max-height:none}',
      '.vdp-item{min-width:220px}}',
      '.vdp-item{text-align:left;display:flex;flex-direction:column;gap:3px;padding:.6rem .75rem;',
      'border-radius:10px;border:1px solid var(--v-border);background:var(--v-surface);cursor:pointer;',
      'color:inherit;font:inherit;transition:.16s}',
      '.vdp-item:hover{border-color:var(--v-primary);transform:translateX(2px)}',
      '.vdp-item strong{font-size:13.5px;font-weight:650}',
      '.vdp-item small{font-size:11.5px;line-height:1.4;color:var(--v-text-muted)}',
      '.vdp-item.is-on{border-color:var(--v-primary);background:color-mix(in srgb,var(--v-primary) 10%,transparent)}',
      '.vdp-item.is-on strong{color:var(--v-primary)}',

      '.vdp-painel{display:grid;grid-template-columns:1fr 1fr;gap:14px;min-width:0}',
      '@media (max-width:900px){.vdp-painel{grid-template-columns:1fr}}',

      '.vdp-caixa{border:1px solid var(--v-border);border-radius:12px;overflow:hidden;',
      'background:var(--v-surface);display:flex;flex-direction:column;min-width:0}',
      '.vdp-barra{display:flex;align-items:center;gap:6px;padding:.5rem .6rem;',
      'border-bottom:1px solid var(--v-border);background:var(--v-surface-2);flex-wrap:wrap}',
      '.vdp-rotulo{font:650 11px/1 inherit;text-transform:uppercase;letter-spacing:.07em;color:var(--v-text-muted)}',
      '.vdp-espaco{flex:1}',
      '.vdp-acao{font:600 11.5px/1 inherit;padding:.35rem .6rem;border-radius:7px;cursor:pointer;',
      'border:1px solid var(--v-border);background:var(--v-surface);color:var(--v-text-muted);transition:.14s}',
      '.vdp-acao:hover{color:var(--v-primary);border-color:var(--v-primary)}',
      '.vdp-acao.is-on{background:var(--v-primary);border-color:var(--v-primary);color:#fff}',

      '.vdp-vivo{width:7px;height:7px;border-radius:50%;background:var(--v-border);transition:.2s}',
      '.vdp-vivo.is-on{background:var(--v-success);box-shadow:0 0 0 3px color-mix(in srgb,var(--v-success) 25%,transparent)}',

      '.vdp-editor{display:flex;min-height:340px;max-height:520px;overflow:auto;',
      'background:var(--v-surface);font:13px/1.6 ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace}',
      '.vdp-numeros{display:flex;flex-direction:column;padding:12px 8px 12px 12px;text-align:right;',
      'color:var(--v-text-muted);opacity:.45;user-select:none;font:inherit;border-right:1px solid var(--v-border)}',
      '.vdp-area{flex:1;border:0;outline:0;resize:none;padding:12px;background:transparent;color:inherit;',
      'font:inherit;white-space:pre;overflow-wrap:normal;min-height:340px;tab-size:2}',
      '.vdp-area:focus{box-shadow:inset 2px 0 0 var(--v-primary)}',

      '.vdp-quadro-area{flex:1;min-height:340px;background:var(--v-surface-2);padding:0;overflow:auto}',
      '.vdp-quadro{width:100%;height:100%;min-height:340px;border:0;display:block;background:var(--v-surface)}',

      '.vdp-console{border-top:1px solid var(--v-border)}',
      '.vdp-console-topo{width:100%;display:flex;align-items:center;gap:8px;padding:.5rem .7rem;',
      'font:600 11.5px/1 inherit;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;',
      'border:0;background:var(--v-surface-2);color:var(--v-text-muted)}',
      '.vdp-console-topo:hover{color:var(--v-text)}',
      '.vdp-tag{padding:.15rem .4rem;border-radius:999px;background:var(--v-border);color:var(--v-text);font-size:10px}',
      '.vdp-tag-erro{background:var(--v-danger);color:#fff}',
      '.vdp-console-lista{max-height:160px;overflow:auto;padding:.5rem .7rem;',
      'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace}',
      '.vdp-linha{display:flex;gap:8px;justify-content:space-between;padding:.2rem 0;',
      'border-bottom:1px solid color-mix(in srgb,var(--v-border) 50%,transparent)}',
      '.vdp-linha code{white-space:pre-wrap;word-break:break-word}',
      '.vdp-linha time{opacity:.45;font-size:10.5px;flex:none}',
      '.vdp-linha.is-error code{color:var(--v-danger)}',
      '.vdp-linha.is-warn code{color:var(--v-warning)}',
      '.vdp-vazio{margin:0;color:var(--v-text-muted);font-family:inherit}',

      '.vdp-dica{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;margin:0;',
      'font-size:13px;color:var(--v-text-muted)}',
      '.vdp-dica strong{color:var(--v-text)}',
      '.vdp-atalho{margin-left:auto;font-size:11.5px;opacity:.7;',
      'border:1px solid var(--v-border);border-radius:6px;padding:.15rem .45rem}',

      '@media (prefers-reduced-motion: reduce){.vdp-item,.vdp-acao,.vdp-grupo{transition:none}',
      '.vdp-item:hover{transform:none}}',
    ].join('')
  );
})();
