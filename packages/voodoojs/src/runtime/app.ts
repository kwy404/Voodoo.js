/**
 * @module runtime/app
 *
 * Modo aplicacao: `createApp(...).mount('#app')`.
 *
 * O modo de sempre da Voodoo e ligar atributos a um HTML que ja existe. Este
 * modulo acrescenta o outro caminho, o do Vue e do React: a aplicacao inteira e
 * descrita em JavaScript, tem uma raiz propria e o HTML dela vem do template.
 *
 * ```js
 * const app = V.createApp({
 *   data: () => ({ n: 0 }),
 *   computed: { dobro() { return this.n * 2 } },
 *   methods: { somar() { this.n++ } },
 *   template: `
 *     <button @click="somar()">Cliques: { n }</button>
 *     <p>Dobro: { dobro }</p>
 *   `
 * })
 *
 * app.mount('#app')
 * ```
 *
 * Duas diferencas propositais em relacao ao Vue:
 *
 * 1. `mount` aceita um alvo que ainda nao existe. Nao existe corrida com o
 *    carregamento da pagina, porque quem espera e o agendador da propria
 *    Voodoo, e nao `DOMContentLoaded`.
 * 2. `unmount` devolve o container ao HTML original, em vez de deixa-lo vazio.
 */

import { handleError } from '../reactivity';
import {
  components,
  config,
  normalizeComponentName,
  usePlugin,
  type ComponentDefinition,
  type VoodooPlugin,
} from './registry';
import { defineComponent, type ComponentInstance } from './component';
import { destroy, getScope, walk } from './walker';
import { rootScope } from './scope';
import { whenElement } from './boot';
import { allowedGlobals } from '../parser/interpreter';

export interface AppOptions extends ComponentDefinition {
  /** Componentes visiveis apenas dentro desta aplicacao. */
  components?: Record<string, ComponentDefinition>;
  /** Valores entregues a arvore inteira, lidos com `inject`. */
  provide?: Record<string, unknown> | (() => Record<string, unknown>);
}

export interface AppConfig {
  /** Valores liberados dentro das expressoes desta aplicacao. */
  globalProperties: Record<string, unknown>;
}

export interface App {
  /** Nome interno do componente raiz, util em mensagens e no inspetor. */
  readonly name: string;
  readonly config: AppConfig;
  /** Instancia raiz, ou `null` enquanto a aplicacao nao montou. */
  readonly instance: ComponentInstance | null;
  /** Elemento que recebeu a aplicacao, ou `null`. */
  readonly container: Element | null;
  readonly isMounted: boolean;

  component(name: string): ComponentDefinition | undefined;
  component(name: string, definition: ComponentDefinition): App;
  directive(name: string, definition: unknown): App;
  use(plugin: VoodooPlugin | Function, options?: Record<string, unknown>): App;
  provide(key: string, value: unknown): App;

  /**
   * Monta a aplicacao. O alvo pode ser um seletor ou um elemento, e pode ainda
   * nao existir: nesse caso a montagem acontece assim que ele aparecer.
   */
  mount(target: string | Element): ComponentInstance | null;
  /** Promessa resolvida com a instancia raiz quando a montagem acontecer. */
  whenMounted(): Promise<ComponentInstance>;
  /** Desmonta e devolve o container ao conteudo original. */
  unmount(): void;
}

let contador = 0;

/** Registro de directives, injetado por `core.ts` para evitar ciclo. */
let directiveRegistrar: ((name: string, definition: any) => void) | null = null;

export function setDirectiveRegistrar(fn: (name: string, definition: any) => void): void {
  directiveRegistrar = fn;
}

/**
 * Cria uma aplicacao. As opcoes sao as mesmas de um componente, mais
 * `components` e `provide`.
 */
export function createApp(options: AppOptions = {}): App {
  const name = `voodoo-app-${++contador}`;
  const { components: locais, ...raiz } = options;

  const config_: AppConfig = { globalProperties: {} };
  const providos: Record<string, unknown> = {};
  const registradosPorEsteApp: string[] = [];

  let container: Element | null = null;
  let htmlOriginal = '';
  let instancia: ComponentInstance | null = null;
  let esperando: Array<(i: ComponentInstance) => void> = [];

  /** Coloca no registro global o que ainda nao existe, e anota o que criou. */
  function registrarLocais(): void {
    if (!locais) return;
    for (const [nome, definicao] of Object.entries(locais)) {
      const normalizado = normalizeComponentName(nome);
      if (components.has(normalizado)) continue;
      defineComponent(normalizado, definicao);
      registradosPorEsteApp.push(normalizado);
    }
  }

  function montarEm(el: Element): ComponentInstance | null {
    if (instancia) return instancia;

    container = el;
    htmlOriginal = el.innerHTML;

    Object.assign(allowedGlobals, config_.globalProperties);
    registrarLocais();

    // O componente raiz entra no registro com um nome proprio, e o walker faz
    // o resto: template, slots, props, ciclo de vida e a caminhada dos filhos.
    const definicao: ComponentDefinition = { ...raiz };
    if (Object.keys(providos).length) {
      const anterior = definicao.provide;
      definicao.provide = () => ({
        ...(typeof anterior === 'function' ? anterior() : anterior ?? {}),
        ...providos,
      });
    }
    defineComponent(name, definicao);

    el.setAttribute(`${config.prefix}component`, name);

    try {
      walk(el, rootScope);
    } catch (err) {
      handleError(err, `montagem da aplicacao "${name}"`);
      return null;
    }

    instancia = (getScope(el)?.component as ComponentInstance) ?? null;

    if (instancia) {
      const fila = esperando;
      esperando = [];
      for (const resolver of fila) resolver(instancia);
    }

    return instancia;
  }

  const app: App = {
    name,
    config: config_,

    get instance() {
      return instancia;
    },
    get container() {
      return container;
    },
    get isMounted() {
      return instancia !== null;
    },

    component(nome: string, definicao?: ComponentDefinition): any {
      const normalizado = normalizeComponentName(nome);
      if (definicao === undefined) {
        return (locais && locais[nome]) ?? components.get(normalizado);
      }
      if (locais) locais[nome] = definicao;
      else (options as AppOptions).components = { [nome]: definicao };
      // Depois de montado, registrar de imediato: o walker monta as tags que
      // ja estavam esperando por este componente.
      if (instancia && !components.has(normalizado)) {
        defineComponent(normalizado, definicao);
        registradosPorEsteApp.push(normalizado);
      }
      return app;
    },

    directive(nome: string, definicao: unknown): App {
      directiveRegistrar?.(nome, definicao);
      return app;
    },

    use(plugin: VoodooPlugin | Function, opcoes?: Record<string, unknown>): App {
      usePlugin(globalThis_V(), plugin as any, opcoes);
      return app;
    },

    provide(chave: string, valor: unknown): App {
      providos[chave] = valor;
      return app;
    },

    mount(alvo: string | Element): ComponentInstance | null {
      if (instancia) return instancia;

      if (typeof alvo !== 'string') return montarEm(alvo);

      let resultado: ComponentInstance | null = null;
      whenElement(
        alvo,
        (el) => {
          resultado = montarEm(el);
        },
        () => {
          // eslint-disable-next-line no-console
          console.warn(
            `[Voodoo] createApp().mount("${alvo}") nao encontrou o elemento. ` +
              'A aplicacao continua sem montar.'
          );
        }
      );
      return resultado;
    },

    whenMounted(): Promise<ComponentInstance> {
      if (instancia) return Promise.resolve(instancia);
      return new Promise((resolve) => esperando.push(resolve));
    },

    unmount(): void {
      if (!container) return;

      destroy(container);
      container.removeAttribute(`${config.prefix}component`);
      container.innerHTML = htmlOriginal;

      components.delete(name);
      for (const nome of registradosPorEsteApp) components.delete(nome);
      registradosPorEsteApp.length = 0;

      instancia = null;
      container = null;
    },
  };

  return app;
}

/** O objeto `V`, publicado por `core.ts`. Evita import circular. */
let objetoV: any = null;
export function setAppHost(V: any): void {
  objetoV = V;
}
function globalThis_V(): any {
  return objetoV;
}
