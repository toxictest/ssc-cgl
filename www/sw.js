const C="sscmentor-v1";const A=["./","./index.html","./css/app.css","./data/syllabus.js","./data/lessons.js","./data/questions.js","./data/vocab.js","./js/store.js","./js/engine.js","./js/planner.js","./js/mock.js","./js/ui.js","./js/practice.js","./js/views.core.js","./js/views.more.js","./js/app.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
