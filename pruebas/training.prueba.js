/* Personajes de training · especificacion 02, CAST-43
 *
 * Pedido de sala: «clic derecho a la tarjeta y colocar que ese personaje es de
 * training; se marca en amarillo en el desglose; en el Excel se le pide un
 * número de teléfono, que va donde dice TELEFONO; y en la planilla, al
 * costado derecho de las líneas de ese talento, se pone la palabra training.
 * Importante: eso se marca solo en el programa que lo haga, nada de
 * automatizaciones».
 *
 * Lo que protege esta prueba:
 *   1. el Excel: el teléfono en su celda, el amarillo con los demás atributos
 *      del estilo intactos, «training» a la derecha de TOTAL en la planilla, el
 *      nombre en amarillo en el desglose, y NADIE más tocado;
 *   2. nada se contagia: ni gemelos, ni registro del programa, ni herencia;
 *   3. el menú del clic derecho y el guardado;
 *   4. el deshacer, y que todo esté cableado en la app.
 * La estructura del libro está copiada del desglose real (Final Table 103).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Personajes de training: Excel, menú y sin automatismos';

const RAIZ = path.dirname(INDEX);
const enc = (t) => new TextEncoder().encode(t), dec = (b) => new TextDecoder().decode(b);

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['function castNorm(t){', '/** El número final, si lo hay'],
  ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS'],
  ['function castEscribirCelda(', '/** Mete la cabecera del programa']
];
const EXPORTA = ['castAplicarTraining', 'castAmarillo', 'castCeldaEstilo', 'castClave', 'castColDespuesDeTotal', 'castTelLimpio', 'castTelEsNumero', 'castHojaXml', 'castLeerColumna'];

/* Un libro pequeño con la forma del real: CASTING y PLANILLA con fórmulas que traen el nombre del DESGLOCE. */
const COMPARTIDAS = ['PERSONAJE', 'TOTAL', 'WALLA', 'SONG-YI', 'HAN'];
function libro(o){
  o = o || {};
  const st = '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font/></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="2"><border/><border><left style="thin"/></border></borders>'
    + '<cellXfs count="' + (o.conteoMal ? 9 : 3) + '"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="1" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs></styleSheet>';
  const fila = (n, cells, extra) => '<row r="' + n + '"' + (extra || '') + '>' + cells.join('') + '</row>';
  const f = (ref, s, formula, cache) => '<c r="' + ref + '" s="' + s + '" t="str"><f>' + formula + '</f><v>' + cache + '</v></c>';
  const casting = '<worksheet><sheetData>'
    + fila(12, ['<c r="A12" t="inlineStr"><is><t>LOCUTOR</t></is></c>', '<c r="F12" t="inlineStr"><is><t>TELEFONO</t></is></c>'])
    + fila(13, [f('A13', 1, 'IF(DESGLOCE!A17="","",DESGLOCE!A17)', 'WALLA'), '<c r="D13" s="1" t="inlineStr"><is><t>TODOS</t></is></c>', '<c r="F13" s="1"/>'])
    + fila(14, [f('A14', 1, 'IF(DESGLOCE!A18="","",DESGLOCE!A18)', 'SONG-YI'), '<c r="B14" s="2"/>', '<c r="D14" s="1" t="inlineStr"><is><t>LAURA ROMAN</t></is></c>', '<c r="F14" s="1"/>'])
    + fila(15, [f('A15', 1, 'IF(DESGLOCE!A19="","",DESGLOCE!A19)', 'HAN'), '<c r="D15" s="1" t="inlineStr"><is><t>SANTIAGO BAQUERO</t></is></c>'])
    + '</sheetData></worksheet>';
  const planilla = '<worksheet><sheetData>'
    + fila(14, ['<c r="A14" t="s"><v>0</v></c>', '<c r="' + (o.sinTotal ? 'AR' : 'AB') + '14" t="s"><v>' + (o.sinTotal ? 0 : 1) + '</v></c>'])
    + fila(15, [f('A15', 1, 'IF(DESGLOCE!A17="","",DESGLOCE!A17&amp;"")', 'WALLA'), f('B15', 1, 'IF(CASTING!D13="","",CASTING!D13)', 'TODOS'), '<c r="AB15" s="1"/>', '<c r="AC15" s="1"/>'])
    + fila(16, [f('A16', 1, 'IF(DESGLOCE!A18="","",DESGLOCE!A18&amp;"")', 'SONG-YI'), f('B16', 2, 'IF(CASTING!D14="","",CASTING!D14)', 'LAURA ROMAN'), '<c r="AB16" s="1"/>', '<c r="AC16" s="1"/>'])
    + fila(17, [f('A17', 1, 'IF(DESGLOCE!A19="","",DESGLOCE!A19&amp;"")', 'HAN'), f('B17', 1, 'IF(CASTING!D15="","",CASTING!D15)', 'SANTIAGO BAQUERO')])
    + '</sheetData></worksheet>';
  const desglose = '<worksheet><sheetData>'
    + fila(17, ['<c r="A17" s="1" t="s"><v>2</v></c>', '<c r="B17" s="1" t="inlineStr"><is><t>00:00:30</t></is></c>'])
    + fila(18, ['<c r="A18" s="1" t="s"><v>3</v></c>', '<c r="B18" s="2" t="inlineStr"><is><t>00:00:56</t></is></c>'])
    + fila(19, ['<c r="A19" s="1" t="s"><v>4</v></c>', '<c r="B19" s="1" t="inlineStr"><is><t>00:01:20</t></is></c>'])
    + '</sheetData></worksheet>';
  const arch = {
    'xl/workbook.xml': enc('<workbook xmlns:r="x"><sheets><sheet name="DESGLOCE" sheetId="1" r:id="rId1"/><sheet name="CASTING" sheetId="2" r:id="rId2"/>'
      + (o.sinPlanilla ? '' : '<sheet name="PLANILLA" sheetId="3" r:id="rId3"/>') + '</sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/></Relationships>'),
    'xl/styles.xml': enc(st),
    'xl/sharedStrings.xml': enc('<sst>' + COMPARTIDAS.map(x => '<si><t>' + x + '</t></si>').join('') + '</sst>'),
    'xl/worksheets/sheet1.xml': enc(desglose), 'xl/worksheets/sheet2.xml': enc(casting), 'xl/worksheets/sheet3.xml': enc(planilla)
  };
  return { arch: arch, casting: casting, planilla: planilla, desglose: desglose };
}

exports.pruebas = async function(t){
  const M = montar(RECORTES, EXPORTA, { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console });
  const K = M.castClave;
  const personajes = (L) => M.castLeerColumna(L.casting, 'A');

  t.seccion('1 · el Excel: teléfono, amarillo y «training»');
  {
    const L = libro();
    const r = M.castAplicarTraining(L.arch, L.casting, personajes(L), { [K('SONG-YI')]: { tel: '3168479418' } });
    const cas = r.xml, pla = dec(L.arch['xl/worksheets/sheet3.xml']), des = dec(L.arch['xl/worksheets/sheet1.xml']), st = dec(L.arch['xl/styles.xml']);
    t.eq('lo que se hizo', JSON.stringify({ m: r.marcados, sf: r.sinFila, stl: r.sinTel, p: r.planilla, d: r.desglose }), '{"m":["SONG-YI"],"sf":[],"stl":[],"p":1,"d":1}');
    t.ok('el teléfono, en TELEFONO de su fila, como número', /<c r="F14" s="3"><v>3168479418<\/v><\/c>/.test(cas));
    t.eq('estilos nuevos: un relleno amarillo y una copia de cada estilo que se pinta (0, 1 y 2: también la celda que no existía)', (st.match(/<fills count="(\d+)">/) || [])[1] + ' ' + (st.match(/<cellXfs count="(\d+)">/) || [])[1] + ' ' + /FFFFFF00/.test(st), '3 6 true');
    t.ok('la copia lleva el relleno y se queda con todo lo demás (borde, alineación)',
         /<xf numFmtId="0" fontId="0" fillId="2" borderId="1" applyBorder="1" applyFill="1"\/>/.test(st) && /<xf numFmtId="0" fontId="0" fillId="2" borderId="1" applyBorder="1" applyAlignment="1" applyFill="1"><alignment horizontal="center"\/><\/xf>/.test(st));
    t.ok('la fila del casting, amarilla de la A a la F, también la celda que no existía (C14 no estaba; B14 sí)',
         /<c r="A14" s="3" t="str">/.test(cas) && /<c r="B14" s="4"\/>/.test(cas) && /<c r="C14" s="0"\/>|<c r="C14" s="\d+"\/>/.test(cas) && /<c r="D14" s="3" t="inlineStr">/.test(cas) && /<c r="F14" s="3">/.test(cas));
    t.ok('las fórmulas y lo que había se conservan', /<f>IF\(DESGLOCE!A18="","",DESGLOCE!A18\)<\/f><v>SONG-YI<\/v>/.test(cas) && /<t>LAURA ROMAN<\/t>/.test(cas));
    t.ok('«training» a la derecha de TOTAL (AB → AC), con su fila en amarillo', /<c r="AC16" s="3" t="inlineStr"><is><t xml:space="preserve">training<\/t><\/is><\/c>/.test(pla) && /<c r="A16" s="3" t="str">/.test(pla) && /<c r="B16" s="4" t="str">/.test(pla));
    t.ok('el desglose: su nombre y su tiempo en amarillo', /<c r="A18" s="3" t="s"><v>3<\/v><\/c>/.test(des) && /<c r="B18" s="4" t="inlineStr">/.test(des));
    /* Y nadie más. */
    t.ok('los demás, tal cual: en el casting, la planilla y el desglose', /<c r="A13" s="1" t="str">/.test(cas) && !/training/.test(pla.slice(0, pla.indexOf('<row r="16"'))) && /<c r="A15" s="1" t="str">/.test(cas)
         && pla.slice(pla.indexOf('<row r="17"')) === L.planilla.slice(L.planilla.indexOf('<row r="17"')) && des.slice(des.indexOf('<row r="19"')) === L.desglose.slice(L.desglose.indexOf('<row r="19"'))
         && cas.slice(cas.indexOf('<row r="15"')) === L.casting.slice(L.casting.indexOf('<row r="15"')));
  }
  {
    const L = libro();
    const r = M.castAplicarTraining(L.arch, L.casting, personajes(L), { [K('HAN')]: { tel: '' }, [K('SONG-YI')]: { tel: '+57 316 847 9418' }, [K('NO ESTA')]: { tel: '1' } });
    t.eq('sin teléfono se dice; el que no tiene fila, también', JSON.stringify({ m: r.marcados.sort(), stl: r.sinTel, sf: r.sinFila }), '{"m":["HAN","SONG-YI"],"stl":["HAN"],"sf":["NO ESTA"]}');
    t.ok('un teléfono con «+» y espacios va como texto; sin teléfono, la celda se queda vacía (y amarilla)', /<c r="F14" s="\d+" t="inlineStr"><is><t xml:space="preserve">\+57 316 847 9418<\/t>/.test(r.xml) && !/<c r="F15"[^>]*><v>/.test(r.xml) && /<c r="F15" s="\d+"\/>/.test(r.xml));
    t.eq('el teléfono: cifras → número; con cero delante o corto → texto', ['3168479418', '0316847', '12345', ' 316 847 ', ''].map(x => M.castTelEsNumero(M.castTelLimpio(x))).join(','), 'true,false,false,false,false');
  }
  {
    const L = libro({ sinTotal: true });
    M.castAplicarTraining(L.arch, L.casting, personajes(L), { [K('SONG-YI')]: { tel: '1234567' } });
    t.ok('sin «TOTAL» en la planilla, la columna de siempre (AT)', /<c r="AT16"[^>]*><is><t xml:space="preserve">training<\/t>/.test(dec(L.arch['xl/worksheets/sheet3.xml'])));
  }
  {
    const L = libro({ sinPlanilla: true });
    const r = M.castAplicarTraining(L.arch, L.casting, personajes(L), { [K('SONG-YI')]: { tel: '1234567' } });
    t.eq('sin hoja PLANILLA no se rompe: casting y desglose sí', r.marcados.length + ' ' + r.planilla + ' ' + r.desglose, '1 0 1');
  }
  {
    const L = libro({ conteoMal: true });
    const r = M.castAplicarTraining(L.arch, L.casting, personajes(L), { [K('SONG-YI')]: { tel: '3168479418' } });
    t.eq('si los estilos no cuadran, no se tocan; el teléfono y la palabra se escriben igual', (dec(L.arch['xl/styles.xml']) === dec(libro({ conteoMal: true }).arch['xl/styles.xml'])) + ' ' + /<v>3168479418<\/v>/.test(r.xml), 'true true');
    const V = libro();
    const vacio = M.castAplicarTraining(V.arch, V.casting, personajes(V), {});
    t.ok('sin nadie de training, nada cambia', vacio.xml === V.casting && dec(V.arch['xl/styles.xml']) === dec(libro().arch['xl/styles.xml']) && vacio.marcados.length === 0);
  }

  t.seccion('2 · nada de automatizaciones: solo donde se marca');
  {
    const HTML = fs.readFileSync(INDEX, 'utf8');
    const trozo = (a, b) => HTML.slice(HTML.indexOf(a), HTML.indexOf(b, HTML.indexOf(a)));
    t.ok('el registro del programa (lo que heredan los capítulos siguientes) no sabe de training', !/training|\.tel\b/.test(trozo('async function castRegAnotar()', 'async function castRegRenombrarEp')));
    t.ok('repartir heredando, tampoco', !/training|\.tel\b/.test(trozo('async function castHeredar(', 'function castVerificar')));
    t.ok('ni copiar el talento a los gemelos (ARCHIVO, VO)', !/training|\.tel\b/.test(trozo('function castCopiarAGemelos(', 'function castHojaXml')));
    t.ok('ni fusionar personajes', !/training|\.tel\b/.test(trozo('function applyCharMerges()', 'function mergeCharacters')));
    const c = { key: 'MARK PEYTON', display: 'MARK PEYTON', talent: 'ANA ROJAS', training: true, tel: '1' }, g = { key: 'MARK PEYTON (ARCHIVO)', display: 'MARK PEYTON (ARCHIVO)', talent: '' };
    const G = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['function castClave(t){', '/** Del nombre de la hoja al archivo XML']],
      ['castCopiarAGemelos'], { charIdx: { [c.key]: c, [g.key]: g }, NO_REC: new Set(['X']), castVerificar: () => {}, fallo: () => {}, window: {}, console });
    const hechos = G.castCopiarAGemelos(c.key, c.talent);
    t.eq('el gemelo de ARCHIVO recibe el talento, pero NO el training ni el teléfono', hechos.join(',') + ' · ' + g.talent + ' · ' + JSON.stringify([g.training, g.tel]), 'MARK PEYTON (ARCHIVO) · ANA ROJAS · [null,null]');
  }

  t.seccion('3 · se marca el TALENTO en este capítulo: todos sus personajes, un teléfono');
  {
    const V = { avisos: [], hist: [], pintadas: 0, planilla: 0, subidas: 0, prevenidos: 0 };
    const mk = () => { const e = { children: [], style: {}, setAttribute(){}, appendChild(h){ e.children.push(h); return h; }, remove(){}, contains: () => false, set onclick(f){ e._click = f; }, get onclick(){ return e._click; } }; return e; };
    /* María Coronado hace tres personajes; Luz, uno; uno sin talento y uno ORIGINAL. */
    const charIdx = { A: { key: 'A', display: 'LYLA', talent: 'MARÍA CORONADO' }, B: { key: 'B', display: 'LOUIS', talent: 'LUZ MAR' },
                      C: { key: 'C', display: 'LIANA', talent: 'Maria  Coronado' }, D: { key: 'D', display: 'LUKE', talent: 'MARIA CORONADO' },
                      E: { key: 'E', display: 'THI', talent: '' }, F: { key: 'F', display: 'WALLA', talent: 'ORIGINAL', noRec: true } };
    const ctx = vm.createContext({ console, setTimeout, JSON, DDL_MODO: 'casting', charIdx, chars: Object.values(charIdx), currentEp: { id: 'e1', showId: 's1' },
      window: { _charsRaw: [], innerWidth: 1000, innerHeight: 800, addEventListener(){} },
      document: { createElement: () => { const e = mk(); e.textContent = ''; return e; }, body: { appendChild: (e) => { V.menu = e; return e; } }, getElementById: () => null, addEventListener(){} },
      esc: (x) => String(x == null ? '' : x), fallo(){}, castHistPush: (f, et) => V.hist.push(et + ':' + JSON.stringify(f)),
      renderCards: () => V.pintadas++, renderPlanilla: () => V.planilla++, epDataUpsert: async () => V.subidas++, DDL_UI: { toast: (m) => V.avisos.push(m) } });
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'training.js'), 'utf8') + ';this.A = { trnMenu, trnGuardar, trnDe, trnMapa, trnCargar, trnParaGuardar, trnRestaurar, trnPersonajesDe, trnClave };', ctx);
    const A = ctx.A, textos = () => V.menu.children.map(x => x.textContent).join(' | ');
    const ev = { clientX: 100, clientY: 50, preventDefault(){ V.prevenidos++; }, stopPropagation(){} };
    t.eq('el menú ofrece marcar AL TALENTO, y dice cuántos personajes hace aquí (sin importar tildes ni espacios)', (A.trnMenu(ev, 'A'), textos()), 'LYLA · MARÍA CORONADO | Marcar a MARÍA CORONADO como training… (3 personajes)');
    t.eq('sin talento, no se puede (el training es del talento)', (A.trnMenu(ev, 'E'), textos()), 'THI | Asigna primero el talento: el training es del talento en este capítulo');
    t.eq('ORIGINAL no es un talento', (A.trnMenu(ev, 'F'), textos()), 'WALLA · ORIGINAL | ORIGINAL no es un talento');
    t.eq('el menú queda dentro de la pantalla', V.menu.style.left + ' ' + V.menu.style.top, '100px 50px');
    ctx.DDL_MODO = 'grabacion';
    const antes = V.prevenidos;
    t.eq('fuera de Casting no hace nada (el clic derecho es el de siempre)', String(A.trnMenu(ev, 'A')) + ' ' + (V.prevenidos - antes), 'false 0');
    ctx.DDL_MODO = 'casting';
    await A.trnGuardar('MARÍA CORONADO', true, '  316   847 9418 ');
    t.eq('marcar una vez: sus TRES personajes son training, con el mismo teléfono; los demás no', ['A', 'B', 'C', 'D', 'E', 'F'].map(k => { const x = A.trnDe(charIdx[k]); return k + ':' + (x ? x.tel : '-'); }).join(' '),
         'A:316 847 9418 B:- C:316 847 9418 D:316 847 9418 E:- F:-');
    t.eq('se apunta para deshacer, se repinta, se sube y se avisa', V.hist.length + ' ' + V.pintadas + ' ' + V.planilla + ' ' + V.subidas + ' · ' + V.avisos[0], '1 1 1 1 · MARÍA CORONADO · training en 3 personajes · 316 847 9418');
    t.eq('ya marcado: cambiar el teléfono o quitarlo, desde cualquiera de sus personajes', (A.trnMenu(ev, 'D'), textos()),
         'LUKE · MARIA CORONADO | Cambiar el teléfono de MARIA CORONADO… (316 847 9418) | Quitar training a MARIA CORONADO (3 personajes)');
    t.eq('lo que se guarda con el capítulo: el talento y su teléfono, una vez', JSON.stringify(A.trnParaGuardar()), '{"MARIA CORONADO":{"nombre":"MARÍA CORONADO","tel":"316 847 9418"}}');
    charIdx.E.talent = 'María Coronado';
    t.eq('un personaje al que se le reparte ese talento después, en este capítulo, también lo es', !!A.trnDe(charIdx.E), true);
    charIdx.A.talent = 'LUZ MAR';
    t.eq('y el que deja de tenerlo, deja de serlo', A.trnDe(charIdx.A), null);
    await A.trnGuardar('MARIA CORONADO', false);
    t.eq('quitar: ninguno de sus personajes, y se dice', ['C', 'D', 'E'].map(k => String(A.trnDe(charIdx[k]))).join(',') + ' · ' + V.avisos[1], 'null,null,null · MARIA CORONADO ya no es training');
    A.trnRestaurar(JSON.parse(V.hist[1].split(':').slice(1).join(':'))[0].mapa);
    t.eq('deshacer devuelve la lista como estaba', !!A.trnDe(charIdx.C), true);
    /* Otro capítulo: su lista no vale aquí. */
    ctx.currentEp = { id: 'e2', showId: 's1' };
    t.eq('al cambiar de capítulo, la lista del anterior no vale', JSON.stringify(A.trnMapa()) + ' ' + String(A.trnDe(charIdx.C)), '{} null');
    /* Al abrir un capítulo: su lista, limpia; y la marca de la primera versión (por personaje) pasa a su talento. */
    const viejo = { key: 'X', talent: 'PEDRO PAZ', training: true, tel: '300' }, raw = { key: 'X', talent: 'PEDRO PAZ', training: true, tel: '300' };
    ctx.chars = [viejo]; ctx.window._charsRaw = [raw];
    const m = A.trnCargar({ training: { 'a': { nombre: '  Ana   Ruiz ', tel: ' 1 2 ' }, 'b': 'basura', 'c': { nombre: '' } } }, 'e2');
    t.eq('se sanea lo que viene de la nube y se migra lo viejo', JSON.stringify(m), '{"ANA RUIZ":{"nombre":"Ana Ruiz","tel":"1 2"},"C":{"nombre":"c","tel":""},"PEDRO PAZ":{"nombre":"PEDRO PAZ","tel":"300"}}');
    t.ok('y la marca vieja se quita de los personajes', viejo.training === undefined && viejo.tel === undefined && raw.training === undefined);
  }

  t.seccion('4 · deshacer y cableado');
  {
    const HTML = fs.readFileSync(INDEX, 'utf8'), sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
    const charIdx = { A: { key: 'A', display: 'A', talent: 'X' } };
    const F = montar([['function castFoto(keys){', 'function castHistPush(']], ['castFoto'], { charIdx });
    t.eq('la foto del deshacer de cada personaje, como antes', JSON.stringify(F.castFoto(['A'])), '[{"key":"A","talent":"X","noRec":false,"heredado":false,"gestOk":false}]');
    t.ok('deshacer devuelve la lista de training', /if\(e\.key === '__training'\)\{ try\{ trnRestaurar\(e\.mapa\); \}/.test(HTML));
    t.ok('la lista se guarda con el capítulo y se carga al abrirlo', /training: \(typeof trnParaGuardar === 'function'\) \? trnParaGuardar\(\) : null \};/.test(HTML)
         && /if\(typeof trnCargar==='function'\) trnCargar\(d, d\._epId \|\| \(currentEp && currentEp\.id\)\)/.test(HTML));
    t.ok('el módulo se carga y va en la caché', /<script src="\.\/js\/training\.js"><\/script>/.test(HTML) && /'\.\/js\/training\.js'/.test(sw));
    t.ok('la tarjeta: clic derecho y la marca «training» con su teléfono; la tabla también',
         /card\.addEventListener\('contextmenu', ev=>\{ try\{ if\(typeof trnMenu==='function'\) trnMenu\(ev, c\.key\)/.test(HTML) && (HTML.match(/const t = \(typeof trnDe==='function'\) \? trnDe\(c\) : null; return t \? '<span class="ctrn"/g) || []).length === 2);
    t.ok('la descarga: los personajes de los talentos de training de ESTE capítulo, y avisa de los que no tienen teléfono ni fila',
         /t = \(typeof trnDe === 'function'\) \? trnDe\(c\) : null; if\(t\) training\[castClave\(c\.display \|\| k\)\] = \{ tel: t\.tel \|\| '' \}/.test(HTML) && /castRellenar\(buf, asign, meta, training, delCapitulo\)/.test(HTML) && /sin teléfono: /.test(HTML) && /sin fila en el Excel: /.test(HTML));
    t.ok('en amarillo, con su estilo', /\.ctrn\{[^}]*background:#FACC15/.test(HTML) && /\.trn-menu\{/.test(HTML));
  }
};
