<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Episode, Icon, Podcast } from '$lib/types/db';
	import { db } from '$lib/stores/db.svelte';
	// Raw state holders for query results
	let podcasts = $state.raw<Podcast[]>([]);
	let icons = $state.raw<Icon[]>([]);

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const podcastsCursor = db.episodes.find({}, { fields: { podcast: 1 } });
		podcasts = podcastsCursor
			.fetch()
			.map((episode) => episode.podcast)
			.reduce((unique: Podcast[], podcast) => {
				if (!unique.some((p) => p.id === podcast.id)) {
					unique.push(podcast);
				}
				return unique;
			}, [])
			.sort((a, b) => {
				const titleA = a.title.replace(/^(the|a|an)\s+/i, '');
				const titleB = b.title.replace(/^(the|a|an)\s+/i, '');
				return titleA.localeCompare(titleB);
			});

		const iconsCursor = db.icons.find();
		icons = iconsCursor.fetch();

		return () => {
			podcastsCursor.cleanup();
			iconsCursor.cleanup();
		};
	});
</script>

<div class="grid">
	{#each podcasts || [] as podcast}
		<div class="grid-item">
			<button
				onclick={() => goto(`/podcast/${podcast.id}`)}
				aria-label={`Go to ${podcast.title} podcast`}
			>
				<img
					src={`data:${icons.find((icon) => icon.id === podcast.id)?.data}`}
					alt={podcast.title}
				/>
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
