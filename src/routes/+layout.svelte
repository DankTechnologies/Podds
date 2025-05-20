<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { db, getActiveEpisodes, getFeedIconsById, getSettings } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';
	import { page } from '$app/state';
	import SetupWizard from '$lib/components/SetupWizard.svelte';
	import { trackThemePreference } from '$lib/utils/themePreference.svelte';
	import { onMount } from 'svelte';
	import { requestStoragePersistence } from '$lib/utils/storage';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { isPwa } from '$lib/utils/osCheck';
	import { registerServiceWorker } from '$lib/utils/storage';
	import { SearchHistoryService } from '$lib/service/SearchHistoryService.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { trackNetworkState } from '$lib/utils/networkState.svelte';
	let feedService = new FeedService();
	let searchHistoryService = new SearchHistoryService();

	let settings = $derived(getSettings());
	let isPwaConfigured = $derived(settings.isPwaInstalled);

	let isDbReady = $state(false);

	let feedIconsById = $derived(getFeedIconsById());
	let activeEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	registerServiceWorker();
	requestStoragePersistence();
	trackThemePreference();
	trackNetworkState();

	onMount(() => {
		Promise.all([
			db.feeds.isReady(),
			db.episodes.isReady(),
			db.activeEpisodes.isReady(),
			db.settings.isReady(),
			db.logs.isReady(),
			db.searchHistory.isReady()
		]).then(async () => {
			isDbReady = true;
			Log.initServiceWorkerLogging();
			SettingsService.initializeSettings();
			feedService.startPeriodicUpdates();
			searchHistoryService.startPeriodicUpdates();
			EpisodeService.startPeriodicUpdates();

			if (isPwa && !isPwaConfigured) {
				SettingsService.markPwaInstalled();
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
	});

	let { children } = $props();
</script>

<main>
	{#if isDbReady}
		<SetupWizard />
		{@render children()}
		{#if activeEpisode}
			<Player episode={activeEpisode} {feedIconsById} />
		{/if}
		<BottomNavBar episode={activeEpisode} />
	{/if}
</main>

<style>
</style>
