# Convertidor QC

`convertidor-qc.html` (en la raíz) es el **Convertidor PDF QC** de Dubbipt en un
solo archivo: se abre con **doble clic**, sin servidor, **sin internet** y sin
cuenta. Se puede copiar a un pendrive o mandar por correo.

Se sueltan informes de QC en PDF, el TXT de marcadores de Pro Tools («Export
Session Info as Text») o un llamado de actores, y sale un PDF A4 limpio por
cada uno, sin cambiar ni una palabra. Con una imagen (el póster), el informe
sale en escala de grises. Las reglas son las de
[`especificacion/09-qc-informes.md`](../especificacion/09-qc-informes.md).

Los archivos no salen del ordenador: todo se hace en el navegador.

## No es una copia

Lleva dentro **el mismo `js/qcpdf.js`** de la aplicación y, de `index.html`,
los cuatro tipos de corrección. Así que lo que haga el convertidor de la
aplicación lo hace este, y al revés.

Por eso **hay que reconstruirlo** cuando cambia `js/qcpdf.js` o los tipos de
corrección:

```
node convertidor-qc/construir.js              # escribe convertidor-qc.html
node convertidor-qc/construir.js --comprobar  # solo dice si está al día
```

`pruebas/convertidorqc.prueba.js` se pone en rojo si se olvida.

## Qué hay aquí

| | |
|---|---|
| `plantilla.html` | La página: la cabecera, los estilos y lo justo para que el convertidor viva solo |
| `construir.js` | Junta la plantilla, el motor y las librerías en un archivo |
| `lib/jspdf.umd.min.js` | jsPDF 2.5.1 (MIT): escribe el PDF |
| `lib/pdf.min.js`, `lib/pdf.worker.min.js` | pdf.js 3.11.174 (Apache 2.0): lee el PDF que entra |

Son las mismas versiones que la aplicación baja de internet.

## Lo que hace distinto de la aplicación

- El convertidor **es la página**, no una ventana: «Cerrar» se llama «Vaciar la
  lista» y deja la página lista para otra tanda.
- **Quién revisa** y **el estudio** se recuerdan en el equipo.
- Un archivo soltado fuera del recuadro también cuenta (no se abre en la pestaña).

## Límite conocido

Un PDF con tipografías asiáticas sin tabla de texto necesita unos mapas de
caracteres que pdf.js baja de internet; sin red, ese PDF dirá que falló. Los
informes de Pro Tools y los llamados no los necesitan.
