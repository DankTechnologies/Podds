import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
	plugins: [sveltekit()],
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
