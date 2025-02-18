// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="vite/client" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface ImportMetaEnv {
		VITE_PODCAST_INDEX_KEY: string;
		VITE_PODCAST_INDEX_SECRET: string;
		VITE_CORS_HELPER_URL: string;
	}
}

export {};
