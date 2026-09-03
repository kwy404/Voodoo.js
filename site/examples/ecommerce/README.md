# Store

Catalogue, filters, side cart and a four step checkout. Everything runs in the
browser, with no server. The cart lives in a global Voodoo store, and that is why
it shows up straight in the HTML through `$store.carrinho`, including in the
counter at the top, which sits outside the scope of any cart component.

## What the demo shows

- Catalogue in a grid with 12 products, discount badge, star rating and the full
  price struck through when there is a promotion.
- Filter by category, price range on a slider, sorting and search with a 250 ms
  wait.
- Side drawer for the cart with quantity per item, remove, subtotal, discount,
  shipping and total, all formatted in reais.
- Discount coupon, with three valid codes: `VOODOO10`, `MAGIA20` and `VUDU5`.
- Free shipping above R$ 399,00, recalculated together with the coupon.
- Item counter on the cart button.
- Persisted cart: reload the page and it is still there.
- Four step checkout, with identification, delivery, payment and confirmation,
  each step validated before it lets you move on.
- Light and dark theme.

## Voodoo features exercised

| Feature | Where it shows up |
| --- | --- |
| `V.store(..., { persist: true })` | the whole cart, with methods and totals |
| `$store` in the HTML | counter at the top, items, subtotal, discount, shipping and total |
| `V.component` with `state`, `computed` and `methods` | catalogue, filters and steps |
| `v-for` with `:key` | products, cart items, categories and steps |
| `v-show` and `v-transition` | drawer, dark backdrop and each step |
| `v-model` and `v-model.number` | search, category, sorting and price range |
| `v-mask` | phone, postcode, card, expiry date and security code |
| `v-validate` and rules by attribute | `v-required`, `v-email`, `v-phone`, `v-cep`, `v-creditcard` |
| `V.validateForm` | validates the current step before moving on |
| `v-theme-toggle` | theme button, with no JavaScript of its own |
| `V.toast` | product added, coupon applied or invalid, payment |
| `@keyup.enter`, `@keyup.esc.window` | applying the coupon, closing the drawer |
| `V.formatCurrency`, `V.sortBy`, `V.sleep`, `V.random` | support |

## Two implementation notes

The totals are written into the store itself by a `recalcular` method, instead of
living in getters. The store definition goes through a shallow copy, which would
freeze a getter at its initial value, so keeping the computed result is the safe
route and makes the HTML far simpler to read.

Each checkout step is a separate `<form>` with `v-validate`. That way
`V.validateForm` validates only the fields of that step, and the error messages
appear below each field with no presentation code in the demo.
