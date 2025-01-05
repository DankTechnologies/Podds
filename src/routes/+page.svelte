<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db/FluxcastDb';
	import { goto } from '$app/navigation';

	const podcasts = liveQuery(() => db.podcasts.orderBy('title').toArray());
</script>

<div class="relative min-h-screen bg-gradient-to-b from-blue-400 via-white to-blue-200">
	<div class="absolute inset-0 bg-white/30 backdrop-blur-[1rem]"></div>

	<div class="relative grid grid-cols-3 gap-2 p-2 md:grid-cols-6 lg:grid-cols-8">
		{#each $podcasts || [] as podcast}
			<button
				class="w-full transition-opacity hover:opacity-80"
				on:click={() => goto(`/podcast/${podcast.id}`)}
				aria-label={`Go to ${podcast.title} podcast`}
			>
				<img
					src={`data:${podcast.icon}`}
					alt={podcast.title}
					class="aspect-square w-full rounded-sm object-cover"
				/>
			</button>
		{/each}
	</div>
</div>
