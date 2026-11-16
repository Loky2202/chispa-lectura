// Mundo 7 · Montaña (m5): sílabas inversas, trabadas, diptongos y palabras largas.
// Desarrollado por Christopher Flores
export const montana = {
  id: 'montana', title: 'Montaña de los Retos', subtitle: 'Sílabas difíciles', emoji: '⛰️', theme: 'mountain',
  lessons: [
    { id: 'm5-l1', title: 'Inversas con N y M', emoji: '🥭', goal: 'Leer an, en, in, on, un', unlock: ['-n', '-m'],
      syl: ['an', 'en', 'in', 'on', 'un', 'am', 'em', 'im'], words: ['pan', 'mango', 'bomba', 'banco', 'limón', 'ratón', 'melón', 'mundo'],
      sents: [['Mamá me da pan.', 'pan'], ['Un mono come mango.', 'mono'], ['El ratón come queso.', 'ratón'], ['El mundo es bello.', null]] },
    { id: 'm5-l2', title: 'Inversas con R', emoji: '💌', goal: 'Leer ar, er, ir, or, ur', unlock: ['-r'],
      syl: ['ar', 'er', 'ir', 'or', 'ur'], words: ['carta', 'torta', 'arco', 'cerdo', 'mar', 'tambor'],
      sents: [['Papá me da una carta.', 'carta'], ['La torta es de mamá.', 'torta'], ['El cerdo mira el mar.', null]] },
    { id: 'm5-l8', title: 'Inversas con S', emoji: '🪰', goal: 'Leer as, es, is, os, us y plurales', unlock: ['-s'],
      syl: ['as', 'es', 'is', 'os', 'us'], words: ['mosca', 'pasta', 'isla', 'escoba', 'bosque', 'pescado'],
      sents: [['Los gatos comen pescado.', 'gato'], ['Las ranas comen moscas.', 'rana'], ['El niño usa la escoba.', 'escoba'],
        ['Los perros corren en el bosque.', null]] },
    { id: 'm5-l9', title: 'Terminan en L y Z', emoji: '☀️', goal: 'Leer al, el, il, ol, ul y palabras con z al final', unlock: ['-l', '-z', '-d'],
      syl: ['al', 'el', 'il', 'ol', 'ul'], words: ['sol', 'papel', 'pastel', 'azul', 'caracol', 'farol', 'pez', 'arroz'],
      sents: [['El sol sale en la mañana.', 'sol'], ['El pez es azul.', 'pez'], ['Papá come arroz con pollo.', null]] },
    { id: 'm5-l3', title: 'Trabadas con L', emoji: '🌸', goal: 'Leer bla, ble, pla, fla, gla, cla...', unlock: ['bl', 'cl', 'fl', 'gl', 'pl'],
      syl: ['bla', 'ble', 'bli', 'blo', 'blu', 'pla', 'ple', 'pli', 'plo', 'plu', 'fla', 'fle', 'fli', 'flo', 'flu', 'gla', 'glo', 'cla', 'clo'],
      words: ['blusa', 'plato', 'flor', 'globo', 'pluma', 'plátano', 'flecha', 'playa', 'cable', 'bloque'],
      sents: [['La blusa es azul.', 'blusa'], ['Papá me da un globo.', 'globo'], ['La nena toma sopa en el plato.', null]] },
    { id: 'm5-l4', title: 'Trabadas con R', emoji: '🐯', goal: 'Leer bra, tra, dra, fra, gra, pra, cra...', unlock: ['br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr'],
      syl: ['bra', 'bre', 'bri', 'bro', 'bru', 'tra', 'tre', 'tri', 'tro', 'tru', 'dra', 'dre', 'dri', 'dro', 'fra', 'fre', 'fri', 'fro',
        'gra', 'gre', 'gri', 'gro', 'pra', 'pre', 'pri', 'pro', 'cra', 'cre', 'cri', 'cro'],
      words: ['libro', 'fresa', 'grillo', 'tigre', 'cebra', 'brazo', 'trompeta', 'dragón', 'abrigo', 'tren'],
      sents: [['El tigre y la cebra miran el tren.', 'tren', '¿Qué miran el tigre y la cebra?'], ['La nena come una fresa.', 'fresa'], ['Papá me da un libro.', null]] },
    { id: 'm5-l5', title: 'Diptongos', emoji: '🌧️', goal: 'Leer ia, ie, io, ua, ue, ai, au, ei', sight: ['hay', 'muy', 'hoy'],
      unlock: ['ia', 'ie', 'io', 'ua', 'ue', 'ai', 'au', 'ei', 'oi', 'ui'],
      syl: ['ia', 'ie', 'io', 'ua', 'ue', 'ui', 'ai', 'au', 'ei'],
      words: ['tierra', 'nieve', 'piano', 'radio', 'huevo', 'fuego', 'puerta', 'cuatro', 'lluvia', 'aire', 'auto'],
      sents: [['La lluvia cae en la tierra.', 'lluvia'], ['El auto es de mi papá.', 'auto'], ['Mamá toma agua.', null], ['El piano suena bien.', null]] },
    { id: 'm5-l10', title: 'Ge, gi y gue, gui', emoji: '🎸', goal: 'Leer ge gi (suena je ji) y gue gui', unlock: ['ge', 'gu'], intro: { letter: 'g', note: 'Ge y gi suenan como je y ji. En gue y gui, la u no suena.' },
      syl: ['ge', 'gi', 'gue', 'gui'], words: ['girasol', 'guitarra', 'águila', 'genio', 'gelatina'],
      sents: [['El genio usa la guitarra.', 'genio'], ['El águila mira el girasol.', 'águila'], ['El niño come gelatina.', null]] },
    { id: 'm5-l6', title: 'Palabras largas', emoji: '🦋', goal: 'Leer palabras de 4 sílabas',
      words: ['mariposa', 'elefante', 'bicicleta', 'teléfono', 'cocodrilo', 'hipopótamo', 'mariquita', 'tomate'],
      count: ['mariposa', 'elefante', 'bicicleta', 'cocodrilo'],
      pattern: ['count', 'read', 'build', 'count', 'hear', 'read', 'count', 'build', 'miss'],
      sents: [['La mariposa es bella.', 'mariposa'], ['El elefante es grande.', 'elefante'], ['El cocodrilo come pescado.', null]] },
    { id: 'm5-l7', title: 'La bruja y el dragón', emoji: '🧙‍♀️', goal: 'Leer un cuento y responder',
      story: {
        title: 'La bruja y el dragón',
        pages: [['La bruja vive en un bosque.', '🧙‍♀️'], ['Un dragón verde vive en el cerro.', '🐉'], ['La bruja hace una sopa roja.', '🍲'],
          ['El dragón toma la sopa y sonríe.', '😄'], ['Ahora son amigos.', '🤝'], ['Los dos van al lago.', '🏞️']],
        qs: [['¿Dónde vive la bruja?', 'en un bosque', 'en un lago', 'en un carro'], ['¿Qué hace la bruja?', 'una sopa', 'un taco', 'una torta']]
      } }
  ]
}
