<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService';
	import type { Episode, Icon } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { playService } from '$lib/service/PlayService.svelte';
	import { Log } from '$lib/service/LogService';
	import { Check, Play, Plus, Dot } from 'lucide-svelte';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';

	let { episodes, podcastIcons }: { episodes: Episode[]; podcastIcons?: Icon[] } = $props();
	let expandedEpisodeIds = $state<string[]>([]);

	function toggleExpanded(episodeId: string) {
		if (isExpanded(episodeId)) {
			expandedEpisodeIds = expandedEpisodeIds.filter((id) => id !== episodeId);
		} else {
			expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
		}
	}

	function isExpanded(episodeId: string) {
		return expandedEpisodeIds.includes(episodeId);
	}

	function playEpisode(episode: Episode) {
		playService.play(
			episode,
			() => handleDownloadComplete(episode.id!),
			(err) => handleDownloadError(episode.id!, err)
		);
	}

	function downloadEpisode(episode: Episode) {
		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode.id!),
			(err) => handleDownloadError(episode.id!, err)
		);
	}

	function handleDownloadComplete(episodeId: string) {
		EpisodeService.markDownloaded(episodeId);
	}

	function handleDownloadError(episodeId: string, err: Error | ErrorEvent) {
		Log.error(`Download failed for episode ${episodeId}: ${err}`);
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
						src={`data:${podcastIcons.find((x) => x.id === episode.podcast?.id)?.data}`}
						alt=""
					/>
				{/if}
				<div class="episode-card__heading">
					<time class="episode-card__time">
						<div>
							{formatEpisodeDate(episode.publishedAt)}
						</div>
						<div>
							<Dot size="14" />
						</div>
						<div>
							{formatEpisodeDuration(episode.durationMin)}
						</div>
						{#if episode.isDownloaded}
							<div>
								<Check size="14" />
							</div>
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
							<Play size="1rem" /> Play
						</button>
						<button
							class="episode-card__action-btn"
							aria-label="Save episode"
							onclick={() => downloadEpisode(episode)}
						>
							<Plus size="1rem" /> Up Next
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
		color: var(--text);
		border-bottom: 1px solid var(--primary-less);
	}

	/* less padding needed when using image */
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
		font-family: monospace;
		color: var(--primary);
		min-height: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
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
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-card__actions {
		float: right;
		display: flex;
		/* margin: 1rem; */
	}

	.episode-card__action-btn {
		background: var(--primary-less);
		color: var(--neutral);
		border: none;
		/* font-weight: 500; */
		padding: 1rem;
		/* color: var(--text); */
	}
</style>
