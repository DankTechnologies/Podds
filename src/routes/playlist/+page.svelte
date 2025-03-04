<script lang="ts">
	import { reorder, useSortable } from '$lib/hooks/use-sortable.svelte';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { getActiveEpisodes } from '$lib/stores/db.svelte';
	import type { ActiveEpisode } from '$lib/types/db';
	import { Play } from 'lucide-svelte';

	let lastTenPlayedEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.playbackPosition > 0 && !episode.isPlaying)
			.sort((a, b) => a.lastUpdatedAt.getTime() - b.lastUpdatedAt.getTime())
			.slice(0, 10)
	);

	let playingEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	let upNextEpisodes = $derived(
		getActiveEpisodes()
			.filter(
				(episode) => episode.playbackPosition === 0 && !episode.isPlaying && episode.isDownloaded
			)
			.sort((a, b) => (a.sortOrder ?? 99999999) - (b.sortOrder ?? 99999999))
	);

	$inspect(upNextEpisodes.map((x) => `${x.sortOrder} - ${x.title}`));

	let sortable = $state<HTMLElement | null>(null);

	useSortable(() => sortable, {
		animation: 200,
		onEnd(evt) {
			const reorderedEpisodes = reorder(upNextEpisodes, evt);
			EpisodeService.reorderUpNext(reorderedEpisodes.map((x) => x.id));
		}
	});

	function playEpisode(episode: ActiveEpisode) {
		EpisodeService.setPlayingActiveEpisode(episode);

		AudioService.play(episode.url, episode.playbackPosition ?? 0);
	}
</script>

{#if lastTenPlayedEpisodes}
	<h2>Last 10 Played</h2>
	{#each lastTenPlayedEpisodes as episode}
		<div>
			<h3>{episode.title}</h3>
			<p>{episode.feedTitle}</p>
		</div>
	{/each}
{/if}

{#if playingEpisode}
	<h2>Playing</h2>
	<div>
		<h3>{playingEpisode.title}</h3>
		<p>{playingEpisode.feedTitle}</p>
	</div>
{/if}

{#if upNextEpisodes}
	<h2>Up Next</h2>
	<ul class="episode-list" bind:this={sortable}>
		{#each upNextEpisodes as episode (episode.id)}
			<li class="episode">
				<img class="episode-details__image" src={`data:${episode.feedIconData}`} alt="" />
				<h3>{episode.title}</h3>
				<button class="episode-details__action-btn" onclick={() => playEpisode(episode)}>
					<Play size="1.5rem" /> Play
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.episode-list {
		margin: 0;
		padding: 0;
	}
	.episode {
		border: 1px solid var(--primary);
		padding: 1rem;
		margin: 1rem;
		list-style: none;
	}
</style>
