// Diccionario de palabras con imagen (emoji). Cada palabra debe tener un emoji
// inequívoco y distinto de los demás para no confundir al niño.
// Desarrollado por Christopher Flores
const RAW = `
manzana:🍎 hueso:🦴 rama:🌿 taza:🍵 hola:👋 arco:🏹 sapo:🐸 mamá:👩 papá:👨 nena:👧 nene:👦 bebé:👶 niño:🧒 payaso:🤡 mago:🧙 hada:🧚 amigo:🧑‍🤝‍🧑 sirena:🧜 pirata:🏴‍☠️
pato:🦆 gato:🐱 perro:🐶 rana:🐸 mono:🐵 mico:🐒 oso:🐻 vaca:🐄 toro:🐂 rata:🐀 ratón:🐭 foca:🦭 zorro:🦊 cebra:🦓 tigre:🐯
jirafa:🦒 pollo:🐔 gallo:🐓 chivo:🐐 águila:🦅 araña:🕷️ mosca:🪰 gusano:🐛 mariposa:🦋 pez:🐟 conejo:🐇 caballo:🐴 cerdo:🐖
cobra:🐍 dragón:🐉 pulpo:🐙 abeja:🐝 mariquita:🐞 caracol:🐌 grillo:🦗 loro:🦜 lobo:🐺 paloma:🕊️ león:🦁 elefante:🐘 cocodrilo:🐊 hipopótamo:🦛
pera:🍐 uva:🍇 piña:🍍 fresa:🍓 tomate:🍅 sopa:🍲 soda:🥤 café:☕ leche:🥛 queso:🧀 pan:🍞 dona:🍩 helado:🍦 mango:🥭 plátano:🍌
coco:🥥 taco:🌮 cereza:🍒 limón:🍋 melón:🍈 pastel:🍰 pasta:🍝 huevo:🥚 jugo:🧃 torta:🎂 arroz:🍚 sandía:🍉
lupa:🔍 pila:🔋 palo:🪵 lana:🧶 luna:🌙 sol:☀️ estrella:⭐ nube:☁️ lata:🥫 moto:🏍️ pelota:⚽ dado:🎲 mapa:🗺️ rosa:🌹 nota:🎵
moneda:🪙 lago:🏞️ gota:💧 caja:📦 hoja:🍃 hilo:🧵 yoyo:🪀 yate:🛥️ mochila:🎒 ocho:8️⃣ llave:🔑 silla:🪑 botella:🍾
carro:🚗 auto:🚘 torre:🗼 cerro:⛰️ gorro:🧢 cine:🎬 cebolla:🧅 maceta:🪴 cero:0️⃣ reloj:⏰ tren:🚆 libro:📖 carta:💌 mundo:🌍 bomba:💣 banco:🏦 camión:🚚
tambor:🥁 árbol:🌳 isla:🏝️ escoba:🧹 bosque:🌲 papel:📄 farol:🏮 azul:🔵 blusa:👚 plato:🍽️ flor:🌸 globo:🎈 pluma:🪶 playa:🏖️ cable:🔌
bloque:🧱 brazo:💪 trompeta:🎺 abrigo:🧥 tierra:🌎 nieve:❄️ piano:🎹 radio:📻 fuego:🔥 puerta:🚪 cuatro:4️⃣ lluvia:🌧️ aire:💨 flecha:➡️
guitarra:🎸 girasol:🌻 genio:🧞 gelatina:🍮 teléfono:📞 bicicleta:🚲 camisa:👕 zapato:👟 corona:👑 anillo:💍 peluche:🧸 cohete:🚀
tesoro:💎 vela:🕯️ foco:💡 sofá:🛋️ cama:🛏️ casa:🏠 cara:😀 boca:👄 bota:🥾 beso:💋 mano:✋ dedo:☝️ ojo:👁️ oreja:👂 uña:💅 pelo:💇 baño:🛁
moño:🎀 noche:🌃 chile:🌶️ paquete:🎁 tormenta:⛈️ bruja:🧙‍♀️ pie:🦶 ave:🐦 mar:🌊 ancla:⚓ barco:⛵ sombrero:👒 pescado:🐠
`
// Personas y animales: sirven para preguntar “¿Quién…?” (lo demás es “¿Qué…?”).
export const ANIMATE = new Set(`
mamá papá nena nene bebé niño payaso mago hada amigo sirena pirata bruja genio sapo
pato gato perro rana mono mico oso vaca toro rata ratón foca zorro cebra tigre jirafa pollo gallo chivo águila araña
mosca gusano mariposa pez conejo caballo cerdo cobra dragón pulpo abeja mariquita caracol grillo loro lobo paloma león
elefante cocodrilo hipopótamo ave
`.split(/\s+/).filter(Boolean))

// Dibujos que un niño puede confundir entre sí. Nunca aparecen juntos como
// respuesta y distractor: si leyó bien, no debe fallar por culpa del dibujo.
export const CONFUSABLE = [
  ['sapo', 'rana'], ['mono', 'mico'], ['rata', 'ratón'], ['pez', 'pescado'], ['tierra', 'mundo'],
  ['ave', 'paloma', 'águila', 'loro', 'pato', 'pollo', 'gallo'],
  ['auto', 'carro', 'camión'], ['barco', 'yate', 'ancla'], ['tren', 'camión'],
  ['mar', 'gota', 'lluvia', 'lago', 'playa', 'isla'], ['lluvia', 'tormenta', 'nube'],
  ['torta', 'pastel', 'dona', 'pan', 'gelatina'], ['plato', 'sopa', 'pasta', 'arroz'],
  ['soda', 'jugo', 'leche', 'taza', 'café', 'botella'],
  ['nena', 'nene', 'niño', 'bebé', 'amigo'], ['mamá', 'nena', 'pelo'], ['papá', 'nene', 'niño'],
  ['bruja', 'mago', 'hada', 'genio'], ['luna', 'noche'],
  ['bosque', 'árbol', 'rama', 'hoja'], ['cerro', 'tierra', 'lago'], ['flor', 'rosa', 'girasol', 'maceta'],
  ['gorro', 'sombrero', 'corona'], ['zapato', 'bota', 'pie'], ['camisa', 'blusa', 'abrigo'],
  ['mano', 'dedo', 'hola', 'uña', 'brazo'], ['cara', 'boca', 'ojo', 'payaso'],
  ['foco', 'vela', 'farol', 'fuego', 'sol'], ['piano', 'nota', 'guitarra', 'trompeta', 'tambor', 'radio'],
  ['carta', 'papel', 'paquete', 'caja', 'libro'], ['pelota', 'globo', 'yoyo'],
  ['pera', 'manzana', 'mango', 'limón', 'melón'], ['uva', 'cereza', 'fresa'], ['tomate', 'manzana', 'cebolla'],
  ['ocho', 'cuatro', 'cero'], ['moneda', 'tesoro', 'anillo'], ['araña', 'mosca', 'mariquita', 'grillo', 'abeja'],
  ['cobra', 'gusano'], ['perro', 'lobo', 'zorro'], ['gato', 'tigre', 'león'], ['caballo', 'cebra', 'vaca', 'toro', 'chivo'],
  ['pila', 'cable', 'foco'], ['palo', 'rama', 'bloque'], ['flecha', 'arco'], ['casa', 'banco', 'torre'], ['cama', 'sofá', 'silla']
]
const CONFUSED = new Map()
for (const group of CONFUSABLE) for (const a of group) for (const b of group) {
  if (a !== b) CONFUSED.set(a, (CONFUSED.get(a) ?? new Set()).add(b))
}
export const confusable = (a, b) => a === b || (CONFUSED.get(a)?.has(b) ?? false)

export const DICT = Object.fromEntries(
  RAW.split(/\s+/).filter(Boolean).map((p) => {
    const i = p.indexOf(':')
    return [p.slice(0, i), p.slice(i + 1)]
  })
)
