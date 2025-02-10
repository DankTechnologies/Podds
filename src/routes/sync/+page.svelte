<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { SyncService } from '$lib/service/SyncService.svelte';

	let syncService = $state<SyncService | null>(null);

	onMount(async () => {
		syncService = new SyncService();
		await syncService.syncPodcasts();
		goto('/');
	});
</script>

{#if syncService}
	<div class="grid">
		<div>
			<h1>Syncing Podcasts</h1>
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		padding: 2rem;
	}
</style>
