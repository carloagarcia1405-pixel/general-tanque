# Operación Caribe (antes "General Tanque") — v0.3

Juego móvil 2D estilo Survivor.io, parodia: El Presi sube a su tanque para liberar la isla ficticia
de Jaibití de La Banda del Tiburón. 3 zonas de 15 minutos, cada una con oleadas, mini jefes y jefe final.

## Correr
    python -m http.server 8810 --bind 0.0.0.0
PC: http://localhost:8810 · celular en la misma red: http://IP-DE-LA-PC:8810

## Dónde está cada cosa
- `js/data.js` — nombres, textos, armas, enemigos, calendario de los stages y balance. Se cambia ahí.
- `js/core.js` — guardado, estadísticas, botones y sonido.
- `js/game.js` — la partida. `js/game-ui.js` — marcador, subir de nivel, cofres, pausa, final.
- `js/menus.js` — batalla (elegir zona), historia, equipo y taller.
- `art/raw/` — hojas originales generadas en Higgsfield (no van a git).
- `tools/build_art.py` — corta las hojas y genera `assets/img/` + `assets/manifest.js`.

## Parámetros de prueba (en la URL)
`?min=3` stage de 3 minutos · `?stage=2&bot=1` piloto automático · `?speed=10` acelera ·
`?god=1` sin daño · `?bosshp=0.1` jefe final con 10% de vida · `?scene=Equip` abre esa pantalla.
`tools/_bot.html` (copiarlo a la raíz para usarlo) muestra el registro del piloto y los errores.
