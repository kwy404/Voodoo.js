import { c as core, V as VoodooCollection } from './query-CT4EuGa8.cjs';
import './http.cjs';
import './utils.cjs';
import './reactivity.cjs';

/**
 * Build essencial da Voodoo.js, servido por padrao no CDN.
 *
 * Traz tudo que a maioria das paginas precisa: reatividade, directives,
 * componentes, DOM encadeavel, HTTP declarativo, formularios com validacao e
 * mascaras, interface e notificacoes.
 *
 * Fica de fora, para o arquivo continuar pequeno: graficos, animacoes com
 * fisica, roteador, idiomas, inspetor de reatividade e a biblioteca de
 * componentes prontos. Para esses, use `voodoo.full.min.js` ou monte um build
 * sob medida com `npx voodoo build`.
 */

interface VoodooEssential extends Omit<typeof core, never> {
    (input?: unknown, context?: unknown): VoodooCollection;
}
declare const V: VoodooEssential;

export { V, type VoodooEssential, V as default };
