<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode, ActiveEpisode } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { Log } from '$lib/service/LogService';
	import { Play, Dot, ArrowUp, Download } from 'lucide-svelte';
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
</script>

<ul class="episode-list" role="list">
	{#each episodes as episode, index (episode.id)}
		<li
			class="episode-card"
			class:episode-card--playing={activeEpisodes.find((x) => x.id === episode.id)?.isPlaying}
			class:episode-card--playing-no-image={activeEpisodes.find((x) => x.id === episode.id)
				?.isPlaying && !feedIconsById}
			class:episode-card--focused={focusedEpisodeId === episode.id}
		>
			<button
				class="episode-card__header"
				type="button"
				style:anchor-name={`--episode-${episode.id}`}
				onclick={() => toggleEpisodeFocus(episode)}
			>
				{#if feedIconsById}
					<img
						class="episode-card__image"
						src={`data:${feedIconsById.get(episode.feedId)}`}
						alt=""
					/>
				{/if}
				<div class="episode-card__heading">
					<time class="episode-card__time">
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
						{#if activeEpisodes.find((x) => x.id === episode.id)?.minutesLeft}
							<div>
								{activeEpisodes.find((x) => x.id === episode.id)?.minutesLeft}
							</div>
						{:else}
							<div>
								{formatEpisodeDuration(episode.durationMin)}
							</div>
						{/if}
					</time>
					<div class="episode-card__title">{episode.title}</div>
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
			circle at top right,
			var(--bg-less) 0%,
			var(--bg-less) 70%,
			var(--primary) 100%
		);
	}

	.episode-card--playing-no-image {
		background: radial-gradient(
			ellipse at top left,
			var(--bg-less) 0%,
			var(--bg-less) 60%,
			var(--primary) 100%
		);
	}

	.episode-card--focused:not(.episode-card--playing):not(.episode-card--playing-no-image) {
		background: var(--bg-less);
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
		position-area: end span-end;
		margin-top: -1px;
		border-top: 1px solid var(--bg-less);
		border-right: 1px solid var(--primary-less);
		border-bottom: 1px solid var(--primary-less);
		background: var(--bg-less);
		padding: 1rem 2rem 2rem 2rem;
		gap: 2rem;
		display: flex;
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 250ms ease-in-out,
			transform 250ms ease-in-out,
			visibility 0s linear 0s,
			background 150ms ease-in-out;
		visibility: visible;
		position: relative;
	}

	.episode-controls--hidden {
		opacity: 0;
		transform: translateY(-0.25rem);
		visibility: hidden;
		background: var(--bg);
		transition:
			opacity 200ms ease-in-out,
			transform 200ms ease-in-out,
			visibility 0s linear 200ms,
			background 150ms ease-in-out;
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
