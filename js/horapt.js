/* La hora de Pro Tools y la del libreto · especificacion 04
 *
 * Llegó de sala: el panel decía «recibiendo a 24 fps» y el libreto no se
 * movía. El timecode llegaba bien; lo que no cuadraba era la HORA. El
 * seguimiento compara el timecode de Pro Tools con los del libreto tal cual, y
 * una sesión que empieza en 01:00:00:00 con un libreto que cuenta desde
 * 00:00:00:00 -la lista de diálogos de Netflix, o un libreto hecho con ella-
 * cae siempre «después del último parlamento»: el libreto se queda clavado al
 * final y parece que no sincroniza.
 *
 * Aquí se saca cuántas HORAS ENTERAS hay entre los dos, para restarlas antes
 * de buscar el parlamento. Solo horas enteras: es como cambian de base una
 * sesión y un libreto del mismo vídeo. Y se dice lo que se ve, que desde
 * fuera no se nota nada: si va con una hora de diferencia, o si no coinciden
 * de ninguna manera.
 *
 * El timecode que ve el resto del programa -el contador, la hora que se
 * apunta en una corrección de QC- sigue siendo el de Pro Tools, sin tocar.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: script, currentEp, castAviso, localStorage, y el panel
 * del timecode (tcpPanel, en tcpantalla.js), que le pide su trozo.
 */

/* ═══ LA HORA DE PRO TOOLS Y LA DEL LIBRETO ════════════════════════════════ */

/* Lo que se sabe del capítulo abierto: de dónde a dónde va su libreto, el
   timecode más bajo y el más alto que se le han visto a Pro Tools, la
   diferencia en uso y lo que ya se ha dicho, para no repetirlo. */
const HPT = { sello: '', rango: null, fijo: null, min: null, max: null, d: 0, tipo: '', dichos: {} };
/* Segundos antes del primer timecode y después del último que aún cuentan
   como «dentro del libreto»: la claqueta, el pitido y los créditos. */
const HPT_MARGEN = 120;
const HPT_GUARDADO = 'ddl_pt_hora:';

/**
 * De dónde a dónde va el libreto: su primer y su último timecode PROPIOS. Uno
 * heredado del parlamento anterior no dice nada nuevo. Si ninguno trae el
 * suyo se miran los efectivos; nulo si el libreto no trae timecodes.
 */
function hptRango(guion){
  /* Con el libreto abierto, sobre sus tiempos LIMPIOS: un timecode mal
     escrito -una hora de más en un parlamento- no alarga el libreto una hora. */
  if(typeof segTiempos === 'function' && typeof script !== 'undefined' && guion === script){
    const S = segTiempos();
    return S.a == null ? null : { a: S.a, b: S.b };
  }
  const de = (campo) => {
    let a = null, b = null;
    for(const x of (guion || [])){
      if(!x || x[campo] == null || !isFinite(+x[campo])) continue;
      const t = +x[campo];
      if(campo === 'tcEff' && t <= 0) continue;      // el cero de «no hay ninguno todavía»
      if(a == null || t < a) a = t;
      if(b == null || t > b) b = t;
    }
    return a == null ? null : { a: a, b: b };
  };
  return de('tcSec') || de('tcEff');
}

/**
 * Cuántos segundos va Pro Tools por delante del libreto, en horas enteras.
 *
 *   pt     · el timecode de Pro Tools ahora.
 *   rango  · de dónde a dónde va el libreto (`hptRango`).
 *   visto  · el timecode más bajo y el más alto que se le han visto a Pro
 *            Tools en este capítulo: `{ min, max }`.
 *   fijo   · las horas que ha fijado una persona, o nulo si va en automático.
 *
 * Devuelve `{ d, tipo }`. `d` en segundos, o nulo si no se sabe. El tipo:
 *
 *   mano      lo fijó una persona.
 *   igual     cuentan desde la misma hora.
 *   hora      solo una diferencia de horas deja a Pro Tools dentro del libreto.
 *   supuesto  valen varias -el libreto dura más de una hora-. Se quita la que
 *             dejaría fuera algo de lo ya visto, y de las que quedan: si
 *             «cuentan igual» es una de ellas, es esa; si no, la menor. Se
 *             suponía que una sesión empieza en 01:00:00:00, y llegó de sala
 *             que no: «estoy en 01:03:24:00 y el libreto coloca el parlamento
 *             de 00:03:24:00». En un libreto que pasa de la hora, la una y
 *             tres es la una y tres.
 *   fuera     ninguna hora deja a Pro Tools dentro del libreto.
 *   sin       el libreto no trae timecodes.
 */
function hptCalcular(pt, rango, visto, fijo){
  if(fijo != null && isFinite(+fijo)) return { d: Math.round(+fijo) * 3600, tipo: 'mano' };
  if(pt == null || !isFinite(+pt)) return { d: null, tipo: 'nada' };
  if(!rango) return { d: null, tipo: 'sin' };
  const dentro = (x) => x >= rango.a - HPT_MARGEN && x <= rango.b + HPT_MARGEN;
  let caben = [];
  for(let k = -23; k <= 23; k++) if(dentro(+pt - 3600 * k)) caben.push(k);
  if(!caben.length) return { d: null, tipo: 'fuera' };
  if(caben.length > 1 && visto){
    const tambien = caben.filter(k => (visto.min == null || dentro(visto.min - 3600 * k))
                                   && (visto.max == null || dentro(visto.max - 3600 * k)));
    /* Si lo ya visto las descarta todas -un rebobinado hasta antes de la
       claqueta-, no se le hace caso: mejor suponer que quedarse sin ninguna. */
    if(tambien.length) caben = tambien;
  }
  if(caben.length === 1) return { d: caben[0] * 3600, tipo: caben[0] ? 'hora' : 'igual' };
  if(caben.indexOf(0) >= 0) return { d: 0, tipo: 'supuesto' };
  caben.sort((x, y) => Math.abs(x) - Math.abs(y) || y - x);
  return { d: caben[0] * 3600, tipo: 'supuesto' };
}

/** El capítulo abierto, para recordar lo suyo. */
function hptEp(){
  try{ return String((typeof window !== 'undefined' && window._dataEpId) || (typeof currentEp !== 'undefined' && currentEp && currentEp.id) || ''); }
  catch(e){ return ''; }
}

/** Las horas que una persona fijó para este capítulo, o nulo si va en automático. */
function hptFijada(ep){
  try{
    const v = localStorage.getItem(HPT_GUARDADO + (ep == null ? hptEp() : ep));
    return (v == null || v === '' || v === 'auto' || !isFinite(+v)) ? null : Math.round(+v);
  }catch(e){ return null; }
}

/** Fija las horas a mano, o vuelve a automático con nulo. Lo ya dicho y lo ya
    visto se olvidan: es empezar de nuevo. */
function hptFijar(v, ep){
  const clave = HPT_GUARDADO + (ep == null ? hptEp() : ep);
  try{
    if(v == null || v === 'auto' || !isFinite(+v)) localStorage.removeItem(clave);
    else localStorage.setItem(clave, String(Math.round(+v)));
  }catch(e){ /* no se recuerda: vale para esta vez */ }
  HPT.sello = '';
}

/** Un instante como se lee: 01:02:03. */
function hptTC(sec){
  const s = Math.max(0, Math.floor(+sec || 0));
  const p = (v) => String(v).padStart(2, '0');
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
}

/** «1 hora por delante», «2 horas por detrás». */
function hptHoras(d){
  const h = Math.round(Math.abs(d) / 3600);
  return h + ' hora' + (h === 1 ? '' : 's') + (d > 0 ? ' por delante' : ' por detrás');
}

/** Lo que hay que decir de un resultado, o vacío si no hay nada que decir. */
function hptTexto(r, pt, rango){
  if(!r) return '';
  if(r.tipo === 'sin') return '⚠️ Este libreto no trae timecodes: no puede seguir a Pro Tools.';
  if(r.tipo === 'fuera')
    return '⚠️ Pro Tools va por ' + hptTC(pt) + ' y el libreto va de ' + hptTC(rango.a) + ' a ' + hptTC(rango.b)
         + ': no coinciden ni con horas de diferencia, así que el libreto no lo puede seguir.';
  if((r.tipo === 'hora' || r.tipo === 'supuesto') && r.d)
    return '⏱ Pro Tools va ' + hptHoras(r.d) + ' del libreto: su ' + hptTC(pt) + ' es el ' + hptTC(pt - r.d)
         + ' del libreto, y se sigue con esa diferencia.'
         + (r.tipo === 'supuesto' ? ' Si no es así, cámbialo en el panel del timecode.' : '');
  return '';
}

/**
 * Cuántos segundos hay que RESTARLE al timecode de Pro Tools para tener el
 * del libreto de este capítulo. Lo llama el seguimiento en cada vuelta: se
 * acuerda de lo visto, y lo que haya que decir lo dice una sola vez.
 */
function hptDe(pt){
  if(pt == null || !isFinite(+pt)) return HPT.d || 0;
  const guion = (typeof script !== 'undefined' && Array.isArray(script)) ? script : [];
  const sello = hptEp() + '|' + guion.length;
  if(HPT.sello !== sello){
    HPT.sello = sello; HPT.rango = hptRango(guion); HPT.fijo = hptFijada();
    HPT.min = null; HPT.max = null; HPT.d = 0; HPT.tipo = ''; HPT.dichos = {};
  }
  if(HPT.min == null || +pt < HPT.min) HPT.min = +pt;
  if(HPT.max == null || +pt > HPT.max) HPT.max = +pt;
  const r = hptCalcular(+pt, HPT.rango, { min: HPT.min, max: HPT.max }, HPT.fijo);
  if(r.d != null) HPT.d = r.d;                  // fuera del libreto se sigue con la última que valió
  HPT.tipo = r.tipo;
  const clave = r.tipo + '|' + (r.d == null ? '' : r.d);
  if(!HPT.dichos[clave]){
    HPT.dichos[clave] = true;
    const t = hptTexto(r, +pt, HPT.rango);
    if(t){ try{ castAviso(t); }catch(e){ /* sin avisos: el panel lo dice igual */ } }
  }
  return HPT.d;
}

/** Cómo va ahora, para el panel. */
function hptEstadoTexto(){
  const fijo = hptFijada();
  if(fijo != null) return fijo ? ('fijada a mano · Pro Tools ' + hptHoras(fijo * 3600)) : 'fijada a mano · cuentan igual';
  if(HPT.tipo === 'sin') return 'el libreto no trae timecodes';
  if(HPT.tipo === 'fuera') return 'Pro Tools está fuera del libreto';
  if(!HPT.tipo || HPT.tipo === 'nada') return 'se sabrá cuando llegue timecode';
  return HPT.d ? ('Pro Tools ' + hptHoras(HPT.d)) : 'cuentan igual';
}

/** El trozo del panel del timecode: automática, o fijarla a mano. */
function hptPanelHtml(){
  const fijo = hptFijada();
  const op = (v, txt) => '<option value="' + v + '"' + (String(fijo == null ? 'auto' : fijo) === String(v) ? ' selected' : '') + '>' + txt + '</option>';
  let ops = op('auto', 'Automática') + op(0, 'Cuentan igual');
  for(let h = 1; h <= 12; h++) ops += op(h, 'Pro Tools ' + hptHoras(h * 3600)) + op(-h, 'Pro Tools ' + hptHoras(-h * 3600));
  return '<label class="sala-c">Hora del libreto <select id="tcpHora">' + ops + '</select></label>'
       + '<span id="tcpHoraEstado" style="font-size:12px;color:#8892a6;align-self:center">' + hptEstadoTexto() + '</span>';
}

/** Conecta el desplegable del panel. */
function hptPanelCablear(ov){
  const s = ov && ov.querySelector ? ov.querySelector('#tcpHora') : null;
  if(!s) return false;
  s.onchange = () => {
    hptFijar(s.value === 'auto' ? null : +s.value);
    const e = ov.querySelector('#tcpHoraEstado');
    if(e) e.textContent = hptEstadoTexto();
    /* Que el libreto se recoloque ya, sin esperar al siguiente salto. */
    try{ if(typeof studio !== 'undefined' && studio){ studio.cur = -2; } if(typeof studioTick === 'function') studioTick(true); }
    catch(err){ /* sin libreto abierto no hay nada que recolocar */ }
  };
  return true;
}

/* ═══ FIN DE LA HORA DE PRO TOOLS ══════════════════════════════════════════ */
