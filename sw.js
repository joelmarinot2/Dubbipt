// Service worker · Desglose Digital de Libreto v11
// Cachea el "cascarón" (HTML, módulos, iconos, librerías) para abrir rápido
// y offline. NUNCA cachea llamadas a Supabase (datos en vivo).

const CACHE = 'ddl-shell-v13';
const SHELL = [
  './',
  './config.js',
  './auth.js',
  './desglose-auto.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(()=> self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Abrir la app → red primero (trae versiones nuevas), respaldo en caché.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./', copy).catch(()=>{}));
        return res;
      }).catch(() => caches.match('./'))
    );
    return;
  }

  // Datos en vivo (Supabase, auth, storage) → siempre red.
  if (url.hostname.includes('supabase') || url.pathname.includes('/rest/') ||
      url.pathname.includes('/auth/') || url.pathname.includes('/storage/')) {
    return;
  }

  // config.js / auth.js → red primero (para reflejar cambios de claves o lógica).
  if (url.pathname.endsWith('/config.js') || url.pathname.endsWith('/auth.js')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Resto (librerías, iconos, fuentes) → caché primero, luego red.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => hit))
  );
});
