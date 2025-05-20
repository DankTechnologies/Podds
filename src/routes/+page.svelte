<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFeeds, getSettings } from '$lib/stores/db.svelte';
	import type { Feed } from '$lib/types/db';
	import type { GridItem } from '$lib/types/grid';
	import { isShortcut } from '$lib/types/grid';
	import { PackageOpen, RefreshCw, Settings } from 'lucide-svelte';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { applyUpdate } from '$lib/utils/versionUpdate';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { decodeShareLink } from '$lib/utils/share';

	let isApplePwa = $derived(isAppleDevice && isPwa);

	let settings = $derived(getSettings());

	let isConfigured = $derived(settings.corsHelper);

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

		if (isApplePwa) {
			result.splice(shortcutPosition + 1, 0, {
				type: 'shortcut',
				id: 'receive',
				action: handleReceive,
				svg: PackageOpen
			});
		}

		// Insert update button if needed
		if (SessionInfo.hasUpdate) {
			const position = isApplePwa ? shortcutPosition + 2 : shortcutPosition + 1;
			result.splice(position, 0, {
				type: 'shortcut',
				id: 'update',
				action: handleUpdate,
				svg: RefreshCw
			});
		}

		return result;
	});

	function handleUpdate() {
		// Replace body content with the loading screen from app.html
		document.body.innerHTML =
			'<div id="appLoading"><img src="/podds.svg" alt="Loading..." /></div>';
		applyUpdate();
	}

	async function handleReceive() {
		let shareData = null;

		try {
			shareData = await navigator.clipboard.readText();
		} catch (err) {
			alert('Failed to read clipboard.  Hit the "Paste" button next time');
			return;
		}

		try {
			decodeShareLink(shareData!);

			goto(`/share#${shareData}`);
		} catch (err) {
			alert('No luck.  Tap the "Share with app" button in Safari and try again');
		}
	}

	function getShortcutPosition(feeds: Feed[]): number {
		const numColumns = Math.floor(window.innerWidth / 128);
		const lastFullRow = Math.floor(window.innerHeight / 128);

		const numRows = Math.floor(feeds.length / numColumns);

		const startOfLastRow = numColumns * lastFullRow - numColumns;

		return numRows > lastFullRow ? startOfLastRow : feeds.length;
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
					{#if x.id === 'update'}
						<span class="subnav-title-center">{x.id}</span>
					{/if}
					{#if x.id === 'receive'}
						<span class="subnav-title-bottom-center">{x.id}</span>
					{/if}
				</button>
			</div>
		{:else}
			<div class="grid-item">
				<button onclick={() => goto(`/podcast/${x.id}`)} aria-label={`Go to ${x.title} podcast`}>
					<img
						src={`data:${x.iconData}`}
						alt={x.title}
						loading={isAppleDevice ? 'eager' : 'lazy'}
						decoding={isAppleDevice ? 'auto' : 'async'}
					/>
				</button>
			</div>
		{/if}
	{/each}
</div>
<!-- {#if feeds.length === 0} -->
{#if false}
	<div class="no-feeds">
		<div>Hi there, welcome to podds!</div>
		{#if isConfigured}
			<div>You're all set up to <a href="/search">search</a> for podcasts</div>
			<div>
				or <a href="/settings?section=basic">import</a> from another podcast app
			</div>
		{:else}
			<div>Follow <a href="/settings?section=help">these steps</a> to get it set up</div>
		{/if}
		<div><img alt="smiley" src="/gpa-smiley.svg" />Have fun!</div>
	</div>
{/if}

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
		border: none;
		border-radius: 0.25rem;
		position: relative;
	}

	.subnav :global(svg) {
		stroke: url(#gradient);
	}

	.subnav :global(svg) {
		width: 100%;
		height: 100%;
	}

	.subnav-title-center {
		font-size: var(--text-small);
		color: var(--primary);
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.subnav-title-bottom-center {
		font-size: var(--text-small);
		color: var(--primary);
		position: absolute;
		bottom: 22%;
		left: 50%;
		transform: translate(-50%, -22%);
	}

	.no-feeds {
		display: flex;
		margin-top: 2rem;
		font-size: var(--text-large);
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.no-feeds img {
		height: 1rem;
		margin-right: 0.5rem;
	}
</style>
