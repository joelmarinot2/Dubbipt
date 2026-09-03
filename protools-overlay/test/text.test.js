'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { tokenize, palabras, lineas, silabas } = require('../src/text');

test('tildes y enes no parten la palabra', () => {
  const f = tokenize('El niño comió ñoquis en Ávila');
  const p = palabras(f).map(x => x.t);
  assert.deepEqual(p, ['El', 'niño', 'comió', 'ñoquis', 'en', 'Ávila']);
});

test('el texto se puede rehacer letra por letra desde las fichas', () => {
  const src = 'Hola,  ¿qué tal?\nMuy bien — gracias.';
  const rehecho = tokenize(src).map(f => f.t).join('');
  assert.equal(rehecho, src, 'no se pierde ni un caracter');
});

test('los signos sueltos no cuentan como palabra', () => {
  const f = tokenize('Bien — muy bien … ¡sí!');
  const p = palabras(f).map(x => x.t);
  assert.deepEqual(p, ['Bien', 'muy', 'bien', '¡sí!']);
});

test('las silabas aproximan la duracion mejor que las letras', () => {
  assert.equal(silabas('y'), 1);
  assert.equal(silabas('casa'), 2);
  assert.equal(silabas('camion'), 2, 'cuenta grupos de vocales, no silabas reales');
  // Es una APROXIMACION por grupos de vocales, no un silabeador: en
  // "extraordinariamente" junta el hiato tra-or y saca 7 donde hay 8. Para
  // repartir tiempo entre palabras sobra; no sirve para separar en silabas.
  assert.equal(silabas('extraordinariamente'), 7);
  assert.ok(silabas('extraordinariamente') > silabas('y') * 5, 'lo que importa: pesa mucho mas que una palabra corta');
  assert.equal(silabas('shh'), 1, 'sin vocales, minimo 1');
});

test('los indices de palabra son correlativos y sin huecos', () => {
  const f = tokenize('una, dos. tres — cuatro');
  const p = palabras(f);
  assert.deepEqual(p.map(x => x.wi), [0, 1, 2, 3]);
});

test('las lineas respetan los saltos del texto original', () => {
  const ls = lineas(tokenize('primera linea\nsegunda linea'), 80);
  assert.equal(ls.length, 2);
  assert.equal(ls[0].map(f => f.t).join(''), 'primera linea');
});

test('una linea larguisima se parte para que quepa', () => {
  const ls = lineas(tokenize(new Array(40).fill('palabra').join(' ')), 40);
  assert.ok(ls.length > 1);
  for(const l of ls) assert.ok(l.map(f => f.t).join('').length <= 48, 'linea demasiado larga');
});

test('emoji y caracteres fuera del plano basico no rompen el troceo', () => {
  const f = tokenize('mira 🎬 esto');
  assert.equal(palabras(f).map(x => x.t).join('|'), 'mira|esto');
  assert.equal(f.map(x => x.t).join(''), 'mira 🎬 esto');
});
