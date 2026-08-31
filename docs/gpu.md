# GPU

> Este módulo tem entrada própria: `voodoojs/dist/gpu.js`. Ele **não** vem no `voodoo.min.js`, nem
> no `voodoo.core.min.js`, nem no `voodoo.full.min.js`. O motivo está em [Tamanho e
> distribuição](#tamanho-e-distribuição).

Uma camada WebGPU para a Voodoo, em duas alturas.

Em cima, HTML: um `<canvas v-shader>` resolve o caso comum sem uma linha de JavaScript. Embaixo,
a API `V.gpu`, funções soltas que recebem o contexto como primeiro argumento — sem estado global
escondido, sem classe para instanciar, sem ordem secreta de inicialização. Você escreve no HTML até
onde o HTML dá conta, e desce para o JavaScript exatamente onde precisa de controle.

A regra que manda em tudo: **nada quebra quando não existe WebGPU.** `supported()` devolve `false`,
`init()` devolve `null`, e todo o resto aceita `null` no lugar do contexto e vira operação vazia.
Uma página que usa GPU para enfeite não pode cair num navegador que ainda não tem GPU.

## Instalação

```js
import V from 'voodoojs';
import 'voodoojs/dist/gpu.js'; // registra v-shader e liga V.gpu
```

Ou como plugin, se você preferir declarar:

```js
import { voodooGpu } from 'voodoojs/dist/gpu.js';
V.use(voodooGpu);
```

Para usar só a API, sem a directive, `import { gpu } from 'voodoojs'` já basta e é removido pelo
tree shaking quando você não usa.

## v-shader

```html
<canvas v-shader="ondas.wgsl" :set="{ speed: velocidade, tint: cor }"></canvas>
```

O valor do atributo aceita três origens, decididas por eliminação:

| Escrita | Origem |
| --- | --- |
| `v-shader="ondas.wgsl"` | endereço, buscado com `V.http` |
| `v-shader="#meu-shader"` | seletor de elemento; o texto de dentro é o shader |
| `v-shader="@fragment fn f() { ... }"` | WGSL escrito ali mesmo |

```html
<canvas v-shader="#meu-shader"></canvas>

<script type="x-shader/wgsl" id="meu-shader">
  struct Uniforms {
    time: f32,
    speed: f32,
    resolution: vec2<f32>,
    tint: vec3<f32>,
  };
  @group(0) @binding(0) var<uniform> u: Uniforms;

  @fragment
  fn pintar(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let onda = sin(uv.x * 12.0 + u.time * u.speed) * 0.5 + 0.5;
    return vec4<f32>(u.tint * onda, 1.0);
  }
</script>
```

Repare no que **não** foi preciso escrever: nenhum `createBuffer`, nenhum `bindGroupLayout`, nenhum
deslocamento em bytes. A Voodoo lê o WGSL e monta tudo a partir dele.

O `@vertex` também não aparece: quando a fonte não traz um, a Voodoo acrescenta um triângulo que
cobre a tela inteira e entrega `@location(0) uv` ao fragmento, com o eixo Y para baixo, que é como
todo mundo espera ler uma imagem. Se você declarar seu próprio `@vertex`, ele é usado no lugar.

### :set liga os uniforms ao estado

```html
<div v-data="{ velocidade: 1, cor: '#ff3d8b' }">
  <canvas v-shader="ondas.wgsl" :set="{ speed: velocidade, tint: cor }"></canvas>
  <input type="range" min="0" max="4" step="0.1" v-model.number="velocidade" />
</div>
```

Quando `velocidade` muda, o uniform é reescrito no buffer e mais nada acontece: o pipeline não é
recriado, o shader não é recompilado, o canvas não pisca. Cores em hexadecimal (`#ff3d8b`, `#f0a`,
`#ff00aa80`) viram vetor de canais de 0 a 1 automaticamente, e um número solto preenche o vetor
inteiro — `escala: 2` chega como `vec3(2, 2, 2)`.

> `:set` é `v-bind:set`, então o `v-bind` da Voodoo também espelha o valor num atributo `set` no
> canvas. Ele é inerte, mas aparece no inspetor. Se isso incomodar, use `v-shader-set="{ ... }"`,
> que faz exatamente a mesma coisa sem tocar no DOM.

### Relógio implícito

Um shader que declarar qualquer um destes campos no `struct` de uniforms recebe o valor a cada
quadro, sem configuração nenhuma:

| Campo | Tipo | Valor |
| --- | --- | --- |
| `time` | `f32` | segundos desde o primeiro quadro |
| `delta` | `f32` | segundos desde o quadro anterior, limitado a 0.25 |
| `frame` | `u32` ou `f32` | número do quadro |
| `resolution` | `vec2<f32>` | tamanho do buffer do canvas, em pixels reais |

O limite no `delta` existe para que voltar à aba depois de um minuto não faça a simulação dar um
salto absurdo. O relógio não zera quando o laço pausa e volta: a animação continua de onde parou.

### Modificadores

| Modificador | Efeito |
| --- | --- |
| `.once` | renderiza um quadro só, sem laço |
| `.visible` | só roda quando o canvas está na viewport, via `IntersectionObserver` |
| `.paused` | começa parado |

```html
<canvas v-shader.visible="fundo.wgsl"></canvas>
<canvas v-shader.once="poster.wgsl"></canvas>
```

`.visible` é a diferença entre um fundo animado e uma bateria vazia: um shader de tela cheia rodando
fora da viewport é trabalho jogado fora. Use sempre que o canvas não for o assunto principal da tela.

Para pausar a partir do estado, use `v-shader-paused`:

```html
<canvas v-shader="ondas.wgsl" v-shader-paused="!tocando"></canvas>
```

### Outros atributos

| Atributo | Padrão | Efeito |
| --- | --- | --- |
| `v-shader-set` | — | mesmo que `:set`, sem espelhar nada no DOM |
| `v-shader-paused` | — | expressão reativa que pausa o laço |
| `v-shader-dpr` | `1,2` | faixa aceita de `devicePixelRatio` |

### O estado do canvas

A directive escreve o andamento em `data-gpu`, o que dá um gancho de CSS de graça:

| Valor | Significado |
| --- | --- |
| `loading` | resolvendo a fonte e abrindo o dispositivo |
| `ready` | rodando |
| `paused` | pausado, ou fora da viewport com `.visible` |
| `error` | fonte não encontrada, ou shader que não compilou |
| `unsupported` | não há WebGPU |

```css
canvas[data-gpu='loading'] { opacity: 0.4; }
canvas[data-gpu='error'] { outline: 2px solid var(--v-danger); }
```

## Quando não há WebGPU

Este é o caminho mais importante do módulo, porque é o que mais gente vai ver.

1. O canvas ganha `data-gpu="unsupported"`.
2. O evento `voodoo:gpu-unsupported` sobe pela árvore, com `{ motivo, el }` no `detail`.
3. O conteúdo que estava **dentro** do `<canvas>` passa a aparecer.
4. Nada é agendado: nenhum `requestAnimationFrame`, nenhum observador, nenhuma requisição. Nem o
   `.wgsl` é buscado — não há para quê.
5. O console recebe um aviso só em modo desenvolvimento (`V.config.devtools = true`). Em produção,
   silêncio.

```html
<canvas v-shader="ondas.wgsl">
  <img src="ondas.png" alt="Ondas coloridas em movimento" />
</canvas>
```

Sobre o item 3, vale explicar o truque: o navegador só mostra os filhos de um `<canvas>` quando ele
não sabe desenhar canvas nenhum, e não é esse o caso aqui — o canvas funciona, o que falta é WebGPU.
Então a Voodoo move os filhos para um `<div data-gpu-fallback>` logo depois do canvas e esconde o
canvas. O conteúdo revelado continua sendo HTML da Voodoo: interpolação e directives ali dentro
funcionam normalmente. Ao destruir o elemento, tudo volta exatamente para onde estava.

Para oferecer outra coisa no lugar:

```js
document.addEventListener('voodoo:gpu-unsupported', (e) => {
  V.toast.info('Seu navegador ainda não tem WebGPU. Mostrando a versão em vídeo.');
});
```

### Shader que não compila

O erro é reportado por `handleError` — o mesmo caminho de `V.onError` — com o log do WGSL, o
elemento e a linha:

```
[Voodoo] erro em V.gpu shader: Error: shader "v-shader <canvas#fundo>" nao compilou:
  linha 14: unresolved identifier 'sinn'
  > let onda = sinn(uv.x * 12.0);
```

A página não cai. O canvas fica em `data-gpu="error"`.

## A API `V.gpu`

```js
V.gpu.supported()                          // boolean, nunca lança
await V.gpu.init(options?)                 // -> contexto, ou null se não suportado
V.gpu.surface(gpu, canvas, { dpr?, format?, alpha? })
V.gpu.effect(gpu, wgsl, { set?, entry? })  // shader de tela cheia; effect.set({ ... })
V.gpu.compute(gpu, wgsl, { set?, workgroups? })
V.gpu.uniforms(gpu, valoresIniciais)       // .set({ ... }), .destroy()
V.gpu.clock(gpu)                           // { time, delta, frame }
V.gpu.target(gpu, { width, height, format })
V.gpu.frame(gpu, (frame) => { frame.pass(alvo, ...operacoes) })
V.gpu.frameLoop(gpu, (frame) => { ... })   // devolve stop()
V.gpu.destroy(gpu)
V.gpu.reflect(wgsl)                        // leitura pura do WGSL, sem GPU
```

Um exemplo completo:

```js
const gpu = await V.gpu.init();
if (!gpu) return mostrarVersaoEmVideo();

const tela = V.gpu.surface(gpu, document.querySelector('#fundo'), { dpr: [1, 2], alpha: true });
const ondas = V.gpu.effect(gpu, wgsl, { set: { speed: 1.4, tint: '#ff3d8b' } });

const parar = V.gpu.frameLoop(gpu, (frame) => {
  ondas.set({ time: frame.clock.time });
  frame.pass(tela, ondas);
});

// mais tarde
parar();
V.gpu.destroy(gpu);
```

### surface

`dpr: [min, max]` limita o `devicePixelRatio`: `[1, 2]` significa "acompanhe a tela, mas não passe
de 2x". O tamanho do buffer é o tamanho em CSS vezes esse fator, sempre dentro do
`maxTextureDimension2D` do dispositivo. Um `ResizeObserver` mantém isso em dia sozinho — você não
escuta `resize` nem chama nada.

`alpha: true` deixa o canvas transparente (`alphaMode: 'premultiplied'`).

### effect e compute

Os dois compilam a partir da fonte, montam o bind group pela reflexão e devolvem um objeto com
`set()`, `destroy()` e um `reflection` com tudo que foi lido do shader. `ok` diz se o pipeline subiu;
quando é `false`, desenhar vira operação vazia em vez de exceção.

`entry` escolhe o ponto de entrada quando o shader tem mais de um. Sem ele, vale o primeiro
`@fragment` (ou `@compute`) encontrado na fonte.

### frame e frameLoop

`frame` grava um encoder, chama o seu callback e envia. `frame.pass(alvo, ...efeitos)` abre um passe
de renderização no destino — uma `surface` ou um `target` — e executa os efeitos na ordem.
`frame.compute(...calculos)` faz o mesmo para computação. `frame.clear` é a cor de limpeza, `[r, g,
b, a]` de 0 a 1, transparente por padrão.

`frameLoop` é o mesmo dentro de um `requestAnimationFrame`, e devolve o `stop()`.

## Reflexão de WGSL

O coração do módulo, e a razão de você não declarar binding na mão. `V.gpu.reflect(wgsl)` é função
pura sobre texto: não toca no DOM, não precisa de GPU, e roda em qualquer lugar.

```js
const info = V.gpu.reflect(fonte);
info.uniform.struct.fields; // [{ name: 'time', offset: 0, type: {...} }, ...]
info.bindings;              // [{ group: 0, binding: 0, kind: 'uniform', ... }]
info.entries;               // [{ stage: 'fragment', name: 'pintar' }]
```

### O que ela cobre

- `struct` declarado no próprio arquivo, com o deslocamento de cada campo calculado pelas regras do
  endereço `uniform` do WGSL. Inclusive a pegadinha clássica: `vec3<f32>` ocupa 12 bytes mas alinha
  em 16.
- Escalares (`f32`, `i32`, `u32`, `f16`, `bool`), vetores, matrizes `matCxR` com o preenchimento
  entre colunas, e arrays de tamanho fixo com passo múltiplo de 16.
- Os apelidos curtos: `vec3f`, `vec2u`, `mat4x4f`.
- `@group` e `@binding` nas duas ordens, para `var<uniform>`, `var<storage, read>`,
  `var<storage, read_write>`, `sampler`, `sampler_comparison`, `texture_*` (com dimensão, tipo de
  amostragem, profundidade e multisample) e `texture_storage_*`.
- Structs que citam outros structs, resolvidos em passadas sucessivas.
- Pontos de entrada `@vertex`, `@fragment` e `@compute`, com `@workgroup_size` antes ou depois do
  `@compute`.
- Comentários de linha e de bloco, inclusive aninhados, removidos antes de tudo — e sem mexer na
  contagem de linhas, para o número no erro do compilador continuar batendo com o arquivo.

### O que ela não cobre

Isto é limite real, não promessa para depois:

- **`@align` e `@size` nos membros do struct.** Se você reposicionar campos à mão, os deslocamentos
  calculados não vão bater. Não use esses atributos em structs que a Voodoo preenche.
- **Aliases de tipo** (`alias Cor = vec4<f32>;`). O tipo aparece como desconhecido e o campo é
  ignorado. Escreva o tipo por extenso.
- **Somente o grupo 0.** Bindings em `@group(1)` e acima são lidos e aparecem em `reflection`, mas o
  bind group montado automaticamente é só o do grupo 0.
- **Layout de `storage` usa as regras de `uniform`.** O WGSL é mais frouxo ali (passo de array sem o
  arredondamento para 16). A reflexão identifica o binding corretamente, mas não escreva buffers de
  storage a partir dos deslocamentos calculados.
- **Arrays sem tamanho** dentro de um uniform. O WGSL também não permite, então isso é mais aviso
  que limite.
- **Texturas não são ligadas sozinhas.** A reflexão sabe que o shader pede uma textura; qual textura
  é você quem diz, em `effect(gpu, wgsl, { textures: { nomeNoWgsl: view } })`. O `sampler`, esse sim,
  é criado sozinho, linear e `clamp-to-edge`.
- **Formato fixo em `texture_storage`.** O layout gerado assume `rgba8unorm`.

Quando a reflexão não dá conta de um shader, o pipeline **não é recusado**: ele volta para o modo
`layout: 'auto'` do próprio WebGPU. Você perde a inferência automática dos uniforms, mas o shader
roda. É melhor perder a mágica do que recusar um shader que o driver aceitaria sem reclamar.

## Modelo de limpeza

Tudo que aloca sabe se soltar, e o contrato é o mesmo do resto da Voodoo
(`packages/voodoojs/test/cleanup-contract.test.ts`):

| Recurso | Como solta |
| --- | --- |
| buffer de uniforms | `uniforms.destroy()` |
| textura de destino | `target.destroy()` |
| `ResizeObserver` da superfície | `surface.destroy()` |
| pipeline e bind group | `effect.destroy()` / `compute.destroy()` |
| `requestAnimationFrame` | `stop()`, devolvido por `frameLoop` |
| `IntersectionObserver` de `.visible` | limpeza da directive |
| dispositivo inteiro | `V.gpu.destroy(gpu)` |

O contexto guarda tudo que abriu em `gpu.resources`, então `V.gpu.destroy(gpu)` não esquece nada,
mesmo que você tenha esquecido. Chamar duas vezes não faz mal, e chamar com `null` também não.

Ao destruir o elemento de um `v-shader`, o laço para, o observador fecha, o efeito e a superfície se
soltam, o `data-gpu` some e o DOM volta ao estado original. A directive registra a limpeza antes de
qualquer alocação, então ela vale igualmente para o caminho com GPU, para o fallback e para o shader
que nem chegou a compilar.

O dispositivo é um só por aba: dez canvas com `v-shader` na mesma página compartilham o mesmo
contexto. Se o dispositivo for perdido — troca de GPU, aba suspensa —, o contexto passa a se
comportar como se nunca tivesse existido, com um aviso em modo desenvolvimento e nada mais.

## Suporte dos navegadores

Com honestidade, em agosto de 2026:

| Navegador | Situação |
| --- | --- |
| Chrome e Edge, desktop | desde a 113, ligado por padrão |
| Chrome, Android | desde a 121 |
| Safari 26, macOS e iOS | ligado por padrão |
| Firefox, Windows | desde a 141 |
| Firefox, macOS e Linux | atrás de flag em boa parte das versões |
| Navegadores em máquinas sem driver moderno | sem WebGPU, independente da versão |

Ou seja: a maioria tem, uma fatia real não tem, e essa fatia não é ruído. É por isso que o fallback
não é detalhe de acabamento neste módulo — ele é metade do projeto.

## Tamanho e distribuição

Medido no build de 0.2.0, comprimido com gzip:

| Arquivo | Com GPU | Sem GPU |
| --- | --- | --- |
| `voodoo.core.min.js` | — | 44.25 KB |
| `voodoo.min.js` | — | 80.90 KB |
| `voodoo.full.min.js` | 135.99 KB | 127.58 KB |
| `dist/gpu.js` (ESM, código próprio) | 3.07 KB | — |

A camada custa **8.41 KB gzip**, e o build completo tem 133 KB de teto. Colocar WebGPU lá dentro
faria toda página que usa `voodoo.full.min.js` pagar por um recurso de nicho, e estouraria o
orçamento. Por isso ela tem entrada própria: quem paga por ela é quem usa.

Nos builds ESM as partes comuns saem em chunks compartilhados, então importar `voodoojs` e
`voodoojs/dist/gpu.js` juntos não duplica o runtime — é um registro de directives só, uma
reatividade só.

A consequência honesta: **nos bundles de CDN (`voodoo.min.js` e `voodoo.full.min.js`) a directive
`v-shader` não existe.** Para usá-la hoje é preciso um bundler. Se a camada GPU passar a valer o
espaço no build completo, o orçamento é revisto e ela entra — mas isso é uma decisão a tomar com
número na mão, não de improviso.
