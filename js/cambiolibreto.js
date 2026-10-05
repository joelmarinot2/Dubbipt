/* Cambiar el libreto conservando el casting · especificacion 02
 *
 * Pedido de sala: «cuando ya tenga el libreto quiero poder subirlo e
 * intercambiarlo, y que se peguen los talentos que ya asigné con el libreto no
 * traducido. Importante: algunos nombres cambian por la traducción, entonces
 * analiza el diálogo y pregúntame si esos dos personajes son los mismos».
 *
 * El casting se adelanta con la lista de diálogos original (LIB-25) y el
 * libreto traducido llega después. Aquí se sube DENTRO del mismo capítulo:
 *
 *   · el personaje que se llama igual se lleva su talento sin preguntar;
 *   · el que ya no está con ese nombre -«RANDOM FEMALE 4» es ahora «MUJER 4»-
 *     se busca por CUÁNDO habla: los dos libretos son del mismo vídeo, así
 *     que quien habla a la misma hora es el mismo. Y se PREGUNTA, pareja por
 *     pareja, con los diálogos de los dos al lado (CAST-N3: nunca se adivina);
 *   · hasta que no se dice que sí en la ventana, no se cambia nada.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: castNorm, norm, NO_REC, loadFileForEp, rebuild,
 * renderCards, castAviso, castGemelosAlDia, talMarcarSiempreX,
 * gestMarcarTodos, gestOlvidar, gestAvisar, libTraducidoPintar, epDataUpsert,
 * saveEpCache, epStamp, idbSet, idbDel, libFetchAll, libPing, sb, fallo, esc,
 * y las variables del libreto (script, chars, charIdx…).
 */

/* ═══ CAMBIAR EL LIBRETO CONSERVANDO EL CASTING ════════════════════════════ */

const LC = {
  tol: 1.5,       // segundos de margen para decir «a la misma hora»: un libreto sin fotogramas redondea al segundo
  minimo: 0.5,    // de los parlamentos del nuevo, cuántos tienen que caer sobre el viejo para PROPONERLO
  encaje: 0.5,    // de los parlamentos del nuevo, cuántos tienen que cuadrar con el viejo para fiarse del desfase
  destaca: 1.25,  // y cuánto más que con el siguiente desfase: en un diálogo apretado cualquiera cuadra a medias
  muestras: 3     // diálogos de ejemplo que se enseñan por pareja
};

/**
 * Los momentos en que habla cada uno, en orden: `[{ t, key, txt }]`.
 *
 * Solo cuentan los timecodes PROPIOS. Un parlamento sin el suyo hereda el del
 * anterior (LIB-3) y eso sirve para seguir el libreto, no para saber quién
 * hablaba cuándo. El que sale de la lista de diálogos guarda además el de
 * cada fila (`tcs`), y se usan todos.
 */
function lcTiempos(script){
  const out = [];
  for(const b of (script || [])){
    if(!b || !b.key) continue;
    const lineas = Array.isArray(b.lines) ? b.lines : [];
    const filas = Array.isArray(b.tcs) ? b.tcs : [];
    let puestas = 0;
    filas.forEach((t, i) => {
      if(t == null || !isFinite(+t)) return;
      out.push({ t: +t, key: b.key, txt: String(lineas[i] == null ? '' : lineas[i]) });
      puestas++;
    });
    if(!puestas && b.tcSec != null && isFinite(+b.tcSec))
      out.push({ t: +b.tcSec, key: b.key, txt: lineas.join(' ') });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/** ¿Empieza alguien a hablar en el libreto viejo entre `desde` y `hasta`? `viejos` va ordenado. */
function lcHayAlguien(viejos, desde, hasta){
  let lo = 0, hi = viejos.length;
  while(lo < hi){
    const m = (lo + hi) >> 1;
    if(viejos[m].t < desde) lo = m + 1; else hi = m;
  }
  return lo < viejos.length && viejos[lo].t <= hasta;
}

/**
 * Cuánto hay que sumar a los timecodes del viejo para que sean los del nuevo.
 *
 * La lista de Netflix cuenta desde 00:00:00:00 y el libreto de sala suele
 * empezar en 01:00:00:00: es el mismo vídeo con una hora de diferencia. Se
 * miran todas las diferencias entre un timecode de uno y uno del otro; las
 * que más se repiten son las candidatas. Se cuentan juntas las de dos
 * segundos seguidos: un libreto sin fotogramas redondea hacia abajo, y lo que
 * en uno es :10:06 en el otro es :10.
 *
 * De cada candidata se mide lo que importa: con ese desfase, cuántos
 * parlamentos del libreto nuevo tienen a alguien del viejo empezando a hablar
 * en ese momento. La buena tiene que cubrir la mitad y DESTACAR sobre la
 * siguiente: en un diálogo apretado, cualquier desfase cubre bastantes por
 * casualidad, y fiarse de uno de esos sería proponer parejas al azar.
 * Devuelve `{ d, n }` -el desfase y cuántos parlamentos cuadran- o nulo.
 */
function lcDesfase(viejos, nuevos){
  if(!viejos || !nuevos || !viejos.length || !nuevos.length) return null;
  /* Con libretos muy largos, uno de cada tantos: las candidatas salen igual. */
  const salto = (l, tope) => { const s = Math.max(1, Math.ceil(l.length / tope)); return l.filter((_, i) => i % s === 0); };
  const v = salto(viejos, 2500), n = salto(nuevos, 2500);
  const cuenta = new Map();
  for(const a of n) for(const b of v){
    const d = Math.round(a.t - b.t);
    cuenta.set(d, (cuenta.get(d) || 0) + 1);
  }
  const junto = (d) => (cuenta.get(d) || 0) + (cuenta.get(d + 1) || 0);
  const candidatas = [];
  cuenta.forEach((c, d) => { candidatas.push([d - 1, junto(d - 1)], [d, junto(d)]); });
  candidatas.sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]));
  const probar = [];
  for(const [k] of candidatas){
    if(probar.length >= 8) break;
    if(probar.some(x => Math.abs(x - k) <= 2)) continue;       // la de al lado es la misma
    probar.push(k);
  }
  const medidas = probar.map(k => {
    let c = 0;
    for(const e of nuevos) if(lcHayAlguien(viejos, e.t - k - 1.5, e.t - k + 0.5)) c++;
    return { k: k, c: c };
  }).sort((a, b) => b.c - a.c || Math.abs(a.k) - Math.abs(b.k));
  const mejor = medidas[0], segunda = medidas[1] ? medidas[1].c : 0;
  if(!mejor) return null;
  if(mejor.c < Math.max(2, Math.ceil(nuevos.length * LC.encaje)) || mejor.c < segunda * LC.destaca) return null;
  /* De los dos segundos, el que más tiene: el margen cubre al otro. */
  return { d: (cuenta.get(mejor.k + 1) || 0) > (cuenta.get(mejor.k) || 0) ? mejor.k + 1 : mejor.k, n: mejor.c };
}

/**
 * Quién hablaba en el libreto viejo en el instante `t`. `viejos` va ordenado.
 *
 * El que empieza más cerca de `t`, dentro del margen. Si nadie empieza cerca,
 * sigue hablando el último que empezó: un parlamento largo no trae un
 * timecode por frase. Nulo si `t` cae antes de que nadie haya hablado.
 */
function lcQuienHablaba(viejos, t, tol){
  let lo = 0, hi = viejos.length - 1, k = -1;
  while(lo <= hi){
    const m = (lo + hi) >> 1;
    if(viejos[m].t <= t + tol){ k = m; lo = m + 1; } else hi = m - 1;
  }
  if(k < 0) return null;
  let mejor = null;
  for(let i = k; i >= 0 && viejos[i].t >= t - tol; i--){
    if(!mejor || Math.abs(viejos[i].t - t) < Math.abs(mejor.t - t)) mejor = viejos[i];
  }
  return mejor || viejos[k];
}

/** El nombre de un personaje como se compara: sin tildes, apóstrofos ni puntos. */
function lcClave(c){
  const nombre = (c && (c.display || c.key)) || '';
  return (typeof castNorm === 'function') ? castNorm(nombre) : String(nombre).toUpperCase().trim();
}

/**
 * Casa los personajes del libreto viejo con los del nuevo.
 *
 * `viejo` y `nuevo` son `{ chars, script }`. Devuelve:
 *
 *   iguales  · `[{ viejo, nuevo }]` los que se llaman igual: van solos.
 *   dudosos  · los del viejo que TIENEN talento y ya no están con ese nombre.
 *              Cada uno con sus `candidatos` del nuevo -los que hablan a la
 *              misma hora, con cuántos parlamentos coinciden y unos diálogos
 *              de ejemplo- y el `propuesto`, si alguno coincide en la mitad
 *              o más. Uno sin talento no se pregunta: no hay nada que pegar.
 *   libres   · los del nuevo que no se llaman como nadie del viejo.
 *   desfase  · segundos entre los dos libretos, o nulo si no se pueden
 *              comparar por tiempo: entonces no se propone a nadie.
 */
function lcCasar(viejo, nuevo){
  const vChars = ((viejo && viejo.chars) || []).filter(Boolean);
  const nChars = ((nuevo && nuevo.chars) || []).filter(Boolean);
  const porKey = {}, porNombre = {};
  for(const c of nChars){
    porKey[c.key] = c;
    const k = lcClave(c);
    if(k && !porNombre[k]) porNombre[k] = c;
  }
  const iguales = [], tomados = new Set(), pendientes = [];
  for(const o of vChars){
    const n = porKey[o.key] || porNombre[lcClave(o)] || null;
    if(n && !tomados.has(n.key)){ tomados.add(n.key); iguales.push({ viejo: o.key, nuevo: n.key }); continue; }
    if(o.talent && String(o.talent).trim()) pendientes.push(o);
  }
  const libres = nChars.filter(c => !tomados.has(c.key));
  const esLibre = new Set(libres.map(c => c.key));

  const tv = lcTiempos(viejo && viejo.script), tn = lcTiempos(nuevo && nuevo.script);
  const des = lcDesfase(tv, tn);
  const votos = {}, total = {}, muestras = {};
  if(des){
    for(const e of tn){
      if(!esLibre.has(e.key)) continue;
      total[e.key] = (total[e.key] || 0) + 1;
      const q = lcQuienHablaba(tv, e.t - des.d, LC.tol);
      if(!q) continue;
      const v = votos[e.key] || (votos[e.key] = {});
      v[q.key] = (v[q.key] || 0) + 1;
      const par = e.key + ' ⇐ ' + q.key;
      const m = muestras[par] || (muestras[par] = []);
      if(m.length < LC.muestras && (q.txt || e.txt)) m.push({ t: e.t, viejo: q.txt, nuevo: e.txt });
    }
  }

  const dudosos = pendientes.map(o => {
    const candidatos = libres.map(n => ({
        nuevo: n.key, display: n.display || n.key,
        coinciden: (votos[n.key] && votos[n.key][o.key]) || 0, de: total[n.key] || 0,
        muestras: muestras[n.key + ' ⇐ ' + o.key] || [] }))
      .filter(c => c.coinciden > 0)
      .sort((a, b) => b.coinciden - a.coinciden || (b.coinciden / b.de) - (a.coinciden / a.de)
                   || String(a.display).localeCompare(String(b.display), 'es'));
    const p = candidatos[0];
    return { viejo: o.key, display: o.display || o.key, talent: String(o.talent).trim(),
             candidatos: candidatos,
             propuesto: (p && p.coinciden / p.de >= LC.minimo) ? p.nuevo : null };
  });

  const conTalento = new Set(vChars.filter(o => o.talent && String(o.talent).trim()).map(o => o.key));
  return { iguales: iguales, dudosos: dudosos,
           libres: libres.map(c => ({ key: c.key, display: c.display || c.key, ints: c.totalInts || 0 })),
           desfase: des ? des.d : null,
           pegan: iguales.filter(x => conTalento.has(x.viejo)).length,
           viejos: vChars.length, nuevos: nChars.length };
}

/**
 * Pega los talentos del libreto viejo en los personajes del nuevo, que son
 * los que hay ya en memoria (`charIdx`).
 *
 * `confirmados` son las parejas a las que una persona dijo que sí:
 * `[{ viejo, nuevo }]`. Los que se llaman igual van solos. Lo que repartió
 * una persona manda sobre lo que traiga escrito el archivo nuevo; pero dos
 * del viejo no caben en uno del nuevo: el segundo se queda sin pegar y se
 * dice. Devuelve `{ porNombre, confirmados, sinPegar: [{ display, talent,
 * causa }] }`.
 */
function lcAplicar(viejoChars, plan, confirmados){
  const viejoDe = {};
  (viejoChars || []).forEach(c => { if(c) viejoDe[c.key] = c; });
  const res = { porNombre: 0, confirmados: 0, sinPegar: [] };
  const puestos = {};
  const pegar = (oKey, nKey, confirmado) => {
    const o = viejoDe[oKey], n = charIdx[nKey];
    if(!o) return false;
    const tal = String(o.talent == null ? '' : o.talent).trim();
    if(!tal) return false;
    if(!n){ res.sinPegar.push({ display: o.display || o.key, talent: tal, causa: 'no está en el libreto nuevo' }); return false; }
    if(puestos[nKey] && puestos[nKey] !== tal){
      res.sinPegar.push({ display: o.display || o.key, talent: tal, causa: (n.display || n.key) + ' ya lleva a ' + puestos[nKey] });
      return false;
    }
    n.talent = tal;
    try{ n.noRec = NO_REC.has(norm(tal)); }catch(e){ n.noRec = false; }
    n.heredado = confirmado ? false : !!o.heredado;      // lo que acabas de confirmar ya está mirado
    if(o.gestOk != null) n.gestOk = !!o.gestOk;
    try{
      const raw = (window._charsRaw || []).find(x => x.key === nKey);
      if(raw){ raw.talent = tal; raw.noRec = n.noRec; raw.heredado = n.heredado; if(o.gestOk != null) raw.gestOk = !!o.gestOk; }
    }catch(e){ fallo('lcAplicar · js/cambiolibreto.js', e, 'un talento puede perderse al reabrir el capítulo'); }
    puestos[nKey] = tal;
    return true;
  };
  for(const x of ((plan && plan.iguales) || [])) if(pegar(x.viejo, x.nuevo, false)) res.porNombre++;
  const dichos = new Set();
  for(const x of (confirmados || [])){
    dichos.add(x.viejo);
    if(pegar(x.viejo, x.nuevo, true)) res.confirmados++;
  }
  /* Los que tenían talento y nadie confirmó: no se pierden de vista. */
  for(const d of ((plan && plan.dudosos) || [])){
    if(dichos.has(d.viejo)) continue;
    res.sinPegar.push({ display: d.display, talent: d.talent, causa: 'sin confirmar' });
  }
  return res;
}

/** Un instante como se lee: 01:02:03. */
function lcHora(sec){
  const s = Math.max(0, Math.floor(+sec || 0));
  const p = (v) => String(v).padStart(2, '0');
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
}

/** La prueba de una pareja, dicha en un renglón: cuántos coinciden y qué decían. */
function lcPrueba(c){
  if(!c) return 'No habla a la misma hora que nadie del libreto nuevo: elige tú, o déjalo sin pegar.';
  const cab = 'Coinciden ' + c.coinciden + ' de sus ' + c.de + ' parlamento' + (c.de === 1 ? '' : 's') + ' a la misma hora';
  const ej = (c.muestras || []).map(m => lcHora(m.t) + ' «' + String(m.viejo || '').slice(0, 60) + '» → «'
    + String(m.nuevo || '').slice(0, 60) + '»');
  return cab + (ej.length ? ' · ' + ej.join(' · ') : '');
}

/**
 * La ventana que pregunta. Arriba, lo que se pega solo; debajo, una fila por
 * cada personaje con talento que ya no está con ese nombre: «¿es el mismo
 * que…?», con los diálogos de los dos. Nada viene marcado: cada pareja la
 * confirma una persona (CAST-8). Resuelve con las parejas confirmadas, o con
 * nulo si se cancela -y entonces no se cambia nada-.
 */
function lcPreguntar(plan, nombreArchivo){
  return new Promise((resolve) => {
    const e2 = (s) => (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/</g, '&lt;');
    const opciones = (d) => {
      const vistos = new Set(d.candidatos.map(c => c.nuevo));
      return '<option value="">— no está en el libreto —</option>'
        + d.candidatos.map(c => '<option value="' + e2(c.nuevo) + '"' + (c.nuevo === d.propuesto ? ' selected' : '') + '>'
            + e2(c.display) + ' · ' + c.coinciden + ' de ' + c.de + ' a la misma hora</option>').join('')
        + plan.libres.filter(l => !vistos.has(l.key)).map(l => '<option value="' + e2(l.key) + '">' + e2(l.display) + '</option>').join('');
    };
    const cap = document.createElement('div');
    cap.className = 'modo-cap'; cap.id = 'lcOv';
    cap.innerHTML =
      '<div class="modo-caja" role="dialog" aria-modal="true" style="max-width:720px;text-align:left">'
    +   '<div class="modo-tit">Cambiar el libreto</div>'
    +   '<div class="modo-sub" style="margin-bottom:8px">' + e2(nombreArchivo || '') + '</div>'
    +   '<div class="dud-nota">' + plan.nuevos + ' personaje' + (plan.nuevos === 1 ? '' : 's') + ' en el libreto nuevo. '
    +     '<b>' + plan.pegan + ' talento' + (plan.pegan === 1 ? '' : 's') + '</b> se pega' + (plan.pegan === 1 ? '' : 'n')
    +     ' solo' + (plan.pegan === 1 ? '' : 's') + ' porque el personaje se llama igual.'
    +     (plan.dudosos.length
            ? ' Est' + (plan.dudosos.length === 1 ? 'e' : 'os') + ' <b>' + plan.dudosos.length + '</b> ya no está'
              + (plan.dudosos.length === 1 ? '' : 'n') + ' con su nombre: marca los que sean el mismo personaje.'
              + (plan.desfase == null ? ' Los dos libretos no se han podido comparar por timecode, así que no se propone a nadie.' : '')
            : '')
    +   '</div>'
    +   (plan.dudosos.length
          ? '<div class="dud-lista lc-lista">' + plan.dudosos.map((d, i) =>
              '<div class="lc-fila" data-i="' + i + '">'
            +   '<label class="lc-si"><input type="checkbox" class="lc-ok" data-i="' + i + '"' + (d.propuesto ? '' : ' disabled') + '> Sí, es el mismo</label>'
            +   '<div class="lc-txt"><b>' + e2(d.display) + '</b> <span class="dud-tal">' + e2(d.talent) + '</span>'
            +     '<div class="lc-es">en el libreto nuevo es <select class="lc-sel" data-i="' + i + '">' + opciones(d) + '</select></div>'
            +     '<div class="lc-prueba" data-i="' + i + '">' + e2(lcPrueba(d.candidatos.find(c => c.nuevo === d.propuesto))) + '</div>'
            +   '</div></div>').join('') + '</div>'
          : '')
    +   '<div class="dud-btns">'
    +     '<button class="modo-op dud-b" id="lcNo">Cancelar</button>'
    +     (plan.dudosos.some(d => d.propuesto) ? '<button class="modo-op dud-b" id="lcTodos">Marcar los propuestos</button>' : '')
    +     '<button class="modo-op dud-b dud-ok" id="lcOk">Cambiar el libreto</button>'
    +   '</div>'
    + '</div>';
    document.body.appendChild(cap);
    const q = (s) => Array.prototype.slice.call(cap.querySelectorAll(s));
    q('select.lc-sel').forEach(sel => {
      sel.onchange = () => {
        const i = +sel.dataset.i, d = plan.dudosos[i];
        const caja = cap.querySelector('input.lc-ok[data-i="' + i + '"]');
        const prueba = cap.querySelector('.lc-prueba[data-i="' + i + '"]');
        /* Otra pareja es otra pregunta: la marca de antes no vale para esta. */
        caja.checked = false; caja.disabled = !sel.value;
        prueba.textContent = sel.value
          ? lcPrueba(d.candidatos.find(c => c.nuevo === sel.value) || { coinciden: 0, de: (plan.libres.find(l => l.key === sel.value) || {}).ints || 0, muestras: [] })
          : lcPrueba(null);
      };
    });
    const fin = (v) => { cap.remove(); resolve(v); };
    const todos = cap.querySelector('#lcTodos');
    if(todos) todos.onclick = () => q('input.lc-ok').forEach(c => { if(!c.disabled) c.checked = true; });
    cap.querySelector('#lcNo').onclick = () => fin(null);
    cap.querySelector('#lcOk').onclick = () => {
      const out = [];
      q('input.lc-ok').forEach(c => {
        const i = +c.dataset.i, sel = cap.querySelector('select.lc-sel[data-i="' + i + '"]');
        if(c.checked && sel && sel.value) out.push({ viejo: plan.dudosos[i].viejo, nuevo: sel.value });
      });
      fin(out);
    };
  });
}

/** Lo que hay en memoria del capítulo, para poder volver si se cancela. */
function lcFoto(){
  return { chars: chars, charIdx: charIdx, script: script, scriptByKey: scriptByKey, numPages: numPages,
           tcIndex: tcIndex, pdfName: pdfName, xlsFileName: xlsFileName, pdfDoc: pdfDoc,
           lastPdfBuf: lastPdfBuf, lastXlsBuf: lastXlsBuf, pageData: pageData, occByChar: occByChar,
           charMarks: charMarks, progress: progress, currentEp: currentEp,
           charsRaw: window._charsRaw, scriptW: window._script, adFormat: window._adFormat,
           traducido: window._libTraducido, dataEpId: window._dataEpId };
}

/** Deja el capítulo como estaba en la foto. */
function lcRestaurar(f){
  chars = f.chars; charIdx = f.charIdx; script = f.script; scriptByKey = f.scriptByKey; numPages = f.numPages;
  tcIndex = f.tcIndex; pdfName = f.pdfName; xlsFileName = f.xlsFileName; pdfDoc = f.pdfDoc;
  lastPdfBuf = f.lastPdfBuf; lastXlsBuf = f.lastXlsBuf; pageData = f.pageData; occByChar = f.occByChar;
  charMarks = f.charMarks; progress = f.progress; currentEp = f.currentEp;
  window._charsRaw = f.charsRaw; window._script = f.scriptW; window._adFormat = f.adFormat;
  window._libTraducido = f.traducido; window._dataEpId = f.dataEpId;
}

/**
 * Sube el libreto nuevo a la nube en el sitio del viejo.
 *
 * El capítulo apunta a sus archivos por dos rutas -el Excel y el PDF-. Si el
 * nuevo es un PDF y el viejo era la lista en Excel, la ruta del Excel se
 * QUITA: si se quedara, al abrir el capítulo en otro equipo se volvería a
 * leer la lista vieja encima del libreto nuevo. Devuelve `{ ok, causa }`.
 */
async function lcSubir(){
  if(!(typeof currentEp !== 'undefined' && currentEp && currentEp.id))
    return { ok: false, causa: 'el capítulo no está guardado en un programa' };
  const epId = currentEp.id;
  const showId = currentEp.showId || ((typeof LDB !== 'undefined' && LDB) ? LDB.showId : null);
  const base = showId + '/' + epId + '/';
  const fila = { updated_at: new Date().toISOString(), xls_path: null, xls_name: null, pdf_path: null, pdf_name: null };
  try{
    if(lastPdfBuf){
      const { error } = await sb.storage.from('libretos').upload(base + 'libreto.pdf', new Blob([lastPdfBuf]),
                                                                  { upsert: true, contentType: 'application/pdf' });
      if(error) return { ok: false, causa: 'no se pudo subir el PDF: ' + error.message };
      fila.pdf_path = base + 'libreto.pdf'; fila.pdf_name = pdfName;
    }
    if(lastXlsBuf){
      const { error } = await sb.storage.from('libretos').upload(base + 'desglose.xlsm', new Blob([lastXlsBuf]), { upsert: true });
      if(error) return { ok: false, causa: 'no se pudo subir el Excel: ' + error.message };
      fila.xls_path = base + 'desglose.xlsm'; fila.xls_name = xlsFileName;
    }
    const { error } = await sb.from('episodes').update(fila).eq('id', epId);
    if(error) return { ok: false, causa: 'no se pudo actualizar el capítulo: ' + error.message };
    /* Lo que ya no se usa se quita DESPUÉS de que el capítulo deje de apuntarlo. */
    const sobran = [];
    if(!lastXlsBuf) sobran.push(base + 'desglose.xlsm');
    if(!lastPdfBuf) sobran.push(base + 'libreto.pdf');
    if(sobran.length){
      try{ await sb.storage.from('libretos').remove(sobran); }
      catch(e){ fallo('sb.storage.remove · js/cambiolibreto.js:lcSubir', e); }
    }
    const okData = await epDataUpsert(epId, showId);
    try{
      await idbDel('ep:' + epId);
      const stamp = await epStamp({ id: epId, show_id: showId, xls_path: fila.xls_path, pdf_path: fila.pdf_path });
      await saveEpCache(epId, stamp);
      const nf = { stamp: stamp, xls_name: fila.xls_name, pdf_name: fila.pdf_name };
      if(lastXlsBuf) nf.xls = lastXlsBuf;
      if(lastPdfBuf) nf.pdf = lastPdfBuf;
      if(nf.xls || nf.pdf) await idbSet('ddl-files::' + epId, nf); else await idbDel('ddl-files::' + epId);
    }catch(e){ fallo('la copia local · js/cambiolibreto.js:lcSubir', e); }
    try{ await libFetchAll(); }catch(e){ fallo('libFetchAll · js/cambiolibreto.js:lcSubir', e); }
    try{ if(typeof libPing === 'function') libPing('ep', epId, showId); }catch(e){ fallo('libPing · js/cambiolibreto.js:lcSubir', e); }
    return okData ? { ok: true, causa: '' } : { ok: false, causa: 'el libreto no subió a la base de datos' };
  }catch(e){
    return { ok: false, causa: String((e && e.message) || e) };
  }
}

/** El resumen de lo que se ha hecho, en un renglón. */
function lcResumen(res){
  const n = res.porNombre + res.confirmados;
  let t = '📥 Libreto cambiado · ' + n + ' talento' + (n === 1 ? '' : 's') + ' pegado' + (n === 1 ? '' : 's');
  if(n) t += ' (' + res.porNombre + ' por nombre' + (res.confirmados ? ', ' + res.confirmados + ' confirmado' + (res.confirmados === 1 ? '' : 's') : '') + ')';
  if(res.sinPegar.length)
    t += ' · sin pegar: ' + res.sinPegar.slice(0, 4).map(x => x.display + ' (' + x.talent + ')').join(', ')
       + (res.sinPegar.length > 4 ? '…' : '');
  return t;
}

/**
 * Todo el camino: lee el archivo nuevo, casa los personajes, pregunta, y solo
 * si se dice que sí cambia el libreto, pega los talentos y lo sube. Si se
 * cancela o el archivo no trae libreto, el capítulo queda como estaba.
 *
 * `preguntar` es quien pregunta por las parejas dudosas: la ventana, si no se
 * dice otra cosa. Se puede pasar otro para probar el camino sin pantalla.
 */
async function libCambiar(file, preguntar){
  if(!file) return false;
  if(!chars || !chars.length || !script || !script.length){ castAviso('⚠️ Abre primero el capítulo al que le vas a cambiar el libreto'); return false; }
  const antes = lcFoto();
  const viejo = { chars: antes.chars, script: antes.script };
  const volver = (aviso) => {
    lcRestaurar(antes);
    try{ gestOlvidar(); }catch(e){ /* sin el barrido de gestos no hay nada que olvidar */ }
    try{ rebuild(); }catch(e){ fallo('rebuild · js/cambiolibreto.js:libCambiar', e); }
    try{ libTraducidoPintar(); }catch(e){ /* sin barra de casting no hay botón */ }
    if(aviso) castAviso(aviso);
    return false;
  };
  try{
    /* Vacío de verdad antes de leer: lo que quede de la lista -su Excel en
       memoria- se subiría después como si fuera del libreto nuevo. */
    lastXlsBuf = null; lastPdfBuf = null; pageData = {}; tcIndex = [];
    await loadFileForEp(file);
    currentEp = antes.currentEp;                 // leer un Excel suelta el capítulo: sigue siendo este
  }catch(e){
    fallo('loadFileForEp · js/cambiolibreto.js:libCambiar', e);
    return volver('⚠️ No se pudo leer «' + file.name + '». El capítulo queda como estaba.');
  }
  if(!script || !script.length || !chars || !chars.length)
    return volver('⚠️ «' + file.name + '» no trae un libreto con personajes. El capítulo queda como estaba.');

  const plan = lcCasar(viejo, { chars: chars, script: script });
  const confirmados = await (preguntar || lcPreguntar)(plan, file.name);
  if(!confirmados) return volver('Libreto sin cambiar: el capítulo queda como estaba.');

  const res = lcAplicar(viejo.chars, plan, confirmados);
  window._libTraducido = true;                   // para eso se sube: ya hay libreto
  window._cotejo = {};                           // el análisis de cambios era del libreto anterior
  try{ gestOlvidar(); }catch(e){ /* ídem */ }
  try{ castGemelosAlDia(); }catch(e){ fallo('castGemelosAlDia · js/cambiolibreto.js:libCambiar', e); }
  try{ if(typeof talMarcarSiempreX === 'function') talMarcarSiempreX(); }catch(e){ fallo('talMarcarSiempreX · js/cambiolibreto.js:libCambiar', e); }
  try{ gestMarcarTodos(); }catch(e){ fallo('gestMarcarTodos · js/cambiolibreto.js:libCambiar', e); }
  try{ rebuild(); }catch(e){ fallo('rebuild · js/cambiolibreto.js:libCambiar', e); }
  try{ renderCards(); }catch(e){ fallo('renderCards · js/cambiolibreto.js:libCambiar', e); }
  try{ libTraducidoPintar(); }catch(e){ /* ídem */ }
  try{ if(typeof pop2 !== 'undefined' && pop2.doc) refreshOpenLibretoForEpisode(); }catch(e){ fallo('refreshOpenLibretoForEpisode · js/cambiolibreto.js:libCambiar', e); }
  castAviso(lcResumen(res));
  if(currentEp && currentEp.id){
    const sub = await lcSubir();
    if(!sub.ok) castAviso('⚠️ El libreto está cambiado en este equipo, pero no se ha guardado en la nube: ' + sub.causa);
    try{ castRegAnotarPronto(); }catch(e){ /* el registro del programa se apunta en la siguiente asignación */ }
  }
  try{ gestAvisar(); }catch(e){ /* ídem */ }
  try{ castAvisarChoquesTodos(); }catch(e){ /* ídem */ }
  return res;
}

/* ═══ FIN DE CAMBIAR EL LIBRETO ════════════════════════════════════════════ */
