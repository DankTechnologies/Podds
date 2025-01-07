<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';
	import type { Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';

	const standaloneRoutes = ['/setup', '/sync'];

	let isPlaying = $state(false);
	let isStandalone = $derived(standaloneRoutes.includes(page.url.pathname));
	let settings = $state<Settings | null>(null);

	onMount(async () => {
		settings = await SettingsService.getSettings();

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
