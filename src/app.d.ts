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
		VITE_MINIFLUX_HOST: string;
		VITE_MINIFLUX_API_KEY: string;
		VITE_MINIFLUX_CATEGORIES: string;
	}
}

export {};
