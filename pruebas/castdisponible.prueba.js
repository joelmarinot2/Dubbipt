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
};
