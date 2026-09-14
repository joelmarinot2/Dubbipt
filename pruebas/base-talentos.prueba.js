/* La base de talentos · especificacion 02
 *
 * El campo de talento era texto libre. Una errata -MARCELA BORDA contra
 * MARCELA BORDAS- partia a un actor en dos por toda la ocupacion, los choques
 * y el registro del programa, y no habia forma de enterarse: las dos cosas
 * parecian un actor con su carga.
 *
 * Ahora solo se admite lo que esta en la base. Lo que se prueba aqui es que la
 * puerta cierra Y que no cierra de mas:
 *
 *  · ORIGINAL, TODOS y X tienen que pasar SIEMPRE. No son actores, son marcas
 *    de produccion, y sin ellas no se puede trabajar.
 *  · Sin base cargada NO se restringe nada. Una aplicacion que se bloquea
 *    porque nadie ha importado un Excel todavia es peor que el problema.
 *  · MAID 1 y MAID 2 siguen siendo distintos.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Base de talentos: solo se reparte a quien está registrado';

const RECORTES = [
  ['function castNorm(t){', '/** El número final, si lo hay'],
  ['function castSimil(a, b){', '/* ── El registro, guardado por programa'],
  ['const TAL = {', '/* ── La lista de sugerencias'],
  /* Solo `talAnadir`: lo de despues es la ventana de confirmacion, que es UI. */
  ['/* ── Crear un talento', 'async function talCrearPreguntando']
];
const EXPORTA = ['TAL', 'TAL_MARCAS', 'talEsMarca', 'talHayBase', 'talPoner', 'talValidar',
                 'talCerca', 'talSugerencias', 'talSiempreX', 'talMarcarSiempreX',
                 'talLeerXlsx', 'talAnadir', 'castNorm'];

/** Monta el modulo. `chars` son los personajes que ve `talMarcarSiempreX`. */
function correr(opts){
  opts = opts || {};
  const charIdx = opts.charIdx || {};
  const win = { _charsRaw: opts.charsRaw || [] };
  const avisos = [];
  return montar(RECORTES, EXPORTA, {
    charIdx: charIdx,
    window: win,
    document: { getElementById: () => null, createElement: () => ({ style:{}, appendChild(){} }),
                body: { appendChild(){} } },
    LDB: { showId: null },
    sb: { storage: { from: () => ({ upload: async () => ({}), download: async () => ({}) }) } },
    idbGet: async () => null,
    idbSet: async () => {},
    NO_REC: new Set(['ORIGINAL','TODOS','X','N/A','NA']),
    norm: (s) => String(s || '').toUpperCase(),
    fflate: opts.fflate || undefined,
    fallo: (d, e) => avisos.push(d + ': ' + (e && e.message)),
    esc: (s) => String(s),
    console: { warn: () => {}, log: () => {} },
    _avisos: avisos
  });
}

/* Los nombres de la base real de la empresa que mas dan guerra. */
const BASE = ['MARCELA BORDA', 'HARI MORENO', 'CATALINA PLATA', 'ANDRES MARIÑO',
              'CARLOS NUÑEZ', 'ANA M OCHOA', 'JUANA ROJAS'];

exports.pruebas = function(t){
  const M = correr();
  M.talPoner(BASE, 'base.xlsx');

  t.seccion('1 · quien está en la base, pasa');
  for(const n of ['MARCELA BORDA', 'HARI MORENO', 'ANA M OCHOA'])
    t.eq(n, M.talValidar(n).ok, true);
  t.eq('y se guarda como está escrito en la base',
       M.talValidar('marcela borda').nombre, 'MARCELA BORDA',
       'si se guardara lo tecleado, «marcela borda» sería un actor distinto');
  t.eq('una tilde de más tampoco crea un actor nuevo',
       M.talValidar('ANDRES MARIÑO').nombre, 'ANDRES MARIÑO');

  t.seccion('2 · quien NO está, no pasa');
  const mal = M.talValidar('MARCELA BORDAS');
  t.eq('«MARCELA BORDAS» se rechaza', mal.ok, false,
       'es la errata que partía a un actor en dos por toda la ocupación');
  t.ok('y se ofrece el de verdad', (mal.cerca || []).includes('MARCELA BORDA'),
       'rechazar sin decir cuál era es dejar el problema a medias');
  t.eq('un nombre inventado también se rechaza', M.talValidar('PEPITO PEREZ').ok, false);

  t.seccion('3 · las marcas de producción pasan SIEMPRE');
  for(const m of ['ORIGINAL', 'TODOS', 'X', 'original', 'X ORIGINAL']){
    const v = M.talValidar(m);
    t.eq('«' + m + '» se admite', v.ok, true,
         'sin esto no se puede marcar un personaje que no se dobla');
    t.eq('y no cuenta como actor', v.tipo, 'marca');
  }
  t.eq('vacío también se admite (es borrar el talento)', M.talValidar('').ok, true);

  t.seccion('4 · sin base, no se restringe nada');
  const V = correr();
  t.eq('la base está vacía', V.talHayBase(), false);
  t.eq('y cualquier nombre pasa', V.talValidar('QUIEN SEA').ok, true,
       'bloquear a quien todavía no ha importado el Excel es peor que el problema');
  t.eq('sin inventarse nada: se guarda lo escrito', V.talValidar('QUIEN SEA').nombre, 'QUIEN SEA');

  t.seccion('5 · la base se limpia al entrar');
  const L = correr();
  const n = L.talPoner(['  ANA  ROJAS ', 'ANA ROJAS', 'ORIGINAL', 'TODOS', 'X', '', null, 'BETO SUR'],
                       'x.xlsx');
  t.eq('dos escrituras del mismo nombre son UNA', n, 2);
  t.eq('los espacios de más se colapsan', L.TAL.nombres[0], 'ANA ROJAS');
  t.ok('las marcas de producción NO entran en la base',
       !L.TAL.nombres.some(x => ['ORIGINAL','TODOS','X'].includes(x)),
       'dentro de la base contarían como un actor con carga en la ocupación');
  t.eq('y quedan por orden', L.TAL.nombres, ['ANA ROJAS', 'BETO SUR']);

  t.seccion('6 · los que nunca se doblan van con X');
  t.eq('PRINCIPAL PHOTOGRAPHY', M.talSiempreX('PRINCIPAL PHOTOGRAPHY'), true);
  t.eq('MAIN TITLE', M.talSiempreX('MAIN TITLE'), true);
  t.eq('BURNEDIN SUBS', M.talSiempreX('BURNEDIN SUBS'), true);
  t.eq('y escrito de otra manera también', M.talSiempreX('Burned-In Subs'), true);
  t.eq('un personaje de verdad NO', M.talSiempreX('MARLON'), false);
  t.eq('ni uno que se le parezca', M.talSiempreX('MAIN TITLE SEQUENCE'), false);

  t.seccion('7 · marcar con X no pisa lo que escribió una persona');
  const chars = {
    'PRINCIPAL PHOTOGRAPHY': { display:'PRINCIPAL PHOTOGRAPHY', talent:'' },
    'MAIN TITLE':            { display:'MAIN TITLE', talent:'' },
    'BURNEDIN SUBS':         { display:'BURNEDIN SUBS', talent:'HARI MORENO' },
    'MARLON':                { display:'MARLON', talent:'' }
  };
  const X = correr({ charIdx: chars, charsRaw: Object.keys(chars).map(k => ({ key:k })) });
  const puestos = X.talMarcarSiempreX();
  t.eq('se marcan los dos que estaban vacíos', puestos.sort(),
       ['MAIN TITLE', 'PRINCIPAL PHOTOGRAPHY']);
  t.eq('PRINCIPAL PHOTOGRAPHY queda en X', chars['PRINCIPAL PHOTOGRAPHY'].talent, 'X');
  t.eq('y no cuenta como grabado', chars['PRINCIPAL PHOTOGRAPHY'].noRec, true);
  t.eq('CAST-N1 · lo que había escrito no se toca', chars['BURNEDIN SUBS'].talent, 'HARI MORENO',
       'ni siquiera para poner una X: lo de una persona manda siempre');
  t.eq('un personaje normal sigue sin talento', chars['MARLON'].talent, '');
  t.eq('llamarlo dos veces no marca nada nuevo', X.talMarcarSiempreX().length, 0);

  t.seccion('8 · la lista de sugerencias lleva las marcas');
  const sug = M.talSugerencias();
  for(const m of ['ORIGINAL', 'TODOS', 'X'])
    t.ok('«' + m + '» se puede elegir de la lista', sug.includes(m));
  t.ok('y los actores también', sug.includes('HARI MORENO'));

  t.seccion('9 · leer el Excel de la empresa');
  /* El ZIP se sustituye por uno de mentira: lo que se prueba es la lectura del
     XML de Excel, que es donde estan las trampas -el texto de verdad vive en la
     tabla de cadenas compartidas y el <v> es un INDICE-. */
  const hoja = '<worksheet><sheetData>'
    + '<row r="1"><c r="A1" t="s"><v>0</v></c></row>'
    + '<row r="2"><c r="A2" t="s"><v>1</v></c></row>'
    + '<row r="3"><c r="A3" t="s"><v>2</v></c></row>'
    + '<row r="4"><c r="A4" t="inlineStr"><is><t>ZOE MENDEZ</t></is></c></row>'
    + '</sheetData></worksheet>';
  const cadenas = '<sst>'
    + '<si><t>Nombre</t></si>'
    + '<si><t>ABRIL ARDILA</t></si>'
    + '<si><t>ANDRES MARI</t><t>ÑO</t></si>'      // Excel parte el texto con formato
    + '</sst>';
  const zipFalso = {
    unzipSync: () => ({
      'xl/worksheets/sheet1.xml': new TextEncoder().encode(hoja),
      'xl/sharedStrings.xml': new TextEncoder().encode(cadenas)
    })
  };
  const E = correr({ fflate: zipFalso });
  const leidos = E.talLeerXlsx(new ArrayBuffer(8));
  t.eq('la cabecera «Nombre» no es un talento', leidos.includes('Nombre'), false);
  t.eq('salen los tres nombres', leidos, ['ABRIL ARDILA', 'ANDRES MARIÑO', 'ZOE MENDEZ']);
  t.eq('un nombre partido en dos trozos se junta', leidos[1], 'ANDRES MARIÑO',
       'Excel parte el texto cuando lleva formato dentro de la misma celda');

  t.seccion('10 · crear un talento');
  const C2 = correr();
  C2.talPoner(['MARCELA BORDA', 'HARI MORENO'], 'x.xlsx');

  const r1 = C2.talAnadir('BETO SUR');
  t.eq('entra en la base', r1.ok, true);
  t.eq('con su nombre', r1.nombre, 'BETO SUR');
  t.eq('y es nuevo', r1.yaEstaba, false);
  t.eq('ahora son tres', C2.TAL.nombres.length, 3);
  t.eq('y se admite al repartir', C2.talValidar('BETO SUR').ok, true,
       'crearlo sin poder usarlo no sirve de nada');
  t.eq('la lista queda ordenada', C2.TAL.nombres,
       ['BETO SUR', 'HARI MORENO', 'MARCELA BORDA']);

  t.seccion('11 · crear el mismo dos veces NO lo duplica');
  const r2 = C2.talAnadir('marcela borda');
  t.eq('se reconoce que ya estaba', r2.yaEstaba, true);
  t.eq('y devuelve el que ya habia', r2.nombre, 'MARCELA BORDA',
       'si entrara otra vez tendriamos dos MARCELAS, que es justo lo que la base evita');
  t.eq('siguen siendo tres', C2.TAL.nombres.length, 3);
  t.eq('una tilde de mas tampoco duplica', C2.talAnadir('HARI MORENO').yaEstaba, true);

  t.seccion('12 · lo que NO se puede crear');
  for(const m of ['ORIGINAL', 'TODOS', 'X']){
    const r = C2.talAnadir(m);
    t.eq('«' + m + '» no entra en la base', r.ok, false,
         'dentro contaria como un actor con carga en la ocupacion');
  }
  t.eq('una letra suelta, no', C2.talAnadir('A').ok, false);
  t.eq('vacio, no', C2.talAnadir('   ').ok, false);
  t.eq('solo numeros, no', C2.talAnadir('12345').ok, false,
       'un numero no es el nombre de nadie');
  t.eq('y la base no ha crecido con ninguno', C2.TAL.nombres.length, 3);

  t.seccion('13 · crear en una base vacia la enciende');
  const V2 = correr();
  t.eq('antes no restringe', V2.talHayBase(), false);
  V2.talAnadir('ANA ROJAS');
  t.eq('despues si', V2.talHayBase(), true);
  t.eq('y ya rechaza a quien no este', V2.talValidar('OTRO CUALQUIERA').ok, false,
       'crear el primero es lo que cierra la puerta: conviene saberlo');
};
