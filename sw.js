const CACHE="gaming-studio-j-v6";
const CORE=["./","./index.html","./lobby.html","./assets/styles.css?v=3","./assets/app.js?v=3","./assets/lobby.css?v=1","./assets/lobby.js?v=2","./assets/learning-engine.js?v=2","./assets/learning-worlds.css?v=2","./assets/logo.svg","./assets/mr-melon-cover.svg","./assets/mr-melon-icon.svg","./assets/spelling-bee-cover.svg","./assets/spelling-bee-icon.svg","./assets/science-explorers-cover.svg","./assets/science-explorers-icon.svg","./assets/community-quest-cover.svg","./assets/community-quest-icon.svg","./games/spelling-bee/index.html","./games/spelling-bee/spelling-bee.css?v=8","./games/spelling-bee/spelling-bee.js?v=9","./games/island-science-explorers/index.html","./games/island-science-explorers/game.js?v=3","./games/caribbean-community-quest/index.html","./games/caribbean-community-quest/game.js?v=3","./assets/icon-192.png","./assets/icon-512.png","./data/catalog.json","./data/curriculum-grade2.json"];
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
