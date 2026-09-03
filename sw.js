// Service Worker · Dubbipt  (VERSION autogenerada en cada build)
const VERSION = '2026-09-03T15:29';
const CACHE   = 'dubbipt-' + VERSION;

const SHELL = [
  './', './config.js', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/dist/umd/supabase.js'
];

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req)) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    // Guardar puede fallar por mil motivos -respuesta parcial 206, cuota llena,
    // respuesta opaca- y eso NO puede tumbar la peticion: se guarda si se puede
    // y se devuelve la respuesta igualmente.
    if (res && res.ok && res.status === 200) {
      try { cache.put(req, res.clone()).catch(() => {}); } catch (e) {}
    }
    return res;
  }).catch(err => {
    // Sin copia en cache hay que propagar el error de verdad. Devolver `hit`
    // valiendo undefined hacia que el navegador respondiera "Failed to fetch".
    if (hit) return hit;
    throw err;
  });
  return hit || net;
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.includes('supabase') || /\/(rest|auth|storage|realtime)\//.test(url.pathname)) return;

  // Solo se gestiona lo NUESTRO y las librerias fijadas de arriba. Todo lo
  // demas que salga a la red -por ejemplo el modelo de voz, que baja en trozos
  // y pesa decenas de MB- se deja pasar al navegador sin tocarlo. Meterlo en
  // la cache no aporta nada y rompia la descarga.
  if (url.origin !== self.location.origin && SHELL.indexOf(req.url) < 0) return;

  // peticiones por rango: la cache no las admite, van directas
  if (req.headers.get('range')) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/config.js')) {
    e.respondWith(networkFirst(req));
    return;
  }

  e.respondWith(staleWhileRevalidate(req));
});
