'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { alignBySignal } = require('../src/align/align');

const SR = 16000;

function burst(x, t0, t1, f0){
  const a = Math.round(t0 * SR), b = Math.round(t1 * SR);
  for(let i = a; i < b && i < x.length; i++){
    const u = (i - a) / Math.max(1, b - a);
    const env = Math.min(1, Math.min(u, 1 - u) * 12);      // ataque y caida rapidos
    const f = f0 + 30 * Math.sin(2 * Math.PI * 5 * i / SR);
    x[i] += env * 0.5 * Math.sin(2 * Math.PI * f * i / SR);
  }
}

function errores(reales, calc){
  const e = [];
  for(let i = 0; i < reales.length; i++) e.push(Math.abs(calc[i].t0 - reales[i]) * 1000);
  e.sort((a,b)=>a-b);
  return { medio: e.reduce((a,b)=>a+b,0)/e.length, p50: e[Math.floor(e.length*0.5)],
           p90: e[Math.floor(e.length*0.9)], max: e[e.length-1] };
}

test('PRECISION · una palabra por tramo, con pausas entre ellas', () => {
  // Es el caso al que apunta el motor de señal: cada pausa vuelve a anclar.
  const dur = 30, x = new Float32Array(SR * dur);
  const reales = [], palabras = [];
  let t = 0.4;
  for(let i = 0; i < 40; i++){
    const largo = 0.28 + (i % 3) * 0.06;
    burst(x, t, t + largo, 130 + (i % 5) * 15);
    reales.push(t); palabras.push('palabra' + i);
    t += largo + 0.22;
  }
  const { words } = alignBySignal(x, SR, palabras.join(' '));
  assert.equal(words.length, 40);
  const e = errores(reales, words);
  console.log('        · con pausas  medio ' + e.medio.toFixed(1) + ' ms · p90 ' +
              e.p90.toFixed(1) + ' ms · peor ' + e.max.toFixed(1) + ' ms');
  assert.ok(e.p90 <= 50, 'el 90% deberia entrar en +-50 ms, p90=' + e.p90.toFixed(1));
});

test('PRECISION · varias palabras seguidas dentro de un mismo tramo', () => {
  // Sin pausa entre palabras, la posicion se INTERPOLA por silabas: aqui es
  // donde un motor de señal no puede competir con un alineador de verdad.
  const dur = 30, x = new Float32Array(SR * dur);
  const reales = [], palabras = [];
  const largoPal = 0.30;
  let t = 0.4;
  for(let g = 0; g < 8; g++){
    const inicio = t;
    for(let k = 0; k < 5; k++){ reales.push(t); palabras.push('palabra'); t += largoPal; }
    burst(x, inicio, t, 130 + g * 10);      // las 5 palabras, en un solo tramo
    t += 0.45;                              // pausa entre frases
  }
  const { words } = alignBySignal(x, SR, palabras.join(' '));
  const e = errores(reales, words);
  console.log('        · sin pausas  medio ' + e.medio.toFixed(1) + ' ms · p90 ' +
              e.p90.toFixed(1) + ' ms · peor ' + e.max.toFixed(1) + ' ms');
  // Se documenta lo que de verdad consigue, sin prometer +-50 ms aqui.
  assert.ok(e.medio < 120, 'error medio dentro de la frase: ' + e.medio.toFixed(1) + ' ms');
});

// Sintetiza UNA silaba: una cresta de energia con su vocal. Es lo que de
// verdad ve un analisis de energia cuando alguien habla.
function silaba(x, t0, dur, f0){
  const a = Math.round(t0 * SR), b = Math.round((t0 + dur) * SR);
  for(let i = a; i < b && i < x.length; i++){
    const u = (i - a) / Math.max(1, b - a);
    const env = Math.sin(Math.PI * Math.pow(u, 0.85));   // sube rapido, cae lento
    const f = f0 * (1 + 0.04 * Math.sin(2 * Math.PI * 4 * i / SR));
    let v = Math.sin(2 * Math.PI * f * i / SR)
          + 0.5 * Math.sin(2 * Math.PI * 2 * f * i / SR)
          + 0.3 * Math.sin(2 * Math.PI * 3 * f * i / SR);
    x[i] += env * 0.35 * v;
  }
}

test('PRECISION · frase real: silabas, ritmo irregular y palabras desiguales', () => {
  // El caso que importa. Cada silaba es una cresta, con duraciones irregulares
  // -atonas rapidas, tonicas alargadas- y las palabras van pegadas dentro de
  // la frase. Mide lo que consigue de verdad el motor de señal.
  const x = new Float32Array(SR * 45);
  const frases = [
    'no me lo puedo creer estaba justo detras de la puerta',
    'escuchame bien porque no pienso repetirtelo otra vez',
    'llevamos toda la maldita noche buscando esa dichosa caja',
    'entonces comprendio que la extraordinaria decision era irreversible',
    'sal de aqui ahora mismo antes de que sea demasiado tarde'
  ];
  const { palabras: pals, tokenize: tk } = require('../src/text');
  const reales = [], texto = frases.join(' ');
  let t = 0.5, rnd = 12345;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  for(const fr of frases){
    const ws = pals(tk(fr));
    for(const w of ws){
      reales.push(t);
      for(let k = 0; k < w.sil; k++){
        const dur = 0.11 + 0.10 * rand();          // 110-210 ms por silaba
        silaba(x, t, dur * 0.92, 110 + 40 * rand());
        t += dur;                                   // silabas pegadas, sin pausa
      }
    }
    t += 0.55;                                      // pausa entre frases
  }
  const { words } = alignBySignal(x, SR, texto);
  assert.equal(words.length, reales.length);
  const e = errores(reales, words);
  console.log('        · frase real  medio ' + e.medio.toFixed(1) + ' ms · p90 ' +
              e.p90.toFixed(1) + ' ms · peor ' + e.max.toFixed(1) + ' ms');
  assert.ok(e.p90 <= 50, 'p90 dentro de la frase: ' + e.p90.toFixed(1) + ' ms');
});

test('PRECISION · la misma frase con ruido de sala y sangria de musica', () => {
  // Mismo material, ensuciado: ruido de fondo constante y un bajo continuo
  // colandose desde otra pista. El suelo adaptativo deberia absorberlo.
  const x = new Float32Array(SR * 45);
  const frases = [
    'no me lo puedo creer estaba justo detras de la puerta',
    'escuchame bien porque no pienso repetirtelo otra vez',
    'llevamos toda la maldita noche buscando esa dichosa caja'
  ];
  const { palabras: pals, tokenize: tk } = require('../src/text');
  const reales = [], texto = frases.join(' ');
  let t = 0.5, rnd = 999;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  for(const fr of frases){
    for(const w of pals(tk(fr))){
      reales.push(t);
      for(let k = 0; k < w.sil; k++){
        const dur = 0.11 + 0.10 * rand();
        silaba(x, t, dur * 0.92, 110 + 40 * rand());
        t += dur;
      }
    }
    t += 0.55;
  }
  // suciedad: ruido blanco a -34 dB y un bajo continuo a -30 dB
  for(let i = 0; i < x.length; i++){
    x[i] += 0.02 * (rand() * 2 - 1)
          + 0.03 * Math.sin(2 * Math.PI * 55 * i / SR);
  }
  const { words } = alignBySignal(x, SR, texto);
  assert.equal(words.length, reales.length);
  const e = errores(reales, words);
  console.log('        · con ruido   medio ' + e.medio.toFixed(1) + ' ms · p90 ' +
              e.p90.toFixed(1) + ' ms · peor ' + e.max.toFixed(1) + ' ms');
  assert.ok(e.p90 <= 50, 'p90 con ruido: ' + e.p90.toFixed(1) + ' ms');
});
