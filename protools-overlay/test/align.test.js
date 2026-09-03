'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { alignBySignal, alignFromExternal, applyOffset, AudioNoInteligible } = require('../src/align/align');
const { segments } = require('../src/align/energy');

const SR = 16000;

/** Genera voz sintetica: rafagas con vibrato sobre silencio. */
function hacerAudio(tramos, dur, opts){
  const o = opts || {};
  const n = Math.round(SR * dur);
  const x = new Float32Array(n);
  // suelo de sala siempre presente
  for(let i = 0; i < n; i++) x[i] += (Math.random() * 2 - 1) * (o.ruido != null ? o.ruido : 0.004);
  // sangria de otros instrumentos: tono continuo por debajo
  if(o.bleed){
    for(let i = 0; i < n; i++) x[i] += Math.sin(2 * Math.PI * 110 * i / SR) * o.bleed;
  }
  for(const [t0, t1] of tramos){
    const a = Math.round(t0 * SR), b = Math.round(t1 * SR);
    for(let i = a; i < b && i < n; i++){
      const u = (i - a) / Math.max(1, b - a);
      const env = Math.sin(Math.PI * u);                       // entra y sale suave
      const f = 140 + 40 * Math.sin(2 * Math.PI * 4 * i / SR);  // vibrato
      x[i] += env * 0.45 * Math.sin(2 * Math.PI * f * i / SR);
    }
  }
  return x;
}

test('detecta los tramos de voz y las pausas entre ellos', () => {
  const x = hacerAudio([[0.5, 1.5], [2.0, 3.0], [3.6, 4.4]], 5);
  const r = segments(x, SR);
  assert.equal(r.segs.length, 3, 'tramos=' + JSON.stringify(r.segs));
  assert.ok(Math.abs(r.segs[0].t0 - 0.5) < 0.09, 'inicio del primero: ' + r.segs[0].t0);
  assert.ok(Math.abs(r.segs[2].t1 - 4.4) < 0.09, 'final del ultimo: ' + r.segs[2].t1);
});

test('alinea el texto con los tramos y respeta el orden', () => {
  const x = hacerAudio([[0.5, 1.5], [2.0, 3.0]], 4);
  const { words } = alignBySignal(x, SR, 'hola que tal    muy bien gracias');
  assert.equal(words.length, 6);
  for(let i = 1; i < words.length; i++){
    assert.ok(words[i].t0 >= words[i-1].t0 - 1e-9, 'sin saltos hacia atras');
    assert.ok(words[i].t1 > words[i].t0, 'toda palabra dura algo');
  }
  assert.ok(words[0].t0 >= 0.4, 'la primera no empieza antes que el audio');
});

test('la primera palabra cae dentro del primer tramo de voz', () => {
  const x = hacerAudio([[1.0, 2.0], [2.6, 3.4]], 4);
  const { words } = alignBySignal(x, SR, 'uno dos tres cuatro cinco seis');
  assert.ok(words[0].t0 >= 0.9 && words[0].t0 <= 2.0, 't0=' + words[0].t0);
});

test('tolera 15% de sangria de otros instrumentos', () => {
  const x = hacerAudio([[0.5, 1.5], [2.0, 3.0], [3.6, 4.4]], 5, { bleed: 0.45 * 0.15 });
  const r = segments(x, SR);
  assert.equal(r.segs.length, 3, 'con sangria del 15% siguen saliendo 3 tramos: ' + JSON.stringify(r.segs));
  const { words } = alignBySignal(x, SR, 'hola que tal muy bien gracias otra vez');
  assert.equal(words.length, 8);
});

test('una frase seguida, sin pausas, se alinea igual (un solo tramo)', () => {
  // Que no haya pausas NO es un error: es una frase corrida. Se reparte dentro
  // del unico tramo. Menos preciso, pero util; fallar aqui seria pasarse.
  const x = hacerAudio([[0, 5]], 5);
  const { words, segs } = alignBySignal(x, SR, 'uno dos tres');
  assert.equal(segs.length, 1);
  assert.equal(words.length, 3);
  assert.ok(words[0].t0 < words[2].t0);
});

test('senal plana (tono continuo, sin dinamica): error manejado', () => {
  // Sin diferencia entre lo alto y lo bajo no hay voz que seguir.
  const n = SR * 4, x = new Float32Array(n);
  for(let i = 0; i < n; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / SR);
  assert.throws(() => alignBySignal(x, SR, 'uno dos tres'),
    (e) => e instanceof AudioNoInteligible && e.code === 'AUDIO_NO_INTELIGIBLE');
});

test('solo ruido: error manejado', () => {
  const x = hacerAudio([], 4, { ruido: 0.02 });
  assert.throws(() => alignBySignal(x, SR, 'uno dos tres'), /Audio no inteligible/);
});

test('sin texto: error manejado', () => {
  const x = hacerAudio([[0.5, 1.5]], 2);
  assert.throws(() => alignBySignal(x, SR, '   '), /Audio no inteligible/);
});

test('motor externo: acepta marcas de whisper y las casa con el texto', () => {
  const r = alignFromExternal('hola que tal', [
    { word: 'hola', start: 0.10, end: 0.42 },
    { word: 'que',  start: 0.45, end: 0.60 },
    { word: 'tal',  start: 0.62, end: 0.95 }
  ]);
  assert.equal(r.motor, 'externo');
  assert.deepEqual(r.words.map(w => w.wi), [0, 1, 2]);
  assert.equal(r.words[0].t0, 0.10);
});

test('la calibracion desplaza todas las marcas por igual', () => {
  const base = [{ wi: 0, t0: 1, t1: 2 }, { wi: 1, t0: 2, t1: 3 }];
  const m = applyOffset(base, -120);
  assert.ok(Math.abs(m[0].t0 - 0.88) < 1e-9);
  assert.ok(Math.abs(m[1].t1 - 2.88) < 1e-9);
  assert.deepEqual(applyOffset(base, 0), base, 'sin desplazamiento, sin cambios');
});

test('3 minutos de audio se procesan muy por debajo de 15 s', () => {
  const tramos = [];
  for(let t = 0; t < 178; t += 2.5) tramos.push([t, t + 1.8]);
  const x = hacerAudio(tramos, 180);
  const texto = new Array(720).fill('palabra').join(' ');
  const t0 = process.hrtime.bigint();
  const { words } = alignBySignal(x, SR, texto);
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  assert.equal(words.length, 720);
  assert.ok(s < 15, '3 min tardaron ' + s.toFixed(2) + ' s');
  console.log('        · 3 min de audio alineados en ' + s.toFixed(2) + ' s');
});
