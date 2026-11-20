# Cómo se programa en Dubbipt

Pedido de sala (con un video de las «reglas de Karpathy»): «a partir de ahora
quiero que programes así». Son cuatro reglas y mandan sobre cualquier costumbre.

## Las cuatro reglas

1. **Piensa antes de programar.**
   Lee el código que vas a tocar y lo que lo llama antes de escribir nada.
   Entiende qué se pide de verdad; si el pedido admite dos lecturas que dan
   resultados distintos, pregunta antes de programar (no después). Ten claro
   cómo vas a comprobar que funciona antes de empezar.

2. **Solo lo pedido, de la forma más simple.**
   Nada de funciones, opciones, botones o pantallas que nadie pidió. Primero se
   reutiliza lo que ya hay (si existe una pieza parecida, se usa esa). Sin capas
   ni abstracciones nuevas si el cambio cabe en lo de siempre. Las ideas de más
   se proponen en el informe, en una línea; no se programan.

3. **Toca solo lo necesario.**
   El cambio más pequeño que resuelve el pedido. No se reformatea, no se
   renombra y no se «limpia» código que no tiene que ver. No se tocan archivos
   ajenos al pedido. Si ves un fallo aparte, dilo en el informe; no lo arregles
   de paso, salvo que impida hacer lo pedido.

4. **Revisa antes de decir «listo».**
   Corre las comprobaciones (abajo), prueba el caso real cuando se pueda (el
   archivo que mandó la sala, la aplicación en el navegador) y relee el diff
   buscando lo que sobra. El informe dice con honestidad qué se probó y qué no.

## Las comprobaciones

- `node pruebas/correr.js` — todo en verde.
- `node herramientas/tema.js --comprobar` — si cambió el CSS de `index.html`,
  regenerar con `node herramientas/tema.js`.
- `node convertidor-qc/construir.js --comprobar` — si cambió `js/qcpdf.js` o
  los tipos de QC, reconstruir.

## Cada cambio, publicado igual

1. Empezar desde `main` al día en la rama de trabajo de la sesión.
2. Subir `APP_VER_NUM` en `index.html` y `VERSION` (línea 2) en `sw.js`.
3. Una fila en `especificacion/` con el pedido de sala, lo hecho y lo probado.
4. Las comprobaciones, en verde.
5. Commit, PR a `main` y fusión con squash.
6. Informe en castellano, en palabras sencillas: qué cambió, cómo se usa,
   qué se probó y qué no.

## Lo que no se hace nunca

- Las marcas de training se ponen solo a mano en el programa: nada de
  automatizarlas.
- Ningún dato personal del usuario sale hacia servicios externos.
