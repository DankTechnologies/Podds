<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode, ActiveEpisode } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { Log } from '$lib/service/LogService';
	import { Play, Dot, ArrowUp, Download, Check } from 'lucide-svelte';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		episodes,
		activeEpisodes,
		feedIconsById,
		isPlaylist = false
	}: {
		episodes: Episode[];
		activeEpisodes: ActiveEpisode[];
		feedIconsById?: Map<string, string>;
		isPlaylist?: boolean;
	} = $props();

	let downloadProgress = $state(new SvelteMap<string, number>());
	let focusedEpisodeId = $state<string | null>(null);
	let isReordering = $state(false);

	function playEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);
		EpisodeService.setPlayingEpisode(episode);

		if (activeEpisodes.find((x) => x.id === episode.id)?.isDownloaded) {
			AudioService.play(
				episode.url,
				activeEpisodes.find((x) => x.id === episode.id)?.playbackPosition ?? 0
			);
		} else {
			downloadAudio(
				episode.url,
				() => {
					handleDownloadComplete(episode);
					AudioService.play(
						episode.url,
						activeEpisodes.find((x) => x.id === episode.id)?.playbackPosition ?? 0
					);
				},
				(err) => handleDownloadError(episode.id!, err),
				(progress) => downloadProgress.set(episode.id!, progress)
			);
		}
	}

	function downloadEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);
		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode),
			(err) => handleDownloadError(episode.id!, err),
			(progress) => downloadProgress.set(episode.id!, progress)
		);
	}

	function handleDownloadComplete(episode: Episode) {
		EpisodeService.markDownloaded(episode);
		downloadProgress.delete(episode.id);
	}

	function handleDownloadError(episodeId: string, err: Error | ErrorEvent) {
		EpisodeService.clearDownloaded(episodeId);
		Log.error(`Download failed for episode ${episodeId}: ${err.message ?? err.toString()}`);
	}

	function toggleEpisodeFocus(episode: Episode) {
		focusedEpisodeId = focusedEpisodeId === episode.id ? null : episode.id;
	}

	function handlePlayNext(episode: Episode) {
		isReordering = true;
		const episodeIds = episodes.map((e) => e.id);

		const targetIndex = episodeIds.indexOf(episode.id);
		episodeIds.splice(targetIndex, 1);
		episodeIds.splice(0, 0, episode.id);

		toggleEpisodeFocus(episode);
		EpisodeService.reorderEpisodes(episodeIds);

		// Reset after a short delay to allow the reorder to complete
		setTimeout(() => {
			isReordering = false;
		}, 50);
	}

	function getEpisodeDurationDisplay(episode: Episode, activeEpisodes: ActiveEpisode[]): string {
		const activeEpisode = activeEpisodes.find((x) => x.id === episode.id);

		return !activeEpisode || activeEpisode.isCompleted || activeEpisode.playbackPosition === 0
			? formatEpisodeDuration(episode.durationMin)
			: `${formatEpisodeDuration(activeEpisode.minutesLeft)} left`;
	}
</script>

<ul class="episode-list" role="list">
	{#each episodes as episode, index (episode.id)}
		<li
			class="episode-card"
			class:episode-card--playing={activeEpisodes.find((x) => x.id === episode.id)?.isPlaying}
			class:episode-card--focused={focusedEpisodeId === episode.id}
		>
			<button
				class="episode-card__wrapper"
				type="button"
				style:anchor-name={`--episode-${episode.id}`}
				onclick={() => toggleEpisodeFocus(episode)}
			>
				<div class="episode-card__content">
					{#if feedIconsById}
						<img
							class="episode-card__image"
							src={`data:${feedIconsById.get(episode.feedId)}`}
							alt=""
						/>
					{/if}
					<div class="episode-card__heading">
						<time class="episode-card__time">
							{#if activeEpisodes.find((x) => x.id === episode.id)?.isCompleted}
								<div>
									<Check size="14" />
								</div>
							{/if}
							{#if activeEpisodes.find((x) => x.id === episode.id)?.isDownloaded}
								<div>
									<Download size="14" />
								</div>
							{:else if downloadProgress.has(episode.id)}
								<div class="download-progress">
									{Math.round(downloadProgress.get(episode.id) ?? 0)}%
								</div>
							{/if}
							<div>
								{formatEpisodeDate(episode.publishedAt)}
							</div>
							<div>
								<Dot size="14" />
							</div>
							<div>
								{getEpisodeDurationDisplay(episode, activeEpisodes)}
							</div>
						</time>
						<div class="episode-card__title">{episode.title}</div>
					</div>
				</div>
			</button>

			<div
				class="episode-controls"
				class:episode-controls--playing={activeEpisodes.find((x) => x.id === episode.id)?.isPlaying}
				class:episode-controls--hidden={focusedEpisodeId !== episode.id}
				class:episode-controls--no-transition={isReordering}
				style:position-anchor={`--episode-${episode.id}`}
				style:position="fixed"
			>
				<div
					class="episode-controls__description-wrapper"
					class:episode-controls__description-wrapper--no-image={!feedIconsById}
				>
					<div class="episode-controls__description">{@html episode.content}</div>
				</div>
				<div class="episode-controls__buttons">
					<button class="episode-controls__btn" onclick={() => playEpisode(episode)}>
						<Play size="16" /> Play {isPlaylist ? 'Now' : ''}
					</button>
					{#if !activeEpisodes.find((x) => x.id === episode.id)?.isDownloaded}
						<button class="episode-controls__btn" onclick={() => downloadEpisode(episode)}>
							<Download size="16" /> Later
						</button>
					{/if}
					{#if isPlaylist && index > 0}
						<button class="episode-controls__btn" onclick={() => handlePlayNext(episode)}>
							<ArrowUp size="16" /> Play Next
						</button>
					{/if}
				</div>
			</div>
		</li>
	{/each}
</ul>

<style>
	.episode-list {
		display: flex;
		flex-direction: column;
	}

	.episode-card {
		transition: background 150ms ease-out;
	}

	.episode-card--playing {
		background: radial-gradient(
			ellipse at bottom left,
			var(--bg-less) 0%,
			var(--bg-less) 70%,
			var(--primary) 100%
		);
	}

	.episode-card--focused:not(.episode-card--playing):not(.episode-card--playing-no-image) {
		background: var(--bg-less);
	}

	.episode-card__wrapper {
		width: 100%;
		background: none;
		border: none;
		padding: 1.5rem;
		text-align: left;
		color: var(--text);
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-card__content {
		display: flex;
	}

	/* less padding needed when using image */
	.episode-card__wrapper:has(.episode-card__image) {
		padding: 1rem;
	}

	.episode-card__image {
		width: 5rem;
		height: 5rem;
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
		line-height: var(--line-height-normal);
		font-size: var(--text-medium);
	}

	.episode-card__time {
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.1rem;
	}

	.download-progress {
		color: var(--primary);
		font-size: var(--text-small);
		min-width: 3ch;
		padding-right: 0.5rem;
	}

	.episode-controls {
		position-area: end span-all;
		margin-top: -1px;
		background: var(--bg-less);
		opacity: 1;
		visibility: visible;
		position: relative;
		background: transparent;
	}

	.episode-controls__description-wrapper {
		padding: 0 1rem 2rem 1rem;
		background: var(--bg-less);
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-controls__description-wrapper--no-image {
		padding-left: 1.5rem;
	}

	.episode-controls__description {
		font-size: var(--text-small);
		line-height: var(--line-height-normal);
		overflow: hidden;
		border-left: 0.5rem solid var(--primary-less);
		padding: 0 1rem;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		word-break: break-word;

		:global(p) {
			margin: 0;
		}
	}

	.episode-controls__buttons {
		display: flex;
		gap: 2rem;
		margin-top: -1px;
		background: var(--bg-less);
		width: fit-content;
		padding: 0 2rem 2rem 2rem;
		border-right: 1px solid var(--primary-less);
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-controls--hidden {
		opacity: 0;
		transform: translateY(-0.25rem);
		visibility: hidden;
		background: var(--bg);
		pointer-events: none;
	}

	.episode-controls__btn {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--neutral);
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.episode-controls--no-transition {
		transition: none !important;
	}
</style>
