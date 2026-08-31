# Componentes prontos

O build completo registra 29 componentes. Todos se usam escrevendo HTML, sem uma linha de
JavaScript, e cada um aceita as duas escritas: `<VButton>` e `<v-button>`.

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>

<VButton variant="primary" size="lg" icon="check">Salvar</VButton>
<VCard title="Faturamento"><p>Conteúdo</p></VCard>
<VInput label="E-mail" type="email" hint="Nunca compartilhamos" v-model="email" />
<VBadge tone="success">Ativo</VBadge>
```

## Regras que valem para todos

**Nenhuma cor fica fixa no CSS.** Tudo vem das variáveis geradas por `V.palette()`, então trocar a
paleta muda a interface inteira na hora, nos dois temas. Veja [Tema e paleta](tema-e-paleta.md).

**Props booleanas aceitam três escritas.** O atributo vazio (`loading`), o texto (`loading="true"`)
e a ligação reativa (`:loading="salvando"`). Valores aceitos como verdadeiro: atributo vazio,
`true`, `1`, `sim`, `yes`.

**Listas aceitam três formatos.** O nome de uma variável do escopo em volta, uma lista literal
separada por vírgulas, ou uma ligação reativa:

```html
<VSelect options="estados" />          <!-- variável do v-data em volta -->
<VSelect options="SP, RJ, MG" />       <!-- lista literal -->
<VSelect :options="listaCarregada" />  <!-- ligação reativa -->
```

**Os controles de formulário são desenhados do zero.** Cada um usa `appearance: none` e guarda um
elemento nativo escondido, o que mantém a acessibilidade e o envio dentro de um `<form>`. Eles
funcionam com `v-model` no próprio hospedeiro.

**Ícones** vêm de um conjunto interno em SVG. Nomes disponíveis:

```
check  x  plus  minus  search  chevron-down  chevron-up  chevron-left  chevron-right
arrow-up  arrow-down  arrow-left  arrow-right  user  users  mail  lock  eye  eye-off
calendar  clock  star  info  alert  warning  trash  edit  copy  download  upload
settings  home  heart  bell  filter  external  refresh  folder  file  image  link
menu  more  logout  card  chart  box  inbox
```

Um nome desconhecido simplesmente não desenha nada.

---

## Ação

### VButton

| Prop | Tipo | Padrão |
| --- | --- | --- |
| `variant` | `primary`, `secondary`, `outline`, `ghost`, `soft`, `link`, `danger`, `success`, `warning`, `accent` | `primary` |
| `size` | `xs`, `sm`, `md`, `lg`, `xl` | `md` |
| `icon` | nome do ícone à esquerda | vazio |
| `iconRight` | nome do ícone à direita | vazio |
| `type` | `button`, `submit`, `reset` | `button` |
| `loading` | booleano | `false` |
| `disabled` | booleano | `false` |
| `block` | ocupa a largura toda | `false` |
| `rounded` | cantos totalmente arredondados | `false` |
| `ariaLabel` | rótulo acessível | vazio |

```html
<VButton variant="primary" icon="check">Confirmar</VButton>
<VButton variant="danger" size="sm" icon="trash">Excluir</VButton>
<VButton :loading="salvando" block>Salvar tudo</VButton>
<VButton variant="ghost" iconRight="external">Abrir</VButton>
```

### VIconButton

Botão só com ícone. O `label` vira o rótulo acessível.

| Prop | Padrão |
| --- | --- |
| `icon` | `more` |
| `label` | vazio |
| `variant` | `ghost` |
| `size` | `md` |
| `type` | `button` |
| `disabled`, `loading`, `rounded` | `false` |

```html
<VIconButton icon="trash" label="Excluir" variant="danger" />
```

### VTooltipButton

Botão com dica ao passar o mouse ou focar.

| Prop | Padrão |
| --- | --- |
| `tooltip` | vazio |
| `placement` | `top` (aceita `top`, `bottom`, `left`, `right`) |
| `variant` | `ghost` |
| `size` | `md` |
| `icon`, `ariaLabel` | vazio |
| `type` | `button` |
| `disabled` | `false` |

```html
<VTooltipButton icon="info" tooltip="Somente o dono pode editar" placement="right" />
```

---

## Estrutura

### VCard

| Prop | Padrão |
| --- | --- |
| `title`, `subtitle`, `icon` | vazio |
| `padded` | `true` |
| `hoverable` | `false` |

```html
<VCard title="Faturamento" subtitle="Últimos 30 dias" icon="chart" hoverable>
  <p>R$ 128.400,00</p>
</VCard>
```

### VDivider

| Prop | Padrão |
| --- | --- |
| `label` | vazio |
| `vertical` | `false` |
| `spacing` | vazio |

```html
<VDivider label="ou" />
<VDivider vertical />
```

### VEmptyState

| Prop | Padrão |
| --- | --- |
| `icon` | `inbox` |
| `title` | `Nada por aqui` |
| `description` | vazio |

```html
<VEmptyState icon="search" title="Nenhum resultado" description="Tente outros termos.">
  <VButton variant="outline">Limpar filtros</VButton>
</VEmptyState>
```

---

## Formulário

### VLabel

| Prop | Padrão |
| --- | --- |
| `for` | vazio |
| `size` | `md` |
| `required` | `false` |

### VField

Envelope de campo, com rótulo, dica e erro. Use quando quiser embrulhar um controle próprio.

| Prop | Padrão |
| --- | --- |
| `label`, `hint`, `error`, `for` | vazio |
| `required`, `disabled` | `false` |

```html
<VField label="Data de nascimento" hint="Use o formato dia/mês/ano">
  <input type="text" v-mask="date">
</VField>
```

### VInput

| Prop | Padrão |
| --- | --- |
| `label`, `placeholder`, `hint`, `error`, `value`, `name`, `id`, `icon`, `suffix` | vazio |
| `type` | `text` |
| `size` | `md` |
| `autocomplete`, `inputmode`, `maxlength`, `min`, `max`, `step` | vazio |
| `required`, `disabled`, `readonly`, `clearable` | `false` |

Emite `clear` quando o botão de limpar é usado.

```html
<VInput label="E-mail" type="email" icon="mail" required v-model="form.email" />
<VInput label="Busca" icon="search" clearable v-model="termo" @clear="buscar('')" />
<VInput label="Preço" type="number" suffix="R$" min="0" step="0.01" v-model.number="preco" />
```

### VTextarea

| Prop | Padrão |
| --- | --- |
| `label`, `placeholder`, `hint`, `error`, `value`, `name`, `id`, `maxlength` | vazio |
| `rows` | `4` |
| `size` | `md` |
| `resize` | `vertical` |
| `required`, `disabled`, `readonly`, `counter` | `false` |

```html
<VTextarea label="Mensagem" rows="6" maxlength="500" counter v-model="mensagem" />
```

### VSelect

Select desenhado do zero, com busca, seleção múltipla e navegação por teclado.

| Prop | Padrão |
| --- | --- |
| `label`, `hint`, `error`, `name`, `id` | vazio |
| `placeholder` | `Selecione` |
| `searchPlaceholder` | `Buscar...` |
| `emptyText` | `Nenhuma opção encontrada` |
| `options` | lista de opções |
| `value` | valor inicial |
| `size` | `md` |
| `multiple`, `searchable`, `clearable`, `disabled`, `required` | `false` |

Emite `change` com o valor atual (texto, ou array quando `multiple`).

Formatos aceitos em `options`:

```js
['SP', 'RJ', 'MG']
[{ value: 'sp', label: 'São Paulo' }, { value: 'rj', label: 'Rio de Janeiro', disabled: true }]
```

As chaves alternativas `id`, `key`, `text`, `name` e `title` também são entendidas.

```html
<div v-data="{ estados: [{ value: 'sp', label: 'São Paulo' }], uf: '' }">
  <VSelect label="Estado" options="estados" searchable clearable v-model="uf" />
</div>
```

### VCheckbox

| Prop | Padrão |
| --- | --- |
| `label`, `description`, `error`, `name`, `id` | vazio |
| `value` | `on` |
| `checked`, `disabled`, `required` | `false` |

Emite `change` com o booleano.

### VRadio

Mesmas props do `VCheckbox`, com `value` vazio por padrão. Emite `change` com o valor escolhido.

```html
<VRadio name="plano" value="mensal" label="Mensal" checked />
<VRadio name="plano" value="anual" label="Anual" description="Dois meses grátis" />
```

### VSwitch

| Prop | Padrão |
| --- | --- |
| `label`, `description`, `name`, `id` | vazio |
| `size` | `md` |
| `checked`, `disabled` | `false` |

Emite `change` com o booleano.

```html
<VSwitch label="Receber e-mails" :checked="prefs.email" @change="prefs.email = $detail" />
```

### VRating

| Prop | Padrão |
| --- | --- |
| `value` | `0` |
| `max` | `5` |
| `size` | `md` |
| `label` | `Avaliação` |
| `readonly`, `disabled`, `showValue` | `false` |
| `allowClear` | `true` |

Emite `change` com a nota.

```html
<VRating :value="nota" @change="nota = $detail" showValue />
```

---

## Estado e informação

### VBadge

| Prop | Padrão |
| --- | --- |
| `tone` | `neutral` (aceita `primary`, `accent`, `success`, `warning`, `danger`, `info`, `muted`, `neutral`) |
| `variant` | `soft` (aceita `soft`, `solid`, `outline`) |
| `size` | `md` |
| `icon` | vazio |
| `dot` | `false` |

```html
<VBadge tone="success">Ativo</VBadge>
<VBadge tone="danger" variant="solid" dot>3</VBadge>
```

### VTag

| Prop | Padrão |
| --- | --- |
| `tone` | `neutral` |
| `variant` | `soft` |
| `icon` | vazio |
| `closable` | `false` |
| `removeLabel` | `Remover` |

Emite `remove` com o texto da tag.

```html
<VTag closable @remove="tags = tags.filter(t => t !== $detail)">JavaScript</VTag>
```

### VAlert

| Prop | Padrão |
| --- | --- |
| `tone` | `info` |
| `title`, `icon` | vazio |
| `closable` | `false` |
| `closeLabel` | `Fechar aviso` |

Emite `close`.

```html
<VAlert tone="warning" title="Atenção" closable>
  A cobrança vence em três dias.
</VAlert>
```

### VAvatar

| Prop | Padrão |
| --- | --- |
| `name`, `src`, `alt` | vazio |
| `size` | `md` |
| `shape` | `circle` (aceita `circle`, `round`, `square`) |
| `status` | vazio (aceita `online`, `away`, `busy`) |

Sem imagem, mostra as iniciais do `name`.

```html
<VAvatar name="Ana Souza" src="/ana.jpg" size="lg" status="online" />
```

### VSpinner

| Prop | Padrão |
| --- | --- |
| `size` | `md` |
| `tone` | `primary` |
| `label` | `Carregando` |

### VSkeleton

| Prop | Padrão |
| --- | --- |
| `width` | `100%` |
| `height` | `14px` |
| `radius` | vazio |
| `lines` | `1` |
| `circle` | `false` |

```html
<VSkeleton lines="3" />
<VSkeleton circle width="48px" height="48px" />
```

### VProgress

| Prop | Padrão |
| --- | --- |
| `value` | `0` |
| `max` | `100` |
| `tone` | `primary` |
| `size` | `md` |
| `label` | vazio |
| `showValue`, `indeterminate` | `false` |

```html
<VProgress :value="$form.progress" showValue label="Enviando" />
<VProgress indeterminate />
```

### VStat

| Prop | Padrão |
| --- | --- |
| `label`, `value`, `hint`, `icon` | vazio |
| `delta` | variação numérica, com ou sem `%` |
| `suffix` | `%` |
| `inverted` | `false`, quando `true` uma variação negativa conta como positiva |

```html
<VStat label="Receita" value="R$ 128.400" delta="12.4" icon="chart" hint="vs. mês anterior" />
<VStat label="Cancelamentos" value="18" delta="-6" inverted />
```

---

## Dados e navegação

### VTable

| Prop | Padrão |
| --- | --- |
| `columns` | definição das colunas |
| `rows` | array de objetos |
| `empty` | `Nenhum registro encontrado` |
| `sortable` | `true` |
| `hover` | `true` |
| `dense`, `striped` | `false` |
| `caption` | vazio |

Emite `sort` com `{ key, direction }`.

As colunas aceitam três formatos:

```js
['nome', 'email']                                   // rótulo derivado da chave
[{ key: 'nome', label: 'Nome', align: 'left', sortable: true }]
```

```html
<VTable columns="nome:Nome, total:Total:right" :rows="pedidos" striped />
```

Na forma em texto, cada coluna é `chave:rótulo:alinhamento`. Chaves com ponto funcionam:
`cliente.nome`.

### VPagination

| Prop | Padrão |
| --- | --- |
| `page` | `1` |
| `pages` | `1` |
| `total` | `0` |
| `perPage` | `10` |
| `siblings` | `1` |
| `previousLabel` | `Anterior` |
| `nextLabel` | `Próxima` |
| `ariaLabel` | `Paginação` |

Emite `change` com a página escolhida.

```html
<VPagination :page="pagina" :total="totalDeItens" perPage="20" @change="irPara($detail)" />
```

### VBreadcrumb

| Prop | Padrão |
| --- | --- |
| `items` | trilha |
| `separator` | `/` |
| `ariaLabel` | `Trilha de navegação` |

```html
<VBreadcrumb items="Início:/, Produtos:/produtos, Detalhe" />
<VBreadcrumb :items="[{ label: 'Início', href: '/' }, { label: 'Perfil' }]" />
```

O último item nunca vira link e recebe `aria-current="page"`.

### VSteps

| Prop | Padrão |
| --- | --- |
| `steps` | lista de etapas |
| `current` | `0` |
| `vertical` | `false` |
| `ariaLabel` | `Etapas` |

```html
<VSteps steps="Dados, Pagamento, Confirmação" :current="etapa" />
```

### VTimeline

| Prop | Padrão |
| --- | --- |
| `items` | lista de eventos |

Na forma em texto, os eventos são separados por ponto e vírgula e os campos por barra vertical:
`título | descrição | tempo | tom`.

```html
<VTimeline items="Pedido criado|Recebemos seu pedido|10:02; Em separação||10:40" />
<VTimeline :items="[{ title: 'Enviado', description: 'A caminho', time: 'ontem', tone: 'success' }]" />
```

### VCodeBlock

| Prop | Padrão |
| --- | --- |
| `code`, `language`, `filename` | vazio |
| `copyLabel` | `Copiar` |
| `copiedLabel` | `Copiado` |
| `wrap` | `false` |

Emite `copy` com o texto copiado.

```html
<VCodeBlock language="bash" filename="terminal" code="npm install voodoojs" />
```

---

## Usando com formulários

Os componentes de campo funcionam com `v-model` no próprio elemento e também dentro de um
`<form v-submit>`, porque cada um mantém um controle nativo escondido com o `name` declarado:

```html
<form v-submit="/api/inscricoes" v-validate v-toast-success="Inscrição enviada!">
  <VInput label="Nome" name="nome" required />
  <VInput label="E-mail" name="email" type="email" required />
  <VSelect label="Plano" name="plano" options="Mensal, Anual" required />
  <VCheckbox name="termos" label="Aceito os termos" required />
  <VButton type="submit" :loading="$form.loading">Enviar</VButton>
</form>
```

---

Anterior: [Componentes](componentes.md) · Próximo: [Estado e stores](estado-e-stores.md)
