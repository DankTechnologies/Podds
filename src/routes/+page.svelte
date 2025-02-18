<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Feed } from '$lib/types/db';
	import { db } from '$lib/stores/db.svelte';
	// Raw state holders for query results
	let feeds = $state.raw<Feed[]>([]);

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const feedsCursor = db.feeds.find();
		feeds = feedsCursor
			.fetch()
			.reduce((unique: Feed[], feed) => {
				if (!unique.some((f) => f.id === feed.id)) {
					unique.push(feed);
				}
				return unique;
			}, [])
			.sort((a, b) => {
				const titleA = a.title.replace(/^(the|a|an)\s+/i, '');
				const titleB = b.title.replace(/^(the|a|an)\s+/i, '');
				return titleA.localeCompare(titleB);
			});

		return () => {
			feedsCursor.cleanup();
		};
	});
</script>

<div class="grid">
	{#each feeds || [] as feed}
		<div class="grid-item">
			<button
				onclick={() => goto(`/podcast/${feed.id}`)}
				aria-label={`Go to ${feed.title} podcast`}
			>
				<img src={`data:${feed.iconData}`} alt={feed.title} />
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
	}

	.grid-item {
		line-height: 0;
	}

	.grid-item button {
		border: 0;
		padding: 0;
		background: none;
		line-height: 0;
		height: 100%;
		width: 100%;
	}

	.grid-item img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.125rem;
	}
</style>
