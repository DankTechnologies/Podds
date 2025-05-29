import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
	plugins: [
		sveltekit(),
		{
			name: 'copy-manifest',
			buildStart() {
				const manifestPath = path.resolve(__dirname, 'static/manifest.webmanifest');
				const manifestDevPath = path.resolve(__dirname, 'static/manifest-dev.webmanifest');

				if (isDev) {
					fs.copyFileSync(manifestDevPath, manifestPath);
				} else {
					fs.copyFileSync(path.resolve(__dirname, 'static/manifest-prod.webmanifest'), manifestPath);
				}
			}
		}
	],
	test: {
		setupFiles: ['./vitest.setup.ts']
	},
	server: {
		host: '0.0.0.0',
		allowedHosts: true,
		https: isDev
			? {
				key: fs.readFileSync(path.resolve(__dirname, 'cert/key.pem')),
				cert: fs.readFileSync(path.resolve(__dirname, 'cert/cert.pem'))
			}
			: undefined
	},
	worker: {
		format: 'es'
	}
});
