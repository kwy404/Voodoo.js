/**
 * Translations for the landing page, in the four languages the site ships.
 *
 * English is the default and the fallback. Browser detection is deliberately
 * off: the project decided the site opens in English for everyone, and the
 * picker in the header is how you leave it. The choice is persisted, so it only
 * has to be made once.
 *
 * The previous dictionary was 155 KB for fourteen sections, and 179 of its 398
 * Portuguese strings had lost their diacritics. This one covers the rebuilt
 * page, and the accents are written.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.V) return;

  var messages = {
    en: {
      nav: {
        start: 'Get started',
        why: 'Why',
        compare: 'Comparison',
        docs: 'Docs',
        playground: 'Playground',
        components: 'Components',
        examples: 'Examples',
        github: 'GitHub',
        search: 'Search',
        searchAria: 'Search, Ctrl plus K',
        language: 'Language',
        theme: 'Toggle dark mode',
        menu: 'Menu',
        skip: 'Skip to content',
      },
      hero: {
        titleA: 'The framework that',
        titleB: 'stays in your HTML',
        lead:
          'Reactivity, components, HTTP, forms and a UI kit, written as attributes on the markup ' +
          'you already have. One script tag. No build step, no configuration, no dependencies at runtime.',
        ctaStart: 'Get started',
        ctaExamples: 'See examples',
        copy: 'Copy',
        copied: 'Copied',
        liveHead: 'Running on this page, right now',
        double: 'double',
        clicks: 'clicks so far',
        dec: 'Decrease',
        inc: 'Increase',
        reset: 'reset',
      },
      why: {
        eyebrow: 'Why',
        title: 'Three things it does differently',
        c1t: 'Nothing to compile',
        c1d:
          'The script tag is the whole installation. No bundler, no transpiler, no config file, ' +
          'no JSX. Open the HTML file and it works, including from file://.',
        c2t: 'It cleans up after itself',
        c2d:
          'Once a directive is installed, its attribute is read into memory and removed from the ' +
          'document. What ships to the page is ordinary HTML, with no framework residue in the inspector.',
        c3t: 'No eval, anywhere',
        c3d:
          'Expressions run through a lexer, a Pratt parser and an interpreter, never eval or new ' +
          'Function. That is why it works under a strict CSP with no unsafe-eval, proven by a browser test.',
      },
      dom: {
        eyebrow: 'The DOM afterwards',
        title: 'Your markup does not become framework output',
        lead:
          "Inspect the paragraph below with your browser's dev tools. The attributes that made it " +
          'reactive are gone from the document; the binding is still live.',
        write: 'What you write',
        stays: 'What stays in the DOM',
      },
      compare: {
        eyebrow: 'Same counter',
        title: 'The same feature, four ways',
        lead:
          'A counter with two buttons, a derived value and a screen that keeps up. The result is ' +
          'identical in all four. What changes is how much you write, and how much you install before you start.',
        lines: 'lines',
        builds: 'build steps',
        deps: 'dependencies',
        dep: 'dependency',
        byHand: 'every update wired by hand',
        stillByHand: 'still re-renders by hand',
        mount: 'a mount call, and an app root',
        closer:
          'Voodoo did not invent reactivity. It put reactivity back inside the HTML without ' +
          'charging a build step for it.',
      },
      bench: {
        eyebrow: 'Measured',
        title: 'How it performs against the others',
        lead:
          'Seven implementations of the same 1,000-row list, all bundled production and minified, ' +
          'run back to back in one process against the same document. Median of 30 samples, in ' +
          "milliseconds, lower is better. After each run every framework's DOM is compared with the " +
          'hand-written baseline, so anything producing different output is excluded rather than ' +
          'credited with a fast time.',
        framework: 'Framework',
        create: 'Create 1k',
        update: 'Update 1 in 10',
        clear: 'Clear 1k',
        honest:
          'Read honestly: on create Voodoo is third of seven, behind hand-written vanilla and ' +
          'Preact. Vanilla still builds a list twice as fast as we do. The update column is the ' +
          'noisiest of the three and should be read as a range rather than a ranking. Voodoo is also ' +
          'by far the largest bundle in this table, and if size is your main constraint, Alpine and ' +
          'Preact are the honest recommendation.',
      },
      start: {
        eyebrow: 'Get started',
        title: 'Two ways in, both about a minute',
        tag: 'A script tag',
        tagText:
          'That is the entire installation. The library starts itself once the page is ready. ' +
          'Pinned to the 0.5 line, so patches arrive without an edit.',
        npmText:
          'ESM and CJS with types, plus separate entry points such as voodoojs/reactivity and ' +
          'voodoojs/http when you want only a piece.',
        docs: 'Read the docs',
        examples: 'Browse 13 examples',
        npmLink: 'View on npm',
      },
      built: {
        eyebrow: 'Dogfood',
        title: 'This site is built with Voodoo.js',
        lead:
          'Not a marketing line. The page you are reading has no build step and no framework code ' +
          'of its own. The tabs above, the counter in the hero, the language picker, the theme ' +
          'toggle, the mobile menu and the Ctrl+K palette are all directives on this HTML, running ' +
          'from the same voodoo.full.min.js the install section hands you.',
        lead2:
          'View source, or press Ctrl+K and pick "View this page\'s source". If the framework could ' +
          'not carry a real site, you would find out here first.',
        f1: 'unit tests, plus 44 in real Chromium',
        f2: 'runtime dependencies',
        f3: 'core build, gzipped',
        f4: 'build steps, here or in your project',
      },
      comp: {
        eyebrow: 'In the box',
        title: 'Twenty-nine components you do not install',
        lead:
          'They are custom elements the library defines when it starts, so writing the tag is the whole usage. Everything below is running here, on this page.',
        running: 'Running right here',
        all: 'See all 29 components',
      },
      foot: { mit: 'MIT licensed', builtWith: 'Built with Voodoo.js 0.6.1' },
    },

    'pt-BR': {
      nav: {
        start: 'Começar',
        why: 'Por quê',
        compare: 'Comparação',
        docs: 'Documentação',
        playground: 'Playground',
        components: 'Componentes',
        examples: 'Exemplos',
        github: 'GitHub',
        search: 'Buscar',
        searchAria: 'Buscar, Ctrl mais K',
        language: 'Idioma',
        theme: 'Alternar modo escuro',
        menu: 'Menu',
        skip: 'Pular para o conteúdo',
      },
      hero: {
        titleA: 'O framework que',
        titleB: 'fica no seu HTML',
        lead:
          'Reatividade, componentes, HTTP, formulários e uma biblioteca de interface, escritos como ' +
          'atributos na marcação que você já tem. Uma tag script. Sem passo de build, sem ' +
          'configuração, sem dependências em tempo de execução.',
        ctaStart: 'Começar',
        ctaExamples: 'Ver exemplos',
        copy: 'Copiar',
        copied: 'Copiado',
        liveHead: 'Rodando nesta página, agora',
        double: 'dobro',
        clicks: 'cliques até aqui',
        dec: 'Diminuir',
        inc: 'Aumentar',
        reset: 'zerar',
      },
      why: {
        eyebrow: 'Por quê',
        title: 'Três coisas que ela faz diferente',
        c1t: 'Nada para compilar',
        c1d:
          'A tag script é a instalação inteira. Sem bundler, sem transpilador, sem arquivo de ' +
          'configuração, sem JSX. Abra o arquivo HTML e funciona, inclusive por file://.',
        c2t: 'Ela limpa o que sujou',
        c2d:
          'Depois que uma directive é instalada, o atributo dela vai para a memória e sai do ' +
          'documento. O que fica na página é HTML comum, sem resíduo de framework no inspetor.',
        c3t: 'Nenhum eval, em lugar nenhum',
        c3d:
          'As expressões passam por um lexer, um parser de Pratt e um interpretador, nunca por eval ' +
          'ou new Function. É por isso que funciona sob CSP estrita sem unsafe-eval, o que um teste ' +
          'de navegador comprova.',
      },
      dom: {
        eyebrow: 'O DOM depois',
        title: 'Sua marcação não vira saída de framework',
        lead:
          'Inspecione o parágrafo abaixo com as ferramentas do navegador. Os atributos que o ' +
          'tornaram reativo sumiram do documento, e a ligação continua viva.',
        write: 'O que você escreve',
        stays: 'O que fica no DOM',
      },
      compare: {
        eyebrow: 'Mesmo contador',
        title: 'A mesma funcionalidade, de quatro jeitos',
        lead:
          'Um contador com dois botões, um valor derivado e uma tela que acompanha. O resultado é ' +
          'idêntico nos quatro. O que muda é quanto você escreve, e quanto precisa instalar antes de começar.',
        lines: 'linhas',
        builds: 'passos de build',
        deps: 'dependências',
        dep: 'dependência',
        byHand: 'cada atualização ligada à mão',
        stillByHand: 'ainda redesenha à mão',
        mount: 'uma chamada de mount, e uma raiz',
        closer:
          'A Voodoo não inventou a reatividade. Ela devolveu a reatividade para dentro do HTML sem ' +
          'cobrar um passo de build por isso.',
      },
      bench: {
        eyebrow: 'Medido',
        title: 'Como ela se sai contra as outras',
        lead:
          'Sete implementações da mesma lista de mil linhas, todas empacotadas em produção e ' +
          'minificadas, rodando em sequência no mesmo processo e no mesmo documento. Mediana de 30 ' +
          'amostras, em milissegundos, menor é melhor. Depois de cada rodada, o DOM de cada framework ' +
          'é comparado com o resultado escrito à mão, então qualquer um que produza saída diferente ' +
          'é excluído em vez de receber crédito por um tempo rápido.',
        framework: 'Framework',
        create: 'Criar 1k',
        update: 'Atualizar 1 em 10',
        clear: 'Limpar 1k',
        honest:
          'Lendo com honestidade: na criação a Voodoo é terceira de sete, atrás do vanilla escrito ' +
          'à mão e do Preact. O vanilla ainda monta uma lista duas vezes mais rápido que a gente. A ' +
          'coluna de atualização é a mais ruidosa das três e deve ser lida como faixa, não como ' +
          'classificação. A Voodoo também é de longe o maior bundle desta tabela, e se tamanho é a ' +
          'sua principal restrição, Alpine e Preact são a recomendação honesta.',
      },
      start: {
        eyebrow: 'Começar',
        title: 'Dois caminhos, ambos de mais ou menos um minuto',
        tag: 'Uma tag script',
        tagText:
          'Essa é a instalação inteira. A biblioteca começa sozinha quando a página fica pronta. ' +
          'Fixada na linha 0.5, então as correções chegam sem edição.',
        npmText:
          'ESM e CJS com tipos, além de pontos de entrada separados como voodoojs/reactivity e ' +
          'voodoojs/http quando você quer só um pedaço.',
        docs: 'Ler a documentação',
        examples: 'Ver os 13 exemplos',
        npmLink: 'Ver no npm',
      },
      built: {
        eyebrow: 'Dogfood',
        title: 'Este site é feito com Voodoo.js',
        lead:
          'Não é frase de marketing. A página que você está lendo não tem passo de build nem código ' +
          'de framework próprio. As abas acima, o contador do topo, o seletor de idioma, o botão de ' +
          'tema, o menu do celular e a paleta do Ctrl+K são todos directives neste HTML, rodando a ' +
          'partir do mesmo voodoo.full.min.js que a seção de instalação te entrega.',
        lead2:
          'Veja o código-fonte, ou aperte Ctrl+K e escolha "Ver o código desta página". Se o ' +
          'framework não aguentasse um site de verdade, você descobriria aqui primeiro.',
        f1: 'testes unitários, mais 44 no Chromium real',
        f2: 'dependências em tempo de execução',
        f3: 'build principal, com gzip',
        f4: 'passos de build, aqui ou no seu projeto',
      },
      comp: {
        eyebrow: 'Na caixa',
        title: 'Vinte e nove componentes que você não instala',
        lead:
          'São elementos personalizados que a biblioteca define ao iniciar, então escrever a tag é o uso inteiro. Tudo abaixo está rodando aqui, nesta página.',
        running: 'Rodando aqui mesmo',
        all: 'Ver os 29 componentes',
      },
      foot: { mit: 'Licença MIT', builtWith: 'Feito com Voodoo.js 0.6.1' },
    },

    es: {
      nav: {
        start: 'Empezar',
        why: 'Por qué',
        compare: 'Comparación',
        docs: 'Documentación',
        playground: 'Playground',
        components: 'Componentes',
        examples: 'Ejemplos',
        github: 'GitHub',
        search: 'Buscar',
        searchAria: 'Buscar, Ctrl más K',
        language: 'Idioma',
        theme: 'Alternar modo oscuro',
        menu: 'Menú',
        skip: 'Saltar al contenido',
      },
      hero: {
        titleA: 'El framework que',
        titleB: 'se queda en tu HTML',
        lead:
          'Reactividad, componentes, HTTP, formularios y una biblioteca de interfaz, escritos como ' +
          'atributos sobre el marcado que ya tienes. Una etiqueta script. Sin paso de compilación, ' +
          'sin configuración, sin dependencias en tiempo de ejecución.',
        ctaStart: 'Empezar',
        ctaExamples: 'Ver ejemplos',
        copy: 'Copiar',
        copied: 'Copiado',
        liveHead: 'Funcionando en esta página, ahora mismo',
        double: 'doble',
        clicks: 'clics hasta ahora',
        dec: 'Disminuir',
        inc: 'Aumentar',
        reset: 'reiniciar',
      },
      why: {
        eyebrow: 'Por qué',
        title: 'Tres cosas que hace distinto',
        c1t: 'Nada que compilar',
        c1d:
          'La etiqueta script es toda la instalación. Sin bundler, sin transpilador, sin archivo de ' +
          'configuración, sin JSX. Abre el archivo HTML y funciona, incluso desde file://.',
        c2t: 'Limpia lo que ensucia',
        c2d:
          'Una vez instalada una directiva, su atributo pasa a memoria y sale del documento. Lo que ' +
          'queda en la página es HTML común, sin residuo de framework en el inspector.',
        c3t: 'Ningún eval, en ninguna parte',
        c3d:
          'Las expresiones pasan por un lexer, un parser de Pratt y un intérprete, nunca por eval ni ' +
          'new Function. Por eso funciona bajo una CSP estricta sin unsafe-eval, y una prueba de ' +
          'navegador lo demuestra.',
      },
      dom: {
        eyebrow: 'El DOM después',
        title: 'Tu marcado no se convierte en salida de framework',
        lead:
          'Inspecciona el párrafo de abajo con las herramientas del navegador. Los atributos que lo ' +
          'hicieron reactivo ya no están en el documento, y el enlace sigue vivo.',
        write: 'Lo que escribes',
        stays: 'Lo que queda en el DOM',
      },
      compare: {
        eyebrow: 'El mismo contador',
        title: 'La misma función, de cuatro maneras',
        lead:
          'Un contador con dos botones, un valor derivado y una pantalla que se mantiene al día. El ' +
          'resultado es idéntico en los cuatro. Lo que cambia es cuánto escribes, y cuánto instalas ' +
          'antes de empezar.',
        lines: 'líneas',
        builds: 'pasos de compilación',
        deps: 'dependencias',
        dep: 'dependencia',
        byHand: 'cada actualización conectada a mano',
        stillByHand: 'sigue redibujando a mano',
        mount: 'una llamada a mount, y una raíz',
        closer:
          'Voodoo no inventó la reactividad. Devolvió la reactividad al HTML sin cobrar un paso de ' +
          'compilación por ello.',
      },
      bench: {
        eyebrow: 'Medido',
        title: 'Cómo rinde frente a los demás',
        lead:
          'Siete implementaciones de la misma lista de mil filas, todas empaquetadas en producción y ' +
          'minificadas, ejecutadas seguidas en un mismo proceso y sobre el mismo documento. Mediana ' +
          'de 30 muestras, en milisegundos, menos es mejor. Tras cada ronda, el DOM de cada framework ' +
          'se compara con el resultado escrito a mano, así que cualquiera que produzca una salida ' +
          'distinta queda excluido en vez de acreditado con un tiempo rápido.',
        framework: 'Framework',
        create: 'Crear 1k',
        update: 'Actualizar 1 de 10',
        clear: 'Limpiar 1k',
        honest:
          'Leyendo con honestidad: al crear, Voodoo es tercera de siete, por detrás del vanilla ' +
          'escrito a mano y de Preact. El vanilla todavía construye una lista el doble de rápido que ' +
          'nosotros. La columna de actualización es la más ruidosa de las tres y debe leerse como un ' +
          'rango, no como una clasificación. Voodoo es además, con diferencia, el paquete más grande ' +
          'de esta tabla, y si el tamaño es tu principal restricción, Alpine y Preact son la ' +
          'recomendación honesta.',
      },
      start: {
        eyebrow: 'Empezar',
        title: 'Dos caminos, ambos de más o menos un minuto',
        tag: 'Una etiqueta script',
        tagText:
          'Esa es toda la instalación. La biblioteca arranca sola cuando la página está lista. ' +
          'Fijada a la línea 0.5, así que los parches llegan sin editar nada.',
        npmText:
          'ESM y CJS con tipos, además de puntos de entrada separados como voodoojs/reactivity y ' +
          'voodoojs/http cuando solo quieres una parte.',
        docs: 'Leer la documentación',
        examples: 'Ver los 13 ejemplos',
        npmLink: 'Ver en npm',
      },
      built: {
        eyebrow: 'Dogfood',
        title: 'Este sitio está hecho con Voodoo.js',
        lead:
          'No es una frase de marketing. La página que estás leyendo no tiene paso de compilación ni ' +
          'código de framework propio. Las pestañas de arriba, el contador de la portada, el selector ' +
          'de idioma, el botón de tema, el menú móvil y la paleta de Ctrl+K son todos directivas ' +
          'sobre este HTML, ejecutándose desde el mismo voodoo.full.min.js que te da la sección de ' +
          'instalación.',
        lead2:
          'Mira el código fuente, o pulsa Ctrl+K y elige "Ver el código de esta página". Si el ' +
          'framework no aguantara un sitio real, te enterarías aquí primero.',
        f1: 'pruebas unitarias, más 44 en Chromium real',
        f2: 'dependencias en tiempo de ejecución',
        f3: 'build principal, con gzip',
        f4: 'pasos de compilación, aquí o en tu proyecto',
      },
      comp: {
        eyebrow: 'En la caja',
        title: 'Veintinueve componentes que no instalas',
        lead:
          'Son elementos personalizados que la biblioteca define al arrancar, así que escribir la etiqueta es todo el uso. Todo lo de abajo está funcionando aquí, en esta página.',
        running: 'Funcionando aquí mismo',
        all: 'Ver los 29 componentes',
      },
      foot: { mit: 'Licencia MIT', builtWith: 'Hecho con Voodoo.js 0.6.1' },
    },

    ko: {
      nav: {
        start: '시작하기',
        why: '왜',
        compare: '비교',
        docs: '문서',
        playground: '플레이그라운드',
        components: '컴포넌트',
        examples: '예제',
        github: 'GitHub',
        search: '검색',
        searchAria: '검색, Ctrl 더하기 K',
        language: '언어',
        theme: '다크 모드 전환',
        menu: '메뉴',
        skip: '본문으로 건너뛰기',
      },
      hero: {
        titleA: 'HTML 안에',
        titleB: '그대로 남는 프레임워크',
        lead:
          '반응성, 컴포넌트, HTTP, 폼, UI 키트를 이미 가지고 있는 마크업의 속성으로 작성합니다. ' +
          '스크립트 태그 하나면 됩니다. 빌드 단계도, 설정도, 런타임 의존성도 없습니다.',
        ctaStart: '시작하기',
        ctaExamples: '예제 보기',
        copy: '복사',
        copied: '복사됨',
        liveHead: '지금 이 페이지에서 실행 중',
        double: '두 배',
        clicks: '번 클릭함',
        dec: '감소',
        inc: '증가',
        reset: '초기화',
      },
      why: {
        eyebrow: '왜',
        title: '다르게 하는 세 가지',
        c1t: '컴파일할 것이 없습니다',
        c1d:
          '스크립트 태그가 설치의 전부입니다. 번들러도, 트랜스파일러도, 설정 파일도, JSX도 ' +
          '없습니다. HTML 파일을 열면 바로 동작하며, file:// 에서도 마찬가지입니다.',
        c2t: '스스로 뒷정리를 합니다',
        c2d:
          '디렉티브가 설치되고 나면 그 속성은 메모리로 읽히고 문서에서 제거됩니다. 페이지에 ' +
          '남는 것은 평범한 HTML이며, 검사기에 프레임워크의 흔적이 남지 않습니다.',
        c3t: '어디에도 eval이 없습니다',
        c3d:
          '표현식은 렉서, 프랫 파서, 인터프리터를 거치며 eval이나 new Function은 결코 쓰지 ' +
          '않습니다. 그래서 unsafe-eval 없는 엄격한 CSP 아래에서도 동작하며, 브라우저 테스트가 ' +
          '이를 증명합니다.',
      },
      dom: {
        eyebrow: '그 이후의 DOM',
        title: '당신의 마크업이 프레임워크 출력물이 되지 않습니다',
        lead:
          '아래 문단을 브라우저 개발자 도구로 살펴보세요. 반응형으로 만들어 준 속성들은 문서에서 ' +
          '사라졌지만, 바인딩은 여전히 살아 있습니다.',
        write: '작성하는 것',
        stays: 'DOM에 남는 것',
      },
      compare: {
        eyebrow: '같은 카운터',
        title: '같은 기능, 네 가지 방법',
        lead:
          '버튼 두 개, 파생 값 하나, 그리고 항상 최신인 화면을 가진 카운터입니다. 결과는 네 가지 ' +
          '모두 동일합니다. 달라지는 것은 얼마나 많이 쓰는가, 그리고 시작하기 전에 얼마나 많이 ' +
          '설치해야 하는가입니다.',
        lines: '줄',
        builds: '빌드 단계',
        deps: '의존성',
        dep: '의존성',
        byHand: '모든 갱신을 직접 연결',
        stillByHand: '여전히 직접 다시 그림',
        mount: 'mount 호출과 앱 루트가 필요',
        closer:
          'Voodoo가 반응성을 발명한 것은 아닙니다. 다만 빌드 단계를 대가로 요구하지 않으면서 ' +
          '반응성을 HTML 안으로 되돌려 놓았습니다.',
      },
      bench: {
        eyebrow: '측정값',
        title: '다른 프레임워크와 비교하면',
        lead:
          '동일한 1,000행 목록을 일곱 가지로 구현하고, 모두 프로덕션 번들에 최소화한 뒤 한 ' +
          '프로세스 안에서 같은 문서를 대상으로 연달아 실행했습니다. 30회 표본의 중앙값이며 ' +
          '단위는 밀리초, 낮을수록 좋습니다. 매 실행 후 각 프레임워크의 DOM을 손으로 작성한 ' +
          '기준과 비교하므로, 다른 결과를 낸 구현은 빠른 시간을 인정받는 대신 제외됩니다.',
        framework: '프레임워크',
        create: '1k 생성',
        update: '10개 중 1개 갱신',
        clear: '1k 삭제',
        honest:
          '솔직하게 읽자면, 생성에서 Voodoo는 일곱 중 세 번째로, 손으로 쓴 바닐라와 Preact보다 ' +
          '뒤에 있습니다. 바닐라는 여전히 우리보다 두 배 빠르게 목록을 만듭니다. 갱신 열은 셋 중 ' +
          '가장 잡음이 많아 순위가 아니라 범위로 읽어야 합니다. 또한 Voodoo는 이 표에서 압도적으로 ' +
          '가장 큰 번들이며, 용량이 가장 큰 제약이라면 Alpine과 Preact가 정직한 추천입니다.',
      },
      start: {
        eyebrow: '시작하기',
        title: '두 가지 방법, 둘 다 1분 남짓',
        tag: '스크립트 태그',
        tagText:
          '이것이 설치의 전부입니다. 페이지가 준비되면 라이브러리가 스스로 시작합니다. 0.5 ' +
          '라인에 고정되어 있어 패치는 수정 없이 도착합니다.',
        npmText:
          '타입이 포함된 ESM과 CJS를 제공하며, 일부만 필요할 때를 위해 voodoojs/reactivity, ' +
          'voodoojs/http 같은 별도 진입점도 있습니다.',
        docs: '문서 읽기',
        examples: '13가지 예제 보기',
        npmLink: 'npm에서 보기',
      },
      built: {
        eyebrow: '도그푸딩',
        title: '이 사이트는 Voodoo.js로 만들었습니다',
        lead:
          '마케팅 문구가 아닙니다. 지금 읽고 있는 이 페이지에는 빌드 단계도, 자체 프레임워크 ' +
          '코드도 없습니다. 위의 탭, 히어로의 카운터, 언어 선택기, 테마 전환, 모바일 메뉴, ' +
          'Ctrl+K 팔레트는 모두 이 HTML 위의 디렉티브이며, 설치 섹션이 건네주는 바로 그 ' +
          'voodoo.full.min.js에서 실행됩니다.',
        lead2:
          '소스를 보거나, Ctrl+K를 눌러 "이 페이지의 소스 보기"를 선택하세요. 프레임워크가 실제 ' +
          '사이트를 감당하지 못한다면, 여기에서 가장 먼저 드러날 것입니다.',
        f1: '개의 단위 테스트, 그리고 실제 Chromium에서 44개',
        f2: '개의 런타임 의존성',
        f3: '코어 빌드, gzip 기준',
        f4: '개의 빌드 단계, 여기서도 당신의 프로젝트에서도',
      },
      comp: {
        eyebrow: '기본 제공',
        title: '설치하지 않는 29개의 컴포넌트',
        lead:
          '라이브러리가 시작할 때 정의하는 커스텀 엘리먼트이므로, 태그를 쓰는 것이 사용의 전부입니다. 아래의 모든 것이 지금 이 페이지에서 실행되고 있습니다.',
        running: '바로 여기서 실행 중',
        all: '29개 컴포넌트 모두 보기',
      },
      foot: { mit: 'MIT 라이선스', builtWith: 'Voodoo.js 0.6.1으로 제작' },
    },
  };

  // English for everyone on the first visit. `detect` is off on purpose: the
  // site opens in English and the picker in the header is how you leave it.
  // `persist` keeps that decision, so it is only made once.
  V.i18n({
    locale: 'en',
    fallback: 'en',
    detect: false,
    persist: true,
    messages: messages,
  });

  // The picker is a <select>, and v-locale is written for buttons. One listener
  // is cheaper than four buttons in the header.
  document.addEventListener('change', function (event) {
    var el = event.target;
    if (!el || !el.classList || !el.classList.contains('lang')) return;
    V.setLocale(el.value);
  });

  // Keep the picker showing the language actually in use, including the one
  // restored from localStorage on a later visit.
  function syncPicker() {
    var picker = document.querySelector('select.lang');
    if (picker && typeof V.getLocale === 'function') picker.value = V.getLocale();
  }

  // The library tag carries `data-manual`, so nothing has rendered yet. Now that
  // the four dictionaries are registered, the first paint can be the translated
  // one and the page never flashes raw keys.
  V.start();
  syncPicker();
  document.addEventListener('DOMContentLoaded', syncPicker);
})();
