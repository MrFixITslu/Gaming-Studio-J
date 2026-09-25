const CACHE="gaming-studio-j-v3";
const CORE=["./","./index.html","./lobby.html","./assets/styles.css?v=3","./assets/app.js?v=3","./assets/lobby.css?v=1","./assets/lobby.js?v=1","./assets/logo.svg","./assets/mr-melon-cover.svg","./assets/mr-melon-icon.svg","./assets/icon-192.png","./assets/icon-512.png","./data/catalog.json"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener("activate",e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  if(u.pathname.startsWith("/api/")||u.pathname.startsWith("/socket.io/"))return;
  if(u.pathname.endsWith("/data/catalog.json")||u.pathname.endsWith(".html")||u.pathname.endsWith("/")){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;
  }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r})));
});
