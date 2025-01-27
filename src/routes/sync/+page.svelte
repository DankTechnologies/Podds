<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { SyncService } from '$lib/service/SyncService.svelte';

	let syncService = $state<SyncService | null>(null);

	onMount(async () => {
		syncService = new SyncService();
		await syncService.syncPodcasts();
		setTimeout(() => goto('/'), 1000);
	});
</script>

{#if syncService}
	<div class="grid">
		<div>
			<h1>Syncing Podcasts</h1>
		</div>
		<div>
			<p>{syncService.status}</p>
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		padding: 2rem;
	}

	p {
		font-size: larger;
	}
</style>
