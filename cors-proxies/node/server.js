import http from 'http';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Uncomment for local/dev testing (NOT for prod)
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const server = http.createServer(async (req, res) => {
	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '0',
		});
		return res.end();
	}

	const urlObj = new URL(req.url, `http://${req.headers.host}`);
	const rawTarget = urlObj.searchParams.get('url');
	if (!rawTarget) {
		res.writeHead(400);
		return res.end("Missing 'url' parameter");
	}

	let targetUrl;
	try {
		targetUrl = decodeURIComponent(rawTarget);
		new URL(targetUrl); // validates format
	} catch {
		res.writeHead(400);
		return res.end("Invalid URL");
	}

	try {
		// Clone headers and override necessary ones
		const headers = { ...req.headers };
		delete headers['host'];
		delete headers['sec-fetch-dest'];
		delete headers['sec-fetch-mode'];
		delete headers['sec-fetch-site'];

		headers['user-agent'] = USER_AGENT;
		headers['accept'] = '*/*';
		headers['accept-language'] = 'en-US,en;q=0.9';
		headers['referer'] = new URL(targetUrl).origin;
		headers['connection'] = 'keep-alive';

		console.log(`---`);
		console.log(`Proxying to: ${targetUrl}`);

		const upstream = await fetch(targetUrl, {
			method: req.method,
			headers,
		});

		// Convert and sanitize response headers
		const rawHeaders = Object.fromEntries(upstream.headers.entries());
		for (const key of Object.keys(rawHeaders)) {
			if (key.toLowerCase().startsWith('access-control-')) {
				delete rawHeaders[key];
			}
		}

		rawHeaders['Access-Control-Allow-Origin'] = '*';
		rawHeaders['Access-Control-Expose-Headers'] = '*';
		rawHeaders['Accept-Ranges'] = 'bytes';

		console.log(`Response status: ${upstream.status}`);
		console.log(`Response headers:`);
		for (const [key, value] of Object.entries(rawHeaders)) {
			console.log(`  ${key}: ${value}`);
		}

		res.writeHead(upstream.status, rawHeaders);
		await streamPipeline(upstream.body, res);
	} catch (e) {
		console.error(`Fetch failed: ${e.message}`);
		console.error(e.stack);
		res.writeHead(500);
		res.end(`Error: ${e.message}`);
	}
});

server.listen(8080, () => {
	console.log('CORS proxy listening on http://0.0.0.0:8080');
});
