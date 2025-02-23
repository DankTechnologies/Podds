<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFeeds } from '$lib/stores/db.svelte';
	import type { Feed } from '$lib/types/db';

	let feeds = $derived(
		getFeeds()
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
			})
	);
</script>

{#if feeds.length === 0}
	<h1>modpod</h1>
	<p>Welcome to modpod</p>
	<p>Go to <a href="/settings">settings</a> page to configure</p>
{:else}
	<div class="grid">
		{#each feeds as feed}
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
{/if}

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
