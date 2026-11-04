/* El frame rate de los videos · especificacion 04, EST-6
 *
 * Pedido de sala: «los videos que suba, también hay que detectar el frame
 * rate». Lo que protege esta prueba:
 *   1. se lee de la cabecera del MP4/MOV (la pista de video, aunque haya
 *      audio antes, con el moov al final y cajas de 64 bits) y del WebM/MKV;
 *   2. se ajusta a los de siempre, y el factor NTSC: 23.976 y 29.97 van un
 *      0,1 % más lentos que el reloj (3,6 s a la hora), salvo en drop frame;
 *   3. si la cabecera no lo dice, se mide al reproducir;
 *   4. las cuentas del Video Estudio pasan por ahí, y sin dato todo queda como
 *      antes (25 fps, factor 1).
 * (Con videos de verdad generados con ffmpeg —23.976, 24, 25, 29.97, 50 y
 * 59.94 en MP4; 29.97 en MOV con faststart; 23.976 en WebM con audio Opus; 25
 * en MKV— sale el frame rate exacto: comprobado al hacerlo.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Frame rate de los videos';

const RAIZ = path.dirname(INDEX);

/* ── Un MP4 de mentira, caja a caja ── */
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const txt = (t) => [...t].map(c => c.charCodeAt(0));
const caja = (tipo, ...hijos) => { const c = [].concat(...hijos); return [...u32(8 + c.length), ...txt(tipo), ...c]; };
const hdlr = (h) => caja('hdlr', u32(0), u32(0), txt(h), u32(0), u32(0), u32(0), [0]);
const mdhd = (escala, v1) => v1 ? caja('mdhd', [1, 0, 0, 0], u32(0), u32(0), u32(0), u32(0), u32(escala), u32(0), u32(0), [0, 0, 0, 0])
                                : caja('mdhd', u32(0), u32(0), u32(0), u32(escala), u32(0), [0, 0, 0, 0]);
const stts = (...e) => caja('stts', u32(0), u32(e.length), ...e.map(x => [...u32(x[0]), ...u32(x[1])]));
const trak = (h, escala, entradas, v1) => caja('trak', caja('mdia', mdhd(escala, v1), hdlr(h), caja('minf', caja('stbl', stts(...entradas)))));
class Archivo{ constructor(bytes){ this.b = Uint8Array.from(bytes); this.size = this.b.length; }
  slice(a, z){ const x = new Archivo([]); x.b = this.b.subarray(a, Math.min(z, this.b.length)); x.size = x.b.length; return x; }
  async arrayBuffer(){ return this.b.buffer.slice(this.b.byteOffset, this.b.byteOffset + this.b.length); } }

/* ── Un WebM de mentira ── */
const ebml = (id, cuerpo) => { const n = cuerpo.length; return id.concat([0x01, 0, 0, 0, 0, (n >>> 16) & 255, (n >>> 8) & 255, n & 255], cuerpo); };   // tamaño en 8 bytes
const uint = (n) => { const out = []; let v = n; do{ out.unshift(v % 256); v = Math.floor(v / 256); }while(v > 0); return out; };
const el = (id, v) => ebml(id, uint(v));

exports.pruebas = async function(t){
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'videofps.js'), 'utf8') + ';this.A = { vfpsDeArchivo, vfpsNormal, vfpsK, vfpsNominal, vfpsEtiqueta, vfpsMedir, vfpsDeMoov, vfpsDeEbml };', ctx);
  const A = ctx.A;

  t.seccion('1 · de la cabecera del archivo');
  const ftyp = caja('ftyp', txt('isom'), u32(512), txt('isomavc1'));
  const moov2397 = caja('moov', caja('mvhd', u32(0)), trak('soun', 48000, [[100, 1024]]), trak('vide', 24000, [[48, 1001]]));
  let r = await A.vfpsDeArchivo(new Archivo([...ftyp, ...caja('mdat', new Array(2000).fill(7)), ...moov2397]));
  t.eq('MP4 con el moov al final y el audio primero: 23.976', JSON.stringify(r), '{"fps":23.976,"de":"mp4"}');
  /* Un mdat con tamaño de 64 bits (size = 1): se salta igual. */
  const mdat64 = [...u32(1), ...txt('mdat'), ...u32(0), ...u32(16 + 100), ...new Array(100).fill(1)];
  r = await A.vfpsDeArchivo(new Archivo([...ftyp, ...mdat64, ...caja('moov', trak('vide', 30000, [[59, 1001], [1, 1002]], true))]));
  t.eq('caja de 64 bits, mdhd versión 1 y una última muestra algo más larga: 29.97', r.fps, 29.97);
  r = await A.vfpsDeArchivo(new Archivo([...caja('moov', trak('vide', 25, [[50, 1]])), ...ftyp]));
  t.eq('MOV con el moov delante: 25', r.fps, 25);
  t.eq('sin pista de video: no se inventa', JSON.stringify(await A.vfpsDeArchivo(new Archivo([...ftyp, ...caja('moov', trak('soun', 48000, [[10, 1024]]))]))), 'null');
  /* WebM: EBML, Segment de tamaño desconocido, una pista de audio (con su DefaultDuration de 20 ms) y la de video. */
  const segmento = [0x18, 0x53, 0x80, 0x67, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  const tracks = ebml([0x16, 0x54, 0xAE, 0x6B], [].concat(
    ebml([0xAE], [].concat(el([0x83], 2), el([0x23, 0xE3, 0x83], 20000000))),
    ebml([0xAE], [].concat(el([0x83], 1), el([0x23, 0xE3, 0x83], 41708333)))));
  const webm = [].concat(ebml([0x1A, 0x45, 0xDF, 0xA3], el([0x42, 0x82], 1)), segmento, tracks, ebml([0x1F, 0x43, 0xB6, 0x75], [1, 2, 3]));
  t.eq('WebM: la pista de VIDEO (no la de audio, que también trae DefaultDuration): 23.976', JSON.stringify(await A.vfpsDeArchivo(new Archivo(webm))), '{"fps":23.976,"de":"webm"}');
  t.eq('un archivo que no es video: nulo', JSON.stringify(await A.vfpsDeArchivo(new Archivo(txt('hola, esto es texto plano')))), 'null');

  t.seccion('2 · los de siempre, y el 0,1 % del NTSC');
  t.eq('se ajusta al más cercano', [23.9760239, 23.98, 24.0001, 29.97002997, 59.94, 25.02, 12.5].map(A.vfpsNormal).join(','), '23.976,23.976,24,29.97,59.94,25,12.5');
  t.eq('factor: NTSC 1.001, drop frame y los demás 1', [A.vfpsK(23.976), A.vfpsK(29.97), A.vfpsK(29.97, true), A.vfpsK(59.94), A.vfpsK(25), A.vfpsK(24), A.vfpsK(30)].join(','), '1.001,1.001,1,1.001,1,1,1');
  t.eq('fotogramas por segundo de timecode', [23.976, 29.97, 59.94, 25, 50].map(A.vfpsNominal).join(','), '24,30,60,25,50');
  t.eq('cómo se dice', A.vfpsEtiqueta(29.97, true) + ' · ' + A.vfpsEtiqueta(23.976) + ' · ' + A.vfpsEtiqueta(25), '29.97 DF · 23.976 · 25');

  t.seccion('3 · si la cabecera no lo dice, se mide al reproducir');
  {
    let n = 0, medido = null;
    const video = { requestVideoFrameCallback(cb){ const k = n++; if(k < 80) Promise.resolve().then(() => cb(0, { mediaTime: k / 29.97 })); } };
    t.eq('se puede medir', A.vfpsMedir(video, (f) => { medido = f; }), true);
    for(let i = 0; i < 100; i++) await Promise.resolve();
    t.eq('con 40 fotogramas: 29.97', medido, 29.97);
    t.eq('un navegador que no sabe medir: no pasa nada', A.vfpsMedir({}, () => {}), false);
  }

  t.seccion('4 · el Video Estudio');
  {
    const sync = { marks: {} };
    const M = montar([['function studioTc0(){', '/** El selector del frame rate, con de dónde sale. */']],
      ['studioTc0', 'studioFps', 'studioFpsNominal', 'studioK', 'studioTcDeVid', 'studioVidDeTc'],
      { sync, studioFine: () => 0, vfpsK: A.vfpsK, vfpsNominal: A.vfpsNominal, $: () => null, fallo(){}, cloudSaveMarks(){} });
    sync.marks._tcOff = { v: 3600 };
    t.eq('sin frame rate guardado: 25 y factor 1, como antes', M.studioFps() + ' ' + M.studioK() + ' ' + M.studioVidDeTc(3610), '25 1 10');
    sync.marks._fps = { v: 23.976, de: 'video' };
    t.eq('a 23.976, TC 01:00:10 está a 10,01 s del inicio del video', M.studioVidDeTc(3610).toFixed(3), '10.010');
    t.eq('y a la hora de programa, 3,6 s más (lo que antes se desfasaba)', (M.studioVidDeTc(7200) - 3600).toFixed(1), '3.6');
    t.eq('ida y vuelta exacta', M.studioTcDeVid(M.studioVidDeTc(4321.5)).toFixed(6), '4321.500000');
    t.eq('los fotogramas del timecode: 24', M.studioFpsNominal(), 24);
    sync.marks._fps = { v: 29.97, df: true, de: 'mano' };
    t.eq('29.97 drop frame sigue al reloj', M.studioVidDeTc(7200), 3600);
    const HTML = fs.readFileSync(INDEX, 'utf8');
    const resto = HTML.replace(/function studioTcDeVid[^\n]*\n/, '').replace(/function studioVidDeTc[^\n]*\n/, '');
    t.ok('ninguna cuenta del estudio suma o resta el TC inicio a mano: todas pasan por el frame rate',
         !/currentTime \+ studioTc0\(\)/.test(resto) && !/- studioTc0\(\) - studioFine\(\)/.test(resto) && !/studioTc0\(\) \+ studioFine\(\)/.test(resto));
    t.ok('ni en ADR, cortes y sala', ['adr.js', 'cortes.js', 'sala.js'].every(f => { const j = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8'); return /studioK/.test(j) && !/currentTime \+ studioTc0\(\)/.test(j) && !/return tc - studioTc0\(\)/.test(j); }));
    t.ok('al cargar un video se lee su frame rate; si no lo dice, se mide; lo puesto a mano manda',
         /vfpsDeArchivo\(blob, name\)\.then/.test(HTML) && /vfpsMedir\(el, /.test(HTML) && /if\(de !== 'mano' && ya && ya\.de === 'mano'\) return false;/.test(HTML));
    t.ok('el selector «fps» en el estudio, con 29.97 DF', /<select id="stFps"/.test(HTML) && /<option value="29\.97df">29\.97 DF<\/option>/.test(HTML));
    t.ok('los «:FF» del timecode con los fotogramas del video', /fr\/\(typeof studioFpsNominal === 'function' \? studioFpsNominal\(\) : 25\)/.test(HTML) && /const nf=\(typeof studioFpsNominal === 'function'\) \? studioFpsNominal\(\) : 25;/.test(HTML));
    const F = fs.readFileSync(path.join(RAIZ, 'js', 'formatos.js'), 'utf8');
    t.ok('importar y exportar subtítulos y marcadores de Pro Tools, con el frame rate', /tcSec: f\.t0 \/ k \+ desfase/.test(F) && /ioTC\(\(a\.tc0 - off\) \* ioK\(\), true\)/.test(F) && /'TIMECODE FORMAT:\\t' \+ ioFpsEtiqueta\(\) \+ ' Frame/.test(F) && /a\.tc0 \* ioK\(\) \* 48000/.test(F));
    t.ok('el módulo se carga y va en la caché', /<script src="\.\/js\/videofps\.js"><\/script>/.test(HTML) && /'\.\/js\/videofps\.js'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')));
  }
};
