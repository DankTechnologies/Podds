<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService';
	import { db } from '$lib/stores/db.svelte';
	let feedService = new FeedService();

	let isDbReady = $state(false);

	Promise.all([db.feeds.isReady(), db.episodes.isReady(), db.settings.isReady()]).then(() => {
		isDbReady = true;
		feedService.startPeriodicUpdates();
	});

	let { children } = $props();
</script>

{#if !isDbReady}
	<div class="loading">Loading...</div>
{:else}
	<main>
		{@render children()}
		<Player />
		<BottomNavBar />
	</main>
{/if}

<style>
	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 2rem;
	}
</style>
