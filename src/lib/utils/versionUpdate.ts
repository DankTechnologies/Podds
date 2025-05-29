import { Log } from '../service/LogService';

/**
 * Monitors for service worker updates and calls callback when ready
 */
export function onUpdateReady(callback: () => void): void {
	if (!navigator.serviceWorker) {
		Log.warn('Service worker not supported in this browser');
		return;
	}

	// First check if there's already a waiting worker
	navigator.serviceWorker.getRegistration().then((registration) => {
		if (registration?.waiting) {
			Log.debug('Found waiting service worker on initial check');
			callback();
		}
	});

	navigator.serviceWorker.ready
		.then((registration) => {
			Log.debug('Service worker is ready');

			registration.addEventListener('updatefound', () => {
				Log.debug('Update found for service worker');
				const newWorker = registration.installing;

				if (!newWorker) {
					Log.warn('No installing service worker found');
					return;
				}

				// Use addEventListener instead of onstatechange
				newWorker.addEventListener('statechange', function () {
					Log.debug(`Service worker state changed to ${this.state}`);
					if (this.state === 'installed' && navigator.serviceWorker.controller) {
						Log.debug('New service worker ready to take over');
						callback();
					}
				});
			});
		})
		.catch((error) => {
			Log.error(`Error while setting up service worker monitoring: ${error}`);
		});
}

/**
 * Triggers the service worker to update and reload the page
 */
export function applyUpdate(): void {
	if (!navigator.serviceWorker?.controller) {
		Log.warn('No active service worker found to update');
		return;
	}

	Log.debug('Initiating service worker update');
	navigator.serviceWorker.getRegistration().then((registration) => {
		if (!registration) {
			Log.warn('No service worker registration found');
			return;
		}

		Log.debug(`Active worker state: ${registration.active?.state}`);
		Log.debug(`Waiting worker exists: ${!!registration.waiting}`);
		Log.debug(`Installing worker exists: ${!!registration.installing}`);

		if (!registration.waiting) {
			Log.warn('No waiting service worker found - nothing to update to');
			return;
		}

		let refreshing = false;
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			Log.debug('Service worker controller changing');
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		});

		// this needs to get sent to the new worker, not the one that got replaced
		// otherwise the controllerchange event doesnt fire and the page doesn't reload
		Log.debug('Sending SKIP_WAITING message to waiting worker');
		registration.waiting.postMessage({ type: 'SKIP_WAITING' });
	});
}
