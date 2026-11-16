// Mundo 8 · Castillo de los Cuentos (m6): lectura de cuentos con preguntas de comprensión.
// Desarrollado por Christopher Flores
const S = (id, title, emoji, goal, pages, qs) => ({ id, title, emoji, goal, story: { title, pages, qs } })
export const cuentos = {
  id: 'cuentos', title: 'Castillo de los Cuentos', subtitle: 'Lee y comprende', emoji: '🏰', theme: 'castle',
  lessons: [
    S('m6-l1', 'El pato y la luna', '🦆', 'Leer y comprender un cuento corto',
      [['El pato nada en el lago.', '🦆'], ['Ve la luna en el agua.', '🌙'], ['La luna tiembla.', '💧'], ['El pato se ríe.', '😄'],
        ['El pato mira la luna y se va a dormir.', '😴']],
      [['¿Dónde nada el pato?', 'lago', 'casa', 'carro'], ['¿Qué ve el pato?', 'la luna', 'un gato', 'un tren']]),
    S('m6-l2', 'Chispa y el carro rojo', '🚗', 'Leer un cuento con Chispa',
      [['Chispa tiene un carro rojo.', '🚗'], ['El carro corre y corre.', '💨'], ['Chispa ve una piedra.', '🪨'], ['Chispa frena el carro.', '🛑'],
        ['La piedra no se mueve.', '🪨'], ['Chispa rodea la piedra y sigue.', '↪️'], ['Chispa llega a la casa.', '🏠']],
      [['¿De qué color es el carro?', 'rojo', 'azul', 'verde'], ['¿Qué ve Chispa?', 'una piedra', 'un perro', 'una rana']]),
    S('m6-l3', 'La rana saltarina', '🐸', 'Leer y comprender',
      [['La rana vive en un lago.', '🐸'], ['Salta, salta y salta.', '💦'], ['Una mosca pasa cerca.', '🪰'], ['La rana salta y la come.', '😋'],
        ['Ahora la rana tiene sueño.', '😴'], ['La rana se duerme en una hoja.', '🍃']],
      [['¿Dónde vive la rana?', 'en un lago', 'en una casa', 'en un carro'], ['¿Qué come la rana?', 'una mosca', 'una pera', 'un pato']]),
    S('m6-l4', 'El dragón que no sabía volar', '🐉', 'Leer y comprender un cuento más largo',
      [['Un dragón verde no sabía volar.', '🐉'], ['El dragón mira a las aves.', '🐦'], ['Él quiere volar como ellas.', '🌤️'],
        ['Salta, mueve las alas y sube.', '🦅'], ['¡Lo logra! El dragón vuela.', '🎉'], ['Ahora el dragón es feliz.', '😊']],
      [['¿De qué color es el dragón?', 'verde', 'rojo', 'azul'], ['¿Qué quiere hacer el dragón?', 'volar', 'correr', 'comer']]),
    S('m6-l5', 'El tesoro del garaje', '🗺️', 'Seguir pistas y comprender',
      [['Chispa tiene un mapa.', '🗺️'], ['El mapa dice: busca en el garaje.', '🔍'], ['Chispa abre la puerta.', '🚪'],
        ['Dentro hay una caja roja.', '📦'], ['Chispa abre la caja.', '🎁'], ['Hay una moneda de oro.', '🪙'], ['Chispa es muy feliz.', '😄']],
      [['¿Qué tiene Chispa?', 'un mapa', 'un pato', 'una vaca'], ['¿Qué hay en la caja?', 'una moneda', 'un gato', 'una pera']]),
    S('m6-l6', 'La jirafa y la lluvia', '🦒', 'Leer y ordenar lo que pasa',
      [['La jirafa mira el cielo.', '🦒'], ['El cielo se pone gris.', '☁️'], ['Cae la lluvia.', '🌧️'], ['La jirafa corre a su casa.', '🏠'],
        ['La jirafa toma leche con pan.', '🥛'], ['Después sale el sol.', '☀️']],
      [['¿Qué mira la jirafa?', 'el cielo', 'un pez', 'un tren'], ['¿Qué sale después?', 'el sol', 'la luna', 'un perro']]),
    S('m6-l7', 'Chispa y la mariposa', '🦋', 'Leer con calma y comprender',
      [['Una mariposa azul vuela cerca de Chispa.', '🦋'], ['Chispa quiere verla.', '👀'], ['La mariposa se pone en una flor.', '🌸'],
        ['Chispa va muy despacio.', '🐢'], ['La mariposa no se asusta.', '😌'], ['Chispa sonríe y la mira volar.', '😊']],
      [['¿De qué color es la mariposa?', 'azul', 'roja', 'verde'], ['¿Dónde se pone?', 'en una flor', 'en un carro', 'en una moto']]),
    S('m6-l8', 'El cumpleaños de mamá', '🎂', 'Leer una historia de familia',
      [['Hoy es el cumpleaños de mamá.', '🎂'], ['Papá y yo hacemos una torta.', '👨‍🍳'], ['La torta tiene fresas y crema.', '🍓'],
        ['Mamá abre la puerta.', '🚪'], ['¡Sorpresa! Mamá sonríe.', '🎉'], ['Todos comemos torta.', '🍰'], ['Mamá me da un beso.', '💋']],
      [['¿De quién es el cumpleaños?', 'de mamá', 'de papá', 'del gato'], ['¿Qué hacen papá y yo?', 'una torta', 'una sopa', 'un taco']])
  ]
}
