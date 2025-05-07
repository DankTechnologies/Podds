export function getHelperUrl(helper: string): string {
    if (helper.includes('://'))
        return helper;

    // In web workers, self is defined but window is not
    // In main thread, both are defined
    const location = typeof window === 'undefined' ? self.location : window.location;
    const protocol = location.protocol;
    const host = location.host;

    const baseDomain = getBaseDomain(host);
    return `${protocol}//${helper}.${baseDomain}`;
}

function getBaseDomain(hostname: string): string {
    const parts = hostname.split('.');

    if (parts.length < 2)
        return hostname;

    // Get the last two parts (domain and TLD)
    const domain = parts.slice(-2).join('.');

    return domain;
}
