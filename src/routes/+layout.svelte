<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService';
	import { db, getActiveEpisodes, getFeedIconsById, getSettings } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';
	import { page } from '$app/state';
	import SetupWizard from '$lib/components/SetupWizard.svelte';

	let feedService = new FeedService();

	let isDbReady = $state(false);

	let settings = $derived(getSettings());
	let hasSettings = $derived(settings !== undefined);

	let feedIconsById = $derived(getFeedIconsById());
	let activeEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	Promise.all([
		db.feeds.isReady(),
		db.episodes.isReady(),
		db.activeEpisodes.isReady(),
		db.settings.isReady(),
		db.logs.isReady()
	]).then(async () => {
		isDbReady = true;
		Log.initServiceWorkerLogging();
		feedService.startPeriodicUpdates();

		if (navigator.storage && navigator.storage.persist) {
			const granted = await navigator.storage.persist();

			if (!granted) {
				Log.error('Storage persistence not granted');
			}
		}

		// share takes care of hiding the loading screen
		if (!page.url.pathname.startsWith('/share')) {
			const loadingScreen = document.getElementById('appLoading');
			if (loadingScreen) {
				loadingScreen.remove();
			}
		}
	});

	let { children } = $props();
</script>

<main>
	{#if isDbReady}
		{#if hasSettings}
			{@render children()}
			{#if activeEpisode}
				<Player episode={activeEpisode} {feedIconsById} />
			{/if}
			<BottomNavBar />
		{:else}
			<SetupWizard />
		{/if}
	{/if}
</main>

<style>
</style>
