/**
 * Gera o indice de busca da documentacao.
 *
 *   node scripts/docs-index.mjs
 *
 * Le todas as paginas de site/docs, quebra cada uma nas secoes marcadas por
 * <h2 id> e <h3 id>, e escreve site/docs/assets/busca.js com o array que o
 * campo de busca carrega sob demanda.
 *
 * Formato de cada item, curto de proposito porque o arquivo vai para o
 * navegador:
 *
 *   t  titulo da pagina
 *   s  titulo da secao, vazio na abertura da pagina
 *   e  trecho de texto, ate 220 caracteres
 *   p  id da pagina, no mesmo formato do menu
 *   a  ancora da secao, vazia na abertura
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(RAIZ, 'site', 'docs');
const SAIDA = join(DOCS, 'assets', 'busca.js');

const LIMITE_TRECHO = 220;

/** Paginas na ordem do menu, lida do proprio docs.js para nao duplicar a lista. */
function paginasDoMenu() {
  const fonte = readFileSync(join(DOCS, 'assets', 'docs.js'), 'utf8');
  const ids = [];
  const re = /\{\s*id:\s*'([^']*)'\s*,\s*titulo:\s*'((?:[^'\\]|\\.)*)'/g;
  let achado;
  while ((achado = re.exec(fonte)) !== null) {
    ids.push({ id: achado[1], titulo: achado[2].replace(/\\'/g, "'") });
  }
  return ids;
}

function caminhoDaPagina(id) {
  return join(DOCS, id ? `${id}.html` : 'index.html');
}

/** Corpo do <article>, que e a unica parte indexavel. */
function artigoDe(html) {
  const inicio = html.indexOf('<article');
  const fim = html.indexOf('</article>');
  if (inicio < 0 || fim < 0) return '';
  return html.slice(html.indexOf('>', inicio) + 1, fim);
}

function semTags(trecho) {
  return trecho
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function encurtar(texto) {
  if (texto.length <= LIMITE_TRECHO) return texto;
  const corte = texto.slice(0, LIMITE_TRECHO);
  const espaco = corte.lastIndexOf(' ');
  return `${corte.slice(0, espaco > 120 ? espaco : LIMITE_TRECHO)}...`;
}

/** Quebra o artigo em abertura mais uma entrada por titulo com id. */
function secoesDe(artigo) {
  const partes = [];
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;

  let ultimoFim = 0;
  let anterior = null;
  let achado;

  while ((achado = re.exec(artigo)) !== null) {
    const corpo = artigo.slice(ultimoFim, achado.index);
    if (anterior) anterior.texto = semTags(corpo);
    else partes.push({ ancora: '', secao: '', texto: semTags(corpo) });

    anterior = { ancora: achado[2], secao: semTags(achado[3]), texto: '' };
    partes.push(anterior);
    ultimoFim = re.lastIndex;
  }

  if (anterior) anterior.texto = semTags(artigo.slice(ultimoFim));
  else partes.push({ ancora: '', secao: '', texto: semTags(artigo) });

  return partes.filter((parte) => parte.texto || parte.secao);
}

const itens = [];
const ausentes = [];

for (const pagina of paginasDoMenu()) {
  const caminho = caminhoDaPagina(pagina.id);
  if (!existsSync(caminho)) {
    ausentes.push(pagina.id);
    continue;
  }

  const artigo = artigoDe(readFileSync(caminho, 'utf8'));
  for (const secao of secoesDe(artigo)) {
    itens.push({
      t: pagina.titulo,
      s: secao.secao,
      e: encurtar(secao.texto),
      p: pagina.id,
      a: secao.ancora,
    });
  }
}

const cabecalho = `/* Gerado por scripts/docs-index.mjs. Nao edite a mao. */\n`;
writeFileSync(SAIDA, `${cabecalho}window.VOODOO_DOCS_BUSCA = ${JSON.stringify(itens)};\n`, 'utf8');

const kb = (Buffer.byteLength(readFileSync(SAIDA)) / 1024).toFixed(1);
console.log(`indice de busca: ${itens.length} secoes de ${paginasDoMenu().length} paginas, ${kb} KB`);
if (ausentes.length) console.log(`paginas ausentes: ${ausentes.join(' ')}`);

const arquivos = [];
for (const pasta of ['', 'guia', 'referencia']) {
  const dir = join(DOCS, pasta);
  for (const nome of readdirSync(dir)) {
    if (nome.endsWith('.html')) {
      arquivos.push((pasta ? `${pasta}/` : '') + nome.replace(/\.html$/, '').replace(/^index$/, ''));
    }
  }
}
const orfas = arquivos.filter((a) => !paginasDoMenu().some((p) => p.id === a));
if (orfas.length) console.log(`paginas fora do menu: ${orfas.join(' ')}`);
