// Mundo 3 · Sílabas (m2): primeras consonantes con sus cinco vocales.
// Cada lección solo usa letras ya enseñadas + palabras mágicas (sight).
// `extra`: palabras sin imagen que solo se usan para unir sílabas y para el dictado.
// Desarrollado por Christopher Flores
export const silabas = {
  id: 'silabas', title: 'Valle de las Sílabas', subtitle: 'Ma, pa, sa, la...', emoji: '🏞️', theme: 'valley',
  lessons: [
    { id: 'm2-l1', title: 'La letra M', emoji: '🐒', goal: 'Leer ma me mi mo mu', unlock: ['m', 'tilde'],
      syl: ['ma', 'me', 'mi', 'mo', 'mu'], words: ['mamá'], extra: ['mima', 'ama', 'mami', 'amo', 'mío'],
      sents: [['Mi mamá me ama.', 'mamá'], ['Mamá me mima.', null]] },
    { id: 'm2-l2', title: 'La letra P', emoji: '🐧', goal: 'Leer pa pe pi po pu', unlock: ['p'],
      syl: ['pa', 'pe', 'pi', 'po', 'pu'], words: ['papá', 'mapa'], extra: ['pipa', 'papa', 'puma', 'pomo', 'mopa'],
      sents: [['Mi papá ama a mamá.', 'papá'], ['Papá me mima.', null]] },
    { id: 'm2-l3', title: 'La letra S', emoji: '🐍', goal: 'Leer sa se si so su', unlock: ['s'], sight: ['es'],
      syl: ['sa', 'se', 'si', 'so', 'su'], words: ['sopa', 'oso', 'sapo'], extra: ['mesa', 'masa', 'piso', 'suma', 'peso'],
      sents: [['Mamá me pasa sopa.', 'sopa'], ['Es mi oso.', 'oso'], ['Es mi mapa.', null]] },
    { id: 'm2-l4', title: 'La letra L', emoji: '🌙', goal: 'Leer la le li lo lu', unlock: ['l'], sight: ['el'],
      syl: ['la', 'le', 'li', 'lo', 'lu'], words: ['lupa', 'pila', 'palo', 'pelo'], extra: ['pala', 'sala', 'lima', 'mula', 'ola', 'malo'],
      sents: [['El oso usa la lupa.', 'oso'], ['Mamá me pasa la sopa.', 'sopa'], ['El sapo sale.', null]] },
    { id: 'm2-r1', title: 'Repaso: m, p, s, l', emoji: '🎈', goal: 'Repasar las sílabas con m, p, s y l',
      review: ['m2-l1', 'm2-l2', 'm2-l3', 'm2-l4'], extra: ['mesa', 'pala', 'suma', 'lima', 'piso'],
      sents: [['El sapo pisa el palo.', 'sapo'], ['Mi mamá sala la sopa.', null]] },
    { id: 'm2-l5', title: 'La letra T', emoji: '🐢', goal: 'Leer ta te ti to tu', unlock: ['t'], sight: ['un'],
      syl: ['ta', 'te', 'ti', 'to', 'tu'], words: ['pato', 'lata', 'moto', 'tomate', 'pelota'], extra: ['tapa', 'pata', 'topo', 'tela', 'maleta'],
      sents: [['El pato toma sopa.', 'pato'], ['Papá pisa la lata.', 'lata'], ['Un pato pisa la pila.', null]] },
    { id: 'm2-l6', title: 'La letra N', emoji: '🎵', goal: 'Leer na ne ni no nu', unlock: ['n'], sight: ['con'],
      syl: ['na', 'ne', 'ni', 'no', 'nu'], words: ['mano', 'mono', 'nena', 'nene', 'nota', 'luna', 'lana'], extra: ['pino', 'mina', 'pena', 'sano'],
      sents: [['La nena toma sopa.', 'nena'], ['El nene pasa la pelota.', 'nene'], ['La luna sale.', null]] },
    { id: 'm2-l7', title: 'La letra D', emoji: '🎲', goal: 'Leer da de di do du', unlock: ['d'],
      syl: ['da', 'de', 'di', 'do', 'du'], words: ['dado', 'dedo', 'dona', 'soda', 'moneda'],
      sents: [['Papá toma soda.', 'soda'], ['La dona es de mamá.', 'dona'], ['El dado es de la nena.', null]] },
    { id: 'm2-l8', title: 'La letra R', emoji: '🐸', goal: 'Leer ra re ri ro ru', unlock: ['r'], sight: ['y'],
      syl: ['ra', 're', 'ri', 'ro', 'ru'], words: ['pera', 'rana', 'rosa', 'toro', 'rata', 'mariposa'],
      sents: [['Mamá pela la pera.', 'pera'], ['El toro mira la rosa.', 'toro'], ['Mi mamá me da una rosa.', null]] },
    { id: 'm2-l9', title: 'Repaso de sílabas', emoji: '🏅', goal: 'Repasar todas las sílabas',
      review: ['m2-l1', 'm2-l2', 'm2-l3', 'm2-l4', 'm2-l5', 'm2-l6', 'm2-l7', 'm2-l8'],
      sents: [['La luna sale y el pato la mira.', null]] }
  ]
}
