/**
 * The five starters at the top of the playground: a counter, a todo list, a
 * form with validation, a request, and a blank page.
 *
 * They are the shortest working version of the four things people try first,
 * written with Monsoon components (card, btn, input) rather than long utility
 * strings, so the Voodoo syntax is most of what is on screen. The playground
 * opens on the first one, and the toolbar has a button for each.
 *
 * Same shape as playground-examples.js: id, group, title, desc, code lines.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  window.VOODOO_PLAYGROUND_STARTERS = [
    {
      id: 'start-counter',
      group: 'start',
      title: 'Counter',
      desc: 'State in v-data, a value in braces, and @click to change it.',
      code: [
        '<!-- State lives in an attribute. JSX lives in braces. -->',
        '<div class="p-6">',
        '  <div v-data="{ count: 0 }" class="card card-bordered max-w-sm mx-auto">',
        '    <div class="card-body items-center text-center gap-3">',
        '      <p class="text-sm text-muted-foreground">Spells cast</p>',
        '      <p class="text-6xl font-bold text-primary">{ count }</p>',
        '',
        '      <div class="flex gap-2">',
        '        <button class="btn btn-outline" @click="count--">Undo</button>',
        '        <button class="btn btn-primary" @click="count++">Cast a spell</button>',
        '      </div>',
        '',
        '      { count >= 5',
        '          ? <p class="badge badge-success">Archmage reached</p>',
        '          : <p class="text-sm text-muted-foreground">{ 5 - count } to archmage</p> }',
        '    </div>',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'start-todo',
      group: 'start',
      title: 'Todo list',
      desc: 'v-model on the input, a list drawn with map, and items you can tick and remove.',
      code: [
        '<div class="p-6">',
        '  <div v-data="{ text: \'\', todos: [',
        '         { title: \'Brew a potion\', done: false },',
        '         { title: \'Feed the cat\', done: true }',
        '       ] }"',
        '       class="card card-bordered max-w-sm mx-auto">',
        '    <form class="card-body gap-3"',
        '          @submit.prevent="todos.push({ title: text, done: false }); text = \'\'">',
        '      <h2 class="card-title">Spell list</h2>',
        '      <div class="flex gap-2">',
        '        <input class="input flex-1" v-model.trim="text" placeholder="A new spell">',
        '        <button class="btn btn-primary" :disabled="!text">Add</button>',
        '      </div>',
        '',
        '      <ul class="space-y-2">',
        '        {todos.map((todo, i) => (',
        '          <li class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">',
        '            <input type="checkbox" class="checkbox" v-model="todo.done">',
        '            <span class="flex-1" :class="todo.done ? \'line-through text-muted-foreground\' : \'\'">{todo.title}</span>',
        '            <button type="button" class="btn btn-ghost btn-xs" @click="todos.splice(i, 1)">Remove</button>',
        '          </li>',
        '        ))}',
        '      </ul>',
        '',
        '      { todos.length === 0',
        '          ? <p class="text-sm text-muted-foreground">Nothing left. Add a spell above.</p>',
        '          : <p class="text-sm text-muted-foreground">{ todos.filter(t => !t.done).length } left</p> }',
        '    </form>',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'start-form',
      group: 'start',
      title: 'Form with validation',
      desc: 'v-validate with v-required, v-email and v-minlength, and a button that waits for valid input.',
      code: [
        '<div class="p-6">',
        '  <form v-validate v-data="{ email: \'\', pass: \'\', sent: false }"',
        '        class="card card-bordered max-w-sm mx-auto" @submit.prevent="sent = true">',
        '    <div class="card-body gap-3">',
        '      <h2 class="card-title">Join the coven</h2>',
        '      <input class="input" name="email" placeholder="Email"',
        '             v-model="email" v-required v-email>',
        '      <input class="input" name="pass" type="password" placeholder="Password, 8 or more"',
        '             v-model="pass" v-required v-minlength="8">',
        '      <progress class="progress" max="8" :value="pass.length"',
        '                :class="pass.length >= 8 ? \'progress-success\' : \'progress-warning\'"></progress>',
        '      <button class="btn btn-primary"',
        '              :disabled="!email.includes(\'@\') || pass.length < 8">Create account</button>',
        '',
        '      { sent ? <p class="callout callout-success">Welcome, { email }!</p> : null }',
        '    </div>',
        '  </form>',
        '</div>'
      ]
    },
    {
      id: 'start-fetch',
      group: 'start',
      title: 'Fetch data',
      desc: 'v-resource requests a URL and gives you loading, error and data, all reactive.',
      code: [
        '<!-- A request, with its loading and error state, in one attribute. -->',
        '<div class="p-6">',
        '  <div v-resource="users: https://jsonplaceholder.typicode.com/users"',
        '       class="card card-bordered max-w-sm mx-auto">',
        '    <div class="card-body gap-3">',
        '      <div class="flex items-center justify-between">',
        '        <h2 class="card-title">The coven</h2>',
        '        <button class="btn btn-outline btn-sm" @click="users.reload()">Reload</button>',
        '      </div>',
        '',
        '      <p v-if="users.loading" class="text-muted-foreground">Summoning...</p>',
        '      <p v-else-if="users.error" class="text-danger">{ users.error.message }</p>',
        '      <ul v-else class="divide-y divide-border">',
        '        <li v-for="u in users.data.slice(0, 5)" :key="u.id" class="py-2">',
        '          <p class="font-medium">{ u.name }</p>',
        '          <p class="text-sm text-muted-foreground">{ u.email.toLowerCase() }</p>',
        '        </li>',
        '      </ul>',
        '    </div>',
        '  </div>',
        '</div>'
      ]
    },
    {
      id: 'start-blank',
      group: 'start',
      title: 'Blank page',
      desc: 'An empty page with one piece of state. Start writing.',
      code: [
        '<!-- Write any HTML. Add state with v-data and show it in braces. -->',
        '<div v-data="{ message: \'Hello\' }" class="p-6">',
        '  <h1 class="text-3xl font-bold">{ message }</h1>',
        '  <input class="input mt-4" v-model="message">',
        '</div>'
      ]
    }
  ];
})();
