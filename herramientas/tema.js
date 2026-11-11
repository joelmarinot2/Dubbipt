/* Genera el tema claro «vidrio» de Dubbipt a partir del CSS de siempre.
 *
 *   node herramientas/tema.js              escribe tema-claro-auto.css y tema-oscuro-auto.css
 *   node herramientas/tema.js --comprobar  no escribe: sale con error si alguno no está al día
 *
 * Pedido de sala (ENT-26): «quiero cambiar la interfaz gráfica general a esta»
 * —un panel claro, de vidrio: fondo pastel, tarjetas blancas redondeadas, barra
 * y cabeceras en verde petróleo, acentos esmeralda y durazno—.
 *
 * Dubbipt nació oscuro y lleva más de dos mil colores escritos a mano en el
 * CSS de index.html. Reescribirlos uno a uno sería interminable y rompería las
 * pruebas que leen ese CSS; así que el tema claro es una CAPA: este script
 * recorre cada regla del CSS de siempre y, de las declaraciones que llevan un
 * color, escribe la misma regla con el color convertido. La capa se carga
 * después (misma especificidad, gana la última) y se puede apagar: el aspecto
 * oscuro de siempre sigue ahí, intacto.
 *
 * Cómo se convierte un color (en HSL):
 *   · neutros: los fondos oscuros pasan a superficies casi blancas; las líneas,
 *     a grises verdosos claros; el texto claro, a tinta verde petróleo; un
 *     fondo claro (un botón blanco) pasa a relleno verde petróleo;
 *   · verdes de la marca: a esmeralda —relleno profundo con texto blanco,
 *     texto y bordes esmeralda sobre blanco—;
 *   · los demás (ámbar, rojo, rosa, violeta, azul): el mismo tono, con la
 *     claridad dada la vuelta para que se lean sobre blanco;
 *   · sombras negras: más suaves; los brillos de color, con su tono nuevo.
 * Además, los colores escritos en style="…" dentro del código se corrigen con
 * selectores de atributo ([style*="color:#ECE9FB"]).
 *
 * Y después: «también haz una interfaz dark». La versión oscura del mismo
 * diseño sale de aquí también (tema-oscuro-auto.css): las claridades de
 * siempre, con los negros teñidos de verde petróleo y el verde de la marca
 * pasado a menta.
 *
 * Lo que va a mano (el fondo, el vidrio, la barra en píldora) vive en
 * tema-vidrio.css, que se carga después y vale para las dos versiones.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const { convertir, convertirOscuro, leerColor, capa, familia, aHsl, esRelleno, convertirValor } = require('../js/tema.js');

/** Los <style> que no están dentro de un <script>: el CSS de la ventana principal. */
function estilosEstaticos(html){
  const scripts = [];
  for(const m of html.matchAll(/<script\b[\s\S]*?<\/script>/g)) scripts.push([m.index, m.index + m[0].length]);
  const out = [];
  for(const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)){
    if(scripts.some(([a, b]) => m.index >= a && m.index < b)) continue;
    out.push(m[1]);
  }
  return out;
}

/**
 * Los colores escritos en style="…" dentro del código (los que arma el JS):
 * una hoja no puede pisarlos salvo con !important y un selector de atributo.
 */
function capaEnLinea(fuentes, modo){
  const vistos = new Map();
  const RE = /(color|background(?:-color)?|border(?:-(?:top|bottom|left|right))?(?:-color)?)\s*:\s*([^;"'<>\\]*?(#[0-9a-fA-F]{3,8}\b)[^;"'<>\\]*)/g;
  for(const t of fuentes){
    for(const st of t.matchAll(/style=\\?["']([^"'\\]*#[0-9a-fA-F]{3,8}[^"'\\]*)/g)){
      for(const m of st[1].matchAll(RE)){
        const trozo = m[0].trim();
        if(/url\(|\+|\$\{/.test(trozo)) continue;
        if(!vistos.has(trozo)) vistos.set(trozo, { prop: m[1].trim(), valor: m[2].trim() });
      }
    }
  }
  let out = '';
  for(const [trozo, d] of [...vistos.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)){
    const n = convertirValor(d.prop, d.valor, false, modo);
    if(n == null || n === d.valor) continue;
    out += '[style*="' + trozo.replace(/"/g, '\\"') + '"]{' + d.prop + ':' + n + ' !important}\n';
  }
  return out;
}

/* El Video Estudio (video, controles, onda, ADR, sala, formatos): un panel oscuro en los dos temas, porque la
   onda y lo que se pinta sobre el video están hechos para fondo oscuro. */
const ESTUDIO = /(^|[\s>+~,(])(#st[A-Z][\w-]*|\.st-[\w-]+|\.adr-[\w-]+|\.sala-[\w-]+|\.io-[\w-]+)/;

function generar(modo){
  modo = modo === 'oscuro' ? 'oscuro' : 'claro';
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const bloques = estilosEstaticos(html);
  let css = '/* GENERADO por herramientas/tema.js a partir del CSS de index.html (versión ' + modo + '). No editar a mano:\n'
          + '   lo que se quiera cambiar va en tema-vidrio.css, o en la conversión de herramientas/tema.js. */\n';
  for(const b of bloques) css += capa(b, modo, { oscuroSi: ESTUDIO });
  /* El código de la ventana principal: index.html y los módulos. */
  const fuentes = [html];
  for(const f of fs.readdirSync(path.join(RAIZ, 'js')).sort()) if(/\.js$/.test(f)) fuentes.push(fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8'));
  css += '/* Colores escritos en style="…" por el código. */\n' + capaEnLinea(fuentes, modo);
  return css;
}
const SALIDAS = { claro: path.join(RAIZ, 'tema-claro-auto.css'), oscuro: path.join(RAIZ, 'tema-oscuro-auto.css') };

if(require.main === module){
  let mal = 0;
  for(const modo of ['claro', 'oscuro']){
    const css = generar(modo), archivo = SALIDAS[modo], nombre = path.basename(archivo);
    if(process.argv.includes('--comprobar')){
      const hay = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '';
      if(hay !== css){ console.error(nombre + ' no está al día: corre `node herramientas/tema.js`'); mal++; }
      else console.log(nombre + ' está al día');
    }else{
      fs.writeFileSync(archivo, css, 'utf8');
      console.log(nombre + ' · ' + Math.round(css.length / 1024) + ' KB · ' + css.split('\n').length + ' reglas');
    }
  }
  if(mal) process.exit(1);
}

module.exports = { generar, capaEnLinea, estilosEstaticos, SALIDAS, ESTUDIO };
