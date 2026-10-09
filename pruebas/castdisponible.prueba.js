/* La disponibilidad de los talentos, desde el casting · especificacion 09, PRO-20 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Casting: la disponibilidad de los talentos';

const PR = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']],
  ['prodNormalizar', 'prodFichaTexto', 'prodCasarPrograma'], { castNorm: undefined, console: { warn: () => {} } });

/* Lo de DublajeCast: «Akka» es el programa que se castea. */
const DC = () => PR.prodNormalizar({
  series: [{ id: 1, name: 'Akka', status: 'en_curso' }, { id: 2, name: 'Dofus', status: 'en_curso' }, { id: 3, name: 'Ninjago', status: 'en_curso' },
           { id: 4, name: 'Viejo', status: 'completo' }, { id: 5, name: 'Rex', status: 'en_curso' }],
  episodes: [{ id: 11, series_id: 1, episode_number: 1 }, { id: 21, series_id: 2, episode_number: 1 }, { id: 22, series_id: 2, episode_number: 2, status: 'completo' },
             { id: 31, series_id: 3, episode_number: 1 }, { id: 41, series_id: 4, episode_number: 1 }, { id: 51, series_id: 5, episode_number: 1 }],
  characters: [{ id: 101, canonical_name: 'JANA' }, { id: 102, canonical_name: 'ALLY' }, { id: 201, canonical_name: 'DOFUS' }, { id: 202, canonical_name: 'REY' },
               { id: 301, canonical_name: 'KAI' }, { id: 401, canonical_name: 'ABUELO' }, { id: 501, canonical_name: 'REX' }],
  talents: [{ id: 1, name: 'ANA ROJAS', genero: 'femenino', edad_aparente: 'adulto', tono_de_voz: 'agudo' }, { id: 2, name: 'BETO LUNA' }, { id: 3, name: 'CARLA PAZ' }],
  castings: [{ id: 1, character_id: 101, talent_id: 1, episode_id: 11 },
             { id: 2, character_id: 201, talent_id: 1, episode_id: 21 }, { id: 3, character_id: 202, talent_id: 1, episode_id: 21 }, { id: 4, character_id: 202, talent_id: 1, episode_id: 22 },
             { id: 5, character_id: 301, talent_id: 1, episode_id: 31 }, { id: 6, character_id: 401, talent_id: 2, episode_id: 41 }, { id: 7, character_id: 501, talent_id: 1, episode_id: 51 },
             { id: 8, character_id: 201, talent_id: 3, episode_id: 22 }],
  appearances: [{ id: 1, character_id: 201, episode_id: 21, line_count: 40 }, { id: 2, character_id: 202, episode_id: 21, line_count: 10 }, { id: 3, character_id: 301, episode_id: 31, line_count: 5 }]
});

function armar(){
  return montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DISPONIBILIDAD DE LOS TALENTOS', '/* ═══ FIN DE DISPONIBILIDAD DE LOS TALENTOS']],
    ['DISP', 'dispNivel', 'dispFilas', 'dispVisibles', 'dispHtml'],
    { castNorm: undefined, prodFichaTexto: PR.prodFichaTexto, esc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), fallo: () => {} });
}

exports.pruebas = async function(t){
  const M = armar();
  const d = DC();
  const REG = { personajes: { ALLY: { display: 'Ally', talent: 'Beto  Luna', episodios: ['Episodio 1', 'Episodio 2'] }, JANA: { display: 'Jana', talent: 'ANA ROJAS', episodios: ['Episodio 1'] } } };
  const EN_CAP = [{ talento: 'DIEGO SOL', personajes: [{ display: 'Narrador', ints: 12 }], ints: 12 }];
  const filas = M.dispFilas({ base: ['DIEGO SOL', 'Ana Rojas'], d: d, serie: d.series[0], registro: REG, enCap: EN_CAP });
  const de = (n) => filas.find(f => f.nombre === n || f.clave === n);

  t.seccion('1 · lo que se sabe de cada talento');
  t.eq('el nombre, como en la base de Dubbipt, que es el que usa el casting', de('ANA ROJAS').nombre, 'Ana Rojas');
  t.eq('uno por talento: los de la base y los de DublajeCast, sin repetir', filas.map(f => f.clave).sort().join(', '), 'ANA ROJAS, BETO LUNA, CARLA PAZ, DIEGO SOL');
  t.eq('quién ya ha estado en este programa: DublajeCast y el registro de Dubbipt, sin repetir el personaje', de('ANA ROJAS').enPrograma.map(x => x.personaje + '/' + x.de).join(' ') + ' · ' + de('BETO LUNA').enPrograma.map(x => x.personaje + '/' + x.de + '/' + x.episodios).join(' '), 'JANA/DublajeCast · Ally/Dubbipt/2');
  t.eq('lo ocupado: los programas EN CURSO de fuera, sin el que se castea, los completados ni los capítulos completados',
       de('ANA ROJAS').programas.join(', ') + ' · ' + de('ANA ROJAS').personajes + ' pers. · ' + de('ANA ROJAS').lineas + ' líneas', 'Dofus, Ninjago, Rex · 4 pers. · 55 líneas');
  t.eq('quien solo tiene papel en un programa terminado, o en un capítulo terminado, está libre', de('BETO LUNA').nivel.texto + ' · ' + de('CARLA PAZ').nivel.texto, 'Libre · Libre');
  t.eq('cuán ocupado', [0, 1, 2, 3].map(n => M.dispNivel(n).clave + ':' + M.dispNivel(n).texto).join(' '), 'libre:Libre algo:En 1 programa algo:En 2 programas mucho:En 3 programas');
  t.eq('la ficha de DublajeCast', de('ANA ROJAS').ficha, 'Femenino · Adulto · Agudo');
  t.eq('lo de este capítulo', de('DIEGO SOL').enCap.join(',') + ' · ' + de('DIEGO SOL').lineasCap, 'Narrador · 12');
  const sinDc = M.dispFilas({ base: ['ANA ROJAS'], d: null, serie: null, registro: REG, enCap: [] });
  t.eq('sin DublajeCast: lo de Dubbipt, y sin decir cuán ocupado (no se sabe)', sinDc.map(f => f.clave + ':' + f.enPrograma.length + ':' + f.nivel).join(' '), 'ANA ROJAS:1:null BETO LUNA:1:null');
  t.eq('sin nada, nada', M.dispFilas({}).length, 0);

  t.seccion('2 · buscar, filtrar y ordenar');
  t.eq('los del programa primero y, entre ellos, los menos ocupados', M.dispVisibles(filas, '', false, 'programa').map(f => f.clave).join(', '), 'BETO LUNA, ANA ROJAS, CARLA PAZ, DIEGO SOL');
  t.eq('los más libres primero', M.dispVisibles(filas, '', false, 'libres').map(f => f.clave).join(', '), 'BETO LUNA, CARLA PAZ, DIEGO SOL, ANA ROJAS');
  t.eq('por nombre', M.dispVisibles(filas, '', false, 'nombre').map(f => f.clave).join(', '), 'ANA ROJAS, BETO LUNA, CARLA PAZ, DIEGO SOL');
  t.eq('solo los que han estado en el programa', M.dispVisibles(filas, '', true, 'nombre').map(f => f.clave).join(', '), 'ANA ROJAS, BETO LUNA');
  t.eq('buscar por talento o por el personaje que hizo, sin tildes ni mayúsculas', M.dispVisibles(filas, 'carla', false, 'nombre').map(f => f.clave).join(',') + ' · ' + M.dispVisibles(filas, 'ally', false, 'nombre').map(f => f.clave).join(','), 'CARLA PAZ · BETO LUNA');

  t.seccion('3 · la ventana');
  M.DISP.buscar = ''; M.DISP.soloPrograma = false; M.DISP.orden = 'programa';
  const h = M.dispHtml(filas, 'Akka', true);
  t.ok('dice el programa y cuántos ya han estado en él', /<div class="modo-tit">Disponibilidad de los talentos<\/div><div class="modo-sub">Akka · 2 talentos ya han estado en él<\/div>/.test(h));
  t.ok('cada talento con su ficha, cuán ocupado, el programa y lo de este capítulo',
       /<b>Ana Rojas<\/b><span class="disp-ficha">Femenino · Adulto · Agudo<\/span>[\s\S]*?<span class="disp-nivel disp-mucho">En 3 programas<\/span><span class="disp-prog">Ya en este programa: JANA<\/span>[\s\S]*?En curso: Dofus, Ninjago, Rex · 4 pers\. · 55 líneas/.test(h)
       && /<b>DIEGO SOL<\/b>[\s\S]*?Nunca en este programa<\/span><span class="disp-cap">En este capítulo: Narrador · 12 int\.<\/span>/.test(h));
  t.ok('los del programa, marcados', /<div class="disp-fila disp-del"><div class="disp-nom"><b>BETO LUNA<\/b>/.test(h));
  t.ok('buscar, solo los del programa y el orden, en la ventana', /id="dispBuscar"/.test(h) && /id="dispSolo"/.test(h) && /<option value="programa" selected>Los del programa primero<\/option>/.test(h));
  t.ok('uno solo, en singular', /Akka · 1 talento ya ha estado en él/.test(M.dispHtml(filas.filter(f => f.clave === 'ANA ROJAS'), 'Akka', true)));
  t.ok('sin DublajeCast se dice por qué no hay ocupación', /solo la ve el administrador/.test(M.dispHtml(sinDc, 'Akka', false)) && !/solo la ve el administrador/.test(h));
  t.ok('cerrar, con un icono de trazo y no un emoji', /id="dispCerrar"[^>]*><svg /.test(h) && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(h));
  M.DISP.buscar = 'nadie';
  t.ok('si nada coincide, se dice', /Ningún talento coincide\./.test(M.dispHtml(filas, 'Akka', true)));
  M.DISP.buscar = '';
  t.ok('sin talentos, se dice', /Todavía no hay talentos/.test(M.dispHtml([], 'Akka', true)));

  t.seccion('4 · por dónde se abre');
  const HTML = require('fs').readFileSync(require('./ayuda').INDEX, 'utf8');
  const SW = require('fs').readFileSync(require('path').join(__dirname, '..', 'sw.js'), 'utf8');
  t.ok('el botón «Disponibilidad» en la barra del casting, sin emoji', /<button class="btnv sm" id="btnDisp" style="display:none" onclick="dispAbrir\(\)" title="[^"]+">Disponibilidad<\/button>/.test(HTML));
  t.ok('sale solo con el perfil Casting, como los demás del casting', /for\(const id of \[[^\]]*'btnDisp'[^\]]*\]\)\{\s+const b = document\.getElementById\(id\);\s+if\(b\) b\.style\.display = \(m === 'casting'\) \? '' : 'none';/.test(HTML));
  t.ok('el archivo, cargado y en la caché', /<script src="\.\/js\/castdisponible\.js"><\/script>/.test(HTML) && /'\.\/js\/castdisponible\.js'/.test(SW));

  t.seccion('4b · en qué programas y episodios ha estado, con sus líneas, en cápsulas (PRO-29)');
  {
    const REG2 = { personajes: REG.personajes, capitulos: { 'Episodio 1': { ts: 1, personajes: { JANA: { display: 'Jana', talent: 'Ana Rojas', lineas: 12 }, NN: { display: 'Nadie', talent: '', lineas: 3 } } } } };
    const fh = M.dispFilas({ base: [], d: d, serie: d.series[0], registro: REG2, enCap: [], showId: 's1', programa: 'AKKA',
                             registros: [{ showId: 's1', programa: 'AKKA', serieId: 1, reg: REG2 }] });
    const ana = fh.find(f => f.clave === 'ANA ROJAS'), beto = fh.find(f => f.clave === 'BETO LUNA');
    const resumen = (f) => f.historial.map(pg => pg.programa + (pg.este ? '*' : '') + ' ' + pg.lineas + ' [' + pg.episodios.map(e => e.n + ':' + e.personajes.map(x => x.nombre + ' ' + x.lineas).join('+')).join(' ') + ']').join(' | ');
    t.eq('cada programa con sus episodios, personajes y líneas; el que se castea primero y los demás por líneas', resumen(ana),
         'AKKA* 12 [1:JANA 12] | Dofus 50 [1:DOFUS 40+REY 10] | Ninjago 5 [1:KAI 5] | Rex 0 [1:REX 0]');
    t.ok('solo los episodios activos: ni el episodio completado (Dofus 2) ni los de un programa completado (Viejo)', !/Viejo/.test(resumen(beto)) && !/2:REY/.test(resumen(ana)));
    const fin = M.dispFilas({ base: [], d: d, serie: d.series[0], registro: REG2, enCap: [], showId: 's1', programa: 'AKKA',
                              registros: [{ showId: 's1', programa: 'AKKA', serieId: 1, reg: REG2, finNombres: ['Episodio 1'], finNums: [1] }] });
    t.eq('un episodio completado en Dubbipt tampoco, aunque DublajeCast lo tenga en curso', resumen(fin.find(f => f.clave === 'ANA ROJAS')).split(' | ')[0], 'Dofus 50 [1:DOFUS 40+REY 10]');
    const finP = M.dispFilas({ base: [], d: null, serie: null, registro: null, enCap: [],
                               registros: [{ showId: 's9', programa: 'Otro 3', completo: true, reg: { capitulos: { 'Otro 3 Ep 4': { personajes: { X: { display: 'Pirata', talent: 'Luz', lineas: 7 } } } } } }] });
    t.eq('ni nada de un programa completado de Dubbipt', finP[0].historial.length, 0);
    t.eq('lo que dicen DublajeCast y Dubbipt del mismo episodio se cuenta una vez, y el programa con el nombre de Dubbipt', ana.historial[0].episodios[0].personajes.length + ' ' + ana.historial[0].programa, '1 AKKA');
    t.ok('los capítulos de antes de las fotos también cuentan, sin líneas', /AKKA\* 0 \[2:Ally 0\]/.test(resumen(beto)));
    t.ok('un personaje sin talento no es de nadie', !fh.some(f => f.historial.some(pg => pg.episodios.some(e => e.personajes.some(x => x.nombre === 'Nadie')))));
    const sinDc2 = M.dispFilas({ base: [], d: null, serie: null, registro: null, enCap: [],
                                 registros: [{ showId: 's9', programa: 'Otro programa 3', reg: { capitulos: { 'Otro programa 3 Ep 4': { personajes: { X: { display: 'Pirata', talent: 'Luz', lineas: 7 } } } } } }] });
    t.eq('sin DublajeCast, lo que sabe Dubbipt de todos sus programas', resumen(sinDc2[0]), 'Otro programa 3 7 [4:Pirata 7]');
    t.eq('buscar por un programa en el que ha estado', M.dispVisibles(fh, 'ninjago', false, 'nombre').map(f => f.clave).join(','), 'ANA ROJAS');
    const hh = M.dispHtml(fh.filter(f => f.clave === 'ANA ROJAS'), 'AKKA', true);
    t.ok('en cápsulas: una por programa, con sus episodios y líneas', /<details class="disp-pg disp-pg-este" open><summary class="disp-cap-p"><span class="disp-cap-n">AKKA<\/span><span class="disp-cap-c">1 ep\.<\/span><span class="disp-cap-c">12 líneas<\/span><\/summary>/.test(hh));
    t.ok('y una por episodio, con cada personaje y sus líneas', /<span class="disp-ep"[^>]*><b>Ep\. 1<\/b><span class="disp-ep-p">DOFUS <i>40<\/i><\/span><span class="disp-ep-p">REY <i>10<\/i><\/span><\/span>/.test(hh));
    t.ok('los otros programas, cerrados hasta que se abren', /<details class="disp-pg"><summary class="disp-cap-p"><span class="disp-cap-n">Dofus<\/span>/.test(hh));
  }

  t.seccion('5 · en una ventana aparte, para otra pantalla');
  {
    const V = ventanas();
    Object.assign(V.ep, { id: 'e1', name: 'Episodio 1', showId: 's1' });
    const ab = await V.M.dispAbrir();
    t.eq('se abre una ventana aparte, siempre la misma, con su tamaño', JSON.stringify(V.abiertas[0]), '["","dubbiptDisponibilidad","width=880,height=920,resizable=yes,scrollbars=yes"]');
    t.ok('con su título, los colores de Dubbipt y sin nada de la página', ab === V.w && /<title>Disponibilidad · Dubbipt<\/title><style>body\{ margin:0; background:#0b0d10;/.test(V.w.document.escrito) && /\.disp-mucho\{/.test(V.w.document.escrito) && V.w.focos === 1);
    t.ok('dentro, el programa, el capítulo, «Actualizar» y la lista', /<div class="modo-sub">AKKA · Episodio 1 · 1 talento ya ha estado en él<\/div>/.test(V.raiz.innerHTML) && /id="dispActualizar"/.test(V.raiz.innerHTML) && /<b>ANA ROJAS<\/b>/.test(V.raiz.innerHTML));
    t.eq('el título de la ventana dice el programa', V.w.document.title, 'Disponibilidad · AKKA');
    t.eq('el registro de este programa y, para el historial, el de los demás: una vez', V.registros.join(','), 's1,s2');
    t.eq('y se vigila cada 2 s, de memoria', V.intervalos.map(x => x[1]).join(','), '2000');
    V.intervalos[0][0]();
    t.eq('si nada cambia, ni se repinta ni se pide nada', V.pintadas + ' ' + V.registros.length, '1 2');
    V.enCap = [{ talento: 'BETO LUNA', personajes: [{ display: 'Narrador' }], ints: 3 }];
    V.intervalos[0][0](); await espera();
    t.ok('al asignar un talento aquí, la ventana lo refleja sola, sin volver a pedir el registro', V.pintadas === 2 && V.registros.length === 2 && /<b>BETO LUNA<\/b>[\s\S]*?En este capítulo: Narrador · 3 int\./.test(V.raiz.innerHTML));
    Object.assign(V.ep, { id: 'e9', name: 'Episodio 9', showId: 's2' });
    V.intervalos[0][0](); await espera();
    t.eq('al cambiar de programa, pide el registro del nuevo', V.registros.join(',') + ' · ' + /Episodio 9/.test(V.raiz.innerHTML), 's1,s2,s2 · true');
    await V.M.dispAbrir();
    t.eq('pulsar otra vez la trae delante sin abrir otra ni otro vigía', V.w.document.escritos + ' ' + V.intervalos.length + ' ' + V.w.focos, '1 1 2');
    V.w.closed = true;
    V.intervalos[0][0]();
    t.eq('al cerrarla, se deja de vigilar', V.parados + ' ' + V.M.DISP_VENTANA.tmr, '1 null');
  }
  {
    const V = ventanas({ bloqueada: true });
    Object.assign(V.ep, { id: 'e1', name: 'Episodio 1', showId: 's1' });
    await V.M.dispAbrir();
    const ov = V.cuerpo[0];
    t.ok('si el navegador bloquea la ventana, se abre dentro de la página y se dice cómo permitirla', ov && ov.id === 'dispOv' && /Tu navegador no dejó abrir una ventana aparte\. Para poder llevarla a otra pantalla, permite las ventanas emergentes de Dubbipt/.test(ov.caja.innerHTML) && !/id="dispActualizar"/.test(ov.caja.innerHTML));
  }
  {
    const M2 = ventanas().M;
    t.eq('la huella: programa, capítulo y lo que lleva cada talento', M2.dispFirma({ showId: 's1', capitulo: 'Ep 1', enCap: [{ talento: 'b', personajes: [{ display: 'X' }] }, { talento: 'A', personajes: [{ display: 'Y' }, { display: 'Z' }] }] }), 's1|Ep 1|A:Y,Z;B:X');
  }
};

/** Un navegador de mentira con ventanas emergentes. */
function ventanas(o){
  o = o || {};
  const V = { abiertas: [], intervalos: [], registros: [], cuerpo: [], pintadas: 0, parados: 0, enCap: [], ep: {} };
  const raiz = { id: 'dispRaiz', _h: '', ownerDocument: null, querySelector: () => null,
    set innerHTML(h){ this._h = h; if(/disp-cab/.test(h)) V.pintadas++; }, get innerHTML(){ return this._h; } };
  const doc = { escrito: '', escritos: 0, title: '', activeElement: null, abierto: false,
    open(){ this.abierto = true; }, write(h){ this.escrito += h; this.escritos++; }, close(){ this.abierto = false; },
    getElementById(id){ return (id === 'dispRaiz' && this.escritos) ? raiz : null; } };
  raiz.ownerDocument = doc;
  V.w = { closed: false, focos: 0, document: doc, focus(){ this.focos++; }, close(){ this.closed = true; } };
  V.raiz = raiz;
  const D = DC();
  const pagina = { activeElement: null, getElementById: () => null, body: { appendChild: (e) => V.cuerpo.push(e) },
    createElement: () => { const caja = { _h: '', ownerDocument: pagina, querySelector: () => null, set innerHTML(h){ this._h = h; }, get innerHTML(){ return this._h; } };
      return { id: '', className: '', caja: caja, _h: '', set innerHTML(h){ this._h = h; }, querySelector: (sel) => sel === '.modo-caja' ? caja : null, addEventListener(){}, remove(){} }; } };
  V.M = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DISPONIBILIDAD DE LOS TALENTOS', '/* ═══ FIN DE DISPONIBILIDAD DE LOS TALENTOS']],
    ['DISP', 'DISP_VENTANA', 'dispAbrir', 'dispFirma'],
    { castNorm: undefined, prodFichaTexto: PR.prodFichaTexto, esc: (x) => String(x), fallo: () => {},
      window: { open: (...a) => { V.abiertas.push(a); return o.bloqueada ? null : V.w; } }, document: pagina,
      setInterval: (f, ms) => { V.intervalos.push([f, ms]); return V.intervalos.length; }, clearInterval: () => { V.parados++; },
      currentEp: V.ep, sbShows: () => [{ id: 's1', name: 'AKKA' }, { id: 's2', name: 'DOFUS' }],
      csDatos: () => ({ datos: D }), dcastSerieDe: (sh, d) => d.series.find(x => PR.prodCasarPrograma(x.name, [sh]) === sh) || null,
      castOcupacion: () => V.enCap, castRegCargar: async (id) => { V.registros.push(id); return { personajes: {} }; },
      TAL: { nombres: [] } });
  return V;
}
const espera = () => new Promise(r => setTimeout(r, 0));
