<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db/db';
	import { goto } from '$app/navigation';

	const podcasts = liveQuery(() => db.podcasts.orderBy('title').toArray());
</script>

<div class="min-h-screen bg-gray-900 text-white">
	<div class="grid grid-cols-4 gap-2 px-4 md:grid-cols-6 lg:grid-cols-8">
		{#each $podcasts || [] as podcast}
			<button
				class="w-full transition-opacity hover:opacity-80"
				on:click={() => goto(`/podcast/${podcast.id}`)}
				aria-label={`Go to ${podcast.title} podcast`}
			>
				<img
					src={`data:${podcast.icon}`}
					alt={podcast.title}
					class="aspect-square w-full rounded-md object-cover"
				/>
			</button>
		{/each}
	</div>
</div>
