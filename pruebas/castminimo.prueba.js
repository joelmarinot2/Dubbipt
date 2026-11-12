/* Con cuántos talentos se puede hacer el capítulo · especificacion 02, CAST-50
 *
 * Pedido de sala: «quiero que me sugieras en cada episodio de casting con
 * cuántos talentos puedo rellenar todo el capítulo».
 *
 * Lo que protege esta prueba: que el número es de verdad el mínimo (se compara
 * con la cuenta a lo bruto en cientos de capítulos inventados) y que el
 * reparto que propone no tiene ni un choque; que «choque» es exactamente lo
 * de CAST-49 (si la sugerencia dice que dos van juntos, Casting no los pinta
 * en rojo); que con lo ya repartido dice si los que faltan caben o cuántos
 * talentos más hacen falta, sin mover a nadie; que TODOS, ORIGINAL y los que
 * no se graban no cuentan; y que un capítulo grande no congela la pantalla.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { INDEX, montar } = require('./ayuda');
const CHQ = require('../js/castchoques.js');

exports.nombre = 'Con cuántos talentos se puede hacer el capítulo';

const RAIZ = path.dirname(INDEX);
/* El módulo usa chqCruce de js/castchoques.js, como en la aplicación (mismo ámbito global). */
Object.assign(global, CHQ);
const M = require('../js/castminimo.js');

/** Números al azar, pero siempre los mismos (la prueba no puede fallar un día sí y otro no). */
function azar(semilla){ let x = semilla >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
/** El mínimo a lo bruto. */
function aLoBruto(g){
  const n = g.nodos.length;
  for(let k = 1; k <= n; k++){
    const c = new Array(n).fill(-1);
    const va = (i) => { if(i === n) return true; for(let x = 0; x < k; x++){ if([...g.ady[i]].some(j => c[j] === x)) continue; c[i] = x; if(va(i + 1)) return true; c[i] = -1; } return false; };
    if(va(0)) return k;
  }
  return 0;
}
const sinChoques = (g, grupos) => {
  const de = new Map(); grupos.forEach((gr, i) => gr.personajes.forEach(p => de.set(p.key, i)));
  return g.nodos.every((p, a) => [...g.ady[a]].every(b => de.get(p.key) !== de.get(g.nodos[b].key)));
};
/** Un libreto: cada intervención es [personaje, timecode en segundos o null, página]. */
function libreto(filas){
  const script = [], porClave = {};
  filas.forEach((f, i) => { script.push({ idx: i, key: f[0], display: f[0], tcSec: f[1], page: f[2], lines: ['…'] }); (porClave[f[0]] = porClave[f[0]] || []).push(i); });
  return CHQ.chqContexto(script, porClave);
}
const P = (ks, tal) => ks.map(k => ({ key: k, display: k, ints: 1, talento: (tal && tal[k]) || '' }));

exports.pruebas = function(t){
  t.seccion('1 · es el mínimo de verdad, y sin un choque');
  {
    const rnd = azar(2026);
    let mal = [], probados = 0;
    for(let caso = 0; caso < 300; caso++){
      const n = 2 + Math.floor(rnd() * 8), dens = rnd();
      const g = { nodos: Array.from({ length: n }, (x, i) => ({ key: 'P' + i, display: 'P' + i, ints: Math.floor(rnd() * 30), talento: '', idxs: [1] })), ady: Array.from({ length: n }, () => new Set()) };
      for(let a = 0; a < n; a++) for(let b = a + 1; b < n; b++) if(rnd() < dens){ g.ady[a].add(b); g.ady[b].add(a); }
      const r = M.cmSugerir(null, null, { grafo: g }), bruto = aLoBruto(g);
      if(r.exacto) probados++;
      if(r.minimo < bruto || (r.exacto && r.minimo !== bruto) || r.cota > bruto || r.grupos.length !== r.minimo || !sinChoques(g, r.grupos)) mal.push(caso + ': ' + r.minimo + ' vs ' + bruto);
    }
    t.eq('300 capítulos inventados: el número es el mínimo y el reparto no tiene choques', mal.length, 0, mal.slice(0, 3).join(' · '));
    t.eq('y en todos lo da por probado', probados, 300);
  }

  t.seccion('2 · con un libreto: lo que choca es lo de CAST-49');
  {
    /* 01:00:00 A · 01:00:10 B · 01:02:00 C · 01:08:00 D · 01:08:10 E · 01:20:00 F, con otros hablando entre medias. */
    const otros = (n, t0, paso, pag) => Array.from({ length: n }, (x, i) => ['OTRO', t0 + i * paso, pag]);
    const filas = [['A', 3600, 1], ['B', 3610, 1]].concat(otros(5, 3620, 20, 2), [['C', 3720, 3]], otros(6, 3780, 50, 3), [['D', 4080, 5], ['E', 4090, 5]],
                   otros(6, 4200, 100, 6), [['F', 4800, 7]]);
    const ctx = libreto(filas);
    const ps = P(['A', 'B', 'C', 'D', 'E', 'F']);
    const g = M.cmGrafo(ps, ctx);
    const pares = []; g.ady.forEach((s, a) => s.forEach(b => { if(a < b) pares.push(g.nodos[a].key + g.nodos[b].key); }));
    t.eq('chocan A-B (seguidos), A-C y B-C (a 2 min), D-E (seguidos); C y D, a 6 min, no; F, lejos de todos', pares.join(' '), 'AB AC BC DE');
    t.ok('cada pareja que choca es la misma que Casting pintaría en rojo si las hiciera un talento', ps.every((a, i) => ps.every((b, j) => i >= j
         || (CHQ.chqDeTalento([a, b], ctx).length > 0) === g.ady[i].has(j))));
    const r = M.cmSugerir(ps, ctx);
    t.eq('con 3 talentos: A, B y C chocan todos entre sí', [r.minimo, r.exacto, r.cota, r.juntos.slice().sort().join('')].join(' '), '3 true 3 ABC');
    t.eq('la frase', M.cmFrase(r), 'Con 3 talentos se puede hacer todo el capítulo sin choques');
    t.eq('y por qué no con menos', M.cmPorQue(Object.assign({}, r, { juntos: r.juntos.slice().sort() })), 'No se puede con menos: «A», «B», «C» chocan todos entre sí');
    t.ok('el reparto propuesto no choca', sinChoques(g, r.grupos) && r.grupos.every(gr => gr.personajes.every((a, i) => gr.personajes.every((b, j) => i >= j || !CHQ.chqDeTalento([a, b], ctx).length))));
    t.eq('quien no sale en el libreto puede ir con cualquiera: no sube la cuenta', M.cmSugerir(ps.concat(P(['MUDO'])), ctx).minimo, 3);
    t.eq('un capítulo sin choques: un solo talento', M.cmSugerir(P(['A', 'F']), ctx).minimo, 1);
  }

  t.seccion('3 · con lo ya repartido');
  {
    /* A, B y C hablan seguidos; mucho después, D y E también; F, al final. Entre medias, otros (que no cuentan). */
    const otros = (n, t0, pag) => Array.from({ length: n }, (x, i) => ['OTRO', t0 + i * 60, pag]);
    const ctx = libreto([['A', 3600, 1], ['B', 3610, 1], ['C', 3620, 1]].concat(otros(6, 3700, 2), [['D', 5000, 5], ['E', 5010, 5]], otros(6, 5100, 6), [['F', 9000, 9]]));
    let r = M.cmSugerir(P(['A', 'B', 'C', 'D', 'E', 'F'], { A: 'Ana Ochoa', B: 'Juan Perez' }), ctx);
    t.eq('cuántos talentos hay puestos, y cuántos personajes faltan', r.ahora + ' ' + r.sinTalento, '2 4');
    const dePropuesta = (p) => p.talento || 'nuevo ' + p.nuevo;
    t.eq('C choca con los dos (hablan seguidos): hace falta UN talento nuevo, y C va en él', r.conLoRepartido.nuevos + ' · C→' + dePropuesta(r.conLoRepartido.propuestas.find(p => p.key === 'C')), '1 · C→nuevo 1');
    t.ok('el reparto que propone, con lo que ya estaba, no tiene ni un choque', (() => {
      const grupo = {}; [['A', 'Ana Ochoa'], ['B', 'Juan Perez']].concat(r.conLoRepartido.propuestas.map(p => [p.key, dePropuesta(p)])).forEach(([k, g]) => (grupo[g] = grupo[g] || []).push(k));
      return Object.values(grupo).every(ks => !CHQ.chqDeTalento(P(ks), ctx).length);
    })(), JSON.stringify(r.conLoRepartido.propuestas));
    t.ok('reparte la carga: no le pone todo al mismo', new Set(r.conLoRepartido.propuestas.map(dePropuesta)).size >= 2);
    t.eq('la frase, si hacen falta más', M.cmFraseFaltan(r), 'Con lo ya repartido, 4 personajes sin talento: hacen falta 1 talento más');
    r = M.cmSugerir(P(['A', 'D', 'F'], { A: 'Ana Ochoa' }), ctx);
    t.eq('y si caben', M.cmFraseFaltan(r), 'Con lo ya repartido, 2 personajes sin talento: caben en los talentos que ya tienes, sin choques');
    t.eq('el mismo talento escrito distinto es el mismo', M.cmSugerir(P(['A', 'D'], { A: 'Ana Ochoa', D: 'ANA OCHOA' }), ctx).ahora, 1);
    t.eq('lo ya repartido no se mueve: si dos ya chocan, se cuenta igual (eso lo pinta CAST-49)', M.cmSugerir(P(['A', 'B', 'D'], { A: 'Ana Ochoa', B: 'Ana Ochoa' }), ctx).conLoRepartido.propuestas.map(p => p.key + '→' + p.talento).join(), 'D→Ana Ochoa');
    t.eq('sin nada repartido no hay frase de «lo ya repartido»', M.cmFraseFaltan(M.cmSugerir(P(['A', 'B']), ctx)), '');
  }

  t.seccion('4 · un capítulo grande no congela la pantalla');
  {
    /* 80 personajes, 900 intervenciones, una cada 6 s. */
    const rnd = azar(415), filas = [];
    for(let i = 0; i < 900; i++) filas.push(['P' + Math.floor(Math.pow(rnd(), 1.8) * 80), 3600 + i * 6, 1 + Math.floor(i / 25)]);
    const ctx = libreto(filas), ps = P([...new Set(filas.map(f => f[0]))]);
    const t0 = Date.now(), r = M.cmSugerir(ps, ctx), ms = Date.now() - t0;
    t.ok('80 personajes y 900 intervenciones, en menos de 1,5 s', ms < 1500, ms + ' ms');
    t.ok('con un reparto sin choques', r.grupos.length === r.minimo && r.minimo >= r.cota && r.grupos.every(gr => gr.personajes.every((a, i) => gr.personajes.every((b, j) => i >= j || !CHQ.chqDeTalento([a, b], ctx).length))), r.minimo + ' / ' + r.cota);
    t.eq('si no da tiempo a probar que es el mínimo, se dice «unos»', M.cmFrase({ personajes: 9, minimo: 9, exacto: false }), 'Con unos 9 talentos se puede hacer todo el capítulo sin choques');
    t.eq('y entonces no se afirma por qué no con menos', M.cmPorQue({ exacto: false, juntos: ['A', 'B'], minimo: 2 }), '');
  }

  t.seccion('5 · en la aplicación');
  {
    const ctx = libreto([['MARLON', 3600, 1], ['SHAWN', 3610, 1], ['GRUPO', 3615, 1], ['POPS', 3620, 1], ['TELE', 3625, 1], ['DEE', 9000, 9]]);
    const chars = [
      { key: 'MARLON', display: 'MARLON', talent: 'Juan Perez', totalInts: 30 }, { key: 'SHAWN', display: 'SHAWN', talent: '', totalInts: 20 },
      { key: 'GRUPO', display: 'GRUPO', talent: 'TODOS', totalInts: 9 }, { key: 'POPS', display: 'POPS', talent: '', totalInts: 12 },
      { key: 'TELE', display: 'TELE', talent: 'ORIGINAL', totalInts: 3 }, { key: 'DEE', display: 'DEE', talent: '', totalInts: 8 },
      { key: 'NOREC', display: 'NOREC', talent: '', totalInts: 4, noRec: true }, { key: 'FANTASMA', display: 'FANTASMA', talent: '', totalInts: 0 }];
    const fallos = [];
    const A = montar([['let ocuMinAbierto = true;', '/* ═══ REGISTRO DE CASTING DEL PROGRAMA'], ['function castNorm(t){', '/** El número final'], ['const OCU_NO_ACTOR', '/** Carga por talento']],
      ['castMinimo', 'castMinimoHtml', 'castMinimoLinea', 'verMemo: () => _cmMemo'],
      Object.assign({ chars, script: ctx.script, scriptByKey: ctx.porClave, esc: (s) => String(s).replace(/</g, '&lt;'), fallo: (...x) => fallos.push(x) }, CHQ, M));
    const r = A.castMinimo();
    t.eq('cuenta los que necesitan un actor: ni TODOS, ni ORIGINAL, ni los que no se graban, ni los que no hablan', r.personajes + ' · ' + A.verMemo().grafo.nodos.map(n => n.key).join(','), '4 · MARLON,SHAWN,POPS,DEE');
    t.eq('MARLON, SHAWN y POPS hablan seguidos: 3 talentos', r.minimo + ' ' + r.exacto, '3 true');
    const html = A.castMinimoHtml();
    t.ok('el recuadro: la frase, cuántos usas ahora, por qué no con menos y lo de los que faltan', html.includes('<b>Con 3 talentos se puede hacer todo el capítulo sin choques</b> · ahora usas 1')
         && html.includes('No se puede con menos') && html.includes('Con lo ya repartido, 3 personajes sin talento: hacen falta 2 talentos más'), html.slice(0, 600));
    t.ok('y cómo repartirlo, con cada personaje y sus líneas', /<summary>Cómo repartirlo<\/summary>/.test(html) && /DEE <i>8<\/i> <span class="cg"[^]*?<\/span> → <b>Juan Perez<\/b>/.test(html) && /<ol><li>/.test(html) && /el tipo de voz lo decides tú/.test(html));
    const memo = A.verMemo();
    chars[1].talent = 'Ana Ochoa';
    const r2 = A.castMinimo();
    t.ok('asignar un talento no rehace lo caro (qué parejas chocarían), pero sí la sugerencia', A.verMemo() === memo && r2.ahora === 2 && r2.sinTalento === 2);
    ctx.script[5].tcSec = 3630;
    A.castMinimo();
    t.ok('si cambia un timecode del libreto, se rehace', A.verMemo() !== memo && A.castMinimo().minimo === 4);
    t.eq('la línea del panel del libreto', A.castMinimoLinea(), '<br><span class="locu-min">Con 4 talentos se puede hacer todo el capítulo sin choques · ahora usas 2</span>');
    t.eq('sin fallos', fallos.length, 0);
  }
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('sale en su propia pestaña, «Sugerencias», junto a la de Ocupación, con el número de talentos encima (pedido: «en otra pestaña»)',
       /pest\('sugerencias', 'Sugerencias', \(rMin && rMin\.personajes >= 2\) \? rMin\.minimo : 0/.test(HTML) && /const cuerpo = castMinimoHtml\(rMin\);/.test(HTML)
       && (HTML.match(/castMinimoHtml\(/g) || []).length === 2);
  t.ok('pulsar una pestaña la abre; pulsar la que ya está abierta, pliega; y se recuerda cuál era', /if\(ocuAbierto && ocuVista === v\)\{ alternar\(\); return; \}/.test(HTML) && /localStorage\.setItem\('ddl_ocu_vista', v\)/.test(HTML));
  t.ok('el desplegable no se cierra al repintar', /det\.addEventListener\('toggle', \(\)=>\{ ocuMinAbierto = det\.open; \}\);/.test(HTML));
  t.ok('el panel de Ocupación del libreto, en una línea', /\+ castMinimoLinea\(\)\n    \+ '<\/div>';/.test(HTML));
  t.ok('el módulo se carga después de los choques y queda para usar sin conexión', /<script src="\.\/js\/castchoques\.js"><\/script>\n<script src="\.\/js\/castminimo\.js"><\/script>/.test(HTML) && /'\.\/js\/castminimo\.js'/.test(SW));
};
