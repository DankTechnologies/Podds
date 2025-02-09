<script lang="ts">
	import '../normalize.css';
	import '../app.css';
	import { goto } from '$app/navigation';
	import Player from '$lib/components/Player.svelte';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import { onMount } from 'svelte';
	import { SessionInfo, SettingsService } from '$lib/service/SettingsService.svelte';
	import { SyncService } from '$lib/service/SyncService.svelte';

	let settings = $state<Settings | null>(null);
	let sync = new SyncService();

	onMount(async () => {
		settings = await SettingsService.getSettings();

		if (!settings) {
			goto('/settings');
		} else {
			SessionInfo.isFirstVisit = false;
		}

		sync.startPeriodicSync();
	});

	let { children } = $props();
</script>

<main>
	{@render children()}
	<Player />
	<BottomNavBar />
</main>
