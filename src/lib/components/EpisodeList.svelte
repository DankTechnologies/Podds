<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService';
	import type { Episode } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { Log } from '$lib/service/LogService';
	import { Check, Play, Plus, Dot } from 'lucide-svelte';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { pushState } from '$app/navigation';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let { episodes, feedIconsById }: { episodes: Episode[]; feedIconsById?: Map<string, string> } =
		$props();

	let downloadProgress = $state(new SvelteMap<string, number>());

	function playEpisode(episode: Episode) {
		const dialog = document.getElementById(`details-${episode.id}`) as HTMLDialogElement;
		dialog.close();

		EpisodeService.setPlayingEpisode(episode.id);
		AudioService.play(
			episode.url,
			episode.playbackPosition ?? 0,
			(progress) => downloadProgress.set(episode.id!, progress),
			() => handleDownloadComplete(episode.id!),
			(err) => handleDownloadError(episode.id!, err)
		);
	}

	function downloadEpisode(episode: Episode) {
		const dialog = document.getElementById(`details-${episode.id}`) as HTMLDialogElement;
		dialog.close();

		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode.id!),
			(err) => handleDownloadError(episode.id!, err),
			(progress) => downloadProgress.set(episode.id!, progress)
		);
	}

	function handleDownloadComplete(episodeId: string) {
		EpisodeService.markDownloaded(episodeId);
		downloadProgress.delete(episodeId);
	}

	function handleDownloadError(episodeId: string, err: Error | ErrorEvent) {
		EpisodeService.clearDownloaded(episodeId);
		Log.error(`Download failed for episode ${episodeId}: ${err.message ?? err.toString()}`);
	}

	function showEpisodeDetails(episode: Episode) {
		const dialog = document.getElementById(`details-${episode.id}`) as HTMLDialogElement;
		dialog.showModal();
		// Push state so back button will close dialog
		pushState('', {});

		// Handle back button
		const handlePopState = () => {
			dialog.close();
			window.removeEventListener('popstate', handlePopState);
		};
		window.addEventListener('popstate', handlePopState);
	}
</script>

<div class="episode-list" role="list">
	{#each episodes as episode}
		<article
			class="episode-card"
			class:episode-card--playing={episode.isPlaying && feedIconsById}
			class:episode-card--playing-no-image={episode.isPlaying && !feedIconsById}
		>
			<button
				class="episode-card__header"
				type="button"
				onclick={() => showEpisodeDetails(episode)}
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
						{:else if downloadProgress.has(episode.id)}
							<div class="download-progress">
								{Math.round(downloadProgress.get(episode.id) ?? 0)}%
							</div>
						{/if}
					</time>
					<div class="episode-card__title">{episode.title}</div>
				</div>
			</button>

			<dialog id="details-{episode.id}" class="episode-details">
				<div class="episode-details__content">
					<header class="episode-details__header">
						{#if feedIconsById}
							<img
								class="episode-details__image"
								src={`data:${feedIconsById.get(episode.feedId)}`}
								alt=""
							/>
						{/if}
						<div class="episode-details__title">{episode.title}</div>
						<time class="episode-details__time">
							<div>{formatEpisodeDate(episode.publishedAt)}</div>
							<div><Dot size="14" /></div>
							<div>{formatEpisodeDuration(episode.durationMin)}</div>
						</time>
					</header>

					<div class="episode-details__description">
						{@html episode.content}
					</div>

					<footer class="episode-details__actions">
						<button class="episode-details__action-btn" onclick={() => playEpisode(episode)}>
							<Play size="1.5rem" /> Play
						</button>
						<button class="episode-details__action-btn" onclick={() => downloadEpisode(episode)}>
							<Plus size="1.5rem" /> Up Next
						</button>
					</footer>
				</div>
			</dialog>
		</article>
	{/each}
</div>

<style>
	.episode-list {
		display: flex;
		flex-direction: column;
	}

	.episode-card--playing {
		background: radial-gradient(
			circle at top right,
			var(--bg-less) 0%,
			var(--bg) 70%,
			var(--primary) 100%
		);
	}

	.episode-card--playing-no-image {
		background: radial-gradient(
			ellipse at top left,
			var(--bg-less) 0%,
			var(--bg) 60%,
			var(--primary) 100%
		);
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
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--primary);
		min-height: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.episode-details {
		height: 100vh;
		max-width: 100vw;
		max-height: 100vh;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: none;
		background: var(--bg);
		color: var(--text);
	}

	.episode-details__content {
		display: grid;
		height: 100vh;
		grid-template-rows: auto 1fr auto;
		gap: 2rem;
		box-sizing: border-box;
		padding: 2rem;
	}

	.episode-details__header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 2rem;
	}

	.episode-details__image {
		max-width: 60vw;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.5rem;
	}

	.episode-details__title {
		font-size: var(--text-2xl);
		font-weight: 600;
		margin: 0;
	}

	.episode-details__time {
		font-size: var(--text-medium);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.episode-details__description {
		overflow-y: auto;
	}

	.episode-details__actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		padding: 1rem 0;
	}

	.episode-details__action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--primary-less);
		color: var(--neutral);
		border: none;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
	}

	.episode-details__action-btn:hover {
		background: var(--primary);
	}

	.download-progress {
		color: var(--primary);
		font-size: var(--text-small);
		min-width: 3ch;
	}
</style>
