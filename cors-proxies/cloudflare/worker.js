const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

	const ORIGIN_ALLOWLIST = [
	'https://podds.io',
	'https://podds.danktech.io',
	'https://dbk-lt.local:5173'
];

export default {
	async fetch(request) {
		const origin = request.headers.get('Origin');
		if (!ORIGIN_ALLOWLIST.includes(origin?.toLowerCase())) {
			return new Response('Forbidden', { status: 403 });
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': origin,
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Max-Age': '86400',
				}
			});
		}

		const url = new URL(request.url);
		const targetUrl = url.searchParams.get('url');

		if (!targetUrl) {
			return new Response("Missing 'url' parameter", { status: 400 });
		}

		try {
			const headers = new Headers(request.headers);
			headers.delete('sec-fetch-dest');
			headers.delete('sec-fetch-mode');
			headers.delete('sec-fetch-site');

			headers.set('User-Agent', USER_AGENT);
			headers.set('Accept', '*/*');

			const response = await fetch(targetUrl, {
				method: request.method,
				headers
			});

			const responseHeaders = new Headers(response.headers);
			responseHeaders.set('Access-Control-Allow-Origin', origin);
			responseHeaders.set('Access-Control-Expose-Headers', '*');
			responseHeaders.set('Accept-Ranges', 'bytes');

		 return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders
			});
		} catch (err) {
			return new Response(`Error: ${err.message}`, { status: 500 });
		}
	}
};
