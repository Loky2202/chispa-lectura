// Mundo 5 · Ciudad de las Palabras (m3): leer palabras completas (todas con sílabas directas).
// Desarrollado por Christopher Flores
export const palabras = {
  id: 'palabras', title: 'Ciudad de las Palabras', subtitle: 'Une sílabas y lee', emoji: '🏙️', theme: 'city',
  lessons: [
    { id: 'm3-l1', title: 'Palabras de dos sílabas', emoji: '✌️', goal: 'Leer palabras de 2 sílabas',
      words: ['pato', 'mano', 'luna', 'casa', 'sopa', 'rana', 'mono', 'taco', 'gato', 'cama'],
      count: ['pato', 'casa', 'mono'], pattern: ['read', 'count', 'build', 'read', 'hear', 'count', 'read', 'build', 'hear', 'miss', 'count'] },
    { id: 'm3-l2', title: 'Con M y P', emoji: '🅿️', goal: 'Leer palabras con m y p',
      words: ['mapa', 'mamá', 'papá', 'mono', 'pera', 'cama', 'moto', 'pelota', 'piña', 'pila'] },
    { id: 'm3-l3', title: 'Con L, T, N, D, R', emoji: '🔤', goal: 'Leer palabras con l, t, n, d, r',
      words: ['luna', 'lata', 'nota', 'dado', 'rata', 'toro', 'lana', 'pelota', 'tomate', 'moneda'] },
    { id: 'm3-l4', title: 'Familias de palabras', emoji: '👪', goal: 'Agrupar palabras por categoría', audioOnly: false,
      odd: [
        ['¿Cuál no es un animal?', ['pato', 'gato'], 'moto'],
        ['¿Cuál no es una comida?', ['pera', 'uva'], 'casa'],
        ['¿Cuál no es parte del cuerpo?', ['mano', 'ojo'], 'sopa'],
        ['¿Cuál no es un animal?', ['vaca', 'rana'], 'luna'],
        ['¿Cuál no es ropa?', ['gorro', 'zapato'], 'foca'],
        ['¿Cuál no es comida?', ['piña', 'coco'], 'pelota']
      ], pattern: ['odd'], max: 6 },
    { id: 'm3-l5', title: 'Tres sílabas', emoji: '3️⃣', goal: 'Leer palabras de 3 sílabas',
      words: ['tomate', 'pelota', 'camisa', 'zapato', 'cereza', 'moneda', 'sirena', 'corona', 'anillo', 'mochila'],
      count: ['tomate', 'pelota', 'camisa', 'zapato'], pattern: ['count', 'read', 'count', 'build', 'hear', 'read', 'count', 'build', 'miss'] },
    { id: 'm3-l6', title: 'Palabras con ch, ll, rr', emoji: '✨', goal: 'Leer palabras con ch, ll y rr',
      words: ['leche', 'noche', 'mochila', 'pollo', 'gallo', 'silla', 'carro', 'perro', 'zorro', 'llave', 'torre'] },
    { id: 'm3-l7', title: 'Construir palabras', emoji: '🧱', goal: 'Armar palabras largas letra por letra',
      custom: ['mariposa', 'pelota', 'tomate', 'camisa', 'zapato', 'cereza', 'teléfono', 'sirena'].slice(0, 6)
        .map((w) => ({ A }) => A.build(w)) },
    { id: 'm3-l8', title: 'Dictado con voz', emoji: '🎧', goal: 'Escuchar y reconocer palabras escritas',
      hear: [['pato', ['gato', 'palo']], ['mano', ['mono', 'mapa']], ['cama', ['lana', 'rana']],
        ['perro', ['carro', 'zorro']], ['boca', ['bota', 'moto']], ['pera', ['pila', 'pata']], ['luna', ['cuna', 'lona']]],
      pattern: ['hear'], max: 7 }
  ]
}
