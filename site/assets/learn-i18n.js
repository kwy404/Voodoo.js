/**
 * The lesson page text, in the four languages the site ships: English,
 * Brazilian Portuguese, Spanish and Korean.
 *
 * Kept apart from assets/i18n.js so the home page does not download a lesson
 * it never shows. i18n.js picks these up from window.VOODOO_PAGE_MESSAGES and
 * merges them into the same dictionaries, so the header, the footer and the
 * language picker are shared with the home page.
 *
 * Strings under `learn.s*` are HTML, written into the page by assets/learn.js.
 * Braces in code are written as &#123; and &#125; because a bare brace in a
 * message is an interpolation slot for V.t. Code itself is never translated.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  window.VOODOO_PAGE_MESSAGES = {
    en: {
      learn: {
        kicker: 'Interactive lesson',
        title: 'Learn Voodoo in 10 minutes',
        lead:
          'Eight short steps, each one a small task in a live editor. Type, watch the result change, ' +
          'and the step checks itself. Nothing to install.',
        minutes: 'About 10 minutes',
        steps: '8 short steps',
        saved: 'Progress stays in this browser',
        ui: {
          step: 'Step {n} of {total}',
          progress: 'Lesson progress',
          jump: 'Step {n}: {title}',
          task: 'Your turn',
          waiting: 'Edit the code. The step checks itself as you type.',
          passed: 'Done! The spell works.',
          hint: 'Show a hint',
          answer: 'Show the answer',
          reset: 'Start this step again',
          back: 'Back',
          next: 'Next step',
          skip: 'Skip',
          finish: 'Finish',
          editor: 'The code for this step, which you can edit',
          frame: 'The result of your code',
          live: 'Live',
          error: 'Something in the code did not run',
        },
        s1: {
          title: 'Say hello',
          body:
            'A Voodoo page is plain HTML. <code>v-data</code> holds the state of a block, and anything in ' +
            'braces, like <code>&#123; name &#125;</code>, is shown on the page and kept up to date.',
          task: 'Change <code>\'Vudu\'</code> to your own name.',
          hint: 'Edit the text between the quotes: <code>v-data="&#123; name: \'Ana\' &#125;"</code>',
        },
        s2: {
          title: 'Any JavaScript in braces',
          body:
            'Braces take any JavaScript expression: math, method calls, a ternary. Whatever it returns ' +
            'is what appears on the page.',
          task: 'Add a line that shows how many letters the name has, with <code>name.length</code>.',
          hint: '<code>&lt;p&gt;&#123; name.length &#125; letters&lt;/p&gt;</code>',
        },
        s3: {
          title: 'React to a click',
          body:
            '<code>@click</code> runs a statement when the element is clicked. Change the state, and every ' +
            'brace that reads it updates by itself.',
          task: 'Add a second button that sets <code>count</code> back to 0.',
          hint: '<code>&lt;button @click="count = 0"&gt;Reset&lt;/button&gt;</code>',
        },
        s4: {
          title: 'Bind an input',
          body:
            '<code>v-model</code> ties an input to a piece of state. Typing changes the state, and changing ' +
            'the state changes the input.',
          task: 'Show how many characters were typed, with <code>spell.length</code>.',
          hint: '<code>&lt;p&gt;&#123; spell.length &#125; characters&lt;/p&gt;</code>',
        },
        s5: {
          title: 'Show or hide',
          body:
            '<code>v-if</code> keeps an element on the page only while its expression is true. ' +
            '<code>v-else</code>, right after it, covers the other case.',
          task: 'Add a paragraph with <code>v-else</code> that says the chest is closed.',
          hint: '<code>&lt;p v-else&gt;The chest is closed.&lt;/p&gt;</code>',
        },
        s6: {
          title: 'Repeat with v-for',
          body:
            '<code>v-for</code> repeats an element once for every item in an array. Push to the array and ' +
            'a new row appears, as the button shows.',
          task: 'Add a fourth potion to the array in <code>v-data</code>.',
          hint: '<code>potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\']</code>',
        },
        s7: {
          title: 'JSX in plain HTML',
          body:
            'You can also write JSX right in the page. <code>.map()</code> returns elements, with no build ' +
            'step. It is the same list as before, written as JavaScript.',
          task:
            'Show only the potions with more than 4 letters: add <code>.filter()</code> before ' +
            '<code>.map()</code>.',
          hint: '<code>potions.filter(p =&gt; p.length &gt; 4).map(p =&gt; &lt;li&gt;&#123; p &#125;&lt;/li&gt;)</code>',
        },
        s8: {
          title: 'Fetch data',
          body:
            '<code>v-resource</code> requests a URL and gives you <code>loading</code>, <code>error</code> ' +
            'and <code>data</code>, all reactive. No promise handling, no extra state.',
          task: 'Show only the first 3 users, with <code>users.data.slice(0, 3)</code>.',
          hint: '<code>&lt;li v-for="u in users.data.slice(0, 3)"&gt;</code>',
        },
        end: {
          kicker: 'Lesson complete',
          title: 'You know Voodoo',
          lead:
            'State, braces, events, inputs, conditions, lists, JSX and a request: that is most of what a ' +
            'real page needs, and all of it lives in one HTML file.',
          score: 'Tasks completed: {n} of {total}',
          play: 'Open the playground',
          docs: 'Read the docs',
          examples: 'See the examples',
          restart: 'Start over',
          next: 'What to try next',
        },
      },
    },

    'pt-BR': {
      learn: {
        kicker: 'Aula interativa',
        title: 'Aprenda Voodoo em 10 minutos',
        lead:
          'Oito passos curtos, cada um com uma pequena tarefa num editor ao vivo. Digite, veja o resultado ' +
          'mudar, e o passo se confere sozinho. Nada para instalar.',
        minutes: 'Cerca de 10 minutos',
        steps: '8 passos curtos',
        saved: 'O progresso fica salvo neste navegador',
        ui: {
          step: 'Passo {n} de {total}',
          progress: 'Progresso da aula',
          jump: 'Passo {n}: {title}',
          task: 'Sua vez',
          waiting: 'Edite o código. O passo se confere enquanto você digita.',
          passed: 'Pronto! O feitiço funciona.',
          hint: 'Mostrar uma dica',
          answer: 'Mostrar a resposta',
          reset: 'Recomeçar este passo',
          back: 'Voltar',
          next: 'Próximo passo',
          skip: 'Pular',
          finish: 'Concluir',
          editor: 'O código deste passo, que você pode editar',
          frame: 'O resultado do seu código',
          live: 'Ao vivo',
          error: 'Algo no código não rodou',
        },
        s1: {
          title: 'Diga olá',
          body:
            'Uma página Voodoo é HTML puro. <code>v-data</code> guarda o estado de um bloco, e tudo o que ' +
            'estiver entre chaves, como <code>&#123; name &#125;</code>, aparece na página e se mantém atualizado.',
          task: 'Troque <code>\'Vudu\'</code> pelo seu nome.',
          hint: 'Edite o texto entre as aspas: <code>v-data="&#123; name: \'Ana\' &#125;"</code>',
        },
        s2: {
          title: 'Qualquer JavaScript entre chaves',
          body:
            'As chaves aceitam qualquer expressão JavaScript: contas, chamadas de método, um ternário. O que ' +
            'ela devolve é o que aparece na página.',
          task: 'Adicione uma linha que mostre quantas letras o nome tem, com <code>name.length</code>.',
          hint: '<code>&lt;p&gt;&#123; name.length &#125; letras&lt;/p&gt;</code>',
        },
        s3: {
          title: 'Reaja a um clique',
          body:
            '<code>@click</code> executa uma instrução quando o elemento é clicado. Mude o estado, e toda ' +
            'chave que o lê se atualiza sozinha.',
          task: 'Adicione um segundo botão que volte <code>count</code> para 0.',
          hint: '<code>&lt;button @click="count = 0"&gt;Zerar&lt;/button&gt;</code>',
        },
        s4: {
          title: 'Ligue um campo',
          body:
            '<code>v-model</code> liga um campo a um pedaço do estado. Digitar muda o estado, e mudar o ' +
            'estado muda o campo.',
          task: 'Mostre quantos caracteres foram digitados, com <code>spell.length</code>.',
          hint: '<code>&lt;p&gt;&#123; spell.length &#125; caracteres&lt;/p&gt;</code>',
        },
        s5: {
          title: 'Mostrar ou esconder',
          body:
            '<code>v-if</code> mantém um elemento na página só enquanto a expressão for verdadeira. ' +
            '<code>v-else</code>, logo depois, cobre o outro caso.',
          task: 'Adicione um parágrafo com <code>v-else</code> dizendo que o baú está fechado.',
          hint: '<code>&lt;p v-else&gt;O baú está fechado.&lt;/p&gt;</code>',
        },
        s6: {
          title: 'Repita com v-for',
          body:
            '<code>v-for</code> repete um elemento uma vez para cada item de um array. Adicione ao array e ' +
            'uma nova linha aparece, como o botão mostra.',
          task: 'Adicione uma quarta poção ao array em <code>v-data</code>.',
          hint: '<code>potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\']</code>',
        },
        s7: {
          title: 'JSX em HTML puro',
          body:
            'Você também pode escrever JSX direto na página. <code>.map()</code> devolve elementos, sem ' +
            'etapa de build. É a mesma lista de antes, escrita como JavaScript.',
          task:
            'Mostre só as poções com mais de 4 letras: adicione <code>.filter()</code> antes de ' +
            '<code>.map()</code>.',
          hint: '<code>potions.filter(p =&gt; p.length &gt; 4).map(p =&gt; &lt;li&gt;&#123; p &#125;&lt;/li&gt;)</code>',
        },
        s8: {
          title: 'Busque dados',
          body:
            '<code>v-resource</code> faz a requisição de uma URL e entrega <code>loading</code>, ' +
            '<code>error</code> e <code>data</code>, tudo reativo. Sem lidar com promises, sem estado extra.',
          task: 'Mostre só os 3 primeiros usuários, com <code>users.data.slice(0, 3)</code>.',
          hint: '<code>&lt;li v-for="u in users.data.slice(0, 3)"&gt;</code>',
        },
        end: {
          kicker: 'Aula concluída',
          title: 'Você sabe Voodoo',
          lead:
            'Estado, chaves, eventos, campos, condições, listas, JSX e uma requisição: é quase tudo o que uma ' +
            'página de verdade precisa, e tudo cabe num arquivo HTML.',
          score: 'Tarefas concluídas: {n} de {total}',
          play: 'Abrir o playground',
          docs: 'Ler a documentação',
          examples: 'Ver os exemplos',
          restart: 'Recomeçar',
          next: 'O que experimentar agora',
        },
      },
    },

    es: {
      learn: {
        kicker: 'Lección interactiva',
        title: 'Aprende Voodoo en 10 minutos',
        lead:
          'Ocho pasos cortos, cada uno con una pequeña tarea en un editor en vivo. Escribe, mira cómo cambia ' +
          'el resultado, y el paso se comprueba solo. Nada que instalar.',
        minutes: 'Unos 10 minutos',
        steps: '8 pasos cortos',
        saved: 'El progreso se guarda en este navegador',
        ui: {
          step: 'Paso {n} de {total}',
          progress: 'Progreso de la lección',
          jump: 'Paso {n}: {title}',
          task: 'Tu turno',
          waiting: 'Edita el código. El paso se comprueba mientras escribes.',
          passed: '¡Listo! El hechizo funciona.',
          hint: 'Ver una pista',
          answer: 'Ver la respuesta',
          reset: 'Empezar este paso de nuevo',
          back: 'Atrás',
          next: 'Siguiente paso',
          skip: 'Saltar',
          finish: 'Terminar',
          editor: 'El código de este paso, que puedes editar',
          frame: 'El resultado de tu código',
          live: 'En vivo',
          error: 'Algo en el código no se ejecutó',
        },
        s1: {
          title: 'Di hola',
          body:
            'Una página Voodoo es HTML puro. <code>v-data</code> guarda el estado de un bloque, y todo lo que ' +
            'esté entre llaves, como <code>&#123; name &#125;</code>, se muestra en la página y se mantiene al día.',
          task: 'Cambia <code>\'Vudu\'</code> por tu nombre.',
          hint: 'Edita el texto entre comillas: <code>v-data="&#123; name: \'Ana\' &#125;"</code>',
        },
        s2: {
          title: 'Cualquier JavaScript entre llaves',
          body:
            'Las llaves aceptan cualquier expresión JavaScript: cuentas, llamadas a métodos, un ternario. Lo ' +
            'que devuelve es lo que aparece en la página.',
          task: 'Añade una línea que muestre cuántas letras tiene el nombre, con <code>name.length</code>.',
          hint: '<code>&lt;p&gt;&#123; name.length &#125; letras&lt;/p&gt;</code>',
        },
        s3: {
          title: 'Responde a un clic',
          body:
            '<code>@click</code> ejecuta una instrucción cuando se hace clic en el elemento. Cambia el estado, ' +
            'y cada llave que lo lee se actualiza sola.',
          task: 'Añade un segundo botón que devuelva <code>count</code> a 0.',
          hint: '<code>&lt;button @click="count = 0"&gt;Reiniciar&lt;/button&gt;</code>',
        },
        s4: {
          title: 'Enlaza un campo',
          body:
            '<code>v-model</code> enlaza un campo con una parte del estado. Escribir cambia el estado, y ' +
            'cambiar el estado cambia el campo.',
          task: 'Muestra cuántos caracteres se escribieron, con <code>spell.length</code>.',
          hint: '<code>&lt;p&gt;&#123; spell.length &#125; caracteres&lt;/p&gt;</code>',
        },
        s5: {
          title: 'Mostrar u ocultar',
          body:
            '<code>v-if</code> mantiene un elemento en la página solo mientras su expresión sea verdadera. ' +
            '<code>v-else</code>, justo después, cubre el otro caso.',
          task: 'Añade un párrafo con <code>v-else</code> que diga que el cofre está cerrado.',
          hint: '<code>&lt;p v-else&gt;El cofre está cerrado.&lt;/p&gt;</code>',
        },
        s6: {
          title: 'Repite con v-for',
          body:
            '<code>v-for</code> repite un elemento una vez por cada elemento de un array. Añade al array y ' +
            'aparece una fila nueva, como muestra el botón.',
          task: 'Añade una cuarta poción al array de <code>v-data</code>.',
          hint: '<code>potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\']</code>',
        },
        s7: {
          title: 'JSX en HTML puro',
          body:
            'También puedes escribir JSX directamente en la página. <code>.map()</code> devuelve elementos, ' +
            'sin paso de build. Es la misma lista de antes, escrita como JavaScript.',
          task:
            'Muestra solo las pociones con más de 4 letras: añade <code>.filter()</code> antes de ' +
            '<code>.map()</code>.',
          hint: '<code>potions.filter(p =&gt; p.length &gt; 4).map(p =&gt; &lt;li&gt;&#123; p &#125;&lt;/li&gt;)</code>',
        },
        s8: {
          title: 'Trae datos',
          body:
            '<code>v-resource</code> pide una URL y te da <code>loading</code>, <code>error</code> y ' +
            '<code>data</code>, todo reactivo. Sin manejar promesas, sin estado extra.',
          task: 'Muestra solo los 3 primeros usuarios, con <code>users.data.slice(0, 3)</code>.',
          hint: '<code>&lt;li v-for="u in users.data.slice(0, 3)"&gt;</code>',
        },
        end: {
          kicker: 'Lección completada',
          title: 'Ya sabes Voodoo',
          lead:
            'Estado, llaves, eventos, campos, condiciones, listas, JSX y una petición: casi todo lo que necesita ' +
            'una página real, y todo cabe en un archivo HTML.',
          score: 'Tareas completadas: {n} de {total}',
          play: 'Abrir el playground',
          docs: 'Leer la documentación',
          examples: 'Ver los ejemplos',
          restart: 'Empezar de nuevo',
          next: 'Qué probar ahora',
        },
      },
    },

    ko: {
      learn: {
        kicker: '인터랙티브 레슨',
        title: '10분 만에 배우는 Voodoo',
        lead:
          '짧은 8단계, 각 단계마다 라이브 에디터에서 작은 과제를 풉니다. 입력하면 결과가 바로 바뀌고, ' +
          '단계는 스스로 확인됩니다. 설치할 것은 없습니다.',
        minutes: '약 10분',
        steps: '짧은 8단계',
        saved: '진행 상황은 이 브라우저에 저장됩니다',
        ui: {
          step: '{total}단계 중 {n}단계',
          progress: '레슨 진행 상황',
          jump: '{n}단계: {title}',
          task: '직접 해 보기',
          waiting: '코드를 고쳐 보세요. 입력하는 동안 단계가 스스로 확인됩니다.',
          passed: '완료! 주문이 통했습니다.',
          hint: '힌트 보기',
          answer: '정답 보기',
          reset: '이 단계 다시 시작',
          back: '이전',
          next: '다음 단계',
          skip: '건너뛰기',
          finish: '마치기',
          editor: '이 단계의 코드, 직접 고칠 수 있습니다',
          frame: '코드의 실행 결과',
          live: '실시간',
          error: '코드의 일부가 실행되지 않았습니다',
        },
        s1: {
          title: '인사하기',
          body:
            'Voodoo 페이지는 순수 HTML입니다. <code>v-data</code>는 블록의 상태를 담고, ' +
            '<code>&#123; name &#125;</code>처럼 중괄호 안에 쓴 것은 페이지에 표시되고 항상 최신으로 유지됩니다.',
          task: '<code>\'Vudu\'</code>를 여러분의 이름으로 바꿔 보세요.',
          hint: '따옴표 안의 글자를 고치세요: <code>v-data="&#123; name: \'Ana\' &#125;"</code>',
        },
        s2: {
          title: '중괄호 안에는 어떤 JavaScript든',
          body:
            '중괄호에는 어떤 JavaScript 표현식이든 쓸 수 있습니다. 계산, 메서드 호출, 삼항 연산자까지. ' +
            '반환된 값이 페이지에 나타납니다.',
          task: '<code>name.length</code>로 이름이 몇 글자인지 보여 주는 줄을 추가하세요.',
          hint: '<code>&lt;p&gt;&#123; name.length &#125; letters&lt;/p&gt;</code>',
        },
        s3: {
          title: '클릭에 반응하기',
          body:
            '<code>@click</code>은 요소를 클릭하면 문장을 실행합니다. 상태를 바꾸면, 그 상태를 읽는 ' +
            '모든 중괄호가 저절로 업데이트됩니다.',
          task: '<code>count</code>를 0으로 되돌리는 두 번째 버튼을 추가하세요.',
          hint: '<code>&lt;button @click="count = 0"&gt;Reset&lt;/button&gt;</code>',
        },
        s4: {
          title: '입력 연결하기',
          body:
            '<code>v-model</code>은 입력란을 상태의 한 부분과 연결합니다. 입력하면 상태가 바뀌고, ' +
            '상태를 바꾸면 입력란이 바뀝니다.',
          task: '<code>spell.length</code>로 입력한 글자 수를 보여 주세요.',
          hint: '<code>&lt;p&gt;&#123; spell.length &#125; characters&lt;/p&gt;</code>',
        },
        s5: {
          title: '보이기와 숨기기',
          body:
            '<code>v-if</code>는 표현식이 참인 동안에만 요소를 페이지에 남깁니다. 바로 뒤의 ' +
            '<code>v-else</code>가 나머지 경우를 맡습니다.',
          task: '<code>v-else</code>로 상자가 닫혀 있다고 알려 주는 문단을 추가하세요.',
          hint: '<code>&lt;p v-else&gt;The chest is closed.&lt;/p&gt;</code>',
        },
        s6: {
          title: 'v-for로 반복하기',
          body:
            '<code>v-for</code>는 배열의 항목마다 요소를 한 번씩 반복합니다. 버튼처럼 배열에 항목을 넣으면 ' +
            '새 줄이 나타납니다.',
          task: '<code>v-data</code>의 배열에 네 번째 물약을 추가하세요.',
          hint: '<code>potions: [\'Sleep\', \'Speed\', \'Luck\', \'Fire\']</code>',
        },
        s7: {
          title: '순수 HTML 안의 JSX',
          body:
            '페이지에 JSX를 바로 쓸 수도 있습니다. <code>.map()</code>이 요소를 반환하고, 빌드 단계는 ' +
            '없습니다. 앞의 목록과 같은 목록을 JavaScript로 쓴 것입니다.',
          task:
            '4글자보다 긴 물약만 보여 주세요. <code>.map()</code> 앞에 <code>.filter()</code>를 추가하면 ' +
            '됩니다.',
          hint: '<code>potions.filter(p =&gt; p.length &gt; 4).map(p =&gt; &lt;li&gt;&#123; p &#125;&lt;/li&gt;)</code>',
        },
        s8: {
          title: '데이터 가져오기',
          body:
            '<code>v-resource</code>는 URL을 요청하고 <code>loading</code>, <code>error</code>, ' +
            '<code>data</code>를 모두 반응형으로 제공합니다. Promise를 다룰 필요도, 추가 상태도 없습니다.',
          task: '<code>users.data.slice(0, 3)</code>으로 처음 3명의 사용자만 보여 주세요.',
          hint: '<code>&lt;li v-for="u in users.data.slice(0, 3)"&gt;</code>',
        },
        end: {
          kicker: '레슨 완료',
          title: '이제 Voodoo를 알고 있습니다',
          lead:
            '상태, 중괄호, 이벤트, 입력, 조건, 목록, JSX, 그리고 요청. 실제 페이지에 필요한 것의 대부분이며, ' +
            '모두 HTML 파일 하나에 들어갑니다.',
          score: '완료한 과제: {total}개 중 {n}개',
          play: '플레이그라운드 열기',
          docs: '문서 읽기',
          examples: '예제 보기',
          restart: '처음부터 다시',
          next: '다음에 해 볼 것',
        },
      },
    },
  };
})();
