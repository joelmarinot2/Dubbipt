/* Traer y llevar formatos · especificacion 05
 *
 * La especificacion decia que esto era «lo mas facil de automatizar de todo el
 * proyecto» y que deberia ser lo siguiente en llegar. Aqui esta.
 *
 * Son funciones de texto a texto: entra un SRT, un STL o un CSV, y sale la
 * lista de intervenciones; o al contrario. Ni navegador, ni video, ni red. Por
 * eso se puede probar de verdad, y por eso no tenerlo probado era una lastima.
 *
 * Se monta la cadena COMPLETA -leer, construir el libreto, y volver a
 * exportar- con las funciones de verdad de js/formatos.js y js/adr.js. Lo
 * unico simulado es lo que no tiene nada que ver: el reloj del video y el
 * guardado en la nube.
 */
'use strict';
const { montar, trozo } = require('./ayuda');

exports.nombre = 'Formatos: traer y llevar';

exports.pruebas = function(t){
  /* ── El contexto: solo lo ajeno al asunto ─────────────────────────────
     El TC de inicio del video es un valor que la aplicacion saca del
     capitulo; aqui se controla desde la prueba para poder comprobar la cuenta
     de FMT-1. Todo lo demas -leer, construir, exportar- es codigo real. */
  let tcInicio = 0;
  const guardado = [];
  const avisos = [];
  const bajados = [];

  const ctx = {
    // el reloj del video
    studioTc0: () => tcInicio,
    studioFine: () => 0,
    stFmt: (s) => String(Math.round(s)),
    stFmtTC: (s) => { s = Math.max(0, s || 0);
      const p = (v) => String(v).padStart(2, '0');
      return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(Math.floor(s % 60)); },
    // la ventana de una intervencion: hasta la siguiente, o dos segundos
    karVentana: null,          // se rellena abajo, necesita `script`
    // lo que no tiene que ver con los formatos
    charColor: () => '#5FC85A',
    buildPronIndex: () => {},
    salaOlvidar: () => {},
    renderCards: () => {},
    renderPlanilla: () => {},
    refreshLibretoChips: () => {},
    renderLibretoBlocks: () => {},
    adrRepintar: () => {},
    salaCues: () => [],
    epDataUpsert: async () => { guardado.push(1); return true; },
    castAviso: (m) => avisos.push(m),
    esc: (s) => String(s),
    currentEp: { id: 'ep1', showId: 'sh1', name: 'PRUEBA 101' },
    pop2: { doc: null },
    window: {},
    /* Un navegador de mentira, lo justo para que `ioDescargar` -que es codigo
       REAL- pueda hacer su trabajo y quedarse apuntado lo que habria bajado.
       Se hace asi y no simulando `ioDescargar` porque es una declaracion de
       funcion: taparia cualquier parametro con su mismo nombre. Y de paso se
       prueba tambien el nombre del archivo, que es parte del resultado. */
    Blob: class { constructor(partes){ this.texto = (partes || []).join(''); } },
    URL: {
      _n: 0, _mapa: new Map(),
      createObjectURL(b){ const u = 'blob:' + (++this._n); this._mapa.set(u, b.texto); return u; },
      revokeObjectURL(){}
    },
    document: {
      createElement: () => ({
        href: '', download: '', style: {},
        click(){ bajados.push({ nombre: this.download, texto: ctx.URL._mapa.get(this.href) }); },
        remove(){}
      }),
      body: { appendChild(){} }
    },
    setTimeout: setTimeout,
    // norm y castNorm, los de verdad
    norm: null,
    castNorm: null
  };
  // los normalizadores reales de la aplicacion
  const NN = montar([['function norm(s){', 'function esc(s){']], ['norm'], {});
  ctx.norm = NN.norm;
  const CN = montar([['function castNorm(t){', '/** El número final']], ['castNorm'], {});
  ctx.castNorm = CN.castNorm;

  const F = montar(
    [['function ioTC(sec, coma){', '/* ── ENTRADA ──'],
     ['/* ── ENTRADA ──', 'async function ioImportar(file){'],
     ['/* ── SALIDA ──', '/* ── El panel ──'],
     ['const ADR_ESTADOS', '/* ── Entrada y salida: cogerlas del v']],
    ['ioTC', 'ioTCf', 'ioLeerTC', 'ioPersonajeDe', 'ioLeerSRT', 'ioLeerCSV', 'ioColumnas',
     'ioLeerSTL', 'ioMontarLibreto', 'ioCues', 'ioExportarSRT', 'ioExportarCSV',
     'ioExportarTTML', 'ioExportarMarcadores', 'adrDe', 'adrTodos', 'adrEstado', 'adrFijar',
     'ADR_ESTADOS'],
    ctx
  );

  /* ── FMT-2 · los timecodes, en sus cuatro formas ──────────────────────── */
  t.seccion('1 · FMT-2 · leer un timecode escrito de cuatro maneras');
  t.eq('con coma', F.ioLeerTC('00:00:05,500'), 5.5);
  t.eq('con punto', F.ioLeerTC('00:00:05.500'), 5.5);
  t.eq('con fotogramas a 25', F.ioLeerTC('00:00:05:12'), 5.48);
  t.eq('sin milesimas', F.ioLeerTC('00:01:30'), 90);
  t.eq('minutos y segundos', F.ioLeerTC('1:30'), 90);
  t.eq('segundos sueltos con punto', F.ioLeerTC('12.5'), 12.5);
  t.eq('segundos sueltos con coma', F.ioLeerTC('12,5'), 12.5);
  t.eq('una hora entera', F.ioLeerTC('01:00:00'), 3600);
  t.eq('lo que no es un timecode, nada', F.ioLeerTC('mañana'), null);
  t.eq('vacio, nada', F.ioLeerTC(''), null);

  t.seccion('2 · y escribirlos');
  t.eq('con coma, como pide el SRT', F.ioTC(5.5, true), '00:00:05,500');
  t.eq('con punto, como pide el TTML', F.ioTC(5.5, false), '00:00:05.500');
  t.eq('con fotogramas', F.ioTCf(5.48, 25), '00:00:05:12');
  t.eq('una hora', F.ioTCf(3600, 25), '01:00:00:00');
  t.eq('nunca negativo', F.ioTC(-3, true), '00:00:00,000');

  /* Lo que de verdad importa no es cada formato por separado, sino que
     escribir y volver a leer devuelva el mismo instante. Si un dia alguien
     cambia el redondeo de los fotogramas, esto lo caza. */
  t.seccion('2b · escribir y volver a leer da el mismo instante');
  for(const s of [0, 1.5, 5.48, 12.04, 90, 3600, 3725.36]){
    t.cerca('SRT · ' + s + ' s', F.ioLeerTC(F.ioTC(s, true)), s, 0.0005);
    t.cerca('fotogramas · ' + s + ' s', F.ioLeerTC(F.ioTCf(s, 25)), s, 1 / 25);
  }

  /* ── FMT-3 · el personaje delante del texto ───────────────────────────── */
  t.seccion('3 · FMT-3 · el personaje que viene pegado al texto');
  t.eq('NILA: hola', F.ioPersonajeDe('NILA: hola').nombre, 'NILA');
  t.eq('y el resto queda limpio', F.ioPersonajeDe('NILA: hola').resto, 'hola');
  t.eq('con guion delante', F.ioPersonajeDe('- BABU: vamos').nombre, 'BABU');
  t.eq('con raya', F.ioPersonajeDe('— TIA: no').nombre, 'TIA');
  t.eq('con nombre compuesto', F.ioPersonajeDe('MALE SOLDIER: alto').nombre, 'MALE SOLDIER');
  t.eq('sin personaje, nada', F.ioPersonajeDe('Recuerda que adoramos.'), null);
  t.eq('una frase con dos puntos en medio no es un personaje',
       F.ioPersonajeDe('Te lo dije: no vengas'), null);

  /* ── FMT-4 y FMT-5 · el CSV ───────────────────────────────────────────── */
  t.seccion('4 · FMT-4 · el CSV se lee con comillas de verdad');
  const csv = 'TC in;TC out;Personaje;Texto\n'
            + '00:00:02:00;00:00:05:12;NILA;"Hola, ""mundo"""\n'
            + '00:00:06,5;00:00:09;BABU;"Una linea\ncon salto"\n';
  const filas = F.ioLeerCSV(csv);
  t.eq('tres filas: la cabecera y dos datos', filas.length, 3);
  t.eq('las comillas dobladas se deshacen', filas[1][3], 'Hola, "mundo"');
  t.eq('un salto dentro de comillas no parte la fila', filas[2][3], 'Una linea\ncon salto');
  t.eq('separador punto y coma detectado', filas[1][2], 'NILA');

  const conComas = F.ioLeerCSV('a,b,c\n1,2,3\n');
  t.eq('tambien con comas', conComas[1].join('|'), '1|2|3');
  const conTabs = F.ioLeerCSV('a\tb\tc\n1\t2\t3\n');
  t.eq('y con tabuladores', conTabs[1].join('|'), '1|2|3');

  t.seccion('5 · FMT-5 · las columnas, por el nombre de la cabecera');
  const col = F.ioColumnas(['TC in', 'TC out', 'Personaje', 'Texto']);
  t.eq('entrada', col.in, 0);
  t.eq('salida', col.out, 1);
  t.eq('personaje', col.pers, 2);
  t.eq('texto', col.texto, 3);
  const col2 = F.ioColumnas(['Character', 'Start', 'End', 'Dialogue']);
  t.eq('tambien en ingles: personaje', col2.pers, 0);
  t.eq('y el dialogo', col2.texto, 3);
  const col3 = F.ioColumnas(['no', 'se', 'sabe']);
  t.eq('si no se reconoce, se dice que no', col3.texto, -1);

  /* ── FMT-6 y FMT-7 · el STL, byte a byte ──────────────────────────────── */
  t.seccion('6 · FMT-6 · el STL de la EBU, fabricado aqui mismo');
  const stl = (subs, dfc, cct) => {
    const b = new Uint8Array(1024 + subs.length * 128).fill(0x20);
    const put = (s, off) => { for(let i = 0; i < s.length; i++) b[off + i] = s.charCodeAt(i); };
    put('850' + (dfc || 'STL25.01'), 0);
    put(cct || '00', 12);
    let p = 1024;
    for(let i = 0; i < subs.length; i++){
      const s = subs[i];
      const fps = /STL30/.test(dfc || '') ? 30 : 25;
      b[p] = 0; b[p+1] = 0; b[p+2] = i + 1; b[p+3] = 0; b[p+4] = 0;
      const tc = (sec, o) => { b[p+o] = Math.floor(sec / 3600); b[p+o+1] = Math.floor(sec % 3600 / 60);
                               b[p+o+2] = Math.floor(sec % 60); b[p+o+3] = Math.round((sec % 1) * fps); };
      tc(s.t0, 5); tc(s.t1, 9);
      for(let k = 16; k < 128; k++) b[p+k] = 0x8F;          // relleno
      let q = p + 16;
      if(s.color) b[q++] = 0x83;                            // codigo de color: se ignora
      for(const ch of s.txt) b[q++] = ch === '\n' ? 0x8A : (ch.charCodeAt(0) & 0xFF);
      p += 128;
    }
    return b.buffer;
  };
  const r1 = F.ioLeerSTL(stl([
    { t0: 2.0, t1: 5.52, txt: 'NILA: Esta es la casa\nde su madre.' },
    { t0: 6.0, t1: 9.12, txt: 'BABU: Aunque nos dividamos.', color: true },
    { t0: 10.0, t1: 12.4, txt: 'NILA: Adios, señor.' }
  ]));
  t.eq('25 fotogramas por segundo', r1.fps, 25);
  t.eq('juego de caracteres latino', r1.latino, true);
  t.eq('tres subtitulos', r1.filas.length, 3);
  t.eq('los renglones se unen', r1.filas[0].texto, 'NILA: Esta es la casa de su madre.');
  t.cerca('el timecode de entrada', r1.filas[0].t0, 2, 0.001);
  t.cerca('y el de salida, al fotograma', r1.filas[0].t1, 5.52, 0.001);
  t.eq('el codigo de color no se cuela en el texto', r1.filas[1].texto, 'BABU: Aunque nos dividamos.');
  t.eq('las tildes y la ñ, vivas', r1.filas[2].texto, 'NILA: Adios, señor.');

  const r30 = F.ioLeerSTL(stl([{ t0: 1, t1: 2, txt: 'A' }], 'STL30.01'));
  t.eq('un STL a 30 se detecta', r30.fps, 30);

  t.seccion('7 · FMT-7 · un juego de caracteres que no es latino se avisa');
  const rCyr = F.ioLeerSTL(stl([{ t0: 1, t1: 2, txt: 'A' }], 'STL25.01', 'C0'));
  t.eq('se marca como no latino', rCyr.latino, false);
  t.eq('y se dice cual es', rCyr.cct, 'C0');
  t.ok('un archivo demasiado corto se rechaza con un mensaje',
       (F.ioLeerSTL(new Uint8Array(50).buffer).error || '').length > 0);

  /* ── FMT-1 · la cuenta del TC de inicio ───────────────────────────────── */
  t.seccion('8 · FMT-1 · al traer se suma el TC de inicio; al llevar, se resta');
  const srt = '1\n00:00:02,000 --> 00:00:05,500\nNILA: Esta es la casa de su madre.\n\n'
            + '2\n00:00:06,000 --> 00:00:09,120\nBABU: Aunque nos dividamos\npor castas.\n\n'
            + '3\n00:00:10,000 --> 00:00:12,400\nRecuerda que adoramos al mismo Dios.\n';
  const leidas = F.ioLeerSRT(srt);
  t.eq('tres subtitulos', leidas.length, 3);
  t.eq('el partido en dos renglones se lee entero',
       leidas[1].texto.replace(/\s+/g, ' '), 'BABU: Aunque nos dividamos por castas.');

  tcInicio = 3600;                                  // el video empieza a la hora 01:00:00
  ctx.window._adrDatos = {};
  const montado = F.ioMontarLibreto(leidas);
  t.eq('tres cues', montado.cues, 3);
  t.eq('dos personajes con nombre, mas el generico', montado.personajes, 3);

  const cues = F.ioCues();
  t.eq('el primero es NILA', cues[0].display, 'NILA');
  t.eq('y entra a la hora, no al segundo 2', ctx.stFmtTC(cues[0].tc0), '01:00:02');
  t.eq('el segundo es BABU', cues[1].display, 'BABU');
  t.eq('el tercero, sin personaje, va al generico', cues[2].display, 'DIÁLOGO');
  t.cerca('la salida del primero viene del subtitulo', cues[0].tc1 - 3600, 5.5, 0.001);

  t.seccion('9 · FMT-8 · la salida del subtitulo se guarda como correccion del cue');
  const g = ctx.window._adrDatos;
  t.ok('hay correcciones guardadas', Object.keys(g).length === 3);
  t.cerca('y son las salidas, en timecode de reloj', g['0'].tc1, 3605.5, 0.001);

  /* ── Ida y vuelta ─────────────────────────────────────────────────────── */
  t.seccion('10 · ida y vuelta: sale y vuelve a entrar igual');
  bajados.length = 0;
  F.ioExportarSRT();
  t.eq('se ha bajado un archivo', bajados.length, 1);
  t.ok('con extension .srt', /\.srt$/.test(bajados[0].nombre));
  const vuelta = F.ioLeerSRT(bajados[0].texto);
  t.eq('los mismos tres', vuelta.length, 3);
  t.cerca('el primero, mismo inicio', vuelta[0].t0, 2, 0.001);
  t.cerca('y mismo fin', vuelta[0].t1, 5.5, 0.001);
  t.cerca('el segundo', vuelta[1].t0, 6, 0.001);
  t.cerca('el tercero', vuelta[2].t0, 10, 0.001);
  t.ok('el personaje va delante, para no perderlo',
       vuelta[0].texto.indexOf('NILA:') === 0);

  /* ── FMT-12 y el CSV de salida ────────────────────────────────────────── */
  t.seccion('11 · FMT-12 · el CSV de salida lo abre Excel con las tildes bien');
  F.adrEstado(0, 'aprobado');
  F.adrFijar(0, 'notas', 'mas seco');
  bajados.length = 0;
  F.ioExportarCSV();
  const txtCsv = bajados[0].texto;
  t.eq('empieza con la marca de orden de bytes', txtCsv.charCodeAt(0), 0xFEFF);
  const fCsv = F.ioLeerCSV(txtCsv.slice(1));
  t.eq('cabecera de diez columnas', fCsv[0].length, 10);
  t.eq('el timecode va con fotogramas', fCsv[1][0], '01:00:02:00');
  t.eq('el estado, en palabras', fCsv[1][8], 'Aprobado');
  t.eq('y la nota', fCsv[1][9], 'mas seco');

  /* ── FMT-11 · el TTML ─────────────────────────────────────────────────── */
  t.seccion('12 · FMT-11 · el TTML lleva un agente por personaje');
  bajados.length = 0;
  F.ioExportarTTML();
  const ttml = bajados[0].texto;
  t.ok('es XML', ttml.indexOf('<?xml') === 0);
  t.eq('tres parrafos', (ttml.match(/<p /g) || []).length, 3);
  t.eq('tres agentes: NILA, BABU y el generico', (ttml.match(/<ttm:agent /g) || []).length, 3);
  t.ok('los tiempos van sin el TC de inicio', ttml.indexOf('begin="00:00:02.000"') >= 0);
  t.ok('cada parrafo dice de quien es', ttml.indexOf('ttm:agent="p_NILA"') >= 0);

  /* ── FMT-10 · los marcadores ──────────────────────────────────────────── */
  t.seccion('13 · FMT-10 · los marcadores, como los escribe Pro Tools');
  bajados.length = 0;
  F.ioExportarMarcadores();
  const mk = bajados[0].texto.split('\n');
  t.ok('lleva el nombre de la sesion', mk[0].indexOf('SESSION NAME:') === 0);
  t.ok('y el formato de timecode', mk[1].indexOf('TIMECODE FORMAT:') === 0);
  t.ok('con la cabecera de columnas de Pro Tools',
       bajados[0].texto.indexOf('#\tLOCATION\tTIME REFERENCE\tUNITS\tNAME\tCOMMENTS') > 0);
  const fila1 = mk.find(l => /^1\t/.test(l)).split('\t');
  t.eq('el timecode es de RELOJ, con la hora del rollo', fila1[1], '01:00:02:00');
  t.eq('la referencia va en muestras a 48 kHz', fila1[3], 'Samples');
  t.ok('el nombre es el del personaje', fila1[4].indexOf('NILA') === 0);

  /* ── FMT-N3 ───────────────────────────────────────────────────────────── */
  t.seccion('14 · FMT-N3 · un archivo sin una sola linea con tiempo no vale');
  t.eq('un SRT sin timecodes no da nada', F.ioLeerSRT('hola\nque tal\n').length, 0);
  t.eq('ni un texto cualquiera', F.ioLeerSRT('').length, 0);
};
