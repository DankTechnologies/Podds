<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import { db } from '$lib/db/db';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';

	let isPlaying = $state(false);

	onMount(async () => {
		let settings = await db.settings.get(1);

		if (!settings) {
			goto('/setup');
		}
	});

	let { children } = $props();
</script>

<main>
	{@render children()}
	{#if page.url.pathname !== '/setup'}
		{#if isPlaying}
			<Player />
		{/if}

		<BottomNavBar />
	{/if}
</main>
