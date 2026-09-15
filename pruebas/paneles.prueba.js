/* Los paneles de las herramientas de video · especificacion 04
 *
 * Con el libreto incrustado abierto, `body` lleva la clase `ddlov` y una regla
 * de CSS esconde TODOS sus hijos directos menos una lista de excepciones. Es
 * deliberado: en el movil, con el zoom raro, se veian las tarjetas de los
 * personajes por debajo del libreto.
 *
 * El problema es que la lista iba por IDENTIFICADOR. Cada panel nuevo nacia
 * fuera de ella, y nadie se enteraba: no hay error, no hay aviso, el panel se
 * crea entero y se le pone display:none. Los cuatro paneles de las herramientas
 * de video -sala, cues, formatos, planos- se abren desde botones que viven
 * DENTRO del libreto, es decir SIEMPRE con `ddlov` puesto. Nunca se vieron.
 *
 * Aqui se comprueba la regla de verdad, la que el codigo escribe, contra los
 * overlays de verdad, los que el codigo crea. Nada esta escrito a mano dos
 * veces: si manana alguien anade un panel, esta prueba lo mira tambien.
 */
'use strict';
const fs = require('fs');
const { fuentes, INDEX } = require('./ayuda');

exports.nombre = 'Los paneles de vídeo se ven con el libreto abierto';

const TODO = fuentes().map(f => f.src).join('\n');
/* Aqui hace falta tambien el CSS, que no es JavaScript y no sale en fuentes().
   Los finales de linea se normalizan igual que alli (ENT-15). */
const HTML = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');

/** Las excepciones de la regla `body.ddlov > *:not(…)`, tal como se escriben. */
function exenciones(){
  const m = TODO.match(/st\.textContent = 'body\.ddlov[\s\S]{0,600}?\{display:none !important\}'/);
  if(!m) throw new Error('No encuentro la regla de `body.ddlov` en ddlOvSync.');
  return [...m[0].matchAll(/:not\(([^)]+)\)/g)].map(x => x[1]);
}

/** Lo que la regla le hace a un hijo de `body`: esconderlo o dejarlo. */
function seEsconde(el, exs){
  for(const e of exs){
    if(e[0] === '#' && el.id === e.slice(1)) return false;
    if(e[0] === '.' && (el.clases || []).includes(e.slice(1))) return false;
    if(e[0] !== '#' && e[0] !== '.' && el.etiqueta === e) return false;
  }
  return true;
}

/** El overlay que crea una funcion de panel: su identificador y sus clases. */
function overlayDe(fn){
  const i = TODO.indexOf('function ' + fn + '()');
  if(i < 0) throw new Error('No encuentro la función ' + fn + '.');
  const fin = TODO.indexOf('document.body.appendChild(ov)', i);
  if(fin < 0) throw new Error(fn + ' ya no cuelga su overlay de `body`: revisa esta prueba.');
  const cuerpo = TODO.slice(i, fin);
  const id = (cuerpo.match(/ov\.id\s*=\s*'([^']+)'/) || [])[1];
  const cls = (cuerpo.match(/ov\.className\s*=\s*'([^']+)'/) || [])[1] || '';
  return { id: id, clases: cls.split(/\s+/).filter(Boolean), etiqueta: 'div' };
}

/* Los cuatro que se quejo el usuario, con el boton que los abre. */
const PANELES = [
  ['salaPanel',   'stSalaCfg', 'Configuración de sala'],
  ['adrPanel',    'stCues',    'Cues'],
  ['ioPanel',     'stIo',      'Formatos'],
  ['cortesPanel', 'stCortes',  'Planos']
];

exports.pruebas = function(t){
  const exs = exenciones();

  t.seccion('1 · el botón vive dentro del libreto, así que `ddlov` está puesto');
  for(const [fn, boton, nombre] of PANELES)
    t.ok(nombre + ': lo abre ' + boton + ', que está en la tira del libreto',
         TODO.includes("$('" + boton + "').onclick"),
         'si el botón ya no existe, esta prueba está mirando otra cosa');

  t.seccion('2 · y con `ddlov` puesto, el panel TIENE que verse');
  for(const [fn, boton, nombre] of PANELES){
    const ov = overlayDe(fn);
    t.eq(nombre + ' no se esconde', seEsconde(ov, exs), false,
         'la regla de `body.ddlov` lo dejaba en display:none y el botón no hacía nada');
  }

  t.seccion('3 · la excepción va por clase, no por identificador');
  t.ok('`.modo-cap` está exento', exs.includes('.modo-cap'),
       'es la clase de TODAS las ventanas modales: sin ella, cada panel nuevo '
       + 'vuelve a nacer invisible y nadie se entera');
  t.ok('`.ddl-encima` está exento', exs.includes('.ddl-encima'));
  for(const [fn, , nombre] of PANELES)
    t.ok(nombre + ' se apoya en la clase, no en su identificador',
         overlayDe(fn).clases.includes('modo-cap'));

  t.seccion('4 · los avisos y las preguntas también se ven');
  t.ok('la caja de avisos lleva `ddl-encima`',
       /b\.id='ddlToasts';\s*b\.className='ddl-encima'/.test(TODO),
       'sin esto, con el libreto abierto no se veía un solo aviso');
  t.ok('la pregunta de confirmación lleva `ddl-encima`',
       /ov\.id='ddlConfirmOv';\s*ov\.className='ddl-encima'/.test(TODO),
       'se pulsaba «borrar», la pregunta salía invisible, y no pasaba nada');

  t.seccion('5 · y por encima del trackpad, que está a 99999');
  /* El z-index de una regla de CSS, sin fabricar expresiones regulares: se
     busca el selector tal cual y se lee el numero que venga detras.
     El selector tiene que empezar el renglon: `#ddlToasts` sale antes dentro de
     otra regla (`body.talent-wait #ddlToasts`) que no lleva z-index. */
  const z = (sel) => {
    const i = HTML.indexOf('\n' + sel + '{') + 1;
    if(i <= 0) return null;
    const bloque = HTML.slice(i, HTML.indexOf('}', i));
    const j = bloque.indexOf('z-index:');
    return j < 0 ? null : parseInt(bloque.slice(j + 8), 10);
  };
  t.ok('los avisos, por encima', z('#ddlToasts') > 99999, 'z-index ' + z('#ddlToasts'));
  t.ok('la pregunta, por encima', z('#ddlConfirmOv') > 99999, 'z-index ' + z('#ddlConfirmOv'));
  t.ok('los paneles, por encima', z('.modo-cap') > 99999, 'z-index ' + z('.modo-cap'));

  /* ── 6 · ninguna pantalla NUEVA puede nacer invisible ──────────────────
     Las secciones de arriba miran cuatro paneles escritos a mano. Eso no basta,
     y se vio: `tcpMarcarRect` —la pantalla para marcar el recuadro del contador
     de Pro Tools— nacio sin clase, `body.ddlov` la escondio, y desde sala se
     reporto que «la opcion de elegir recuadro se coloca abajo del libreto y no
     deja elegir». La prueba no se entero porque la pantalla no estaba en la
     lista, aunque el comentario de arriba presumiera de lo contrario.

     Asi que aqui NO hay lista de lo que hay que mirar: se busca en todo el
     codigo que se despliega cada cosa que se cuelga de `body`, se averigua su
     etiqueta, su identificador y sus clases, y se le aplica la regla.

     Lo que si hay es una lista de lo que YA estaba escondido el dia que se
     escribio esto. No son necesariamente fallos: casi todos son ayudantes
     invisibles a proposito -enlaces de descarga, campos para copiar- o
     dialogos que se abren desde la barra de arriba, que con el libreto abierto
     tampoco se ve. Estan apuntados para que la prueba pueda decir lo unico que
     de verdad importa: que no aparezca NINGUNO NUEVO. */
  t.seccion('6 · ninguna pantalla nueva nace invisible');

  const colgadosDeBody = () => {
    const re = /document\.body\.appendChild\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
    const out = [];
    let m;
    while((m = re.exec(TODO))){
      const v = m[1];
      const antes = TODO.slice(Math.max(0, m.index - 6000), m.index);
      const cre = new RegExp('(?:^|[^.\\w])' + v + '\\s*=\\s*document\\.createElement\\([\'"]([a-z]+)[\'"]\\)', 'g');
      let c = null, mm;
      while((mm = cre.exec(antes))) c = mm;
      const trozo = c ? antes.slice(c.index) : '';
      const id  = (trozo.match(new RegExp(v + '\\.id\\s*=\\s*[\'"]([^\'"]+)')) || [])[1] || '';
      const cls = (trozo.match(new RegExp(v + '\\.className\\s*=\\s*[\'"]([^\'"]+)')) || [])[1] || '';
      const add = [...trozo.matchAll(new RegExp(v + '\\.classList\\.add\\([\'"]([^\'"]+)', 'g'))].map(x => x[1]);
      out.push({ etiqueta: c ? c[1] : '?', id: id,
                 clases: cls.split(/\s+/).concat(add).filter(Boolean),
                 firma: (c ? c[1] : '?') + '#' + (id || '·' + v) });
    }
    return out;
  };

  const todos = colgadosDeBody();
  t.ok('encuentra las pantallas del código, no una lista escrita a mano',
       todos.length > 40, 'solo ha encontrado ' + todos.length);

  const escondidos = todos.filter(el => seEsconde(el, exs)).map(el => el.firma);

  /* Lo que ya estaba escondido. Si arreglas alguno, quítalo de aquí. */
  const YA_LO_ESTABAN = [
    'textarea#·ta',
    'div#ddlmWsOv',
    'div#wsPickOv',
    'div#wsRenOv',
    'div#sPick',
    'div#rolePick',
    'div#pwdOv',
    'div#pwdOv',
    'div#mgOv',
    'div#·ov',
    'div#taskPanel',
    'a#·a',
    'div#dlgOv',
    'iframe#impFrame',
    'datalist#talList',
    'a#·a',
    'div#acctOv',
    'div#drvOv',
    'div#ddlmOv',
    'div#ddlmOv',
    'div#tutOv',
    'div#ddlmOv',
    'button#floatCtl',
    'div#onlinePop',
    'div#acctsOv',
    'a#·a',
    'datalist#talList',
    'input#talFile'
  ];

  const pendiente = YA_LO_ESTABAN.slice();
  const nuevos = [];
  for(const f of escondidos){
    const i = pendiente.indexOf(f);
    if(i < 0) nuevos.push(f); else pendiente.splice(i, 1);
  }
  t.eq('no hay ninguna pantalla nueva que el libreto esconda', nuevos.join(', '), '',
       'nace con `display:none` en cuanto el libreto está abierto, y quien la abra '
       + 'verá que su botón no hace nada. Ponle la clase `.modo-cap` si es una '
       + 'ventana modal, o `.ddl-encima` si tiene que verse pase lo que pase.');

  /* Y las que SI tenian que verse, una por una y por su nombre: las de los
     paneles de herramientas y las dos pantallas del timecode de Pro Tools. */
  const porId = (id) => todos.find(el => el.id === id);
  for(const id of ['salaOv', 'adrOv', 'ioOv', 'cortesOv', 'talOv', 'metaOv', 'gestOv',
                   'falloOv', 'ddlConfirmOv', 'tcpOv', 'tcpRectOv']){
    const el = porId(id);
    t.ok('#' + id + ' se ve con el libreto abierto', !!el && !seEsconde(el, exs),
         el ? 'está escondido' : 'ya no existe: revisa esta prueba');
  }
};
