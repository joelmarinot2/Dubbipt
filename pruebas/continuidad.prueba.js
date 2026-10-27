/* Continuidades original · especificacion 09, PRO-58
   Con dialogue lists de mentira, con la forma de los de Netflix: los de sala
   no entran en el repositorio. */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX, RAIZ } = require('./ayuda');

exports.nombre = 'Casting: continuidades original, desde los libretos';

const CAB = ['IN-TIMECODE', 'OUT-TIMECODE', 'SOURCE', 'TRANSCRIPTION', 'DIALOGUE', 'ANNOTATIONS', 'TAGS', 'SOURCE ONSCREEN', 'FN TREATMENT', 'FN POSITION'];
const L = (tc, cue, dial, o) => { o = o || {}; return [tc, '', cue, o.trans != null ? o.trans : dial, dial, '', o.tags || '', o.off ? 'OFF' : 'ON', '', '']; };
const RES = (filas) => [['CHARACTER NAME', 'DIALOG WORD COUNT', 'TRANSCRIPTION WORD COUNT', 'FOREIGN DIALOGUE WORD COUNT (based on tag)', 'MUSIC AND SONG WORD COUNT (based on tag)', 'BURNEDIN', 'ONSCREEN', 'TOTAL WORD COUNT BY CHARACTER']]
  .concat(filas.map(f => [f[0], f[1], f[1], f[2] || 0, 0, 0, 0, f[1] + (f[2] || 0)]));

/* Tres episodios de una serie inventada. */
const EP = {
  1: { filas: [CAB, L('00:01:00:00', 'ANA', 'Hola.'), L('00:01:05:00', 'ANA', '[REACTION]'), L('00:01:06:00', 'ANA', 'Dime.', { trans: '[REACTION]' }),
               L('00:02:00:00', 'WALLA', '[INDISTINCT]'), L('00:02:10:00', 'GRAPHICS INSERTS', 'MESES DESPUÉS'), L('00:03:00:00', 'LEO', 'Sawubona.', { tags: 'FOREIGN DIALOG' }),
               L('00:04:00:00', 'leo ', 'Vamos.'), L('00:05:00:00', 'MALE STUDENT 1', '¡Eh!'), L('00:06:00:00', 'DR. MORA', 'Bienvenidos al podcast.', { off: true }),
               L('00:00:30:00', 'ANA', 'Primero.'), L('00:07:00:00', 'MIA', 'La la la', { tags: 'SONGS DITTIES' })],
       resumen: RES([['ANA', 9], ['LEO', 1, 1], ['MALE STUDENT 1', 1], ['DR. MORA', 4], ['MIA', 3]]),
       info: { 'SHOW TITLE': 'Serie', 'EPISODE #': 1, 'VERSION': 'V2.0', 'PROXY TYPE': 'FINAL_CUT', 'DATE': 'Sunday 04 October 2026' },
       cambios: [['DESCRIPTION OF CHANGE', 'CHANGE TYPE', 'EDIT DISTANCE', 'OLD IN-TIMECODE', 'NEW IN-TIMECODE', 'OLD OUT-TIMECODE', 'NEW OUT-TIMECODE', 'OLD SOURCE', 'NEW SOURCE'],
                 ['x', 'Source Changed', 0, '', '00:04:00:00', '', '', 'LEON', 'LEO'], ['x', 'Source Changed', 0, '', '00:04:30:00', '', '', 'LEON', 'LEO'],
                 ['x', 'Source Changed', 0, '', '00:01:06:00', '', '', 'LEO', 'ANA'], ['x', 'Source Changed', 0, '', '', '', '', 'WALLA', 'ANA'], ['x', 'In-Time Changed', 0, '', '', '', '', 'ANA', 'ANA']],
       archivo: 'en_DIALOG_LIST-Serie-SerieSeason1Episode1-en-V2-Final_Cut-v5.0.xlsx' },
  2: { filas: [CAB, L('00:01:00:00', 'ANA', 'Otra vez.'), L('00:02:00:00', 'LEO', 'Sí.', { off: true }), L('00:03:00:00', 'BETO', 'Buenas.')],
       resumen: RES([['ANA', 2], ['LEO', 1], ['BETO', 1]]), info: { 'EPISODE #': 2 }, archivo: 'ep2.xlsx' },
  4: { filas: [CAB, L('00:01:00:00', 'ANA', 'Fin.'), L('00:01:30:00', 'ANNA', 'Error de cue.'), L('00:02:00:00', 'LEO', 'Adiós.'), L('00:02:30:00', 'BETO', 'Chao.'), L('00:03:00:00', 'BETO', 'Chao otra vez.')],
       resumen: RES([['ANA', 1], ['ANNA', 3], ['LEO', 1], ['BETO', 3]]), info: {}, archivo: 'Serie_S01_Episode4_dialog.xlsx' }
};

const SIM = montar([['function castSimil(a, b){', '/* ── El registro, guardado por programa']], ['castSimil'], {});
const FF = { strToU8: (s) => s, zipSync: (a) => a };

function armar(o){
  o = o || {};
  const diario = [], avisos = [], guardados = [], idb = {};
  const M = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ CONTINUIDADES ORIGINAL', '/* ═══ FIN DE CONTINUIDADES ORIGINAL']],
    ['CONT', 'CONT_CATEGORIAS', 'contEsIncidental', 'contNumeroEp', 'contLeerLista', 'contTabla', 'contSugerencia', 'contXlsx', 'contHojaXml', 'contColLetra', 'contHtml', 'contCablear', 'contFicha', 'contQuitarEp', 'contDescargar', 'contDe', 'contCargar', 'contGuardar'],
    { castNorm: undefined, castSimil: SIM.castSimil, fflate: FF,
      csEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), csIco: (n) => '<i class="ico-' + n + '"></i>',
      csRepintar: () => diario.push('repintar'), castAviso: (t) => avisos.push(t), fallo: (d) => diario.push('fallo ' + d),
      ioDescargar: (n, b, t) => diario.push(['bajar', n, t, b]),
      idbGet: async (k) => (k in idb ? idb[k] : null), idbSet: async (k, v) => { idb[k] = v; },
      sb: { storage: { from: () => ({ download: async () => o.nube ? { data: { text: async () => JSON.stringify(o.nube) } } : { data: null }, upload: async (ruta, blob) => { guardados.push(ruta); return { error: o.fallaSubir ? { message: 'no' } : null }; } }) } },
      Blob: function(p){ this.p = p; }, document: o.document || {} });
  return { M, diario, avisos, guardados, idb };
}
const espera = () => new Promise(r => setTimeout(r, 0));

exports.pruebas = async function(t){
  const { M } = armar();
  const e1 = M.contLeerLista(EP[1]);

  t.seccion('1 · leer un dialogue list');
  t.eq('el episodio, de Project Info; si no, del nombre del archivo', [M.contNumeroEp({ 'EPISODE #': 3 }, 'x'), M.contNumeroEp({}, 'Serie_S01_Episode4_dialog.xlsx'), M.contNumeroEp({}, 'Show_E07.xlsx'), M.contNumeroEp({}, 'sin numero.xlsx')].map(String).join(' '), '3 4 7 null');
  t.eq('cada personaje, sin WALLA ni rótulos, con el cue limpio', Object.keys(e1.personajes).sort().join(','), 'ANA,DR. MORA,LEO,MALE STUDENT 1,MIA');
  const ana = e1.personajes.ANA;
  t.eq('intervenciones (todas, también los [REACTION]) y reacciones según el DIALOGUE, que es lo que se dobla', ana.intervenciones + ' ' + ana.reacciones, '4 1');
  t.eq('primer y último TC, aunque vengan desordenados', ana.primerTC + ' → ' + ana.ultimoTC, '00:00:30:00 → 00:01:06:00');
  t.eq('las palabras, de Word Count Summary (total y en otro idioma)', ana.palabras + ' · ' + e1.personajes.LEO.palabras + '/' + e1.personajes.LEO.palabrasOtro, '9 · 2/1');
  t.eq('otro idioma, canciones y OFF, por sus etiquetas', [e1.personajes.LEO.otroIdioma, e1.personajes.MIA.canciones, e1.personajes['DR. MORA'].off].join(' '), '1 1 1');
  t.eq('la versión y la fecha', e1.version + ' · ' + e1.fecha, 'FINAL CUT · V2.0 · Sunday 04 October 2026');
  t.eq('los cambios de cue entre versiones, juntos; los de WALLA y los que no cambian, no', JSON.stringify(e1.cambiosNombre.map(c => [c.de, c.a, c.n])), '[["LEON","LEO",2],["LEO","ANA",1]]');
  let mal = '';
  try{ M.contLeerLista({ filas: [['A', 'B'], [1, 2]], archivo: 'raro.xlsx' }); }catch(e){ mal = e.message; }
  t.eq('algo que no es un dialogue list se dice', mal, '«raro.xlsx» no parece un dialogue list: no tiene la columna SOURCE');

  t.seccion('2 · incidentales y con nombre');
  t.eq('genéricos o numerados, incidentales', ['MALE STUDENT 1', 'FEMALE CLUB GOER', 'SECURITY GUARD', 'DRIVER', 'PARTYGOER 2', "ANA'S FRIEND", 'POLICEMAN', 'TALL GANGSTER', 'MAN IN RED SUIT'].map(M.contEsIncidental).join(' '), 'true true true true true true true true true');
  t.eq('con nombre, no', ['LUCAS', 'DR. LUIS MORA', 'MR. SMITH', 'DETECTIVE RUIZ', 'TOM PEREZ', 'ELI'].map(M.contEsIncidental).join(' '), 'false false false false false false');

  t.seccion('3 · la tabla');
  const datos = () => ({ episodios: { 1: M.contLeerLista(EP[1]), 2: M.contLeerLista(EP[2]), 4: M.contLeerLista(EP[4]) }, fichas: {} });
  const T = M.contTabla(datos());
  const fila = (cue) => T.filas.find(r => r.cue === cue);
  t.eq('los episodios leídos, en orden', T.eps.join(','), '1,2,4');
  t.eq('cada personaje: intervenciones por episodio, nº de episodios, debut, última y totales', ['ANA', 'LEO', 'BETO'].map(c => { const r = fila(c); return c + ':' + T.eps.map(n => r.porEp[n] ? r.porEp[n].intervenciones : '-').join('/') + ' ' + r.nEps + 'ep ' + r.debut + '→' + r.ultima + ' ' + r.total + ' ' + r.palabras; }).join(' | '), 'ANA:4/1/1 3ep 1→4 6 12 | LEO:2/1/1 3ep 1→4 4 4 | BETO:-/1/2 2ep 2→4 3 4');
  t.eq('solo voz en un episodio, si todo es OFF', fila('LEO').porEp[2].tipo + ' ' + fila('LEO').porEp[1].tipo, 'voz escena');
  t.eq('la categoría propuesta', ['ANA', 'LEO', 'BETO', 'MIA', 'DR. MORA'].map(c => fila(c).categoria).join(' '), 'Protagonista Protagonista Recurrente Invitado Invitado');
  t.eq('los incidentales, aparte, con su sugerencia de reparto', T.incidentales.map(r => r.cue + ':' + M.contSugerencia(r)).join(' | '), 'MALE STUDENT 1:Loop group / reparto adicional');
  t.eq('cuántos con nombre e incidentales por episodio', T.eps.map(n => T.porEp[n].conNombre + '/' + T.porEp[n].incidentales).join(' '), '4/1 3/0 4/0');
  t.eq('el idioma, propuesto si habla en otro', fila('LEO').idiomas + ' · ' + fila('LEO').idiomasAuto, 'Original; 1 palabras en otro idioma · true');
  t.eq('el detalle por episodio', T.detalle.filter(x => x.ep === 1).map(x => x.cue + ':' + x.tipo).join(', '), 'ANA:En escena, LEO:En escena, DR. MORA:Solo voz (OFF), MIA:En escena, MALE STUDENT 1:En escena');

  t.seccion('4 · las alertas');
  const tipos = T.alertas.map(a => a.tipo + ' · ' + a.donde);
  t.ok('falta un episodio entre medias', tipos.includes('Episodios sin libreto · EP3'));
  t.ok('dos cues que se parecen pero coinciden en un episodio (ANA y ANNA en el EP4) no se juntan', !T.alertas.some(a => a.tipo === 'Normalización de cue'));
  t.ok('un cambio de nombre entre versiones, y aparte las líneas que cambiaron de personaje', T.alertas.some(a => a.tipo === 'Cambio de nombre entre versiones' && /LEON pasó a llamarse LEO en la versión nueva \(2 cues\)/.test(a.detalle)) && T.alertas.some(a => a.tipo === 'Líneas que cambiaron de personaje' && a.detalle === 'LEO → ANA (00:01:06).'));
  t.ok('solo voz, canciones y otro idioma', tipos.includes('Solo voz (OFF) · EP2') && tipos.includes('Canciones · EP1') && T.alertas.some(a => a.tipo === 'Diálogo en otros idiomas' && /LEO \(1 palabras\)/.test(a.detalle)));
  {
    const per = (n) => ({ intervenciones: n, reacciones: 0, off: 0, canciones: 0, otroIdioma: 0, palabras: 0, palabrasOtro: 0, primerTC: '', ultimoTC: '' });
    const T2 = M.contTabla({ episodios: { 1: { personajes: { ROBERTO: per(30) } }, 2: { personajes: { ROBERTO: per(20) } }, 5: { personajes: { ROBERT: per(40) } } }, fichas: {} });
    t.ok('ROBERT y ROBERTO no coinciden nunca y se parecen: se ofrece juntarlos en el que más tiene', T2.alertas.some(a => a.tipo === 'Normalización de cue' && a.juntar && a.juntar.de === 'ROBERT' && a.juntar.a === 'ROBERTO' && /ROBERT \(EP5, 40 cues\) parece el mismo personaje que ROBERTO \(EP1, EP2\)/.test(a.detalle)));
  }
  {
    const d = { episodios: { 1: M.contLeerLista(EP[1]), 2: M.contLeerLista(EP[2]), 4: M.contLeerLista(EP[4]), 5: { personajes: { BETO: { intervenciones: 1 } } } }, fichas: {} };
    const T3 = M.contTabla(d);
    const per = (n) => ({ intervenciones: n, reacciones: 0, off: 0, canciones: 0, otroIdioma: 0, palabras: 0, palabrasOtro: 0, primerTC: '', ultimoTC: '' });
    const T5 = M.contTabla({ episodios: { 1: { personajes: { ANA: per(9), BETO: per(1) } }, 2: { personajes: { BETO: per(1) } }, 4: { personajes: { ANA: per(3), BETO: per(1) } }, 5: { personajes: { ANA: per(2) } } }, fichas: {} });
    t.eq('un personaje de 3 o más episodios que falta en uno entre medias', T5.alertas.filter(a => a.tipo === 'Ausencia').map(a => a.donde + ' ' + a.detalle).join(' | '), 'EP2 ANA no aparece en EP2 (sí antes y después).');
  }

  t.seccion('5 · lo escrito a mano manda');
  {
    const d = datos();
    d.fichas = { ANNA: { alias: 'ANA' }, ANA: { personaje: 'Ana Gómez', categoria: 'Principal', descripcion: 'La jefa.', idiomas: 'Español', notas: 'Le dicen Anita.' }, BETO: { categoria: 'raro' } };
    const T4 = M.contTabla(d), ana = T4.filas.find(r => r.cue === 'ANA');
    t.eq('juntar cues: lo de ANNA pasa a ANA, y se dice', ana.porEp[4].intervenciones + ' ' + ana.alias.join(',') + ' ' + !T4.filas.some(r => r.cue === 'ANNA'), '2 ANNA true');
    t.eq('nombre, categoría, descripción, idiomas y notas', [ana.personaje, ana.categoria, ana.descripcion, ana.idiomas, ana.notas, ana.idiomasAuto].join(' | '), 'Ana Gómez | Principal | La jefa. | Español | Le dicen Anita. | false');
    t.eq('una categoría que no existe no vale: la propuesta', T4.filas.find(r => r.cue === 'BETO').categoria, 'Recurrente');
  }

  t.seccion('6 · el Excel, con sus hojas');
  {
    const X = M.contXlsx(T, 'Serie');
    t.eq('las cinco hojas, como la tabla de sala', (X['xl/workbook.xml'].match(/name="[^"]+"/g) || []).join(' '), 'name="Continuidad" name="Incidentales" name="Alertas y notas" name="Fuentes" name="Detalle por episodio"');
    const h1 = X['xl/worksheets/sheet1.xml'];
    t.ok('el título, combinado, y la cabecera con los episodios leídos', /Serie · Tabla de continuidad de personajes \(EP1–EP4\)/.test(h1) && /<mergeCell ref="A1:O1"\/>/.test(h1) && /<t xml:space="preserve">EP1<\/t>[\s\S]*?EP2[\s\S]*?EP4<\/t>[\s\S]*?Nº de episodios/.test(h1));
    t.ok('en escena en verde y solo voz en amarillo, como la leyenda', /<c r="G6" s="3"><v>4<\/v><\/c>/.test(h1) && /<c r="H7" s="4"><v>1<\/v><\/c>/.test(h1));
    t.ok('la cabecera fija y los anchos', /<pane xSplit="3" ySplit="5" topLeftCell="D6"/.test(h1) && /<col min="5" max="5" width="50"/.test(h1));
    t.ok('los colores, en los estilos', /FF1F3864/.test(X['xl/styles.xml']) && /FFC6EFCE/.test(X['xl/styles.xml']) && /FFFFE699/.test(X['xl/styles.xml']));
    t.ok('las alertas y el detalle', /Normalización de cue|Episodios sin libreto/.test(X['xl/worksheets/sheet3.xml']) && /ANA[\s\S]*?En escena/.test(X['xl/worksheets/sheet5.xml']));
    t.eq('las letras de las columnas', [0, 25, 26, 27, 51, 52].map(M.contColLetra).join(' '), 'A Z AA AB AZ BA');
    t.ok('el texto, escapado', /&lt;b&gt; &amp; &quot;/.test(M.contHojaXml({ filas: [['<b> & "']] })));
  }

  t.seccion('7 · en la pantalla');
  {
    const A = armar();
    const P = { show: { id: 'sF' }, nombre: 'MI SERIE' };
    t.ok('mientras carga, se dice', /Cargando las continuidades/.test(A.M.contHtml(P)));
    await espera(); await espera();
    t.ok('vacío: cómo empezar', /Sube el dialogue list en original de cada episodio/.test(A.M.contHtml(P)) && /data-ct="subir"/.test(A.M.contHtml(P)) && !/data-ct="excel"/.test(A.M.contHtml(P)));
    A.M.CONT.datos.sF = datos();
    const h = A.M.contHtml(P);
    t.ok('con libretos: los episodios leídos, subir más y descargar el Excel', /3 episodios leídos/.test(h) && /<span class="ct-ep" title="ep2\.xlsx">EP2/.test(h) && /data-ct="excel"/.test(h) && /data-ct="quitarEp" data-v="4"/.test(h));
    t.ok('la tabla: cada personaje con sus celdas de color y lo editable', /<td class="ct-cue"><b>ANA<\/b><\/td>[\s\S]*?data-campo="personaje"[\s\S]*?<td class="ct-cel ct-escena">4<\/td><td class="ct-cel ct-escena">1<\/td><td class="ct-cel ct-escena">1<\/td>/.test(h) && /<td class="ct-cel ct-voz">1<\/td>/.test(h));
    t.ok('las alertas y los incidentales', /Alertas y notas \(\d+\)/.test(h) && /<summary>Incidentales \(1\)<\/summary>/.test(h));
    t.ok('un programa solo de DublajeCast no puede: se dice', /el programa tiene que estar en Dubbipt/.test(A.M.contHtml({ show: null })));
    /* Los controles. */
    const els = [];
    const raiz = { querySelectorAll: () => els };
    const el = (attrs) => { const e = { atrs: attrs, value: attrs.value || '', getAttribute: (k) => attrs[k] == null ? null : attrs[k] }; els.push(e); return e; };
    const ficha = el({ 'data-ct': 'ficha', 'data-cue': 'ANA', 'data-campo': 'descripcion', value: ' La jefa. ' });
    const juntar = el({ 'data-ct': 'juntar', 'data-de': 'ANNA', 'data-a': 'ANA' });
    const quitar = el({ 'data-ct': 'quitarEp', 'data-v': '4' });
    const excel = el({ 'data-ct': 'excel' });
    A.M.contCablear(raiz, P);
    ficha.onchange(); await espera();
    t.eq('escribir en la tabla se guarda con el programa', A.M.CONT.datos.sF.fichas.ANA.descripcion + ' · ' + A.guardados.join(',') + ' · ' + !!A.idb['ddl-cont::sF'], 'La jefa. · sF/continuidad.json · true');
    juntar.onclick(); await espera();
    t.eq('«Juntar»', A.M.CONT.datos.sF.fichas.ANNA.alias, 'ANA');
    excel.onclick();
    const baj = A.diario.find(x => Array.isArray(x) && x[0] === 'bajar');
    t.eq('descargar el Excel, con su nombre', baj[1] + ' · ' + baj[2], 'MI_SERIE_Continuidad_Personajes_EP1-EP4.xlsx · application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    quitar.onclick(); await espera();
    t.eq('quitar un episodio', Object.keys(A.M.CONT.datos.sF.episodios).join(','), '1,2');
    const B = armar(); B.M.CONT.datos.sX = { episodios: {}, fichas: {} };
    t.eq('vaciar lo escrito lo quita', (await B.M.contFicha({ id: 'sX' }, 'ANA', 'notas', 'x'), await B.M.contFicha({ id: 'sX' }, 'ANA', 'notas', '  '), JSON.stringify(B.M.CONT.datos.sX.fichas)), '{}');
  }
  {
    const A = armar({ nube: { episodios: { 7: { personajes: {} } }, fichas: {} } });
    t.eq('lo guardado se carga: del equipo primero, si no de la nube', Object.keys((await A.M.contCargar('sQ')).episodios).join(','), '7');
  }

  t.seccion('8 · por dónde se entra');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
  t.ok('el archivo, cargado y en la caché', /<script src="\.\/js\/continuidad\.js"><\/script>/.test(HTML) && /'\.\/js\/continuidad\.js'/.test(SW));
  t.ok('una pestaña más de cada programa de Casting', /pest\('continuidad', 'Continuidades original'/.test(CV) && /else if\(CS\.tab === 'continuidad'\) cuerpo = \(typeof contHtml === 'function'\) \? contHtml\(p\) : '';/.test(CV) && /contCablear\(vista, csActual\(\)\.p\)/.test(CV));
};
