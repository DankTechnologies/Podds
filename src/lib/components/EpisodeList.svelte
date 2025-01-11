<script lang="ts">
	import type { EpisodeExt } from '$lib/service/PodcastService';

	let { episodes }: { episodes: EpisodeExt[] } = $props();
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
</script>

<div class="episode-list">
	{#each episodes as episode}
		<button class="episode-card" type="button" onclick={() => toggleExpanded(episode.id!)}>
			{#if episode.icon}
				<img class="episode-card__image" src={`data:${episode.icon}`} alt="Feed icon" />
			{/if}
			<div class="episode-card__content">
				<time class="episode-card__time">
					{new Date(episode.publishedAt).toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</time>
				<div class="episode-card__title">{episode.title}</div>
			</div>
		</button>

		{#if isExpanded(episode.id!)}
			<div class="episode-card__description">
				{@html episode.content}
			</div>
		{/if}
	{/each}
</div>

<style>
	.episode-list {
		display: flex;
		flex-direction: column;
	}

	.episode-card {
		display: flex;
		gap: 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid grey;
		padding: 0.5rem 0;
		text-align: left;
	}

	.episode-card__image {
		width: 5rem;
		aspect-ratio: 1;
		object-fit: cover;
	}

	.episode-card__content {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.25rem;

		/* Add padding when there's no image sibling */
		:not(:has(+ .episode-card__image)) {
			padding-left: 0.5rem;
		}
	}

	.episode-card__title {
		font-weight: 600;
	}

	.episode-card__time {
		font-size: 0.75rem;
		color: darkslategray;
	}

	.episode-card__description {
		padding: 1rem;
		font-size: 0.875rem;

		/* dynamic @html content */

		/* compensate for parent padding */
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
</style>
