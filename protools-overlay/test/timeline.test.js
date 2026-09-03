'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Timeline } = require('../src/timeline');

const letra = [];
for(let i = 0; i < 2000; i++) letra.push({ wi: i, t0: i * 0.30, t1: i * 0.30 + 0.25 });
// entre palabra y palabra quedan 50 ms de hueco

test('estado en reproduccion normal: rellena de 0 a 1 dentro de la palabra', () => {
  const tl = new Timeline(letra);
  assert.deepEqual(tl.at(0),      { done: 0, active: 0, fill: 0 });
  const m = tl.at(0.125);
  assert.equal(m.active, 0);
  assert.ok(Math.abs(m.fill - 0.5) < 1e-9, 'fill=' + m.fill);
  assert.equal(tl.at(0.27).active, -1, 'en el hueco no hay palabra activa');
  assert.equal(tl.at(0.27).done, 1,   'pero la anterior queda entera');
});

test('salto a cualquier punto: acierta y no depende de por donde se venia', () => {
  const tl = new Timeline(letra);
  for(const t of [0, 12.4, 599.9, 3.15, 450.0, 0.05]){
    const e = tl.at(t);
    const esperado = letra.findIndex(w => t >= w.t0 && t < w.t1);
    assert.equal(e.active, esperado, 't=' + t);
  }
});

test('el ciclo (loop) no deja rastro: volver al inicio da el mismo estado', () => {
  const tl = new Timeline(letra);
  const alInicio = tl.at(0.1);
  tl.at(500);                      // se va al final...
  tl.at(0.1);
  const alVolver = tl.at(0.1);     // ...y vuelve
  assert.deepEqual(alVolver, alInicio, 'el estado es funcion pura del tiempo');
});

test('antes del primer instante y despues del ultimo, sin romperse', () => {
  const tl = new Timeline(letra);
  assert.deepEqual(tl.at(-5), { done: 0, active: -1, fill: 0 });
  const fin = tl.at(99999);
  assert.equal(fin.active, -1);
  assert.equal(fin.done, letra.length);
});

test('letra vacia: responde en vez de reventar', () => {
  const tl = new Timeline([]);
  assert.deepEqual(tl.at(3), { done: 0, active: -1, fill: 0 });
  assert.equal(tl.duration, 0);
});

test('2000 palabras: 20.000 saltos aleatorios muy por debajo de 50 ms', () => {
  const tl = new Timeline(letra);
  const t0 = process.hrtime.bigint();
  for(let i = 0; i < 20000; i++) tl.at(Math.random() * 600);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 50, 'los 20.000 saltos tardaron ' + ms.toFixed(1) + ' ms en total');
});

test('el atajo de busqueda no miente al avanzar palabra a palabra', () => {
  const tl = new Timeline(letra);
  for(let i = 0; i < letra.length; i++){
    const t = letra[i].t0 + 0.01;
    assert.equal(tl.at(t).active, i, 'i=' + i);
  }
});
