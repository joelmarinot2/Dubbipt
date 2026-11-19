/* Episodios vinculados: un desglose unido para dos capítulos · especificacion 02, CAST-56
 *
 * Pedido de sala: MY PET AND ME viene en dos episodios (101 y 102), cada uno con
 * su libreto y su video, pero el desglose que se entrega es UNO con los dos
 * («EPS 101» y debajo sus personajes; «EPS 102» y los suyos). Lo que protege
 * esta prueba: se reconocen las secciones, cada una se rellena con el casting
 * de SU episodio (aunque un personaje se llame igual en los dos), COMPLETO solo
 * si los dos lo están, CASTING 1 se ordena dentro de cada episodio sin mezclar,
 * y el archivo se llama «DES_MY PET AND ME 101.102_…».
 * Con un libro inventado con la forma del de la empresa: el de verdad no entra
 * en el repositorio.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { montar, INDEX, RAIZ } = require('./ayuda');

exports.nombre = 'Episodios vinculados: un desglose unido, cada episodio con su casting';

const enc = (t) => new TextEncoder().encode(t), dec = (b) => new TextDecoder().decode(b);
const HTML = fs.readFileSync(INDEX, 'utf8');
const CV_SRC = fs.readFileSync(path.join(RAIZ, 'js', 'castvinculo.js'), 'utf8');

/* La hoja CASTING, como la de la empresa: cabecera, NOMBRE DEL ACTOR y los personajes (con «EPS …» entre medias). */
function libro(filas, actores){
  const xml = '<worksheet><sheetData>'
    + '<row r="7"><c r="A7" t="s"><v>0</v></c><c r="D7" t="s"><v>1</v></c></row>'
    + '<row r="12"><c r="A12" t="s"><v>2</v></c><c r="D12" t="s"><v>3</v></c></row>'
    + Object.keys(filas).map(f => '<row r="' + f + '"><c r="A' + f + '" s="1" t="str"><f>IF(DESGLOCE!A1="","",DESGLOCE!A1)</f><v>' + filas[f] + '</v></c>'
      + (actores && actores[f] ? '<c r="D' + f + '" s="1" t="inlineStr"><is><t>' + actores[f] + '</t></is></c>' : '<c r="D' + f + '" s="1"/>') + '</row>').join('') + '</sheetData></worksheet>';
  return { 'xl/workbook.xml': enc('<workbook xmlns:r="x"><sheets><sheet name="CASTING" sheetId="1" r:id="rId1"/></sheets></workbook>'),
           'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
           'xl/sharedStrings.xml': enc('<sst><si><t>FECHA:</t></si><si><t>HAROLD LEAL</t></si><si><t>LOCUTOR</t></si><si><t>NOMBRE DEL ACTOR</t></si></sst>'),
           'xl/worksheets/sheet1.xml': enc(xml) };
}
/* El de MY PET AND ME, en pequeño: GIRL sale en los dos y en cada uno lo hace otra persona. */
const MYPET = { 13: 'EPS 101', 14: 'RORY CRAWFORD', 16: 'SANDY CRAWFORD', 17: 'GIRL', 18: "WALLA: KUSH'S FAMILY",
                26: 'EPS 102', 27: 'RORY', 29: 'SANDY', 30: 'GIRL', 31: 'MAIN TITLE' };

exports.pruebas = async function(t){
  let arch = null;
  const ctxCv = { castClave: null, fflate: { unzipSync: () => arch, zipSync: (a) => a } };
  const M = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS'], ['function castEscribirCelda(', '/** Mete la cabecera del programa'], ['function castLeerColumnaTexto(', '/**']],
    ['castRellenar', 'castClave', 'castNombreDescarga', 'castLeerColumna', 'castLeerColumnaTexto', 'castHojaXml', 'CAST_HOJA', 'CAST_COL_PERSONAJE'],
    { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console,
      fflate: ctxCv.fflate, cvFilasDe: (p, s) => CV.cvFilasDe(p, s), cvNumSeccion: (n) => CV.cvNumSeccion(n) });
  const K = M.castClave, asignDe = (o) => { const a = {}; for(const n in o) a[K(n)] = o[n]; return a; };

  /* El módulo, con lo que comparte de la aplicación. */
  const nube = {}, local = {}, subidos = [];
  const sbFalso = {
    from: () => ({ select: () => ({ eq: (c, id) => ({ maybeSingle: async () => ({ data: nube[id] || null, error: null }) }) }) }),
    storage: { from: () => ({ upload: async (ruta) => { subidos.push(ruta); return { error: null }; }, download: async () => ({ data: null }) }) }
  };
  const ctx = vm.createContext({ console, TextDecoder, TextEncoder, Blob: class { constructor(x){ this.x = x; } },
    castClave: M.castClave, castHojaXml: M.castHojaXml, castLeerColumna: M.castLeerColumna, CAST_HOJA: M.CAST_HOJA, CAST_COL_PERSONAJE: M.CAST_COL_PERSONAJE,
    fflate: ctxCv.fflate, sb: sbFalso, window: {},
    idbGet: async (k) => local[k] || null, idbSet: async (k, v) => { local[k] = v; },
    castFormatoPathEp: (s, e) => s + '/' + e + '/formato-casting.xlsm',
    trnClave: (x) => String(x || '').toUpperCase().trim(), trnSanear: (m) => m || {} });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'tcinicial.js'), 'utf8').replace(/^const TCI\b/m, 'var TCI') + '\n' + CV_SRC + '\n;this.CV = module.exports;', Object.assign(ctx, { module: { exports: {} } }));
  const CV = ctx.CV;

  t.seccion('1 · las filas «EPS …» abren cada episodio');
  {
    t.eq('EPS 101, EP 102, EPISODIO 3, EPISODE 04, CAP. 5', ['EPS 101', 'ep 102', 'EPISODIO 3', 'Episode 04', 'CAP. 5'].map(CV.cvNumSeccion).join(','), '101,102,3,4,5');
    t.eq('un personaje no lo es (EPSILON, EPS 101 (VO), PEPS 2, EPS)', ['EPSILON', 'EPS 101 (VO)', 'PEPS 2', 'EPS', 'RORY'].map(CV.cvNumSeccion).join(','), ',,,,');
    const s = CV.cvSecciones(MYPET);
    t.eq('dos secciones, con sus filas', JSON.stringify(s.map(x => [x.num, x.fila, x.desde, x.hasta === Infinity ? 'fin' : x.hasta])), '[["101",13,14,25],["102",26,27,"fin"]]');
    t.eq('las filas de cada una', Object.values(CV.cvFilasDe(MYPET, s[1])).join(' · '), 'RORY · SANDY · GIRL · MAIN TITLE');
    t.eq('un desglose de un solo episodio no es unido', CV.cvSecciones({ 13: 'EPS 101', 14: 'RORY' }), null);
    t.eq('dos «EPS 101» tampoco', CV.cvSecciones({ 13: 'EPS 101', 14: 'RORY', 20: 'EPS 101', 21: 'ANA' }), null);
    t.eq('«101.102», como lo titula la empresa', CV.cvNums(s), '101.102');
  }

  t.seccion('2 · el capítulo de cada sección');
  {
    const s = CV.cvSecciones(MYPET);
    const eps = [{ id: 'a', name: 'MY PET AND ME 101' }, { id: 'b', name: 'MY PET AND ME 102' }, { id: 'c', name: 'MY PET AND ME 103' }];
    const m = CV.cvEpisodiosDe(s, eps);
    t.eq('por su número', [m['101'].id, m['102'].id].join(','), 'a,b');
    t.eq('el capítulo abierto sabe cuál es el suyo', [CV.cvSeccionDe(s, eps[1], eps), CV.cvSeccionDe(s, eps[2], eps)].join(','), '102,');
    const cortos = [{ id: 'x', name: 'Episodio 1' }, { id: 'y', name: 'Episodio 2' }];
    const m2 = CV.cvEpisodiosDe(s, cortos);
    t.eq('si nadie lleva el 101, el episodio 1 de la temporada', [m2['101'] && m2['101'].id, m2['102'] && m2['102'].id].join(','), 'x,y');
    t.eq('si no hay capítulo para un número, se queda sin él', Object.keys(CV.cvEpisodiosDe(s, [eps[0]])).join(','), '101');
  }

  t.seccion('3 · cada episodio, con su casting');
  {
    const s = CV.cvSecciones(MYPET);
    const sec = (num, asign, del) => Object.assign({}, s.find(x => x.num === num), { asign: asignDe(asign), delCapitulo: del });
    arch = libro(MYPET, { 18: 'TODOS', 31: 'X' });
    let r = M.castRellenar(null, {}, null, null, null, { secciones: [
      sec('101', { 'RORY CRAWFORD': 'MIGUEL PRADA', 'SANDY CRAWFORD': 'LORENZO MORALES', GIRL: 'X' }, ['RORY CRAWFORD', 'SANDY CRAWFORD', 'GIRL']),
      sec('102', { RORY: 'MIGUEL PRADA', SANDY: 'LORENZO MORALES', GIRL: 'LAURA ROBAYO' }, ['RORY', 'SANDY', 'GIRL']) ] });
    const actores = M.castLeerColumnaTexto(arch, dec(arch['xl/worksheets/sheet1.xml']), 'D');
    t.eq('GIRL: en el 101 lo que dice el 101, en el 102 lo del 102', [actores[17], actores[30]].join(' / '), 'X / LAURA ROBAYO');
    t.eq('cada uno, el suyo', [actores[14], actores[27], actores[16], actores[29]].join(' · '), 'MIGUEL PRADA · MIGUEL PRADA · LORENZO MORALES · LORENZO MORALES');
    t.ok('la fila «EPS …» no se toca', !actores[13] && !actores[26]);
    t.eq('los dos completos: COMPLETO', JSON.stringify([r.completo, r.faltanActor]), '[true,[]]');
    t.eq('el resumen por episodio', JSON.stringify(r.secciones.map(x => [x.num, x.total, x.faltan.length])), '[["101",4,0],["102",4,0]]');

    arch = libro(MYPET, { 18: 'TODOS', 31: 'X' });
    r = M.castRellenar(null, {}, null, null, null, { secciones: [
      sec('101', { 'RORY CRAWFORD': 'MIGUEL PRADA', 'SANDY CRAWFORD': 'LORENZO MORALES', GIRL: 'X' }, ['RORY CRAWFORD', 'SANDY CRAWFORD', 'GIRL']),
      sec('102', { RORY: 'MIGUEL PRADA' }, ['RORY', 'SANDY', 'GIRL']) ] });
    t.eq('el 101 completo y al 102 le faltan dos: INCOMPLETO, y se dice de cuál', JSON.stringify([r.completo, r.faltanActor]), '[false,["SANDY (102)","GIRL (102)"]]');

    arch = libro(MYPET, { 18: 'TODOS', 31: 'X' });
    r = M.castRellenar(null, {}, null, null, null, { secciones: [
      sec('101', { 'RORY CRAWFORD': 'MIGUEL PRADA', 'SANDY CRAWFORD': 'LORENZO MORALES', GIRL: 'X' }, ['RORY CRAWFORD', 'SANDY CRAWFORD', 'GIRL']),
      Object.assign(sec('102', {}, []), { sinDatos: true }) ] });
    t.eq('el 102 todavía sin casting: INCOMPLETO (no cuenta como hecho)', JSON.stringify([r.completo, r.secciones[1].sinDatos, r.faltanActor.length]), '[false,true,3]');

    arch = libro({ 14: 'RORY', 15: 'GIRL' }, {});
    r = M.castRellenar(null, asignDe({ RORY: 'MIGUEL PRADA', GIRL: 'X' }), null, null, ['RORY', 'GIRL']);
    t.eq('un desglose normal, como siempre', JSON.stringify([r.completo, r.secciones]), '[true,null]');
  }

  t.seccion('4 · lo guardado del otro episodio');
  {
    const s = CV.cvSecciones(MYPET);
    const eps = [{ id: 'a', name: 'MY PET AND ME 101' }, { id: 'b', name: 'MY PET AND ME 102' }];
    nube.b = { updated_at: '2026-11-18T10:00:00Z', data: { chars: [{ display: 'RORY', talent: 'MIGUEL PRADA' }, { display: 'GIRL', talent: 'LAURA ROBAYO' }, { display: 'SANDY', talent: '' }],
                                                           training: { 'LAURA ROBAYO': { nombre: 'LAURA ROBAYO', tel: '3001234567' } } } };
    const p = await CV.cvPrepararSecciones(s, eps[0], eps, { asign: asignDe({ 'RORY CRAWFORD': 'MIGUEL PRADA' }), delCapitulo: ['RORY CRAWFORD'], training: {} });
    t.ok('el abierto, con lo de las tarjetas (una copia: lo del otro no se le mezcla)', p[0].abierto && p[0].asign[K('RORY CRAWFORD')] === 'MIGUEL PRADA');
    t.eq('el otro, de lo guardado: su casting, sus personajes y su training', JSON.stringify([p[1].asign, p[1].delCapitulo, p[1].training]),
         JSON.stringify([asignDe({ RORY: 'MIGUEL PRADA', GIRL: 'LAURA ROBAYO' }), ['RORY', 'GIRL', 'SANDY'], { [K('GIRL')]: { tel: '3001234567' } }]));
    local['data:b'] = { stamp: '2026-11-18T12:00:00Z', data: { chars: [{ display: 'RORY', talent: 'OTRO' }] } };
    const p2 = await CV.cvPrepararSecciones(s, eps[0], eps, { asign: {}, delCapitulo: [], training: {} });
    t.eq('si este equipo tiene algo más nuevo que la nube, eso', p2[1].asign[K('RORY')], 'OTRO');
    const p3 = await CV.cvPrepararSecciones(s, eps[0], [eps[0]], { asign: {}, delCapitulo: [], training: {} });
    t.ok('si el programa no tiene el 102, se dice', p3[1].sinCapitulo);
  }

  t.seccion('5 · subirlo una vez vale para los dos');
  {
    const s = CV.cvSecciones(MYPET);
    const eps = [{ id: 'a', name: 'MY PET AND ME 101' }];
    const g = await CV.cvGuardarEnLosDemas(new Uint8Array([1]), 'DES 101.102.xlsx', s, eps[0], eps, 'show1');
    t.eq('el 102 aún no existe: queda esperándolo por su número', JSON.stringify([g.guardados, g.faltan, subidos]), '[[],["102"],["show1/vinculo-102/formato-casting.xlsm"]]');
    t.ok('y la ruta va dentro de la carpeta del programa (las reglas del almacén lo exigen)', /^show1\//.test(CV.cvFormatoPathVinc('show1', '102')));
    subidos.length = 0;
    const g2 = await CV.cvGuardarEnLosDemas(new Uint8Array([1]), 'DES 101.102.xlsx', s, eps[0], eps.concat([{ id: 'b', name: 'MY PET AND ME 102' }]), 'show1');
    t.eq('el 102 ya existe: se le guarda a él', JSON.stringify([g2.guardados, subidos, !!local['ddl-formato-ep::b']]), '[["MY PET AND ME 102"],["show1/b/formato-casting.xlsm"],true]');
    const trae = { 'RORY CRAWFORD': 'MIGUEL PRADA', RORY: 'MIGUEL PRADA', GIRL: 'X' };
    t.eq('lo que ya traía el archivo, solo de las filas del episodio abierto', Object.keys(CV.cvCastingDeSeccion(trae, MYPET, s[1])).join(','), 'RORY,GIRL');
  }

  t.seccion('6 · CASTING 1, por talento dentro de cada episodio');
  {
    const fila = (r, p, l) => '<row r="' + r + '"><c r="A' + r + '" t="str"><v>' + p + '</v></c>' + (l ? '<c r="C' + r + '" t="str"><v>' + l + '</v></c>' : '') + '</row>';
    const hoja = '<worksheet><sheetData>' + '<row r="15"><c r="A15" t="str"><v>PERSONAJE</v></c><c r="C15" t="str"><v>LOCUTOR</v></c></row>'
      + fila(17, 'EPS 101') + fila(18, 'GIRL', 'X') + fila(19, 'RORY CRAWFORD', 'MIGUEL PRADA') + fila(20, 'HAYLEY', 'LAURA ROBAYO')
      + fila(21, 'EPS 102') + fila(22, 'WOODY', 'NICOLAS MAHECHA') + fila(23, 'ADAM', 'DIEGO REBOLLEDO') + fila(24, 'GIRL', 'X')
      + '</sheetData></worksheet>';
    const a = { 'xl/workbook.xml': enc('<workbook xmlns:r="x"><sheets><sheet name="CASTING 1" sheetId="1" r:id="rId1"/></sheets></workbook>'),
                'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
                'xl/worksheets/sheet1.xml': enc(hoja) };
    const c = vm.createContext({ TextDecoder, TextEncoder, console });
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'castorden.js'), 'utf8') + ';this.O = corOrdenarCasting1; this.RE = CORD_SECCION_RE;', c);
    const pedidos = [];
    const x = c.O(a, { actorDe: (p, sec) => { pedidos.push(p + '@' + sec); return p === 'GIRL' && sec === 'EPS 102' ? 'ANA' : null; } });
    t.eq('cada episodio, ordenado por su lado; las filas «EPS» en su sitio', x.orden.join(' | '),
         'EPS 101 (-) | HAYLEY (LAURA ROBAYO) | RORY CRAWFORD (MIGUEL PRADA) | GIRL (X) | EPS 102 (-) | GIRL (ANA) | ADAM (DIEGO REBOLLEDO) | WOODY (NICOLAS MAHECHA)');
    t.ok('el actor de ahora se pide sabiendo de qué episodio es (GIRL tiene uno distinto en cada uno)', pedidos.includes('GIRL@EPS 101') && pedidos.includes('GIRL@EPS 102') && !pedidos.some(p => /^EPS/.test(p)));
    t.eq('cuenta los episodios', x.episodios, 2);
    t.eq('la misma regla de «EPS …» que js/castvinculo.js', String(c.RE), String(CV.CV_SECCION_RE));
  }

  t.seccion('7 · el nombre y el cableado');
  {
    t.eq('DES_MY PET AND ME 101.102_COMPLETO', M.castNombreDescarga('My Pet and Me', '101.102', '101.102', true, 'xlsx'), 'DES_MY PET AND ME 101.102_COMPLETO.xlsx');
    t.ok('la descarga mira si el desglose es unido y lee el otro episodio', /const secsV = \(typeof cvSeccionesDelArchivo === 'function'\) \? cvSeccionesDelArchivo\(buf\) : null;/.test(HTML)
         && /vinc = await cvPrepararSecciones\(secsV, epAb, epsV, \{ asign: asign, delCapitulo: delCapitulo, training: training \}\);/.test(HTML)
         && /castNombreDescarga\(programa, cvNums\(vinc\), cvNums\(vinc\), r\.completo, r\.ext, false\)/.test(HTML));
    t.ok('el aviso dice cómo va cada episodio', /msg \+= ' · 🔗 ' \+ castVincResumen\(r\.secciones\);/.test(HTML));
    t.ok('las respuestas de «¿es real?» van al episodio de su fila', /if\(sv\) for\(const nm of \(ps\.noHablan \|\| \[\]\)\)\{ const k = castClave\(nm\); if\(extra\[k\]\) sv\.asign\[k\] = extra\[k\]; \}/.test(HTML));
    t.ok('al subirlo: se guarda en los demás y solo se hereda lo del abierto', /const g = await cvGuardarEnLosDemas\(buf, file\.name, secsV, epAb, epsV, LDB\.showId\);/.test(HTML)
         && /if\(secAbierta\) trae = cvCastingDeSeccion\(trae, persMapa, secAbierta\);/.test(HTML));
    t.ok('un episodio creado después lo encuentra solo', /const v = await cvFormatoEsperando\(showId, /.test(HTML));
    t.ok('el módulo se carga y queda para usar sin conexión', /<script src="\.\/js\/castvinculo\.js"><\/script>/.test(HTML) && /'\.\/js\/castvinculo\.js'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')));
  }
};
