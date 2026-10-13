/**
 * Translations for the home page, in the four languages the site ships:
 * English, Brazilian Portuguese, Spanish and Korean.
 *
 * English is the default and the fallback. Browser detection is deliberately
 * off: the site opens in English for everyone, and the picker in the header is
 * how you leave it. The choice is persisted, so it only has to be made once.
 *
 * The HTML carries the English text as the real content of every tag and the
 * `v-t` directive swaps it at runtime, which serves readers without JavaScript
 * and search engines alike. Code in the spell book is never translated.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.V) return;

  var messages = {
    en: {
      nav: {
        main: 'Main',
        docs: 'Docs',
        playground: 'Playground',
        components: 'Components',
        examples: 'Examples',
        search: 'Search',
        searchAria: 'Search, Ctrl plus K',
        language: 'Language',
        theme: 'Change theme: system, light or dark',
        menu: 'Menu',
        skip: 'Skip to content',
      },
      hero: {
        badge: 'Voodoo.js 1.0.0: JSX in plain HTML',
        t1: 'Write the spell in plain HTML.',
        t2: 'Watch it run.',
        lead:
          'JSX, reactive directives, components, HTTP and a router in one script tag. No bundler, no JSX ' +
          'transform, no build step. Pick a spell, edit the file, and watch the result run right next to it.',
        copyAria: 'Copy the script tag',
        ctaStart: 'Get started',
        ctaPlayground: 'Open the full playground',
      },
      spell: {
        label: 'Spells',
        counter: 'Counter',
        todo: 'Todo list',
        fetch: 'Fetch',
        form: 'Form validation',
        theme: 'Theme toggle',
        reset: 'Reset',
        resetAria: 'Reset the spell',
        run: 'Cast',
        live: 'Live: the result follows every keystroke',
        frame: 'The result of the spell',
        loading: 'Brewing the result',
      },
      build: {
        kicker: 'No build step',
        title: 'The file you edit is the file the browser runs',
        lead:
          'Every other way to write JSX puts a toolchain between your editor and the page. Voodoo reads the ' +
          'JSX at runtime, so there is nothing to install, configure or wait for. Open the file, even straight ' +
          'from your disk, and the spell is cast.',
        ritual: 'The usual ritual',
        tableCaption: 'What it takes to render a JSX list',
        colTool: 'To render that list with',
        colTakes: 'What it takes',
        react: 'npm install, a bundler, Babel or SWC, a build, a dev server',
        preact: 'npm install, a bundler and a JSX transform, or htm, which is not JSX',
        solid: 'npm install, a bundler and its own compiler',
        vue: 'npm install, a bundler and a plugin, or hand-written render functions',
        svelte: 'npm install, a bundler and the Svelte compiler, and it is not JSX',
        voodoo: 'One script tag',
        honest:
          'The honest cost: a compiler turns JSX into DOM calls ahead of time and Voodoo reads it at runtime, ' +
          'so a compiled framework wins on raw update speed and ships a smaller bundle. What you get back is a ' +
          'file you can open, edit and send to someone, with no node_modules anywhere in the story.',
      },
      dir: {
        kicker: 'Directives',
        title: 'A grimoire of attributes',
        lead:
          'Behaviour is written where it belongs, on the element it changes. Once a directive is read, its ' +
          'attribute leaves the document, so what the browser keeps is ordinary HTML.',
        count: 'directives',
        noEval: 'No eval, strict CSP friendly',
        data: 'Reactive state for an element and everything inside it.',
        interp: 'Any expression, or JSX, straight into the markup.',
        on: 'Events, with modifiers such as prevent, outside and debounce.',
        model: 'Two-way binding for inputs, selects, checkboxes and components.',
        for: 'Keyed lists, so a reorder moves nodes instead of rebuilding them.',
        if: 'Conditionals with v-else-if and v-else, or v-show to keep the node.',
        bind: 'Bind any attribute, class or style to state.',
        resource: 'An HTTP request with its data, loading and error state.',
        validate: 'Forms that validate, mask and submit themselves.',
        all: 'Every directive, by category',
      },
      comp: {
        kicker: 'Components',
        title: 'Components you write as tags, never install',
        lead:
          'The library defines them when it starts, so the tag is the whole usage. They work with v-model and ' +
          'the validation directives, and every one below is running on this page.',
        count: 'built-in components',
        all: 'See every component and its props',
      },
      ex: {
        kicker: 'Examples',
        title: 'Real apps, each one a single HTML file',
        lead:
          'Not snippets. Open the folder, open the file, and it runs: games, a 3D world, a store, a realtime ' +
          'chat and a dashboard, with no build step behind any of them.',
        todo: 'To-do list',
        todoD: 'Add, complete, filter and persist, surviving a reload.',
        kanban: 'Kanban board',
        kanbanD: 'Drag cards between columns; the order is reactive state.',
        store: 'Store',
        storeD: 'Catalogue, filters and a cart with totals derived from state.',
        dash: 'Admin dashboard',
        dashD: 'Charts, tables, filters and a date range from the built-in kit.',
        tetris: 'Tetris',
        tetrisD: 'A full game loop with the board held in reactive state.',
        world: '3D open world',
        worldD: 'A drivable car with a heads-up display written as attributes.',
        all: 'Browse all thirteen examples',
        more: 'Also a CRUD app, a Pokedex, two chats, Breakout, shaders and a devtools inspector.',
      },
      bench: {
        kicker: 'Measured',
        title: 'Quick where it counts, honest where it is not',
        lead:
          'Seven implementations of the same 1,000 row list, all bundled for production, run back to back ' +
          'against the same document. Median of 30 samples in milliseconds, lower is better. A framework whose ' +
          'DOM differs from the hand-written baseline is excluded rather than timed.',
        update: 'Update 1 in 10',
        updateNote: 'ahead of hand-written vanilla, at 6.65',
        clear: 'Clear 1,000 rows',
        clearNote: 'level with Preact, Vue and React',
        create: 'Create 1,000 rows',
        unit: 'ms, lower is better',
        honest:
          'Read honestly: on create Voodoo is third of seven, and vanilla still builds the list twice as fast. ' +
          'Solid and Preact update faster, with a compiler. Voodoo is also the largest bundle here, so if size ' +
          'is your main constraint, Alpine and Preact are the honest recommendation.',
        method: 'The method, the raw numbers and how to run it yourself',
      },
      cast: {
        title: 'Cast your first spell in a minute',
        lead:
          'One script tag, or npm install voodoojs when you have a bundler anyway. This site is built with it, ' +
          'with no build step and no framework code of its own: view the source.',
        docs: 'Read the docs',
      },
      more: {
        kicker: 'From the same author',
        title: 'More projects by kwy404',
        monsoon: 'Utility-first CSS with no build step and 167 components',
        breakhound: 'Find bugs in any JavaScript library automatically',
        vueleap: 'Migrate Vue 2 to Vue 3 with one command',
        graphemely: 'Emoji safe string functions',
        numberparrot: 'Parse localized numbers and currency',
        edgegoat: 'Edge case test inputs',
      },
      foot: {
        tagline: 'JSX in plain HTML. No build step, one script tag.',
        learn: 'Learn',
        install: 'Installation',
        jsx: 'JSX in plain HTML',
        directives: 'Directives',
        migrate: 'Coming from Vue',
        faq: 'FAQ',
        more: 'More from kwy404',
        madeBy: 'Made by',
        mit: 'MIT licensed.',
        builtWith: 'Built with',
        interactive: 'Interactive parts built with',
      },
    },

    'pt-BR': {
      nav: {
        main: 'Principal',
        docs: 'Documentação',
        playground: 'Playground',
        components: 'Componentes',
        examples: 'Exemplos',
        search: 'Buscar',
        searchAria: 'Buscar, Ctrl mais K',
        language: 'Idioma',
        theme: 'Mudar o tema: sistema, claro ou escuro',
        menu: 'Menu',
        skip: 'Pular para o conteúdo',
      },
      hero: {
        badge: 'Voodoo.js 1.0.0: JSX em HTML puro',
        t1: 'Escreva o feitiço em HTML puro.',
        t2: 'Veja funcionar.',
        lead:
          'JSX, diretivas reativas, componentes, HTTP e um roteador em uma tag script. Sem bundler, sem ' +
          'transformação de JSX, sem etapa de build. Escolha um feitiço, edite o arquivo e veja o resultado ' +
          'rodar logo ao lado.',
        copyAria: 'Copiar a tag script',
        ctaStart: 'Começar',
        ctaPlayground: 'Abrir o playground completo',
      },
      spell: {
        label: 'Feitiços',
        counter: 'Contador',
        todo: 'Lista de tarefas',
        fetch: 'Requisição',
        form: 'Validação de formulário',
        theme: 'Troca de tema',
        reset: 'Restaurar',
        resetAria: 'Restaurar o feitiço',
        run: 'Lançar',
        live: 'Ao vivo: o resultado acompanha cada tecla',
        frame: 'O resultado do feitiço',
        loading: 'Preparando o resultado',
      },
      build: {
        kicker: 'Sem etapa de build',
        title: 'O arquivo que você edita é o arquivo que o navegador executa',
        lead:
          'Todas as outras formas de escrever JSX colocam um conjunto de ferramentas entre o seu editor e a ' +
          'página. O Voodoo lê o JSX em tempo de execução, então não há nada para instalar, configurar ou ' +
          'esperar. Abra o arquivo, até direto do disco, e o feitiço está lançado.',
        ritual: 'O ritual de sempre',
        tableCaption: 'O que é preciso para renderizar uma lista em JSX',
        colTool: 'Para renderizar essa lista com',
        colTakes: 'O que é preciso',
        react: 'npm install, um bundler, Babel ou SWC, um build, um servidor de desenvolvimento',
        preact: 'npm install, um bundler e uma transformação de JSX, ou htm, que não é JSX',
        solid: 'npm install, um bundler e o compilador próprio',
        vue: 'npm install, um bundler e um plugin, ou funções de render escritas à mão',
        svelte: 'npm install, um bundler e o compilador do Svelte, e não é JSX',
        voodoo: 'Uma tag script',
        honest:
          'O custo, dito com honestidade: um compilador transforma JSX em chamadas ao DOM antes da hora e o ' +
          'Voodoo lê em tempo de execução, então um framework compilado ganha em velocidade bruta de atualização ' +
          'e entrega um bundle menor. Em troca você tem um arquivo que pode abrir, editar e mandar para alguém, ' +
          'sem node_modules em parte alguma da história.',
      },
      dir: {
        kicker: 'Diretivas',
        title: 'Um grimório de atributos',
        lead:
          'O comportamento fica onde deve ficar, no elemento que ele altera. Depois que uma diretiva é lida, o ' +
          'atributo sai do documento, e o que o navegador guarda é HTML comum.',
        count: 'diretivas',
        noEval: 'Sem eval, compatível com CSP rígida',
        data: 'Estado reativo para um elemento e tudo dentro dele.',
        interp: 'Qualquer expressão, ou JSX, direto na marcação.',
        on: 'Eventos, com modificadores como prevent, outside e debounce.',
        model: 'Ligação de mão dupla para inputs, selects, checkboxes e componentes.',
        for: 'Listas com chave, para que reordenar mova nós em vez de recriá-los.',
        if: 'Condicionais com v-else-if e v-else, ou v-show para manter o nó.',
        bind: 'Ligue qualquer atributo, classe ou estilo ao estado.',
        resource: 'Uma requisição HTTP com dados, carregamento e erro.',
        validate: 'Formulários que se validam, aplicam máscara e se enviam sozinhos.',
        all: 'Todas as diretivas, por categoria',
      },
      comp: {
        kicker: 'Componentes',
        title: 'Componentes que você escreve como tags, sem instalar',
        lead:
          'A biblioteca os define quando inicia, então a tag é todo o uso. Funcionam com v-model e com as ' +
          'diretivas de validação, e cada um abaixo está rodando nesta página.',
        count: 'componentes prontos',
        all: 'Ver todos os componentes e suas props',
      },
      ex: {
        kicker: 'Exemplos',
        title: 'Aplicações reais, cada uma em um único arquivo HTML',
        lead:
          'Não são trechos soltos. Abra a pasta, abra o arquivo, e funciona: jogos, um mundo 3D, uma loja, um ' +
          'chat em tempo real e um painel, sem etapa de build por trás de nenhum deles.',
        todo: 'Lista de tarefas',
        todoD: 'Adicione, conclua, filtre e salve, sobrevivendo a um recarregamento.',
        kanban: 'Quadro kanban',
        kanbanD: 'Arraste cartões entre colunas; a ordem é estado reativo.',
        store: 'Loja',
        storeD: 'Catálogo, filtros e um carrinho com totais derivados do estado.',
        dash: 'Painel administrativo',
        dashD: 'Gráficos, tabelas, filtros e um intervalo de datas com o kit embutido.',
        tetris: 'Tetris',
        tetrisD: 'Um loop de jogo completo com o tabuleiro em estado reativo.',
        world: 'Mundo aberto 3D',
        worldD: 'Um carro dirigível com um painel escrito como atributos.',
        all: 'Ver os treze exemplos',
        more: 'Também um CRUD, uma Pokédex, dois chats, Breakout, shaders e um inspetor de devtools.',
      },
      bench: {
        kicker: 'Medido',
        title: 'Rápido onde importa, honesto onde não é',
        lead:
          'Sete implementações da mesma lista de 1.000 linhas, todas empacotadas para produção, executadas em ' +
          'sequência no mesmo documento. Mediana de 30 amostras em milissegundos, menor é melhor. Um framework ' +
          'cujo DOM difere da referência escrita à mão é excluído em vez de cronometrado.',
        update: 'Atualizar 1 em 10',
        updateNote: 'à frente do vanilla escrito à mão, com 6,65',
        clear: 'Limpar 1.000 linhas',
        clearNote: 'empatado com Preact, Vue e React',
        create: 'Criar 1.000 linhas',
        unit: 'ms, menor é melhor',
        honest:
          'Lendo com honestidade: ao criar, o Voodoo fica em terceiro de sete, e o vanilla ainda monta a lista ' +
          'duas vezes mais rápido. Solid e Preact atualizam mais rápido, com um compilador. O Voodoo também tem ' +
          'o maior bundle da tabela, então, se tamanho é sua principal restrição, Alpine e Preact são a ' +
          'recomendação honesta.',
        method: 'O método, os números brutos e como rodar você mesmo',
      },
      cast: {
        title: 'Lance seu primeiro feitiço em um minuto',
        lead:
          'Uma tag script, ou npm install voodoojs quando você já tem um bundler. Este site é feito com ele, sem ' +
          'etapa de build e sem código de framework próprio: veja o código-fonte.',
        docs: 'Ler a documentação',
      },
      more: {
        kicker: 'Do mesmo autor',
        title: 'Mais projetos de kwy404',
        monsoon: 'CSS utility-first sem etapa de build e com 167 componentes',
        breakhound: 'Encontre bugs em qualquer biblioteca JavaScript automaticamente',
        vueleap: 'Migre de Vue 2 para Vue 3 com um comando',
        graphemely: 'Funções de string seguras para emoji',
        numberparrot: 'Interprete números e moedas localizados',
        edgegoat: 'Entradas de teste para casos extremos',
      },
      foot: {
        tagline: 'JSX em HTML puro. Sem etapa de build, uma tag script.',
        learn: 'Aprender',
        install: 'Instalação',
        jsx: 'JSX em HTML puro',
        directives: 'Diretivas',
        migrate: 'Vindo do Vue',
        faq: 'Perguntas frequentes',
        more: 'Mais de kwy404',
        madeBy: 'Feito por',
        mit: 'Licença MIT.',
        builtWith: 'Feito com',
        interactive: 'Partes interativas feitas com',
      },
    },

    es: {
      nav: {
        main: 'Principal',
        docs: 'Documentación',
        playground: 'Playground',
        components: 'Componentes',
        examples: 'Ejemplos',
        search: 'Buscar',
        searchAria: 'Buscar, Ctrl más K',
        language: 'Idioma',
        theme: 'Cambiar el tema: sistema, claro u oscuro',
        menu: 'Menú',
        skip: 'Saltar al contenido',
      },
      hero: {
        badge: 'Voodoo.js 1.0.0: JSX en HTML puro',
        t1: 'Escribe el hechizo en HTML puro.',
        t2: 'Míralo funcionar.',
        lead:
          'JSX, directivas reactivas, componentes, HTTP y un enrutador en una etiqueta script. Sin bundler, sin ' +
          'transformación de JSX, sin paso de compilación. Elige un hechizo, edita el archivo y mira el resultado ' +
          'ejecutarse justo al lado.',
        copyAria: 'Copiar la etiqueta script',
        ctaStart: 'Empezar',
        ctaPlayground: 'Abrir el playground completo',
      },
      spell: {
        label: 'Hechizos',
        counter: 'Contador',
        todo: 'Lista de tareas',
        fetch: 'Petición',
        form: 'Validación de formulario',
        theme: 'Cambio de tema',
        reset: 'Restablecer',
        resetAria: 'Restablecer el hechizo',
        run: 'Lanzar',
        live: 'En vivo: el resultado sigue cada tecla',
        frame: 'El resultado del hechizo',
        loading: 'Preparando el resultado',
      },
      build: {
        kicker: 'Sin paso de compilación',
        title: 'El archivo que editas es el archivo que ejecuta el navegador',
        lead:
          'Cualquier otra forma de escribir JSX pone una cadena de herramientas entre tu editor y la página. ' +
          'Voodoo lee el JSX en tiempo de ejecución, así que no hay nada que instalar, configurar ni esperar. ' +
          'Abre el archivo, incluso directamente desde tu disco, y el hechizo está lanzado.',
        ritual: 'El ritual de siempre',
        tableCaption: 'Lo que hace falta para renderizar una lista en JSX',
        colTool: 'Para renderizar esa lista con',
        colTakes: 'Lo que hace falta',
        react: 'npm install, un bundler, Babel o SWC, una compilación, un servidor de desarrollo',
        preact: 'npm install, un bundler y una transformación de JSX, o htm, que no es JSX',
        solid: 'npm install, un bundler y su propio compilador',
        vue: 'npm install, un bundler y un plugin, o funciones de render escritas a mano',
        svelte: 'npm install, un bundler y el compilador de Svelte, y no es JSX',
        voodoo: 'Una etiqueta script',
        honest:
          'El costo, dicho con honestidad: un compilador convierte JSX en llamadas al DOM por adelantado y ' +
          'Voodoo lo lee en tiempo de ejecución, así que un framework compilado gana en velocidad bruta de ' +
          'actualización y entrega un bundle más pequeño. A cambio tienes un archivo que puedes abrir, editar y ' +
          'enviar a alguien, sin node_modules en ninguna parte de la historia.',
      },
      dir: {
        kicker: 'Directivas',
        title: 'Un grimorio de atributos',
        lead:
          'El comportamiento se escribe donde corresponde, en el elemento que cambia. Una vez leída una ' +
          'directiva, su atributo sale del documento, y lo que el navegador conserva es HTML común.',
        count: 'directivas',
        noEval: 'Sin eval, compatible con CSP estricta',
        data: 'Estado reactivo para un elemento y todo lo que contiene.',
        interp: 'Cualquier expresión, o JSX, directamente en el marcado.',
        on: 'Eventos, con modificadores como prevent, outside y debounce.',
        model: 'Enlace bidireccional para inputs, selects, casillas y componentes.',
        for: 'Listas con clave, para que reordenar mueva nodos en lugar de recrearlos.',
        if: 'Condicionales con v-else-if y v-else, o v-show para conservar el nodo.',
        bind: 'Enlaza cualquier atributo, clase o estilo al estado.',
        resource: 'Una petición HTTP con sus datos, carga y error.',
        validate: 'Formularios que se validan, aplican máscaras y se envían solos.',
        all: 'Todas las directivas, por categoría',
      },
      comp: {
        kicker: 'Componentes',
        title: 'Componentes que escribes como etiquetas, sin instalar',
        lead:
          'La biblioteca los define al iniciar, así que la etiqueta es todo el uso. Funcionan con v-model y con ' +
          'las directivas de validación, y cada uno de abajo se está ejecutando en esta página.',
        count: 'componentes incluidos',
        all: 'Ver todos los componentes y sus props',
      },
      ex: {
        kicker: 'Ejemplos',
        title: 'Aplicaciones reales, cada una en un solo archivo HTML',
        lead:
          'No son fragmentos. Abre la carpeta, abre el archivo, y funciona: juegos, un mundo 3D, una tienda, un ' +
          'chat en tiempo real y un panel, sin paso de compilación detrás de ninguno.',
        todo: 'Lista de tareas',
        todoD: 'Añade, completa, filtra y guarda, sobreviviendo a una recarga.',
        kanban: 'Tablero kanban',
        kanbanD: 'Arrastra tarjetas entre columnas; el orden es estado reactivo.',
        store: 'Tienda',
        storeD: 'Catálogo, filtros y un carrito con totales derivados del estado.',
        dash: 'Panel de administración',
        dashD: 'Gráficos, tablas, filtros y un rango de fechas con el kit incluido.',
        tetris: 'Tetris',
        tetrisD: 'Un bucle de juego completo con el tablero en estado reactivo.',
        world: 'Mundo abierto 3D',
        worldD: 'Un coche conducible con un panel escrito como atributos.',
        all: 'Ver los trece ejemplos',
        more: 'También un CRUD, una Pokédex, dos chats, Breakout, shaders y un inspector de devtools.',
      },
      bench: {
        kicker: 'Medido',
        title: 'Rápido donde importa, honesto donde no lo es',
        lead:
          'Siete implementaciones de la misma lista de 1.000 filas, todas empaquetadas para producción, ' +
          'ejecutadas una tras otra sobre el mismo documento. Mediana de 30 muestras en milisegundos, menos es ' +
          'mejor. Un framework cuyo DOM difiere de la referencia escrita a mano se excluye en lugar de medirse.',
        update: 'Actualizar 1 de cada 10',
        updateNote: 'por delante del vanilla escrito a mano, con 6,65',
        clear: 'Vaciar 1.000 filas',
        clearNote: 'a la par de Preact, Vue y React',
        create: 'Crear 1.000 filas',
        unit: 'ms, menos es mejor',
        honest:
          'Leído con honestidad: al crear, Voodoo es tercero de siete, y vanilla aún construye la lista el doble ' +
          'de rápido. Solid y Preact actualizan más rápido, con un compilador. Voodoo también es el bundle más ' +
          'grande de la tabla, así que si el tamaño es tu principal restricción, Alpine y Preact son la ' +
          'recomendación honesta.',
        method: 'El método, los números en bruto y cómo ejecutarlo tú mismo',
      },
      cast: {
        title: 'Lanza tu primer hechizo en un minuto',
        lead:
          'Una etiqueta script, o npm install voodoojs cuando ya tienes un bundler. Este sitio está hecho con él, ' +
          'sin paso de compilación y sin código de framework propio: mira el código fuente.',
        docs: 'Leer la documentación',
      },
      more: {
        kicker: 'Del mismo autor',
        title: 'Más proyectos de kwy404',
        monsoon: 'CSS utility-first sin paso de compilación y con 167 componentes',
        breakhound: 'Encuentra errores en cualquier biblioteca JavaScript automáticamente',
        vueleap: 'Migra de Vue 2 a Vue 3 con un comando',
        graphemely: 'Funciones de cadenas seguras para emoji',
        numberparrot: 'Interpreta números y monedas localizados',
        edgegoat: 'Entradas de prueba para casos límite',
      },
      foot: {
        tagline: 'JSX en HTML puro. Sin paso de compilación, una etiqueta script.',
        learn: 'Aprender',
        install: 'Instalación',
        jsx: 'JSX en HTML puro',
        directives: 'Directivas',
        migrate: 'Si vienes de Vue',
        faq: 'Preguntas frecuentes',
        more: 'Más de kwy404',
        madeBy: 'Hecho por',
        mit: 'Licencia MIT.',
        builtWith: 'Hecho con',
        interactive: 'Partes interactivas hechas con',
      },
    },

    ko: {
      nav: {
        main: '주 메뉴',
        docs: '문서',
        playground: '플레이그라운드',
        components: '컴포넌트',
        examples: '예제',
        search: '검색',
        searchAria: '검색, Ctrl과 K',
        language: '언어',
        theme: '테마 변경: 시스템, 라이트, 다크',
        menu: '메뉴',
        skip: '본문으로 건너뛰기',
      },
      hero: {
        badge: 'Voodoo.js 1.0.0: 순수 HTML 안의 JSX',
        t1: '순수 HTML로 주문을 쓰세요.',
        t2: '바로 실행됩니다.',
        lead:
          'JSX, 반응형 디렉티브, 컴포넌트, HTTP, 라우터를 스크립트 태그 하나로. 번들러도, JSX 변환도, 빌드 단계도 ' +
          '없습니다. 주문을 고르고 파일을 수정하면 바로 옆에서 결과가 실행됩니다.',
        copyAria: '스크립트 태그 복사',
        ctaStart: '시작하기',
        ctaPlayground: '전체 플레이그라운드 열기',
      },
      spell: {
        label: '주문',
        counter: '카운터',
        todo: '할 일 목록',
        fetch: '데이터 가져오기',
        form: '폼 검증',
        theme: '테마 전환',
        reset: '되돌리기',
        resetAria: '주문 되돌리기',
        run: '시전',
        live: '실시간: 키를 누를 때마다 결과가 바뀝니다',
        frame: '주문의 결과',
        loading: '결과를 준비하는 중',
      },
      build: {
        kicker: '빌드 단계 없음',
        title: '편집하는 파일이 곧 브라우저가 실행하는 파일',
        lead:
          'JSX를 쓰는 다른 모든 방법은 에디터와 페이지 사이에 도구 체인을 둡니다. Voodoo는 JSX를 런타임에 ' +
          '읽기 때문에 설치하거나 설정하거나 기다릴 것이 없습니다. 디스크에서 바로 파일을 열어도 주문이 시전됩니다.',
        ritual: '늘 하던 의식',
        tableCaption: 'JSX 목록 하나를 렌더링하는 데 필요한 것',
        colTool: '이 목록을 렌더링할 때',
        colTakes: '필요한 것',
        react: 'npm install, 번들러, Babel 또는 SWC, 빌드, 개발 서버',
        preact: 'npm install, 번들러와 JSX 변환, 또는 JSX가 아닌 htm',
        solid: 'npm install, 번들러와 전용 컴파일러',
        vue: 'npm install, 번들러와 플러그인, 또는 직접 작성한 render 함수',
        svelte: 'npm install, 번들러와 Svelte 컴파일러, 그리고 JSX가 아님',
        voodoo: '스크립트 태그 하나',
        honest:
          '솔직한 비용: 컴파일러는 JSX를 미리 DOM 호출로 바꾸고 Voodoo는 런타임에 읽기 때문에, 컴파일되는 ' +
          '프레임워크가 순수 업데이트 속도에서 이기고 번들도 더 작습니다. 대신 여러분은 열고, 고치고, 누군가에게 ' +
          '보낼 수 있는 파일 하나를 얻습니다. 어디에도 node_modules는 없습니다.',
      },
      dir: {
        kicker: '디렉티브',
        title: '속성으로 엮은 마법서',
        lead:
          '동작은 그것이 바꾸는 요소 위, 있어야 할 곳에 씁니다. 디렉티브를 읽고 나면 속성은 문서에서 사라지고, ' +
          '브라우저에는 평범한 HTML만 남습니다.',
        count: '개의 디렉티브',
        noEval: 'eval 없음, 엄격한 CSP 지원',
        data: '요소와 그 안의 모든 것을 위한 반응형 상태.',
        interp: '어떤 표현식이든, JSX든 마크업에 바로.',
        on: 'prevent, outside, debounce 같은 수식어가 있는 이벤트.',
        model: '입력, 선택, 체크박스, 컴포넌트를 위한 양방향 바인딩.',
        for: '키가 있는 목록. 순서를 바꾸면 노드를 다시 만들지 않고 옮깁니다.',
        if: 'v-else-if와 v-else가 있는 조건문, 노드를 유지하려면 v-show.',
        bind: '어떤 속성, 클래스, 스타일이든 상태에 바인딩.',
        resource: '데이터, 로딩, 오류 상태를 갖춘 HTTP 요청.',
        validate: '스스로 검증하고, 마스크를 적용하고, 전송하는 폼.',
        all: '카테고리별 전체 디렉티브',
      },
      comp: {
        kicker: '컴포넌트',
        title: '설치 없이 태그로 쓰는 컴포넌트',
        lead:
          '라이브러리가 시작할 때 정의하므로 태그를 쓰는 것이 사용의 전부입니다. v-model과 검증 디렉티브와 함께 ' +
          '동작하며, 아래의 모든 것이 지금 이 페이지에서 실행 중입니다.',
        count: '개의 기본 컴포넌트',
        all: '모든 컴포넌트와 props 보기',
      },
      ex: {
        kicker: '예제',
        title: 'HTML 파일 하나로 된 실제 앱들',
        lead:
          '코드 조각이 아닙니다. 폴더를 열고 파일을 열면 실행됩니다. 게임, 3D 세계, 쇼핑몰, 실시간 채팅, ' +
          '대시보드까지, 어느 것도 빌드 단계가 없습니다.',
        todo: '할 일 목록',
        todoD: '추가, 완료, 필터, 저장. 새로고침해도 남아 있습니다.',
        kanban: '칸반 보드',
        kanbanD: '열 사이로 카드를 끌어 옮기세요. 순서는 반응형 상태입니다.',
        store: '쇼핑몰',
        storeD: '카탈로그, 필터, 상태에서 계산되는 합계를 가진 장바구니.',
        dash: '관리자 대시보드',
        dashD: '기본 키트로 만든 차트, 표, 필터, 날짜 범위.',
        tetris: '테트리스',
        tetrisD: '보드를 반응형 상태로 가진 완전한 게임 루프.',
        world: '3D 오픈 월드',
        worldD: '속성으로 작성한 계기판이 있는 운전 가능한 자동차.',
        all: '예제 13개 모두 보기',
        more: 'CRUD 앱, 포켓몬 도감, 채팅 두 개, 벽돌 깨기, 셰이더, 개발자 도구 인스펙터도 있습니다.',
      },
      bench: {
        kicker: '측정 결과',
        title: '중요한 곳에서는 빠르게, 아닌 곳에서는 솔직하게',
        lead:
          '같은 1,000행 목록을 일곱 가지로 구현해 모두 프로덕션용으로 번들링하고, 같은 문서에서 연달아 ' +
          '실행했습니다. 30회 샘플의 중앙값(밀리초)이며 낮을수록 좋습니다. 직접 작성한 기준과 DOM이 다른 ' +
          '프레임워크는 측정하지 않고 제외합니다.',
        update: '10개 중 1개 업데이트',
        updateNote: '직접 작성한 vanilla(6.65)보다 앞섬',
        clear: '1,000행 비우기',
        clearNote: 'Preact, Vue, React와 비슷',
        create: '1,000행 생성',
        unit: 'ms, 낮을수록 좋음',
        honest:
          '솔직하게 읽으면: 생성에서 Voodoo는 일곱 중 세 번째이고, vanilla는 여전히 목록을 두 배 빠르게 ' +
          '만듭니다. Solid와 Preact는 컴파일러 덕분에 업데이트가 더 빠릅니다. Voodoo는 이 표에서 번들도 가장 ' +
          '크므로, 크기가 가장 중요하다면 Alpine과 Preact를 솔직하게 추천합니다.',
        method: '측정 방법, 원본 수치, 직접 실행하는 법',
      },
      cast: {
        title: '1분 만에 첫 주문을 시전하세요',
        lead:
          '스크립트 태그 하나, 또는 이미 번들러가 있다면 npm install voodoojs. 이 사이트도 빌드 단계 없이, ' +
          '자체 프레임워크 코드 없이 Voodoo로 만들었습니다. 소스를 확인해 보세요.',
        docs: '문서 읽기',
      },
      more: {
        kicker: '같은 제작자',
        title: 'kwy404의 다른 프로젝트',
        monsoon: '빌드 없는 유틸리티 우선 CSS와 167개의 컴포넌트',
        breakhound: '모든 JavaScript 라이브러리의 버그를 자동으로 찾기',
        vueleap: '명령 하나로 Vue 2에서 Vue 3로 마이그레이션',
        graphemely: '이모지에 안전한 문자열 함수',
        numberparrot: '현지화된 숫자와 통화 파싱',
        edgegoat: '엣지 케이스 테스트 입력',
      },
      foot: {
        tagline: '순수 HTML 안의 JSX. 빌드 단계 없이, 스크립트 태그 하나로.',
        learn: '배우기',
        install: '설치',
        jsx: '순수 HTML 안의 JSX',
        directives: '디렉티브',
        migrate: 'Vue에서 옮겨 오기',
        faq: '자주 묻는 질문',
        more: 'kwy404의 다른 프로젝트',
        madeBy: '만든 사람',
        mit: 'MIT 라이선스.',
        builtWith: '사용한 도구:',
        interactive: '인터랙티브 부분:',
      },
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
    if (!el || !el.classList || !el.classList.contains('vd-lang')) return;
    V.setLocale(el.value);
    document.documentElement.setAttribute('lang', el.value);
  });

  // Keep the picker, and the lang attribute, on the language actually in use,
  // including the one restored from localStorage on a later visit.
  function syncPicker() {
    var el = document.querySelector('select.vd-lang');
    if (!el || typeof V.getLocale !== 'function') return;
    el.value = V.getLocale();
    document.documentElement.setAttribute('lang', V.getLocale());
  }

  // The library tag carries `data-manual`, so nothing has rendered yet. Now that
  // the dictionaries and the spell book are registered, the first paint can be
  // the translated one and the page never flashes raw keys.
  V.start();
  syncPicker();
  document.addEventListener('DOMContentLoaded', syncPicker);
})();
