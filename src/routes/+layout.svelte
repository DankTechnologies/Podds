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
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { requestStoragePersistence } from '$lib/utils/storage';

	let feedService = new FeedService();

	let isDbReady = $state(false);

	let settings = $derived(getSettings());
	let hasSettings = $derived(settings !== undefined);
	let isFirstVisit = $derived(settings?.visitCount === undefined || settings.visitCount === 0);

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

			if (settings) {
				SettingsService.incrementVisitCount(settings.visitCount);
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
		{#if hasSettings || page.url.pathname.startsWith('/share')}
			{@render children()}
			{#if activeEpisode}
				<Player episode={activeEpisode} {feedIconsById} />
			{/if}
			<BottomNavBar episode={activeEpisode} />
		{:else}
			<SetupWizard />
		{/if}
	{/if}
</main>

<style>
</style>
