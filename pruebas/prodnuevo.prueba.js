/* Un programa nuevo entra en Producción · especificacion 09, PRO-47
 *
 * Pedido de sala: «todos los programas que ingrese nuevos tienen que pedirme
 * fecha de entrega y fecha de DUBCARD, quién lo hace y de qué cliente, para
 * que se ponga automáticamente en Producción». Lo que protege esta prueba:
 * se piden los cuatro y se dice qué falta; al crear, el programa entra en
 * Producción (preproducción, BACKLOT si es Netflix) y en DublajeCast con su
 * cliente y director, sin repetir un programa que ya estaba; las listas de
 * clientes y directores se completan; y el formulario de «Nuevo programa» lo
 * lleva.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Producción: un programa nuevo entra con su cliente, director y fechas';

const RAIZ = path.dirname(INDEX);
const HTML = fs.readFileSync(INDEX, 'utf8');
const castNorm = (t) => String(t == null ? '' : t).toUpperCase().replace(/\s+/g, ' ').trim();

function armar(o){
  o = o || {};
  const D = { apuntes: [], datos: ('datos' in o) ? o.datos : { produccion: [], clienteList: ['Netflix'], directorList: ['DIEGO'], team: [{ name: 'WILFREDO HUESO', role: 'Director' }, { name: 'ANA', role: 'Técnico' }], series: [], studios: [{ id: 7, name: 'Estudio' }] } };
  const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
    ['dcxSerieNueva', 'dcxUid'], { castNorm: undefined, dcSesion: null, dcLeer: null, dcEscribir: null, prodNormalizar: null, prodGuardar: null, PROD: {} });
  const M = montar([['/* ── Un programa nuevo entra en Producción', '/* ── Casting en una ventana emergente']],
    ['csProdNuevoValidar', 'csProdNuevoOpciones', 'csProgramaNuevoEnProduccion', 'csCalendario'],
    { castNorm: castNorm, csDatos: () => ({ datos: D.datos }), dcxUid: DX.dcxUid, dcxSerieNueva: DX.dcxSerieNueva,
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
    t.eq('las opciones: los clientes de DublajeCast y los directores (del equipo primero, sin repetir)', JSON.stringify(M.csProdNuevoOpciones()), '{"clientes":["Netflix"],"directores":["WILFREDO HUESO","DIEGO"]}');
    t.eq('sin datos de DublajeCast, listas vacías', JSON.stringify(armar({ datos: null }).M.csProdNuevoOpciones()), '{"clientes":[],"directores":[]}');
    t.eq('si faltan, no se guarda nada', (await M.csProgramaNuevoEnProduccion('AKKA', { cliente: 'Netflix' })) + ' ' + A.datos.produccion.length, 'faltan 0');
  }

  t.seccion('2 · al crearlo entra en Producción y en DublajeCast');
  {
    const A = armar(), M = A.M;
    const r = await M.csProgramaNuevoEnProduccion('  Akka  Temporada 2 ', { cliente: 'netflix', director: 'MARÍA PAZ', fecha_miami: '2026-10-14', fecha_dubcard: '2026-10-20' });
    const f = A.datos.produccion[0];
    t.eq('la fila de Producción: en preproducción, con su cliente, quién lo hace y sus fechas; Netflix va en BACKLOT', r + ' ' + JSON.stringify([f.programa, f.capitulo, f.cliente, f.director, f.fecha_miami, f.formato_dubcard, f.fecha_dubcard, f.fase, f.desglose_provisional, f.casting_completo]),
         'guardado ["Akka Temporada 2","","netflix","MARÍA PAZ","2026-10-14","BACKLOT","2026-10-20","pre_produccion",false,false]');
    t.ok('con su id', f.id != null && String(f.id).length > 6);
    const s = A.datos.series[0];
    t.eq('y el programa en DublajeCast, con su cliente y su director, en curso', JSON.stringify([s.name, s.cliente, s.director, s.status, s.type, s.studio_id, s.requiere_dubcard]), '["Akka Temporada 2","netflix","MARÍA PAZ","en_curso","serie",7,true]');
    t.eq('el cliente ya estaba en la lista (igual con otra mayúscula); el director se añade (no es del equipo)', JSON.stringify([A.datos.clienteList, A.datos.directorList]), '[["Netflix"],["DIEGO","MARÍA PAZ"]]');
    t.ok('queda apuntado quién hizo qué', /Programa nuevo en Producción: Akka Temporada 2 · netflix · MARÍA PAZ · entrega 2026-10-14 · DUBCARD 2026-10-20/.test(A.apuntes[0][0]) && A.apuntes[0][1].programa === 'Akka Temporada 2');
    await M.csProgramaNuevoEnProduccion('Otro', { cliente: 'DELUX', director: 'WILFREDO HUESO', fecha_miami: '2026-11-01', fecha_dubcard: '2026-11-02' });
    t.eq('otro cliente nuevo va a la lista; un director del equipo, no; sin Netflix, formato Excel', JSON.stringify([A.datos.clienteList, A.datos.directorList, A.datos.produccion[0].formato_dubcard]), '[["Netflix","DELUX"],["DIEGO","MARÍA PAZ"],"Excel"]');
    t.eq('sin nombre, nada', await M.csProgramaNuevoEnProduccion('  ', { cliente: 'X', director: 'Y', fecha_miami: '2026-01-01', fecha_dubcard: '2026-01-02' }), 'nada');
    t.eq('sin sesión de DublajeCast, lo dice (y se pide entrar)', await armar({ sinSesion: true }).M.csProgramaNuevoEnProduccion('Z', { cliente: 'X', director: 'Y', fecha_miami: '2026-01-01', fecha_dubcard: '2026-01-02' }), 'sesion');
  }

  t.seccion('3 · un programa que ya estaba en DublajeCast no se repite');
  {
    const A = armar({ datos: { produccion: [], series: [{ id: 1, name: 'AKKA', cliente: '', director: 'DIEGO', status: 'en_curso' }], studios: [] } }), M = A.M;
    await M.csProgramaNuevoEnProduccion('akka', { cliente: 'Netflix', director: 'MARÍA', fecha_miami: '2026-10-14', fecha_dubcard: '2026-10-20' });
    t.eq('la misma serie, con el cliente que le faltaba y su director de siempre', A.datos.series.length + ' ' + JSON.stringify([A.datos.series[0].cliente, A.datos.series[0].director]), '1 ["Netflix","DIEGO"]');
    t.eq('dcxSerieNueva sin nombre, nada', A.DX.dcxSerieNueva({ series: [] }, { name: ' ' }), null);
  }

  t.seccion('4 · el formulario de «Nuevo programa»');
  {
    t.ok('pide cliente, quién lo hace, fecha de entrega y fecha de DUBCARD, con calendario', ['npCliente', 'npDirector', 'npMiami', 'npDubcard'].every(id => HTML.indexOf('id="' + id + '"') >= 0) && /csCalendario\(\$q\('npMiami'\)\); csCalendario\(\$q\('npDubcard'\)\)/.test(HTML));
    t.ok('solo para quien puede escribir en DublajeCast, y con las listas que ya conoce', /const conProd = \(typeof prodPuede==='function' && prodPuede\(\) && typeof csProgramaNuevoEnProduccion==='function'\);/.test(HTML) && /csProdNuevoOpciones\(\)/.test(HTML) && /list="npClientes"/.test(HTML));
    t.ok('no deja crear si falta algo, y lo dice', /const faltan = csProdNuevoValidar\(prod\); if\(faltan\.length\)\{ \$q\('npErr'\)\.textContent='Para Producción falta '\+faltan\.join\(', '\); return; \}/.test(HTML));
    t.ok('al crear, entra en Producción y se dice', /await csProgramaNuevoEnProduccion\(name, prod\)/.test(HTML) && /creado'\+\(prod\?' y puesto en Producción':''\)/.test(HTML));
    const E = { ev: [] }; const el = { onclick: null, onkeydown: null, value: '2026-10-14', showPicker(){ E.ev.push('picker'); } };
    const M = armar().M; M.csCalendario(el);
    el.onclick(); el.onkeydown({ key: 'a', preventDefault(){ E.ev.push('pd'); } }); el.onkeydown({ key: 'Backspace', preventDefault(){ E.ev.push('pd'); } }); el.onkeydown({ key: 'Tab', preventDefault(){ E.ev.push('pd'); } });
    t.eq('la fecha abre el calendario al pulsar o al teclear; Retroceso la borra; Tab pasa', E.ev.join(',') + ' ' + el.value, 'picker,pd,picker,pd ');
  }
};
