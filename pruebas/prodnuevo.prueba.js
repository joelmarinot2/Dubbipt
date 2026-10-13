/* Un episodio nuevo entra en Producción · especificacion 09, PRO-47
 *
 * Pedido de sala: «todos los programas que ingrese nuevos tienen que pedirme
 * fecha de entrega y fecha de DUBCARD, quién lo hace y de qué cliente, para
 * que se ponga automáticamente en Producción»; y luego: «no en programa:
 * quiero que se cree por episodio». Lo que protege esta prueba: se piden los
 * cuatro y se dice qué falta; cliente y director vienen puestos con los del
 * programa; al crear, el episodio entra en Producción (programa y capítulo,
 * preproducción, BACKLOT si es Netflix) y el programa en DublajeCast con su
 * cliente y director, sin repetir; el mismo capítulo no se duplica; las
 * listas se completan; y el formulario de «Nuevo episodio» lo lleva (el de
 * «Nuevo programa», no).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Producción: un episodio nuevo entra con su cliente, director y fechas';

const RAIZ = path.dirname(INDEX);
const HTML = fs.readFileSync(INDEX, 'utf8');
const castNorm = (t) => String(t == null ? '' : t).toUpperCase().replace(/\s+/g, ' ').trim();

function armar(o){
  o = o || {};
  const D = { apuntes: [], datos: ('datos' in o) ? o.datos : { produccion: [], clienteList: ['Netflix'], directorList: ['DIEGO'], team: [{ name: 'WILFREDO HUESO', role: 'Director' }, { name: 'ANA', role: 'Técnico' }], series: [], studios: [{ id: 7, name: 'Estudio' }] } };
  const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
    ['dcxSerieNueva', 'dcxUid'], { castNorm: undefined, dcSesion: null, dcLeer: null, dcEscribir: null, prodNormalizar: null, prodGuardar: null, PROD: {} });
  const M = montar([['/* ── Un episodio nuevo entra en Producción', '/* ── Casting en una ventana emergente']],
    ['csProdNuevoValidar', 'csProdNuevoOpciones', 'csEpisodioNuevoEnProduccion', 'csCalendario'],
    { castNorm: castNorm, csDatos: () => ({ datos: D.datos }), dcxUid: DX.dcxUid, dcxSerieNueva: DX.dcxSerieNueva, dcastSerieDe: (show, d) => ((d && d.series) || []).find(x => castNorm(x.name) === castNorm(show.name)) || null,
      csEditar: async (cambio, que, ctx) => { if(o.sinSesion) return 'sesion'; const copia = JSON.parse(JSON.stringify(D.datos)); const r = cambio(copia); if(r){ D.datos = copia; D.apuntes.push([que, ctx]); } return r ? 'guardado' : 'igual'; } });
  return Object.assign(D, { M: M, DX: DX });
}

exports.pruebas = async function(t){
  t.seccion('1 · se piden los cuatro');
  {
    const A = armar(), M = A.M;
    t.eq('sin nada: falta todo, en palabras', M.csProdNuevoValidar({}).join(' / '), 'el cliente / quién lo hace / la fecha de entrega / la fecha de DUBCARD');
    t.eq('una fecha escrita a mano no vale', M.csProdNuevoValidar({ cliente: 'Netflix', director: 'DIEGO', fecha_miami: '14/10/2026', fecha_dubcard: '2026-10-20' }).join(' / '), 'la fecha de entrega');
    t.eq('con todo, nada falta', M.csProdNuevoValidar({ cliente: ' Netflix ', director: 'DIEGO', fecha_miami: '2026-10-14', fecha_dubcard: '2026-10-20' }).length, 0);
    t.eq('las opciones: los clientes de DublajeCast y los directores (del equipo primero, sin repetir)', JSON.stringify(M.csProdNuevoOpciones()), '{"clientes":["Netflix"],"directores":["WILFREDO HUESO","DIEGO"],"cliente":"","director":""}');
    t.eq('sin datos de DublajeCast, listas vacías', JSON.stringify(armar({ datos: null }).M.csProdNuevoOpciones()), '{"clientes":[],"directores":[],"cliente":"","director":""}');
    t.eq('si faltan, no se guarda nada', (await M.csEpisodioNuevoEnProduccion('AKKA', 'Episodio 1', { cliente: 'Netflix' })) + ' ' + A.datos.produccion.length, 'faltan 0');
  }

  t.seccion('2 · al crearlo entra en Producción, y su programa en DublajeCast');
  {
    const A = armar(), M = A.M;
    const r = await M.csEpisodioNuevoEnProduccion('  Akka  Temporada 2 ', ' Episodio  101 ', { cliente: 'netflix', director: 'MARÍA PAZ', fecha_miami: '2026-10-14', fecha_dubcard: '2026-10-20' });
    const f = A.datos.produccion[0];
    t.eq('la fila de Producción: programa y capítulo, en preproducción, con su cliente, quién lo hace y sus fechas; Netflix va en BACKLOT', r + ' ' + JSON.stringify([f.programa, f.capitulo, f.cliente, f.director, f.fecha_miami, f.formato_dubcard, f.fecha_dubcard, f.fase, f.desglose_provisional, f.casting_completo]),
         'guardado ["Akka Temporada 2","Episodio 101","netflix","MARÍA PAZ","2026-10-14","BACKLOT","2026-10-20","pre_produccion",false,false]');
    t.ok('con su id', f.id != null && String(f.id).length > 6);
    const s = A.datos.series[0];
    t.eq('y el programa en DublajeCast, con su cliente y su director, en curso', JSON.stringify([s.name, s.cliente, s.director, s.status, s.type, s.studio_id, s.requiere_dubcard]), '["Akka Temporada 2","netflix","MARÍA PAZ","en_curso","serie",7,true]');
    t.eq('el cliente ya estaba en la lista (igual con otra mayúscula); el director se añade (no es del equipo)', JSON.stringify([A.datos.clienteList, A.datos.directorList]), '[["Netflix"],["DIEGO","MARÍA PAZ"]]');
    t.ok('queda apuntado quién hizo qué, con programa y episodio', /Episodio nuevo en Producción: Akka Temporada 2 · Episodio 101 · netflix · MARÍA PAZ · entrega 2026-10-14 · DUBCARD 2026-10-20/.test(A.apuntes[0][0]) && A.apuntes[0][1].programa === 'Akka Temporada 2' && A.apuntes[0][1].episodio === 'Episodio 101');
    t.eq('el siguiente episodio del programa trae puestos su cliente y su director', JSON.stringify([M.csProdNuevoOpciones({ id: 's1', name: 'AKKA TEMPORADA 2' }).cliente, M.csProdNuevoOpciones({ id: 's1', name: 'AKKA TEMPORADA 2' }).director]), '["netflix","MARÍA PAZ"]');
    await M.csEpisodioNuevoEnProduccion('Akka Temporada 2', 'Episodio 102', { cliente: 'DELUX', director: 'WILFREDO HUESO', fecha_miami: '2026-11-01', fecha_dubcard: '2026-11-02' });
    t.eq('otro episodio, otra fila; otro cliente nuevo va a la lista; un director del equipo, no; sin Netflix, formato Excel', A.datos.produccion.length + ' ' + JSON.stringify([A.datos.clienteList, A.datos.directorList, A.datos.produccion[0].formato_dubcard]), '2 [["Netflix","DELUX"],["DIEGO","MARÍA PAZ"],"Excel"]');
    await M.csEpisodioNuevoEnProduccion('AKKA TEMPORADA 2', 'episodio 101', { cliente: 'Netflix', director: 'DIEGO', fecha_miami: '2026-12-01', fecha_dubcard: '2026-12-02' });
    t.eq('el mismo capítulo del mismo programa no se repite: se pone al día', A.datos.produccion.length + ' ' + JSON.stringify([A.datos.produccion[1].capitulo, A.datos.produccion[1].director, A.datos.produccion[1].fecha_miami, A.datos.series.length]), '2 ["Episodio 101","DIEGO","2026-12-01",1]');
    t.eq('sin programa o sin capítulo, nada', (await M.csEpisodioNuevoEnProduccion('  ', 'Ep', { cliente: 'X', director: 'Y', fecha_miami: '2026-01-01', fecha_dubcard: '2026-01-02' })) + ' ' + (await M.csEpisodioNuevoEnProduccion('P', '', { cliente: 'X', director: 'Y', fecha_miami: '2026-01-01', fecha_dubcard: '2026-01-02' })), 'nada nada');
    t.eq('sin sesión de DublajeCast, lo dice (y se pide entrar)', await armar({ sinSesion: true }).M.csEpisodioNuevoEnProduccion('Z', 'Ep 1', { cliente: 'X', director: 'Y', fecha_miami: '2026-01-01', fecha_dubcard: '2026-01-02' }), 'sesion');
  }

  t.seccion('3 · un programa que ya estaba en DublajeCast no se repite, y presta su cliente y director');
  {
    const A = armar({ datos: { produccion: [], series: [{ id: 1, name: 'AKKA', cliente: '', director: 'DIEGO', status: 'en_curso' }], studios: [] } }), M = A.M;
    t.eq('al crear un episodio de un programa de DublajeCast, vienen puestos su cliente y su director', JSON.stringify(M.csProdNuevoOpciones({ id: 's1', name: 'Akka' })), '{"clientes":[],"directores":[],"cliente":"","director":"DIEGO"}');
    await M.csEpisodioNuevoEnProduccion('akka', 'Episodio 1', { cliente: 'Netflix', director: 'MARÍA', fecha_miami: '2026-10-14', fecha_dubcard: '2026-10-20' });
    t.eq('la misma serie, con el cliente que le faltaba y su director de siempre', A.datos.series.length + ' ' + JSON.stringify([A.datos.series[0].cliente, A.datos.series[0].director]), '1 ["Netflix","DIEGO"]');
    t.eq('dcxSerieNueva sin nombre, nada', A.DX.dcxSerieNueva({ series: [] }, { name: ' ' }), null);
  }

  t.seccion('4 · el formulario de «Nuevo episodio» (y no el de programa)');
  {
    t.ok('pide cliente, quién lo hace, fecha de entrega y fecha de DUBCARD, con calendario, con los del programa ya puestos', ['neCliente', 'neDirector', 'neMiami', 'neDubcard'].every(id => HTML.indexOf('id="' + id + '"') >= 0) && /csCalendario\(q\('neMiami'\)\); csCalendario\(q\('neDubcard'\)\)/.test(HTML) && /value="'\+esc\(opciones\.cliente\|\|''\)\+'"/.test(HTML));
    t.ok('solo para quien puede escribir en DublajeCast, y con las listas que ya conoce', /const conProd = \(typeof prodPuede==='function' && prodPuede\(\) && typeof csEpisodioNuevoEnProduccion==='function'\);/.test(HTML) && /csProdNuevoOpciones\(showProd\)/.test(HTML) && /list="neClientes"/.test(HTML));
    t.ok('no deja crear si falta algo, y lo dice', /const faltan = csProdNuevoValidar\(prod\); if\(faltan\.length\)\{ q\('neErr'\)\.textContent='Para Producción falta '\+faltan\.join\(', '\); return; \}/.test(HTML));
    t.ok('al guardar el episodio, entra en Producción con el programa y el capítulo', /await saveEpHere\(\);[\s\S]{0,200}await csEpisodioNuevoEnProduccion\(showProd \? showProd\.name : '', name, prod\)/.test(HTML));
    t.ok('«Nuevo programa» no lo pide', !/npCliente|npMiami|csProgramaNuevoEnProduccion/.test(HTML));
    const E = { ev: [] }; const el = { onclick: null, onkeydown: null, value: '2026-10-14', showPicker(){ E.ev.push('picker'); } };
    const M = armar().M; M.csCalendario(el);
    el.onclick(); el.onkeydown({ key: 'a', preventDefault(){ E.ev.push('pd'); } }); el.onkeydown({ key: 'Backspace', preventDefault(){ E.ev.push('pd'); } }); el.onkeydown({ key: 'Tab', preventDefault(){ E.ev.push('pd'); } });
    t.eq('la fecha abre el calendario al pulsar o al teclear; Retroceso la borra; Tab pasa', E.ev.join(',') + ' ' + el.value, 'picker,pd,picker,pd ');
  }
};
