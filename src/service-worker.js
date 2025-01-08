/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const EXCLUDED_PATHS = ['/v1/feeds', '/v1/categories'];

const CACHE = `fluxcast-${version}`;

const ASSETS = [
	'/', // The shell/entry point
	...build, // the app itself
	...files // everything in `static`
];

// ===================
// == Caching logic ==
// ===================

const addResourcesToCache = async () => {
	const cache = await caches.open(CACHE);
	await cache.addAll(ASSETS);
};

const putInCache = async (request, response) => {
	const cache = await caches.open(CACHE);
	await cache.put(request, response);
};

const deleteOldCaches = async () => {
	const keys = await caches.keys();
	return Promise.all(
		keys.map((key) => {
			if (key !== CACHE) {
				return caches.delete(key);
			}
		})
	);
};

const shouldCache = (url) => {
	const urlObj = new URL(url);
	return !EXCLUDED_PATHS.some((path) => urlObj.pathname.includes(path));
};

// =====================
// == Fetch logic ======
// =====================

// cache, then preload, then network
const handleRequest = async ({ request, preloadResponsePromise }) => {
	if (!shouldCache(request.url)) {
		console.log('Request not cached', request.url);
		return fetch(request);
	}

	const responseFromCache = await caches.match(request);
	if (responseFromCache) {
		console.log('Response from cache', request.url);
		return responseFromCache;
	}

	// const preloadResponse = await preloadResponsePromise;
	// if (preloadResponse) {
	// 	console.log('Response from preload', request.url);
	// 	putInCache(request, preloadResponse.clone());
	// 	return preloadResponse;
	// }

	try {
		console.log('Fetching request', request.url);

		const response = await fetch(request);

		if (response.ok) {
			console.log('Response from network', request.url);
			putInCache(request, response.clone());
		}

		return response;
	} catch (err) {
		console.log('Fetching request failed', request.url);

		// If the request is a navigation request, return the shell
		if (request.mode === 'navigate') {
			console.log('Navigation request, returning shell', request.url);
			return caches.match('/');
		}

		throw err; // Let other request types fail normally
	}
};

const enableNavigationPreload = async () => {
	if (sw.registration.navigationPreload) {
		console.log('Enabling navigation preload');
		await sw.registration.navigationPreload.enable();
	}
};

// =====================
// == Event listeners ==
// =====================

sw.addEventListener('install', (event) => {
	console.log('Service worker installing...');
	event.waitUntil(Promise.all([addResourcesToCache(), sw.skipWaiting()]));
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		handleRequest({
			request: event.request,
			preloadResponsePromise: event.preloadResponse
		})
	);
});

sw.addEventListener('activate', (event) => {
	console.log('Service worker activating...');
	event.waitUntil(Promise.all([deleteOldCaches(), enableNavigationPreload(), sw.clients.claim()]));
});
