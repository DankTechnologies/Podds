<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFeeds } from '$lib/stores/db.svelte';
	import type { Feed } from '$lib/types/db';
	import type { GridItem } from '$lib/types/grid';
	import { isShortcut } from '$lib/types/grid';
	import { PackageOpen, RefreshCw, Settings } from 'lucide-svelte';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { applyUpdate } from '$lib/utils/versionUpdate';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { decodeShareLink } from '$lib/utils/share';

	let isApplePwa = $derived(isAppleDevice && isPwa);
	let isAppleWeb = $derived(isAppleDevice && !isPwa);

	let feeds = $derived(
		getFeeds()
			.filter((x) => x.isSubscribed)
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

	function handlePodcastClick(e: MouseEvent, id: string) {
		const img = (e.currentTarget as HTMLElement).querySelector('img');
		if (img) {
			img.style.viewTransitionName = `feed-icon`;
		}
		goto(`/podcast/${id}`);
	}
</script>

{#if isAppleWeb}
	<div class="ios-web">
		<div>Hi there, welcome to podds!</div>
		<div>Install the app to get started</div>
		<div class="instructions-install-text">You only need to do this once</div>
		<ol class="instructions-list">
			<li>
				Tap the <img src="/ios-share.svg" alt="Share button" class="icon" /> button
			</li>
			<li>
				Tap <img src="/ios-add-to-home-screen.svg" alt="Add to Home Screen" class="icon" />
				<div class="instructions-list-item-text">scroll down to find it</div>
			</li>
			<li>
				Tap the <img src="/podds.svg" alt="Podds" class="icon" /> button
				<div class="instructions-list-item-text">on your home screen</div>
			</li>
		</ol>
	</div>
{:else}
	{#if feeds.length === 0}
		<div class="no-feeds">
			<div class="welcome">Welcome to podds!</div>
			<div class="free"><span>podcasts, simple and free</span></div>
			<div>You're all set up to <b><a href="/search">search</a></b> for podcasts</div>
			<div>
				or <b><a href="/settings?section=basic#import">import</a></b> podcasts from another app
			</div>
			<div class="credits">
				<div>from Dank Technologies</div>
				<div>more info @ <a href="https://github.com/DankTechnologies/Podds">GitHub</a></div>
			</div>
		</div>
	{/if}
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
					<button
						onclick={(e) => handlePodcastClick(e, x.id)}
						aria-label={`Go to ${x.title} podcast`}
					>
						<img src={`/icon/${x.id}.png`} alt={x.title} />
					</button>
				</div>
			{/if}
		{/each}
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
		aspect-ratio: 1;
		position: relative;
	}

	.grid-item button {
		border: 0;
		padding: 0;
		background: none;
		line-height: 0;
		height: 100%;
		width: 100%;
		position: relative;
	}

	.grid-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 0.125rem;
		position: absolute;
		top: 0;
		left: 0;
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

	.ios-web {
		display: flex;
		margin-top: 2rem;
		font-size: var(--text-large);
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.no-feeds {
		display: flex;
		font-family: monospace;
		padding: 2rem;
		font-size: var(--text-large);
		flex-direction: column;
		gap: 2.5rem;
	}

	.welcome {
		font-size: var(--text-2xl);
		letter-spacing: 2px;
		transform: rotate(2deg);
	}

	.free {
		margin: -1.5rem 0 1.5rem 0;
		font-size: var(--text-smaller);
		font-weight: bold;
		letter-spacing: 4px;
	}

	.free span {
		position: relative;
		display: inline-block;
		transform: rotate(-0.3deg);
	}

	.free span::after {
		content: '';
		position: absolute;
		left: -1rem;
		width: 110%;
		bottom: -0.2rem;
		padding: 0 0.5rem;
		transform: rotate(0.6deg);
		border-radius: 0.25rem;
		height: 0.9rem;
		background-color: light-dark(
			color-mix(in oklch, var(--primary) 30%, transparent),
			color-mix(in oklch, var(--primary) 60%, transparent)
		);
		z-index: -1;
	}

	.credits {
		padding: 2rem 2rem 0 2rem;
		gap: 0.5rem;
		font-size: var(--text-smaller);
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.instructions-install-text {
		font-size: var(--text-xs);
	}

	.instructions-list {
		line-height: 3;
		scale: 1.2;
		z-index: -1;
		padding: 1rem 3rem;
		border-radius: 0.25rem;
		background: var(--bg-less);
	}

	.instructions-list-item-text {
		font-size: var(--text-xs);
		margin-top: -1rem;
	}

	.icon {
		height: 1.5rem;
		border: 1px solid light-dark(var(--grey), var(--grey-700));
		padding: 0.25rem;
		margin: 0 0.25rem;
		border-radius: 0.25rem;
		vertical-align: middle;
		background: var(--grey-100);
	}
</style>
