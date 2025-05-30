import http from 'http';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Registry, Counter, Histogram } from 'prom-client';

const streamPipeline = promisify(pipeline);

// Create a registry and metrics
const register = new Registry();
const httpRequestsTotal = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'status']
});
const httpRequestDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration in seconds',
	labelNames: ['method']
});

// Register the metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ORIGIN_ALLOWLIST = [
	'https://podds.io',
	'https://podds.danktech.io',
	'https://dbk-lt.local:5173'
];

const LAN_DENYLIST = [
	/^localhost$/,
	/\.local$/,
	/^127\./,
	/^10\./,
	/^192\.168\./,
	/^172\.(1[6-9]|2[0-9]|3[0-1])\./
];

const server = http.createServer(async (req, res) => {
	const start = process.hrtime();
	
	// Handle metrics endpoint
	if (req.url === '/metrics') {
		res.setHeader('Content-Type', register.contentType);
		res.end(await register.metrics());
		return;
	}

	const origin = req.headers.origin;
	if (!ORIGIN_ALLOWLIST.includes(origin?.toLowerCase())) {
		res.writeHead(403);
		httpRequestsTotal.inc({ method: req.method, status: 403 });
		return res.end('Forbidden');
	}

	if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
		res.writeHead(405);
		httpRequestsTotal.inc({ method: req.method, status: 405 });
		return res.end('Method Not Allowed');
	}
	
	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400',
		});
		httpRequestsTotal.inc({ method: req.method, status: 204 });
		return res.end();
	}

	const urlObj = new URL(req.url, `http://${req.headers.host}`);
	const rawTarget = urlObj.searchParams.get('url');
	if (!rawTarget) {
		res.writeHead(400);
		httpRequestsTotal.inc({ method: req.method, status: 400 });
		return res.end("Missing 'url' parameter");
	}

	let targetUrl;
	try {
		targetUrl = decodeURIComponent(rawTarget);
		new URL(targetUrl); // validates format
	} catch {
		res.writeHead(400);
		httpRequestsTotal.inc({ method: req.method, status: 400 });
		return res.end("Invalid URL");
	}

	const targetHostname = new URL(targetUrl).hostname;
	if (LAN_DENYLIST.some(rx => rx.test(targetHostname))) {
		res.writeHead(403);
		httpRequestsTotal.inc({ method: req.method, status: 403 });
		return res.end('Forbidden');
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
			compress: true
		});

		// Convert and sanitize response headers
		const rawHeaders = Object.fromEntries(upstream.headers.entries());
		for (const key of Object.keys(rawHeaders)) {
			const lower = key.toLowerCase();
			if (
				lower.startsWith('access-control-') ||
				lower === 'content-encoding' ||
				lower === 'transfer-encoding'
			) {
				delete rawHeaders[key];
			}
		}

		rawHeaders['Access-Control-Allow-Origin'] = origin;
		rawHeaders['Access-Control-Expose-Headers'] = '*';
		rawHeaders['Accept-Ranges'] = 'bytes';

		console.log(`Response status: ${upstream.status}`);
		console.log(`Response headers:`);
		for (const [key, value] of Object.entries(rawHeaders)) {
			console.log(`  ${key}: ${value}`);
		}

		res.writeHead(upstream.status, rawHeaders);
		httpRequestsTotal.inc({ method: req.method, status: upstream.status });
		await streamPipeline(upstream.body, res);
	} catch (e) {
		console.error(`Fetch failed: ${e.message}`);
		console.error(e.stack);
		res.writeHead(500);
		httpRequestsTotal.inc({ method: req.method, status: 500 });
		res.end(`Error: ${e.message}`);
	} finally {
		const [seconds, nanoseconds] = process.hrtime(start);
		const duration = seconds + nanoseconds / 1e9;
		httpRequestDuration.observe({ method: req.method }, duration);
	}
});

server.listen(8080, () => {
	console.log('CORS proxy listening on http://0.0.0.0:8080');
	console.log('Metrics available at http://0.0.0.0:8080/metrics');
});
