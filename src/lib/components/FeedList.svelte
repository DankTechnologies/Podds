<script lang="ts">
	import type { Feed } from '$lib/types/db';
	import { SvelteMap } from 'svelte/reactivity';
	import { parseTitle } from '$lib/utils/feedParser';
	import { formatEpisodeDate } from '$lib/utils/time';
	import {
		History,
		List,
		Plus,
		Loader2,
		Antenna,
		ArrowUpLeft,
		CirclePlus,
		CheckCircle,
		CircleFadingPlus
	} from 'lucide-svelte';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { goto } from '$app/navigation';
	import { isAppleDevice } from '$lib/utils/osCheck';

	let {
		feeds,
		currentFeeds
	}: {
		feeds: Feed[];
		currentFeeds: { id: string }[];
	} = $props();

	let focusedFeedId = $state<string | null>(null);
	let feedService = new FeedService();
	let feedStates = $state(new SvelteMap<string, 'adding' | 'success' | 'failure'>());

	async function addFeed(feed: Feed) {
		feedStates.set(feed.id.toString(), 'adding');
		const success = await feedService.addFeed($state.snapshot(feed));
		feedStates.set(feed.id.toString(), success ? 'success' : 'failure');
	}

	function isFeedSubscribed(feed: Feed) {
		return currentFeeds?.some((f) => f.id === feed.id.toString());
	}

	function toggleFeedFocus(feed: Feed) {
		focusedFeedId = focusedFeedId === feed.id.toString() ? null : feed.id.toString();

		if (focusedFeedId) {
			// Use requestAnimationFrame to ensure DOM updates are complete
			requestAnimationFrame(() => {
				const card = document.querySelector(`.feed-card__wrapper[data-feed-id="${feed.id}"]`);
				if (card) {
					const cardBottom = card.getBoundingClientRect().bottom;
					if (cardBottom + 350 > window.innerHeight) {
						// Use a more reliable scroll approach
						const scrollOptions: ScrollIntoViewOptions = {
							behavior: 'smooth',
							block: 'center'
						};

						// Try smooth scrolling first, fall back to instant if needed
						try {
							card.scrollIntoView(scrollOptions);
						} catch (e) {
							// Fallback for browsers that don't support smooth scrolling
							scrollOptions.behavior = 'auto';
							card.scrollIntoView(scrollOptions);
						}
					}
				}
			});
		}
	}

	function handleFeedAction(feed: Feed, e: Event) {
		e.stopPropagation();
		if (isFeedSubscribed(feed)) {
			goto(`/podcast/${feed.id}`);
		} else {
			addFeed(feed);
		}
	}
</script>

<ul class="feed-list" role="list">
	{#each feeds as feed (feed.id)}
		<li
			class="feed-card fade-in"
			class:feed-card--focused={focusedFeedId === feed.id.toString()}
			class:feed-card--subscribed={isFeedSubscribed(feed)}
		>
			<div
				class="feed-card__wrapper"
				data-feed-id={feed.id}
				onclick={() => toggleFeedFocus(feed)}
				onkeydown={(e) => e.key === 'Enter' && toggleFeedFocus(feed)}
				role="button"
				tabindex="0"
			>
				<div class="feed-card__content">
					<div
						class="feed-card__image-container"
						onclick={(e) => handleFeedAction(feed, e)}
						onkeydown={(e) => e.key === 'Enter' && handleFeedAction(feed, e)}
						aria-label="Add {parseTitle(feed.title)}"
						role="button"
						tabindex="0"
					>
						<img
							src={`data:${feed.iconData}`}
							alt={feed.title}
							class="feed-card__image fade-in"
							loading={isAppleDevice ? 'eager' : 'lazy'}
							decoding={isAppleDevice ? 'auto' : 'async'}
						/>
						{#if isFeedSubscribed(feed)}
							<div class="added-overlay">
								<CheckCircle class="added-overlay-icon circle-icon" size="28" />
							</div>
						{:else if feedStates.get(feed.id.toString()) === 'adding'}
							<div class="added-overlay">
								<CirclePlus class="added-overlay-icon plus-icon pulse-icon" size="28" />
							</div>
						{:else}
							<button class="added-overlay">
								<CirclePlus class="added-overlay-icon plus-icon" size="28" />
							</button>
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
								<span>{formatEpisodeDate(feed.newestItemPubdate)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="feed-controls" class:feed-controls--hidden={focusedFeedId !== feed.id.toString()}>
				<div class="feed-controls__description-wrapper">
					<div class="feed-controls__description">{@html feed.description}</div>
				</div>
				{#if feedStates.get(feed.id.toString()) === 'failure'}
					<div class="feed-controls__error-message">
						couldn't get episodes <ArrowUpLeft size="16" /> try later
					</div>
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	.feed-list {
		display: flex;
		flex-direction: column;
		padding-bottom: 10rem;
		overflow-y: hidden;
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
		box-sizing: border-box;
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
		aspect-ratio: 1;
		border-radius: 0.25rem;
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
		text-wrap-style: pretty;
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

	.feed-card--subscribed .feed-card__meta {
		color: var(--success);
		transition: color 150ms ease-in-out;
	}

	.meta-with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.added-overlay {
		position: absolute;
		bottom: 0.25rem;
		right: 0.25rem;
		padding: 0;
		border-radius: 50%;
		color: light-dark(var(--primary), var(--primary-more));
		background: light-dark(var(--grey-100), var(--grey-750));
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	:global(.added-overlay-icon) {
		stroke-width: 1.5;
	}

	:global(.circle-icon) {
		color: var(--success);
		transition: color 150ms ease-in-out;
	}

	:global(.pulse-icon) {
		animation: pulse 1.25s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			opacity: 1;
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
		transform: scaleY(0);
		transform-origin: top;
		opacity: 0;
		overflow: hidden;
		height: 0;
	}

	.feed-controls--hidden {
		background: var(--bg);
		pointer-events: none;
	}

	.feed-controls:not(.feed-controls--hidden) {
		transform: scaleY(1);
		opacity: 1;
		height: auto;
		transition:
			transform 150ms ease-in-out,
			opacity 150ms ease-in-out;
	}

	.feed-controls__description-wrapper {
		padding: 1rem;
	}

	.feed-controls__description {
		font-size: var(--text-small);
		line-height: var(--line-height-normal);
		text-wrap-style: pretty;
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

	.feed-controls__error-message {
		display: flex;
		align-items: center;
		padding: 1rem;
		gap: 0.5rem;
		opacity: 0.8;
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--error);
	}
</style>
