<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFeeds } from '$lib/stores/db.svelte';
	import type { Feed } from '$lib/types/db';
	import type { GridItem } from '$lib/types/grid';
	import { isShortcut } from '$lib/types/grid';
	import { RefreshCw, Settings, Share2 } from 'lucide-svelte';
	import { shareFeed as shareFeedUtil } from '$lib/utils/share';
	import { getSettings } from '$lib/stores/db.svelte';
	import { Log } from '$lib/service/LogService';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { applyUpdate } from '$lib/utils/versionUpdate';

	function getShortcutPosition(feeds: Feed[]): number {
		const numColumns = Math.floor(window.innerWidth / 128);
		const lastFullRow = Math.floor(window.innerHeight / 128);

		const numRows = Math.floor(feeds.length / numColumns);

		const startOfLastRow = numColumns * lastFullRow - numColumns;

		return numRows > lastFullRow ? startOfLastRow : feeds.length;
	}

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

	let shortcutPosition = $derived(getShortcutPosition(feeds));

	let feedsAndShortcuts: GridItem[] = $derived.by(() => {
		let result: GridItem[] = [...feeds];

		// Insert settings button
		result.splice(shortcutPosition, 0, {
			type: 'shortcut',
			id: 'settings',
			url: '/settings',
			svg: Settings
		});

		// Insert share button
		result.splice(shortcutPosition + 1, 0, {
			type: 'shortcut',
			id: 'share',
			action: shareAllFeeds,
			svg: Share2
		});

		// Insert update button if needed
		if (SessionInfo.hasUpdate) {
			result.splice(shortcutPosition + 2, 0, {
				type: 'shortcut',
				id: 'update',
				action: handleUpdate,
				svg: RefreshCw
			});
		}

		return result;
	});

	function shareAllFeeds() {
		const settings = getSettings();
		if (!settings) {
			Log.error('Settings not found, skipping share link');
			return;
		}

		// Share the first feed as a simple way to share the app
		const feeds = getFeeds();
		if (feeds.length > 0) {
			shareFeedUtil(feeds[0], settings.podcastIndexKey, settings.podcastIndexSecret);
		}
	}

	function handleUpdate() {
		// Replace body content with the loading screen from app.html
		document.body.innerHTML =
			'<div id="appLoading"><img src="/podds.svg" alt="Loading..." /></div>';
		applyUpdate();
	}
</script>

<div class="grid">
	{#each feedsAndShortcuts as x}
		{#if isShortcut(x)}
			<div class="subnav-container">
				<button
					class="subnav"
					onclick={() => {
						if (x.url) {
							goto(x.url);
						} else if (x.action) {
							x.action();
						}
					}}
				>
					<x.svg size="128" />
				</button>
			</div>
		{:else}
			<div class="grid-item">
				<button onclick={() => goto(`/podcast/${x.id}`)} aria-label={`Go to ${x.title} podcast`}>
					<img src={`data:${x.iconData}`} alt={x.title} />
				</button>
			</div>
		{/if}
	{/each}
</div>

<svg width="0" height="0">
	<defs>
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
</style>
