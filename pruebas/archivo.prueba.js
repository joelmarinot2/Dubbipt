/* El material de archivo comparte actor · especificacion 02
 *
 * Llego de sala con IN THE EYE OF THE STORM CHASERS 307. Su desglose separa el
 * material de archivo en su propia fila:
 *
 *     MARK PEYTON              12 lineas
 *     MARK PEYTON (ARCHIVO)    19 lineas
 *
 * Y esta bien que lo separe: el archivo se factura aparte y lleva su propia
 * cuenta. Pero en pantalla es LA MISMA PERSONA, asi que el actor es el mismo, y
 * habia que asignarlo dos veces. En ese capitulo eran ONCE personajes
 * duplicados; al que se le olvidaba uno, esa fila salia en blanco en el
 * desglose.
 *
 * Medido antes de tocar nada: el Excel se lee bien -39 personajes, 27 con
 * (ARCHIVO)- y la exportacion escribe 39 de 39. No fallaba escribir: fallaba
 * tener que repartir dos veces.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El material de archivo comparte el actor del personaje';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['function castNorm(t){', '/** El número final, si lo hay'],
  ['function castClave(t){', '/** Del nombre de la hoja al archivo XML']
];

/** Monta con un reparto de mentira y devuelve las piezas y el reparto vivo. */
function conReparto(personajes){
  const charIdx = {};
  for(const p of personajes) charIdx[p.key] = Object.assign({ talent: '' }, p);
  const M = montar(RECORTES,
    ['castClave', 'castGemeloArchivo', 'castCopiarAlArchivo',
     'castSinArchivo', 'castEsArchivo'],
    { charIdx: charIdx,
      NO_REC: new Set(['X', 'ORIGINAL']),
      castVerificar: () => {},
      window: {},
      console: { warn: () => {}, log: () => {} } });
  return { M: M, charIdx: charIdx };
}

/* Los nombres tal cual vienen en el desglose que llego de sala. */
const REPARTO = [
  { key: 'MARK PEYTON',                     display: 'MARK PEYTON' },
  { key: 'MARK PEYTON (ARCHIVO)',           display: 'MARK PEYTON (ARCHIVO)' },
  { key: 'DRA TRACY FANARA',                display: 'DRA. TRACY FANARA' },
  { key: 'DRA TRACY FANARA (ARCHIVO)',      display: 'DRA. TRACY FANARA (ARCHIVO)' },
  { key: 'REED TIMMER (ARCHIVO)',           display: 'REED TIMMER (ARCHIVO)' },   // sin gemelo
  { key: 'JONATHAN PETRAMALA',              display: 'JONATHAN PETRAMALA' }       // sin gemelo
];

exports.pruebas = function(t){

  t.seccion('1 · quién es la otra cara del mismo personaje');
  const a = conReparto(REPARTO);
  t.eq('del normal al de archivo',
       a.M.castGemeloArchivo('MARK PEYTON'), 'MARK PEYTON (ARCHIVO)');
  t.eq('y del de archivo al normal',
       a.M.castGemeloArchivo('MARK PEYTON (ARCHIVO)'), 'MARK PEYTON');
  t.eq('con el punto de la abreviatura en medio, igual',
       a.M.castGemeloArchivo('DRA TRACY FANARA'), 'DRA TRACY FANARA (ARCHIVO)',
       'el desglose escribe «DRA. TRACY FANARA» y la clave va sin el punto');
  t.eq('un personaje que solo existe en archivo no tiene gemelo',
       a.M.castGemeloArchivo('REED TIMMER (ARCHIVO)'), null,
       'en ese capítulo son dieciséis, y se reparten a mano como cualquiera');
  t.eq('y uno que nunca sale de archivo, tampoco',
       a.M.castGemeloArchivo('JONATHAN PETRAMALA'), null);
  t.eq('un personaje que no existe no revienta', a.M.castGemeloArchivo('NADIE'), null);

  t.seccion('2 · el actor se copia a la fila de archivo');
  const b = conReparto(REPARTO);
  const quien = b.M.castCopiarAlArchivo('MARK PEYTON', 'SERGIO GARZON');
  t.eq('dice a quién se lo ha copiado', quien, 'MARK PEYTON (ARCHIVO)',
       'hay que decirlo: si no, el actor aparece en una fila que nadie ha tocado');
  t.eq('y la fila de archivo ya lo tiene',
       b.charIdx['MARK PEYTON (ARCHIVO)'].talent, 'SERGIO GARZON');
  t.eq('sin tocar a los demás',
       b.charIdx['JONATHAN PETRAMALA'].talent, '');

  t.seccion('3 · NUNCA se pisa un talento puesto a mano');
  /* A veces el archivo lo dobla otro actor. Ese es justo el caso en el que
     pisarlo seria peor que no copiar nada. */
  const c = conReparto(REPARTO);
  c.charIdx['MARK PEYTON (ARCHIVO)'].talent = 'JUAN D PEREZ';
  const r = c.M.castCopiarAlArchivo('MARK PEYTON', 'SERGIO GARZON');
  t.eq('no copia nada', r, null);
  t.eq('y el que había se queda',
       c.charIdx['MARK PEYTON (ARCHIVO)'].talent, 'JUAN D PEREZ');

  t.seccion('4 · quitar el talento no arrastra al de archivo');
  /* Vaciar una casilla es una correccion, no un reparto: si vaciarla borrase
     tambien la otra, se perderia trabajo sin haberlo pedido. */
  const d = conReparto(REPARTO);
  d.M.castCopiarAlArchivo('MARK PEYTON', 'SERGIO GARZON');
  const r2 = d.M.castCopiarAlArchivo('MARK PEYTON', '');
  t.eq('no hace nada', r2, null);
  t.eq('y el de archivo conserva el suyo',
       d.charIdx['MARK PEYTON (ARCHIVO)'].talent, 'SERGIO GARZON');
  /* Y con la casilla de archivo VACÍA, que es el caso que de verdad separa
     «no hay nada que copiar» de «no se pisa lo que hay»: sin esto, las dos
     guardas se tapaban entre sí y una podía desaparecer sin que nada se
     pusiera rojo. Se vio mutando. */
  const d2 = conReparto(REPARTO);
  t.eq('vaciar con la otra vacía tampoco hace nada',
       d2.M.castCopiarAlArchivo('MARK PEYTON', ''), null,
       'si dijera que ha copiado, saldría un aviso de que se ha puesto un actor '
       + 'en una fila donde no se ha puesto nada');

  t.seccion('5 · también al revés: del archivo al normal');
  const e = conReparto(REPARTO);
  const q = e.M.castCopiarAlArchivo('MARK PEYTON (ARCHIVO)', 'PAULA TORRES');
  t.eq('se lo copia al normal', q, 'MARK PEYTON');
  t.eq('y lo tiene', e.charIdx['MARK PEYTON'].talent, 'PAULA TORRES');

  t.seccion('6 · cómo se reconoce el archivo');
  const f = conReparto(REPARTO).M;
  t.eq('se quita del nombre', f.castSinArchivo('MARK PEYTON (ARCHIVO)'), 'MARK PEYTON');
  t.eq('en minúsculas también', f.castSinArchivo('Mark Peyton (Archivo)'), 'Mark Peyton');
  t.eq('con espacios de más, también', f.castSinArchivo('MARK PEYTON ( ARCHIVO )'), 'MARK PEYTON');
  t.eq('un nombre normal se queda como está', f.castSinArchivo('MARK PEYTON'), 'MARK PEYTON');
  t.ok('lo reconoce', f.castEsArchivo('MARK PEYTON (ARCHIVO)'));
  t.ok('y no se inventa lo que no hay', !f.castEsArchivo('MARK PEYTON'));
  /* Solo AL FINAL: un personaje que se llame «ARCHIVO DE PRENSA» no es material
     de archivo de nadie. */
  t.ok('solo cuenta al final del nombre', !f.castEsArchivo('(ARCHIVO) MARK PEYTON'));
  t.eq('y no se come un paréntesis cualquiera',
       f.castSinArchivo('HOMBRE 1 (GRITA)'), 'HOMBRE 1 (GRITA)');

  t.seccion('7 · los dos caminos de asignar lo hacen');
  /* La tarjeta y la barra del libreto son dos funciones distintas. Que una lo
     haga y la otra no es exactamente el fallo del que avisa el comentario de
     talAsignar: «tener dos caminos garantiza que un dia uno se olvide». */
  const TODO = require('./ayuda').fuentes().map(x => x.src).join('\n');
  t.ok('la tabla de casting copia al archivo',
       /async function assignTalent[\s\S]{0,1200}?castCopiarAlArchivo\(key, val\)/.test(TODO));
  t.ok('y la barra del libreto, también',
       /async function talAsignar[\s\S]{0,1800}?castCopiarAlArchivo\(key, val\)/.test(TODO));
  /* En los DOS caminos, no en uno. Contando ocurrencias y no con un test a
     secas: con `.test()` bastaba con que quedara en un archivo, y la mutación
     de quitarlo del otro no ponía nada en rojo. */
  t.eq('el deshacer se lleva a los dos por delante, en los dos caminos',
       (TODO.match(/castFoto\(gem \? \[key, gem\] : \[key\]\)/g) || []).length, 2,
       'si la foto solo guarda uno, Ctrl+Z deja al otro con el actor puesto');

  t.seccion('8 · no se rellena a ciegas el desglose de otro capítulo');
  /* Si este capitulo no tiene su propio desglose, Dubbipt cae en el formato
     COMUN del programa, que es el de otro capitulo: le faltan los personajes
     que solo salen aqui. El resultado es un documento de facturacion
     equivocado, y eso solo se avisaba con una etiqueta amarilla en una esquina.
     Ahora se pregunta antes de descargar. */
  t.ok('se pregunta antes de rellenar el formato común',
       /if\(fuente\.comun\)\{[\s\S]{0,400}?confirmModal\(/.test(TODO),
       'sin esto se descarga un desglose de otro capítulo sin decir nada');
  t.ok('y se dice qué archivo se ha rellenado, en el mensaje del final',
       /escritos en «' \+ fuente\.nombre \+ '»/.test(TODO));
  t.ok('los talentos sin fila van DELANTE, no detrás de los buenos',
       /msg = '⚠️ ' \+ r\.sinCasar\.length \+ ' de ' \+ n \+ ' talentos NO tienen fila/.test(TODO),
       'empezando por «✅ N escritos», un desglose al que le faltan actores se '
       + 'lee como si hubiera salido bien');
};
