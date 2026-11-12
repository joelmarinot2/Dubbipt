/* El género y los talentos de relleno · especificacion 02, CAST-51
 *
 * Pedido de sala: «quiero que también me indiques las personas que hay de
 * relleno: cuando las confirme, me puedas decir "Eduard Pineda solamente
 * tiene 2 líneas con un personaje; él puede hacer estos personajes". No me
 * sugieras los personajes que se puedan cruzar. Y también identifica si es un
 * talento hombre, y que haga personajes de hombre, y así sucesivamente».
 *
 * Lo que protege esta prueba: de dónde sale el género de un personaje (lo
 * marcado manda; luego el talento que lo hace o lo hizo; luego el nombre, como
 * pista) y del talento (su ficha de Casting); que al relleno solo se le
 * proponen personajes que no se cruzan con lo suyo NI entre ellos, y de su
 * género; que el mínimo de talentos (CAST-50) no junta hombres y mujeres; que
 * lo marcado se guarda en el registro del programa sin pisar lo de otro equipo;
 * y que se ve y se puede marcar en el panel.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { INDEX, montar } = require('./ayuda');
const CHQ = require('../js/castchoques.js');
Object.assign(global, CHQ);
const M = require('../js/castminimo.js');

exports.nombre = 'El género de talentos y personajes, y los talentos de relleno';

const RAIZ = path.dirname(INDEX);
/** Carga js/castgenero.js con castNorm de index.html y un directorio de Casting de mentira. */
function cargarGenero(talents){
  const N = montar([['function castNorm(t){', '/** El número final']], ['castNorm'], {});
  const vm = require('vm');
  const ctx = vm.createContext({ castNorm: N.castNorm, castEsActor: (t) => !/^(TODOS|ORIGINAL|X)$/i.test(String(t).trim()), PROD: { cargado: true, datos: { talents: talents || [] } }, console });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'castgenero.js'), 'utf8') + ';this.G = { CG, cgDeNombre, cgDeTalento, cgDePersonaje, cgPalabra, cgCasan, cgHaceFalta, cgCargar, cgMarcar };', ctx);
  return ctx;
}
/** Un libreto: cada intervención es [personaje, timecode en segundos, página]. */
function libreto(filas){
  const script = [], porClave = {};
  filas.forEach((f, i) => { script.push({ idx: i, key: f[0], display: f[0], tcSec: f[1], page: f[2], lines: ['…'] }); (porClave[f[0]] = porClave[f[0]] || []).push(i); });
  return CHQ.chqContexto(script, porClave);
}
const otros = (n, t0, paso, pag) => Array.from({ length: n }, (x, i) => ['OTRO', t0 + i * paso, pag]);

exports.pruebas = function(t){
  const TALENTOS = [{ name: 'Eduard Pineda', genero: 'masculino' }, { name: 'Ana Ochoa', genero: 'femenino' }, { name: 'Sergio Garzon', genero: '' }];
  const ctx = cargarGenero(TALENTOS), G = ctx.G;

  t.seccion('1 · el género por el nombre (una pista)');
  const casos = { 'MALE SOLDIER 4': 'H', 'WOMAN 2': 'M', 'LA DOCTORA': 'M', 'EL JEFE': 'H', 'SEÑORA GARCÍA': 'M', 'Sr. López': 'H', 'MAMÁ': 'M', 'PAPÁ': 'H',
                  'MARLON': 'H', 'SHAWN': 'H', 'ANA': 'M', 'VALERIA': 'M', 'POPS': 'H', 'GIRL ON PHONE': 'M', 'NIÑO 1': 'H', 'ENFERMERA': 'M',
                  'DEE': '', 'LOU': '', 'ALEX': '', 'NARRADOR': '', 'POLICÍA': '', 'DOCTOR': '', 'MOTHER AND SON': '', 'TV': '', '': '' };
  const mal = Object.keys(casos).filter(k => G.cgDeNombre(k) !== casos[k]).map(k => k + '→' + G.cgDeNombre(k));
  t.eq(Object.keys(casos).length + ' nombres: H, M o «no lo dice» (y si dice las dos cosas, tampoco)', mal.join(', '), '');
  t.eq('palabras enteras: «MANUEL» no es «MAN», «MISSION» no es «MISS», «SONIA» no es «SON»', ['MANUEL', 'MISSION CONTROL', 'SONIA', 'HERALD'].map(G.cgDeNombre).join(','), 'H,,,');

  t.seccion('2 · el género del talento: su ficha de Casting');
  t.eq('masculino, femenino, o sin poner; escrito como sea', ['EDUARD PINEDA', 'ana ochoa', 'Sergio Garzón', 'Nadie'].map(G.cgDeTalento).join(','), 'H,M,,');

  t.seccion('3 · el género del personaje: lo marcado manda, luego el talento, luego el nombre');
  ctx.G.CG.antes = { 'CARTERO': 'Ana Ochoa' };
  ctx.G.CG.marcas = { 'LA VECINA': { g: 'H', ts: 1 }, 'BORRADO': { g: '', ts: 2 } };
  const de = (c) => { const r = G.cgDePersonaje(c); return r.g + ':' + r.de; };
  t.eq('marcado a mano, aunque el nombre diga otra cosa', de({ key: 'LA VECINA', display: 'LA VECINA' }), 'H:marcado');
  t.eq('el talento que lo hace', de({ key: 'X', display: 'MADRE', talent: 'Eduard Pineda' }), 'H:talento');
  t.eq('el que lo hizo en otro capítulo del programa', de({ key: 'CARTERO', display: 'CARTERO' }), 'M:antes');
  t.eq('el nombre', de({ key: 'MADRE', display: 'MADRE' }), 'M:nombre');
  t.eq('una marca quitada vuelve a lo deducido', de({ key: 'BORRADO', display: 'BORRADO' }), ':');
  t.eq('TODOS no es un talento: no dice el género', de({ key: 'GRUPO', display: 'GRUPO', talent: 'TODOS' }), ':');
  t.eq('si alguno no se sabe, casan', [G.cgCasan('H', ''), G.cgCasan('', 'M'), G.cgCasan('H', 'H'), G.cgCasan('H', 'M')].join(' '), 'true true true false');

  t.seccion('4 · los talentos de relleno');
  {
    /* EDUARD hace VECINO (2 líneas, a las 01:00:00). GUARDIA sale a 1 minuto de VECINO: se cruza. CARTERO y PORTERO, a las
       01:10:00, hablan seguidos: o uno u otro. LA MADRE, a las 01:20:00: de mujer. JUAN (Sergio Garzon, sin género) hace 40 líneas. */
    const filas = [['VECINO', 3600, 1], ['VECINO', 3605, 1]].concat(otros(5, 3610, 5, 1), [['GUARDIA', 3660, 2]], otros(6, 3700, 60, 2),
      [['CARTERO', 4200, 4], ['PORTERO', 4210, 4], ['CARTERO', 4220, 4]], otros(6, 4300, 60, 5), [['LA MADRE', 4800, 6]], otros(6, 4900, 60, 6), [['JUAN', 5400, 7]]);
    const c = libreto(filas);
    const personas = [['VECINO', 2, 'Eduard Pineda'], ['GUARDIA', 4, ''], ['CARTERO', 9, ''], ['PORTERO', 3, ''], ['LA MADRE', 6, ''], ['JUAN', 40, 'Sergio Garzon']]
      .map(([k, n, tal]) => ({ key: k, display: k, ints: n, talento: tal }));
    const g = M.cmGrafo(personas, c);
    const generos = ['H', '', 'H', '', 'M', ''];
    const r = M.cmRelleno(g, { tope: 10, generos: generos, generoTal: G.cgDeTalento });
    t.eq('solo los de 10 líneas o menos: Eduard Pineda, con su personaje y su género', r.map(e => e.talento + ' ' + e.genero + ' ' + e.ints + ' (' + e.personajes.join() + ')').join(' | '), 'Eduard Pineda H 2 (VECINO)');
    const e = r[0];
    t.eq('puede hacer además: los que no se cruzan con lo suyo ni entre ellos (los de más líneas primero)', e.puede.map(x => x.key).join(','), 'CARTERO');
    t.eq('PORTERO también le cabe, pero no junto con CARTERO (hablan seguidos)', e.tambien.map(x => x.nodo.key + '/' + x.cruzaCon.join()).join(','), 'PORTERO/CARTERO');
    t.eq('GUARDIA no se le sugiere: se cruza con VECINO', [...e.puede, ...e.tambien.map(x => x.nodo), ...e.noGenero].some(x => x.key === 'GUARDIA'), false);
    t.eq('LA MADRE cabría por tiempo, pero es de mujer: aparte', e.noGenero.map(x => x.key).join(), 'LA MADRE');
    const sinGen = M.cmRelleno(g, { tope: 50, generos: generos, generoTal: G.cgDeTalento }).find(x => x.talento === 'Sergio Garzon');
    t.eq('un talento sin género en su ficha: no se filtra por género (LA MADRE no queda fuera por ser de mujer)', sinGen.genero + '|' + sinGen.noGenero.length + '|' + sinGen.puede.map(x => x.key).join() + '|' + sinGen.tambien.map(x => x.nodo.key + '/' + x.cruzaCon.join()).join(), '|0|CARTERO,GUARDIA|LA MADRE/CARTERO,PORTERO/CARTERO');
    t.ok('… y entre sus propuestas tampoco junta hombre y mujer, ni dos que se cruzan', sinGen.puede.every((a, i) => sinGen.puede.every((b, j) => i >= j
      || (!g.ady[g.nodos.indexOf(a)].has(g.nodos.indexOf(b)) && G.cgCasan(generos[g.nodos.indexOf(a)], generos[g.nodos.indexOf(b)])))));
    t.eq('ningún relleno si todos tienen trabajo de sobra', M.cmRelleno(g, { tope: 1 }).length, 0);
  }

  t.seccion('5 · el mínimo de talentos (CAST-50) no junta hombres y mujeres');
  {
    const c = libreto([['A', 3600, 1]].concat(otros(6, 3700, 100, 2), [['B', 5000, 5]]));
    const ps = [{ key: 'A', display: 'A', ints: 3, talento: '' }, { key: 'B', display: 'B', ints: 2, talento: '' }];
    t.eq('dos que no se cruzan: uno solo', M.cmSugerir(ps, c).minimo, 1);
    t.eq('pero si uno es hombre y otra mujer, dos', M.cmSugerir(ps, c, { generos: ['H', 'M'] }).minimo, 2);
    t.eq('si uno no se sabe, uno', M.cmSugerir(ps, c, { generos: ['H', ''] }).minimo, 1);
    t.eq('y lo dice al explicar por qué no con menos', M.cmPorQue(M.cmSugerir(ps, c, { generos: ['H', 'M'] })), 'No se puede con menos: «A», «B» no pueden compartir talento (se cruzan o son de distinto género)');
    const ya = [{ key: 'A', display: 'A', ints: 3, talento: 'Ana Ochoa' }, { key: 'B', display: 'B', ints: 2, talento: '' }];
    const r = M.cmSugerir(ya, c, { generos: ['', 'H'], generoTal: G.cgDeTalento });
    t.eq('con lo ya repartido: a una talento mujer no se le propone un personaje de hombre', r.conLoRepartido.nuevos + ' ' + r.conLoRepartido.propuestas.map(p => p.key + '→' + (p.talento || 'nuevo')).join(), '1 B→nuevo');
    t.eq('si es de mujer, sí', M.cmSugerir(ya, c, { generos: ['', 'M'], generoTal: G.cgDeTalento }).conLoRepartido.propuestas.map(p => p.talento).join(), 'Ana Ochoa');
    const cache = {};
    M.cmSugerir(ps, c, { generos: ['H', 'M'], cache: cache });
    t.ok('lo caro se guarda y se reutiliza', !!cache.paso1 && M.cmSugerir(ps, c, { generos: ['H', 'M'], cache: cache }).minimo === 2);
  }

  t.seccion('6 · lo marcado se guarda en el registro del programa');
  {
    const R = montar([['function castRegFusionar(local, nube){', '/**\n * Apunta en el registro']], ['castRegFusionar'], {});
    const f = R.castRegFusionar({ personajes: {}, generos: { 'CARTERO': { g: 'H', ts: 5 }, 'MADRE': { g: 'M', ts: 1 } } },
                                { personajes: {}, generos: { 'MADRE': { g: 'H', ts: 9 }, 'NINA': { g: 'M', ts: 3 } } });
    t.eq('de cada personaje, lo más reciente; lo de los dos equipos se junta', JSON.stringify(f.generos), '{"MADRE":{"g":"H","ts":9},"NINA":{"g":"M","ts":3},"CARTERO":{"g":"H","ts":5}}');
    t.eq('sin géneros en ninguno, no aparece la clave (el registro de siempre, igual)', 'generos' in R.castRegFusionar({ personajes: {} }, { personajes: {} }), false);
    const guardados = [];
    const c2 = cargarGenero(TALENTOS);
    c2.castRegCargar = async () => ({ personajes: { 'CARTERO': { talent: 'Ana Ochoa' } }, generos: { 'OTRO': { g: 'M', ts: 1 } } });
    c2.castRegGuardar = async (id, reg) => { guardados.push([id, JSON.stringify(reg.generos)]); return true; };
    return (async () => {
      await c2.G.cgCargar('s1');
      t.eq('al abrir el programa: lo marcado y quién hizo a cada uno', JSON.stringify(c2.G.CG.marcas) + ' · ' + JSON.stringify(c2.G.CG.antes), '{"OTRO":{"g":"M","ts":1}} · {"CARTERO":"Ana Ochoa"}');
      t.eq('no se vuelve a traer el mismo programa', c2.G.cgHaceFalta('s1') + ' ' + c2.G.cgHaceFalta('s2'), 'false true');
      await c2.G.cgMarcar('s1', 'La Madre', 'M');
      t.ok('marcar: vale ya en este equipo y se guarda en el registro, sin pisar lo que había', c2.G.CG.marcas['LA MADRE'].g === 'M' && guardados[0][0] === 's1'
           && /"OTRO":\{"g":"M","ts":1\}/.test(guardados[0][1]) && /"LA MADRE":\{"g":"M","ts":\d+\}/.test(guardados[0][1]), JSON.stringify(guardados));
      await c2.G.cgMarcar('s1', 'La Madre', '');
      t.eq('quitar la marca', c2.G.CG.marcas['LA MADRE'].g, '');

      t.seccion('7 · en el panel');
      const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
      const P = montar([['const CAST_RELLENO', '/** El recuadro del panel de Ocupación.']], ['castRellenoHtml', 'castGeneroBotones'],
        { esc: (s) => String(s).replace(/</g, '&lt;').replace(/"/g, '&quot;'), cgPalabra: G.cgPalabra, ocuRelAbierto: true });
      const nd = (k, n) => ({ key: k, display: k, ints: n });
      const nodos = [nd('VECINO', 2), nd('CARTERO', 9), nd('PORTERO', 3), nd('LA MADRE', 6)];
      const r = { sinTalento: 3, nodos: nodos, genero: [{ g: 'H', de: 'talento' }, { g: 'H', de: 'marcado' }, { g: '', de: '' }, { g: 'M', de: 'nombre' }],
        relleno: [{ talento: 'Eduard Pineda', genero: 'H', ints: 2, personajes: ['VECINO'], puede: [nodos[1]], tambien: [{ nodo: nodos[2], cruzaCon: ['CARTERO'] }], noGenero: [nodos[3]] }] };
      const h = P.castRellenoHtml(r);
      t.ok('«Eduard Pineda, hombre, 2 líneas (VECINO): puede hacer además…»', /<b>Eduard Pineda<\/b> <span class="ocu-rel-g">hombre<\/span> · 2 líneas \(VECINO\)/.test(h) && /Puede hacer además: CARTERO <i>9<\/i>/.test(h), h.slice(0, 500));
      t.ok('lo que se cruza entre ellos, como alternativa; lo del otro género, aparte', /O en lugar de alguno: PORTERO <i>3<\/i> .*\(no junto con «CARTERO»\)/.test(h) && /De mujer, no: LA MADRE <i>6<\/i>/.test(h));
      t.ok('cada personaje con su H / M: marcado lleno, deducido discontinuo', /data-cgn="CARTERO" data-cgg="H" data-cgon="1"/.test(h) && /class="cg-b on" data-cgn="CARTERO"/.test(h) && /class="cg-b ded" data-cgn="LA MADRE" data-cgg="M"/.test(h));
      t.eq('sin personajes por repartir, no sale', P.castRellenoHtml(Object.assign({}, r, { sinTalento: 0 })), '');
      t.ok('pulsar H / M lo marca (o lo quita si ya estaba) y repinta', /const g = b\.dataset\.cgon \? '' : b\.dataset\.cgg;\s+cgMarcar\(showId, b\.dataset\.cgn, g\)/.test(HTML));
      t.ok('el panel trae lo del programa una vez y repinta', /if\(typeof cgHaceFalta === 'function' && cgHaceFalta\(showId\)\) cgCargar\(showId, /.test(HTML));
      t.ok('el mínimo y lo de los que faltan usan el género', /cmSugerir\(lista, null, \{ grafo: _cmMemo\.grafo, norm: castNorm, generos: generos, generoTal: generoTal, cache: cache \}\)/.test(HTML));
      t.ok('el módulo se carga y queda para usar sin conexión', /<script src="\.\/js\/castminimo\.js"><\/script>\n<script src="\.\/js\/castgenero\.js"><\/script>/.test(HTML) && /'\.\/js\/castgenero\.js'/.test(SW));
    })();
  }
};
