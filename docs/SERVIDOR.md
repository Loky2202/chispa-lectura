# Chispa en un servidor de casa (Ubuntu 24.04 + Tailscale)

Con esto la app queda encendida siempre en tu servidor y la tablet entra por
`https://`, así que funcionan el micrófono, la grabación de voces y la instalación como
app. La dirección solo la ven tus dispositivos: no se publica nada en internet.

Los comandos de esta guía se ejecutan **en el servidor Ubuntu**, salvo donde se indica.

## 1. Preparar el servidor

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
```

Cierra la sesión y vuelve a entrar para que el grupo `docker` tenga efecto. Comprueba:

```bash
docker compose version
```

## 2. Descargar la app

```bash
git clone https://github.com/Loky2202/chispa-lectura.git
cd chispa-lectura
```

> Las mejoras recientes están en la rama `mejoras-fase-1`. Si todavía no la has
> fusionado en `main`, usa `git clone -b mejoras-fase-1 …`.

Crea el archivo `.env` para que la app solo escuche dentro del servidor (el HTTPS lo
pondrá Tailscale delante):

```bash
printf 'CHISPA_BIND=127.0.0.1\n' > .env
```

## 3. Traer el progreso desde la PC

Hazlo justo antes de arrancar el servidor, para no perder lo último que jugó.

1. **En la PC:** entra a ⚙️ Padres → **Descargar copia de seguridad**. Se guarda un
   archivo `chispa-AAAA-MM-DD.db`.
2. **En la PC:** detén la app para que nadie siga jugando en la copia vieja:

   ```powershell
   docker compose down
   ```

3. **En la PC:** envía la copia al servidor (cambia `usuario`, `servidor` y la fecha):

   ```powershell
   scp $HOME\Downloads\chispa-AAAA-MM-DD.db usuario@servidor:chispa-lectura/lectura.db
   ```

4. **En el servidor:** colócala en su sitio y dale permisos. El contenedor corre con el
   usuario 1000 y necesita poder escribir en `data/`:

   ```bash
   mkdir -p data
   mv lectura.db data/lectura.db
   sudo chown -R 1000:1000 data
   ```

La copia incluye perfiles, progreso, medallas, voces grabadas y el PIN de Padres.

Si empiezas de cero, salta los pasos 1 a 3 y ejecuta solo `mkdir -p data` y el `chown`.

## 4. Arrancar

```bash
docker compose up -d --build
docker compose logs --tail 20
```

Debe aparecer `Contenido cargado: 8 mundos`. Comprueba desde el propio servidor:

```bash
curl http://localhost:3100/api/health
```

El contenedor se reinicia solo si el servidor se apaga y vuelve a encender.

## 5. HTTPS con Tailscale

1. Crea una cuenta en <https://tailscale.com> (el plan gratuito alcanza).
2. En la consola de administración, sección **DNS**, activa **MagicDNS** y
   **HTTPS Certificates**.
3. Instala Tailscale en el servidor y conéctalo a tu cuenta:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

4. Publica la app dentro de tu red privada:

   ```bash
   sudo tailscale serve --bg 3100
   sudo tailscale serve status
   ```

   `status` muestra la dirección, parecida a `https://servidor.tu-red.ts.net`. Esa es
   la que usarás en la tablet. La configuración se conserva al reiniciar.

## 6. La tablet

1. Instala la app **Tailscale** desde la tienda e inicia sesión con la misma cuenta.
2. Abre la dirección `https://….ts.net` en Chrome (Android) o Safari (iPad).
3. Menú del navegador → **Agregar a pantalla de inicio**.
4. La primera vez que use "leer en voz alta", acepta el permiso del micrófono.

Tailscale debe quedar activado en la tablet. Funciona igual dentro y fuera de casa.

## Mantenimiento

Actualizar a la última versión:

```bash
cd chispa-lectura
git pull
docker compose up -d --build
```

Respaldos: el servidor guarda una copia por día en `data/backups/auto-AAAA-MM-DD.db` y
conserva las últimas 14. Conviene copiar esa carpeta de vez en cuando a otro equipo:

```powershell
scp -r usuario@servidor:chispa-lectura/data/backups .\respaldos-chispa
```

Restaurar una copia:

```bash
docker compose down
cp data/backups/auto-AAAA-MM-DD.db data/lectura.db
rm -f data/lectura.db-wal data/lectura.db-shm
sudo chown -R 1000:1000 data
docker compose up -d
```

PIN de Padres olvidado: agrega `PARENT_PIN_RESET=1` al bloque `environment` de
`docker-compose.yml`, ejecuta `docker compose up -d`, crea un PIN nuevo y quita la línea.

Dejar de publicar la app en Tailscale:

```bash
sudo tailscale serve reset
```

## Si algo falla

- **`unable to open database file` en los logs:** faltan permisos; repite
  `sudo chown -R 1000:1000 data`.
- **La tablet no abre la dirección:** revisa que Tailscale esté conectado en la tablet y
  que `sudo tailscale serve status` muestre la app en el servidor.
- **Aviso de certificado no válido:** falta activar **HTTPS Certificates** en la consola
  de Tailscale; después repite `sudo tailscale serve --bg 3100`.
- **La tablet muestra la versión anterior tras actualizar:** cierra la app y ábrela de
  nuevo; la segunda vez ya carga la nueva.
