/**
 * Build completo da Voodoo.js para navegador.
 *
 * Alem de tudo que vem no build essencial, inclui graficos, animacoes com
 * fisica de mola, roteador, idiomas, inspetor de reatividade e a biblioteca de
 * componentes prontos.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>
 * ```
 */

import V from './index';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
