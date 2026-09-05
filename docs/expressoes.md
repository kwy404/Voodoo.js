# Expressions

Everything you write inside a `v-*` attribute or within braces is an expression. It doesn't go
through `eval` or `new Function`. The text goes to a lexer, then to a Pratt parser, and finally
to a tree interpreter, all written by hand within the library.

This has two direct consequences: the library works with restrictive Content Security Policy,
without `unsafe-eval`, and the language accepts only a subset of JavaScript, chosen on purpose.

## Interpolation

The standard form is simple braces:

```html
<p>Hello, { name }! You have { items.length } items.</p>
```

Double braces are also accepted, for those coming from Vue and for text that needs to contain
literal braces around it:

```html
<p>{{ name }}</p>
```

Rules:

- multiple interpolations in the same text node work;
- any expression is valid: `{ a + b }`, `{ total > 0 ? 'yes' : 'no' }`, `{ list.join(', ') }`;
- inside `<pre>`, `<code>`, `<script>`, `<style>`, and `<textarea>` interpolation is ignored,
  because there braces are usually code.

Values are converted like this:

| Value | Becomes |
| --- | --- |
| `null` and `undefined` | empty text |
| number and boolean | `String(value)` |
| `Date` | `toLocaleString()` |
| object and array | `JSON.stringify(value)` |
| anything else | `String(value)` |

## What is accepted

**Literals**

```js
42
0x1f            // 31
1_000           // 1000
3.14
"text"
'text'
`Hello, ${name}!`  // template literal with interpolation
true, false, null, undefined
[1, 2, 3]
{ a: 1, b: 'two' }
{ count }        // property shorthand, becomes { count: count }
[...list, 3]    // spread
{ ...base, b: 2 }
```

**Operators**

```js
+  -  *  /  %  **                 // arithmetic, with correct precedence
==  !=  ===  !==  <  >  <=  >=    // comparison
&&  ||  ??                        // logical, with short-circuit evaluation
!  -  +  typeof  void             // unary
? :                               // ternary
in  instanceof
++  --                            // prefix and postfix
=  +=  -=  *=  /=  %=  **=  &&=  ||=  ??=
,  ;                              // sequence of statements
```

**Access and calls**

```js
user.name
list[1]
obj[key]
user?.profile?.name     // optional chaining
fn?.()
list.filter(n => n > 1)
list.map(n => n * 2).join('-')
list.reduce((total, n) => total + n, 0)
```

**Arrow functions**

Only expression form, with single body:

```js
n => n * 2
(a, b) => a + b
```

They see the outer scope, as you'd expect.

## What is not accepted

By design decision, not for lack of time:

- `function`, `class`, `new`, `delete`;
- `import`, `await`, `async`;
- `for`, `while`, `do`, `try`, `switch`;
- destructuring in parameters and assignments;
- arrow function body in block form (`n => { ... }`).

The idea is simple: attribute expressions should be short. Larger logic lives in a component
method, in a function in the scope, or in a `<script>` block.

```html
<!-- instead of this -->
<button v-click="items = items.filter(i => !i.done); total = items.length; save()">Clear</button>

<!-- prefer this -->
<button v-click="clearDone">Clear</button>
```

```js
V.data({
  clearDone() {
    this.items = this.items.filter((i) => !i.done);
    this.total = this.items.length;
    save();
  },
});
```

## Scope

An identifier is looked up by climbing the scope chain: the nearest `v-data`, then ancestors,
then the root. Only when nothing is found does the search fall into magic variables and the
list of allowed globals.

```html
<div v-data="{ title: 'Voodoo' }">
  <div v-data="{ item: 'x' }">
    <span>{ title }{ item }</span>   <!-- 'Voodoox' -->
  </div>
</div>
```

Writing to an identifier writes to the scope that already contains that key:

```html
<div v-data="{ counter: 0 }">
  <div v-for="n in 3">
    <button v-click="counter++">+</button>   <!-- writes to outer scope -->
  </div>
</div>
```

A new key is created in the local scope and doesn't leak upward.

## Allowed globals

Identifiers not in any scope are looked up in a closed list:

```
Math  JSON  Date  Number  String  Boolean  Array  Object  Intl  RegExp  Promise
parseInt  parseFloat  isNaN  isFinite  encodeURIComponent  decodeURIComponent  console
```

Everything outside that list returns `undefined`:

```js
window       // undefined
document     // undefined
fetch        // undefined
eval         // undefined
globalThis   // undefined
localStorage // undefined
```

This is intentional. An attribute coming from the database can't reach the browser's API.
To reach the DOM and services, use magic variables, which are explicit: `$el`, `$refs`,
`$http`, `$storage`, `$clipboard`.

### Allowing your own globals

```js
V.config.globals.formatCPF = (v) => V.applyMask(v, 'cpf');
V.config.globals.APP = { version: '2.1', environment: 'production' };
```

```html
<span>{ formatCPF(user.cpf) }</span>
<small>v{ APP.version }</small>
```

Globals declared in `V.config.globals` take effect when `V.start()` runs. If you add them later,
use the list directly:

```js
import { allowedGlobals } from 'voodoojs';
allowedGlobals.MyLib = { version: '1.0' };
```

## Magic variables

Names starting with a dollar sign exist in any expression, without declaring anything.

```html
<button v-click="$toast.success('Saved')">Save</button>
<div v-show="$screen.mobile">You're on mobile</div>
<p v-show="!$network.online">You're offline.</p>
<span>{ $store.cart.total }</span>
```

The complete list is in [API](api.md#magic-variables). The main ones:

| Magic | What is it |
| --- | --- |
| `$el` | Element that created the scope |
| `$refs` | Elements marked with `v-ref` |
| `$store` | All global stores |
| `$http` | HTTP client |
| `$toast` | Notifications |
| `$event`, `$detail` | Inside event handlers |
| `$form` | Nearest form state |
| `$screen`, `$network`, `$device`, `$theme` | Reactive environment |

## Errors

An error in an expression never crashes the page. It's reported to the global handler with the
original text attached:

```
VoodooRuntimeError: "savee" is not a function

Expression: savee()
```

Syntax errors point to the exact position:

```
VoodooSyntaxError: Expected ")" but found "end of expression"

list.filter(n => n > 1
                     ^
```

Turn on `V.config.devtools = true` to see more details in the console.

## Cache

Each expression is parsed once and the tree is cached. Re-running an effect doesn't reparse the
text. `V.clearParseCache()` clears the cache, which is only useful in tests.

## Content Security Policy

Voodoo.js works with a restrictive policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

The `'unsafe-inline'` in `style-src` is needed because the library injects UI component CSS at
runtime. To skip it, turn off injection and load the CSS yourself:

```html
<script src="voodoo.full.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

No `unsafe-eval` is needed in any configuration. See [Security](seguranca.md).

## Parser API

For advanced cases, the parser is exposed:

```js
const tree = V.parse('user.name.toUpperCase()');
V.evaluate(tree, V.scope);          // evaluates at root
V.evaluateIn('a + b', scope);       // parses and evaluates at once
V.tokenize('1 + 2');                // list of tokens
V.stringify(value);                 // conversion used in interpolation
```

---

Previous: [Reactivity](reatividade.md) · Next: [Directives](directives.md)
