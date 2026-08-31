# Reatividade

O núcleo reativo da Voodoo.js é um `Proxy` com rastreamento de dependências por chave e
agendamento em microtask. Não existe Virtual DOM. Quando `count` muda, apenas os efeitos que leram
`count` rodam de novo, e cada efeito atualiza somente o nó do DOM que ele mesmo escreveu.

O módulo não toca no DOM e não assume `window`, então funciona igual em Node, Bun e Deno.

## reactive

Torna um objeto reativo em profundidade.

```js
const estado = V.reactive({ usuario: { nome: 'Ana' }, tags: [] });

estado.usuario.nome = 'Bia';  // dispara quem leu usuario.nome
estado.tags.push('novo');     // dispara quem leu tags
```

Objetos aninhados viram proxies na leitura, sob demanda. Arrays, `Map` e `Set` são suportados.

Detalhes que importam:

- escrever o mesmo valor não dispara nada;
- ler uma chave dentro de um efeito cria a dependência apenas daquela chave;
- `delete` e `in` também são rastreados;
- o mesmo objeto sempre devolve o mesmo proxy.

## ref

Referência reativa para valores primitivos. O valor fica em `.value`.

```js
const contador = V.ref(0);

V.effect(() => console.log(contador.value));
contador.value++;  // dispara o efeito
```

`V.shallowRef` cria uma referência que não torna o conteúdo reativo em profundidade. Útil para
guardar um objeto grande que você substitui inteiro em vez de editar por dentro.

`V.unref(x)` devolve `x.value` quando `x` é um ref, e `x` quando não é.

## computed

Valor derivado com cache. Só recalcula quando alguma dependência muda.

```js
const estado = V.reactive({ primeiro: 'Ana', ultimo: 'Souza' });
const completo = V.computed(() => `${estado.primeiro} ${estado.ultimo}`);

completo.value;             // 'Ana Souza'
estado.ultimo = 'Lima';
completo.value;             // 'Ana Lima', recalculado sob demanda
```

Computados aceitam getter e setter:

```js
const celsius = V.ref(25);
const fahrenheit = V.computed({
  get: () => celsius.value * 1.8 + 32,
  set: (valor) => { celsius.value = (valor - 32) / 1.8; },
});

fahrenheit.value = 212;
celsius.value;  // 100
```

## effect

Cria um efeito reativo. Executa uma vez na criação e reexecuta sempre que qualquer estado lido
dentro dele mudar.

```js
const estado = V.reactive({ count: 0 });

const runner = V.effect(() => {
  document.title = `Cliques: ${estado.count}`;
});

estado.count++;      // agenda a reexecução
V.stop(runner);      // encerra o efeito
```

Opções aceitas:

| Opção | O que faz |
| --- | --- |
| `lazy` | Não executa na criação. Você chama o runner quando quiser |
| `scheduler` | Recebe o controle da reexecução em vez de agendar sozinho |
| `scope` | Liga o efeito a um `EffectScope`, para parar tudo de uma vez |

## watch

Observa uma fonte reativa e chama o callback quando ela muda.

```js
const estado = V.reactive({ busca: '', pagina: 1 });

const parar = V.watch(
  () => estado.busca,
  (novo, antigo) => console.log('de', antigo, 'para', novo)
);

parar();  // cancela
```

A fonte pode ser uma função, um `ref` ou um objeto reativo:

```js
V.watch(contador, (n) => console.log(n));          // ref
V.watch(estado, () => salvar(), { deep: true });   // objeto inteiro
```

Opções:

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `immediate` | `false` | Chama o callback já na criação |
| `deep` | `false` | Percorre a estrutura inteira para observar qualquer mudança |
| `flush` | `'pre'` | Momento da execução: `'pre'`, `'post'` ou `'sync'` |

O terceiro argumento do callback é `onInvalidate`, chamado antes da próxima execução. Serve para
cancelar trabalho pendente:

```js
V.watch(
  () => estado.busca,
  (termo, _antigo, onInvalidate) => {
    const controller = new AbortController();
    onInvalidate(() => controller.abort());
    V.http.get('/api/buscar', { params: { q: termo }, signal: controller.signal });
  }
);
```

## watchEffect

Executa a função imediatamente e reexecuta quando as dependências lidas mudarem. É o `effect` com
limpeza automática entre execuções.

```js
const parar = V.watchEffect((onInvalidate) => {
  const id = setInterval(() => console.log(estado.count), 1000);
  onInvalidate(() => clearInterval(id));
});
```

## nextTick

As atualizações são agendadas em microtask e aplicadas em lote. `nextTick` resolve depois que o
DOM refletiu a mudança.

```js
estado.itens.push('novo');
await V.nextTick();
document.querySelectorAll('li').length;  // já contém o item novo
```

Também aceita um callback: `V.nextTick(() => foco())`.

`V.flushSync()` aplica imediatamente tudo que estiver pendente. Use em testes, onde esperar uma
microtask atrapalha a leitura do código.

## effectScope

Junta vários efeitos em um escopo e para todos com uma chamada.

```js
const escopo = V.effectScope();

escopo.run(() => {
  V.effect(() => atualizarCabecalho(estado.usuario));
  V.watch(() => estado.tema, aplicarTema);
});

escopo.stop();  // encerra os dois de uma vez
```

Cada directive da Voodoo já roda dentro do próprio `EffectScope`, ligado à remoção do elemento.
Por isso remover um nó do DOM encerra todos os efeitos daquele nó, sem vazamento.

## toRaw, markRaw e isReactive

```js
V.toRaw(estado);           // devolve o objeto original por trás do proxy
V.markRaw(mapaDoGoogle);   // este objeto nunca vira proxy
V.isReactive(estado);      // true
```

`markRaw` é o caminho para guardar instâncias de bibliotecas externas, elementos de DOM ou
qualquer coisa que não deva ser observada.

## Como isso aparece no HTML

O HTML usa a mesma máquina. Cada `v-text`, cada `{ interpolação }` e cada `:atributo` é um efeito
reativo próprio:

```html
<div v-data="{ nome: 'Ana', idade: 30 }">
  <p v-text="nome"></p>       <!-- efeito 1, depende de nome -->
  <p v-text="idade"></p>      <!-- efeito 2, depende de idade -->
</div>
```

Mudar `nome` reexecuta apenas o efeito 1. O segundo parágrafo não é tocado, não é comparado e não
é recriado.

Para observar valores no próprio HTML existem duas ferramentas:

```html
<div v-data="{ busca: '' }">
  <!-- roda a expressão sempre que a dependência muda -->
  <div v-effect="console.log('busca agora:', busca)"></div>

  <!-- observa o v-model do mesmo elemento -->
  <input v-model="busca" v-watch="buscar($value, $old)">
</div>
```

Dentro de `v-watch` você recebe `$value` e `$old`. Também existe a magia `$watch`, que aceita uma
expressão em texto:

```html
<div v-data="{ total: 0 }" v-init="$watch('total', (novo) => console.log(novo))"></div>
```

## Erros

Um erro dentro de um efeito não derruba a página. Ele é entregue ao tratador global:

```js
V.onError((err, contexto) => {
  console.error('[app]', contexto, err);
  V.toast.error('Algo deu errado');
});
```

O contexto diz de onde veio: `directive v-click`, `interpolacao`, `hook mounted`, `evento click`
e assim por diante.

## Laços infinitos

Se um efeito escrever na mesma chave que ele lê, o agendador percebe a repetição e para com um
aviso no console, em vez de travar a aba. Corrija a expressão em vez de contornar o aviso.

---

Anterior: [Início rápido](inicio-rapido.md) · Próximo: [Expressões](expressoes.md)
