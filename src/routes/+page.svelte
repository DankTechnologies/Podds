<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFeeds } from '$lib/stores/db.svelte';
	import type { Feed } from '$lib/types/db';
	import { Settings, Share2 } from 'lucide-svelte';
	import { shareFeed as shareFeedUtil } from '$lib/utils/share';
	import { getSettings } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';

	let feeds = $derived(
		getFeeds()
			.reduce((unique: Feed[], feed) => {
				if (!unique.some((f) => f.id === feed.id)) {
					unique.push(feed);
				}
				return unique;
			}, [])
			.sort((a, b) => {
				const titleA = a.title.replace(/^(the|a|an)\s+/i, '');
				const titleB = b.title.replace(/^(the|a|an)\s+/i, '');
				return titleA.localeCompare(titleB);
			})
	);

	function shareAllFeeds() {
		const settings = getSettings();
		if (!settings) {
			Log.error('Settings not found, skipping share link');
			return;
		}

		// Share the first feed as a simple way to share the app
		if (feeds.length > 0) {
			shareFeedUtil(feeds[0], settings.podcastIndexKey, settings.podcastIndexSecret);
		}
	}
</script>

<div class="grid">
	{#each feeds as feed}
		<div class="grid-item">
			<button
				onclick={() => goto(`/podcast/${feed.id}`)}
				aria-label={`Go to ${feed.title} podcast`}
			>
				<img src={`data:${feed.iconData}`} alt={feed.title} />
			</button>
		</div>
	{/each}
</div>

<div class="subnav-container">
	<button class="subnav" onclick={shareAllFeeds}>
		<Share2 size="128" />
	</button>
	<button class="subnav" onclick={() => goto('/settings')}>
		<Settings size="128" />
	</button>
</div>

<svg width="0" height="0">
	<defs>
		<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
			<feDropShadow
				dx="-7"
				dy="7"
				stdDeviation="1"
				flood-color="var(--grey-medium)"
				flood-opacity="0.3"
			/>
			<feDropShadow
				dx="-14"
				dy="6"
				stdDeviation="1"
				flood-color="var(--grey-dark)"
				flood-opacity="0.08"
			/>
			<feDropShadow
				dx="10"
				dy="-8"
				stdDeviation="1"
				flood-color="var(--grey-dark)"
				flood-opacity="0.10"
			/>
		</filter>
		<radialGradient id="gradient" cx="0%" cy="100%" r="100%" fx="0%" fy="100%">
			<stop offset="0%" style="stop-color: var(--primary-less); stop-opacity: 0.9" />
			<stop
				offset="40%"
				style="stop-color: color-mix(in oklch, var(--primary) 50%, var(--primary-less) 10%); stop-opacity: 0.95"
			/>
			<stop
				offset="70%"
				style="stop-color: color-mix(in oklch, var(--bg-less) 7%, var(--primary) 70%); stop-opacity: 0.9"
			/>
			<stop offset="100%" style="stop-color: var(--primary); stop-opacity: 0.85" />
		</radialGradient>
	</defs>
</svg>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.25rem;
		padding: 0.25rem;
	}

	.grid-item {
		line-height: 0;
	}

	.grid-item button {
		border: 0;
		padding: 0;
		background: none;
		line-height: 0;
		height: 100%;
		width: 100%;
	}

	.grid-item img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.125rem;
	}

	.subnav-container {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		background: var(--bg);
	}

	.subnav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 128px;
		height: 128px;
		background: none;
		color: var(--neutral);
		border: none;
		border-radius: 0.25rem;
		font-weight: 600;
		font-size: var(--text-2xl);
	}

	.subnav :global(svg) {
		stroke: url(#gradient);
	}

	.subnav :global(svg) {
		width: 100%;
		height: 100%;
	}

	@media (prefers-color-scheme: light) {
		.subnav :global(svg) {
			filter: url(#shadow);
		}
	}
</style>
