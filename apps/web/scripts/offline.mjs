import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
const root = "dist/client";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name)
      )
    )
  ).flat();
}
const names = (await files(root)).filter((name) => !name.endsWith("sw.js")).sort();
const digest = createHash("sha256");
for (const name of names) digest.update(await readFile(name));
const urls = names.map((name) => "/" + relative(root, name).replaceAll("\\", "/"));
await writeFile(
  join(root, "sw.js"),
  `const cacheName='eknow-shell-${digest.digest("hex").slice(0, 12)}';
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(${JSON.stringify(urls)})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('eknow-shell-')&&key!==cacheName).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(event.request.mode==='navigate'?'/index.html':event.request))||fetch(event.request)));});`
);
