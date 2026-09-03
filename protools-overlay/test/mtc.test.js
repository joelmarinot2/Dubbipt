'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { MtcReader, tcToSeconds } = require('../src/mtc');

/** Los ocho cuartos de trama de un timecode, en orden. */
function cuartos(h, m, s, f, code){
  const hb = (h & 0x1F) | ((code & 3) << 5);
  const n = [ f & 0x0F, (f >> 4) & 0x0F, s & 0x0F, (s >> 4) & 0x0F,
              m & 0x0F, (m >> 4) & 0x0F, hb & 0x0F, (hb >> 4) & 0x0F ];
  return n.map((v, i) => [0xF1, (i << 4) | v]);
}

test('cuarto de trama: arma el timecode y compensa las 2 tramas de retraso', () => {
  const r = new MtcReader();
  let ult = null;
  for(const msg of cuartos(1, 2, 3, 4, 3)) ult = r.push(msg, 1000) || ult;
  assert.equal(ult.fps, 30);
  // 01:02:03:04 a 30 fps = 3723.1333 s, mas 2 tramas (0.0667) por el desfase MTC
  assert.ok(Math.abs(ult.seconds - (3723 + 4/30 + 2/30)) < 1e-6, 'segundos=' + ult.seconds);
});

test('cuarto de trama: no entrega nada hasta tener los ocho', () => {
  const r = new MtcReader();
  const msgs = cuartos(0, 0, 10, 0, 3);
  for(let i = 0; i < 7; i++) assert.equal(r.push(msgs[i], 0), null);
  assert.ok(r.push(msgs[7], 0).complete);
});

test('cuarto de trama: entrar a mitad de secuencia no inventa una posicion', () => {
  const r = new MtcReader();
  const msgs = cuartos(0, 1, 0, 0, 3);
  // empezamos por el cuarto mensaje, como al enchufar el cable a media reproduccion
  for(let i = 3; i < 8; i++) assert.equal(r.push(msgs[i], 0), null);
  // y ahora una secuencia entera: esa si vale
  let ult = null;
  for(const m of cuartos(0, 1, 0, 0, 3)) ult = r.push(m, 0) || ult;
  assert.ok(ult && ult.complete);
});

test('trama completa: un salto del cabezal se lee entero y sin compensacion', () => {
  const r = new MtcReader();
  const out = r.push([0xF0, 0x7F, 0x7F, 0x01, 0x01, (2 << 5) | 0, 10, 0, 0, 0xF7], 0);
  assert.equal(out.kind, 'full');
  assert.equal(out.fps, 29.97);
  // 00:10:00:00 en drop-frame cae en 600 s CLAVADOS: el drop-frame existe
  // justo para volver a cuadrar con el reloj cada 10 minutos.
  assert.ok(Math.abs(out.seconds - 600) < 0.02, 'segundos=' + out.seconds);
});

test('las cuatro cadencias se leen del campo de horas', () => {
  const esperado = [24, 25, 29.97, 30];
  for(let code = 0; code < 4; code++){
    const r = new MtcReader();
    let ult = null;
    for(const m of cuartos(0, 0, 1, 0, code)) ult = r.push(m, 0) || ult;
    assert.equal(ult.fps, esperado[code]);
  }
});

test('drop-frame: cuadra a los 10 min y va 2 tramas corto al minuto 1', () => {
  assert.ok(Math.abs(tcToSeconds(0, 10, 0, 0, 29.97) - 600) < 0.02);
  // Al minuto 1 se han saltado 2 numeros de trama: el instante real es ANTES de 60 s.
  // Al minuto 1 se han saltado 2 numeros de trama: quedan 1798, no 1800.
  const s1 = tcToSeconds(0, 1, 0, 0, 29.97);
  assert.ok(s1 < 60, 'tiene que caer ANTES de 60 s: ' + s1);
  assert.ok(Math.abs(s1 - 1798 / 29.97) < 1e-6, 'segundos=' + s1);
  assert.equal(tcToSeconds(0, 1, 0, 0, 30), 60);   // sin drop-frame, clavado
});

test('sin cuartos de trama durante un rato, el transporte esta parado', () => {
  const r = new MtcReader();
  for(const m of cuartos(0, 0, 5, 0, 3)) r.push(m, 1000);
  assert.equal(r.isRolling(1050, 120), true);
  assert.equal(r.isRolling(1400, 120), false);
});
