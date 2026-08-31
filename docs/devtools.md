# Devtools

> O inspetor vem apenas no `voodoo.full.min.js` ou em um build sob medida.

Três ferramentas: o **widget flutuante**, que liga tudo direto pelo HTML, o **inspetor xray**,
visual, que roda dentro da própria página, e o **barramento de eventos**, que qualquer módulo pode
usar para reportar atividade.

---

# Ligando pelo HTML

A forma mais curta. Um atributo na tag `<script>` e o inspetor está na página:

```html
<script src="voodoo.full.min.js" devtools defer></script>
```

Um botão aparece no canto inferior direito. Clique nele e o painel completo abre.

O widget mostra quantos componentes estão montados e acende um ponto sempre que acontece
atividade: uma requisição, um evento de directive, uma troca de rota. Ele pode ser arrastado para
qualquer canto, e a posição fica salva para o próximo carregamento.

## Formas equivalentes de ligar

| Forma | Quando usar |
| --- | --- |
| `<script src="voodoo.full.min.js" devtools>` | O caminho curto |
| `<script src="voodoo.full.min.js" data-devtools>` | Quando o HTML precisa ser estritamente válido |
| `devtools="false"` | Deixa o atributo no HTML e desliga sem apagar a linha |
| `window.VOODOO_DEVTOOLS = true` antes do script | Quando a decisão vem do servidor |
| `V.config.devtools = true` + `V.devtoolsWidget(true)` | Controle por JavaScript |

## Controlando o widget por JavaScript

```js
V.devtoolsWidget();       // alterna
V.devtoolsWidget(true);   // mostra
V.devtoolsWidget(false);  // esconde
```

O `×` no canto do botão esconde o widget só naquela aba. Uma chamada explícita a
`V.devtoolsWidget(true)` traz de volta.

> O widget e o painel vivem no build completo. Nos builds menor e essencial o atributo
> `devtools` continua ligando os avisos detalhados no console, e a Voodoo avisa lá mesmo que o
> inspetor não veio junto.

Há uma página pronta em [`examples/devtools/`](../examples/devtools/) com contador, lista, store,
componente e requisição, para ver as abas do painel reagindo a cada uma dessas coisas.

---

# O inspetor xray

```js
V.xray();        // liga e desliga
V.xray(true);    // força ligar
V.xray(false);   // força desligar
```

O atalho `Ctrl+Shift+X` é instalado na primeira chamada. Para ter o atalho disponível desde o
começo, sem ligar nada:

```js
V.enableXrayShortcut();
```

## O que ele mostra

Ligado, o inspetor contorna todo elemento que tem directives, mostra um cartão com o escopo
daquele elemento, abre um painel com abas e faz o elemento piscar toda vez que um efeito reativo
escreve nele. Esse é o efeito raio-x: dá para ver a reatividade acontecendo.

As abas do painel:

| Aba | O que traz |
| --- | --- |
| Estado | Todos os escopos da página, com as variáveis visíveis em cada um. Valores simples são editáveis ali mesmo |
| Componentes | Instâncias montadas, com props, estado e o elemento hospedeiro |
| Stores | Stores globais e o conteúdo de cada um |
| Eventos | Eventos disparados por directives, com o elemento de origem |
| Rede | Requisições, com método, URL, status e duração |
| Desempenho | Contagem de efeitos por elemento e quantas vezes cada um reexecutou |

Clicar em um elemento na página seleciona o escopo correspondente. Clicar em um elemento no painel
o destaca e rola a página até ele.

## Custo em produção

O módulo não registra nada ao ser importado. Nenhum ouvinte, nenhum estilo e nenhum temporizador
existe antes da primeira chamada, então ele é tree shakeable e não custa nada enquanto ninguém
liga. Ainda assim, em produção o caminho mais seguro é servir o build essencial, ou montar um
build sob medida sem o módulo `devtools`:

```bash
npx voodoo build
```

## Como a contagem de efeitos é feita

A aba de desempenho soma, para cada elemento, os efeitos criados pelas directives dele mais os
efeitos dos textos interpolados que são filhos diretos. Um número alto em um elemento pequeno
costuma indicar interpolação demais em um lugar só, e vale quebrar o bloco.

---

# O barramento de eventos

```js
V.devtools.emit('network', {
  method: 'GET',
  url: '/api/usuarios',
  status: 200,
  ok: true,
  duration: 128,
  source: 'meu-plugin',
});

const off = V.devtools.on('network', (evento) => console.log(evento.url));
off();
```

Emitir sem nenhum ouvinte registrado custa uma busca em `Map` e nada mais, então qualquer módulo
pode reportar atividade sem medo.

## Tipos de evento

| Tipo | Campos |
| --- | --- |
| `network` | `method`, `url`, `status`, `ok`, `duration`, `error`, `source` |
| `event` | `type`, `el`, `detail`, `source` |
| `navigation` | `from`, `to`, `cancelled`, `matched` |
| `locale` | `from`, `to` |
| `update` | `el`, `key`, `source` |

## API

```js
V.devtools.emit(tipo, dados);
V.devtools.on(tipo, callback);     // devolve a função que cancela
V.devtools.off(tipo, callback);
V.devtools.clear(tipo);            // remove os ouvintes de um tipo
V.devtools.clear();                // remove todos
V.devtools.count(tipo);            // quantos ouvintes existem
```

A aba Rede do inspetor lista tudo que chega por `network`, mesmo quando a requisição não passou
pelo cliente `V.http`. É o gancho para integrar um cliente próprio ao painel.

---

# Depuração sem o inspetor

## Avisos detalhados

```js
V.config.devtools = true;
```

Com essa opção, os comentários âncora criados por `v-if` e `v-for` ganham nome, o que deixa a
árvore muito mais legível no inspetor do navegador. Componentes não registrados também passam a
avisar no console.

## Tratador global de erros

```js
V.onError((err, contexto) => {
  console.error('[app]', contexto, err);
  enviarParaOMonitoramento(err, contexto);
});
```

O contexto diz de onde veio: `directive v-click`, `interpolacao`, `hook mounted`,
`requisicao GET /api/x`, `evento click ("salvar()")` e assim por diante.

## Inspecionando escopo e instâncias

```js
V.scope.data;                                  // escopo raiz
V.getScope(document.querySelector('#lista'));  // escopo do elemento, se ele criou um
V.findScope(document.querySelector('li'));     // escopo efetivo, subindo os ancestrais
V.instances;                                   // Set com os componentes montados
V.components;                                  // Map com as definições registradas
V.directives;                                  // Map com as directives registradas
V.magics;                                      // Map com as variáveis mágicas
V.stores;                                      // todos os stores
```

## Log dentro do HTML

```html
<div v-effect="$log('estado agora', $data)"></div>
<button v-click="$log($event)">Ver o evento</button>
```

`$log` escreve no console com o prefixo `[Voodoo]`.

## Forçando e parando o processamento

```js
V.start();                     // percorre e inicializa a partir do body
V.start(document.querySelector('#area'));
V.walk(elemento, escopo);      // inicializa um trecho com um escopo específico
V.refresh(elemento);           // reinicializa uma raiz
V.destroy(elemento);           // desmonta, parando efeitos e removendo ouvintes
V.stopObserving();             // desliga o MutationObserver
```

---

Anterior: [Tema e paleta](tema-e-paleta.md) · Próximo: [Plugins](plugins.md)
