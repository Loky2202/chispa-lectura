# ⚡ La Aventura de Chispa

Web-app para que un niño de 6 años aprenda a leer en español jugando. Tiene 7 mundos, 47 lecciones y 159 minijuegos con voz, sonidos, estrellas, monedas, garaje de coches y medallas.

Funciona con **Docker**, guarda todo en **SQLite** dentro de un volumen (`./data`) y se puede instalar como app (PWA) en la tablet.

---

## 🚀 Arrancar con Docker

Requisitos: Docker Desktop.

```powershell
cd C:\Users\Christopher\lectura
docker compose up -d --build
```

Abre **http://localhost:3100**

Para ver logs:

```powershell
docker compose logs -f
```

Para detener:

```powershell
docker compose down
```

> El puerto 3000 de tu equipo ya lo usa el contenedor de Pomodoro, por eso esta app usa el **3100**. Si también está ocupado, cambia `3100:3000` en `docker-compose.yml`.

---

## 🎮 Primeros pasos

1. Crea un jugador (nombre + avatar).
2. Empieza en el **Bosque de los Sonidos** (Mundo 0).
3. Cada lección tiene 3-5 minijuegos. Al terminar ganas estrellas y monedas.
4. Con las monedas desbloqueas coches y stickers en el **Garaje**.
5. La zona **⚙️ Padres** está protegida con pulsación de 3 segundos y una pregunta.

Estrellas por lección:

- ⭐ Completar.
- ⭐⭐ Con 1 o 2 errores.
- ⭐⭐⭐ Sin errores.

Con 1 estrella ya se avanza: el juego nunca bloquea al niño.

---

## 🗄️ Datos y copias de seguridad

La base de datos vive en:

```
./data/lectura.db
```

Ese archivo está montado como volumen de Docker, así que **sobrevive** a reinicios y a `docker compose down`.

- Descargar copia: zona de padres → **“Descargar copia de seguridad”** (o `http://localhost:3100/api/backup`).
- Restaurar: detén el contenedor, reemplaza `data/lectura.db` por tu copia y vuelve a arrancar.
- Reiniciar el progreso de un jugador: zona de padres → **Reiniciar progreso**.

---

## 📱 Instalar en la tablet

1. Conecta la tablet a la misma red Wi-Fi que la PC.
2. Averigua la IP de la PC (ej. `192.168.1.122`).
3. Abre `http://192.168.1.122:3100` en Chrome (Android) o Safari (iPad).
4. Menú del navegador → **“Agregar a pantalla de inicio”**.

### Importante: micrófono y PWA necesitan HTTPS

Los navegadores solo permiten **micrófono** y **service worker (PWA)** en `https://` o en `localhost`. Por HTTP en la red local, el juego funciona, pero:

- El micrófono mostrará el botón **“Ya leí”** como respaldo.
- No se podrá instalar como app.

Para tener todo (micrófono + instalación), la forma más fácil es un túnel HTTPS temporal:

```powershell
# Instala cloudflared desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:3100
```

Te dará una URL `https://algo.trycloudflare.com`. Ábrela en la tablet y agrégala a la pantalla de inicio. Mientras el túnel esté encendido, esa URL es pública: úsalo solo mientras juegan y ciérralo después.

---

## 🛠️ Desarrollo local (sin Docker)

Servidor (API + estáticos):

```powershell
cd server
npm install
$env:PORT='3100'
npm run dev
```

Web con recarga en caliente:

```powershell
cd web
npm install
npm run dev
```

Abre http://localhost:5173 (Vite hace proxy de `/api` al 3100).

Compilar la web:

```powershell
cd web
npm run build
```

---

## ✏️ Editar el contenido

Todo el currículo está en **`content/worlds.json`**. Cada mundo tiene lecciones y cada lección una lista de actividades.

Tipos de actividad disponibles:

| Tipo | Qué hace |
| --- | --- |
| `listen_tap` | Suena una sílaba/letra y el niño elige |
| `word_picture` | Elige la imagen de la palabra |
| `count_syllables` | Cuenta sílabas con palmadas |
| `missing_letter` | Encuentra la vocal que falta |
| `build_word` | Ordena las letras |
| `sentence_picture` | Lee una frase y elige la imagen |
| `read_aloud` | Lee en voz alta con micrófono (o “Ya leí”) |
| `memory` | Memoria de parejas |
| `sequence` | Simón de sonidos (atención) |
| `story` | Cuento con preguntas de comprensión |
| `odd_one_out` | ¿Cuál no pertenece? |

Después de editar el JSON:

```powershell
docker compose restart
```

El contenido se vuelve a cargar al arrancar. El progreso de los jugadores no se borra.

> La carpeta `content/` está montada como volumen de solo lectura en el contenedor, por eso basta con reiniciar. Si cambias **código** (React o servidor), sí necesitas reconstruir:
>
> ```powershell
> docker compose up -d --build
> ```

---

## 🧱 Estructura

```
lectura/
├─ docker-compose.yml
├─ Dockerfile
├─ content/worlds.json      # currículo completo
├─ data/lectura.db          # SQLite (volumen)
├─ server/                  # Fastify + node:sqlite + API
└─ web/                     # React + Vite + Tailwind + PWA
```

---

## 🎨 Sobre Pikachu

El proyecto incluye a **Chispa**, una mascota original dibujada en SVG e inspirada en Pikachu (amarillo, orejas negras, mejillas rojas y cola de rayo), para no incluir imágenes con derechos de autor. Todos los personajes del contenido usan emojis.

Si quieres usar tus propias imágenes de Pikachu:

1. Guárdalas en `web/public/assets/pikachu/`.
2. Se pueden mostrar en lugar del SVG editando `web/src/components/Pikachu.tsx`.
3. Vuelve a compilar con `docker compose up -d --build`.

---

## 🧭 Roadmap

- [ ] Audios pregrabados para tablets sin voz en español.
- [ ] Más juegos de atención y memoria.
- [ ] Reporte semanal para padres.
- [ ] Modo “Mis palabras” con fotos de la familia.
- [ ] Sincronización entre dispositivos.
