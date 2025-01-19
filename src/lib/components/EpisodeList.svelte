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
				{#if episode.icon}
					<img class="episode-card__image" src={`data:${episode.icon}`} alt="" />
				{/if}
				<div class="episode-card__content">
					<time class="episode-card__time" datetime={new Date(episode.publishedAt).toISOString()}>
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
				<div id="details-{episode.id}" class="episode-card__description">
					<div class="episode-card__actions">
						<button class="episode-card__action-btn" aria-label="Play episode">
							<span aria-hidden="true">▶️</span> Play
						</button>
						<button class="episode-card__action-btn" aria-label="Save episode">
							<span aria-hidden="true">🔖</span> Save
						</button>
					</div>
					{@html episode.content}
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

	.episode-card {
		border-bottom: 1px solid lightgrey;
	}

	.episode-card__header {
		display: flex;
		width: 100%;
		background: none;
		border: none;
		padding: 1rem;
		text-align: left;
	}

	.episode-card__image {
		width: 5rem;
		margin-right: 1rem;
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

	.episode-card__actions {
		float: right;
	}

	.episode-card__action-btn {
		display: block;
		background: none;
		border: none;
		font-weight: 500;
		padding: 1rem;
	}

	.episode-card__action-btn:hover {
		color: darkorange;
	}
</style>
