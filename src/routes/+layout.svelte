<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { db, getActiveEpisodes, getSettings } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';
	import { page } from '$app/state';
	import SetupWizard from '$lib/components/SetupWizard.svelte';
	import { trackThemePreference } from '$lib/utils/themePreference.svelte';
	import { onMount } from 'svelte';
	import { requestStoragePersistence } from '$lib/utils/storage';
	import { SessionInfo, SettingsService } from '$lib/service/SettingsService.svelte';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { registerServiceWorker } from '$lib/utils/storage';
	import { SearchService } from '$lib/service/SearchService.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { trackNetworkState } from '$lib/utils/networkState.svelte';
	import { runRatchets } from '$lib/stores/ratchets';
	import { onNavigate } from '$app/navigation';
	import { onUpdateReady } from '$lib/utils/versionUpdate';
	import '$lib/utils/window.polyfill.js';
	let feedService = new FeedService();
	let searchService = new SearchService();

	let settings = $derived(getSettings());
	let isPwaConfigured = $derived(settings.isPwaInstalled);

	let isDbReady = $state(false);

	let playingEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	Promise.all([
		registerServiceWorker(),
		requestStoragePersistence(),
		trackThemePreference(),
		trackNetworkState()
	]).catch((error) => {
		Log.error(`Error during initialization: ${error}`);
	});

	onNavigate((navigation) => {
		if (
			!document.startViewTransition ||
			isAppleDevice ||
			navigation.from?.route.id === navigation.to?.route.id ||
			!(navigation.to?.route.id === '/' || navigation.to?.route.id?.startsWith('/podcast'))
		)
			return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onUpdateReady(() => {
		SessionInfo.hasUpdate = true;
	});

	onMount(() => {
		try {
			Promise.all([
				db.feeds.isReady(),
				db.episodes.isReady(),
				db.activeEpisodes.isReady(),
				db.settings.isReady(),
				db.logs.isReady(),
				db.searchHistory.isReady()
			]).then(() => {
				isDbReady = true;

				try {
					Log.initServiceWorkerLogging();
					SettingsService.initializeSettings();
					runRatchets();
					feedService.startPeriodicUpdates();
					searchService.startPeriodicUpdates();
					EpisodeService.startPeriodicUpdates();
				} catch (error) {
					Log.error(`Error at startup after DB ready: ${error}`);
				}

				if (isPwa && !isPwaConfigured) {
					SettingsService.markPwaInstalled();
				}

				if (import.meta.env.VITE_EXPOSE_GLOBAL_DB === '1') {
					(window as any).db = db;
				}

				// share takes care of hiding the loading screen
				// do this last
				if (!page.url.pathname.startsWith('/share')) {
					const loadingScreen = document.getElementById('appLoading');
					if (loadingScreen) {
						loadingScreen.remove();
					}
				}
			});
		} catch (error) {
			alert(`Error at startup before DB ready, yell at Dan: ${error}`);
		}
	});

	let { children } = $props();
</script>

<main>
	{#if isDbReady}
		<SetupWizard />
		{@render children()}
		{#if playingEpisode}
			<Player episode={playingEpisode} />
		{/if}
		<BottomNavBar episode={playingEpisode} />
	{/if}
</main>

<style>
	@keyframes grow-x {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	@keyframes shrink-x {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}

	::view-transition-old(feed-icon) {
		animation: 0.25s linear both shrink-x;
	}

	::view-transition-new(feed-icon) {
		animation: 0.25s 0.25s linear both grow-x;
	}

	@keyframes old-out {
		0% {
			opacity: 1;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes new-in {
		0% {
			opacity: 0;
		}

		100% {
			opacity: 1;
		}
	}

	::view-transition-old(root) {
		animation-name: old-out;
		animation-duration: 0.25s;
	}

	::view-transition-new(root) {
		animation-name: new-in;
		animation-duration: 0.25s;
	}
</style>
