/* ORIGINAL, X y TODOS no son talentos; y editar un talento · especificacion 09, PRO-53
 *
 * Pedido de sala: «el talento ORIGINAL, X, TODOS no es un talento: solo es
 * cuando un personaje no se graba o se deja original. Quiero que esas tres
 * las coloque cuando se esté haciendo casting, pero que no se le asigne como
 * un talento». Y: «que a los talentos, en el botón de editar, se le puedan
 * cambiar sus atributos como género, edad, tono». Lo que protege esta
 * prueba: que las marcas se reconocen, que se ofrecen al repartir (en las
 * tarjetas y en la lista), que no salen en Talentos, la ocupación ni la
 * disponibilidad, que no se crean ni se renombra a ellas como talento; y que
 * el lápiz abre un cuadro que guarda la ficha y, si cambia, el nombre.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Marcas de casting y editar talentos';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
const HTML = fs.readFileSync(INDEX, 'utf8');

const N = montar([['function castNorm(t){', 'async function castRegCargar(showId){'],
                  ['/* Casillas que se rellenan con algo que NO es un actor', '/** Carga por talento']], ['castNorm', 'castEsActor'], {});
const castNorm = N.castNorm;
const MC = montar([['/* ── ORIGINAL, X y TODOS no son talentos (PRO-53)', '/* ── Las cuentas (sin pantalla']], ['CS_MARCAS', 'csEsMarca'],
  { castNorm: castNorm, castEsActor: N.castEsActor });
const csEsMarca = MC.csEsMarca;
const csEsc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

exports.pruebas = async function(t){
  t.seccion('1 · qué es una marca');
  t.eq('ORIGINAL, X, TODOS y X ORIGINAL, como se escriban', ['ORIGINAL', 'x', ' Todos ', 'X ORIGINAL', 'original'].map(csEsMarca).join(','), 'true,true,true,true,true');
  t.eq('una persona no', ['ANA ROJAS', 'XIMENA', 'TODOSANTOS', 'MARCELA BORDA', ''].map(csEsMarca).join(','), 'false,false,false,false,false');
  t.eq('las tres, con lo que quieren decir', MC.CS_MARCAS.map(m => m[0]).join(','), 'ORIGINAL,X,TODOS');

  t.seccion('2 · no salen como talentos');
  {
    const F = montar([['function csFichasTalentosHacer', '/** La carga, por cuántos programas']], ['csFichasTalentosHacer'], { castNorm: castNorm, csEsMarca: csEsMarca });
    const d = { talents: [{ id: 1, name: 'ANA ROJAS' }, { id: 2, name: 'ORIGINAL' }, { id: 3, name: 'X' }] };
    const papeles = [{ personaje: 'ALLY', progClave: 's:1', programa: 'A', talento: 'ANA ROJAS', eps: [1], lineas: 10 },
                     { personaje: 'MULTITUD', progClave: 's:1', programa: 'A', talento: 'TODOS', eps: [1], lineas: 4 },
                     { personaje: 'GRITO', progClave: 's:1', programa: 'A', talento: 'original', eps: [2], lineas: 1 }];
    t.eq('en el directorio de Talentos, solo las personas', F.csFichasTalentosHacer(d, [], [], papeles).map(f => f.nombre).join(','), 'ANA ROJAS');
    t.ok('ni en la ocupación, ni en el resumen, ni en el reparto por talento, ni como fichas repetidas', /if\(!t \|\| !t\.name \|\| csEsMarca\(t\.name\)/.test(CV) && /out\.talentos = d\.talents\.filter\(t => t && t\.name && !csEsMarca\(t\.name\)\)/.test(CV)
      && /if\(!tr\.talento \|\| csEsMarca\(tr\.talento\)\) continue;/.test(CV) && /if\(k && !csEsMarca\(t\.name\)\) \(por\[k\]/.test(CV) && (CV.match(/if\(!pp\.talento \|\| csEsMarca\(pp\.talento\)\) continue;/g) || []).length === 2);
    const D = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DISPONIBILIDAD DE LOS TALENTOS', '/* ═══ FIN DE DISPONIBILIDAD DE LOS TALENTOS']],
      ['dispFilas'], { castNorm: undefined, csEsMarca: csEsMarca, prodFichaTexto: () => '', esc: csEsc, fallo: () => {} });
    const filas = D.dispFilas({ base: ['ANA ROJAS'], d: null, serie: null, registro: { personajes: { GRITO: { display: 'Grito', talent: 'ORIGINAL' }, ALLY: { display: 'Ally', talent: 'ANA ROJAS' } } }, enCap: [{ talento: 'X', personajes: [], ints: 3 }] });
    t.eq('ni en la disponibilidad', filas.map(f => f.nombre).join(','), 'ANA ROJAS');
    t.ok('ni en los talentos de Producción', /!\(typeof csEsMarca === 'function' && csEsMarca\(t\.name\)\)/.test(fs.readFileSync(path.join(RAIZ, 'js', 'produccion.js'), 'utf8')));
  }

  t.seccion('3 · se ponen al hacer el casting');
  {
    const L = montar([['function csListaTalentos(d){', '/**\n * La celda del talento']], ['csListaTalentos'], { castNorm: castNorm, csEsMarca: csEsMarca, csEsc: csEsc, CS_MARCAS: MC.CS_MARCAS });
    const dl = L.csListaTalentos({ talents: [{ name: 'ANA ROJAS' }, { name: 'ORIGINAL' }] });
    t.eq('en la lista, las personas y, al final, las tres marcas con lo que significan', dl,
      '<datalist id="csListaTalentos"><option value="ANA ROJAS"><option value="ORIGINAL">Se deja el audio original</option><option value="X">No se graba</option><option value="TODOS">Lo graban todos</option></datalist>');
    t.ok('en la tarjeta del casting, ORIGINAL, X y TODOS a un clic, sin perder el foco', /\[\['ORIGINAL','Se deja el audio original'\],\['X','No se graba'\],\['TODOS','Lo graban todos'\]\]\.forEach/.test(HTML)
      && /b\.addEventListener\('mousedown', ev=> ev\.preventDefault\(\)\)/.test(HTML) && /inp\.value = m\[0\]; save\(true\);/.test(HTML) && /\.card \.ctal-marca\{/.test(HTML));
    t.ok('y la tarjeta dice que no es un talento', /c\.noRec \? '<small class="ctal-nomarca"/.test(HTML));
    t.ok('en la tabla de Casting, junto a la casilla, qué quiere decir', /\+ csNotaMarca\(f\.dc \|\| f\.dubbipt \|\| f\.talento\);/.test(CV));
    t.ok('«Añadir talento» y renombrar no dejan crear una marca como talento', /if\(csEsMarca\(nombre\)\)\{ castAviso\('«' \+ nombre \+ '» no es un talento: es una marca de producción\. Se pone al hacer el casting'\); return; \}/.test(CV)
      && /if\(csEsMarca\(nuevo\)\)\{ castAviso/.test(CV));
  }

  t.seccion('4 · editar un talento: género, edad y tono');
  {
    const armar = (talentos) => {
      const D = { avisos: [], cambios: [], renombres: [], datos: { talents: talentos } };
      D.M = montar([['/* ── Editar un talento: nombre, género, edad y tono (PRO-53)', '/* ── Buscar y fusionar talentos (PRO-52)']], ['csHtmlEditorTalento', 'csGuardarTalento'],
        { castNorm: castNorm, csEsMarca: csEsMarca, csEsc: csEsc, csIco: (n) => '<svg data-i="' + n + '"></svg>',
          CS_OP_GENERO: [['', '—'], ['masculino', 'Masculino'], ['femenino', 'Femenino']], CS_OP_EDAD: [['', '—'], ['adulto', 'Adulto'], ['mayor', 'Mayor']], CS_OP_TONO: [['', '—'], ['grave', 'Grave'], ['agudo', 'Agudo']],
          PROD_ET: { genero: { femenino: 'Femenino' }, edad: { mayor: 'Mayor' }, tono: { agudo: 'Agudo' } },
          castAviso: (m) => D.avisos.push(m), dcxNombreTalento: (n) => String(n).toUpperCase().replace(/\s+/g, ' ').trim(),
          dcxTalento: (pl, id, c) => { const x = pl.talents.find(y => y.id === id); Object.assign(x, c); return true; },
          dcxTalentoNuevo: (pl, f) => { pl.talents.push(Object.assign({ id: 9 }, f, { name: String(f.name).toUpperCase() })); return true; },
          csEditar: async (cambio, que) => { const r = cambio(D.datos); D.cambios.push(que); return r ? 'guardado' : 'igual'; },
          csActual: () => ({ datos: D.datos }),
          csRenombrarTalento: async (tt, n) => { D.renombres.push(tt.name + '>' + n); return 'guardado'; } });
      return D;
    };
    const A = armar([{ id: 1, name: 'ANA ROJAS', genero: 'femenino', edad_aparente: 'adulto' }]);
    const f = { clave: 'ANA ROJAS', nombre: 'ANA ROJAS', t: A.datos.talents[0] };
    const html = A.M.csHtmlEditorTalento(f);
    t.ok('el cuadro: nombre, género, edad, tono, registro y correo, con lo que tiene', /id="csTeNombre" value="ANA ROJAS"/.test(html) && /<select id="csTeGenero">[\s\S]*?<option value="femenino" selected>/.test(html)
      && /<select id="csTeEdad">[\s\S]*?<option value="adulto" selected>/.test(html) && /<select id="csTeTono">/.test(html) && /id="csTeRegistro"/.test(html) && /id="csTeCorreo"/.test(html)
      && /data-cs="talEdGuardar" data-v="ANA ROJAS"/.test(html) && /data-cs="talEdCerrar"/.test(html));
    t.eq('guardar cambia solo lo que cambió, y se apunta con sus nombres', (await A.M.csGuardarTalento(f, { name: 'ANA ROJAS', genero: 'femenino', edad_aparente: 'mayor', tono_de_voz: 'agudo', registro: '', email: '' }))
      + ' ' + A.datos.talents[0].edad_aparente + ' ' + A.datos.talents[0].tono_de_voz + ' · ' + A.cambios.join(' | ') + ' · ' + A.renombres.length, 'guardado mayor agudo · Ficha de ANA ROJAS: edad = Mayor, tono = Agudo · 0');
    t.eq('sin cambios, igual', await A.M.csGuardarTalento(f, { name: 'ana rojas', genero: 'femenino', edad_aparente: 'mayor', tono_de_voz: 'agudo' }), 'igual');
    t.eq('con otro nombre, también se renombra por el camino de siempre', (await A.M.csGuardarTalento(f, { name: 'Ana Rojas Vega', genero: 'femenino', edad_aparente: 'mayor', tono_de_voz: 'agudo' })) + ' ' + A.renombres.join(','), 'guardado ANA ROJAS>Ana Rojas Vega');
    t.eq('ni vacío ni una marca', (await A.M.csGuardarTalento(f, { name: '  ' })) + ' ' + (await A.M.csGuardarTalento(f, { name: 'Original' })) + ' ' + A.avisos.length, 'error error 2');
    const B = armar([]);
    const g = { clave: 'CARMEN FRANCO', nombre: 'Carmen Franco', t: null };
    t.ok('sin ficha, el cuadro avisa de que se le crea', /al guardar se le crea/.test(B.M.csHtmlEditorTalento(g)));
    t.eq('y al guardar se le crea, con lo elegido', (await B.M.csGuardarTalento(g, { name: 'Carmen Franco', genero: 'femenino', edad_aparente: 'mayor', tono_de_voz: '' }))
      + ' ' + JSON.stringify(B.datos.talents) + ' · ' + B.cambios[0], 'guardado [{"id":9,"name":"CARMEN FRANCO","genero":"femenino","edad_aparente":"mayor"}] · Ficha de talento creada: CARMEN FRANCO');
    t.ok('el lápiz de cada tarjeta y el de la ficha abren el cuadro', /cs-tcard-ren" data-cs="talEditar"/.test(CV) && /cs-tficha-ren" data-cs="talEditar"/.test(CV)
      && /que === 'talEditar'/.test(CV) && /que === 'talEdGuardar'/.test(CV) && /que === 'talEdCerrar'/.test(CV) && /const editor = CS\.talEditar \? csHtmlEditorTalento/.test(CV));
    t.ok('con sus estilos', /\.cs-tal-modal\{/.test(HTML) && /\.cs-tal-modal-c\{/.test(HTML));
  }
};
