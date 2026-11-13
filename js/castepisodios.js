/* Reasignar en el programa cambia también los capítulos · especificacion 09, PRO-65
 *
 * Pedido de sala: «cuando reasigno un personaje en el panel de los programas,
 * que se cambie automáticamente en los episodios que estén».
 *
 * «Reasignar» del Reparto (PRO-21, PRO-33) ya cambiaba el talento en
 * DublajeCast, en el registro del programa y en la foto de cada capítulo. Pero
 * cada capítulo de Dubbipt guarda SU propio casting (las tarjetas: `chars` en
 * episode_data, más la copia de este equipo), y ese no se tocaba: al abrir el
 * capítulo seguía el talento viejo, y el Excel del casting salía con él. La
 * herencia del registro solo rellena personajes SIN talento, así que nunca lo
 * corregía.
 *
 * Ahora, al reasignar, se recorre cada capítulo del programa (o solo el suyo,
 * si se cambia desde la tabla de un episodio) y, donde sale ese personaje, se
 * le pone el talento nuevo:
 *   · el capítulo abierto en este equipo, en memoria (y se guarda como siempre);
 *   · los demás, en la nube (episode_data) y en la copia de este equipo, y se
 *     avisa a los demás equipos para que lo traigan;
 *   · sus gemelos (el mismo personaje con «(ARCHIVO)», «(VO)»…) cambian con
 *     él si tenían el mismo talento que él: son la misma persona.
 * Lo demás del capítulo (libreto, marcas, QC…) no se toca.
 *
 * Es un script clásico: comparte el ámbito global con index.html (castNorm,
 * castClave, castSinSufijo, sb, idbGet/idbSet/idbDel, sbEps, epDataUpsert…).
 */

/**
 * Cambia el talento de un personaje en los datos de UN capítulo ({ chars, charsRaw }), en el sitio.
 * Devuelve { cambiados: [nombre], antes } (vacío si no estaba o ya lo tenía).
 */
function ceCambiarEnDatos(data, personaje, nuevo){
  const out = { cambiados: [], antes: '' };
  if(!data || !Array.isArray(data.chars)) return out;
  const val = String(nuevo == null ? '' : nuevo).replace(/\s+/g, ' ').trim();
  const k = castNorm(personaje);
  const base = (n) => castClave(typeof castSinSufijo === 'function' ? castSinSufijo(n) : n);
  const kb = base(personaje);
  const nombreDe = (c) => (c && (c.display || c.key)) || '';
  const principal = data.chars.find(c => castNorm(nombreDe(c)) === k);
  if(!principal) return out;
  const antes = String(principal.talent || '').trim();
  out.antes = antes;
  /* Él, y sus gemelos que tenían su mismo talento. */
  const tocar = data.chars.filter(c => c === principal
    || (base(nombreDe(c)) === kb && castNorm(String(c.talent || '').trim()) === castNorm(antes)));
  const noRec = (t) => { try{ return (typeof NO_REC !== 'undefined' && typeof norm === 'function') ? NO_REC.has(norm(t)) : false; }catch(e){ return false; } };
  for(const c of tocar){
    if(castNorm(String(c.talent || '').trim()) === castNorm(val) && String(c.talent || '').trim() === val) continue;
    c.talent = val;
    c.noRec = noRec(val);
    out.cambiados.push(nombreDe(c));
    /* La copia «en bruto» del desglose (de donde se rehace al reabrir) también. */
    for(const r of (Array.isArray(data.charsRaw) ? data.charsRaw : [])){
      if(r && (r.key === c.key || castNorm(nombreDe(r)) === castNorm(nombreDe(c)))){ r.talent = val; r.noRec = c.noRec; }
    }
  }
  return out;
}

/**
 * Pone el talento nuevo de un personaje en los capítulos de un programa (o en uno solo: `o.epId` / `o.epNombre`).
 * Devuelve { episodios: [nombre del capítulo cambiado], fallos: [nombre] }.
 */
async function ceReasignarEnEpisodios(showId, personaje, nuevo, o){
  o = o || {};
  const out = { episodios: [], fallos: [] };
  if(!showId || !personaje || typeof sbEps !== 'function') return out;
  let eps = sbEps(showId) || [];
  if(o.epId) eps = eps.filter(e => String(e.id) === String(o.epId));
  else if(o.epNombre) eps = eps.filter(e => castNorm(e.name) === castNorm(o.epNombre));
  const abierto = (typeof currentEp !== 'undefined' && currentEp) ? currentEp : null;
  const uno = async (ep) => {
    try{
      /* El capítulo abierto en este equipo: en memoria, y se guarda como al asignar a mano. */
      if(abierto && String(abierto.id) === String(ep.id) && window._dataEpId === ep.id && typeof chars !== 'undefined'){
        const r = ceCambiarEnDatos({ chars: chars, charsRaw: window._charsRaw || null }, personaje, nuevo);
        if(!r.cambiados.length) return;
        try{ if(typeof renderCards === 'function') renderCards(); }catch(e){ /* se verá al repintar */ }
        try{ if(typeof castPintarOcupacion === 'function') castPintarOcupacion(); }catch(e){ /* ídem */ }
        const ok = (typeof epDataUpsert === 'function') ? await epDataUpsert(ep.id, showId) : false;
        (ok ? out.episodios : out.fallos).push(ep.name || String(ep.id));
        return;
      }
      /* Los demás: lo guardado en la nube. */
      const { data: fila, error } = await sb.from('episode_data').select('data,updated_at').eq('ep_id', ep.id).maybeSingle();
      if(error){ out.fallos.push(ep.name || String(ep.id)); return; }
      if(!fila || !fila.data) return;                       // capítulo sin datos guardados: lo hereda del registro al abrirlo
      const data = fila.data;
      const r = ceCambiarEnDatos(data, personaje, nuevo);
      if(!r.cambiados.length) return;
      const stamp = new Date().toISOString();
      const { error: e2 } = await sb.from('episode_data').upsert({ ep_id: ep.id, show_id: showId, data: data, updated_at: stamp });
      if(e2){ out.fallos.push(ep.name || String(ep.id)); return; }
      /* La copia de este equipo, al día (si no, al abrirlo enseñaría un momento el talento viejo). */
      try{ await idbSet('data:' + ep.id, { stamp: stamp, meta: { showId: showId, name: ep.name || data.name || '' }, data: Object.assign({ _epId: ep.id }, data) }); }catch(e){ /* se trae de la nube al abrirlo */ }
      try{ await idbDel('ep:' + ep.id); }catch(e){ /* la caché vieja se ignora igual */ }
      /* Los demás equipos que lo tengan abierto, que lo traigan. */
      try{ if(typeof libPing === 'function') libPing('ep', ep.id, showId); }catch(e){ /* sin aviso: lo verán al abrirlo */ }
      out.episodios.push(ep.name || String(ep.id));
    }catch(e){
      out.fallos.push(ep.name || String(ep.id));
      try{ if(typeof fallo === 'function') fallo('ceReasignarEnEpisodios · js/castepisodios.js', e, 'ese capítulo sigue con el talento anterior'); }catch(x){ /* sin registro de fallos */ }
    }
  };
  /* De tres en tres: un capítulo trae su libreto entero, y todos a la vez pesan. */
  let i = 0;
  const hilo = async () => { while(i < eps.length){ const ep = eps[i++]; await uno(ep); } };
  await Promise.all([hilo(), hilo(), hilo()]);
  return out;
}

/** «· cambiado en 3 capítulos (101, 102, 105)» para el aviso. '' si no cambió ninguno. */
function ceFrase(r){
  if(!r) return '';
  let t = '';
  if(r.episodios.length) t += ' · cambiado en ' + r.episodios.length + ' capítulo' + (r.episodios.length === 1 ? '' : 's')
    + ' (' + r.episodios.slice(0, 5).join(', ') + (r.episodios.length > 5 ? '…' : '') + ')';
  if(r.fallos.length) t += ' · ⚠️ no se pudo cambiar en ' + r.fallos.slice(0, 4).join(', ') + (r.fallos.length > 4 ? '…' : '');
  return t;
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { ceCambiarEnDatos, ceReasignarEnEpisodios, ceFrase };
}
