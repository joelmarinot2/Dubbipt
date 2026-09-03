'use strict';
/* ────────────────────────────────────────────────────────────────────
   MTC · MIDI Timecode
   Pro Tools envia la posicion del cabezal como MIDI Timecode. Hay dos
   formatos y hacen falta los dos:

   · CUARTO DE TRAMA (F1): ocho mensajes seguidos, cada uno con medio byte
     del timecode. Llegan uno cada cuarto de trama, asi que el timecode
     COMPLETO tarda dos tramas en formarse. Como los ocho describen el
     instante en que empezo la secuencia, al terminarla hay que sumar esas
     dos tramas: es la causa clasica de un desfase de ~80 ms que la gente
     achaca al video.
   · TRAMA COMPLETA (F0 7F ... 01 01 ...): un unico mensaje con el timecode
     entero. Pro Tools lo manda al hacer un salto (locate) o al parar.

   Los dos bits altos del campo de horas llevan la cadencia (fps).
   ──────────────────────────────────────────────────────────────────── */

const FPS = [24, 25, 29.97, 30];          // orden segun el estandar MTC

/** Cadencia a partir del codigo de 2 bits del byte de horas. */
function fpsFromCode(code){ return FPS[code & 3] || 30; }

/** Timecode a segundos. 29.97 es drop-frame: el contador salta numeros. */
function tcToSeconds(h, m, s, f, fps){
  const dropFrame = Math.abs(fps - 29.97) < 0.01;
  if(dropFrame){
    // 30 fps nominales, saltando 2 tramas al inicio de cada minuto salvo
    // los multiplos de 10. Se cuenta en tramas y se divide por la cadencia real.
    const totalMin = 60 * h + m;
    const frames = 108000 * h + 1800 * m + 30 * s + f
                 - 2 * (totalMin - Math.floor(totalMin / 10));
    return frames / 29.97;
  }
  return h * 3600 + m * 60 + s + (f / fps);
}

class MtcReader {
  constructor(){
    this.nibbles = new Array(8).fill(0);
    this.seen = 0;                 // mapa de bits de los ocho trozos recibidos
    this.expect = 0;               // siguiente indice esperado
    this.fps = 30;
    this.seconds = null;           // ultima posicion conocida, en segundos
    this.running = false;          // llegan cuartos de trama => esta rodando
    this.lastAt = 0;               // marca de reloj de la ultima llegada
  }

  /** Un mensaje MIDI crudo. Devuelve {seconds, fps, complete, kind} o null. */
  push(data, nowMs){
    if(!data || !data.length) return null;
    const now = (typeof nowMs === 'number') ? nowMs : Date.now();
    if(data[0] === 0xF1) return this._quarter(data[1], now);
    if(data[0] === 0xF0) return this._full(data, now);
    return null;
  }

  _quarter(byte, now){
    const idx = (byte >> 4) & 7;
    const val = byte & 0x0F;
    // Fuera de orden (llegamos a mitad de una secuencia): esperar al siguiente 0.
    if(idx !== this.expect){
      if(idx !== 0){ this.expect = 0; this.seen = 0; return null; }
      this.seen = 0;
    }
    this.nibbles[idx] = val;
    this.seen |= (1 << idx);
    this.expect = (idx + 1) & 7;
    this.lastAt = now;
    this.running = true;
    if(this.seen !== 0xFF) return null;      // aun no estan los ocho

    const f = this.nibbles[0] | (this.nibbles[1] << 4);
    const s = this.nibbles[2] | (this.nibbles[3] << 4);
    const m = this.nibbles[4] | (this.nibbles[5] << 4);
    const hByte = this.nibbles[6] | (this.nibbles[7] << 4);
    const h = hByte & 0x1F;
    this.fps = fpsFromCode(hByte >> 5);
    this.seen = 0; this.expect = 0;

    // los ocho describen el inicio de la secuencia: ya han pasado 2 tramas
    const secs = tcToSeconds(h, m, s, f, this.fps) + (2 / this.fps);
    this.seconds = secs;
    return { seconds: secs, fps: this.fps, complete: true, kind: 'quarter' };
  }

  _full(data, now){
    // F0 7F <dev> 01 01 hh mm ss ff F7
    if(data.length < 10) return null;
    if(data[1] !== 0x7F || data[3] !== 0x01 || data[4] !== 0x01) return null;
    const hByte = data[5];
    const h = hByte & 0x1F;
    this.fps = fpsFromCode(hByte >> 5);
    const secs = tcToSeconds(h, data[6], data[7], data[8], this.fps);
    this.seconds = secs;
    this.lastAt = now;
    this.seen = 0; this.expect = 0;
    // Un salto no significa que este rodando: Pro Tools lo manda tambien al parar.
    return { seconds: secs, fps: this.fps, complete: true, kind: 'full' };
  }

  /** Sin cuartos de trama durante un rato, el transporte esta parado. */
  isRolling(nowMs, quietMs){
    if(!this.running) return false;
    const now = (typeof nowMs === 'number') ? nowMs : Date.now();
    return (now - this.lastAt) <= (quietMs || 120);
  }
}

// Sirve en node (tests, worker) y en el navegador. Sin variable con nombre:
// estos ficheros comparten ambito global al cargarse como scripts clasicos,
// y un `const` repetido tumbaria al segundo que se cargue.
if(typeof module !== 'undefined' && module.exports) module.exports = { MtcReader, tcToSeconds, fpsFromCode, FPS };
if(typeof self !== 'undefined') Object.assign(self, { MtcReader, tcToSeconds, fpsFromCode, FPS });
