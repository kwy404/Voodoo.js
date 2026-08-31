# Shaders 3D

Quatro cenas de raymarching em WebGL2 puro, com um painel de controles reativo
ao lado. Sem Three.js, sem CDN, sem nenhuma dependencia externa: a Voodoo tem
zero dependencias de runtime e os exemplos respeitam isso.

Abra em `http://localhost:5173/examples/shaders/`.

## As cenas

| Cena | O que e |
| --- | --- |
| **Mandelbulb** | O fractal 3D classico, marchado por distancia. A potencia respira com o tempo e muda a topologia inteira do solido. |
| **Tunel infinito** | Coordenadas polares viram profundidade. O ruido e amostrado sobre um circulo do plano, e nao sobre o angulo cru, para o duto nao ganhar uma costura visivel. |
| **Metaballs** | Esferas fundidas por uniao suave, com sombra macia por marcha secundaria, reflexo do ceu e Fresnel. O piso tem uma grade discreta para dar escala. |
| **Oceano** | Campo de altura somando seis ondas. A superficie e encontrada por posicao falsa, a normal achata com a distancia para nao serrilhar no horizonte, e o sol deixa um caminho na agua. |

Todas compartilham o mesmo cabecalho de uniforms: `resolucao`, `tempo`, `camera`
e cinco parametros genericos `p1..p5`, que cada cena interpreta do seu jeito.
E isso que permite o painel ser generico.

## O que esta demo mostra da Voodoo.js

**O painel inteiro nasce de um `v-for`.** Cada cena declara a sua propria lista
de controles, com rotulo, minimo, maximo e passo. O HTML percorre essa lista e
monta os sliders. Adicionar um controle novo e acrescentar um objeto ao array:
nao existe nenhum codigo de interface para escrever.

**Os sliders usam `v-model`.** O valor que a pessoa arrasta e gravado direto no
mesmo objeto que o loop de render le para enviar como uniform. Nao existe
nenhuma linha de "pegue o valor do input e atualize o uniform".

**Trocar de cena troca a lista, e a interface se remonta sozinha.** As abas, o
destaque da aba ativa, a legenda sobre a cena e o painel de controles vem todos
do computed `cena`.

**Recursos nativos de WebGL ficam fora do estado reativo.** O contexto, os
programas e o VAO moram em `this.gpu`, um objeto comum criado no `mounted`.
Objetos nativos do driver nao devem ser embrulhados em proxy nem observados.

## Uma directive propria em oito linhas

Um `<input type="range">` nasce com `min 0`, `max 100` e `step 1`. Como o
`v-model` roda com prioridade 40 e o `v-bind` com 30, um `:min` comum chegaria
tarde: o navegador arredondaria `0.12` para `0` antes de a faixa certa ser
escrita. A demo resolve isso com uma directive propria:

```js
V.directive('faixa', {
  priority: V.PRIORITY.MODEL + 1,
  created: function (el, binding) {
    el.min = String(binding.value.min);
    el.max = String(binding.value.max);
    el.step = String(binding.value.passo);
  }
});
```

E um exemplo pequeno de como a Voodoo deixa a ordem de execucao das directives
nas maos de quem usa.

## Fallback obrigatorio

Sem WebGL2 nao ha o que desenhar, entao a demo mostra uma mensagem explicando o
que aconteceu, em vez de deixar um retangulo preto. Se o contexto existir mas o
driver recusar um shader, a demo mostra o relatorio do compilador na tela.

## Comportamento

- Arraste sobre a cena para girar a camera; as setas do teclado fazem o mesmo, e
  `Espaco` pausa.
- O slider de resolucao e o controle honesto de desempenho: em raymarching o
  custo e por pixel.
- Sair da aba pausa o tempo, para nao queimar GPU de graca.
- O loop e cancelado e os programas e o VAO sao liberados no `beforeUnmount` e
  no `pagehide`.
- `prefers-reduced-motion` desliga as transicoes de interface; as cenas
  continuam animando, mas a pausa fica a um clique.
