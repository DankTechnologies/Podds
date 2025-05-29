let online = $state(navigator.onLine);

export function isOnline() {
    return online;
}

export function trackNetworkState() {
    window.addEventListener('online', () => {
        online = true;
    });

    window.addEventListener('offline', () => {
        online = false;
    });
} 