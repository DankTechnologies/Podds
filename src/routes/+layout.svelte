<script lang="ts">
	import { page } from '$app/state';
	import '../normalize.css';
	import '../app.css';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';
	import type { Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';
	import { SyncService } from '$lib/service/SyncService.svelte';

	const standaloneRoutes = ['/settings', '/sync'];

	let isStandalone = $derived(standaloneRoutes.includes(page.url.pathname));
	let settings = $state<Settings | null>(null);
	let sync = new SyncService();

	onMount(async () => {
		settings = await SettingsService.getSettings();

		if (!settings) {
			goto('/settings');
		}

		sync.startPeriodicSync();
	});

	let { children } = $props();
</script>

<main class={{ 'nav-offset': !isStandalone }}>
	{@render children()}
	{#if !isStandalone}
		<Player />
		<BottomNavBar />
	{/if}
</main>

<style>
	.nav-offset {
		padding-bottom: 4.25rem;
	}
</style>
