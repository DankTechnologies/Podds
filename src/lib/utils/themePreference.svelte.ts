let isLightMode = $state(false);

export function getIsLightMode() {
    return isLightMode;
}

export function trackThemePreference() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    isLightMode = mediaQuery.matches;

    mediaQuery.addEventListener('change', (e) => {
        isLightMode = e.matches;
    });
} 