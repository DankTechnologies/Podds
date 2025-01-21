<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService';
	import type { Episode } from '$lib/types/db';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		episodes,
		podcastIcons
	}: { episodes: Episode[]; podcastIcons?: SvelteMap<number, string> } = $props();
	let expandedEpisodeIds = $state<number[]>([]);
	let downloadedEpisodeIds = $state<number[]>([]);
	let downloadProgress = $state<SvelteMap<number, number>>(new SvelteMap());

	function toggleExpanded(episodeId: number) {
		if (isExpanded(episodeId)) {
			expandedEpisodeIds = expandedEpisodeIds.filter((id) => id !== episodeId);
		} else {
			expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
		}
	}

	function isDownloaded(episode: Episode) {
		return episode.isDownloaded || downloadedEpisodeIds.indexOf(episode.id) !== -1;
	}

	function isDownloading(episode: Episode) {
		const progress = downloadProgress.get(episode.id);
		return progress !== undefined && progress < 100;
	}

	function isExpanded(episodeId: number) {
		return expandedEpisodeIds.includes(episodeId);
	}

	async function startDownload(episode: Episode): Promise<void> {
		downloadProgress.set(episode.id, 0);
		await EpisodeService.downloadEpisode(episode, markDownloaded, showProgress);
	}

	function showProgress(episodeId: number, progress: number) {
		downloadProgress.set(episodeId, progress);
	}

	function markDownloaded(episodeId: number) {
		downloadedEpisodeIds = [...downloadedEpisodeIds, episodeId];
	}
</script>

<div class="episode-list" role="list">
	{#each episodes as episode}
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
						{#if isDownloaded(episode)}
							<span class="episode-card__download-check">✅</span>
						{/if}
					</time>
					<div class="episode-card__title">{episode.title}</div>
				</div>
			</button>

			{#if isExpanded(episode.id!)}
				<div id="details-{episode.id}" class="episode-card__details">
					<div class="episode-card__actions">
						<button class="episode-card__action-btn" aria-label="Play episode">
							<span aria-hidden="true">▶️</span> Play
						</button>
						<button
							class="episode-card__action-btn"
							aria-label="Save episode"
							disabled={isDownloaded(episode) || isDownloading(episode)}
							onclick={() => startDownload(episode)}
						>
							{#if isDownloaded(episode)}
								<span aria-hidden="true">✅</span> Downloaded
							{:else if downloadProgress.has(episode.id!)}
								<span aria-hidden="true">⏬</span> {downloadProgress.get(episode.id!)}%
							{:else}
								<span aria-hidden="true">➕</span> Up Next
							{/if}
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
