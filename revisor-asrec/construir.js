/* Construye revisor-asrec.html · un solo archivo que funciona sin internet
 *
 *   node revisor-asrec/construir.js
 *
 * Junta tres cosas en la raíz del repositorio:
 *
 *   plantilla.html  la pantalla
 *   motor.js        las reglas (se prueba en pruebas/revisorasrec.prueba.js)
 *   diccionario/    el de LibreOffice en español (Hunspell), ya expandido
 *
 * El diccionario de Hunspell son raíces con banderas de afijos («cantar/RED»).
 * Comprobar con afijos en el navegador obliga a meter un motor de Hunspell;
 * expandirlo aquí, una vez, deja una lista de palabras que cabe en un Set. Son
 * unas 660 000 formas y, comprimidas, 1,6 MB: el precio de no depender de nada.
 *
 * Van en dos listas. La de México es la base. Lo que solo trae la de España
 * va aparte, porque ahí están casi todas las formas de «vosotros»: en un
 * doblaje latinoamericano una de esas es un aviso, no una palabra correcta.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const AQUI = __dirname;
const RAIZ = path.join(AQUI, '..');
const SALIDA = path.join(RAIZ, 'revisor-asrec.html');

/** Las reglas PFX/SFX del .aff. Este diccionario no usa clases de
 *  continuación, así que basta con un nivel de prefijo y uno de sufijo. */
function leerAfijos(archivo){
  const reglas = {};
  const L = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
  for(let i = 0; i < L.length; i++){
    const t = L[i].trim().split(/\s+/);
    if(t.length !== 4 || (t[0] !== 'PFX' && t[0] !== 'SFX') || !/^[YN]$/.test(t[2])) continue;
    const [tipo, bandera, cruza, n] = t;
    const lista = [];
    for(let j = 1; j <= +n; j++){
      const u = L[i + j].trim().split(/\s+/);
      const quita = u[2] === '0' ? '' : u[2];
      let pone = u[3].split('/')[0];
      if(pone === '0') pone = '';
      const cond = u[4] || '.';
      lista.push({ quita, pone, cond: new RegExp(tipo === 'PFX' ? '^' + cond : cond + '$', 'u') });
    }
    reglas[bandera] = { tipo, cruza: cruza === 'Y', lista };
    i += +n;
  }
  return reglas;
}

function aplicar(regla, w){
  const out = [];
  for(const r of regla.lista){
    if(!r.cond.test(w)) continue;
    if(regla.tipo === 'SFX'){
      if(r.quita && !w.endsWith(r.quita)) continue;
      out.push(w.slice(0, w.length - r.quita.length) + r.pone);
    }else{
      if(r.quita && !w.startsWith(r.quita)) continue;
      out.push(r.pone + w.slice(r.quita.length));
    }
  }
  return out;
}

function expandir(aff, dic){
  const reglas = leerAfijos(aff);
  const palabras = new Set();
  const L = fs.readFileSync(dic, 'utf8').split(/\r?\n/).slice(1);
  for(const linea of L){
    const s = linea.trim();
    if(!s) continue;
    const barra = s.indexOf('/');
    const w = barra < 0 ? s.split(/\s+/)[0] : s.slice(0, barra);
    const banderas = barra < 0 ? '' : s.slice(barra + 1).split(/\s+/)[0];
    palabras.add(w);
    const sufijos = [], prefijos = [];
    for(const b of banderas){
      const r = reglas[b];
      if(r) (r.tipo === 'SFX' ? sufijos : prefijos).push(r);
    }
    const conSufijo = [];
    for(const r of sufijos) for(const f of aplicar(r, w)){ palabras.add(f); if(r.cruza) conSufijo.push(f); }
    for(const r of prefijos){
      for(const f of aplicar(r, w)) palabras.add(f);
      if(r.cruza) for(const sf of conSufijo) for(const f of aplicar(r, sf)) palabras.add(f);
    }
  }
  return palabras;
}

const empaquetar = (lista) => zlib.gzipSync(Buffer.from(lista.join('\n'), 'utf8'), { level: 9 }).toString('base64');

const D = path.join(AQUI, 'diccionario');
const mx = expandir(path.join(D, 'es-MX.aff'), path.join(D, 'es-MX.dic'));
const es = expandir(path.join(D, 'es.aff'), path.join(D, 'es.dic'));
const base = Array.from(mx).sort();
const extra = Array.from(es).filter(w => !mx.has(w)).sort();

const motor = fs.readFileSync(path.join(AQUI, 'motor.js'), 'utf8');
const plantilla = fs.readFileSync(path.join(AQUI, 'plantilla.html'), 'utf8');
for(const marca of ['/*@@MOTOR@@*/', '@@DIC_BASE@@', '@@DIC_EXTRA@@'])
  if(!plantilla.includes(marca)) throw new Error('A plantilla.html le falta la marca ' + marca);
if(motor.includes('</script')) throw new Error('motor.js no puede llevar «</script» dentro');

/* Con funciones de reemplazo: un «$&» dentro del motor no debe interpretarse. */
const html = plantilla
  .replace('/*@@MOTOR@@*/', () => motor)
  .replace('@@DIC_BASE@@', () => empaquetar(base))
  .replace('@@DIC_EXTRA@@', () => empaquetar(extra));

fs.writeFileSync(SALIDA, html, 'utf8');
console.log('revisor-asrec.html · ' + base.length + ' + ' + extra.length + ' palabras · '
  + (fs.statSync(SALIDA).size / 1048576).toFixed(2) + ' MB');
