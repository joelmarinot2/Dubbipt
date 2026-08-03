// Service worker · Desglose Digital de Libreto v11 (archivo único)
const CACHE='ddl-v14';
const SHELL=[
  './','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  // Abrir la app → red primero (trae versiones nuevas), respaldo en caché
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put('./',cp).catch(()=>{}));return r;}).catch(()=>caches.match('./')));
    return;
  }
  // Datos en vivo (Supabase) → siempre red, nunca caché
  if(url.hostname.includes('supabase')||url.pathname.includes('/rest/')||url.pathname.includes('/auth/')||url.pathname.includes('/storage/')||url.pathname.includes('/realtime/'))return;
  // Resto → caché primero, luego red
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});return r;}).catch(()=>hit)));
});
