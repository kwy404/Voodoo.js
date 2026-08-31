# Animações

> Este módulo vem apenas no `voodoo.full.min.js` ou em um build sob medida.

Motor de animação próprio, no espírito do Framer Motion, escrito em vanilla. O núcleo é um único
laço de `requestAnimationFrame` compartilhado por todas as animações ativas, com dois modos de
progresso: tween, com duração fixa e curva de easing, e mola, com integração numérica real de
rigidez, atrito e massa.

Tudo respeita `prefers-reduced-motion: reduce`. Nesse caso o estado final é aplicado na hora, sem
quadros intermediários.

## v-motion

Anima o elemento assim que ele é inicializado.

```html
<div v-motion="fadeUp">Aparece subindo</div>
<div v-motion="{ opacity: [0, 1], y: [24, 0], duration: 400 }">Com valores próprios</div>
<div v-motion="{ scale: [0.8, 1], spring: { stiffness: 300, damping: 20 } }">Com mola</div>
```

## Presets

| Nome | O que faz |
| --- | --- |
| `fadeIn` | Só opacidade |
| `fadeUp` | Sobe alguns pixels enquanto aparece. O mais usado em listas |
| `fadeDown` | Desce enquanto aparece |
| `scaleIn` | Cresce de dentro para fora, com um leve exagero no fim |
| `slideLeft` | Entra deslizando da direita |
| `slideRight` | Entra deslizando da esquerda |
| `pop` | Estoura no lugar, com mola bem viva |
| `blurIn` | Sai do desfoque até ficar nítido |
| `flip` | Gira no eixo horizontal, como uma carta virando |

Os presets também estão em `V.motion`:

```js
V.animate('.card', V.motion.fadeUp);
V.motion.pop;  // { opacity: [0,1], scale: [0.6,1], spring: { stiffness: 420, damping: 18 } }
```

## Propriedades animáveis

Qualquer propriedade CSS numérica funciona. Além delas, existem atalhos que alimentam um único
`transform` por elemento, então várias animações convivem sem sobrescrever umas às outras:

```
x  y  z  scale  scaleX  scaleY  rotate  rotateX  rotateY  skewX  skewY
```

E atalhos de filtro:

```
blur  brightness  contrast  grayscale  saturate
```

Cores são interpoladas de verdade, entendendo `#fff`, `#112233aa`, `rgb()`, `rgba()`, `hsl()`,
`hsla()` e `transparent`.

```html
<div v-motion="{ x: [-40, 0], rotate: [-8, 0], backgroundColor: ['#fff', '#6D3BF5'] }"></div>
```

Um valor único usa o estado atual como ponto de partida. Um par `[de, para]` define os dois
extremos.

## Opções

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `duration` | 400 | Duração em milissegundos. Ignorada com mola |
| `delay` | 0 | Espera antes de começar |
| `easing` | `easeOut` | Nome de um easing ou função própria |
| `spring` | | `true` para os padrões, ou `{ stiffness, damping, mass, velocity }` |
| `repeat` | 0 | Repetições extras. `2` executa três vezes |
| `repeatType` | `loop` | `loop`, `reverse` ou `mirror` |
| `force` | `false` | Ignora `prefers-reduced-motion`. Reserve para animações essenciais |
| `onUpdate` | | Recebe o progresso a cada quadro |
| `onComplete` | | Chamado no fim |

Curvas prontas: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeOutBack`, `easeOutExpo`,
`anticipate`, `bounce`. Todas estão em `V.easings`.

## v-motion-scroll

Anima quando o elemento entra na área visível.

```html
<section v-motion-scroll="fadeUp">Anima ao aparecer</section>
<section v-motion-scroll.repeat="fadeIn">Anima toda vez que aparece</section>
<section v-motion-scroll="scaleIn" v-motion-scroll-amount="0.5">Metade visível</section>
<section v-motion-scroll="fadeUp" v-motion-scroll-margin="-100px">Com margem</section>
```

O estado inicial é aplicado na montagem, então o elemento já nasce escondido e não pisca.

## v-motion-stagger

Cria uma onda entre os filhos diretos que usam `v-motion` ou `v-motion-scroll`.

```html
<ul v-motion-stagger="80">
  <li v-motion="fadeUp">Um</li>
  <li v-motion="fadeUp">Dois</li>
  <li v-motion="fadeUp">Três</li>
</ul>

<ul v-motion-stagger="60" v-motion-stagger-from="center">
  <li v-for="item in itens" v-motion-scroll="fadeUp">{ item }</li>
</ul>
```

`v-motion-stagger-from` aceita `first` (padrão), `last` e `center`. O índice é apurado na hora,
então filhos criados depois por `v-for` também entram na onda.

## v-motion-hover e v-motion-tap

```html
<button v-motion-hover="{ scale: 1.05, y: -2 }" v-motion-tap="{ scale: 0.96 }">
  Passe o mouse
</button>
```

`v-motion-hover` também responde ao foco de teclado, o que mantém o retorno visual para quem
navega com Tab. `v-motion-tap` anima enquanto o elemento está pressionado. Os dois guardam o
estado original e voltam a ele na saída.

## v-parallax

Desloca o elemento conforme a rolagem.

```html
<img v-parallax="0.3" src="/fundo.jpg" alt="">
<img v-parallax="-0.2" src="/frente.png" alt="">
```

Valores negativos invertem o sentido. Com `prefers-reduced-motion`, a directive não faz nada.

## v-flip

Guarda a posição do elemento e, quando ela muda entre atualizações, anima suavemente do lugar
antigo para o novo. É a técnica FLIP.

```html
<li v-for="item in itensOrdenados" :key="item.id" v-flip>{ item.nome }</li>
<li v-flip="{ duration: 300, easing: 'easeInOut' }">...</li>
```

Sem opções, usa uma mola com `stiffness: 340` e `damping: 34`. Combine com `:key` para que os
elementos sejam reaproveitados em vez de recriados.

## v-count

Anima um número até o valor e escreve no elemento.

```html
<span v-count="1250"></span>
<span v-count="receita" v-count-format="currency"></span>
<span v-count="taxa" v-count-format="percent" v-count-decimals="1"></span>
<span v-count="total" v-count-duration="2s" v-count-prefix="+" v-count-suffix=" vendas"></span>
```

| Atributo | Padrão |
| --- | --- |
| `v-count-duration` | 1400 ms |
| `v-count-decimals` | 0 |
| `v-count-format` | `number`, `currency` ou `percent` |
| `v-count-prefix`, `v-count-suffix` | vazio |

O formato usa `V.config.locale` e `V.config.currency`. Mudanças reativas no valor reanimam a
partir do número exibido, e não do zero.

## v-typewriter

```html
<h1 v-typewriter="JavaScript feels like magic."></h1>
<h1 v-typewriter="frase" v-typewriter-speed="30"></h1>
```

Escreve letra por letra. `v-typewriter-speed` é o tempo de cada caractere, com padrão 45 ms. Um
texto solto é usado como está, e uma expressão é reativa.

## API por JavaScript

### animate

```js
const controle = V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 });
await controle.finished;
controle.stop();
```

O alvo pode ser um elemento, uma lista, um `NodeList` ou um seletor CSS.

```js
V.animate(botao, { scale: 1.2 }, { spring: { stiffness: 300 } });
V.animate(barra, { width: ['0%', '100%'] }, { duration: 1000, easing: 'easeInOut' });
V.animate(el, { rotate: 360 }, { repeat: Infinity, easing: 'linear', duration: 2000 });
```

### spring

Integra uma mola real entre dois números e entrega o valor a cada quadro. Não toca no DOM, então
serve para estilos, contadores, rolagem suave ou qualquer outro valor numérico.

```js
V.spring(0, 320, {
  stiffness: 210,
  damping: 22,
  onUpdate: (v) => { barra.style.width = `${v}px`; },
  onComplete: () => console.log('parou'),
});
```

Padrões: `stiffness: 170`, `damping: 26`, `mass: 1`.

### stagger

```js
V.stagger('.card', V.motion.fadeUp, { delay: 70, from: 'center', start: 200 });
```

`delay` é o passo entre itens, `start` é o atraso da onda inteira, `from` é `first`, `last` ou
`center`.

### inView

```js
const parar = V.inView(secao, (entry) => {
  secao.classList.add('ativa');
  return () => secao.classList.remove('ativa');  // limpeza ao sair da tela
}, { once: false, amount: 0.5, margin: '-80px' });

parar();
```

`amount` aceita um número de 0 a 1, `any` ou `all`.

### scrollProgress

Reporta de 0 a 1 conforme o elemento atravessa a tela.

```js
const parar = V.scrollProgress(artigo, (p) => {
  barra.style.transform = `scaleX(${p})`;
});
```

## Combinando com o resto

```html
<ul v-motion-stagger="60">
  <li v-for="produto in produtos" :key="produto.id" v-motion-scroll="fadeUp" v-flip>
    <img v-lazy-src="produto.foto" alt="">
    <strong>{ produto.nome }</strong>
    <span v-count="produto.preco" v-count-format="currency"></span>
  </li>
</ul>
```

## Acessibilidade

Nunca use animação para transmitir informação que não exista de outra forma. Quem liga
`prefers-reduced-motion: reduce` recebe o estado final imediatamente, sem quadros intermediários,
e `v-parallax` simplesmente não roda. Use `force: true` apenas quando a animação for o próprio
conteúdo, como uma barra de progresso.

---

Anterior: [Arrastar e soltar](arrastar-e-soltar.md) · Próximo: [Gráficos](graficos.md)
