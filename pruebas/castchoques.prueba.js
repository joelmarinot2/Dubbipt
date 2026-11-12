/* Los choques de reparto · especificacion 02, CAST-49 (y CAST-24, CAST-25)
 *
 * Pedido de sala: «mejora la parte de los choques de personajes en Casting.
 * Ten en cuenta el contexto de la escena y las páginas, pero guíate más por el
 * timecode: si sale 5 minutos antes o después, se choca». Y después
 * (CAST-52): «reduce el tiempo de 5 a 4 minutos; y si la escena ya se acabó,
 * el tiempo mínimo es de 1 minuto».
 *
 * Lo que protege esta prueba: que manda el timecode (a 5 minutos o menos,
 * antes o después, choca; a más, no, aunque compartan página); que los que
 * hablan seguidos chocan siempre; que sin timecode se mira la escena y las
 * páginas; que un libreto sin timecodes no hace chocar a todo el mundo (no se
 * inventa un cero); que hay un aviso por pareja, con el cruce más cercano y
 * las veces que se cruzan; y que todo lo que enseña un choque dice lo mismo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { INDEX, montar } = require('./ayuda');
const C = require('../js/castchoques.js');

exports.nombre = 'Los choques de reparto: el timecode manda (4 minutos; 1 si la escena ya se acabó), con la escena y las páginas';

const RAIZ = path.dirname(INDEX);

/** Un libreto: cada intervención es [personaje, timecode en segundos o null, página, líneas]. */
function libreto(filas){
  const script = [], porClave = {};
  filas.forEach((f, i) => {
    script.push({ idx: i, key: f[0], display: f[0], tcSec: f[1], page: f[2] == null ? null : f[2], lines: f[3] || ['…'] });
    if(f[0]) (porClave[f[0]] = porClave[f[0]] || []).push(i);
  });
  return C.chqContexto(script, porClave);
}
const P = (...ks) => ks.map(k => ({ key: k, display: k }));
/** n intervenciones de relleno, una cada `paso` segundos desde `t0` (o sin timecode), en la página `pag`. */
const relleno = (n, t0, paso, pag, quien) => Array.from({ length: n }, (x, i) => [quien || 'OTRO', t0 == null ? null : t0 + i * paso, pag]);

exports.pruebas = function(t){
  t.seccion('1 · el timecode manda: 4 minutos, antes o después (CAST-52; antes eran 5)');
  {
    const ctx = libreto([['A', 3600, 1]].concat(relleno(20, 3610, 10, 2), [['B', 3600 + 230, 5]]));
    const r = C.chqDeTalento(P('A', 'B'), ctx);
    t.eq('a 3 min 50 s, con veinte líneas en medio y cuatro páginas más allá: choca', r.map(x => [x.a, x.b, x.por, x.seg, x.dist, x.pagA, x.pagB].join(' ')).join(), 'A B tc 230 21 1 5');
    t.eq('justo a 4 minutos: choca', C.chqDeTalento(P('A', 'B'), libreto([['A', 0, 1]].concat(relleno(9, 5, 5, 1), [['B', 240, 3]])))[0].por, 'tc');
    t.eq('a 4 minutos y un segundo: no', C.chqDeTalento(P('A', 'B'), libreto([['A', 0, 1]].concat(relleno(9, 5, 5, 1), [['B', 241, 3]]))).length, 0);
    t.eq('a 4 min 50 s, que antes chocaba, ya no', C.chqDeTalento(P('A', 'B'), libreto([['A', 0, 1]].concat(relleno(9, 5, 5, 1), [['B', 290, 3]]))).length, 0);
    t.eq('«antes o después»: da igual quién sale primero', C.chqDeTalento(P('A', 'B'), libreto([['B', 100, 1]].concat(relleno(9, 105, 5, 1), [['A', 250, 2]]))).map(x => x.a + ' ' + x.b + ' ' + x.seg).join(), 'B A 150');
    t.eq('con timecode y a más de 4 minutos NO es choque, aunque compartan página', C.chqDeTalento(P('A', 'B'), libreto([['A', 0, 7]].concat(relleno(9, 60, 60, 7), [['B', 900, 7]]))).length, 0);
    t.eq('los 4 minutos son 240 segundos; si la escena se acabó, 60', C.CHQ_SEG + ' ' + C.CHQ_SEG_ESCENA, '240 60');
  }

  t.seccion('1b · si la escena ya se acabó, el margen es de 1 minuto (CAST-52)');
  {
    /* A habla en la escena 1; la escena se acaba (encabezado); B habla en la 2. Con otros en medio. */
    const cambio = (tB, n, conTC, pagB) => libreto([['OTRO', conTC ? 0 : null, 1, ['x', 'ESC. 1 INT. CASA - DÍA']], ['A', conTC ? 10 : null, 1]]
      .concat(relleno(n, conTC ? 12 : null, 1, 1), [['OTRO', conTC ? 14 : null, 1, ['Adiós.', 'ESC. 2 EXT. CALLE - NOCHE']], ['B', conTC ? tB : null, pagB || 1]]));
    const por = (ctx) => (C.chqDeTalento(P('A', 'B'), ctx)[0] || { por: 'nada' });
    t.eq('cambia de escena y B sale a 45 s: choca (dentro del minuto)', [por(cambio(55, 4, true)).por, por(cambio(55, 4, true)).seg, por(cambio(55, 4, true)).escena].join(' '), 'tc 45 false');
    t.eq('justo a 1 minuto: choca', por(cambio(70, 4, true)).por, 'tc');
    t.eq('a 1 min 30 s: no (en la misma escena, sí chocaría)', por(cambio(100, 4, true)).por, 'nada');
    t.eq('aunque hablen seguidos: si el timecode dice que pasó más de 1 minuto y la escena se acabó, no', por(cambio(100, 0, true)).por, 'nada');
    t.eq('seguidos y dentro del minuto: choque grave', por(cambio(30, 0, true)).por, 'seguido');
    t.eq('sin timecode y cambiando de escena: solo si hablan seguidos', [por(cambio(0, 0, false)).por, por(cambio(0, 6, false)).por].join(' '), 'seguido nada');
    t.eq('sin timecode, otra escena en la misma página: ya no choca', por(cambio(0, 6, false, 1)).por, 'nada');
    const misma = libreto([['OTRO', 0, 1, ['x', 'ESC. 1']], ['A', 10, 1]].concat(relleno(6, 20, 20, 1), [['B', 190, 2], ['OTRO', 200, 2, ['y', 'ESC. 2']]]));
    t.eq('en la misma escena siguen siendo 4 minutos', [por(misma).por, por(misma).seg, por(misma).escena].join(' '), 'tc 180 true');
    t.eq('se dice que cambia de escena', C.chqTexto(C.chqDeTalento(P('A', 'B'), cambio(55, 4, true))[0]), '«A» y «B» salen a 45 s · TC 00:00:10 y 00:00:55 · pág. 1 · cambia de escena');
  }

  t.seccion('2 · los que hablan seguidos chocan siempre');
  {
    const r = C.chqDeTalento(P('A', 'B'), libreto([['A', 100, 1], ['OTRO', 102, 1], ['B', 104, 1]]));
    t.eq('a dos líneas', r.map(x => x.por + ' ' + x.dist + ' ' + x.seg).join(), 'seguido 2 4');
    t.eq('aunque el timecode traiga una errata y diga que hay una hora en medio', C.chqDeTalento(P('A', 'B'), libreto([['A', 100, 1], ['OTRO', 102, 1], ['B', 3700, 1]]))[0].por, 'seguido');
    t.eq('y aunque el libreto no traiga timecode ni página', C.chqDeTalento(P('A', 'B'), libreto([['A', null, null], ['B', null, null]])).map(x => x.por + ' ' + x.dist + ' ' + x.seg).join(), 'seguido 1 null');
    t.eq('cuatro líneas es el margen; cinco, ya lo decide lo demás', [4, 5].map(n => (C.chqDeTalento(P('A', 'B'), libreto([['A', null, null]].concat(relleno(n - 1, null, 0, null), [['B', null, null]])))[0] || { por: 'nada' }).por).join(' '), 'seguido nada');
  }

  t.seccion('3 · sin timecode: la escena y las páginas');
  {
    const medio = relleno(10, null, 0, 3);
    t.eq('misma página', C.chqDeTalento(P('A', 'B'), libreto([['A', null, 3]].concat(medio, [['B', null, 3]]))).map(x => x.por + ' ' + x.pagA + ' ' + x.pagB).join(), 'pagina 3 3');
    t.eq('la página de al lado', C.chqDeTalento(P('A', 'B'), libreto([['A', null, 3]].concat(medio, [['B', null, 4]])))[0].por, 'pagina');
    t.eq('a dos páginas: no', C.chqDeTalento(P('A', 'B'), libreto([['A', null, 3]].concat(medio, [['B', null, 5]]))).length, 0);
    /* Con encabezados de escena. El encabezado queda pegado al final de lo que dice el anterior. */
    const conEscenas = (pagB, cierraAntes) => libreto([['OTRO', null, 1, ['Hola.', 'ESC. 1 INT. CASA - DÍA']], ['A', null, 1]].concat(relleno(10, null, 0, 2),
      cierraAntes ? [['OTRO', null, 2, ['Adiós.', 'ESC. 2 EXT. CALLE - NOCHE']]] : [], relleno(10, null, 0, 4), [['B', null, pagB], ['OTRO', null, 9, ['Fin.', 'ESC. 3 INT. BAR']]]));
    t.eq('misma escena, aunque esté a ocho páginas', C.chqDeTalento(P('A', 'B'), conEscenas(9, false)).map(x => x.por + ' ' + x.escena).join(), 'escena true');
    t.eq('otra escena y lejos: no', C.chqDeTalento(P('A', 'B'), conEscenas(9, true)).length, 0);
    t.eq('otra escena, aunque esté en la página de al lado: la escena se acabó, no choca (CAST-52)', C.chqDeTalento(P('A', 'B'), conEscenas(2, true)).length, 0);
    t.eq('un libreto sin encabezados no tiene escenas (y no se inventan)', C.chqEscenas([{ lines: ['Hola'] }, { lines: ['Escena difícil, ¿no?'] }, { lines: ['ESC. 1'] }]), null);
    t.eq('las escenas: el encabezado al final cambia la siguiente; al principio, ese mismo bloque', JSON.stringify(C.chqEscenas([{ lines: ['a', 'INT. CASA'] }, { lines: ['b'] }, { lines: ['ESCENA 2', 'c'] }, { lines: ['d', 'EXT. CALLE'] }, { lines: ['e'] }])), '[0,1,2,2,3]');
    t.eq('lo que es y lo que no es un encabezado', ['ESC. 12', '12. INT. CASA - DÍA', 'INT./EXT. COCHE', 'ESCENA 3', 'SECUENCIA 4', 'EXT', 'Escena difícil', 'Esto no', 'INTENTA otra vez', 'ESCUCHA', 'EXTRA: hola'].map(x => C.CHQ_ESCENA_RE.test(x) ? 1 : 0).join(''), '11111100000');
    t.eq('con timecode, la escena solo se dice; quien decide es el timecode', C.chqDeTalento(P('A', 'B'), libreto([['OTRO', 0, 1, ['x', 'ESC. 1']], ['A', 10, 1]].concat(relleno(10, 60, 60, 2), [['B', 700, 3], ['OTRO', 710, 3, ['y', 'ESC. 2']]]))).length, 0);
  }

  t.seccion('4 · el tiempo de cada intervención');
  {
    t.eq('el suyo, o el de la anterior; antes del primer timecode no hay', JSON.stringify(C.chqTiempos([{ tcSec: null }, { tcSec: 10 }, { tcSec: null }, { tcSec: 40 }, {}])), '[null,10,10,40,40]');
    const sinTC = libreto([['A', null, 1]].concat(relleno(30, null, 0, 5), [['B', null, 9]]));
    t.eq('un libreto SIN timecodes no hace chocar a todo el mundo (no se inventa un cero)', C.chqDeTalento(P('A', 'B'), sinTC).length, 0);
    t.eq('si solo uno de los dos tiene tiempo, no se compara: se miran las páginas', C.chqDeTalento(P('A', 'B'), libreto([['A', null, 2]].concat(relleno(8, null, 0, 2), [['B', 50, 2]]))).map(x => x.por + ' ' + x.seg).join(), 'pagina null');
  }

  t.seccion('5 · un aviso por pareja: el cruce más cercano y las veces');
  {
    const ctx = libreto([['A', 0, 1]].concat(relleno(8, 10, 10, 1), [['B', 200, 2]], relleno(8, 210, 10, 2), [['A', 300, 3], ['B', 302, 3]], relleno(8, 310, 10, 3), [['A', 2000, 9]]));
    const r = C.chqDeTalento(P('A', 'B'), ctx);
    t.eq('una sola entrada, con lo más cercano (hablan seguidos) y las tres veces que se cruzan', r.map(x => [x.a, x.b, x.por, x.dist, x.seg, x.veces, x.tcA, x.tcB].join(' ')).join(' | '), 'A B seguido 1 2 3 300 302');
    const tres = libreto([['A', 0, 1]].concat(relleno(8, 10, 10, 1), [['B', 200, 2]], relleno(8, 205, 3, 2), [['C', 230, 2], ['B', 231, 2]]));
    t.eq('tres personajes del mismo talento: una entrada por pareja que choca, lo peor primero', C.chqDeTalento(P('A', 'B', 'C'), tres).map(x => x.a + '-' + x.b + ' ' + x.por + ' ' + (x.por === 'tc' ? x.seg : x.dist)).join(' | '), 'C-B seguido 1 | A-B tc 200 | A-C tc 230');
    t.eq('un personaje sin intervenciones en el libreto no choca con nadie', C.chqDeTalento(P('A', 'NADIE'), ctx).length, 0);
    t.eq('con un solo personaje no hay choque', C.chqDeTalento(P('A'), ctx).length, 0);
  }

  t.seccion('6 · cómo se dice');
  {
    t.eq('por timecode', C.chqTexto({ a: 'MARLON', b: 'SHAWN', por: 'tc', seg: 130, dist: 30, tcA: 3730, tcB: 3860, pagA: 4, pagB: 5, escena: true, veces: 3 }), '«MARLON» y «SHAWN» salen a 2 min 10 s · TC 01:02:10 y 01:04:20 · págs. 4 y 5 · misma escena · se cruzan 3 veces');
    t.eq('en el mismo timecode', C.chqTexto({ a: 'A', b: 'B', por: 'tc', seg: 0, dist: 9, tcA: 60, tcB: 60, pagA: 2, pagB: 2, escena: null, veces: 1 }), '«A» y «B» salen en el mismo timecode · TC 00:01:00 · pág. 2');
    t.eq('seguidos', C.chqTexto({ a: 'A', b: 'B', por: 'seguido', seg: 4, dist: 2, tcA: 100, tcB: 104, pagA: 1, pagB: 1, escena: null, veces: 1 }), '«A» y «B» hablan seguidos (a 2 líneas) · TC 00:01:40 y 00:01:44 · pág. 1');
    t.eq('misma escena, sin timecode', C.chqTexto({ a: 'A', b: 'B', por: 'escena', seg: null, dist: 12, tcA: null, tcB: null, pagA: 1, pagB: 9, escena: true, veces: 1 }), '«A» y «B» salen en la misma escena, sin timecode · págs. 1 y 9');
    t.eq('páginas seguidas, sin timecode', C.chqTexto({ a: 'A', b: 'B', por: 'pagina', seg: null, dist: 12, tcA: null, tcB: null, pagA: 3, pagB: 4, escena: null, veces: 2 }), '«A» y «B» salen en páginas seguidas, sin timecode · págs. 3 y 4 · se cruzan 2 veces');
    t.eq('un choque de los de antes (solo líneas y página) se sigue diciendo', C.chqTexto({ a: 'A', b: 'B', dist: 1, pagina: 4 }), '«A» y «B» hablan seguidos (a 1 línea) · pág. 4');
    t.eq('las duraciones', [35, 60, 130, 300].map(C.chqDura).join(' | '), '35 s | 1 min | 2 min 10 s | 5 min');
    t.eq('«seguido» es lo grave', [C.chqSeguido({ por: 'seguido' }), C.chqSeguido({ por: 'tc', dist: 2 }), C.chqSeguido({ dist: 3 }), C.chqSeguido(null)].join(' '), 'true false true false');
  }

  t.seccion('7 · en la aplicación');
  {
    const charIdx = {
      MARLON: { display: 'MARLON', talent: 'Hari Moreno', totalInts: 3, pages: [{ p: 1 }] },
      SHAWN: { display: 'SHAWN', talent: 'HARI MORENO', totalInts: 2, pages: [{ p: 2 }] },
      POPS: { display: 'POPS', talent: 'TODOS', totalInts: 2, pages: [{ p: 1 }] },
      DEE: { display: 'DEE', talent: 'TODOS', totalInts: 2, pages: [{ p: 1 }] },
      LOU: { display: 'LOU', talent: 'Ana Ochoa', totalInts: 1, pages: [{ p: 1 }] }
    };
    const ctx = libreto([['MARLON', 3600, 1], ['POPS', 3602, 1], ['DEE', 3604, 1]].concat(relleno(12, 3610, 5, 1, 'LOU'), [['SHAWN', 3720, 2]]));
    const avisos = [];
    const M = montar([['const OCU_NO_ACTOR', '/* ── El panel ──'], ['function castNorm(t){', '/** El número final']],
      ['castChoques', 'castChoqueDe', 'castAvisarChoque', 'castAvisarChoquesTodos'],
      Object.assign({ charIdx, script: ctx.script, scriptByKey: ctx.porClave, castAviso: (x) => avisos.push(x) }, C));
    const m = M.castChoques();
    t.eq('un talento con dos personajes a 2 minutos: choque (escrito igual, en mayúsculas o no)', Object.keys(m).join() + ' · ' + m['HARI MORENO'].choques.map(x => x.a + ' ' + x.b + ' ' + x.por + ' ' + x.seg).join(), 'HARI MORENO · MARLON SHAWN tc 120');
    t.ok('«TODOS» no es un actor: sus personajes no chocan, por seguidos que hablen', !Object.keys(m).some(k => /TODOS/.test(k)));
    t.eq('las dos tarjetas quedan marcadas; las demás, no', ['MARLON', 'SHAWN', 'LOU', 'POPS'].map(k => M.castChoqueDe(k, m) ? 1 : 0).join(''), '1100');
    M.castAvisarChoque('SHAWN');
    t.eq('al asignar, se avisa con a cuánto salen y dónde', avisos[0], '⚠️ Hari Moreno hace «MARLON» y «SHAWN» salen a 2 min · TC 01:00:00 y 01:02:00 · págs. 1 y 2 — choque de reparto');
    charIdx.LOU.talent = 'Hari Moreno'; charIdx.POPS.talent = 'Hari Moreno';
    avisos.length = 0; M.castAvisarChoque('POPS');
    t.eq('si hablan seguidos, se dice que no le da tiempo', avisos[0], '⚠️ Hari Moreno hace «MARLON» y «POPS» hablan seguidos (a 1 línea) · TC 01:00:00 y 01:00:02 · pág. 1 — no le da tiempo a cambiar de voz');
    charIdx.LOU.talent = 'Ana Ochoa'; charIdx.POPS.talent = 'TODOS'; avisos.length = 0; M.castAvisarChoque('SHAWN');
    t.eq('y el resumen', (M.castAvisarChoquesTodos(), avisos[1]), '⚠️ 1 choque de reparto: Hari Moreno hace «MARLON» y «SHAWN» salen a 2 min · TC 01:00:00 y 01:02:00 · págs. 1 y 2 — míralo en «Ocupación de talentos»');
  }
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('todo lo que enseña un choque lo dice con la misma frase: el panel, el libreto, la planilla impresa y los avisos', (HTML.match(/chqTexto\(/g) || []).length === 7 && !/(?:x|ch|ej)\.dist \+ ' línea'/.test(HTML));
  t.ok('el panel dice cuál es la regla', /el mismo talento con dos personajes a 4 min o menos por timecode \(1 min si cambia la escena\)/.test(HTML) && !/a 5 min o menos/.test(HTML));
  t.ok('el módulo se carga y queda para usar sin conexión', /<script src="\.\/js\/castchoques\.js"><\/script>/.test(HTML) && /'\.\/js\/castchoques\.js'/.test(SW));
};
