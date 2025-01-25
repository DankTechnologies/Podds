<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService';
	import type { Episode } from '$lib/types/db';
	import { SvelteMap } from 'svelte/reactivity';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { playService } from '$lib/service/PlayService.svelte';
	import type { Observable } from 'dexie';

	let {
		episodes,
		podcastIcons
	}: { episodes: Observable<Episode[]>; podcastIcons?: SvelteMap<number, string> } = $props();
	let expandedEpisodeIds = $state<number[]>([]);

	function toggleExpanded(episodeId: number) {
		if (isExpanded(episodeId)) {
			expandedEpisodeIds = expandedEpisodeIds.filter((id) => id !== episodeId);
		} else {
			expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
		}
	}

	function isExpanded(episodeId: number) {
		return expandedEpisodeIds.includes(episodeId);
	}

	function playEpisode(episode: Episode) {
		console.log(`Playing episode: ${episode.title}`);
		playService.play(
			episode,
			() => console.log('Playback completed'),
			(error) => console.error('Playback failed:', error)
		);
	}

	function downloadEpisode(episode: Episode) {
		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode.id!),
			(err) => handleDownloadError(episode.id!, err)
		);
		console.log(`Started downloading episode: ${episode.title}`);
	}

	function handleDownloadComplete(episodeId: number) {
		console.log(`Download complete for episode ${episodeId}`);
		EpisodeService.markDownloaded(episodeId);
	}

	function handleDownloadError(episodeId: number, err: ErrorEvent) {
		console.log(`Download failed for episode ${episodeId}:`, err);
	}
</script>

<div class="episode-list" role="list">
	{#each $episodes as episode}
		<article class="episode-card">
			<button
				class="episode-card__header"
				type="button"
				onclick={() => toggleExpanded(episode.id!)}
				aria-expanded={isExpanded(episode.id!)}
				aria-controls="details-{episode.id}"
			>
				{#if podcastIcons}
					<img
						class="episode-card__image"
						src={`data:${podcastIcons.get(episode.podcastId)}`}
						alt=""
					/>
				{/if}
				<div class="episode-card__heading">
					<time class="episode-card__time" datetime={new Date(episode.publishedAt).toISOString()}>
						{new Date(episode.publishedAt).toLocaleDateString(undefined, {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
						{#if episode.isDownloaded}
							<span class="episode-card__download-check">✅</span>
						{/if}
					</time>
					<div class="episode-card__title">{episode.title}</div>
				</div>
			</button>

			{#if isExpanded(episode.id!)}
				<div id="details-{episode.id}" class="episode-card__details">
					<div class="episode-card__actions">
						<button
							class="episode-card__action-btn"
							aria-label="Play episode"
							onclick={() => playEpisode(episode)}
						>
							<span aria-hidden="true">▶️</span> Play
						</button>
						<button
							class="episode-card__action-btn"
							aria-label="Save episode"
							onclick={() => downloadEpisode(episode)}
						>
							<span aria-hidden="true">➕</span> Up Next
						</button>
					</div>
					<div class="episode-card__content">
						{@html episode.content}
					</div>
				</div>
			{/if}
		</article>
	{/each}
</div>

<style>
	.episode-list {
		display: flex;
		flex-direction: column;
	}

	.episode-card__header {
		display: flex;
		width: 100%;
		background: none;
		border: none;
		padding: 1.5rem;
		text-align: left;
		border-bottom: 1px solid lightgrey;
	}

	/* less padding needed in Episodes */
	.episode-card__header:has(.episode-card__image) {
		padding: 1rem;
	}

	.episode-card__image {
		width: 5rem;
		margin-right: 1rem;
		aspect-ratio: 1;
		object-fit: cover;
	}

	.episode-card__heading {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.25rem;
	}

	.episode-card__title {
		font-weight: 600;
		font-size: large;
	}

	.episode-card__time {
		font-size: 0.75rem;
		color: darkslategray;
	}

	.episode-card__download-check {
		opacity: 0.5;
		filter: grayscale(100%);
		padding-left: 0.125rem;
	}

	.episode-card__details {
		font-size: 0.875rem;

		/* dynamic @html content requires :global */
		/* but styles remain scoped to .episode-card__description */

		:global(p:first-child) {
			margin-top: 0;
		}

		:global(p:last-child) {
			margin-bottom: 0;
		}

		:global(img) {
			display: none;
		}
	}

	.episode-card__content {
		padding: 1.5rem;
		border-bottom: 1px solid lightgray;
	}

	.episode-card__actions {
		float: right;
		display: flex;
		margin: 1rem;
	}

	.episode-card__action-btn {
		background: none;
		border: none;
		font-weight: 500;
		padding: 1rem;
	}
</style>
