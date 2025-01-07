/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `fluxcast-${version}`;

const ASSETS = [
	'/', // The shell/entry point
	...build, // the app itself
	...files // everything in `static`
];

self.addEventListener('install', (event) => {
	console.log('Service worker installing...');
	event.waitUntil(
		caches.open(CACHE).then((cache) => {
			return cache.addAll(ASSETS);
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys.map((key) => {
					if (key !== CACHE) return caches.delete(key);
				})
			);
		})
	);
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// For navigation requests, serve the shell (index.html)
		// This ensures SPA routing works offline
		if (event.request.mode === 'navigate') {
			const shellResponse = await cache.match('/');
			if (shellResponse) return shellResponse;
		}

		// For static assets in our ASSETS list
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) return cachedResponse;
		}

		try {
			const response = await fetch(event.request);

			if (response.ok) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;

			// For navigation requests that fail and aren't cached,
			// return the shell as a fallback
			if (event.request.mode === 'navigate') {
				return cache.match('/');
			}

			throw err;
		}
	}

	event.respondWith(respond());
});
