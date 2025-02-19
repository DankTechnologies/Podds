<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { FeedService } from '$lib/service/FeedService';
	import { db } from '$lib/stores/db.svelte';
	import { onMount } from 'svelte';
	let feedService = new FeedService();

	let isDbLoaded = $derived(
		!db.feeds.isLoading() && !db.episodes.isLoading() && !db.settings.isLoading()
	);
	let initialized = $state(true);

	onMount(() => {
		if (isDbLoaded) {
			initialized = true;
			feedService.startPeriodicUpdates();
		}
	});

	let { children } = $props();
</script>

{#if !initialized}
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
