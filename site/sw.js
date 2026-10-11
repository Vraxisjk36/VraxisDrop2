// Offline app shell only. Never persist invitation URLs, pickup codes, or user content.
const CACHE="vraxis-shell-v2";
const SHELL=["./","./index.html","./connect.html","./retrieve.html","./about.html","./style.css","./icon.svg","./manifest.webmanifest"];
const scopePath=new URL(self.registration.scope).pathname;
const allowed=new Set(SHELL.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("vraxis-shell-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(scopePath))return;
 // Never intercept URLs carrying room invitations, drop codes, or other parameters.
 if(url.search||url.hash||!allowed.has(url.pathname))return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok&&response.type==="basic"){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)))}
  return response;
 }).catch(async()=>{const cached=await caches.match(request);return cached||Response.error()}));
});
