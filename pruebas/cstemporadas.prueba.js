/* Casting: carpetas por temporada dentro de cada programa · especificacion 09, PRO-44
 *
 * Pedido de sala: «que dentro de los programas pueda hacer carpetas por
 * temporadas». Lo que protege esta prueba: crear, renombrar y quitar
 * carpetas; mover episodios (también los que cambian de clave al importarse);
 * detectar la temporada por el nombre o por las centenas; que se guarde en
 * Dubbipt (o en el equipo si falta la columna, y se diga); y cómo se ve.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Casting: carpetas por temporada en cada programa';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
const trozo = (de, a) => CV.slice(CV.indexOf(de), CV.indexOf(a));

function cargar(o){
  o = o || {};
  const V = { avisos: [], pintadas: 0, updates: [], editados: [] };
  const ls = { _d: {}, getItem(k){ return k in this._d ? this._d[k] : null; }, setItem(k, v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } };
  V.ctx = vm.createContext({
    console, localStorage: ls, WORKSPACE: { id: 'w1' }, CS: { tempCerradas: {} },
    castNorm: (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(),
    castAviso: (t) => V.avisos.push(t), csRepintar: () => { V.pintadas++; }, fallo(){},
    csEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    csIco: (n) => '<svg data-i="' + n + '"></svg>', csEstadoEp: (e) => e.estado || 'en_curso',
    prodPuede: () => !!o.admin, dcxRegistrar(){}, dcxEntrada: (x) => x, csContexto: () => null,
    dcxSerie: (pl, id, c) => { V.editados.push(c); return true; },
    csEditar: async (cambio) => { cambio({}); return o.dcFalla ? 'error' : 'guardado'; },
    sb: { from: () => ({ update: (f) => ({ eq: async () => { V.updates.push(f); return o.sinColumna ? { error: { code: '42703', message: 'column "temporadas" does not exist' } } : (o.falla ? { error: { message: 'sin red' } } : { error: null }); } }) }) }
  });
  vm.runInContext(trozo('function csLeerLocal(', 'const CS_ESTADOS_MEMO') + trozo('/* ── Temporadas: carpetas dentro de cada programa', '/* ── Pegar la lista de episodios activos')
    + trozo('/** Los episodios de un programa, en sus carpetas de temporada', '/** El casting de todo un programa')
    + ';this.T = { csTemporadas, csTempDe, csTempNueva, csTempRenombrar, csTempBorrar, csTempMover, csTempDetectar, csTempPlan, csTempAdivinar, csHtmlTemporadas, csTempsLocales };', V.ctx);
  V.T = V.ctx.T;
  return V;
}
const ep = (id, numero, titulo, extra) => Object.assign({ clave: 'e:' + id, ep: { id: id, name: titulo }, dcEp: null, numero: numero, titulo: titulo, dcTitulo: '' }, extra || {});

exports.pruebas = async function(t){
  t.seccion('1 · crear, renombrar y quitar carpetas');
  {
    const V = cargar(), T = V.T;
    const p = { clave: 'p1', nombre: 'AKKA', show: { id: 's1' }, serie: null };
    await T.csTempNueva(p, '  Temporada   1 ');
    await T.csTempNueva(p, 'Temporada 2');
    t.eq('se crean con su nombre limpio y se guardan en el programa de Dubbipt', JSON.stringify(T.csTemporadas(p).carpetas.map(c => c.nombre)) + ' ' + V.updates.length, '["Temporada 1","Temporada 2"] 2');
    t.eq('no se repite un nombre', (await T.csTempNueva(p, 'temporada 2')) + ' ' + V.avisos.slice(-1)[0], 'nada Ya hay una carpeta «temporada 2»');
    const [c1, c2] = T.csTemporadas(p).carpetas;
    await T.csTempRenombrar(p, c2.id, 'Season 2');
    t.eq('se renombra', T.csTemporadas(p).carpetas[1].nombre, 'Season 2');
    const e = ep(5, 5, 'Episodio 5');
    await T.csTempMover(p, e, c2.id);
    t.eq('un episodio va a su carpeta', T.csTempDe(T.csTemporadas(p), e), c2.id);
    await T.csTempBorrar(p, c2.id);
    t.eq('quitar la carpeta no borra el episodio: queda sin temporada', JSON.stringify(T.csTemporadas(p).carpetas.map(c => c.id)) + ' ' + T.csTempDe(T.csTemporadas(p), e), JSON.stringify([c1.id]) + ' null');
    t.ok('cada cambio se dice', V.avisos.some(a => /Temporada nueva en AKKA: Temporada 1/.test(a)) && V.avisos.some(a => /Ep\. 5 · Episodio 5 → Season 2/.test(a)));
  }

  t.seccion('2 · mover episodios');
  {
    const V = cargar({ admin: true }), T = V.T;
    const p = { clave: 'p1', nombre: 'AKKA', show: { id: 's1' }, serie: { id: 9 } };
    await T.csTempNueva(p, 'T1');
    const id = T.csTemporadas(p).carpetas[0].id;
    const soloDc = { clave: 'd:77', ep: null, dcEp: { id: 77 }, numero: 3, titulo: 'Ep 3' };
    await T.csTempMover(p, soloDc, id);
    const importado = { clave: 'e:12', ep: { id: 12 }, dcEp: { id: 77 }, numero: 3, titulo: 'Ep 3' };
    t.eq('uno de DublajeCast sigue en su carpeta cuando ya está también en Dubbipt', T.csTempDe(T.csTemporadas(p), importado), id);
    await T.csTempMover(p, importado, '');
    t.eq('y se saca a «Sin temporada» con todas sus claves', JSON.stringify(T.csTemporadas(p).eps), '{}');
    t.eq('mover a donde ya está no guarda nada', await T.csTempMover(p, importado, ''), 'nada');
  }

  t.seccion('3 · dónde se guarda');
  {
    const V = cargar({ sinColumna: true }), T = V.T;
    const p = { clave: 'p1', nombre: 'AKKA', show: { id: 's1' }, serie: null };
    t.eq('sin la columna: en este equipo, y lo dice', await T.csTempNueva(p, 'Temporada 1'), 'equipo');
    t.ok('con el SQL que hay que correr', /sql\/mejora-06-temporadas\.sql/.test(V.avisos.slice(-1)[0]) && T.csTemporadas(p).carpetas.length === 1 && !p.show.temporadas);
    const F = cargar({ falla: true });
    const q = { clave: 'p1', nombre: 'AKKA', show: { id: 's1', temporadas: null }, serie: null };
    t.eq('si falla, vuelve a lo de antes y lo dice', (await F.T.csTempNueva(q, 'Temporada 1')) + ' ' + F.T.csTemporadas(q).carpetas.length + ' ' + /sin red/.test(F.avisos[0]), 'error 0 true');
    const D = cargar({ admin: true });
    const r = { clave: 'd:9', nombre: 'SOLO DC', show: null, serie: { id: 9 } };
    t.eq('uno que solo está en DublajeCast: en su serie', (await D.T.csTempNueva(r, 'Temporada 1')) + ' ' + D.editados.length + ' ' + !!(r.serie.temporadas_dubbipt && r.serie.temporadas_dubbipt.carpetas.length), 'nube 1 true');
    t.ok('el campo se deja escribir en DublajeCast', /DCX_CAMPOS_SERIE = \[[^\]]*'temporadas_dubbipt'/.test(fs.readFileSync(path.join(RAIZ, 'js', 'dcescribir.js'), 'utf8')));
  }

  t.seccion('4 · detectar temporadas');
  {
    const V = cargar(), T = V.T;
    t.eq('por el nombre', [ep(1, 4, 'Always on Call: Season 2 - EP4'), ep(2, 5, 'Serie T3 Ep 5'), ep(3, 6, 'S01E06'), ep(4, 7, 'Temporada 4 capítulo 7'), ep(5, 8, 'Episodio 8')].map(e => T.csTempAdivinar(e, false)).join(','), '2,3,1,4,');
    t.eq('por las centenas, solo si todos van así', T.csTempPlan([ep(1, 105, 'Episodio 105'), ep(2, 215, 'Episodio 215')], T.csTemporadas(null)).map(x => x.n).join(',') + ' | ' + T.csTempPlan([ep(1, 99, 'Episodio 99'), ep(2, 105, 'Episodio 105')], T.csTemporadas(null)).length, '1,2 | 0');
    const p = { clave: 'p1', nombre: 'WAYANS', show: { id: 's1' }, serie: null };
    const eps = [ep(1, 101, 'Episodio 101'), ep(2, 102, 'Episodio 102'), ep(3, 201, 'Episodio 201')];
    await T.csTempDetectar(p, eps);
    const tt = T.csTemporadas(p);
    t.eq('crea las carpetas que faltan, en orden, y mete cada episodio', tt.carpetas.map(c => c.nombre + ':' + eps.filter(e => T.csTempDe(tt, e) === c.id).length).join(' '), 'Temporada 1:2 Temporada 2:1');
    t.eq('lo ya colocado no se vuelve a tocar', T.csTempPlan(eps, tt).length, 0);
  }

  t.seccion('5 · cómo se ve');
  {
    const V = cargar(), T = V.T;
    const p = { clave: 'p1', nombre: 'AKKA', show: { id: 's1' }, serie: null };
    const fila = (e) => '<div class="cs-ep">' + e.titulo + '</div>';
    const eps = [ep(1, 101, 'Episodio 101'), ep(2, 201, 'Episodio 201', { estado: 'completo' }), ep(3, 7, 'Especial')];
    const h0 = T.csHtmlTemporadas(p, eps, T.csTemporadas(p), fila);
    t.ok('sin carpetas: la lista de siempre, con «Nueva temporada»', /data-cs="tempNueva"/.test(h0) && !/cs-temp-cab/.test(h0) && (h0.match(/class="cs-ep"/g) || []).length === 3);
    await T.csTempNueva(p, 'Temporada 2');
    const tt = T.csTemporadas(p);
    await T.csTempMover(p, eps[1], tt.carpetas[0].id);
    const h = T.csHtmlTemporadas(p, eps, T.csTemporadas(p), fila);
    t.ok('cada carpeta con su nombre, sus episodios y cuántos están completados', /<b>Temporada 2<\/b><span class="cs-tenue">1 episodio · 1 completado<\/span>/.test(h));
    t.ok('los demás, en «Sin temporada» (que no se renombra ni se quita)', /<b>Sin temporada<\/b><span class="cs-tenue">2 episodios<\/span>/.test(h) && (h.match(/data-cs="tempBorrar"/g) || []).length === 1 && (h.match(/data-cs="tempRen"/g) || []).length === 1);
    V.ctx.CS.tempCerradas['s:s1|' + tt.carpetas[0].id] = true;
    const hc = T.csHtmlTemporadas(p, eps, T.csTemporadas(p), fila);
    t.ok('una carpeta se pliega', !/>Episodio 201</.test(hc) && /aria-expanded="false"/.test(hc));
    const D = cargar(), soloDc = { clave: 'd:9', nombre: 'X', show: null, serie: { id: 9 } };
    t.ok('sin permiso para guardar (solo en DublajeCast y no eres administrador), sin botones', !/data-cs="temp/.test(D.T.csHtmlTemporadas(soloDc, eps, D.T.csTemporadas(soloDc), fila)));
    t.ok('ningún emoji', !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(h));
  }

  t.seccion('6 · dónde está');
  {
    t.ok('la pestaña Episodios va por carpetas y cada episodio tiene su selector de temporada', /cuerpo = csHtmlTemporadas\(p, eps, temps, fila\)/.test(CV) && /data-cs="tempEp"/.test(CV));
    t.ok('los controles, cableados', ['tempNueva', 'tempRen', 'tempBorrar', 'tempEp', 'tempDetectar', 'tempAbrir'].every(k => CV.indexOf("que === '" + k + "'") >= 0));
    t.ok('el SQL de la columna existe', fs.existsSync(path.join(RAIZ, 'sql', 'mejora-06-temporadas.sql')) && /add column if not exists temporadas jsonb/.test(fs.readFileSync(path.join(RAIZ, 'sql', 'mejora-06-temporadas.sql'), 'utf8')));
    t.ok('los estilos, en index.html', /\.cs-temp-cab\{/.test(fs.readFileSync(INDEX, 'utf8')));
  }
};
