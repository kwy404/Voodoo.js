/**
 * Ponto de entrada do build essencial para navegador.
 * Publica `window.V` e inicializa a pagina quando o DOM estiver pronto.
 */

import V from './essential';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
