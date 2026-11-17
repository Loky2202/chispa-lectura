// Mundo 6 · Bosque Mágico de las Frases (m4): primeras frases, solo con sílabas ya enseñadas.
// Desarrollado por Christopher Flores
export const frases = {
  id: 'frases', title: 'Bosque de las Frases', subtitle: 'Lee tus primeras frases', emoji: '✨', theme: 'magic',
  lessons: [
    { id: 'm4-l1', title: 'Mi familia', emoji: '👨‍👩‍👦', goal: 'Leer frases sobre mi familia', pics: 3, reads: 2,
      sents: [['Mi mamá me da jugo.', 'mamá'], ['Mi papá usa la moto.', 'papá'], ['Papá me lleva a la casa.', 'casa', '¿A dónde me lleva papá?'],
        ['Mi mamá me mima.', null], ['Yo amo a mi papá.', null]] },
    { id: 'm4-l2', title: 'Animales', emoji: '🐾', goal: 'Leer frases sobre animales', pics: 3, reads: 2,
      sents: [['El gato mira la luna.', 'gato'], ['La jirafa come hoja.', 'jirafa'], ['La rana sale de la casa.', 'rana'],
        ['El mono mira la moto.', null], ['La vaca come uva.', null]] },
    { id: 'm4-l3', title: 'La noche', emoji: '🌙', goal: 'Leer frases sobre la noche', pics: 3, reads: 2,
      sents: [['La luna sale de noche.', 'luna'], ['La nena toma leche de noche.', 'nena'], ['El sapo mira la luna.', 'sapo'],
        ['La noche es bella.', null], ['Papá me da un beso de noche.', null]] },
    { id: 'm4-l4', title: 'Yo veo', emoji: '👀', goal: 'Leer frases con “yo veo”', pics: 3, reads: 2,
      sents: [['Yo veo una moto.', 'moto'], ['Yo veo un pato.', 'pato'], ['Yo veo la luna.', 'luna'],
        ['Yo veo una rosa y una pera.', null], ['Yo veo a mi mamá y a mi papá.', null]] },
    { id: 'm4-l5', title: 'Carros y Chispa', emoji: '🚗', goal: 'Leer frases con Chispa', sight: ['chispa'], pics: 3, reads: 2,
      sents: [['Chispa mira el carro rojo.', 'carro'], ['Chispa corre con el perro.', 'perro', '¿Con quién corre Chispa?'], ['Chispa usa una moto roja.', 'moto'],
        ['El carro rojo corre.', null], ['Chispa va a la casa.', null]] },
    { id: 'm4-l6', title: 'Comprendo lo que leo', emoji: '🧠', goal: 'Leer frases más largas y entenderlas', pics: 3, reads: 2,
      sents: [['El niño come piña y la nena toma jugo.', 'niño'], ['La rata come queso y el gato la mira.', 'rata'],
        ['El payaso usa un gorro rojo.', 'payaso'], ['Mamá me da la cena y un beso.', null],
        ['El nene mira la luna de la casa.', null]] }
  ]
}
