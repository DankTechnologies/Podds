<script lang="ts">
	import { goto } from '$app/navigation';
	import { PodcastService } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { Podcast } from '$lib/types/db';

	let podcasts = $state<Podcast[]>([]);

	onMount(async () => {
		podcasts = await PodcastService.getPodcasts();
	});
</script>

<div class="grid">
	{#each podcasts || [] as podcast}
		<div class="grid-item">
			<button
				onclick={() => goto(`/podcast/${podcast.id}`)}
				aria-label={`Go to ${podcast.title} podcast`}
			>
				<img src={`data:${podcast.icon}`} alt={podcast.title} />
			</button>
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.25rem;
		padding: 0.25rem;
		background: white;
	}

	.grid-item {
		line-height: 0;
	}

	.grid-item button {
		border: 0;
		padding: 0;
		background: none;
		line-height: 0;
	}

	.grid-item img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.125rem;
	}
</style>
