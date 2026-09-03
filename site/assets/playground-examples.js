/**
 * The examples the playground loads, in English.
 *
 * One entry per sample: a stable id, the group it sits under, a short title, a
 * one-line explanation and the code as an array of lines. The playground reads
 * this array from window.VOODOO_PLAYGROUND_EXAMPLES and builds its picker from
 * it, so adding a sample here is the whole job.
 *
 * Group keys are basics, forms, events, components, http, ui, visual, state and
 * advanced. Titles and explanations still pass through the language dictionary
 * when a key exists for them, and fall back to the English written here.
 *
 * Everything that starts with v-, @ or : is library syntax and is left alone.
 * Only the variable names, the strings and the prose were translated.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  window.VOODOO_PLAYGROUND_EXAMPLES = [
    // --------------------------------------------------------- basics
    {
      id: 'state',
      group: 'basics',
      title: 'State and interpolation',
      desc: 'v-data creates the scope, and { variable } writes the value into the text.',
      code: [
        '<div v-data="{ name: \'Vudu\', clicks: 0 }">',
        '  <h3>Hello, { name }!</h3>',
        '  <p>You clicked { clicks } times.</p>',
        '',
        '  <input v-model="name" placeholder="Type a name">',
        '  <button @click="clicks++">Click here</button>',
        '  <button @click="clicks = 0">Reset</button>',
        '',
        '  <p v-show="clicks > 4">That is enough, right?</p>',
        '</div>'
      ]
    },
    {
      id: 'conditionals',
      group: 'basics',
      title: 'Conditionals',
      desc: 'v-if adds and removes from the DOM. v-show only hides.',
      code: [
        '<div v-data="{ score: 10 }">',
        '  <label>Score: { score }</label><br>',
        '  <input type="range" min="0" max="10" v-model.number="score">',
        '',
        '  <h3 v-if="score >= 9">Great</h3>',
        '  <h3 v-else-if="score >= 6">Good</h3>',
        '  <h3 v-else>Needs work</h3>',
        '',
        '  <p v-show="score === 10">Full marks, well done.</p>',
        '</div>'
      ]
    },
    {
      id: 'list',
      group: 'basics',
      title: 'Lists with v-for',
      desc: 'The key in :key lets Voodoo reuse the elements it already rendered.',
      code: [
        '<div v-data="{ draft: \'\', items: [',
        '  { id: 1, text: \'Learn v-for\' },',
        '  { id: 2, text: \'Make some coffee\' }',
        '] }">',
        '  <form @submit.prevent="items.push({ id: Date.now(), text: draft }); draft = \'\'">',
        '    <input v-model="draft" placeholder="New item">',
        '    <button>Add</button>',
        '  </form>',
        '',
        '  <ul>',
        '    <li v-for="(item, i) in items" :key="item.id">',
        '      { i + 1 }. { item.text }',
        '      <button @click="items = items.filter(x => x.id !== item.id)">x</button>',
        '    </li>',
        '  </ul>',
        '',
        '  <p>Total: { items.length }</p>',
        '</div>'
      ]
    },
    {
      id: 'derived',
      group: 'basics',
      title: 'Derived values',
      desc: 'Any expression can be worked out on the spot, right in the HTML.',
      code: [
        '<div v-data="{ prices: [19.9, 45, 12.5, 99], discount: 10 }">',
        '  <p>Items: { prices.length }</p>',
        '  <p>Subtotal: { prices.reduce((s, p) => s + p, 0).toFixed(2) }</p>',
        '  <p>Discount: { discount }%</p>',
        '  <p><strong>Total: $ {',
        '    (prices.reduce((s, p) => s + p, 0) * (1 - discount / 100)).toFixed(2)',
        '  }</strong></p>',
        '',
        '  <input type="range" min="0" max="50" v-model.number="discount">',
        '</div>'
      ]
    },
    // ---------------------------------------------------------- forms
    {
      id: 'two-way-binding',
      group: 'forms',
      title: 'Two-way binding',
      desc: 'v-model works on text, number, checkbox, radio, select and textarea.',
      code: [
        '<div v-data="{ name: \'\', age: 25, accepted: false, region: \'NY\', color: \'blue\', bio: \'\' }">',
        '  <input v-model="name" placeholder="Name">',
        '  <input type="number" v-model.number="age">',
        '',
        '  <label><input type="checkbox" v-model="accepted"> I accept the terms</label>',
        '',
        '  <label><input type="radio" value="blue" v-model="color"> Blue</label>',
        '  <label><input type="radio" value="green" v-model="color"> Green</label>',
        '',
        '  <select v-model="region">',
        '    <option>NY</option><option>CA</option><option>TX</option>',
        '  </select>',
        '',
        '  <textarea v-model="bio" placeholder="Tell us about yourself"></textarea>',
        '',
        '  <div style="white-space:pre-wrap;font-family:monospace">{ JSON.stringify($data, null, 2) }</div>',
        '</div>'
      ]
    },
    {
      id: 'validation',
      group: 'forms',
      title: 'Validation without JavaScript',
      desc: 'The rules live on the field itself, and the message shows up on its own.',
      code: [
        '<form v-validate @submit.prevent>',
        '  <p><input name="fullname" v-required v-minlength="3" placeholder="Full name"></p>',
        '  <p><input name="email" v-required v-email placeholder="E-mail"></p>',
        '  <p><input name="cpf" v-mask="cpf" v-cpf placeholder="CPF"></p>',
        '  <p><input name="phone" v-mask="phone" placeholder="Phone"></p>',
        '  <p><input name="password" type="password" v-strong-password placeholder="Strong password"></p>',
        '  <p><input name="password2" type="password" v-match="password" placeholder="Repeat the password"></p>',
        '  <button type="submit">Submit</button>',
        '</form>',
        '',
        '<p><small>Leave each field to see the validation.</small></p>'
      ]
    },
    {
      id: 'masks',
      group: 'forms',
      title: 'Field masks',
      desc: 'Fifteen ready-made formats, and you can declare your own.',
      code: [
        '<div v-data="{}">',
        '  <p><input v-mask="cpf" placeholder="CPF"></p>',
        '  <p><input v-mask="cnpj" placeholder="CNPJ"></p>',
        '  <p><input v-mask="phone" placeholder="Phone"></p>',
        '  <p><input v-mask="cep" placeholder="Postal code"></p>',
        '  <p><input v-mask="date" placeholder="Date"></p>',
        '  <p><input v-mask="currency" placeholder="Amount"></p>',
        '  <p><input v-mask="card" placeholder="Card"></p>',
        '  <p><input v-mask="AAA-9999" placeholder="Your own pattern"></p>',
        '</div>'
      ]
    },
    // --------------------------------------------------------- events
    {
      id: 'events',
      group: 'events',
      title: 'Events and modifiers',
      desc: 'Keyboard shortcuts, click outside, press and hold, gestures, all by attribute.',
      code: [
        '<div v-data="{ log: [], open: false }">',
        '  <button @click="log.push(\'click\')">Click</button>',
        '  <button @click.once="log.push(\'only once\')">Once</button>',
        '  <button @hold.1s="log.push(\'held for 1 second\')">Hold</button>',
        '',
        '  <input @keyup.enter="log.push(\'Enter: \' + $event.target.value)"',
        '         placeholder="Type and press Enter">',
        '',
        '  <div style="border:1px solid #8886;padding:10px;margin-top:10px"',
        '       @click="open = true" @outside="open = false">',
        '    Click in here and then out there. State: { open ? \'open\' : \'closed\' }',
        '  </div>',
        '',
        '  <ul><li v-for="(l, i) in log.slice(-6)" :key="i">{ l }</li></ul>',
        '  <button @click="log = []">Clear</button>',
        '</div>'
      ]
    },
    {
      id: 'hotkeys',
      group: 'events',
      title: 'Global keyboard shortcut',
      desc: 'v-hotkey registers the combination across the whole page.',
      code: [
        '<div v-data="{ actions: [] }">',
        '  <p>Try <kbd>Ctrl</kbd> + <kbd>K</kbd> and then <kbd>Ctrl</kbd> + <kbd>S</kbd>.</p>',
        '',
        '  <button v-hotkey="ctrl+k" @click="actions.push(\'search opened\')">Search</button>',
        '  <button v-hotkey="ctrl+s" @click="actions.push(\'saved\')">Save</button>',
        '',
        '  <ul><li v-for="(a, i) in actions" :key="i">{ a }</li></ul>',
        '</div>'
      ]
    },
    // ----------------------------------------------------- components
    {
      id: 'component',
      group: 'components',
      title: 'Component with props and slot',
      desc: 'Register it once and use it as a tag, with props, slot and event.',
      code: [
        '<div v-data="{ last: \'none\' }">',
        '  <product-card name="Mug" price="39.9" @bought="last = $event"></product-card>',
        '  <product-card name="T-shirt" price="79" @bought="last = $event">',
        '    <small>Free shipping</small>',
        '  </product-card>',
        '',
        '  <p>Last one bought: <strong>{ last }</strong></p>',
        '</div>',
        '',
        '<script>',
        '  V.component(\'product-card\', {',
        '    props: { name: { type: \'string\' }, price: { type: \'number\' } },',
        '    state: () => ({ qty: 1 }),',
        '    methods: {',
        '      buy() { this.emit(\'bought\', this.name + \' x\' + this.qty); }',
        '    },',
        '    template: `',
        '      <div style="border:1px solid #8886;border-radius:10px;padding:12px;margin:8px 0">',
        '        <strong>{ name }</strong>',
        '        <div>$ { price.toFixed(2) }</div>',
        '        <slot></slot>',
        '        <button v-click="qty > 1 && qty--">-</button>',
        '        <span> { qty } </span>',
        '        <button v-click="qty++">+</button>',
        '        <button v-click="buy">Buy</button>',
        '      </div>`',
        '  });',
        '<\/script>'
      ]
    },
    {
      id: 'ui-kit',
      group: 'components',
      title: 'Ready-made components',
      desc: 'Twenty-nine accessible components, with a look of their own.',
      code: [
        '<div v-data="{ region: \'\', accepted: false, score: 3 }">',
        '  <VButton variant="primary">Primary</VButton>',
        '  <VButton variant="secondary">Secondary</VButton>',
        '  <VButton variant="danger">Danger</VButton>',
        '',
        '  <VBadge tone="success">Active</VBadge>',
        '  <VBadge tone="warning">Pending</VBadge>',
        '',
        '  <VInput label="Your name" placeholder="Type here"></VInput>',
        '  <VSwitch label="Receive updates"></VSwitch>',
        '  <VProgress value="64"></VProgress>',
        '  <VAlert tone="info">This is an informational notice.</VAlert>',
        '  <VAvatar name="Ana Souza"></VAvatar>',
        '</div>'
      ]
    },
    // ----------------------------------------------------------- http
    {
      id: 'resource',
      group: 'http',
      title: 'Fetching data from an API',
      desc: 'v-resource hands you data, loading and error in one line.',
      code: [
        '<div v-resource="pokemon: https://pokeapi.co/api/v2/pokemon?limit=8">',
        '',
        '  <p v-if="pokemon.loading">Loading...</p>',
        '  <p v-else-if="pokemon.error">Failed: { pokemon.error.message }</p>',
        '',
        '  <ul v-else>',
        '    <li v-for="p in pokemon.data.results" :key="p.name">{ p.name }</li>',
        '  </ul>',
        '',
        '  <button @click="pokemon.reload()">Refresh</button>',
        '</div>'
      ]
    },
    {
      id: 'request',
      group: 'http',
      title: 'Request by attribute',
      desc: 'v-get fetches and drops the result into the target, with no JavaScript at all.',
      code: [
        '<div v-data="{}">',
        '  <button v-get="https://api.github.com/repos/kwy404/Voodoo.js"',
        '          v-target="#output"',
        '          v-json-path="stargazers_count"',
        '          v-loading-class="loading">',
        '    Fetch the star count for Voodoo.js',
        '  </button>',
        '',
        '  <div id="output" style="margin-top:12px;padding:10px;border:1px dashed #8886">',
        '    The result shows up here.',
        '  </div>',
        '</div>'
      ]
    },
    // ------------------------------------------------------------- ui
    {
      id: 'modal',
      group: 'ui',
      title: 'Modals and dialogs',
      desc: 'Focus is trapped, Escape closes it, and the focus goes back when it leaves.',
      code: [
        '<div v-data="{ answer: \'\' }">',
        '  <button v-modal="#example">Open the modal</button>',
        '  <button @click="V.confirm(\'Are you sure?\').then(r => answer = r ? \'yes\' : \'no\')">',
        '    Confirm',
        '  </button>',
        '  <button @click="V.toast.success(\'It worked!\')">Toast</button>',
        '',
        '  <p>Answer: { answer }</p>',
        '',
        '  <div id="example" v-modal-content>',
        '    <h3>Hello from the modal</h3>',
        '    <p>Press Escape or click outside to close it.</p>',
        '    <button v-modal-close>Close</button>',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'tabs',
      group: 'ui',
      title: 'Tabs and accordion',
      desc: 'Arrow-key navigation and the right ARIA roles, for free.',
      code: [
        '<div v-tabs>',
        '  <button v-tab="a">Profile</button>',
        '  <button v-tab="b">Settings</button>',
        '  <button v-tab="c">Billing</button>',
        '',
        '  <div v-tab-panel="a"><p>Profile content.</p></div>',
        '  <div v-tab-panel="b"><p>Settings content.</p></div>',
        '  <div v-tab-panel="c"><p>Billing content.</p></div>',
        '</div>',
        '',
        '<hr>',
        '',
        '<div v-accordion v-accordion-single>',
        '  <div v-accordion-item>',
        '    <button v-collapse-toggle="#p1">How do I install it?</button>',
        '    <div id="p1" v-collapse><p>Download the file and drop in a script tag.</p></div>',
        '  </div>',
        '  <div v-accordion-item>',
        '    <button v-collapse-toggle="#p2">Does it need a build?</button>',
        '    <div id="p2" v-collapse><p>There is no compilation step at all.</p></div>',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'sortable',
      group: 'ui',
      title: 'Drag to reorder',
      desc: 'v-sortable works with the mouse, with touch and with the keyboard.',
      code: [
        '<div v-data="{ tasks: [\'First\', \'Second\', \'Third\', \'Fourth\'] }">',
        '  <p>Drag the items to reorder them.</p>',
        '  <ul v-sortable>',
        '    <li v-for="t in tasks" :key="t"',
        '        style="padding:8px;margin:4px 0;border:1px solid #8886;border-radius:8px;cursor:grab">',
        '      { t }',
        '    </li>',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'tooltip',
      group: 'ui',
      title: 'Tooltips, menu and copy',
      desc: 'Positioning that stays on screen, plus the clipboard.',
      code: [
        '<div v-data="{}">',
        '  <button v-tooltip="This is a tooltip" v-tooltip-position="top">Hover me</button>',
        '  <button v-copy="PROMO10">Copy the coupon</button>',
        '',
        '  <button v-dropdown="#menu">Actions</button>',
        '  <div id="menu" v-dropdown-menu>',
        '    <button>Edit</button>',
        '    <button>Duplicate</button>',
        '    <button>Delete</button>',
        '  </div>',
        '</div>'
      ]
    },
    // --------------------------------------------------------- visual
    {
      id: 'animation',
      group: 'visual',
      title: 'Animation with physics',
      desc: 'Real springs, and all of it respects anyone who prefers less motion.',
      code: [
        '<div v-data="{ show: true }">',
        '  <button @click="show = !show">Toggle</button>',
        '',
        '  <div v-if="show" v-motion="{ opacity: [0,1], y: [24,0], spring: true }"',
        '       style="padding:20px;border:1px solid #8886;border-radius:12px;margin-top:12px">',
        '    <h3>I came in on a spring</h3>',
        '    <p>Animated number: <strong v-count="1250" v-count-duration="900">0</strong></p>',
        '    <p v-typewriter="JavaScript feels like magic."></p>',
        '  </div>',
        '',
        '  <button v-motion-hover="{ scale: 1.08 }" v-motion-tap="{ scale: 0.94 }"',
        '          style="margin-top:12px">Hover over this one</button>',
        '</div>'
      ]
    },
    {
      id: 'chart',
      group: 'visual',
      title: 'Reactive charts',
      desc: 'Plain SVG, no outside library. Change the data and it redraws.',
      code: [
        '<div v-data="{ values: [12, 28, 19, 34, 22, 40] }">',
        '  <button @click="values = values.map(() => Math.round(Math.random() * 50) + 5)">',
        '    Roll new numbers',
        '  </button>',
        '',
        '  <div v-chart="{ type: \'line\', data: values, smooth: true }" style="height:150px"></div>',
        '  <div v-chart="{ type: \'bar\', data: values }" style="height:150px"></div>',
        '  <div v-chart="{ type: \'donut\', data: values.slice(0, 4), showLegend: true }" style="height:180px"></div>',
        '</div>'
      ]
    },
    {
      id: 'theme',
      group: 'visual',
      title: 'Theme and palette',
      desc: 'The whole color scale grows out of the colors you pick.',
      code: [
        '<div v-data="{}">',
        '  <button v-theme-toggle>Switch light and dark</button>',
        '',
        '  <p style="margin-top:12px">Swapping the palette changes the entire interface:</p>',
        '  <button @click="V.palette({ preset: \'violeta\' })">Violet</button>',
        '  <button @click="V.palette({ preset: \'oceano\' })">Ocean</button>',
        '  <button @click="V.palette({ preset: \'floresta\' })">Forest</button>',
        '  <button @click="V.palette({ primary: \'#FF3D8B\' })">Pink</button>',
        '',
        '  <div style="margin-top:14px">',
        '    <VButton variant="primary">Button</VButton>',
        '    <VBadge tone="success">Badge</VBadge>',
        '    <VProgress value="70"></VProgress>',
        '  </div>',
        '</div>'
      ]
    },
    // ---------------------------------------------------------- state
    {
      id: 'persistence',
      group: 'state',
      title: 'State that survives a refresh',
      desc: 'v-persist keeps the scope. v-history gives you undo and redo.',
      code: [
        '<div v-data="{ text: \'\' }" v-persist="playground-draft" v-history>',
        '  <p>Write something, reload the page, and see the text still there.</p>',
        '  <textarea v-model="text" rows="4" style="width:100%"></textarea>',
        '',
        '  <button v-undo :disabled="!$history.canUndo">Undo</button>',
        '  <button v-redo :disabled="!$history.canRedo">Redo</button>',
        '',
        '  <p><small>Steps kept: { $history.size }</small></p>',
        '</div>'
      ]
    },
    {
      id: 'store',
      group: 'state',
      title: 'Shared global state',
      desc: 'A store is visible from any corner of the page through $store.',
      code: [
        '<div v-data="{}">',
        '  <h4>Shop</h4>',
        '  <button @click="$store.cart.add(\'Mug\', 39.9)">Mug $ 39.90</button>',
        '  <button @click="$store.cart.add(\'T-shirt\', 79)">T-shirt $ 79.00</button>',
        '</div>',
        '',
        '<div v-data="{}" style="margin-top:16px;padding:12px;border:1px solid #8886;border-radius:10px">',
        '  <h4>Cart ({ $store.cart.items.length })</h4>',
        '  <ul>',
        '    <li v-for="(i, k) in $store.cart.items" :key="k">{ i.name }: $ { i.price.toFixed(2) }</li>',
        '  </ul>',
        '  <strong>Total: $ { $store.cart.total.toFixed(2) }</strong>',
        '  <button @click="$store.cart.clear()">Clear it</button>',
        '</div>',
        '',
        '<script>',
        '  V.store(\'cart\', {',
        '    items: [],',
        '    get total() { return this.items.reduce((s, i) => s + i.price, 0); },',
        '    add(name, price) { this.items.push({ name: name, price: price }); },',
        '    clear() { this.items = []; }',
        '  });',
        '<\/script>'
      ]
    },
    {
      id: 'tab-sync',
      group: 'state',
      title: 'Sync across tabs',
      desc: 'v-sync mirrors the state into your other open tabs, with no server.',
      code: [
        '<div v-data="{ count: 0, text: \'\' }" v-sync="playground-demo">',
        '  <p>Open this playground in another browser tab and poke at it here.</p>',
        '',
        '  <button @click="count++">Add one: { count }</button>',
        '  <input v-model="text" placeholder="Type and watch the other tab">',
        '</div>'
      ]
    },
    // ------------------------------------------------------- advanced
    {
      id: 'directive',
      group: 'advanced',
      title: 'Your own directive',
      desc: 'Extend the library with an attribute of your own making.',
      code: [
        '<div v-data="{ color: \'#FFB35C\' }">',
        '  <input type="color" v-model="color">',
        '  <p v-highlight="color">This paragraph uses a directive written on the spot.</p>',
        '  <p v-reverse>this text comes out backwards</p>',
        '</div>',
        '',
        '<script>',
        '  V.directive(\'highlight\', {',
        '    mounted(el, b) { el.style.background = b.value; el.style.padding = \'6px\'; },',
        '    updated(el, b) { el.style.background = b.value; }',
        '  });',
        '',
        '  V.directive(\'reverse\', el => {',
        '    el.textContent = el.textContent.split(\'\').reverse().join(\'\');',
        '  });',
        '<\/script>'
      ]
    },
    {
      id: 'magics',
      group: 'advanced',
      title: 'Magic variables',
      desc: 'Thirty-nine global values, available inside any expression.',
      code: [
        '<div v-data="{}">',
        '  <p>Screen width: { $screen.width }px</p>',
        '  <p>Phone: { $screen.mobile ? \'yes\' : \'no\' }</p>',
        '  <p>Connection: { $network.online ? \'online\' : \'offline\' }</p>',
        '  <p>Current theme: { $theme.resolved }</p>',
        '',
        '  <button @click="$clipboard.copy(\'copied by magic\')">Copy</button>',
        '  <button @click="$toast.info(\'The width is \' + $screen.width)">Show the width</button>',
        '',
        '  <input v-ref="target" placeholder="A field with a reference">',
        '  <button @click="$refs.target.focus()">Focus the field</button>',
        '</div>'
      ]
    },
    {
      id: 'visibility',
      group: 'advanced',
      title: 'Teleport and visibility',
      desc: 'Move an element around the document, and react when it comes into view.',
      code: [
        '<div v-data="{ seen: false }">',
        '  <p>Scroll the frame down.</p>',
        '  <div style="height:220px"></div>',
        '',
        '  <div @visible="seen = true"',
        '       style="padding:16px;border:1px solid #8886;border-radius:10px">',
        '    { seen ? \'You saw me, so here I am.\' : \'I have not shown up yet.\' }',
        '  </div>',
        '',
        '  <div style="height:120px"></div>',
        '</div>'
      ]
    }
  ];
}());
