/* ==========================================================================
   mundo.js : motor de renderizacao da demo "mundo aberto"

   Este arquivo e o unico lugar da demo que fala WebGL. Ele nao conhece a
   Voodoo, nao toca no DOM da interface e nao sabe o que e um slider: recebe
   um canvas, expoe um objeto `opcoes` de valores simples e devolve numeros
   pelo callback `aoAtualizar`. Quem liga isso a tela e o index.html, em
   Voodoo declarativo.

   A divisao e proposital e e o assunto da demo:
     - HTML + Voodoo  -> tudo que e interface (HUD, menus, sliders, minimapa)
     - WebGL2         -> so o que apenas o WebGL faz (o mundo em si)

   Nada de bibliotecas: matrizes, ruido, geracao da cidade, sombras e ceu
   sao escritos aqui na mao, em WebGL2 puro.
   ========================================================================== */

(function (global) {
  'use strict';

  // ======================================================================
  // 1. Constantes do mundo
  // ======================================================================

  var TAM_MUNDO = 620;      // lado do terreno, em metros
  var SEG_TERRENO = 168;    // divisoes do terreno (168x168 quads)
  var BLOCO = 46;           // distancia entre duas ruas paralelas
  var MEIA_RUA = 6.0;       // meia largura do asfalto
  var CALCADA = 9.5;        // ate onde vai a calcada, medido do centro da rua
  var RAIO_CIDADE = 230;    // depois disso comeca o campo
  var PASSO_POSTE = 40;     // espacamento dos postes ao longo das avenidas
  var LADO_POSTE = 8.3;     // distancia do poste ate o centro da avenida
  var SEMENTE = 20260831;   // seed fixa: o mesmo mundo em toda visita

  // 20 floats por instancia: posicao, tamanho, cor, matriz 3x3 e tipo.
  var FLOATS_INST = 20;

  // ======================================================================
  // 2. Ruido e terreno
  //    Ruido de valor escrito na mao, com seed. A mesma funcao gera a malha
  //    do terreno e responde "qual a altura aqui?" para o carro e o transito,
  //    entao nada nunca flutua nem afunda.
  // ======================================================================

  function hash2(x, y, s) {
    var n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function ruido(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
    var c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    var ab = a + (b - a) * u;
    var cd = c + (d - c) * u;
    return ab + (cd - ab) * v;
  }

  /** Altura do terreno em metros. Colinas largas e suaves: as ruas seguem
      o relevo em vez de serem aplanadas, o que da o ar de cidade em morro
      e sai de graca (uma malha so, sem recorte). */
  function altura(x, z) {
    var h = ruido(x / 155, z / 155, 11) * 13 - 6.5;
    h += ruido(x / 61, z / 61, 23) * 4.2 - 2.1;
    h += ruido(x / 22, z / 22, 37) * 1.0 - 0.5;
    return h;
  }

  /** Normal do terreno por diferencas finitas, para inclinar o carro. */
  function normalTerreno(x, z, saida) {
    var e = 1.2;
    var hx = altura(x + e, z) - altura(x - e, z);
    var hz = altura(x, z + e) - altura(x, z - e);
    var nx = -hx, ny = 2 * e, nz = -hz;
    var m = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    saida[0] = nx / m; saida[1] = ny / m; saida[2] = nz / m;
    return saida;
  }

  function modPos(v, p) { return v - p * Math.floor(v / p); }
  function distGrade(v, p) { return Math.abs(modPos(v + p * 0.5, p) - p * 0.5); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ======================================================================
  // 3. Matrizes 4x4 em ordem de coluna, do jeito que a WebGL espera
  // ======================================================================

  function mat4() { return new Float32Array(16); }

  function perspectiva(out, fovy, aspecto, perto, longe) {
    var f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspecto; out[5] = f; out[11] = -1;
    out[10] = (longe + perto) / (perto - longe);
    out[14] = (2 * longe * perto) / (perto - longe);
    return out;
  }

  function ortogonal(out, e, d, b, t, n, f) {
    out.fill(0);
    out[0] = 2 / (d - e); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
    out[12] = -(d + e) / (d - e);
    out[13] = -(t + b) / (t - b);
    out[14] = -(f + n) / (f - n);
    out[15] = 1;
    return out;
  }

  function olharPara(out, olho, alvo, cima) {
    var zx = olho[0] - alvo[0], zy = olho[1] - alvo[1], zz = olho[2] - alvo[2];
    var m = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1;
    zx /= m; zy /= m; zz /= m;
    var xx = cima[1] * zz - cima[2] * zy;
    var xy = cima[2] * zx - cima[0] * zz;
    var xz = cima[0] * zy - cima[1] * zx;
    m = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
    xx /= m; xy /= m; xz /= m;
    var yx = zy * xz - zz * xy;
    var yy = zz * xx - zx * xz;
    var yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * olho[0] + xy * olho[1] + xz * olho[2]);
    out[13] = -(yx * olho[0] + yy * olho[1] + yz * olho[2]);
    out[14] = -(zx * olho[0] + zy * olho[1] + zz * olho[2]);
    out[15] = 1;
    return out;
  }

  function multiplicar(out, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  /** Matriz de rotacao 3x3 (guinada, arfagem, rolagem) achatada em 9 floats. */
  function rot3(saida, off, guinada, arfagem, rolagem) {
    var cy = Math.cos(guinada), sy = Math.sin(guinada);
    var cp = Math.cos(arfagem), sp = Math.sin(arfagem);
    var cr = Math.cos(rolagem), sr = Math.sin(rolagem);
    // R = Ry * Rx * Rz, em ordem de coluna
    saida[off] = cy * cr + sy * sp * sr;
    saida[off + 1] = cp * sr;
    saida[off + 2] = -sy * cr + cy * sp * sr;
    saida[off + 3] = -cy * sr + sy * sp * cr;
    saida[off + 4] = cp * cr;
    saida[off + 5] = sy * sr + cy * sp * cr;
    saida[off + 6] = sy * cp;
    saida[off + 7] = -sp;
    saida[off + 8] = cy * cp;
  }

  // ======================================================================
  // 4. GLSL
  //    Pedacos compartilhados entre os shaders, colados por concatenacao.
  //    Todo shader daqui e GLSL ES 3.00, so disponivel no WebGL2.
  // ======================================================================

  var GLSL_COMUM = [
    'uniform vec3 uZenite;',
    'uniform vec3 uHorizonte;',
    'uniform vec3 uSolo;',
    'uniform vec3 uSolCor;',
    'uniform vec3 uSolDir;',
    'uniform float uSolForca;',
    'uniform vec3 uAmbAlto;',
    'uniform vec3 uAmbBaixo;',
    'uniform float uNoite;',
    'uniform float uNevoa;',
    'uniform float uExposicao;',
    'uniform vec3 uCam;',
    'uniform vec3 uFarolPos;',
    'uniform vec3 uFarolDir;',
    'uniform float uFarolForca;',

    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',

    'float ruido2(vec2 p){',
    '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  float a = hash21(i), b = hash21(i+vec2(1.0,0.0));',
    '  float c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);',
    '}',

    // Cor do ceu numa direcao. Usada pelo passe de ceu e, de novo, pela
    // nevoa: assim o horizonte e a nevoa sao literalmente a mesma cor e o
    // fim do mundo desaparece sem costura visivel.
    'vec3 corCeu(vec3 dir){',
    '  float t = dir.y;',
    '  vec3 c = mix(uHorizonte, uZenite, pow(clamp(t, 0.0, 1.0), 0.42));',
    '  c = mix(uSolo, c, smoothstep(-0.16, 0.035, t));',
    '  float sd = max(dot(dir, uSolDir), 0.0);',
    '  c += uSolCor * pow(sd, 5.0) * 0.30 * (1.0 - uNoite * 0.85);',
    '  return c;',
    '}',

    // Nevoa com queda cubica: o campo proximo fica limpo e o fim do mundo
    // fecha rapido. Com expoente 2 o meio da rua ja saia lavado.
    'vec3 aplicarNevoa(vec3 cor, vec3 dirVista, float dist){',
    '  float f = 1.0 - exp(-pow(dist * uNevoa, 3.0));',
    '  return mix(cor, corCeu(dirVista), clamp(f, 0.0, 1.0));',
    '}',

    // Farois do carro do jogador, tratados como um unico cone largo.
    // Uma luz de verdade custaria pouco mais, mas duas ja pareceriam duas.
    'vec3 farois(vec3 mundo, vec3 n){',
    '  if (uFarolForca <= 0.001) return vec3(0.0);',
    '  vec3 d = mundo - uFarolPos;',
    '  float dist = length(d);',
    '  vec3 dn = d / max(dist, 0.001);',
    '  float cone = smoothstep(0.78, 0.95, dot(dn, uFarolDir));',
    '  float queda = 1.0 / (1.0 + dist * dist * 0.0045);',
    '  float lamb = max(dot(n, -dn), 0.18);',
    '  return vec3(1.0, 0.93, 0.76) * uFarolForca * cone * queda * lamb * 7.0;',
    '}',

    // Filmico ACES aproximado + gama. Todos os passes saem por aqui, entao
    // ceu, terreno e predios respondem igual a exposicao.
    'vec3 acabamento(vec3 x){',
    '  x *= uExposicao;',
    '  vec3 a = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);',
    '  return pow(clamp(a, 0.0, 1.0), vec3(1.0 / 2.2));',
    '}'
  ].join('\n');

  var GLSL_SOMBRA = [
    'uniform highp sampler2DShadow uSombra;',
    'uniform float uSombraAtiva;',
    'uniform float uSombraTexel;',
    'in vec4 vLuzPos;',
    'float fatorSombra(){',
    '  if (uSombraAtiva < 0.5) return 1.0;',
    '  vec3 p = vLuzPos.xyz / vLuzPos.w;',
    '  p = p * 0.5 + 0.5;',
    '  if (p.z > 1.0 || min(p.x, p.y) < 0.0 || max(p.x, p.y) > 1.0) return 1.0;',
    '  p.z -= 0.0016;',
    '  float s = 0.0;',
    '  for (int y = -1; y <= 1; y++) {',
    '    for (int x = -1; x <= 1; x++) {',
    '      s += texture(uSombra, vec3(p.xy + vec2(float(x), float(y)) * uSombraTexel, p.z));',
    '    }',
    '  }',
    '  return s / 9.0;',
    '}'
  ].join('\n');

  // ---------------------------------------------------------------- ceu
  var VS_CEU = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPos;',
    'out vec2 vNdc;',
    'void main(){ vNdc = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FS_CEU = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vNdc;',
    'out vec4 corSaida;',
    'uniform vec3 uFrente, uDireita, uCima;',
    'uniform float uTanMeioFov, uAspecto, uTempo;',
    GLSL_COMUM,

    'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * ruido2(p); p *= 2.07; a *= 0.5; } return s; }',

    'float estrelas(vec3 dir){',
    '  vec2 uv = vec2(atan(dir.z, dir.x) * 2.4, dir.y * 5.0) * 42.0;',
    '  vec2 id = floor(uv), fr = fract(uv);',
    '  float h = hash21(id);',
    '  if (h < 0.955) return 0.0;',
    '  vec2 c = vec2(hash21(id + 1.3), hash21(id + 7.7));',
    '  float d = length(fr - c);',
    '  float cintila = 0.55 + 0.45 * sin(uTempo * 2.0 + h * 90.0);',
    '  return smoothstep(0.20, 0.0, d) * cintila * (0.35 + 0.65 * hash21(id + 9.1));',
    '}',

    'void main(){',
    '  vec3 dir = normalize(uFrente + uDireita * (vNdc.x * uTanMeioFov * uAspecto) + uCima * (vNdc.y * uTanMeioFov));',
    '  vec3 cor = corCeu(dir);',

    // estrelas so acima da linha do horizonte e so a noite
    '  cor += vec3(0.95, 0.96, 1.0) * estrelas(dir) * uNoite * smoothstep(0.0, 0.18, dir.y) * 1.6;',

    // disco do sol e da lua
    '  float sd = max(dot(dir, uSolDir), 0.0);',
    '  cor += uSolCor * pow(sd, 2200.0) * 24.0;',
    '  float ld = max(dot(dir, -uSolDir), 0.0);',
    '  float lua = pow(ld, 5000.0);',
    '  cor += vec3(0.90, 0.92, 1.0) * lua * 6.0 * uNoite;',
    '  cor += vec3(0.42, 0.48, 0.66) * pow(ld, 220.0) * 0.5 * uNoite;',

    // nuvens: ruido projetado num plano alto, iluminado pelo sol
    '  if (dir.y > 0.012) {',
    '    vec2 pc = dir.xz / dir.y;',
    '    float n = fbm(pc * 0.0070 + vec2(uTempo * 0.0035, uTempo * 0.0012));',
    '    float massa = smoothstep(0.60, 0.93, n);',
    '    massa *= smoothstep(0.012, 0.20, dir.y);',
    '    float borda = smoothstep(0.56, 0.80, n);',
    '    vec3 corNuvem = mix(uHorizonte * 0.85, uSolCor * 0.80 + 0.14, borda);',
    '    corNuvem = mix(corNuvem * 0.55, corNuvem, uSolForca * 0.7 + 0.3);',
    '    cor = mix(cor, corNuvem, massa * 0.72);',
    '  }',

    '  corSaida = vec4(acabamento(cor), 1.0);',
    '}'
  ].join('\n');

  // ------------------------------------------------------------ terreno
  var VS_TERRENO = [
    '#version 300 es',
    'layout(location = 0) in vec3 aPos;',
    'layout(location = 1) in vec3 aNormal;',
    'layout(location = 2) in vec3 aCor;',
    'uniform mat4 uViewProj;',
    'uniform mat4 uLuzViewProj;',
    'out vec3 vMundo; out vec3 vNormal; out vec3 vCor;',
    'out vec4 vLuzPos;',
    'void main(){',
    '  vMundo = aPos; vNormal = aNormal; vCor = aCor;',
    '  vLuzPos = uLuzViewProj * vec4(aPos + aNormal * 0.35, 1.0);',
    '  gl_Position = uViewProj * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  var FS_TERRENO = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vMundo; in vec3 vNormal; in vec3 vCor;',
    'out vec4 corSaida;',
    'uniform float uBloco, uMeiaRua, uCalcada, uRaioCidade;',
    'uniform float uPassoPoste, uLadoPoste;',
    GLSL_COMUM,
    GLSL_SOMBRA,

    'float grade(float v, float per){ return abs(mod(v + per * 0.5, per) - per * 0.5); }',

    'void main(){',
    '  vec3 P = vMundo;',
    '  float dx = grade(P.x, uBloco);',
    '  float dz = grade(P.z, uBloco);',
    '  float d  = min(dx, dz);',
    '  float cidade = 1.0 - smoothstep(uRaioCidade, uRaioCidade + 58.0, max(abs(P.x), abs(P.z)));',

    '  float rua = (1.0 - smoothstep(uMeiaRua - 0.45, uMeiaRua + 0.25, d)) * cidade;',
    '  float calc = ((1.0 - smoothstep(uCalcada - 0.35, uCalcada + 0.25, d)) * cidade) - rua;',
    '  calc = clamp(calc, 0.0, 1.0);',

    // --- asfalto: granulado fino e faixas de pneu mais claras
    '  float grao = ruido2(P.xz * 3.1) * 0.05 + ruido2(P.xz * 13.0) * 0.03;',
    '  vec3 asfalto = vec3(0.030, 0.032, 0.038) + grao * 0.7;',

    // --- sinalizacao. longX = 1 quando esta via corre no eixo X.
    '  float longX = step(dz, dx);',
    '  float eixo   = mix(dx, dz, longX);',
    '  float aoLongo = mix(P.z, P.x, longX);',
    '  float atravez = mix(P.x, P.z, longX);',
    '  float dPerp  = mix(dz, dx, longX);',
    '  float cruz = step(dx, uMeiaRua + 0.9) * step(dz, uMeiaRua + 0.9);',

    '  float centro = (1.0 - smoothstep(0.13, 0.21, eixo)) * step(mod(aoLongo, 8.0), 4.2);',
    '  float borda  = 1.0 - smoothstep(0.10, 0.17, abs(eixo - (uMeiaRua - 0.6)));',
    '  float faixa  = step(uMeiaRua + 1.0, dPerp) * step(dPerp, uCalcada + 0.4)',
    '               * step(grade(atravez, 1.7), 0.52) * step(eixo, uMeiaRua - 0.5);',
    '  float marcas = clamp(max(max(centro, borda) * (1.0 - cruz), faixa), 0.0, 1.0);',
    '  asfalto = mix(asfalto, vec3(0.62, 0.60, 0.50), marcas * 0.85);',

    // --- calcada: concreto com juntas a cada 3 metros
    '  float junta = min(smoothstep(0.0, 0.10, grade(P.x, 3.0)), smoothstep(0.0, 0.10, grade(P.z, 3.0)));',
    '  vec3 concreto = mix(vec3(0.12, 0.12, 0.13), vec3(0.235, 0.235, 0.24), junta);',
    '  concreto += ruido2(P.xz * 6.0) * 0.035;',

    // --- meio-fio: risco claro na transicao rua/calcada
    '  float meioFio = (1.0 - smoothstep(0.0, 0.30, abs(d - uMeiaRua))) * cidade;',

    '  vec3 albedo = vCor;',
    '  albedo = mix(albedo, concreto, calc);',
    '  albedo = mix(albedo, asfalto, rua);',
    '  albedo = mix(albedo, vec3(0.42, 0.42, 0.43), meioFio * 0.8);',

    '  vec3 n = normalize(vNormal);',
    '  float sombra = fatorSombra();',
    '  float ndl = max(dot(n, uSolDir), 0.0);',
    '  vec3 luz = uSolCor * uSolForca * ndl * sombra;',
    '  luz += mix(uAmbBaixo, uAmbAlto, n.y * 0.5 + 0.5);',

    // --- postes de rua: pocas de luz calculadas, sem custo de luz real.
    //     As posicoes batem com a geometria dos postes que o JS instancia.
    '  float dzp = grade(P.z, uBloco);',
    '  float axp = grade(P.x, uPassoPoste);',
    '  float r2 = (dzp - uLadoPoste) * (dzp - uLadoPoste) + axp * axp;',
    '  float poca = (1.9 / (1.0 + r2 * 0.085)) * cidade * uNoite;',
    '  luz += vec3(1.0, 0.86, 0.60) * poca * 0.55;',

    '  vec3 cor = albedo * luz;',
    '  cor += albedo * farois(P, n);',

    // brilho especular baixo, so no asfalto molhado de luz
    '  vec3 V = normalize(uCam - P);',
    '  vec3 H = normalize(uSolDir + V);',
    '  cor += uSolCor * uSolForca * pow(max(dot(n, H), 0.0), 60.0) * rua * 0.35 * sombra;',

    '  float dist = length(uCam - P);',
    '  cor = aplicarNevoa(cor, -V, dist);',
    '  corSaida = vec4(acabamento(cor), 1.0);',
    '}'
  ].join('\n');

  // ------------------------------------------------ objetos instanciados
  var VS_INST = [
    '#version 300 es',
    'layout(location = 0) in vec3 aPos;',
    'layout(location = 1) in vec3 aNormal;',
    'layout(location = 2) in vec3 iPos;',
    'layout(location = 3) in vec3 iTam;',
    'layout(location = 4) in vec3 iCor;',
    'layout(location = 5) in vec3 iR0;',
    'layout(location = 6) in vec3 iR1;',
    'layout(location = 7) in vec3 iR2;',
    'layout(location = 8) in vec2 iTipo;',
    'uniform mat4 uViewProj;',
    'uniform mat4 uLuzViewProj;',
    'out vec3 vMundo; out vec3 vNormal; out vec3 vCor; out vec3 vLocal;',
    'flat out vec3 vNormalL;',
    'flat out vec2 vTipo;',
    'flat out vec3 vTam;',
    'out vec4 vLuzPos;',
    'void main(){',
    '  mat3 R = mat3(iR0, iR1, iR2);',
    '  vec3 local = aPos * iTam;',
    '  vec3 mundo = R * local + iPos;',
    '  vec3 n = normalize(R * (aNormal / max(iTam, vec3(0.001))));',
    '  vMundo = mundo; vNormal = n; vCor = iCor; vLocal = local;',
    '  vNormalL = aNormal; vTipo = iTipo; vTam = iTam;',
    '  vLuzPos = uLuzViewProj * vec4(mundo + n * 0.45, 1.0);',
    '  gl_Position = uViewProj * vec4(mundo, 1.0);',
    '}'
  ].join('\n');

  var FS_INST = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vMundo; in vec3 vNormal; in vec3 vCor; in vec3 vLocal;',
    'flat in vec3 vNormalL;',
    'flat in vec2 vTipo;',
    'flat in vec3 vTam;',
    'out vec4 corSaida;',
    GLSL_COMUM,
    GLSL_SOMBRA,

    'void main(){',
    '  vec3 n = normalize(vNormal);',
    '  vec3 albedo = vCor;',
    '  vec3 emissivo = vec3(0.0);',
    '  float espec = 0.0;',
    '  float tipo = vTipo.x;',

    // ---- tipo 1: predio. Janelas, lajes e uma fachada de terreo.
    '  if (tipo > 0.5 && tipo < 1.5) {',
    '    float altTotal = vTam.y;',
    '    float v = vLocal.y;',
    '    if (abs(vNormalL.y) < 0.5) {',
    '      float u = abs(vNormalL.x) > 0.5 ? vLocal.z : vLocal.x;',
    '      float lu = (u + 60.0) / 2.25;',
    '      float lv = (v - 4.4) / 3.05;',
    '      vec2 cel = vec2(fract(lu), fract(lv));',
    '      float col = floor(lu), andar = floor(lv);',
    '      float jan = step(0.13, cel.x) * step(cel.x, 0.87) * step(0.15, cel.y) * step(cel.y, 0.84);',
    '      jan *= step(4.4, v) * step(v, altTotal - 1.4);',
    // Moldura: um anel fino em volta do vidro, escuro. E o que impede a
    // fachada de virar um tabuleiro de xadrez de quadrados chapados.
    '      float fora = step(0.06, cel.x) * step(cel.x, 0.94) * step(0.08, cel.y) * step(cel.y, 0.91);',
    '      float moldura = clamp(fora * step(4.4, v) * step(v, altTotal - 1.4) - jan, 0.0, 1.0);',
    '      albedo = mix(albedo, albedo * 0.42, moldura);',
    // laje entre andares, um risco escuro por piso
    '      float laje = (1.0 - smoothstep(0.0, 0.09, cel.y)) * step(4.4, v);',
    '      albedo = mix(albedo, albedo * 0.62, laje * 0.8);',
    '      float acesa = step(0.58, hash21(vec2(col, andar) + vTipo.y * 13.7));',
    '      vec3 vidro = mix(vec3(0.018, 0.024, 0.036), uZenite * 0.52 + 0.018, 0.42);',
    '      albedo = mix(albedo, vidro, jan);',
    '      espec = jan * 0.40;',
    '      emissivo += vec3(1.0, 0.74, 0.40) * jan * acesa * uNoite * (1.55 / uExposicao);',
    // terreo: vitrine acesa a noite
    '      float terreo = step(0.8, v) * step(v, 3.9);',
    '      emissivo += vec3(1.0, 0.78, 0.48) * terreo * uNoite * (0.55 / uExposicao);',
    '      albedo = mix(albedo, albedo * 0.55 + 0.06, terreo * 0.5);',
    '      float parapeito = step(altTotal - 1.4, v);',
    '      albedo = mix(albedo, albedo * 0.70, parapeito);',
    '    } else if (vNormalL.y > 0.5) {',
    // cobertura: mais escura e um pouco suja
    '      albedo = albedo * 0.80 + ruido2(vMundo.xz * 0.6) * 0.07;',
    '    }',
    // oclusao de contato falsa: escurece a base do predio. Isso vale mesmo
    // com o shadow map ligado, porque ancora o volume no chao de perto.
    '    albedo *= mix(0.45, 1.0, smoothstep(0.0, 7.0, vLocal.y));',
    '  }',

    // ---- tipo 2: emissivo puro (lampada, farol, lanterna)
    '  else if (tipo > 1.5 && tipo < 2.5) {',
    '    emissivo = vCor * (0.35 + uNoite * 3.2 / uExposicao) * vTipo.y;',
    '    albedo = vCor * 0.4;',
    '  }',

    // ---- tipo 3: folhagem. Variacao por posicao e translucidez fake.
    '  else if (tipo > 2.5) {',
    '    float var1 = ruido2(vMundo.xz * 0.55 + vMundo.y * 0.3);',
    '    albedo *= 0.75 + var1 * 0.5;',
    '  }',

    // ---- tipo 0: liso (carroceria, postes, calcadas soltas)
    '  else { espec = 0.28; }',

    '  float sombra = fatorSombra();',
    '  float ndl = max(dot(n, uSolDir), 0.0);',
    '  vec3 luz = uSolCor * uSolForca * ndl * sombra;',
    '  luz += mix(uAmbBaixo, uAmbAlto, n.y * 0.5 + 0.5);',
    '  vec3 cor = albedo * luz + emissivo;',
    '  cor += albedo * farois(vMundo, n);',

    '  vec3 V = normalize(uCam - vMundo);',
    '  vec3 H = normalize(uSolDir + V);',
    '  cor += uSolCor * uSolForca * pow(max(dot(n, H), 0.0), 64.0) * espec * sombra;',
    // Reflexo do ceu nas superficies lisas: barato e faz muita diferenca,
    // mas so de raspao. Com peso alto ele lavava a cor das faces na sombra,
    // e um carro vermelho virava um carro azul-claro.
    '  float fresnel = pow(1.0 - max(dot(n, V), 0.0), 5.0);',
    '  cor += corCeu(reflect(-V, n)) * fresnel * (espec * 0.22 + 0.02);',

    '  float dist = length(uCam - vMundo);',
    '  cor = aplicarNevoa(cor, -V, dist);',
    '  corSaida = vec4(acabamento(cor), 1.0);',
    '}'
  ].join('\n');

  // ------------------------------------------------ passes de profundidade
  var VS_SOMBRA_TERRENO = [
    '#version 300 es',
    'layout(location = 0) in vec3 aPos;',
    'uniform mat4 uLuzViewProj;',
    'void main(){ gl_Position = uLuzViewProj * vec4(aPos, 1.0); }'
  ].join('\n');

  var VS_SOMBRA_INST = [
    '#version 300 es',
    'layout(location = 0) in vec3 aPos;',
    'layout(location = 2) in vec3 iPos;',
    'layout(location = 3) in vec3 iTam;',
    'layout(location = 5) in vec3 iR0;',
    'layout(location = 6) in vec3 iR1;',
    'layout(location = 7) in vec3 iR2;',
    'uniform mat4 uLuzViewProj;',
    'void main(){',
    '  mat3 R = mat3(iR0, iR1, iR2);',
    '  gl_Position = uLuzViewProj * vec4(R * (aPos * iTam) + iPos, 1.0);',
    '}'
  ].join('\n');

  var FS_VAZIO = [
    '#version 300 es',
    'precision mediump float;',
    'void main(){}'
  ].join('\n');

  // ======================================================================
  // 5. Utilidades WebGL
  // ======================================================================

  function compilar(gl, tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Falha ao compilar shader: ' + log);
    }
    return s;
  }

  function programa(gl, vs, fs) {
    var p = gl.createProgram();
    var a = compilar(gl, gl.VERTEX_SHADER, vs);
    var b = compilar(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a); gl.attachShader(p, b);
    gl.linkProgram(p);
    gl.deleteShader(a); gl.deleteShader(b);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error('Falha ao ligar programa: ' + log);
    }
    // Cache das localizacoes: procurar uniform por nome a cada frame e caro.
    p.u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      var nome = info.name.replace(/\[0\]$/, '');
      p.u[nome] = gl.getUniformLocation(p, nome);
    }
    return p;
  }

  // ======================================================================
  // 6. Geometrias
  // ======================================================================

  /** Caixa unitaria: x e z em [-0.5, 0.5], y em [0, 1].
      Y comecando no zero deixa `iPos` ser o ponto de apoio no chao. */
  function geoCaixa() {
    var pos = [], nor = [], idx = [];
    var faces = [
      [[0.5, 0, -0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [1, 0, 0]],
      [[-0.5, 0, 0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [-0.5, 1, 0.5], [-1, 0, 0]],
      [[-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5], [0, 1, 0]],
      [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5], [0, -1, 0]],
      [[-0.5, 0, 0.5], [-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 0, 0.5], [0, 0, 1]],
      [[0.5, 0, -0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5], [-0.5, 0, -0.5], [0, 0, -1]]
    ];
    for (var f = 0; f < faces.length; f++) {
      var face = faces[f], n = face[4], base = pos.length / 3;
      for (var v = 0; v < 4; v++) {
        pos.push(face[v][0], face[v][1], face[v][2]);
        nor.push(n[0], n[1], n[2]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
  }

  /** Esfera de poucos poligonos para a copa das arvores.
      Centro na origem, raio 0.5, medindo 1 unidade em cada eixo. */
  function geoEsfera(segs, aneis) {
    var pos = [], nor = [], idx = [];
    for (var y = 0; y <= aneis; y++) {
      var v = y / aneis, phi = v * Math.PI;
      for (var x = 0; x <= segs; x++) {
        var u = x / segs, theta = u * Math.PI * 2;
        var px = Math.sin(phi) * Math.cos(theta);
        var py = Math.cos(phi);
        var pz = Math.sin(phi) * Math.sin(theta);
        pos.push(px * 0.5, py * 0.5, pz * 0.5);
        nor.push(px, py, pz);
      }
    }
    for (var j = 0; j < aneis; j++) {
      for (var i = 0; i < segs; i++) {
        var a = j * (segs + 1) + i, b = a + segs + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
  }

  // ======================================================================
  // 7. Geracao da cidade
  //    Tudo aqui roda uma vez, com a seed fixa: o mundo e sempre o mesmo.
  // ======================================================================

  var CORES_PREDIO = [
    [0.44, 0.42, 0.39], [0.33, 0.32, 0.34], [0.30, 0.20, 0.16],
    [0.40, 0.34, 0.27], [0.20, 0.24, 0.30], [0.50, 0.47, 0.42],
    [0.17, 0.19, 0.23], [0.38, 0.27, 0.22], [0.22, 0.29, 0.31],
    [0.46, 0.36, 0.30], [0.26, 0.26, 0.28], [0.35, 0.38, 0.36]
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function gerarCidade() {
    var rnd = mulberry32(SEMENTE);
    var predios = [];   // {x, z, lx, lz, alt, cor, semente}
    var arvores = [];   // {x, z, escala}
    var postes = [];    // {x, z}
    var blocos = [];    // {cx, cz, parque}

    var lim = Math.floor(RAIO_CIDADE / BLOCO);
    var util = BLOCO - CALCADA * 2;   // area util do quarteirao, sem calcada

    for (var bi = -lim; bi <= lim; bi++) {
      for (var bj = -lim; bj <= lim; bj++) {
        var cx = bi * BLOCO + BLOCO * 0.5;
        var cz = bj * BLOCO + BLOCO * 0.5;
        if (Math.max(Math.abs(cx), Math.abs(cz)) > RAIO_CIDADE) continue;

        var dCentro = Math.sqrt(cx * cx + cz * cz);
        var parque = rnd() < 0.11 && dCentro > 55;
        blocos.push({ cx: cx, cz: cz, parque: parque });

        if (parque) {
          // Praca: arvores espalhadas e nada de predio.
          var n = 7 + Math.floor(rnd() * 6);
          for (var t = 0; t < n; t++) {
            arvores.push({
              x: cx + (rnd() - 0.5) * util,
              z: cz + (rnd() - 0.5) * util,
              escala: 0.85 + rnd() * 0.7
            });
          }
          continue;
        }

        // Formato do quarteirao. Predios largos leem muito melhor que
        // torres finas: com fachada estreita a grade de janelas do shader
        // fica enorme e o predio inteiro parece um brinquedo. Por isso o
        // quarteirao sorteia entre uma torre so, dois blocos ou uma vila
        // de quatro casas baixas, em vez de dividir sempre em quatro.
        var fatorCentro = 1 - clamp(dCentro / RAIO_CIDADE, 0, 1);
        var sorteio = rnd();
        var lotes;
        if (sorteio < 0.34) {
          lotes = [[0, 0, 0.88, 0.88]];
        } else if (sorteio < 0.72) {
          lotes = rnd() < 0.5
            ? [[0, -0.245, 0.90, 0.45], [0, 0.245, 0.90, 0.45]]
            : [[-0.245, 0, 0.45, 0.90], [0.245, 0, 0.45, 0.90]];
        } else {
          lotes = [[-0.25, -0.25, 0.45, 0.45], [0.25, -0.25, 0.45, 0.45],
                   [-0.25, 0.25, 0.45, 0.45], [0.25, 0.25, 0.45, 0.45]];
        }

        for (var l = 0; l < lotes.length; l++) {
          if (lotes.length > 1 && rnd() < 0.12) continue;  // um terreno baldio
          var lt = lotes[l];
          var alt = 8 + rnd() * 9;
          // A torre unica sobe muito mais do que a vila de quatro casas.
          var ganho = lotes.length === 1 ? 1 : (lotes.length === 2 ? 0.7 : 0.32);
          alt += Math.pow(fatorCentro, 1.9) * (14 + rnd() * 50) * ganho;
          if (rnd() < 0.05) alt *= 1.4;    // uma torre solta aqui e ali
          var cor = CORES_PREDIO[Math.floor(rnd() * CORES_PREDIO.length)];
          // No centro, mais vidro azulado; na periferia, mais concreto.
          if (fatorCentro > 0.5 && rnd() < 0.5) cor = [0.17, 0.22, 0.29];
          predios.push({
            x: cx + lt[0] * util,
            z: cz + lt[1] * util,
            lx: util * lt[2] * (0.86 + rnd() * 0.14),
            lz: util * lt[3] * (0.86 + rnd() * 0.14),
            alt: alt, cor: cor, semente: rnd() * 100
          });
        }

        // Arvores na faixa de grama entre a calcada e o lote. O recuo
        // e medido a partir do centro da rua para nao plantar no asfalto.
        var recuo = BLOCO * 0.5 - (CALCADA + 1.4);
        for (var a = 0; a < 4; a++) {
          if (rnd() < 0.42) continue;
          var aoLongo = (rnd() - 0.5) * (BLOCO * 0.45);
          if (a < 2) {
            arvores.push({ x: cx + aoLongo, z: cz + (a === 0 ? recuo : -recuo), escala: 0.7 + rnd() * 0.4 });
          } else {
            arvores.push({ x: cx + (a === 2 ? recuo : -recuo), z: cz + aoLongo, escala: 0.7 + rnd() * 0.4 });
          }
        }
      }
    }

    // Postes ao longo das avenidas (as ruas que correm no eixo X), dos dois
    // lados. Nas transversais nao ha poste: metade do custo, e o contraste
    // entre avenida iluminada e rua escura ficou mais interessante.
    for (var li = -lim; li <= lim; li++) {
      var linhaZ = li * BLOCO;
      if (Math.abs(linhaZ) > RAIO_CIDADE) continue;
      for (var px = -RAIO_CIDADE; px <= RAIO_CIDADE; px += PASSO_POSTE) {
        postes.push({ x: px, z: linhaZ + LADO_POSTE });
        postes.push({ x: px, z: linhaZ - LADO_POSTE });
      }
    }

    return { predios: predios, arvores: arvores, postes: postes, blocos: blocos };
  }

  // ======================================================================
  // 8. Paleta do ciclo de dia e noite
  //    Chaves por hora; o resto e interpolacao linear. As cores estao no
  //    espaco linear, antes do tonemap.
  // ======================================================================

  var PALETA = [
    { h: 0.0,  zen: [0.010, 0.016, 0.038], hor: [0.028, 0.040, 0.078], solo: [0.008, 0.011, 0.022], sol: [0.26, 0.32, 0.52], forca: 0.090, amb: 0.120, exp: 2.60 },
    { h: 4.6,  zen: [0.016, 0.026, 0.058], hor: [0.055, 0.058, 0.105], solo: [0.012, 0.016, 0.030], sol: [0.30, 0.34, 0.54], forca: 0.110, amb: 0.140, exp: 2.40 },
    { h: 6.3,  zen: [0.070, 0.135, 0.310], hor: [1.000, 0.420, 0.200], solo: [0.060, 0.048, 0.052], sol: [1.35, 0.72, 0.40], forca: 0.550, amb: 0.240, exp: 1.30 },
    { h: 8.0,  zen: [0.115, 0.290, 0.660], hor: [0.550, 0.700, 0.920], solo: [0.150, 0.160, 0.165], sol: [1.12, 1.00, 0.84], forca: 1.000, amb: 0.420, exp: 1.00 },
    { h: 12.0, zen: [0.100, 0.300, 0.780], hor: [0.550, 0.740, 0.980], solo: [0.190, 0.200, 0.205], sol: [1.06, 1.02, 0.95], forca: 1.180, amb: 0.460, exp: 0.95 },
    { h: 16.0, zen: [0.115, 0.285, 0.700], hor: [0.600, 0.730, 0.920], solo: [0.180, 0.185, 0.185], sol: [1.14, 1.02, 0.86], forca: 1.050, amb: 0.430, exp: 0.98 },
    { h: 18.3, zen: [0.078, 0.130, 0.300], hor: [1.100, 0.380, 0.170], solo: [0.070, 0.048, 0.044], sol: [1.45, 0.60, 0.30], forca: 0.520, amb: 0.220, exp: 1.30 },
    { h: 19.6, zen: [0.026, 0.040, 0.092], hor: [0.200, 0.110, 0.145], solo: [0.022, 0.020, 0.032], sol: [0.38, 0.30, 0.42], forca: 0.130, amb: 0.145, exp: 2.00 },
    { h: 21.0, zen: [0.013, 0.020, 0.046], hor: [0.045, 0.052, 0.092], solo: [0.011, 0.014, 0.026], sol: [0.26, 0.32, 0.52], forca: 0.085, amb: 0.125, exp: 2.50 },
    { h: 24.0, zen: [0.010, 0.016, 0.038], hor: [0.028, 0.040, 0.078], solo: [0.008, 0.011, 0.022], sol: [0.26, 0.32, 0.52], forca: 0.090, amb: 0.120, exp: 2.60 }
  ];

  function misturarCor(a, b, t, saida) {
    saida[0] = lerp(a[0], b[0], t);
    saida[1] = lerp(a[1], b[1], t);
    saida[2] = lerp(a[2], b[2], t);
    return saida;
  }

  function amostrarPaleta(hora, dest) {
    var h = modPos(hora, 24);
    var i = 0;
    while (i < PALETA.length - 2 && PALETA[i + 1].h <= h) i++;
    var a = PALETA[i], b = PALETA[i + 1];
    var t = clamp((h - a.h) / (b.h - a.h || 1), 0, 1);
    misturarCor(a.zen, b.zen, t, dest.zenite);
    misturarCor(a.hor, b.hor, t, dest.horizonte);
    misturarCor(a.solo, b.solo, t, dest.solo);
    misturarCor(a.sol, b.sol, t, dest.solCor);
    dest.solForca = lerp(a.forca, b.forca, t);
    dest.ambForca = lerp(a.amb, b.amb, t);
    dest.exposicao = lerp(a.exp, b.exp, t);
    return dest;
  }

  // ======================================================================
  // 9. Motor
  // ======================================================================

  function suportado() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2'));
    } catch (e) { return false; }
  }

  function criar(canvas, opcoesIniciais) {
    var gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: 'high-performance'
    });
    if (!gl) throw new Error('WebGL2 indisponivel');

    // ---------------------------------------------------------------
    // Opcoes: objeto simples, escrito de fora (pela Voodoo) e lido aqui
    // a cada frame. Nenhuma reatividade cruza essa fronteira, de proposito:
    // ler um proxy sessenta vezes por segundo seria desperdicio.
    // ---------------------------------------------------------------
    var opcoes = {
      hora: 9.6,
      autoHora: true,
      velocidadeCiclo: 0.35,   // horas por segundo real
      nevoa: 1.0,              // multiplicador da densidade
      distancia: 320,          // metros ate o plano distante
      sol: 1.0,                // multiplicador da intensidade
      qualidade: 'alta',       // baixa | media | alta
      camera: 'perseguicao',   // perseguicao | capo | cinema | aerea
      vida: true               // transito e pedestres
    };
    if (opcoesIniciais) for (var k in opcoesIniciais) {
      if (k in opcoes) opcoes[k] = opcoesIniciais[k];
    }

    var controle = { acelerar: 0, direcao: 0, freio: 0, turbo: 0 };
    var aoAtualizar = null;
    var canvasMinimapa = null;

    // ------------------------------------------------ programas e buffers
    var progCeu = programa(gl, VS_CEU, FS_CEU);
    var progTerreno = programa(gl, VS_TERRENO, FS_TERRENO);
    var progInst = programa(gl, VS_INST, FS_INST);
    var progSombraTerreno = programa(gl, VS_SOMBRA_TERRENO, FS_VAZIO);
    var progSombraInst = programa(gl, VS_SOMBRA_INST, FS_VAZIO);

    // ---- triangulo de tela cheia para o ceu
    var vaoCeu = gl.createVertexArray();
    gl.bindVertexArray(vaoCeu);
    var bufCeu = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCeu);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // ---- a cidade vem antes do terreno de proposito: a malha do chao
    //      precisa saber quais quarteiroes viraram praca para pintar o
    //      verde no lugar certo.
    var cidade = gerarCidade();

    // ---- terreno
    var terreno = construirTerreno();
    var vaoTerreno = gl.createVertexArray();
    gl.bindVertexArray(vaoTerreno);
    var bufTerrenoV = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufTerrenoV);
    gl.bufferData(gl.ARRAY_BUFFER, terreno.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
    var bufTerrenoI = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufTerrenoI);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terreno.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    // ---- geometrias instanciadas
    var caixa = geoCaixa();
    var esfera = geoEsfera(8, 6);
    var geoBoxGL = subirGeometria(caixa);
    var geoEsfGL = subirGeometria(esfera);

    // Instancias estaticas: predios, postes e troncos numa lista so; copas
    // das arvores numa segunda lista, porque usam outra geometria.
    var estaticasCaixa = montarEstaticasCaixa(cidade);
    var estaticasEsfera = montarEstaticasEsfera(cidade);

    var bufEstCaixa = criarBufferInst(estaticasCaixa.dados);
    var bufEstEsfera = criarBufferInst(estaticasEsfera.dados);

    // Instancias dinamicas: carro do jogador, transito e pedestres.
    var MAX_DIN = 420;
    var dadosDin = new Float32Array(MAX_DIN * FLOATS_INST);
    var bufDin = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufDin);
    gl.bufferData(gl.ARRAY_BUFFER, dadosDin.byteLength, gl.DYNAMIC_DRAW);

    var vaoEstCaixa = criarVaoInst(geoBoxGL, bufEstCaixa);
    var vaoEstEsfera = criarVaoInst(geoEsfGL, bufEstEsfera);
    var vaoDin = criarVaoInst(geoBoxGL, bufDin);

    // ---- shadow map: textura de profundidade + comparacao no hardware
    var TAM_SOMBRA = 2048;
    var texSombra = gl.createTexture();
    var fboSombra = gl.createFramebuffer();
    configurarSombra(TAM_SOMBRA);

    function configurarSombra(tam) {
      TAM_SOMBRA = tam;
      gl.bindTexture(gl.TEXTURE_2D, texSombra);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, tam, tam, 0,
        gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboSombra);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texSombra, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // Limpa uma vez para o caso de a qualidade baixa nunca desenhar aqui.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboSombra);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ------------------------------------------------------ helpers de GL

    function subirGeometria(g) {
      var bp = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bp);
      gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
      var bn = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bn);
      gl.bufferData(gl.ARRAY_BUFFER, g.nor, gl.STATIC_DRAW);
      var bi = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
      return { bp: bp, bn: bn, bi: bi, contagem: g.idx.length };
    }

    function criarBufferInst(dados) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
      return b;
    }

    function criarVaoInst(geo, bufInst) {
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.bp);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.bn);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufInst);
      var passo = FLOATS_INST * 4;
      var campos = [[2, 3, 0], [3, 3, 12], [4, 3, 24], [5, 3, 36], [6, 3, 48], [7, 3, 60], [8, 2, 72]];
      for (var i = 0; i < campos.length; i++) {
        var c = campos[i];
        gl.enableVertexAttribArray(c[0]);
        gl.vertexAttribPointer(c[0], c[1], gl.FLOAT, false, passo, c[2]);
        gl.vertexAttribDivisor(c[0], 1);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geo.bi);
      gl.bindVertexArray(null);
      return vao;
    }

    // ---------------------------------------------------- terreno (malha)

    function construirTerreno() {
      var n = SEG_TERRENO, passo = TAM_MUNDO / n, meio = TAM_MUNDO / 2;
      var verts = new Float32Array((n + 1) * (n + 1) * 9);
      var idx = new Uint32Array(n * n * 6);
      var nrm = [0, 0, 0];
      var p = 0;
      for (var j = 0; j <= n; j++) {
        for (var i = 0; i <= n; i++) {
          var x = -meio + i * passo;
          var z = -meio + j * passo;
          var y = altura(x, z);
          normalTerreno(x, z, nrm);

          // Cor natural do chao: grama seca, mato e terra, misturados por
          // ruido. Dentro da cidade, os quarteiroes viram um chao neutro,
          // menos as pracas, que continuam verdes.
          var v1 = ruido(x / 17, z / 17, 51);
          var v2 = ruido(x / 5.5, z / 5.5, 67);
          var g = 0.30 + v1 * 0.45;
          var r = [0.055 + g * 0.10, 0.085 + g * 0.20, 0.040 + g * 0.075];
          r[0] += v2 * 0.03; r[1] += v2 * 0.035; r[2] += v2 * 0.02;

          var naCidade = Math.max(Math.abs(x), Math.abs(z)) < RAIO_CIDADE + 20;
          if (naCidade) {
            var dRua = Math.min(distGrade(x, BLOCO), distGrade(z, BLOCO));
            if (dRua > CALCADA) {
              var parque = blocoEhParque(x, z);
              var alvo = parque
                ? [0.055 + g * 0.14, 0.115 + g * 0.26, 0.048 + g * 0.09]
                : [0.085 + v2 * 0.03, 0.084 + v2 * 0.03, 0.082 + v2 * 0.03];
              var mistura = clamp((dRua - CALCADA) / 3.0, 0, 1);
              r[0] = lerp(r[0], alvo[0], mistura);
              r[1] = lerp(r[1], alvo[1], mistura);
              r[2] = lerp(r[2], alvo[2], mistura);
            }
          }

          verts[p++] = x; verts[p++] = y; verts[p++] = z;
          verts[p++] = nrm[0]; verts[p++] = nrm[1]; verts[p++] = nrm[2];
          verts[p++] = r[0]; verts[p++] = r[1]; verts[p++] = r[2];
        }
      }
      var q = 0;
      for (var jj = 0; jj < n; jj++) {
        for (var ii = 0; ii < n; ii++) {
          var a = jj * (n + 1) + ii, b = a + n + 1;
          idx[q++] = a; idx[q++] = b; idx[q++] = a + 1;
          idx[q++] = a + 1; idx[q++] = b; idx[q++] = b + 1;
        }
      }
      return { vertices: verts, indices: idx, contagem: idx.length };
    }

    // Mapa de parques indexado por quarteirao, para o terreno pintar o chao
    // certo sem repetir o sorteio (a lista veio do gerador, e ela manda).
    var mapaParques = null;
    function blocoEhParque(x, z) {
      if (!mapaParques) {
        mapaParques = Object.create(null);
        for (var i = 0; i < cidade.blocos.length; i++) {
          var b = cidade.blocos[i];
          if (b.parque) mapaParques[Math.round(b.cx) + ':' + Math.round(b.cz)] = 1;
        }
      }
      var cx = Math.round(Math.floor(x / BLOCO) * BLOCO + BLOCO * 0.5);
      var cz = Math.round(Math.floor(z / BLOCO) * BLOCO + BLOCO * 0.5);
      return mapaParques[cx + ':' + cz] === 1;
    }

    // ------------------------------------------------ instancias estaticas

    function escreverInst(arr, i, x, y, z, sx, sy, sz, cor, guinada, arfagem, rolagem, tipo, semente) {
      var o = i * FLOATS_INST;
      arr[o] = x; arr[o + 1] = y; arr[o + 2] = z;
      arr[o + 3] = sx; arr[o + 4] = sy; arr[o + 5] = sz;
      arr[o + 6] = cor[0]; arr[o + 7] = cor[1]; arr[o + 8] = cor[2];
      rot3(arr, o + 9, guinada, arfagem, rolagem);
      arr[o + 18] = tipo; arr[o + 19] = semente;
    }

    function montarEstaticasCaixa(c) {
      var total = c.predios.length + c.postes.length * 2 + c.arvores.length;
      var arr = new Float32Array(total * FLOATS_INST);
      var i = 0;

      // Predios. A base desce alguns metros para nao flutuar nas encostas.
      for (var p = 0; p < c.predios.length; p++) {
        var b = c.predios[p];
        var base = altura(b.x, b.z) - 5;
        escreverInst(arr, i++, b.x, base, b.z, b.lx, b.alt + 5, b.lz,
          b.cor, 0, 0, 0, 1, b.semente);
      }

      // Postes: mastro fino + cabeca emissiva. As posicoes sao as mesmas
      // que o shader do terreno usa para desenhar a poca de luz.
      var corPoste = [0.16, 0.17, 0.18];
      var corLuz = [1.0, 0.84, 0.58];
      for (var q = 0; q < c.postes.length; q++) {
        var po = c.postes[q];
        var yb = altura(po.x, po.z);
        escreverInst(arr, i++, po.x, yb, po.z, 0.30, 7.4, 0.30, corPoste, 0, 0, 0, 0, 0);
        escreverInst(arr, i++, po.x, yb + 7.2, po.z, 1.1, 0.42, 0.55, corLuz, 0, 0, 0, 2, 1);
      }

      // Troncos.
      var corTronco = [0.14, 0.105, 0.075];
      for (var a = 0; a < c.arvores.length; a++) {
        var t = c.arvores[a];
        var ya = altura(t.x, t.z);
        escreverInst(arr, i++, t.x, ya - 0.4, t.z, 0.40 * t.escala, 3.6 * t.escala, 0.40 * t.escala,
          corTronco, 0, 0, 0, 0, 0);
      }
      return { dados: arr, contagem: i };
    }

    function montarEstaticasEsfera(c) {
      var arr = new Float32Array(c.arvores.length * FLOATS_INST);
      var rnd = mulberry32(SEMENTE + 7);
      for (var a = 0; a < c.arvores.length; a++) {
        var t = c.arvores[a];
        var ya = altura(t.x, t.z) + 3.1 * t.escala;
        var tom = 0.55 + rnd() * 0.5;
        var cor = [0.045 * tom, 0.135 * tom, 0.050 * tom];
        var raio = (2.1 + rnd() * 0.9) * t.escala;
        escreverInst(arr, a, t.x, ya, t.z, raio, raio * 1.25, raio, cor,
          rnd() * 6.28, 0, 0, 3, 0);
      }
      return { dados: arr, contagem: c.arvores.length };
    }

    // ---------------------------------------------------------- o jogador

    var carro = {
      x: -3.0, z: -BLOCO * 2 - BLOCO * 0.5,
      y: 0, guinada: 0,
      vel: 0, arfagem: 0, rolagem: 0
    };
    carro.y = altura(carro.x, carro.z);

    var camera = {
      olho: [carro.x, carro.y + 8, carro.z - 14],
      alvo: [carro.x, carro.y + 1.5, carro.z]
    };

    // -------------------------------------------- transito e pedestres

    var rndVida = mulberry32(SEMENTE + 99);
    var CORES_CARRO = [
      [0.60, 0.09, 0.09], [0.07, 0.16, 0.42], [0.72, 0.66, 0.14],
      [0.75, 0.75, 0.78], [0.06, 0.06, 0.07], [0.10, 0.36, 0.24],
      [0.68, 0.30, 0.06], [0.30, 0.30, 0.34]
    ];

    function novoTrafego() {
      var eixoX = rndVida() < 0.5;
      var lim = Math.floor(RAIO_CIDADE / BLOCO);
      var linha = (Math.floor(rndVida() * (lim * 2 + 1)) - lim) * BLOCO;
      var sinal = rndVida() < 0.5 ? 1 : -1;
      return {
        eixoX: eixoX,
        linha: linha,
        sinal: sinal,
        pos: (rndVida() - 0.5) * RAIO_CIDADE * 2,
        vel: 11 + rndVida() * 9,
        alvoVel: 11 + rndVida() * 9,
        cor: CORES_CARRO[Math.floor(rndVida() * CORES_CARRO.length)]
      };
    }

    var trafego = [];
    for (var it = 0; it < 26; it++) trafego.push(novoTrafego());

    function novoPedestre() {
      var eixoX = rndVida() < 0.5;
      var lim = Math.floor(RAIO_CIDADE / BLOCO);
      var linha = (Math.floor(rndVida() * (lim * 2 + 1)) - lim) * BLOCO;
      var lado = rndVida() < 0.5 ? 1 : -1;
      return {
        eixoX: eixoX, linha: linha + lado * 7.2,
        sinal: rndVida() < 0.5 ? 1 : -1,
        pos: (rndVida() - 0.5) * RAIO_CIDADE * 2,
        vel: 1.1 + rndVida() * 0.7,
        fase: rndVida() * 6.28,
        cor: [0.12 + rndVida() * 0.5, 0.12 + rndVida() * 0.4, 0.14 + rndVida() * 0.5]
      };
    }

    var pedestres = [];
    for (var ip = 0; ip < 34; ip++) pedestres.push(novoPedestre());

    // ------------------------------------------------------------ estado

    var paleta = {
      zenite: [0, 0, 0], horizonte: [0, 0, 0], solo: [0, 0, 0], solCor: [0, 0, 0],
      solForca: 1, ambForca: 0.5, exposicao: 1
    };
    var solDir = [0, 1, 0];
    var noite = 0;
    var ambAlto = [0, 0, 0], ambBaixo = [0, 0, 0];

    var mProj = mat4(), mView = mat4(), mViewProj = mat4();
    var mLuzProj = mat4(), mLuzView = mat4(), mLuzViewProj = mat4();

    var rodando = false, visivel = true, iniciado = false;
    var idFrame = 0, tempoAnterior = 0, tempoTotal = 0;
    var acumuladorFps = 0, quadrosFps = 0, fps = 60;
    var acumuladorHud = 0;
    var normalTmp = [0, 0, 0];
    var contagemDin = 0;

    // ----------------------------------------------------------- entradas

    var teclas = Object.create(null);

    function aoTeclaBaixo(e) {
      if (e.repeat) return;
      teclas[e.code] = true;
      // Setas e espaco rolariam a pagina no meio da corrida.
      if (TECLAS_JOGO[e.code] && !e.metaKey && !e.ctrlKey) e.preventDefault();
    }
    function aoTeclaCima(e) { teclas[e.code] = false; }

    var TECLAS_JOGO = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1,
      KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1
    };

    function lerTeclado() {
      var ac = 0, dir = 0;
      if (teclas.KeyW || teclas.ArrowUp) ac += 1;
      if (teclas.KeyS || teclas.ArrowDown) ac -= 1;
      if (teclas.KeyA || teclas.ArrowLeft) dir -= 1;
      if (teclas.KeyD || teclas.ArrowRight) dir += 1;
      return {
        acelerar: clamp(ac + controle.acelerar, -1, 1),
        direcao: clamp(dir + controle.direcao, -1, 1),
        freio: (teclas.Space ? 1 : 0) || controle.freio,
        turbo: (teclas.ShiftLeft || teclas.ShiftRight ? 1 : 0) || controle.turbo
      };
    }

    // ------------------------------------------------------------- fisica

    function atualizarCarro(dt) {
      var ent = lerTeclado();

      var velMax = ent.turbo ? 46 : 32;
      var aceleracao = 15 * ent.acelerar;
      if (ent.acelerar < 0 && carro.vel > 1) aceleracao = -30;  // re vira freio
      carro.vel += aceleracao * dt;
      if (ent.freio) carro.vel -= Math.sign(carro.vel) * 34 * dt;

      // Arrasto: cresce com a velocidade, entao existe uma velocidade final.
      carro.vel -= carro.vel * (0.55 + Math.abs(carro.vel) * 0.012) * dt;
      carro.vel = clamp(carro.vel, -14, velMax);
      if (Math.abs(carro.vel) < 0.05 && !ent.acelerar) carro.vel = 0;

      // Direcao proporcional a velocidade: parado nao esterca, rapido
      // esterca menos. E o suficiente para a demo parecer um carro.
      var giro = ent.direcao * 2.1 * (Math.abs(carro.vel) / (Math.abs(carro.vel) + 11));
      carro.guinada -= giro * Math.sign(carro.vel || 1) * dt;

      var fx = Math.sin(carro.guinada), fz = Math.cos(carro.guinada);
      carro.x += fx * carro.vel * dt;
      carro.z += fz * carro.vel * dt;

      var lim = TAM_MUNDO / 2 - 12;
      carro.x = clamp(carro.x, -lim, lim);
      carro.z = clamp(carro.z, -lim, lim);
      manterNaRua();
      carro.y = altura(carro.x, carro.z);

      // Inclina a carroceria seguindo o terreno.
      normalTerreno(carro.x, carro.z, normalTmp);
      var rx = -fz, rz = fx; // vetor lateral (direita) do carro
      var arf = Math.asin(clamp(-(normalTmp[0] * fx + normalTmp[2] * fz), -1, 1));
      var rol = Math.asin(clamp(-(normalTmp[0] * rx + normalTmp[2] * rz), -1, 1));
      carro.arfagem = lerp(carro.arfagem, arf, 1 - Math.exp(-9 * dt));
      carro.rolagem = lerp(carro.rolagem, rol, 1 - Math.exp(-9 * dt));
    }

    // Colisao simplificada. Nao ha teste por predio: a cidade e uma grade,
    // entao basta impedir o carro de entrar no miolo do quarteirao. Se as
    // duas distancias ate as ruas passam do limite da calcada, o carro esta
    // dentro de um lote e volta pelo eixo em que saiu menos fundo. Barato,
    // sempre certo, e nunca deixa o carro atravessar uma parede.
    function manterNaRua() {
      if (Math.max(Math.abs(carro.x), Math.abs(carro.z)) > RAIO_CIDADE + BLOCO) return;
      var limite = CALCADA - 0.8;
      var ox = modPos(carro.x + BLOCO * 0.5, BLOCO) - BLOCO * 0.5;
      var oz = modPos(carro.z + BLOCO * 0.5, BLOCO) - BLOCO * 0.5;
      var dx = Math.abs(ox), dz = Math.abs(oz);
      if (dx <= limite || dz <= limite) return;

      var correcao;
      if (dx - limite < dz - limite) {
        correcao = dx - limite;
        carro.x -= Math.sign(ox) * correcao;
      } else {
        correcao = dz - limite;
        carro.z -= Math.sign(oz) * correcao;
      }
      // Raspar custa velocidade em proporcao ao tranco: encostar de leve na
      // guia quase nao pesa, entrar de frente na quina para o carro.
      carro.vel *= 1 - clamp(correcao * 0.35, 0, 0.45);
    }

    function atualizarVida(dt) {
      if (!opcoes.vida) return;
      var lim = RAIO_CIDADE + 20;

      for (var i = 0; i < trafego.length; i++) {
        var c = trafego[i];
        c.vel += (c.alvoVel - c.vel) * (1 - Math.exp(-1.5 * dt));
        c.pos += c.vel * c.sinal * dt;
        if (Math.abs(c.pos) > lim) {
          // Some no fim da malha e volta do outro lado, em outra rua.
          var novo = novoTrafego();
          novo.pos = -Math.sign(c.pos) * lim;
          novo.sinal = -Math.sign(c.pos);
          trafego[i] = novo;
          continue;
        }
        // Nas travessias, sorteia continuar ou virar.
        var d = distGrade(c.pos, BLOCO);
        if (d < 0.9 && !c.virou) {
          c.virou = true;
          if (rndVida() < 0.22) {
            var linhaNova = Math.round(c.pos / BLOCO) * BLOCO;
            var posNova = c.linha;
            c.eixoX = !c.eixoX;
            c.sinal = rndVida() < 0.5 ? 1 : -1;
            c.linha = linhaNova;
            c.pos = posNova;
          }
        } else if (d > 3) {
          c.virou = false;
        }
      }

      for (var j = 0; j < pedestres.length; j++) {
        var p = pedestres[j];
        p.pos += p.vel * p.sinal * dt;
        if (Math.abs(p.pos) > lim) pedestres[j] = novoPedestre();
      }
    }

    // Posicao final do carro de transito, ja com a faixa da direita.
    function posTrafego(c, saida) {
      var desvio = 2.9 * c.sinal;
      if (c.eixoX) { saida[0] = c.pos; saida[2] = c.linha + desvio; }
      else { saida[0] = c.linha - desvio; saida[2] = c.pos; }
      saida[1] = altura(saida[0], saida[2]);
      return saida;
    }

    // ------------------------------------------------- montar dinamicas

    var tmpPos = [0, 0, 0];

    function montarDinamicas() {
      var i = 0;
      var forcaFarol = noite > 0.05 ? 1 : 0;

      // ---- carro do jogador
      var g = carro.guinada, ar = carro.arfagem, ro = carro.rolagem;
      var cy = Math.cos(g), sy = Math.sin(g);
      var corCarro = [0.62, 0.10, 0.10];

      function pecaCarro(dx, dy, dz, sx, sy2, sz, cor, tipo, semente) {
        // desloca no referencial do carro antes de somar a posicao
        var wx = carro.x + sy * dz + cy * dx;
        var wz = carro.z + cy * dz - sy * dx;
        escreverInst(dadosDin, i++, wx, carro.y + dy, wz, sx, sy2, sz, cor, g, ar, ro, tipo, semente);
      }

      pecaCarro(0, 0.42, 0, 2.05, 0.85, 4.45, corCarro, 0, 0);
      pecaCarro(0, 1.24, -0.15, 1.78, 0.72, 2.35, [0.06, 0.07, 0.10], 0, 0);
      pecaCarro(-0.95, 0.16, 1.45, 0.36, 0.7, 0.7, [0.04, 0.04, 0.05], 0, 0);
      pecaCarro(0.95, 0.16, 1.45, 0.36, 0.7, 0.7, [0.04, 0.04, 0.05], 0, 0);
      pecaCarro(-0.95, 0.16, -1.45, 0.36, 0.7, 0.7, [0.04, 0.04, 0.05], 0, 0);
      pecaCarro(0.95, 0.16, -1.45, 0.36, 0.7, 0.7, [0.04, 0.04, 0.05], 0, 0);
      pecaCarro(-0.66, 0.72, 2.20, 0.42, 0.26, 0.16, [1.0, 0.95, 0.82], 2, forcaFarol ? 1.6 : 0.25);
      pecaCarro(0.66, 0.72, 2.20, 0.42, 0.26, 0.16, [1.0, 0.95, 0.82], 2, forcaFarol ? 1.6 : 0.25);
      var luzFreio = (carro.vel > 0.5 && lerTeclado().acelerar < 0) || lerTeclado().freio ? 2.2 : 0.8;
      pecaCarro(-0.72, 0.70, -2.22, 0.40, 0.22, 0.14, [1.0, 0.12, 0.06], 2, luzFreio);
      pecaCarro(0.72, 0.70, -2.22, 0.40, 0.22, 0.14, [1.0, 0.12, 0.06], 2, luzFreio);

      // ---- transito
      if (opcoes.vida) {
        for (var t = 0; t < trafego.length && i < MAX_DIN - 8; t++) {
          var c = trafego[t];
          posTrafego(c, tmpPos);
          var gt = c.eixoX
            ? (c.sinal > 0 ? Math.PI * 0.5 : -Math.PI * 0.5)
            : (c.sinal > 0 ? 0 : Math.PI);
          var cyt = Math.cos(gt), syt = Math.sin(gt);
          function pecaT(dx, dy, dz, sx, sy2, sz, cor, tipo, sem) {
            var wx = tmpPos[0] + syt * dz + cyt * dx;
            var wz = tmpPos[2] + cyt * dz - syt * dx;
            escreverInst(dadosDin, i++, wx, tmpPos[1] + dy, wz, sx, sy2, sz, cor, gt, 0, 0, tipo, sem);
          }
          pecaT(0, 0.40, 0, 1.95, 0.82, 4.2, c.cor, 0, 0);
          pecaT(0, 1.18, -0.1, 1.68, 0.66, 2.2, [0.06, 0.07, 0.10], 0, 0);
          pecaT(0, 0.66, 2.08, 1.5, 0.22, 0.14, [1.0, 0.94, 0.80], 2, forcaFarol ? 1.3 : 0.2);
          pecaT(0, 0.64, -2.08, 1.5, 0.20, 0.12, [1.0, 0.14, 0.07], 2, forcaFarol ? 1.4 : 0.5);
        }

        // ---- pedestres
        for (var pi = 0; pi < pedestres.length && i < MAX_DIN - 3; pi++) {
          var p = pedestres[pi];
          var px, pz;
          if (p.eixoX) { px = p.pos; pz = p.linha; } else { px = p.linha; pz = p.pos; }
          if (Math.max(Math.abs(px), Math.abs(pz)) > RAIO_CIDADE + 10) continue;
          var py = altura(px, pz);
          var balanco = Math.sin(tempoTotal * 7 + p.fase) * 0.055;
          var gp = p.eixoX ? (p.sinal > 0 ? Math.PI * 0.5 : -Math.PI * 0.5)
                           : (p.sinal > 0 ? 0 : Math.PI);
          escreverInst(dadosDin, i++, px, py + balanco, pz, 0.46, 1.28, 0.30, p.cor, gp, 0, 0, 0, 0);
          escreverInst(dadosDin, i++, px, py + 1.28 + balanco, pz, 0.32, 0.32, 0.30,
            [0.42, 0.31, 0.24], gp, 0, 0, 0, 0);
        }
      }

      contagemDin = i;
      gl.bindBuffer(gl.ARRAY_BUFFER, bufDin);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dadosDin, 0, i * FLOATS_INST);
    }

    // ------------------------------------------------------------ camera

    function atualizarCamera(dt) {
      var fx = Math.sin(carro.guinada), fz = Math.cos(carro.guinada);
      var alvoOlho, alvoMira, suavidade;

      if (opcoes.camera === 'capo') {
        alvoOlho = [carro.x + fx * 0.9, carro.y + 1.55, carro.z + fz * 0.9];
        alvoMira = [carro.x + fx * 40, carro.y + 2.4, carro.z + fz * 40];
        suavidade = 22;
      } else if (opcoes.camera === 'aerea') {
        alvoOlho = [carro.x - fx * 14, carro.y + 52, carro.z - fz * 14];
        alvoMira = [carro.x, carro.y + 1, carro.z];
        suavidade = 5;
      } else if (opcoes.camera === 'cinema') {
        var a = tempoTotal * 0.22;
        alvoOlho = [carro.x + Math.cos(a) * 17, carro.y + 6.5, carro.z + Math.sin(a) * 17];
        alvoMira = [carro.x, carro.y + 1.4, carro.z];
        suavidade = 6;
      } else {
        // Perseguicao: quanto mais rapido, mais longe e mais baixa a camera.
        var recuo = 9.6 + Math.abs(carro.vel) * 0.10;
        var alturaCam = 4.1 + Math.abs(carro.vel) * 0.018;
        alvoOlho = [carro.x - fx * recuo, carro.y + alturaCam, carro.z - fz * recuo];
        alvoMira = [carro.x + fx * 8, carro.y + 1.6, carro.z + fz * 8];
        suavidade = 7.5;
      }

      var k = 1 - Math.exp(-suavidade * dt);
      for (var i = 0; i < 3; i++) {
        camera.olho[i] = lerp(camera.olho[i], alvoOlho[i], k);
        camera.alvo[i] = lerp(camera.alvo[i], alvoMira[i], k);
      }
      // Nunca deixa a camera entrar no chao.
      var pisoCam = altura(camera.olho[0], camera.olho[2]) + 1.2;
      if (camera.olho[1] < pisoCam) camera.olho[1] = pisoCam;
    }

    // ------------------------------------------------------------- render

    var larguraCss = 0, alturaCss = 0;

    var tamForcado = null;

    function ajustarTamanho() {
      if (tamForcado) {
        canvas.width = tamForcado[0]; canvas.height = tamForcado[1];
        larguraCss = tamForcado[0]; alturaCss = tamForcado[1];
        return;
      }
      var dprMax = opcoes.qualidade === 'baixa' ? 1 : (opcoes.qualidade === 'media' ? 1.4 : 2);
      var dpr = Math.min(global.devicePixelRatio || 1, dprMax);
      var l = canvas.clientWidth || 1;
      var a = canvas.clientHeight || 1;
      var w = Math.max(1, Math.round(l * dpr));
      var h = Math.max(1, Math.round(a * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      larguraCss = l; alturaCss = a;
    }

    function atualizarAmbiente(dt) {
      if (opcoes.autoHora) {
        opcoes.hora = modPos(opcoes.hora + opcoes.velocidadeCiclo * dt, 24);
      }
      amostrarPaleta(opcoes.hora, paleta);

      // Sol descrevendo um arco leste-oeste, com uma leve inclinacao para
      // as sombras nunca ficarem perfeitamente alinhadas com as ruas.
      var theta = (opcoes.hora - 6) / 12 * Math.PI;
      var sx = -Math.cos(theta), sy = Math.sin(theta), sz = 0.42;
      var m = Math.sqrt(sx * sx + sy * sy + sz * sz);
      solDir[0] = sx / m; solDir[1] = sy / m; solDir[2] = sz / m;

      noite = clamp((0.10 - solDir[1]) / 0.16, 0, 1);

      // Abaixo do horizonte a luz principal passa a ser a lua: mesma
      // direcao invertida, cor fria e forca quase nula.
      if (solDir[1] < -0.02) {
        solDir[0] = -solDir[0]; solDir[1] = -solDir[1]; solDir[2] = -solDir[2];
      }

      // Ambiente hemisferico. As cores do ceu sao muito saturadas para
      // servirem de luz difusa direto: puxadas para o cinza, elas iluminam
      // sem pintar a cidade inteira de azul.
      var amb = paleta.ambForca;
      dessaturar(paleta.zenite, 0.42, 0.62 * amb, ambAlto);
      dessaturar(paleta.horizonte, 0.62, 0.24 * amb, ambBaixo);
    }

    function dessaturar(cor, quanto, escala, dest) {
      var lum = cor[0] * 0.25 + cor[1] * 0.50 + cor[2] * 0.25;
      dest[0] = lerp(cor[0], lum, quanto) * escala;
      dest[1] = lerp(cor[1], lum, quanto) * escala;
      dest[2] = lerp(cor[2], lum, quanto) * escala;
    }

    function enviarComuns(p) {
      var u = p.u;
      gl.uniform3fv(u.uZenite, paleta.zenite);
      gl.uniform3fv(u.uHorizonte, paleta.horizonte);
      gl.uniform3fv(u.uSolo, paleta.solo);
      gl.uniform3fv(u.uSolCor, paleta.solCor);
      gl.uniform3fv(u.uSolDir, solDir);
      gl.uniform1f(u.uSolForca, paleta.solForca * opcoes.sol);
      gl.uniform3fv(u.uAmbAlto, ambAlto);
      gl.uniform3fv(u.uAmbBaixo, ambBaixo);
      gl.uniform1f(u.uNoite, noite);
      // Densidade ajustada a distancia de visao: a nevoa sempre fecha o
      // mundo pouco antes do plano distante, em qualquer configuracao.
      // A raiz cubica compensa o expoente 3 da curva, entao o slider
      // continua sendo linear para quem mexe nele.
      gl.uniform1f(u.uNevoa, (1 / (opcoes.distancia * 0.82)) * Math.cbrt(opcoes.nevoa));
      gl.uniform1f(u.uExposicao, paleta.exposicao);
      gl.uniform3fv(u.uCam, camera.olho);

      var fx = Math.sin(carro.guinada), fz = Math.cos(carro.guinada);
      if (u.uFarolPos) {
        gl.uniform3f(u.uFarolPos, carro.x + fx * 2.2, carro.y + 0.85, carro.z + fz * 2.2);
        gl.uniform3f(u.uFarolDir, fx, -0.12, fz);
        gl.uniform1f(u.uFarolForca, noite * 1.1);
      }
    }

    function passeSombra() {
      var qualidadeSombra = opcoes.qualidade === 'baixa' ? 0
        : (opcoes.qualidade === 'media' ? 1024 : 2048);
      if (!qualidadeSombra) return 0;
      if (qualidadeSombra !== TAM_SOMBRA) configurarSombra(qualidadeSombra);

      var fx = Math.sin(carro.guinada), fz = Math.cos(carro.guinada);
      var alvo = [carro.x + fx * 30, carro.y + 6, carro.z + fz * 30];
      var ext = 105;
      var olho = [
        alvo[0] + solDir[0] * 200,
        alvo[1] + solDir[1] * 200,
        alvo[2] + solDir[2] * 200
      ];
      var cima = Math.abs(solDir[1]) > 0.985 ? [0, 0, 1] : [0, 1, 0];
      ortogonal(mLuzProj, -ext, ext, -ext, ext, 1, 420);
      olharPara(mLuzView, olho, alvo, cima);
      multiplicar(mLuzViewProj, mLuzProj, mLuzView);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fboSombra);
      gl.viewport(0, 0, TAM_SOMBRA, TAM_SOMBRA);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      // Descartar a face da frente reduz o acne nas paredes verticais.
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);

      gl.useProgram(progSombraTerreno);
      gl.uniformMatrix4fv(progSombraTerreno.u.uLuzViewProj, false, mLuzViewProj);
      gl.bindVertexArray(vaoTerreno);
      gl.drawElements(gl.TRIANGLES, terreno.contagem, gl.UNSIGNED_INT, 0);

      gl.useProgram(progSombraInst);
      gl.uniformMatrix4fv(progSombraInst.u.uLuzViewProj, false, mLuzViewProj);
      gl.bindVertexArray(vaoEstCaixa);
      gl.drawElementsInstanced(gl.TRIANGLES, geoBoxGL.contagem, gl.UNSIGNED_SHORT, 0, estaticasCaixa.contagem);
      gl.bindVertexArray(vaoEstEsfera);
      gl.drawElementsInstanced(gl.TRIANGLES, geoEsfGL.contagem, gl.UNSIGNED_SHORT, 0, estaticasEsfera.contagem);
      gl.bindVertexArray(vaoDin);
      gl.drawElementsInstanced(gl.TRIANGLES, geoBoxGL.contagem, gl.UNSIGNED_SHORT, 0, contagemDin);

      gl.cullFace(gl.BACK);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return 1;
    }

    function desenhar(sombraAtiva) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      var aspecto = canvas.width / canvas.height;
      var fov = 62 * Math.PI / 180;
      perspectiva(mProj, fov, aspecto, 0.35, opcoes.distancia * 1.35 + 120);
      olharPara(mView, camera.olho, camera.alvo, [0, 1, 0]);
      multiplicar(mViewProj, mProj, mView);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // ---- ceu: preenche a tela antes de tudo, sem escrever profundidade
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(progCeu);
      enviarComuns(progCeu);
      var f = [
        camera.alvo[0] - camera.olho[0],
        camera.alvo[1] - camera.olho[1],
        camera.alvo[2] - camera.olho[2]
      ];
      var mf = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]) || 1;
      f[0] /= mf; f[1] /= mf; f[2] /= mf;
      var r = [f[2], 0, -f[0]];
      var mr = Math.sqrt(r[0] * r[0] + r[2] * r[2]) || 1;
      r[0] /= mr; r[2] /= mr;
      var up = [
        r[1] * f[2] - r[2] * f[1],
        r[2] * f[0] - r[0] * f[2],
        r[0] * f[1] - r[1] * f[0]
      ];
      gl.uniform3fv(progCeu.u.uFrente, f);
      gl.uniform3fv(progCeu.u.uDireita, r);
      gl.uniform3fv(progCeu.u.uCima, up);
      gl.uniform1f(progCeu.u.uTanMeioFov, Math.tan(fov / 2));
      gl.uniform1f(progCeu.u.uAspecto, aspecto);
      gl.uniform1f(progCeu.u.uTempo, tempoTotal);
      gl.bindVertexArray(vaoCeu);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);

      // ---- terreno
      gl.useProgram(progTerreno);
      enviarComuns(progTerreno);
      gl.uniformMatrix4fv(progTerreno.u.uViewProj, false, mViewProj);
      gl.uniformMatrix4fv(progTerreno.u.uLuzViewProj, false, mLuzViewProj);
      gl.uniform1f(progTerreno.u.uBloco, BLOCO);
      gl.uniform1f(progTerreno.u.uMeiaRua, MEIA_RUA);
      gl.uniform1f(progTerreno.u.uCalcada, CALCADA);
      gl.uniform1f(progTerreno.u.uRaioCidade, RAIO_CIDADE);
      gl.uniform1f(progTerreno.u.uPassoPoste, PASSO_POSTE);
      gl.uniform1f(progTerreno.u.uLadoPoste, LADO_POSTE);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSombra);
      gl.uniform1i(progTerreno.u.uSombra, 0);
      gl.uniform1f(progTerreno.u.uSombraAtiva, sombraAtiva);
      gl.uniform1f(progTerreno.u.uSombraTexel, 1 / TAM_SOMBRA);
      gl.bindVertexArray(vaoTerreno);
      gl.drawElements(gl.TRIANGLES, terreno.contagem, gl.UNSIGNED_INT, 0);

      // ---- objetos: tres chamadas de desenho para a cidade inteira
      gl.useProgram(progInst);
      enviarComuns(progInst);
      gl.uniformMatrix4fv(progInst.u.uViewProj, false, mViewProj);
      gl.uniformMatrix4fv(progInst.u.uLuzViewProj, false, mLuzViewProj);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSombra);
      gl.uniform1i(progInst.u.uSombra, 0);
      gl.uniform1f(progInst.u.uSombraAtiva, sombraAtiva);
      gl.uniform1f(progInst.u.uSombraTexel, 1 / TAM_SOMBRA);

      gl.bindVertexArray(vaoEstCaixa);
      gl.drawElementsInstanced(gl.TRIANGLES, geoBoxGL.contagem, gl.UNSIGNED_SHORT, 0, estaticasCaixa.contagem);
      gl.bindVertexArray(vaoEstEsfera);
      gl.drawElementsInstanced(gl.TRIANGLES, geoEsfGL.contagem, gl.UNSIGNED_SHORT, 0, estaticasEsfera.contagem);
      gl.bindVertexArray(vaoDin);
      gl.drawElementsInstanced(gl.TRIANGLES, geoBoxGL.contagem, gl.UNSIGNED_SHORT, 0, contagemDin);

      gl.bindVertexArray(null);
    }

    // ---------------------------------------------------------- minimapa
    // Desenhado em canvas 2D. O fundo estatico e pintado uma unica vez num
    // canvas fora da tela; a cada frame so vao os pontos que se mexem.

    var fundoMinimapa = null;
    var ESCALA_MAPA = 0.62;  // pixels por metro
    var mmAcum = 0;

    function prepararFundo(tam) {
      var off = document.createElement('canvas');
      off.width = tam; off.height = tam;
      var c = off.getContext('2d');
      var meio = tam / 2;
      c.fillStyle = '#0a0f16';
      c.fillRect(0, 0, tam, tam);

      // quarteiroes
      for (var i = 0; i < cidade.blocos.length; i++) {
        var b = cidade.blocos[i];
        c.fillStyle = b.parque ? '#152a1c' : '#161c26';
        c.fillRect(meio + (b.cx - BLOCO / 2 + CALCADA) * ESCALA_MAPA,
          meio + (b.cz - BLOCO / 2 + CALCADA) * ESCALA_MAPA,
          (BLOCO - CALCADA * 2) * ESCALA_MAPA, (BLOCO - CALCADA * 2) * ESCALA_MAPA);
      }
      // ruas
      c.strokeStyle = '#2b3444';
      c.lineWidth = MEIA_RUA * 2 * ESCALA_MAPA;
      var lim = Math.floor(RAIO_CIDADE / BLOCO);
      for (var k = -lim; k <= lim; k++) {
        var v = meio + k * BLOCO * ESCALA_MAPA;
        var a = meio - RAIO_CIDADE * ESCALA_MAPA;
        var z = meio + RAIO_CIDADE * ESCALA_MAPA;
        c.beginPath(); c.moveTo(v, a); c.lineTo(v, z); c.stroke();
        c.beginPath(); c.moveTo(a, v); c.lineTo(z, v); c.stroke();
      }
      // predios
      c.fillStyle = 'rgba(150,170,200,0.30)';
      for (var p = 0; p < cidade.predios.length; p++) {
        var e = cidade.predios[p];
        c.fillRect(meio + (e.x - e.lx / 2) * ESCALA_MAPA, meio + (e.z - e.lz / 2) * ESCALA_MAPA,
          e.lx * ESCALA_MAPA, e.lz * ESCALA_MAPA);
      }
      return off;
    }

    function desenharMinimapa() {
      if (!canvasMinimapa) return;
      var tam = canvasMinimapa.width;
      var ctx = canvasMinimapa.getContext('2d');
      if (!fundoMinimapa || fundoMinimapa.width !== Math.round(TAM_MUNDO * ESCALA_MAPA)) {
        fundoMinimapa = prepararFundo(Math.round(TAM_MUNDO * ESCALA_MAPA));
      }
      var zoom = 1.9;
      var meioF = fundoMinimapa.width / 2;
      var px = meioF + carro.x * ESCALA_MAPA;
      var pz = meioF + carro.z * ESCALA_MAPA;
      var raio = tam / (2 * zoom);

      ctx.save();
      ctx.clearRect(0, 0, tam, tam);
      ctx.beginPath();
      ctx.arc(tam / 2, tam / 2, tam / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, tam, tam);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fundoMinimapa, px - raio, pz - raio, raio * 2, raio * 2, 0, 0, tam, tam);

      // transito
      if (opcoes.vida) {
        ctx.fillStyle = '#ffcf6b';
        for (var i = 0; i < trafego.length; i++) {
          posTrafego(trafego[i], tmpPos);
          var tx = (tmpPos[0] * ESCALA_MAPA + meioF - px) * zoom + tam / 2;
          var tz = (tmpPos[2] * ESCALA_MAPA + meioF - pz) * zoom + tam / 2;
          ctx.fillRect(tx - 1.6, tz - 1.6, 3.2, 3.2);
        }
      }

      // seta do jogador, apontando para onde o carro olha
      ctx.translate(tam / 2, tam / 2);
      ctx.rotate(-carro.guinada);
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3.4); ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fillStyle = '#7B52F7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // -------------------------------------------------------------- laco

    function quadro(agora) {
      if (!rodando) return;
      idFrame = global.requestAnimationFrame(quadro);

      var dt = tempoAnterior ? (agora - tempoAnterior) / 1000 : 0.016;
      tempoAnterior = agora;
      // Um pico de lentidao nao pode teletransportar o carro.
      dt = Math.min(dt, 0.05);
      tempoTotal += dt;

      ajustarTamanho();
      atualizarAmbiente(dt);
      atualizarCarro(dt);
      atualizarVida(dt);
      atualizarCamera(dt);
      montarDinamicas();

      var sombra = passeSombra();
      desenhar(sombra);

      // ---- medicao de FPS e envio para a interface
      quadrosFps++;
      acumuladorFps += dt;
      if (acumuladorFps >= 0.5) {
        fps = quadrosFps / acumuladorFps;
        quadrosFps = 0; acumuladorFps = 0;
      }

      mmAcum += dt;
      if (mmAcum > 0.05) { mmAcum = 0; desenharMinimapa(); }

      acumuladorHud += dt;
      if (acumuladorHud >= 0.1 && aoAtualizar) {
        acumuladorHud = 0;
        aoAtualizar({
          fps: Math.round(fps),
          velocidade: Math.abs(carro.vel) * 3.6,
          hora: opcoes.hora,
          noite: noite,
          x: carro.x, z: carro.z,
          instancias: estaticasCaixa.contagem + estaticasEsfera.contagem + contagemDin
        });
      }
    }

    // ------------------------------------------------------------ eventos

    function aoVisibilidade() {
      visivel = document.visibilityState === 'visible';
      if (!visivel) pausar(); else if (iniciado) retomar();
    }

    function aoPerderFoco() { teclas = Object.create(null); }

    function aoPerderContexto(e) {
      e.preventDefault();
      pausar();
    }

    document.addEventListener('keydown', aoTeclaBaixo);
    document.addEventListener('keyup', aoTeclaCima);
    document.addEventListener('visibilitychange', aoVisibilidade);
    global.addEventListener('blur', aoPerderFoco);
    canvas.addEventListener('webglcontextlost', aoPerderContexto);

    // ------------------------------------------------------- estado inicial

    gl.clearColor(0.02, 0.03, 0.05, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    ajustarTamanho();
    atualizarAmbiente(0);
    montarDinamicas();

    function pausar() {
      rodando = false;
      if (idFrame) { global.cancelAnimationFrame(idFrame); idFrame = 0; }
      tempoAnterior = 0;
    }

    function retomar() {
      if (rodando || !visivel) return;
      rodando = true;
      tempoAnterior = 0;
      idFrame = global.requestAnimationFrame(quadro);
    }

    function iniciar() {
      iniciado = true;
      retomar();
    }

    /** Um unico quadro, para a tela inicial ficar bonita antes de comecar. */
    function quadroUnico() {
      ajustarTamanho();
      atualizarAmbiente(0);
      atualizarCamera(1);
      montarDinamicas();
      desenhar(passeSombra());
      desenharMinimapa();
    }

    function destruir() {
      pausar();
      document.removeEventListener('keydown', aoTeclaBaixo);
      document.removeEventListener('keyup', aoTeclaCima);
      document.removeEventListener('visibilitychange', aoVisibilidade);
      global.removeEventListener('blur', aoPerderFoco);
      canvas.removeEventListener('webglcontextlost', aoPerderContexto);
      [progCeu, progTerreno, progInst, progSombraTerreno, progSombraInst]
        .forEach(function (p) { gl.deleteProgram(p); });
      [bufCeu, bufTerrenoV, bufTerrenoI, bufEstCaixa, bufEstEsfera, bufDin,
        geoBoxGL.bp, geoBoxGL.bn, geoBoxGL.bi, geoEsfGL.bp, geoEsfGL.bn, geoEsfGL.bi]
        .forEach(function (b) { gl.deleteBuffer(b); });
      [vaoCeu, vaoTerreno, vaoEstCaixa, vaoEstEsfera, vaoDin]
        .forEach(function (v) { gl.deleteVertexArray(v); });
      gl.deleteTexture(texSombra);
      gl.deleteFramebuffer(fboSombra);
      var perda = gl.getExtension('WEBGL_lose_context');
      if (perda) perda.loseContext();
    }

    function reposicionar() {
      carro.x = -3.0;
      carro.z = -BLOCO * 2 - BLOCO * 0.5;
      carro.guinada = 0;
      carro.vel = 0;
      carro.y = altura(carro.x, carro.z);
    }

    global.__depuraMundo = {
      gl: gl,
      estadoFbo: function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboSombra);
        var st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { status: st, completo: st === gl.FRAMEBUFFER_COMPLETE, erro: gl.getError(), tam: TAM_SOMBRA };
      },
      luz: function () { return { solDir: solDir.slice(), noite: noite, m: Array.from(mLuzViewProj) }; },
      forcarTamanho: function (w, h) { tamForcado = w ? [w, h] : null; },
      umQuadro: function (dt) {
        tempoTotal += dt;
        ajustarTamanho();
        atualizarAmbiente(dt); atualizarCarro(dt); atualizarVida(dt); atualizarCamera(dt);
        montarDinamicas();
        desenhar(passeSombra());
      },
      passo: function (n, dt) {
        dt = dt || 1 / 60;
        for (var i = 0; i < n; i++) global.__depuraMundo.umQuadro(dt);
        desenharMinimapa();
        var jogo = { fps: 0, velocidade: Math.abs(carro.vel) * 3.6, hora: opcoes.hora, noite: noite,
          x: carro.x, z: carro.z, instancias: estaticasCaixa.contagem + estaticasEsfera.contagem + contagemDin };
        if (aoAtualizar) aoAtualizar(jogo);
        return { x: carro.x, z: carro.z, guinada: carro.guinada, vel: carro.vel,
          camera: camera.olho.slice(), hora: opcoes.hora };
      },
      medir: function (n) {
        n = n || 200;
        // gl.finish() nao sincroniza de verdade no Chrome: os comandos vao
        // para o processo da GPU e voltam antes de terem sido executados.
        // Ler um pixel forca a espera real pelo fim do trabalho enfileirado.
        var pix = new Uint8Array(4);
        var drenar = function () { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix); };
        for (var a = 0; a < 30; a++) global.__depuraMundo.umQuadro(1 / 60);
        drenar();
        var t0 = performance.now();
        for (var i = 0; i < n; i++) global.__depuraMundo.umQuadro(1 / 60);
        drenar();
        var ms = (performance.now() - t0) / n;
        return { msPorQuadro: +ms.toFixed(3), fps: Math.round(1000 / ms),
          resolucao: canvas.width + 'x' + canvas.height, qualidade: opcoes.qualidade,
          instancias: estaticasCaixa.contagem + estaticasEsfera.contagem + contagemDin };
      }
    };

    return {
      opcoes: opcoes,
      controle: controle,
      iniciar: iniciar,
      pausar: pausar,
      retomar: retomar,
      quadroUnico: quadroUnico,
      destruir: destruir,
      reposicionar: reposicionar,
      definirMinimapa: function (el) { canvasMinimapa = el; },
      aoAtualizar: function (fn) { aoAtualizar = fn; },
      get rodando() { return rodando; },
      estatisticas: function () {
        return {
          predios: cidade.predios.length,
          arvores: cidade.arvores.length,
          postes: cidade.postes.length,
          instancias: estaticasCaixa.contagem + estaticasEsfera.contagem + contagemDin,
          triangulosTerreno: terreno.contagem / 3,
          renderizador: (function () {
            var d = gl.getExtension('WEBGL_debug_renderer_info');
            return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'WebGL2';
          })()
        };
      }
    };
  }

  global.MundoAberto = { criar: criar, suportado: suportado };

})(window);
