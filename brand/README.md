# Marca Voodoo.js

> **JavaScript feels like magic.**

Este diretório reúne todos os ativos visuais oficiais do Voodoo.js: mascote, logo, ilustrações e padrões. Tudo é SVG puro, escrito à mão, sem bibliotecas e sem dependências externas.

Para ver todos os ativos lado a lado, abra `preview.html` no navegador.

---

## Paleta oficial

Estes são os únicos valores de cor da marca. Não crie tons novos: se precisar de variação, use opacidade sobre uma destas cores.

| Nome | Hex | Papel na marca |
| --- | --- | --- |
| Roxo primário | `#6D3BF5` | Cor principal. Logo, links, botões primários, linhas de energia. |
| Roxo claro | `#9B7BFF` | Apoio do roxo. Gradientes, brilhos, estados hover, detalhes. |
| Magenta acento | `#FF3D8B` | Acento de destaque. Usar com parcimônia, só onde o olho deve parar. |
| Âmbar vela | `#FFB35C` | A faísca da magia. Pontas de varinha, brilhos, avisos. |
| Menta sucesso | `#2ED9A5` | Sucesso, confirmação, resposta recebida, nó reativo atualizado. |
| Vermelho perigo | `#FF4D4D` | Erro destrutivo, alerta crítico. |
| Tinta escura | `#14111F` | Fundo escuro, texto de maior contraste, furinhos dos botões. |
| Tinta média | `#2A2440` | Contornos, costuras, superfícies escuras, texto secundário. |
| Creme pergaminho | `#FBF7F2` | Fundo claro, tecido do mascote, texto sobre fundo escuro. |
| Areia | `#EDE4D8` | Sombra do tecido, campos vazios, superfícies neutras. |

### Proporção sugerida

Roxo domina, magenta e âmbar aparecem em doses pequenas. Uma boa mistura para uma tela de destaque: cerca de 60% de neutros (creme, areia, tintas), 30% de roxo e roxo claro, 10% dividido entre magenta e âmbar.

---

## Tipografia

| Uso | Família | Pilha completa |
| --- | --- | --- |
| Display, títulos, wordmark | Space Grotesk | `'Space Grotesk', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Texto corrido, interface | Inter | `Inter, 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Código, diretivas, tags | JetBrains Mono | `'JetBrains Mono', 'Fira Code', ui-monospace, monospace` |

O wordmark usa Space Grotesk **Bold (700)** com `letter-spacing: -1.2` na escala de 44px. Nos SVGs o texto foi mantido como `<text>` com a pilha de fontes declarada, então há degradação elegante em qualquer máquina. Se precisar de fidelidade absoluta em impressão, converta o texto em curvas antes de enviar para a gráfica.

---

## O mascote: Vudu

Vudu é um bonequinho de pano, fofo e amigável, jamais assustador. Ele é o rosto do framework em documentação, estados de UI e material de divulgação.

**Anatomia fixa.** Estes traços não mudam entre as poses:

- Corpo de tecido cor de areia com gradiente de creme para areia.
- Costura central em zigue-zague no tronco e na testa.
- Olho esquerdo de botão roxo, olho direito de botão magenta, sempre com quatro furinhos e linha em X.
- Sorriso bordado em pontilhado.
- Remendo quadrado roxo no peito, levemente girado.
- Tufo de cabelo de três linhas: roxo, magenta e roxo claro.
- Alfinete mágico com cabeça de bola magenta e ponta âmbar brilhante.

**As seis poses e quando usar cada uma:**

| Pose | Momento de uso |
| --- | --- |
| `vudu.svg` | Padrão. Apresentações, README, cabeçalho de página. |
| `vudu-wave.svg` | Onboarding, primeira execução, boas-vindas na documentação. |
| `vudu-happy.svg` | Sucesso, build concluído, instalação finalizada. |
| `vudu-loading.svg` | Carregamento e espera. Traz animação CSS embutida. |
| `vudu-error.svg` | Erro, falha de requisição, tela de exceção. |
| `vudu-sleeping.svg` | Ociosidade, sessão expirada, servidor parado. |

---

## Uso do logo

### Versões

- `voodoo-mark.svg`: só o símbolo. Use quando a marca já foi apresentada no contexto, ou em espaços muito pequenos.
- `voodoo-logo.svg`: símbolo e wordmark, para fundos claros.
- `voodoo-logo-dark.svg`: mesma construção, para fundos escuros.
- `voodoo-lockup.svg`: logo com o slogan. Use em capas, apresentações e materiais de abertura.
- `favicon.svg`: símbolo simplificado dentro de um quadrado escuro arredondado.

### Espaçamento mínimo

Reserve ao redor do logo uma margem livre igual à **metade da altura do símbolo**. Nada entra nessa área: nem texto, nem imagem, nem borda de card.

```
        ↕ x
   ┌───────────────┐
 x │  V  Voodoo.js │ x        x = altura do símbolo ÷ 2
   └───────────────┘
        ↕ x
```

### Tamanhos mínimos

| Ativo | Mínimo em tela | Mínimo impresso |
| --- | --- | --- |
| `voodoo-mark.svg` | 16 px de largura | 6 mm |
| `favicon.svg` | 16 px | não se aplica |
| `voodoo-logo.svg` e a versão escura | 120 px de largura | 30 mm |
| `voodoo-lockup.svg` | 200 px de largura | 50 mm |

Abaixo desses tamanhos o wordmark fecha e a faísca some. Nesse caso troque pelo símbolo sozinho.

### Fundos

Existem duas versões do logo horizontal, uma para cada tipo de fundo. Use sempre a que combina com o fundo:

| Fundo | Arquivo | Cor do wordmark |
| --- | --- | --- |
| Claro: creme pergaminho, areia, branco | `voodoo-logo.svg` | `#14111F` com `.js` em `#6D3BF5` |
| Escuro: tinta escura, tinta média | `voodoo-logo-dark.svg` | `#FBF7F2` com `.js` em `#9B7BFF` |

Nunca use o arquivo claro sobre fundo escuro nem o contrário: o wordmark some. Sobre foto, coloque antes uma camada sólida ou um véu de tinta escura a 60% de opacidade.

---

## Tema claro e escuro

O símbolo, o mascote e as cores de marca são iguais nos dois temas. O que muda são apenas os neutros: texto, contornos e superfícies escuras.

Cada SVG carrega um bloco `<style>` interno com estas classes, e um `@media (prefers-color-scheme: dark)` que troca só os neutros:

| Classe | O que controla | Claro | Escuro |
| --- | --- | --- | --- |
| `.vd-txt` | Texto neutro e marcadores de legenda | `#2A2440` | `#FBF7F2` |
| `.vd-txt-forte` | Wordmark e texto de maior contraste | `#14111F` | `#FBF7F2` |
| `.vd-haste` | Hastes finas desenhadas sobre o fundo | `#2A2440` | `#9B7BFF` |
| `.vd-rim` | Contorno de resgate em massas escuras, como o caldeirão e o servidor | `transparent` | `#FBF7F2` |
| `.vd-decor` | Opacidade das runas e do 404 de fundo | `0.13` | `0.26` |

Os valores originais continuam nos atributos de apresentação do SVG, então quem não interpreta CSS ainda vê o desenho correto no tema claro.

**Um detalhe importante.** Quando o SVG é carregado por `<img>`, o navegador resolve esse `@media` pela preferência do **sistema**, e não pelo tema da sua página. Se o seu site fixa o tema por conta própria, como a landing escura do Voodoo.js, você tem dois caminhos garantidos:

1. Colar o SVG inline no HTML, assim ele passa a obedecer o CSS da página.
2. Usar as duas versões separadas do logo e trocar por CSS, que é o que a `preview.html` faz no cabeçalho.

O mascote não depende disso: o corpo é claro com contorno escuro, então ele se destaca em qualquer fundo.

---

## O que NÃO fazer com a marca

1. Não troque as cores do símbolo. A bola é sempre magenta e a ponta é sempre âmbar.
2. Não aplique o logo claro sobre fundo claro, nem o escuro sobre fundo escuro.
3. Não gire, incline, espelhe nem distorça o logo. Redimensione sempre de forma proporcional.
4. Não recrie o wordmark em outra fonte, e não escreva "VoodooJS", "voodoo.js" ou "Voodoo JS". A grafia correta é **Voodoo.js**.
5. Não adicione sombra, contorno, brilho externo ou qualquer efeito ao logo.
6. Não coloque o logo dentro de caixas, círculos ou selos que não sejam o `favicon.svg`.
7. Não use o mascote no lugar do logo em contextos formais, e não misture poses diferentes do Vudu na mesma tela.
8. Não redesenhe o Vudu, não mude os olhos de botão de lado e não deixe o rosto assustador. Ele é um bichinho simpático.
9. Não estique as ilustrações. Elas têm `viewBox` e devem escalar mantendo a proporção.
10. Não use a paleta fora dos valores desta tabela.

---

## Tabela de arquivos

| Arquivo | Dimensão base | Finalidade |
| --- | --- | --- |
| `mascot/vudu.svg` | 512 × 512 | Pose padrão do mascote, sorrindo e segurando a varinha. |
| `mascot/vudu-happy.svg` | 512 × 512 | Comemoração, bracinhos para cima e faíscas. Estados de sucesso. |
| `mascot/vudu-loading.svg` | 512 × 512 | Carregamento, varinha girando e três pontinhos. Animação CSS embutida, com respeito a `prefers-reduced-motion`. |
| `mascot/vudu-error.svg` | 512 × 512 | Tristeza, costura solta e lágrima. Telas de erro. |
| `mascot/vudu-sleeping.svg` | 512 × 512 | Sono, com "z z z" subindo. Ociosidade e sessão expirada. |
| `mascot/vudu-wave.svg` | 512 × 512 | Aceno de boas-vindas. Onboarding e documentação. |
| `logo/voodoo-mark.svg` | 64 × 64 | Símbolo isolado: alfinete mágico em V com faísca. Legível a 16 px. |
| `logo/voodoo-logo.svg` | 340 × 88 | Logo horizontal para fundo claro. |
| `logo/voodoo-logo-dark.svg` | 340 × 88 | Logo horizontal para fundo escuro. |
| `logo/voodoo-lockup.svg` | 380 × 150 | Logo com o slogan, para capas e aberturas. |
| `logo/favicon.svg` | 32 × 32 | Ícone de aba e atalho, símbolo simplificado sobre tinta escura. |
| `illustrations/hero.svg` | 800 × 500 | Cena de destaque: Vudu conjurando um botão, um formulário e um card. |
| `illustrations/reactivity.svg` | 800 × 460 | Como funciona a reatividade: só os nós dependentes do estado são redesenhados. |
| `illustrations/http.svg` | 800 × 460 | Ciclo de requisição com `v-get` e `v-post`, com HTML voltando do servidor. |
| `illustrations/directives.svg` | 800 × 460 | Uma tag sendo encantada, com `v-click`, `v-text` e `v-model` saindo dela. |
| `illustrations/empty-state.svg` | 600 × 480 | Caldeirão vazio para estados sem conteúdo. |
| `illustrations/404.svg` | 700 × 480 | Página não encontrada, com Vudu perdido e um mapa. |
| `patterns/runes-bg.svg` | 480 × 480 | Padrão de runas repetível para fundo de seções de destaque. |
| `README.md` | texto | Este guia de marca. |
| `preview.html` | página | Galeria de todos os ativos. Abre no tema escuro, com botão para alternar para o claro. |

---

## Como usar

Favicon:

```html
<link rel="icon" type="image/svg+xml" href="/brand/logo/favicon.svg">
```

Mascote em uma página:

```html
<img src="/brand/mascot/vudu-wave.svg" alt="Vudu acenando" width="180" height="180">
```

Padrão de runas como fundo:

```css
.hero {
  background-color: #FBF7F2;
  background-image: url("/brand/patterns/runes-bg.svg");
  background-repeat: repeat;
  background-size: 480px 480px;
}
```

Tokens de cor em CSS:

```css
:root {
  --vd-roxo: #6D3BF5;
  --vd-roxo-claro: #9B7BFF;
  --vd-magenta: #FF3D8B;
  --vd-ambar: #FFB35C;
  --vd-menta: #2ED9A5;
  --vd-vermelho: #FF4D4D;
  --vd-tinta: #14111F;
  --vd-tinta-media: #2A2440;
  --vd-creme: #FBF7F2;
  --vd-areia: #EDE4D8;
}
```

---

## Notas técnicas

- Todo SVG tem `viewBox`, `role="img"`, `<title>` e `<desc>` ligados por `aria-labelledby`, então funciona bem com leitor de tela.
- Todo SVG tem o bloco de tema descrito na seção "Tema claro e escuro", com as cores de marca preservadas nos dois modos.
- Os identificadores internos de gradiente e as classes de animação têm prefixo por arquivo, então é seguro colar vários SVGs inline na mesma página sem conflito de `id`.
- Só `mascot/vudu-loading.svg` tem animação. Ela é CSS puro dentro do próprio arquivo e para sozinha quando o sistema pede menos movimento.
- Os arquivos estão em UTF-8 com declaração XML explícita.
