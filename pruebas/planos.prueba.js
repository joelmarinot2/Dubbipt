/* Cambios de plano y cotejo con la voz.
 *
 * CAMBIOS DE PLANO. Lo que protege esta prueba son las dos formas de
 * equivocarse:
 *
 *  · inventar cortes donde solo hay una cámara movida, y
 *  · perderse los cortes de verdad porque el listón está demasiado alto.
 *
 * Se fabrican fotogramas con la física de los de verdad -ruido, textura que se
 * desplaza, cortes secos y un fundido de un segundo- y se pasan por la misma
 * función que usa la aplicación. Un fundido reparte el cambio entre muchos
 * fotogramas, así que NO debe salir como corte: eso es lo que más se comprueba.
 *
 * Ojo con lo que esta prueba NO cubre: la captura de fotogramas del vídeo real
 * (drawImage sobre el <video>). Eso solo se puede comprobar con una película
 * delante y una ventana que se esté pintando. Aquí se prueba la decisión, no
 * la lectura.
 *
 * COTEJO. Que el parecido entre lo escrito y lo que se oye respete el orden de
 * las palabras y no se despiste con tildes ni signos.
 */
'use strict';
const { montar, karNormReal } = require('./ayuda');

exports.nombre = 'Cambios de plano y cotejo';

exports.pruebas = function(t){
  const G = montar(
    [['/** Diferencia media entre dos fotogramas', 'async function cortesAnalizar'],
     ['function cortesDecidir(muestras){', '/** Coloca el vídeo en un instante'],
     ['/** Palabras normalizadas de un texto', '/** Transcribe la ventana de un cue']],
    ['cortesDif', 'cortesDecidir', 'cotPalabras', 'cotParecido'],
    { karNorm: karNormReal(), CORTES: { cancelar: false } }
  );

  /* 64 × 36 píxeles, tres canales: el mismo tamaño al que mira la aplicación */
  const N = 64 * 36 * 3;
  const plano = (r, v, a) => {
    const x = new Uint8Array(N);
    for(let i = 0; i < N; i += 3){ x[i] = r; x[i+1] = v; x[i+2] = a; }
    return x;
  };

  t.seccion('1 · la diferencia entre dos fotogramas');
  t.eq('un fotograma consigo mismo', G.cortesDif(plano(30, 60, 90), plano(30, 60, 90)), 0);
  t.cerca('negro contra blanco', G.cortesDif(plano(0, 0, 0), plano(255, 255, 255)), 1, 0.001);
  // Dos planos DISTINTOS con el MISMO brillo. En gris esto valdría 0,02 y el
  // corte se perdería; por eso la diferencia se mide canal a canal.
  t.cerca('mismo brillo, distinto color',
          G.cortesDif(plano(27, 58, 92), plano(92, 27, 27)), 0.21, 0.02);

  t.seccion('2 · cortes secos, un fundido y cámara movida');
  const muestras = (function(){
    // 0-2 s escena A · corte · B hasta 4 · corte · C hasta 5 ·
    // FUNDIDO de 5 a 6 hacia D · D hasta 7 · corte · A
    const col = [[27, 58, 92], [92, 27, 27], [27, 92, 42], [92, 82, 27]];
    const mez = (x, y, k) => x.map((v, i) => Math.round(v * (1 - k) + y[i] * k));
    const en = (s) => s < 2 ? col[0] : s < 4 ? col[1] : s < 5 ? col[2]
                    : s < 6 ? mez(col[2], col[3], s - 5) : s < 7 ? col[3] : col[0];
    const m = [];
    let previo = null;
    for(let s = 0; s < 9; s += 0.04){                 // 25 fotogramas por segundo
      const c = en(s);
      const f = new Uint8Array(N);
      for(let i = 0; i < N; i += 3){
        const ruido = ((i * 7 + Math.round(s * 250)) % 23) - 11;   // textura que se desplaza
        f[i]   = Math.max(0, Math.min(255, c[0] + ruido));
        f[i+1] = Math.max(0, Math.min(255, c[1] + ruido));
        f[i+2] = Math.max(0, Math.min(255, c[2] + ruido));
      }
      if(previo) m.push({ t: +s.toFixed(2), dif: G.cortesDif(previo, f) });
      previo = f;
    }
    return m;
  })();

  const d = G.cortesDecidir(muestras);
  console.log('    (mediana ' + d.mediana.toFixed(4) + ' · cortes ' + JSON.stringify(d.cortes) + ')');
  t.eq('encuentra tres cortes', d.cortes.length, 3);
  t.cerca('el primero, en 2 s', d.cortes[0] || 0, 2, 0.06);
  t.cerca('el segundo, en 4 s', d.cortes[1] || 0, 4, 0.06);
  t.cerca('el tercero, en 7 s', d.cortes[2] || 0, 7, 0.06);
  t.eq('el fundido NO es un corte',
       d.cortes.filter(c => c > 5.05 && c < 5.95).length, 0);

  t.seccion('3 · un plano fijo entero: ni un corte');
  const fijo = [];
  {
    let previo = plano(40, 40, 40);
    for(let s = 0; s < 5; s += 0.04){
      const f = new Uint8Array(N);
      for(let i = 0; i < N; i++) f[i] = 40 + ((i + Math.round(s * 100)) % 3);
      fijo.push({ t: +s.toFixed(2), dif: G.cortesDif(previo, f) });
      previo = f;
    }
  }
  t.eq('sin cortes donde no los hay', G.cortesDecidir(fijo).cortes.length, 0);
  t.eq('sin fotogramas, sin cortes', G.cortesDecidir([]).cortes.length, 0);

  /* Aquí está el caso que de verdad pone a prueba el listón.
   *
   * Una persecución a cámara en mano cambia MUCHO de un fotograma al
   * siguiente: por encima del suelo absoluto, todo el rato. Lo único que
   * impide inventarse cortes ahí es que se exija destacar VARIAS VECES sobre
   * el vecindario. Sin esa parte, esta escena se llenaría de cortes falsos.
   *
   * Los números salen de una sucesión fija, no de Math.random: una prueba que
   * unas veces pasa y otras no es peor que no tenerla. */
  t.seccion('4 · cámara en mano: movimiento fuerte, pero ni un corte');
  const azarFijo = (n) => {                       // ruido repetible entre 0 y 1
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const persecucion = [];
  for(let i = 0; i < 200; i++)
    persecucion.push({ t: +(i * 0.04).toFixed(2), dif: 0.10 + azarFijo(i) * 0.09 });
  const dPer = G.cortesDecidir(persecucion);
  console.log('    (movimiento entre 0,10 y 0,19 · cortes ' + JSON.stringify(dPer.cortes) + ')');
  t.eq('ni un corte inventado en la persecución', dPer.cortes.length, 0);

  /* Y el mismo caso con un corte de verdad metido dentro: tiene que salir. */
  const conCorte = persecucion.map(m => ({ t: m.t, dif: m.dif }));
  conCorte[120].dif = 0.62;                       // el salto de un corte seco
  const dCor = G.cortesDecidir(conCorte);
  t.eq('un corte dentro de la persecución sí se ve', dCor.cortes.length, 1);
  t.cerca('y en su sitio', dCor.cortes[0] || 0, 120 * 0.04, 0.01);

  /* Y el caso contrario, que vigila el suelo ABSOLUTO.
   *
   * Un plano quieto: la imagen apenas cambia. Si en medio hay un parpadeo -un
   * artefacto de compresión, una luz que oscila- ese fotograma destaca
   * muchísimo sobre su vecindario, veinte veces o más. En proporción parece un
   * corte; en valor absoluto es una nadería. Lo único que impide marcarlo es
   * exigir un cambio mínimo de verdad. */
  t.seccion('5 · un parpadeo en un plano quieto no es un corte');
  const quieto = [];
  for(let i = 0; i < 200; i++)
    quieto.push({ t: +(i * 0.04).toFixed(2), dif: 0.001 + azarFijo(i + 500) * 0.001 });
  quieto[100].dif = 0.02;                         // el parpadeo: 20 veces el vecindario
  const dQui = G.cortesDecidir(quieto);
  console.log('    (parpadeo de 0,02 sobre un fondo de 0,001 · cortes '
            + JSON.stringify(dQui.cortes) + ')');
  t.eq('el parpadeo no cuenta', dQui.cortes.length, 0);

  /* Pero un corte de verdad en ese mismo plano quieto sí tiene que salir. */
  const quietoCorte = quieto.map(m => ({ t: m.t, dif: m.dif }));
  quietoCorte[100].dif = 0.45;
  t.eq('un corte de verdad en el plano quieto sí', G.cortesDecidir(quietoCorte).cortes.length, 1);

  t.seccion('6 · el parecido entre lo escrito y lo que se oye');
  const p = (x) => G.cotPalabras(x);
  t.eq('idéntico', G.cotParecido(p('Esta es la casa de su madre'),
                                 p('esta es la casa de su madre')), 1);
  t.cerca('tildes y signos, indiferentes',
          G.cotParecido(p('¿Adónde vas, señor?'), p('adonde vas senor')), 1, 0.001);
  t.cerca('una palabra cambiada de siete',
          G.cotParecido(p('Esta es la casa de su madre'),
                        p('Esta es la casa de su padre')), 6 / 7, 0.02);
  t.ok('dos frases sin relación caen por debajo del aviso',
       G.cotParecido(p('Esta es la casa de su madre'), p('mañana vamos todos al puerto')) < 0.45);
  t.eq('contra nada, cero', G.cotParecido(p(''), p('hola')), 0);
  t.ok('el orden cuenta: las mismas palabras al revés no son la misma frase',
       G.cotParecido(p('uno dos tres cuatro cinco'), p('cinco cuatro tres dos uno')) < 1);
};
