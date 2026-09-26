import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Fail the build if Firebase env vars are missing. Deploying a bundle built
// without them produces a blank site (auth/invalid-api-key at runtime).
const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of REQUIRED_ENV) {
    if (!env[key]) {
      throw new Error(
        `Missing ${key}. Copy .env.example to .env and fill in the Firebase values before building.`,
      )
    }
  }
  return {
    plugins: [react(), tailwindcss(), {
      name: 'public-tv-offline-shell',
      generateBundle(_options, bundle) {
        const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).map(name => `/${name}`)
        const cache = `salafic-shell-${Date.now()}`
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(['/index.html', ...assets])};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('salafic-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && /^\\/c\\/[^/]+\\/tv\\/?$/.test(url.pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
  }
});` })
      },
    }],
  }
})
