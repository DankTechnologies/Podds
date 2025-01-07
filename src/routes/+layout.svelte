<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import { db } from '$lib/db/FluxcastDb';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';

	const standaloneRoutes = ['/setup', '/sync'];

	let isPlaying = $state(false);
	let isStandalone = $derived(standaloneRoutes.includes(page.url.pathname));

	onMount(async () => {
		let settings = await db.settings.get(1);

		if (!settings) {
			goto('/setup');
		}
	});

	let { children } = $props();
</script>

<main class={!isStandalone ? 'pb-16' : ''}>
	{@render children()}
	{#if !isStandalone}
		{#if isPlaying}
			<Player />
		{/if}

		<BottomNavBar />
	{/if}
</main>
