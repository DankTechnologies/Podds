export interface ShareConfig {
	podcastIndexKey: string;
	podcastIndexSecret: string;
	corsHelperUrl: string;
	feedId: string;
	episodeUrl?: string;
}

export function encodeShareLink(config: ShareConfig): string {
	const encoded = btoa(JSON.stringify(config));
	return `${window.location.origin}/share#${encoded}`;
}

export function decodeShareLink(hash: string): ShareConfig {
	try {
		return JSON.parse(atob(hash));
	} catch {
		throw new Error('Invalid share link format');
	}
}
