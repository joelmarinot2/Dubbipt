/* Las sugerencias del campo de talento · especificacion 02
 *
 * Pedido de sala: «¿por qué los nombres de los talentos no salen en la barra
 * donde uno escribe, en las tarjetas de casting y cuando uno está asignando en
 * el libreto?». Las sugerencias salían solo de la base de talentos de cada
 * equipo, que en muchos no estaba cargada; el directorio de Talentos (donde se
 * crean, renombran, fusionan y borran) no contaba. Lo que protege esta prueba:
 * que la lista y la validación usan la base MÁS el directorio y los registros
 * de casting, sin repetir y sin marcas; que un cambio en el directorio se ve
 * al momento; que el catálogo del desglose solo entra si no hay nada más; y
 * que las tarjetas, la tabla y el libreto usan siempre esa lista.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Talentos: las sugerencias al escribir';

const RAIZ = path.dirname(INDEX);
const HTML = fs.readFileSync(INDEX, 'utf8');
const castNorm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

exports.pruebas = async function(t){
  const TAL = { nombres: ['ANA ROJAS'], claves: new Set(['ANA ROJAS']), ts: 1 };
  const PROD = { datos: { talents: [{ name: 'Beatriz Sol' }, { name: 'ORIGINAL' }, { name: 'ana rojas' }] } };
  const CS_REGS = { lista: [{ reg: { personajes: { ALLY: { talent: 'Carlos Ruiz' } }, capitulos: { 'Ep 1': { personajes: { JANA: { talent: 'Diana Paz' }, MULTITUD: { talent: 'TODOS' } } } } } }] };
  const ctx = { TAL: TAL, PROD: PROD, CS_REGS: CS_REGS, castNorm: castNorm, castSimil: () => 0, CAST_TALENTOS: ['Elena Mar'] };
  const M = montar([['const TAL_MARCAS = {', '/* ── Leer el Excel de la base'], ['function talValidar(txt){', '/* ── Personajes que NUNCA se doblan']],
    ['talNombres', 'talHayBase', 'talValidar', 'talSugerencias', 'talCerca'], ctx);

  t.seccion('1 · de dónde salen los nombres');
  t.eq('la base, el directorio de Talentos y los registros de casting; sin repetir y sin marcas', M.talNombres().join(', '), 'ANA ROJAS, Beatriz Sol, Carlos Ruiz, Diana Paz');
  t.eq('en la lista, después, ORIGINAL, TODOS, X y EDICIÓN', M.talSugerencias().slice(-4).join(','), 'ORIGINAL,TODOS,X,EDICION');
  t.eq('y valen al guardar: un nombre del directorio ya no es «desconocido»', [M.talValidar('beatriz sol').nombre, M.talValidar('beatriz sol').tipo, M.talValidar('Nadie Aqui').tipo].join(' '), 'Beatriz Sol talento desconocido');
  PROD.datos = { talents: [{ name: 'Beatriz Sol Vega' }] };
  t.eq('un cambio en el directorio (renombrar, fusionar, borrar) se ve al momento', M.talNombres().join(', '), 'ANA ROJAS, Beatriz Sol Vega, Carlos Ruiz, Diana Paz');

  t.seccion('2 · sin base ni directorio');
  {
    const T2 = { nombres: [], claves: new Set(), ts: 0 };
    const M2 = montar([['const TAL_MARCAS = {', '/* ── Leer el Excel de la base'], ['function talValidar(txt){', '/* ── Personajes que NUNCA se doblan']],
      ['talHayBase', 'talValidar', 'talSugerencias'], { TAL: T2, PROD: { datos: null }, CS_REGS: { lista: null }, castNorm: castNorm, castSimil: () => 0, CAST_TALENTOS: ['Elena Mar'] });
    t.eq('se sugiere el catálogo del desglose y no se restringe nada', M2.talHayBase() + ' · ' + M2.talSugerencias().join(',') + ' · ' + M2.talValidar('Cualquiera').tipo, 'false · Elena Mar,ORIGINAL,TODOS,X,EDICION · libre');
  }

  t.seccion('3 · dónde se usa');
  t.ok('la tarjeta: la lista siempre puesta y al día (antes, solo si había base en ese equipo)', /try\{ if\(typeof talPintarLista==='function'\) talPintarLista\(\); \}catch\(e\)\{\}\n      inp\.setAttribute\('list','talList'\);/.test(HTML));
  t.ok('la tabla de casting, igual', /if\(typeof talPintarLista === 'function'\) talPintarLista\(\);\n    box\.querySelectorAll\('input\.talIn'\)\.forEach\(i=> i\.setAttribute\('list','talList'\)\);/.test(HTML));
  t.ok('el catálogo del desglose ya no pisa la lista', /CAST_TALENTOS = castCatalogo\(buf\);[\s\S]{0,300}try\{ talPintarLista\(\); \}/.test(HTML) && !/dl\.innerHTML = CAST_TALENTOS\.map/.test(HTML));
  t.ok('al abrir un capítulo en casting se carga el directorio y se repinta la barra del libreto', /prodCargar === 'function'\) await prodCargar\(\); \}catch\(e\)\{ \/\* sin directorio: la base sola \*\/ \}\n      try\{ talPintarLista\(\); talBarraLibreto\(\); \}/.test(HTML));
  t.ok('la barra del libreto usa las mismas sugerencias', /talSugerencias\(\)\.map\(t => '<option value="'/.test(fs.readFileSync(path.join(RAIZ, 'js', 'talentos.js'), 'utf8')));
};
