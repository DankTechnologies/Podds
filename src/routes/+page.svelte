<script lang="ts">
    import { liveQuery } from "dexie";
    import { db } from "$lib/db/db";
    import { goto } from "$app/navigation";

    const podcasts = liveQuery(
        () => db.podcasts.orderBy('title').toArray()
    );


</script>

<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-12 gap-4 p-4">
    {#each $podcasts || [] as podcast}
        <button
            class="w-full border rounded-lg hover:shadow-lg transition-shadow text-left"
            on:click={() => goto(`/podcast/${podcast.id}`)}
            aria-label={`Go to ${podcast.title} podcast`}
        >
            <img 
                src={`data:${podcast.icon}`}
                alt={podcast.title}
                class="w-full aspect-square object-cover"
            />
            <h2 class="text-sm font-semibold">{podcast.title}</h2>
        </button>
    {/each}
</div>
