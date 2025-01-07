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
	<div class="flex min-h-screen flex-col items-center justify-center">
		<div class="w-full max-w-md space-y-4 p-6">
			<h1 class="text-center text-2xl font-bold">Initial Sync</h1>
			<div class="space-y-4">
				<p class="text-center text-gray-600">{syncService.status}</p>
			</div>
		</div>
	</div>
{/if}
