<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService';
	import { db, getActiveEpisodes } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';
	let feedService = new FeedService();

	let isDbReady = $state(false);

	let activeEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	Promise.all([
		db.feeds.isReady(),
		db.episodes.isReady(),
		db.settings.isReady(),
		db.logs.isReady()
	]).then(() => {
		isDbReady = true;
		Log.initServiceWorkerLogging();
		feedService.startPeriodicUpdates();
	});

	let { children } = $props();
</script>

{#if !isDbReady}
	<div class="loading">
		Loading<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
	</div>
{:else}
	<main>
		{@render children()}
		{#if activeEpisode}
			<Player episode={activeEpisode} />
		{/if}
		<BottomNavBar />
	</main>
{/if}

<style>
	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: var(--text-4xl);
		color: var(--primary);
	}

	.dot {
		opacity: 0;
		margin: 0 3px;
		animation: pulse 1.5s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0% {
			opacity: 0;
			transform: scale(0.8);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.8);
		}
	}
</style>
