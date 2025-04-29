<script lang="ts">
	import type { PIApiFeed } from '$lib/types/podcast-index';
	import { SvelteMap } from 'svelte/reactivity';
	import { parseTitle } from '$lib/utils/feedParser';
	import { formatEpisodeDate } from '$lib/utils/time';
	import { Check, History, List, Plus, Trash2 } from 'lucide-svelte';
	import { FeedService } from '$lib/service/FeedService';

	let {
		feeds,
		feedIconsById,
		currentFeeds
	}: {
		feeds: PIApiFeed[];
		feedIconsById: SvelteMap<string, string>;
		currentFeeds: { id: string }[];
	} = $props();

	let focusedFeedId = $state<string | null>(null);
	let feedService = new FeedService();

	function addFeed(feed: PIApiFeed) {
		feedService.addFeed(feed, feedIconsById.get(feed.id.toString()) ?? '');
	}

	function deleteFeed(feedId: string) {
		feedService.deleteFeed(feedId);
	}
</script>

<ul class="feed-list" role="list">
	{#each feeds as feed (feed.id)}
		<li class="feed-card fade-in" class:feed-card--focused={focusedFeedId === feed.id.toString()}>
			<button
				class="feed-card__wrapper"
				type="button"
				style:anchor-name={`--feed-${feed.id}`}
				onclick={() =>
					(focusedFeedId = focusedFeedId === feed.id.toString() ? null : feed.id.toString())}
			>
				<div class="feed-card__content">
					<div class="feed-card__image-container">
						{#if !feedIconsById.has(feed.id.toString())}
							<div class="skeleton"></div>
						{:else if feedIconsById.get(feed.id.toString()) !== null}
							<img
								src={feedIconsById.get(feed.id.toString())}
								alt={feed.title}
								class="feed-card__image fade-in"
							/>
						{:else}
							<div class="feed-card__image">
								<div class="fallback">
									<span>{feed.title[0]?.toUpperCase() || '?'}</span>
								</div>
							</div>
						{/if}
						{#if currentFeeds?.some((f) => f.id === feed.id.toString())}
							<div class="added-overlay">
								<Check size="2rem" />
							</div>
						{/if}
					</div>
					<div class="feed-card__heading">
						<div class="feed-card__title">{parseTitle(feed.title)}</div>
						<div class="feed-card__meta">
							<div class="meta-with-icon">
								<List size="0.75rem" />
								<span>{feed.episodeCount} episodes</span>
							</div>
						</div>
						<div class="feed-card__meta">
							<div class="meta-with-icon">
								<History size="0.75rem" />
								<span>{formatEpisodeDate(feed.newestItemPubdate * 1000)}</span>
							</div>
						</div>
					</div>
				</div>
			</button>

			<div class="feed-controls" class:feed-controls--hidden={focusedFeedId !== feed.id.toString()}>
				<div class="feed-controls__description-wrapper">
					<div class="feed-controls__description">{@html feed.description}</div>
				</div>
				<div class="feed-controls__buttons">
					{#if currentFeeds?.some((f) => f.id === feed.id.toString())}
						<button class="feed-controls__button" onclick={() => deleteFeed(feed.id.toString())}>
							<Trash2 size="16" /> Delete Feed
						</button>
					{:else}
						<button class="feed-controls__button" onclick={() => addFeed(feed)}>
							<Plus size="16" /> Add Feed
						</button>
					{/if}
				</div>
			</div>
		</li>
	{/each}
</ul>

<style>
	.feed-list {
		display: flex;
		flex-direction: column;
		padding-bottom: 10rem;
	}

	.feed-card {
		transition: background 150ms ease-out;
		position: relative;
		border-bottom: 1px solid light-dark(var(--primary-less), var(--primary-grey-light));
	}

	.feed-card--focused {
		background: var(--bg-less);
		border-bottom: 0.4rem solid light-dark(var(--primary), var(--primary-more));
		transition: border-bottom 150ms ease-in-out;
	}

	.feed-card__wrapper {
		width: 100%;
		background: none;
		border: none;
		padding: 1rem;
		text-align: left;
		color: var(--text);
	}

	.feed-card--focused .feed-card__wrapper {
		border-bottom: none;
	}

	.feed-card__content {
		display: flex;
		gap: 1rem;
	}

	.feed-card__image-container {
		position: relative;
		width: 5rem;
		height: 5rem;
		background: var(--bg-less);
	}

	.feed-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.feed-card__image .fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		color: var(--text-less);
	}

	.feed-card__heading {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.25rem;
	}

	.feed-card__title {
		font-weight: 600;
		line-height: var(--line-height-normal);
		font-size: var(--text-medium);
	}

	.feed-card__meta {
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.1rem;
	}

	.feed-card--focused .feed-card__meta {
		color: light-dark(var(--primary), var(--primary-more));
	}

	.meta-with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.added-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral);
	}

	.skeleton {
		width: 100%;
		height: 100%;
		background: var(--bg-less);
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			opacity: 0.6;
		}
	}

	.fade-in {
		animation: fadeIn 0.2s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.feed-controls {
		max-height: 0;
		opacity: 0;
		overflow: hidden;
		background: var(--bg-less);
	}

	.feed-controls--hidden {
		max-height: 0;
		opacity: 0;
		transition: all 150ms ease-in-out;
		background: var(--bg);
		pointer-events: none;
	}

	.feed-controls:not(.feed-controls--hidden) {
		max-height: 600px;
		opacity: 1;
		transition: all 150ms ease-in-out;
	}

	.feed-controls__description-wrapper {
		padding: 1rem;
	}

	.feed-controls__buttons {
		display: flex;
		background: var(--bg-less);
		padding: 1rem;
		gap: 1rem;
	}

	.feed-controls__button {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		gap: 0.5rem;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
	}

	.feed-controls__description {
		font-size: var(--text-small);
		line-height: var(--line-height-normal);
		overflow: hidden;
		border-left: 0.5rem solid light-dark(var(--primary), var(--primary-more));
		padding: 0 1rem;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		-webkit-box-orient: vertical;
		word-break: break-word;

		:global(p) {
			margin: 0;
		}
	}
</style>
