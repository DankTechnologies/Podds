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
	// Serve the cached shell for navigation requests
	if (request.mode === 'navigate') {
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

	// Handle Range requests for media files
	if (request.headers.get('range')) {
		console.log('Handling range request:', request.url);
		const cache = await caches.open(MP3_CACHE);
		const cachedResponse = await cache.match(request);

		if (cachedResponse) {
			const rangeHeader = request.headers.get('range');
			const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
			if (rangeMatch) {
				const start = parseInt(rangeMatch[1], 10);
				const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;

				const blob = await cachedResponse.blob();
				const slicedBlob = blob.slice(start, end + 1);

				return new Response(slicedBlob, {
					status: 206,
					statusText: 'Partial Content',
					headers: {
						'Content-Type': cachedResponse.headers.get('Content-Type'),
						'Content-Range': `bytes ${start}-${end || blob.size - 1}/${blob.size}`,
						'Accept-Ranges': 'bytes'
					}
				});
			}
		}

		console.log('Range request not cached, falling back to network:', request.url);
		return fetch(request);
	}

	// Static asset handling
	if (ASSETS.includes(new URL(request.url).pathname)) {
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
	if (request.destination === 'audio') {
		console.log('Fetching MP3 resource:', request.url);
		const networkResponse = await fetch(request);

		try {
			await putInCache(MP3_CACHE, request, networkResponse.clone());
		} catch (err) {
			console.error('Failed to cache MP3 resource:', request.url, err);
		}

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
	event.waitUntil(addResourcesToCache().then(() => self.skipWaiting()));
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
	event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});
