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
	import { trackThemePreference } from '$lib/utils/themePreference.svelte';
	import { onMount } from 'svelte';
	import { requestStoragePersistence } from '$lib/utils/storage';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { isPwa } from '$lib/utils/osCheck';

	let feedService = new FeedService();

	let settings = $derived(getSettings());
	let isPwaConfigured = $derived(settings?.isPwaInstalled ?? false);

	let isDbReady = $state(false);

	let feedIconsById = $derived(getFeedIconsById());
	let activeEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	requestStoragePersistence();
	trackThemePreference();

	onMount(() => {
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
