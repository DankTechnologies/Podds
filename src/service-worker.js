/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const STATIC_CACHE = `static-cache-v${version}`;
const MP3_CACHE = 'mp3-cache';

const ASSETS = [
	'/', // shell/entry point
	...build, // app bundle/chunks
	...files // Everything in `static`
];

// ===================
// == Caching logic ==
// ===================

const addResourcesToCache = async () => {
	const cache = await caches.open(STATIC_CACHE);
	await cache.addAll(ASSETS);
};

const putInCache = async (cacheName, request, response) => {
	const cache = await caches.open(cacheName);
	await cache.put(request, response);
};

const deleteOldCaches = async () => {
	const keys = await caches.keys();
	return Promise.all(
		keys.map((key) => {
			if (key !== STATIC_CACHE && key !== MP3_CACHE) {
				return caches.delete(key);
			}
		})
	);
};

// =====================
// == Fetch logic ======
// =====================

const handleRequest = async ({ request }) => {
	// Only handle static assets from our own origin
	const url = new URL(request.url);
	const isOwnOrigin = url.origin === self.location.origin;

	// Serve the cached shell for navigation requests from our origin
	if (request.mode === 'navigate' && isOwnOrigin) {
		console.log('Navigation request, serving cached shell:', request.url);
		const cachedShell = await caches.match('/');
		if (cachedShell) {
			return cachedShell;
		}

		console.error('Cached shell is missing! Falling back to network:', request.url);
		return fetch(request);
	}

	// Check if the request is already in any cache
	const responseFromCache = await caches.match(request);
	if (responseFromCache) {
		console.log('Serving from cache:', request.url);
		return responseFromCache;
	}

	// Static asset handling - only for our origin
	if (isOwnOrigin && ASSETS.includes(url.pathname)) {
		console.warn('Static asset not found in cache, fetching from network:', request.url);
		const networkResponse = await fetch(request);

		try {
			await putInCache(STATIC_CACHE, request, networkResponse.clone());
		} catch (err) {
			console.error('Failed to cache static asset:', request.url, err);
		}

		return networkResponse;
	}

	// MP3 caching logic
	if (url.href.endsWith('cacheAudio=true')) {
		console.log('Fetching MP3 resource:', request.url);

		// don't await the fetch, as that blocks playback until the full MP3 downloaded
		// without await, playback is immediate AND the mp3 downloads to the cache
		const networkResponse = fetch(request);

		networkResponse.then((response) => {
			putInCache(MP3_CACHE, request, response.clone()).catch((err) =>
				console.error('Failed to cache MP3 resource:', request.url, err)
			);
		});

		return networkResponse;
	}

	// Default: Use network-only strategy for other requests
	console.log('Default network fetch:', request.url);
	return fetch(request);
};

// =====================
// == Event listeners ==
// =====================

sw.addEventListener('install', (event) => {
	console.log('Service worker installing...');
	event.waitUntil(addResourcesToCache());
});

// This allows controlled updates via user interaction
sw.addEventListener('message', (event) => {
	console.log('Service worker received message:', event.data);
	if (event.data && event.data.type === 'SKIP_WAITING') {
		console.log('Calling skipWaiting()');
		sw.skipWaiting().then(() => {
			console.log('skipWaiting() completed!');
		});
	}
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		handleRequest({
			request: event.request
		})
	);
});

sw.addEventListener('activate', (event) => {
	console.log('Service worker activating...');
	event.waitUntil(
		Promise.all([
			deleteOldCaches(),
			self.clients.claim().then(() => {
				console.log('clients.claim() completed');
			})
		]).then(() => {
			console.log('Activation complete');
		})
	);
});
