const CACHE_NAME = 'clarity-shell-v4'
const BASE = new URL('./', self.location).pathname
const SHELL_URL = `${BASE}index.html`
const STATIC_URLS = ['', 'manifest.json', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'data/cmed.json', 'data/cmed-eans.json'].map(
  (path) => `${BASE}${path}`,
)
const ASSET_PATTERN = /(?:src|href)="([^"]*\/assets\/[^"]+)"/g
const CSS_URL_PATTERN = /url\(([^)"']*\/assets\/[^)"']+)\)/g

const collect = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1])

const precache = async () => {
  const cache = await caches.open(CACHE_NAME)
  const shellResponse = await fetch(SHELL_URL, { cache: 'reload' })
  const html = await shellResponse.clone().text()
  await cache.put(SHELL_URL, shellResponse.clone())
  await cache.put(BASE, shellResponse)

  const assets = collect(html, ASSET_PATTERN)
  const styles = assets.filter((url) => url.endsWith('.css'))
  const nested = await Promise.all(
    styles.map(async (url) => {
      const response = await fetch(url)
      await cache.put(url, response.clone())
      return collect(await response.text(), CSS_URL_PATTERN)
    }),
  )

  const rest = [...new Set([...assets.filter((url) => !url.endsWith('.css')), ...nested.flat(), ...STATIC_URLS.slice(1)])]
  await Promise.all(rest.map((url) => cache.add(url).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const networkFirstShell = async (request) => {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(SHELL_URL, response.clone())
    return response
  } catch {
    return (await cache.match(SHELL_URL)) ?? Response.error()
  }
}

const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request))
    return
  }
  event.respondWith(cacheFirst(request))
})
