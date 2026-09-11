/* Los nombres con tilde · especificacion 01 y 02
 *
 * Un personaje se apunta DOS veces y por caminos distintos: en la lista del
 * desglose (su tarjeta, su reparto) y en las marcas del libreto (sus
 * parlamentos). Las dos se cruzan por la CLAVE, y la clave sale de norm():
 * mayusculas, sin tildes, sin apostrofos.
 *
 * Cuando un camino normaliza y el otro no, el fallo no se ve. No hay error, no
 * hay aviso: la tarjeta del personaje existe, se puede abrir, y su libreto sale
 * en blanco. Paso de verdad con PUBLICO, en THE WAYANS BROS 101: el desglose lo
 * tenia como «PUBLICO» con tilde y el libreto como «PUBLICO» sin ella, y sus
 * 314 parlamentos no aparecieron por ninguna parte.
 *
 * Esto lo comprueba de los dos lados, porque de un lado solo no se ve nada.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Nombres con tilde: el desglose y el libreto tienen que casar';

const RECORTES = [
  ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
  ['const NO_REC = new Set(', 'const $ = id =>'],
  ['function norm(s){', 'function esc(s){'],
  ['function contarIntervenciones(dial){', '// Genera el desglose recorriendo'],
  ['function desgloseByRules(){', 'function autoDesgloseFromScan(){']
];
/* `chars` y `charIdx` se REASIGNAN dentro, y al ser parametros la reasignacion
   no se ve desde fuera. Las flechas si cierran sobre el parametro. */
const EXPORTA = ['desgloseByRules', 'norm',
                 'verChars: () => chars', 'verIdx: () => charIdx'];

/** Monta el modulo con unos renglones de guion y lo deja listo. */
function correr(renglones){
  const pageData = { 1: { items: [], lines: renglones.map(t => ({ text: t })), marks: [] } };
  return montar(RECORTES, EXPORTA, {
    pageData: pageData, numPages: 1, chars: [], charIdx: {},
    FMT: {}, lineExcluded: () => false, fmtTC: (s) => String(s),
    charColor: () => '#000', window: {},
    console: { warn: () => {}, log: () => {} }
  });
}

/* El mismo guion de tres personajes, todos con un caracter que norm() dobla. */
const GUION = [
  '01:00:05:00', 'PÚBLICO',  'Que pase el siguiente por favor ahora mismo',
  '01:00:12:00', 'ANDRÉS',   'Buenas tardes a todos ustedes',
  '01:00:20:00', 'NIÑO',     'Mamá',
  '01:00:26:00', 'ANCIANA',  'Ya voy'
];

exports.pruebas = function(t){
  const M = correr(GUION);

  t.seccion('1 · el desglose por reglas guarda la clave NORMALIZADA');
  t.ok('el guion se reconoce', M.desgloseByRules());
  const claves = Object.keys(M.verIdx());
  t.eq('la U con tilde se dobla a U', claves.includes('PUBLICO'), true,
       'si la clave fuera «PÚBLICO», sus parlamentos no la encontrarian nunca');
  t.eq('la E con tilde tambien', claves.includes('ANDRES'), true);
  t.eq('y la enye', claves.includes('NINO'), true);
  t.eq('ninguna clave conserva un caracter que norm() dobla',
       claves.filter(k => k !== M.norm(k)), [],
       'la clave del desglose y la de las marcas del libreto tienen que salir '
       + 'de la MISMA funcion, o se cruzan a ciegas');

  t.seccion('2 · el nombre bonito no se pierde por el camino');
  const porClave = {}; M.verChars().forEach(c => porClave[c.key] = c);
  t.eq('PÚBLICO se sigue enseñando con su tilde', porClave.PUBLICO.display, 'PÚBLICO');
  t.eq('ANDRÉS también', porClave.ANDRES.display, 'ANDRÉS');
  t.eq('y NIÑO con su eñe', porClave.NINO.display, 'NIÑO');

  t.seccion('3 · un nombre sin tildes sigue igual que siempre');
  t.eq('ANCIANA no cambia', porClave.ANCIANA.display, 'ANCIANA');
  t.eq('y tiene sus intervenciones', porClave.ANCIANA.totalInts > 0, true);

  t.seccion('4 · cada personaje se queda con lo suyo');
  t.eq('cuatro personajes, ni uno mas ni uno menos', M.verChars().length, 4);
  t.eq('y cada uno con intervenciones',
       M.verChars().filter(c => !(c.totalInts > 0)).map(c => c.key), []);
};
