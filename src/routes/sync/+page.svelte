<script lang="ts">
	import { onMount } from 'svelte';
	import MinifluxApi from '$lib/api/MinifluxApi';
	import { goto } from '$app/navigation';
	import { SyncService } from '$lib/service/SyncService.svelte';
	import { SettingsService } from '$lib/service/SettingsService';
	import type { Settings } from '$lib/types/db';

	let syncService = $state<SyncService | null>(null);
	let settings = $state<Settings | null>(null);

	onMount(async () => {
		settings = await SettingsService.getSettings();

		if (!settings) {
			goto('/setup');
		}

		const minifluxApi = new MinifluxApi(settings!.host, settings!.apiKey);
		syncService = new SyncService(minifluxApi);
		const categoryIds = settings!.categories.split(',').map(Number);

		await syncService.syncPodcasts(categoryIds);
		setTimeout(() => goto('/'), 1000);
	});
</script>

{#if syncService}
	<div>
		<div>
			<h1>Initial Sync</h1>
			<div>
				<p>{syncService.status}</p>
			</div>
		</div>
	</div>
{/if}
