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
    // --------------------------------------------------------- hooks
    {
      id: 'hooks-state',
      group: 'hooks',
      title: "useState",
      desc: "Holds a value and re-renders what reads it. No .value, and no setter to thread around.",
      code: [
        "<div v-data=\"{ count: useState(0) }\">",
        "  <h3>You clicked { count } times</h3>",
        "",
        "  <button @click=\"count++\">click</button>",
        "  <button @click=\"count--\">back</button>",
        "  <button @click=\"count = 0\">reset</button>",
        "",
        "  <p v-show=\"count > 4\">That is a lot of clicking.</p>",
        "</div>"
      ]
    },
    {
      id: 'hooks-effect',
      group: 'hooks',
      title: "useEffect with cleanup",
      desc: "An empty array runs once. The returned function is the cleanup, called when the element goes.",
      code: [
        "<div v-data=\"{ seconds: useState(0), running: useState(true) }\"",
        "     v-init=\"useEffect(() => {",
        "       const id = setInterval(() => { if (running) seconds++ }, 1000);",
        "       return () => clearInterval(id);",
        "     }, [])\">",
        "",
        "  <h3>{ seconds }s</h3>",
        "  <button @click=\"running = !running\">{ running ? 'pause' : 'resume' }</button>",
        "  <button @click=\"seconds = 0\">reset</button>",
        "</div>"
      ]
    },
    {
      id: 'hooks-effect-deps',
      group: 'hooks',
      title: "The dependency array is optional",
      desc: "With an array it re-runs on those. Without one it works out what it read. Open the console.",
      code: [
        "<div v-data=\"{ name: useState('Ana'), age: useState(30) }\">",
        "  <input v-model=\"name\" placeholder=\"name\">",
        "  <button @click=\"age++\">age++ ({ age })</button>",
        "",
        "  <!-- listed: fires only for the name -->",
        "  <p v-effect=\"useEffect(() => console.log('name is now', name), [name])\"></p>",
        "",
        "  <!-- unlisted: works out its own reads -->",
        "  <p v-effect=\"useEffect(() => console.log('either changed:', name, age))\"></p>",
        "",
        "  <p>Type above, then look at the console.</p>",
        "</div>"
      ]
    },
    {
      id: 'hooks-memo',
      group: 'hooks',
      title: "useMemo",
      desc: "A cached computation. With no array it recomputes only when something it read changed.",
      code: [
        "<div v-data=\"{",
        "  items: useState([2, 7, 1, 9, 4]),",
        "  total: useMemo(() => items.reduce((a, b) => a + b, 0)),",
        "  biggest: useMemo(() => Math.max(...items))",
        "}\">",
        "  <h3>sum { total } · biggest { biggest }</h3>",
        "  <p>{ items.join(', ') }</p>",
        "",
        "  <button @click=\"items.push(Math.round(Math.random() * 20))\">add</button>",
        "  <button @click=\"items.pop()\">remove</button>",
        "</div>"
      ]
    },
    {
      id: 'hooks-ref',
      group: 'hooks',
      title: "useRef",
      desc: "A box nothing subscribes to. Changing .current renders nothing, which is the point.",
      code: [
        "<div v-data=\"{ runs: useRef(0), n: useState(0) }\">",
        "  <p v-effect=\"runs.current++\">n is { n }</p>",
        "",
        "  <button @click=\"n++\">change n</button>",
        "  <button @click=\"alert('effects ran ' + runs.current + ' times')\">",
        "    how many runs?",
        "  </button>",
        "",
        "  <p>The counter climbs, but nothing re-renders because of it.</p>",
        "</div>"
      ]
    },
    {
      id: 'hooks-context',
      group: 'hooks',
      title: "useContext",
      desc: "Shared state between components, with nothing passed through the markup.",
      code: [
        "<div v-data=\"{ s: useContext('session', { name: 'Ana' }) }\">",
        "  <h4>Component A</h4>",
        "  <p>sees: { s.name }</p>",
        "  <input v-model=\"s.name\">",
        "</div>",
        "",
        "<hr>",
        "",
        "<div v-data=\"{ s: useContext('session') }\">",
        "  <h4>Component B</h4>",
        "  <p>sees: { s.name }</p>",
        "  <button @click=\"s.name = 'Bia'\">change from here</button>",
        "</div>"
      ]
    },
    {
      id: 'hooks-jsx',
      group: 'hooks',
      title: "Hooks feeding JSX",
      desc: "A memo filtering a list, rendered by a JSX region. Both in a plain .html file.",
      code: [
        "<div v-data=\"{",
        "  search: useState(''),",
        "  fruit: useState(['apple', 'pear', 'grape', 'melon', 'plum']),",
        "  found: useMemo(() => fruit.filter(f => f.includes(search)))",
        "}\">",
        "  <input v-model=\"search\" placeholder=\"filter\">",
        "",
        "  <ul>",
        "    {found.map(f => (",
        "      <li>{f}</li>",
        "    ))}",
        "  </ul>",
        "",
        "  <p>{found.length === 0 ? <b>nothing found</b> : <span>{found.length} of {fruit.length}</span>}</p>",
        "</div>"
      ]
    },
    {
      id: 'hooks-self-data',
      group: 'hooks',
      title: "v-data reading itself",
      desc: "A key can read the keys written before it, which is what makes useMemo sit next to useState.",
      code: [
        "<div v-data=\"{",
        "  price: useState(100),",
        "  qty: useState(3),",
        "  subtotal: useMemo(() => price * qty),",
        "  tax: useMemo(() => subtotal * 0.1),",
        "  total: useMemo(() => subtotal + tax)",
        "}\">",
        "  <label>price <input type=\"number\" v-model.number=\"price\"></label>",
        "  <label>qty <input type=\"number\" v-model.number=\"qty\"></label>",
        "",
        "  <p>subtotal: { subtotal.toFixed(2) }</p>",
        "  <p>tax: { tax.toFixed(2) }</p>",
        "  <h3>total: { total.toFixed(2) }</h3>",
        "",
        "  <p>Each line reads the one above it. Order matters, backwards only.</p>",
        "</div>"
      ]
    },

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
    },

    // --------------------------------------------------------- jsx
    {
      id: 'jsx-map',
      group: 'jsx',
      title: 'JSX in plain HTML',
      desc: 'Write { list.map(x => (<li>{x}</li>)) } straight in the markup. No build step, no compiler.',
      code: [
        '<div v-data="{ fruits: [\'apple\', \'pear\', \'grape\'] }">',
        '  <ul>',
        '    {fruits.map((fruit) => (',
        '      <li>{fruit}</li>',
        '    ))}',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-conditional',
      group: 'jsx',
      title: 'Conditionals that return elements',
      desc: 'Ternary, &&, and a real if/else if/else. The last one is something JSX itself does not have.',
      code: [
        '<div v-data="{ level: 2, loggedIn: true }">',
        '  <p>{loggedIn ? <b>Welcome back</b> : <b>Please sign in</b>}</p>',
        '',
        '  <p>{loggedIn && <b>Shown only when true</b>}</p>',
        '',
        '  <p>',
        '    {if (level === 1)',
        '      (<b>one</b>)',
        '    else if (level === 2)',
        '      (<b>two</b>)',
        '    else',
        '      (<b>something else</b>)}',
        '  </p>',
        '',
        '  <button @click="level = level === 1 ? 2 : 1">toggle level</button>',
        '</div>'
      ]
    },
    {
      id: 'jsx-objects',
      group: 'jsx',
      title: 'Filter, sort and read fields',
      desc: 'Chain the array methods you already know, then read the object in the template.',
      code: [
        '<div v-data="{ products: [',
        '  { name: \'Laptop\', stock: 5 },',
        '  { name: \'Chair\', stock: 0 },',
        '  { name: \'Mouse\', stock: 12 }',
        '] }">',
        '  <ul>',
        '    {products',
        '      .filter(p => p.stock > 0)',
        '      .sort((a, b) => b.stock - a.stock)',
        '      .map((p, i) => (',
        '        <li>#{i + 1} {p.name} has {p.stock}</li>',
        '      ))',
        '    }',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-block-body',
      group: 'jsx',
      title: 'A callback with a real body',
      desc: 'const, if and return work inside the callback, so branching per item reads the way you would write it.',
      code: [
        '<div v-data="{ products: [',
        '  { name: \'Laptop\', stock: 5 },',
        '  { name: \'Chair\', stock: 0 },',
        '  { name: \'Mouse\', stock: 12 }',
        '] }">',
        '  <ul>',
        '    {products.map(item => {',
        '',
        '      if (item.stock === 0) {',
        '        return (<li>{item.name}: out of stock</li>);',
        '      }',
        '',
        '      const label = item.stock > 6 ? \'plenty\' : \'a few\';',
        '      return (<li>{item.name}: {label} ({item.stock})</li>);',
        '',
        '    })}',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-nested',
      group: 'jsx',
      title: 'A map inside a map',
      desc: 'Templates nest, and the inner one still sees the outer loop variable.',
      code: [
        '<div v-data="{ groups: [',
        '  { title: \'Fruit\', items: [\'apple\', \'pear\'] },',
        '  { title: \'Tools\', items: [\'hammer\', \'saw\', \'drill\'] }',
        '] }">',
        '  {groups.map((group, g) => (',
        '    <section>',
        '      <h3>{group.title}</h3>',
        '      <ul>',
        '        {group.items.map((item, i) => (',
        '          <li>{g}.{i} {item}</li>',
        '        ))}',
        '      </ul>',
        '    </section>',
        '  ))}',
        '</div>'
      ]
    },
    {
      id: 'jsx-reactive',
      group: 'jsx',
      title: 'It stays live',
      desc: 'A JSX region is a reactive effect, so mutating the array re-renders the list.',
      code: [
        '<div v-data="{ items: [1, 2, 3] }">',
        '  <button @click="items.push(items.length + 1)">add</button>',
        '  <button @click="items.pop()">remove</button>',
        '  <button @click="items.reverse()">reverse</button>',
        '',
        '  <p>{items.length > 0 ? <b>{items.length} items</b> : <b>empty</b>}</p>',
        '',
        '  <ul>',
        '    {items.map((x, i) => (',
        '      <li>{i}: {x}</li>',
        '    ))}',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-declaration-block',
      group: 'jsx',
      title: 'Declaring the data in the page',
      desc: 'A { const ... } block at the top of the body puts names in scope, with no v-data anywhere.',
      code: [
        '{',
        '  const user = \'Ana\';',
        '  const tags = [\'html\', \'css\', \'js\'];',
        '}',
        '',
        '<h1>Hello, {user}!</h1>',
        '',
        '<ul>',
        '  {tags.map(tag => (',
        '    <li>#{tag}</li>',
        '  ))}',
        '</ul>'
      ]
    },
    {
      id: 'jsx-table',
      group: 'jsx',
      title: 'A table, with v-data',
      desc: 'A map straight inside tbody. The hardest case, because HTML moves loose text out of a table before any script runs.',
      code: [
        '<div v-data="{ rows: [',
        '  { name: \'Ana\', score: 92 },',
        '  { name: \'Bruno\', score: 47 },',
        '  { name: \'Caio\', score: 78 }',
        '] }">',
        '  <table>',
        '    <thead>',
        '      <tr><th>Name</th><th>Score</th><th>Result</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      {rows.map(r => (',
        '        <tr>',
        '          <td>{r.name}</td>',
        '          <td>{r.score}</td>',
        '          <td>{r.score >= 60 ? <b>pass</b> : <b>fail</b>}</td>',
        '        </tr>',
        '      ))}',
        '    </tbody>',
        '  </table>',
        '</div>'
      ]
    },
    {
      id: 'jsx-table-block',
      group: 'jsx',
      title: 'The same table, no v-data',
      desc: 'Data declared with const in a { } block at the top of the body. No attribute anywhere.',
      code: [
        '{',
        '  const rows = [',
        '    { name: \'Ana\', score: 92 },',
        '    { name: \'Bruno\', score: 47 },',
        '    { name: \'Caio\', score: 78 }',
        '  ];',
        '}',
        '',
        '<table>',
        '  <thead>',
        '    <tr><th>Name</th><th>Score</th><th>Result</th></tr>',
        '  </thead>',
        '  <tbody>',
        '    {rows.map(r => (',
        '      <tr>',
        '        <td>{r.name}</td>',
        '        <td>{r.score}</td>',
        '        <td>{r.score >= 60 ? <b>pass</b> : <b>fail</b>}</td>',
        '      </tr>',
        '    ))}',
        '  </tbody>',
        '</table>'
      ]
    },
    {
      id: 'jsx-list-block',
      group: 'jsx',
      title: 'A list, no v-data',
      desc: 'Same idea without a table. const and let both work in the block.',
      code: [
        '{',
        '  const title = \'Shopping\';',
        '  let items = [\'coffee\', \'bread\', \'eggs\'];',
        '}',
        '',
        '<h3>{title}</h3>',
        '',
        '<ul>',
        '  {items.map((item, i) => (',
        '    <li>{i + 1}. {item}</li>',
        '  ))}',
        '</ul>',
        '',
        '<p>{items.length > 2 ? <b>a long list</b> : <b>a short one</b>}</p>'
      ]
    },
    {
      id: 'jsx-search',
      group: 'jsx',
      title: 'A live filter',
      desc: 'v-model feeds the same expression the list is built from, so typing narrows it as you go.',
      code: [
        '<div v-data="{ q: \'\', people: [\'Ana\', \'Bruno\', \'Carla\', \'Diego\', \'Elena\'] }">',
        '  <input v-model="q" placeholder="type a name">',
        '',
        '  <ul>',
        '    {people',
        '      .filter(p => p.toLowerCase().includes(q.toLowerCase()))',
        '      .map(p => (',
        '        <li>{p}</li>',
        '      ))',
        '    }',
        '  </ul>',
        '',
        '  <p>',
        '    {people.filter(p => p.toLowerCase().includes(q.toLowerCase())).length === 0',
        '      ? <b>nothing matched</b>',
        '      : <b>keep typing to narrow it</b>}',
        '  </p>',
        '</div>'
      ]
    },
    {
      id: 'jsx-numbers',
      group: 'jsx',
      title: 'Generating a range',
      desc: 'Array.from builds the list, and the template decides what each item looks like.',
      code: [
        '<div v-data="{ n: 12 }">',
        '  <input type="range" min="1" max="24" v-model.number="n">',
        '  <p>{n} squares</p>',
        '',
        '  <div>',
        '    {Array.from({ length: n }, (_, i) => i + 1).map(i => (',
        '      <span>{i % 3 === 0 ? <b>[{i}]</b> : <span>{i} </span>}</span>',
        '    ))}',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'jsx-if-else',
      group: 'jsx',
      title: 'if, else if, else',
      desc: 'A real if chain that returns elements. JSX itself has no such thing, only ternaries.',
      code: [
        '<div v-data="{ score: 72 }">',
        '  <input type="range" min="0" max="100" v-model.number="score">',
        '  <p>score: {score}</p>',
        '',
        '  <div>',
        '    {if (score >= 90)',
        '      (<b>excellent</b>)',
        '    else if (score >= 60)',
        '      (<b>pass</b>)',
        '    else',
        '      (<b>fail</b>)}',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'jsx-vars',
      group: 'jsx',
      title: 'const and let inside a callback',
      desc: 'The callback body is a real body. Declare, branch, return early, one item at a time.',
      code: [
        '<div v-data="{ cart: [',
        '  { name: \'Laptop\', price: 4200, qty: 1 },',
        '  { name: \'Mouse\',  price: 120,  qty: 3 },',
        '  { name: \'Cable\',  price: 0,    qty: 2 }',
        '] }">',
        '  <ul>',
        '    {cart.map((item, i) => {',
        '',
        '      const total = item.price * item.qty;',
        '',
        '      if (total === 0) {',
        '        return (<li>{i + 1}. {item.name} — free</li>);',
        '      }',
        '',
        '      const label = total > 1000 ? \'expensive\' : \'cheap\';',
        '      return (<li>{i + 1}. {item.name} — {total} ({label})</li>);',
        '',
        '    })}',
        '  </ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-loop',
      group: 'jsx',
      title: 'Looping without a for',
      desc: 'The expression language has no for statement. Array.from is the range, and map is the loop.',
      code: [
        '<div v-data="{ rows: 4, cols: 4 }">',
        '  <p>a {rows} x {cols} grid, built from two maps</p>',
        '',
        '  {Array.from({ length: rows }, (_, r) => (',
        '    <div>',
        '      {Array.from({ length: cols }, (_, c) => (',
        '        <span>[{r},{c}] </span>',
        '      ))}',
        '    </div>',
        '  ))}',
        '',
        '  <button @click="rows = rows === 4 ? 2 : 4">toggle rows</button>',
        '</div>'
      ]
    },
    {
      id: 'jsx-vdata-shapes',
      group: 'jsx',
      title: 'Everything v-data can hold',
      desc: 'Numbers, strings, arrays, nested objects and arrays of objects, all read from the template.',
      code: [
        '<div v-data="{',
        '  title: \'Report\',',
        '  count: 3,',
        '  tags: [\'a\', \'b\'],',
        '  user: { name: \'Ana\', role: \'admin\' },',
        '  matrix: [[1, 2], [3, 4]],',
        '  people: [{ name: \'Bo\', age: 25 }, { name: \'Cid\', age: 41 }]',
        '}">',
        '  <h3>{title} ({count})</h3>',
        '',
        '  <p>{user.role === \'admin\' ? <b>{user.name} is an admin</b> : <b>{user.name}</b>}</p>',
        '',
        '  <p>{tags.map(t => (<span>#{t} </span>))}</p>',
        '',
        '  <ul>{matrix.map((row, i) => (<li>row {i}: {row[0]} + {row[1]} = {row[0] + row[1]}</li>))}</ul>',
        '',
        '  <ul>{people.filter(p => p.age > 30).map(p => (<li>{p.name}, {p.age}</li>))}</ul>',
        '</div>'
      ]
    },
    {
      id: 'jsx-todo',
      group: 'jsx',
      title: 'A whole todo list',
      desc: 'Add, complete, remove and filter. Every list on screen is one JSX region.',
      code: [
        '<div v-data="{',
        '  draft: \'\',',
        '  filter: \'all\',',
        '  items: [',
        '    { text: \'write the docs\', done: true },',
        '    { text: \'record the video\', done: false }',
        '  ]',
        '}">',
        '',
        '  <input v-model="draft" placeholder="what needs doing?">',
        '  <button @click="draft && (items.push({ text: draft, done: false }), draft = \'\')">add</button>',
        '',
        '  <p>',
        '    <button @click="filter = \'all\'">all</button>',
        '    <button @click="filter = \'open\'">open</button>',
        '    <button @click="filter = \'done\'">done</button>',
        '  </p>',
        '',
        '  <ul>',
        '    {items',
        '      .filter(t => filter === \'all\' || (filter === \'done\') === t.done)',
        '      .map((t, i) => (',
        '        <li>',
        '          <input type="checkbox" v-model="t.done">',
        '          {t.done ? <s>{t.text}</s> : <span>{t.text}</span>}',
        '        </li>',
        '      ))',
        '    }',
        '  </ul>',
        '',
        '  <p>',
        '    {items.filter(t => !t.done).length === 0',
        '      ? <b>nothing left</b>',
        '      : <b>{items.filter(t => !t.done).length} still open</b>}',
        '  </p>',
        '</div>'
      ]
    },
  ];
}());
