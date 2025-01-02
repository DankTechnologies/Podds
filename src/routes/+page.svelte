<script lang="ts">
    import { liveQuery } from "dexie";
    import { db } from "$lib/db/db";
    import { goto } from "$app/navigation";

    const podcasts = liveQuery(
        () => db.podcasts.orderBy('title').toArray()
    );


</script>

<h1 class="text-3xl text-red-600">Podcasts</h1>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-4 p-4">
    {#each $podcasts || [] as podcast}
        <button
            class="w-full p-4 border rounded-lg hover:shadow-lg transition-shadow text-left"
            on:click={() => goto(`/podcast/${podcast.id}`)}
            aria-label={`Go to ${podcast.title} podcast`}
        >
            <img 
                src={`data:${podcast.icon}`}
                alt={podcast.title}
                class="w-full aspect-square object-cover rounded-lg mb-2"
            />
            <h2 class="text-lg font-semibold text-center">{podcast.title}</h2>
        </button>
    {/each}
</div>
