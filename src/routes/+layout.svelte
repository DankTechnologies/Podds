<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';
	import { FeedService } from '$lib/service/FeedService';

	let feedService = new FeedService();

	onMount(() => {
		feedService.startPeriodicUpdates();
	});

	let { children } = $props();
</script>

<main>
	{@render children()}
	<Player />
	<BottomNavBar />
</main>
