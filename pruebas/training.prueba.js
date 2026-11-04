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

  t.seccion('3 · el clic derecho y el guardado');
  {
    const V = { avisos: [], hist: [], pintadas: 0, planilla: 0, subidas: 0, items: [], prevenidos: 0, modal: null };
    const mk = () => { const e = { children: [], style: {}, classList: { add(){}, remove(){} }, setAttribute(){}, appendChild(h){ e.children.push(h); return h; }, remove(){ V.cerrado = true; }, contains: () => false,
      set onclick(f){ e._click = f; }, get onclick(){ return e._click; }, addEventListener(){}, querySelector: () => ({ value: '316 847 9418', focus(){}, select(){}, addEventListener(){}, set onclick(f){} }), querySelectorAll: () => [] }; return e; };
    const charIdx = { A: { key: 'A', display: 'LYLA', talent: 'ANA' }, B: { key: 'B', display: 'LOUIS', talent: 'LUZ', training: true, tel: '3001112233' } };
    const raws = [{ key: 'A', talent: 'ANA' }, { key: 'B', talent: 'LUZ', training: true, tel: '3001112233' }];
    const ctx = vm.createContext({ console, setTimeout, DDL_MODO: 'casting', charIdx, window: { _charsRaw: raws, innerWidth: 1000, innerHeight: 800, addEventListener(){} },
      document: { createElement: () => { const e = mk(); e.textContent = ''; return e; }, body: { appendChild: (e) => { V.menu = e; return e; } }, getElementById: () => null, addEventListener(){} },
      esc: (x) => String(x == null ? '' : x), fallo(){}, castHistPush: (f, et) => V.hist.push(et + ':' + JSON.stringify(f)), castFoto: (k) => k.map(x => ({ key: x })),
      renderCards: () => V.pintadas++, renderPlanilla: () => V.planilla++, epDataUpsert: async () => V.subidas++, currentEp: { id: 'e1', showId: 's1' },
      DDL_UI: { toast: (m) => V.avisos.push(m) } });
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'training.js'), 'utf8') + ';this.A = { trnMenu, trnPoner, trnGuardar, trnMenuCerrar, trnLimpiarTel, TRN };', ctx);
    const A = ctx.A;
    const ev = { clientX: 100, clientY: 50, preventDefault(){ V.prevenidos++; }, stopPropagation(){} };
    t.eq('en Casting abre el menú; ofrece marcar', String(A.trnMenu(ev, 'A')) + ' ' + V.prevenidos + ' ' + V.menu.children.map(x => x.textContent).join(' | '), 'true 1 LYLA | Marcar como training…');
    t.eq('si ya es training: cambiar el teléfono (con el actual) y quitar', (A.trnMenu(ev, 'B'), V.menu.children.map(x => x.textContent).join(' | ')), 'LOUIS | Cambiar el teléfono… (3001112233) | Quitar training');
    t.eq('el menú queda dentro de la pantalla', V.menu.style.left + ' ' + V.menu.style.top, '100px 50px');
    ctx.DDL_MODO = 'grabacion';
    const antes = V.prevenidos;
    t.eq('fuera de Casting no hace nada (el clic derecho es el de siempre)', String(A.trnMenu(ev, 'A')) + ' ' + (V.prevenidos - antes), 'false 0');
    ctx.DDL_MODO = 'casting';
    await A.trnGuardar('A', true, '  316   847 9418 ');
    t.eq('marcar: en la tarjeta y en lo crudo, con su teléfono limpio', JSON.stringify([charIdx.A.training, charIdx.A.tel, raws[0].training, raws[0].tel]), '[true,"316 847 9418",true,"316 847 9418"]');
    t.eq('se apunta para deshacer, se repinta (tarjetas y tabla), se sube y se avisa', V.hist.length + ' ' + V.pintadas + ' ' + V.planilla + ' ' + V.subidas + ' ' + V.avisos[0], '1 1 1 1 LYLA · training · 316 847 9418');
    await A.trnGuardar('B', false);
    t.eq('quitar: sin marca ni teléfono, en los dos sitios', JSON.stringify([charIdx.B.training, charIdx.B.tel, raws[1].training, raws[1].tel]) + ' ' + V.avisos[1], '[null,null,null,null] LOUIS · ya no es training');
    t.eq('sin teléfono también vale (se puede poner después)', (await A.trnGuardar('A', true, ''), JSON.stringify([charIdx.A.training, charIdx.A.tel]) + ' ' + V.avisos[2]), '[true,""] LYLA · training');
    t.eq('el otro personaje no se entera', JSON.stringify(Object.keys(charIdx).filter(k => charIdx[k].training)), '["A"]');
  }

  t.seccion('4 · deshacer y cableado');
  {
    const HTML = fs.readFileSync(INDEX, 'utf8'), sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
    const charIdx = { A: { key: 'A', display: 'A', talent: 'X', training: true, tel: '123' }, B: { key: 'B', display: 'B', talent: '' } };
    const F = montar([['function castFoto(keys){', 'function castHistPush(']], ['castFoto'], { charIdx });
    t.eq('la foto del deshacer lleva el training solo si lo hay (el resto, como antes)', JSON.stringify(F.castFoto(['A', 'B'])),
         '[{"key":"A","talent":"X","noRec":false,"heredado":false,"gestOk":false,"training":true,"tel":"123"},{"key":"B","talent":"","noRec":false,"heredado":false,"gestOk":false}]');
    t.ok('deshacer lo restaura (y lo quita si antes no estaba)', /if\(e\.training\)\{ c\.training = true; c\.tel = e\.tel \|\| ''; \} else \{ delete c\.training; delete c\.tel; \}/.test(HTML) && /if\(e\.training\)\{ raw\.training = true; raw\.tel = e\.tel \|\| ''; \} else \{ delete raw\.training; delete raw\.tel; \}/.test(HTML));
    t.ok('al abrir un capítulo guardado se sanea (y un training apagado no deja teléfono)', /if\(o\.training!==undefined\)\{ o\.training = o\.training === true; if\(!o\.training\) delete o\.tel; \}/.test(HTML) && /if\(o\.tel!==undefined\) o\.tel = String\(/.test(HTML));
    t.ok('el módulo se carga y va en la caché', /<script src="\.\/js\/training\.js"><\/script>/.test(HTML) && /'\.\/js\/training\.js'/.test(sw));
    t.ok('la tarjeta: clic derecho, marca «training» con su teléfono; la tabla también',
         /card\.addEventListener\('contextmenu', ev=>\{ try\{ if\(typeof trnMenu==='function'\) trnMenu\(ev, c\.key\)/.test(HTML) && /\$\{c\.training\?'<span class="ctrn"/.test(HTML) && /\+\(c\.training\?'<span class="ctrn" title="Training'/.test(HTML));
    t.ok('la descarga: solo los marcados en ESTE capítulo, y avisa de los que no tienen teléfono ni fila',
         /if\(c && c\.training\) training\[castClave\(c\.display \|\| k\)\] = \{ tel: c\.tel \|\| '' \}/.test(HTML) && /castRellenar\(buf, asign, meta, training\)/.test(HTML) && /sin teléfono: /.test(HTML) && /sin fila en el Excel: /.test(HTML));
    t.ok('en amarillo, con su estilo', /\.ctrn\{[^}]*background:#FACC15/.test(HTML) && /\.trn-menu\{/.test(HTML));
  }
};
