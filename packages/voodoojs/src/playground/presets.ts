/**
 * Ready examples for a playground, a lesson or a new project.
 *
 * Four small pages that each show one everyday job end to end: state and
 * events, a list, a validated form and a request. They are plain directive
 * syntax, so they run in every build, and they carry no styling of their own:
 * the runner's default stylesheet, or the page they are pasted into, decides
 * how they look.
 *
 * `voodoojs-cli init --example=<id>` writes the same code into a new project.
 * A test keeps the two copies identical.
 */

export interface Preset {
  /** Stable id, used in URLs and by `voodoojs-cli init --example`. */
  id: string;
  /** A short title. */
  title: string;
  /** One sentence on what the example shows. */
  description: string;
  /** The markup, ready to run as the body of a page that loads Voodoo.js. */
  code: string;
}

const counter = `<div v-data="{ count: 0 }">
  <h2>Counter</h2>
  <p><strong>{ count }</strong> { count === 1 ? 'click' : 'clicks' }</p>

  <button @click="count--">Less</button>
  <button @click="count++">More</button>
  <button @click="count = 0" :disabled="count === 0">Reset</button>

  <p v-show="count >= 10">Double digits. Keep going.</p>
</div>
`;

const todo = `<div v-data="{
  draft: '',
  nextId: 3,
  todos: [
    { id: 1, text: 'Try the counter example', done: true },
    { id: 2, text: 'Add a todo of your own', done: false }
  ]
}">
  <h2>Todo list</h2>

  <form @submit.prevent="if (draft.trim()) { todos.push({ id: nextId++, text: draft.trim(), done: false }); draft = '' }">
    <input v-model="draft" placeholder="What needs doing?" aria-label="New todo">
    <button>Add</button>
  </form>

  <ul>
    <li v-for="todo in todos" :key="todo.id">
      <label>
        <input type="checkbox" v-model="todo.done">
        <s v-if="todo.done">{ todo.text }</s>
        <span v-else>{ todo.text }</span>
      </label>
      <button @click="todos.splice(todos.indexOf(todo), 1)">Remove</button>
    </li>
  </ul>

  <p v-if="todos.length === 0">Nothing left to do. Add something above.</p>
  <p v-else>{ todos.filter((t) => !t.done).length } of { todos.length } still open</p>
</div>
`;

const form = `<form v-validate v-data="{ name: '', email: '', sent: false }" @submit.prevent="sent = true">
  <h2>Sign up</h2>

  <p>
    <label>Name<br>
      <input name="name" v-model="name" v-required v-minlength="2">
    </label>
  </p>
  <p>
    <label>Email<br>
      <input name="email" type="email" v-model="email" v-required v-email>
    </label>
  </p>

  <button>Create account</button>

  <p v-if="sent" role="status">
    Welcome, { name }! Nothing was sent anywhere: this form only checks its fields.
  </p>
</form>
`;

const fetchUsers = `<div v-resource="users: https://jsonplaceholder.typicode.com/users">
  <h2>Users from an API</h2>
  <button @click="users.reload()" :disabled="users.loading">
    { users.loading ? 'Loading...' : 'Reload' }
  </button>

  <p v-if="users.error" role="alert">Could not load the users: { users.error.message }</p>
  <p v-else-if="!users.loaded">Loading...</p>
  <p v-else-if="users.data.length === 0">The API answered with no users.</p>
  <ul v-else>
    <li v-for="user in users.data" :key="user.id">
      <strong>{ user.name }</strong>, { user.email }
    </li>
  </ul>
</div>
`;

export const presets: readonly Preset[] = [
  {
    id: 'counter',
    title: 'Counter',
    description: 'State, events and a bound attribute, in one element.',
    code: counter,
  },
  {
    id: 'todo',
    title: 'Todo list',
    description: 'Add, check off and remove items, with a message when the list is empty.',
    code: todo,
  },
  {
    id: 'form',
    title: 'Form with validation',
    description: 'Rules written on the fields; the submit waits until every field passes.',
    code: form,
  },
  {
    id: 'fetch',
    title: 'Fetching data',
    description: 'A request with its loading, error and empty states, and a reload button.',
    code: fetchUsers,
  },
];

// Shared by every runner on the page, so nobody can edit one for the others.
for (const entry of presets) Object.freeze(entry);
Object.freeze(presets);

/** The preset with this id, or `undefined`. */
export function preset(id: string): Preset | undefined {
  const wanted = String(id).trim().toLowerCase();
  return presets.find((p) => p.id === wanted);
}
