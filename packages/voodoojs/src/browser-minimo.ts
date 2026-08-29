/**
 * Ponto de entrada do build minimo para navegador.
 * Publica `window.V` e inicializa a pagina quando o documento fica pronto.
 */

import V from './minimo';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
