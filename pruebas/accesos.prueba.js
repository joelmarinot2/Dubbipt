/* Registro de accesos · especificacion 07, ENT-24
 *
 * Pedido de sala, por la confidencialidad de Netflix: «un registro de quién
 * abre o descarga cada libreto». Lo que protege esta prueba: que entrar,
 * abrir y subir un libreto, descargar e imprimir quedan apuntados con el
 * programa y el capítulo; que sin conexión o sin la tabla no se pierde nada
 * (y lo de otra cuenta espera a esa cuenta); que abrir el mismo capítulo
 * seguido no llena el registro; que cualquier descarga se apunta; que el
 * administrador lo lee y lo exporta; y que en la nube nadie puede falsearlo
 * ni borrarlo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Registro de accesos';

const RAIZ = path.dirname(INDEX);
const HTML = fs.readFileSync(INDEX, 'utf8');
const UUID = (n) => '00000000-0000-4000-8000-00000000000' + n;

function armar(o){
  o = o || {};
  const V = { ls: {}, enviados: [], fallar: o.fallar || null, clicks: 0 };
  class A { constructor(){ this.attrs = {}; } hasAttribute(k){ return k in this.attrs; } getAttribute(k){ return this.attrs[k]; } }
  A.prototype.click = function(){ V.clicks++; };
  V.A = A;
  V.ctx = { sbUser: { id: 'u1' }, currentEp: { id: UUID(2), showId: UUID(1), name: 'Episodio 101' } };
  V.M = montar([['/* ═══ REGISTRO DE ACCESOS (ENT-24)', 'async function authInit(){']], ['auditar', 'auditarAbrir', 'audEnviar', 'audLeer', 'audEnganchar', 'AUD'],
    { localStorage: { getItem: (k) => (k in V.ls ? V.ls[k] : null), setItem: (k, v) => { V.ls[k] = String(v); } },
      sbUser: V.ctx.sbUser, currentEp: V.ctx.currentEp, LDB: { showId: UUID(1) }, WORKSPACE: { id: UUID(9) },
      sbShows: () => [{ id: UUID(1), name: "BIG JOHN'S BOSH FAMILY" }], navigator: { userAgent: 'Prueba/1.0' },
      window: { OFFLINE: false, addEventListener(){} }, document: { addEventListener(){} }, HTMLAnchorElement: A, setTimeout: () => 0,
      sb: { from: (t) => ({ insert: async (filas) => { if(V.fallar) return { error: V.fallar }; V.enviados.push(...filas.map(f => Object.assign({ tabla: t }, f))); return { error: null }; } }) } });
  return V;
}
const espera = () => new Promise(r => setTimeout(r, 0));

exports.pruebas = async function(t){
  t.seccion('1 · lo que se apunta');
  {
    const V = armar();
    V.M.auditar('abrir_libreto'); await espera();
    const f = V.enviados[0];
    t.eq('a la tabla del registro, con el espacio, el programa y el capítulo (con sus nombres) y el equipo', [f.tabla, f.accion, f.workspace_id, f.show_id, f.episode_id, f.detalle.programa, f.detalle.capitulo, f.agente, !!f.cliente_ts].join(' | '),
         "auditoria | abrir_libreto | " + UUID(9) + ' | ' + UUID(1) + ' | ' + UUID(2) + " | BIG JOHN'S BOSH FAMILY | Episodio 101 | Prueba/1.0 | true");
    t.ok('quién lo hace no lo manda la app: lo pone el servidor', !('user_id' in f) && !('email' in f) && !('creado' in f));
    t.eq('y no queda nada pendiente', V.M.audLeer().length, 0);
    Object.assign(V.ctx.currentEp, { id: 'local-123', showId: null, name: 'Borrador' });
    V.M.auditar('imprimir', { recurso: 'Planilla.pdf' }); await espera();
    t.eq('un id que no es de la nube no rompe el envío: va sin él', [String(V.enviados[1].episode_id), V.enviados[1].detalle.capitulo, V.enviados[1].recurso].join(' '), 'null Borrador Planilla.pdf');
  }
  {
    const V = armar({ fallar: { code: 'PGRST205', message: 'Could not find the table public.auditoria' } });
    V.M.auditar('inicio_sesion'); V.M.auditar('descarga', { recurso: 'a.xlsx' }); await espera();
    t.eq('sin la tabla (o sin red), se guarda en este equipo', V.M.audLeer().map(x => x.f.accion).join(','), 'inicio_sesion,descarga');
    V.fallar = null; V.ctx.sbUser.id = 'u2';
    V.M.auditar('inicio_sesion'); await espera();
    t.eq('lo de otra cuenta espera a esa cuenta: no se manda a nombre de quien está ahora', V.enviados.length + ' ' + V.M.audLeer().length, '1 2');
    V.ctx.sbUser.id = 'u1';
    await V.M.audEnviar();
    t.eq('cuando vuelve, se manda y se vacía', V.enviados.map(x => x.accion).join(',') + ' · ' + V.M.audLeer().length, 'inicio_sesion,inicio_sesion,descarga · 0');
  }
  {
    const V = armar();
    V.M.auditarAbrir(); V.M.auditarAbrir(); await espera();
    Object.assign(V.ctx.currentEp, { id: UUID(3), showId: UUID(1), name: 'Episodio 102' });
    V.M.auditarAbrir(); await espera();
    t.eq('abrir el mismo capítulo seguido cuenta una vez; otro capítulo, otra', V.enviados.map(x => x.detalle.capitulo).join(','), 'Episodio 101,Episodio 102');
  }
  {
    const V = armar();
    V.M.audEnganchar();
    const a = new V.A(); a.attrs.download = 'BigJohnsBoshFamily_101_dubcard_es.xlsx';
    a.click(); const b = new V.A(); b.click(); await espera();
    t.eq('cualquier descarga de Dubbipt se apunta con su archivo, y la descarga sigue', V.enviados.map(x => x.accion + ':' + x.recurso).join(',') + ' · ' + V.clicks, 'descarga:BigJohnsBoshFamily_101_dubcard_es.xlsx · 2');
  }
  {
    const V = armar();
    V.ctx.sbUser.id = 'offline';
    V.M.auditar('abrir_libreto'); await espera();
    t.eq('en el modo sin conexión no hay cuenta a quien apuntarlo', V.enviados.length + ' ' + V.M.audLeer().length, '0 0');
  }

  t.seccion('2 · dónde se apunta');
  t.eq('al abrir un libreto, por los tres caminos', (HTML.match(/auditarAbrir\(\);   \/\/ ENT-24/g) || []).length, 3);
  t.ok('al subir uno, al entrar, al cerrar por inactividad y al imprimir', /auditar\('subir_libreto'/.test(HTML) && /audEnganchar\(\); auditar\('inicio_sesion'\);/.test(HTML) && /auditar\('cierre_' \+ \(motivo \|\| 'sesion'\)\)/.test(HTML)
    && /auditar\('imprimir', \{ recurso: document\.title/.test(HTML) && /auditar\("imprimir"/.test(fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8')));

  t.seccion('3 · Casting → Accesos, para el administrador');
  {
    const llamadas = [];
    const q = { select(){ llamadas.push('select'); return q; }, order(c, o){ llamadas.push('order:' + c + ':' + o.ascending); return q; }, limit(n){ llamadas.push('limit:' + n); return q; },
                eq(c, v){ llamadas.push('eq:' + c + '=' + v); return q; }, ilike(c, v){ llamadas.push('ilike:' + c + '=' + v); return q; }, gte(c){ llamadas.push('gte:' + c); return q; }, lte(c){ llamadas.push('lte:' + c); return q; },
                then(r){ return Promise.resolve({ data: [{ creado: '2026-10-23T15:04:00Z', email: 'ana@estudio.com', accion: 'descarga', recurso: 'Libreto 101.pdf', detalle: { programa: 'Akka', capitulo: '101' } }], error: null }).then(r); } };
    let pintadas = 0;
    const M = montar([['/* ── Accesos: quién entró, abrió, descargó o imprimió (ENT-24)', '/** La barra de secciones, a la izquierda como en Casting. */']],
      ['csAccesosCargar', 'csHtmlAccesos', 'csAccCsv', 'csAccError', 'CS_ACC'],
      { sb: { from: (tb) => { llamadas.push('from:' + tb); return q; } }, csRepintar: () => { pintadas++; }, csEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
        csIco: (n) => '<svg data-i="' + n + '"></svg>', csCabecera: (tt, sub) => '<h2>' + tt + '</h2><p>' + sub + '</p>', sbShows: () => [{ id: 's1', name: 'Akka' }], audLeer: () => [1, 2], setTimeout: () => 0 });
    Object.assign(M.CS_ACC, { persona: ' ana% ', accion: 'descarga', programa: 's1', desde: '2026-10-01', hasta: '2026-10-31' });
    t.eq('lee lo más reciente, con los filtros en la consulta', (await M.csAccesosCargar()) + ' · ' + llamadas.join(' '), 'leido · from:auditoria select order:creado:false limit:1000 eq:accion=descarga ilike:email=%ana% eq:show_id=s1 gte:creado lte:creado');
    const h = M.csHtmlAccesos(false);
    t.ok('la tabla: fecha, persona, acción, programa, capítulo y archivo; y lo pendiente de este equipo', /<h2>Accesos<\/h2>/.test(h) && /<td>ana@estudio\.com<\/td><td>Descargó<\/td><td>Akka<\/td><td>101<\/td><td>Libreto 101\.pdf<\/td>/.test(h)
      && /data-cs="accCsv"/.test(h) && /2 de este equipo pendientes de enviar/.test(h) && /data-cs="accFiltro" data-campo="programa"><option value="">— Todos —<\/option><option value="s1" selected>Akka<\/option>/.test(h));
    const csv = M.csAccCsv(M.CS_ACC.filas);
    t.ok('el CSV, para Excel en español', csv.charAt(0) === '﻿' && /^﻿"Fecha y hora";"Persona";"Acción";"Programa";"Capítulo";"Archivo \/ detalle"\r\n".+";"ana@estudio\.com";"Descargó";"Akka";"101";"Libreto 101\.pdf"$/.test(csv));
    t.ok('sin la tabla, dice qué SQL ejecutar; sin permiso, que es solo para administradores', /seguridad-14-registro-accesos\.sql/.test(M.csAccError({ code: 'PGRST205', message: 'Could not find the table' })) && /Solo los administradores/.test(M.csAccError({ code: '42501', message: 'permission denied' })));
  }
  const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
  t.ok('es una sección de Casting (solo administradores), con sus filtros y su estilo', /\{ v: 'accesos',    t: 'Accesos' \}/.test(CV) && /case 'accesos':    return csHtmlAccesos\(vivo\);/.test(CV) && /que === 'accCsv'/.test(CV) && /\.cs-acc-tabla\{/.test(HTML));

  t.seccion('4 · en la nube nadie lo falsea ni lo borra');
  const SQL = fs.readFileSync(path.join(RAIZ, 'sql', 'seguridad-14-registro-accesos.sql'), 'utf8').replace(/\r\n/g, '\n');   // CRLF en Windows: el patrón cuenta con «\n»
  t.ok('quién, su correo y la hora los pone el servidor', /new\.user_id := auth\.uid\(\);/.test(SQL) && /new\.email   := \(select email from auth\.users where id = auth\.uid\(\)\);/.test(SQL) && /new\.creado  := now\(\);/.test(SQL) && /before insert on public\.auditoria/.test(SQL));
  t.ok('solo se añade, y solo lo leen los administradores, con el código del autenticador', /revoke update, delete, truncate on public\.auditoria from authenticated;/.test(SQL) && /for select to authenticated\n  using \(public\.is_admin\(\)\)/.test(SQL)
    && /policy mfa_aal2 on public\.auditoria as restrictive/.test(SQL) && /revoke all on public\.auditoria from anon;/.test(SQL));
};
