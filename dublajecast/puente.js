/* El puente de DublajeCast a Dubbipt · especificacion 09, PRO-10
 *
 * Este archivo es de Dubbipt: `local/traer-dublajecast.js` copia DublajeCast
 * al lado y no lo toca. Pinta, dentro de cada programa de DublajeCast, la
 * barra «Herramientas de Dubbipt»: abrir ese programa o uno de sus capítulos
 * en Dubbipt, en el perfil que se quiera, la base de talentos y la caja de
 * herramientas.
 *
 * No hace nada por sí mismo: le pide a Dubbipt -la ventana que lo contiene,
 * del mismo sitio- que lo haga, con un mensaje. Fuera de Dubbipt (abierto
 * suelto) la barra no se pinta.
 */
(function(){
  'use strict';
  const h = (window.React && React.createElement) || null;
  const dentro = (function(){ try{ return window.parent && window.parent !== window && window.parent.location.origin === location.origin; }catch(e){ return false; } })();

  /** Pide algo a Dubbipt. */
  function pedir(accion, datos){
    if(!dentro) return false;
    window.parent.postMessage(Object.assign({ fuente: 'dublajecast', accion: accion }, datos || {}), location.origin);
    return true;
  }
  window.dubbiptPedir = pedir;

  /* Lo que Dubbipt contesta, a quien lo esté esperando. */
  const oyentes = new Set();
  window.addEventListener('message', function(e){
    if(e.origin !== location.origin || e.source !== window.parent) return;
    const d = e.data;
    if(!d || d.fuente !== 'dubbipt') return;
    oyentes.forEach(function(f){ try{ f(d); }catch(x){ /* un oyente roto no para a los demás */ } });
  });

  if(!h || !dentro) return;
  const { useState, useEffect } = React;

  const B = { background: 'rgba(34,197,94,.12)', color: '#86efac', border: '1px solid rgba(34,197,94,.35)', borderRadius: 9,
              padding: '6px 11px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
  const BP = Object.assign({}, B, { background: '#22C55E', color: '#06210f', border: '1px solid #22C55E' });

  function DubbiptBarra(props){
    const serie = props.serie || {}, episodios = props.episodios || [];
    const [estado, setEstado] = useState(null);       // { existe, nombre } que dice Dubbipt
    const [aviso, setAviso] = useState('');
    const [cap, setCap] = useState('');
    const [perfil, setPerfil] = useState('casting');

    useEffect(function(){
      const f = function(d){
        if(d.programa !== serie.name) return;
        if(d.tipo === 'estado') setEstado({ existe: !!d.existe, nombre: d.nombre || '' });
        if(d.tipo === 'aviso') setAviso(d.texto || '');
      };
      oyentes.add(f);
      setEstado(null); setAviso('');
      pedir('consulta', { programa: serie.name });
      return function(){ oyentes.delete(f); };
    }, [serie.name]);

    const caps = episodios.slice().sort(function(a, b){ return (+a.episode_number || 0) - (+b.episode_number || 0); });
    const capElegido = caps.find(function(e){ return String(e.id) === cap; });
    const abrirPrograma = function(){ setAviso(''); pedir('programa', { programa: serie.name, perfil: perfil }); };
    const abrirCapitulo = function(){
      if(!capElegido) return;
      setAviso('');
      pedir('capitulo', { programa: serie.name, perfil: perfil, numero: capElegido.episode_number, titulo: capElegido.title || '' });
    };

    return h('div', { className: 'dubbipt-barra', style: { gridColumn: '1 / -1', border: '1px solid rgba(34,197,94,.35)', borderRadius: 12,
                padding: '10px 12px', marginBottom: 14, background: 'rgba(34,197,94,.05)', display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('b', { style: { fontSize: 12, color: '#86efac', letterSpacing: '.04em', textTransform: 'uppercase' } }, 'Herramientas de Dubbipt'),
        h('span', { style: { fontSize: 11.5, color: 'var(--text-secondary, #9aa3b5)' } },
          estado == null ? 'buscando el programa en Dubbipt…'
          : estado.existe ? ('✓ en Dubbipt' + (estado.nombre && estado.nombre !== serie.name ? ' como «' + estado.nombre + '»' : ''))
          : 'este programa todavía no está en Dubbipt'),
        h('label', { style: { marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-secondary, #9aa3b5)', display: 'flex', alignItems: 'center', gap: 6 } },
          'Perfil',
          h('select', { value: perfil, onChange: function(e){ setPerfil(e.target.value); },
                        style: { background: '#11131a', color: '#e7ebf3', border: '1px solid #2b3040', borderRadius: 8, padding: '4px 6px', fontSize: 11.5 } },
            h('option', { value: 'casting' }, 'Casting'), h('option', { value: 'qc' }, 'QC'), h('option', { value: 'grabacion' }, 'Grabación')))),
      estado && !estado.existe
        ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { className: 'dc-btn', style: BP, onClick: function(){ pedir('crear', { programa: serie.name }); } }, '＋ Crear «' + serie.name + '» en Dubbipt'))
        : h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
            h('button', { className: 'dc-btn', style: BP, onClick: abrirPrograma, disabled: !estado }, '📂 Abrir el programa en Dubbipt'),
            h('select', { value: cap, onChange: function(e){ setCap(e.target.value); },
                          style: { background: '#11131a', color: '#e7ebf3', border: '1px solid #2b3040', borderRadius: 8, padding: '5px 6px', fontSize: 11.5, maxWidth: 220 } },
              h('option', { value: '' }, caps.length ? 'Elegir capítulo…' : 'Sin capítulos'),
              caps.map(function(e){ return h('option', { key: e.id, value: String(e.id) }, (e.episode_number != null ? e.episode_number + ' · ' : '') + (e.title || '')); })),
            h('button', { className: 'dc-btn', style: B, onClick: abrirCapitulo, disabled: !capElegido || !estado }, '▶ Abrir capítulo')),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h('button', { className: 'dc-btn', style: B, onClick: function(){ pedir('talentos', { programa: serie.name }); } }, '🎭 Base de talentos'),
        h('button', { className: 'dc-btn', style: B, onClick: function(){ pedir('herramientas', { programa: serie.name }); } }, '🧰 Herramientas'),
        h('button', { className: 'dc-btn', style: B, onClick: function(){ pedir('produccion', { programa: serie.name }); } }, '📦 Resumen de producción')),
      aviso ? h('div', { style: { fontSize: 11.5, color: '#FBBF24' } }, aviso) : null);
  }
  window.DubbiptBarra = DubbiptBarra;
})();
