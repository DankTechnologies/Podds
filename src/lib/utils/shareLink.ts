interface ShareConfig {
	host: string;
	apiKey: string;
	categories: string;
}

export function encodeShareLink(config: ShareConfig): string {
	const encoded = btoa(JSON.stringify(config));
	return `${window.location.origin}/settings#${encoded}`;
}

export function decodeShareLink(hash: string): ShareConfig {
	try {
		return JSON.parse(atob(hash));
	} catch {
		throw new Error('Invalid share link format');
	}
}
