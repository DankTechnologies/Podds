<script lang="ts">
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { LandPlot, Rocket, Loader2, X } from 'lucide-svelte';
	import { getSettings } from '$lib/stores/db.svelte';
	import { page } from '$app/state';

	let settings = $derived(getSettings());
	let isPwaConfigured = $derived(settings.isPwaInstalled);

	let isPodcastsPage = $derived(page.url.pathname === '/');

	// @ts-ignore
	let showAndroidInstallButton = $state(window.deferredInstallPrompt !== undefined);
	let showAndroidLaunchButton = $state(false);
	let isInstalling = $state(false);
	let isAndroidWeb = $derived(!isAppleDevice && !isPwa);
	let showAndroidInstructions = $state(false);

	let showIosInstructions = $state(false);
	let isAppleWeb = $derived(isAppleDevice && !isPwa);

	async function onInstall() {
		isInstalling = true;

		// @ts-ignore
		window.deferredInstallPrompt.prompt();

		// @ts-ignore
		const { outcome } = await window.deferredInstallPrompt.userChoice;
		if (outcome === 'accepted') {
			window.addEventListener('appinstalled', () => {
				setTimeout(() => {
					showAndroidInstallButton = false;
					showAndroidLaunchButton = true;
				}, 3000);
			});
		}
		// @ts-ignore
		window.deferredInstallPrompt = null;
	}

	function onLaunch() {
		window.open(window.location.href, '_blank');
	}

	function onAndroidInstall() {
		showAndroidInstructions = true;
	}

	function closeAndroidInstructions() {
		showAndroidInstructions = false;
	}

	function onIosInstall() {
		showIosInstructions = true;
	}

	function closeIosInstructions() {
		showIosInstructions = false;
	}
</script>

{#if !isPwaConfigured}
	<div class="setup-wizard" class:is-pwa={isPwa}>
		<div class="logo-container">
			<img src="/podds.svg" alt="Podds" class="logo" />
			<svg class="wave" xmlns="http://www.w3.org/2000/svg"
				><defs
					><pattern
						id="c"
						width="60"
						height="60"
						patternTransform="rotate(5)scale(3)"
						patternUnits="userSpaceOnUse"
						><rect width="100%" height="100%" fill="var(--wave-bg)" /><path
							fill="none"
							stroke="var(--wave-fg)"
							d="M10 60V30m10 0v30m10 0H0V30M50 0v30m-10 0V0M30 0h30v30M30 40h30m0 10H30m0-20h30v30H30zM0 10h30m0 10H0M0 0h30v30H0z"
						/></pattern
					></defs
				><rect width="800%" height="800%" fill="url(#c)" /></svg
			>
		</div>
		{#if isAndroidWeb}
			{#if showAndroidInstallButton}
				<button class="install-button" onclick={onInstall} disabled={isInstalling}>
					{#if isInstalling}
						<Loader2 class="spinner" size="16" />
					{:else}
						<LandPlot size="16" />
					{/if}
					Install podds
				</button>
			{:else if showAndroidLaunchButton}
				<button class="install-button" onclick={onLaunch}><Rocket size="16" /> Launch podds</button>
			{:else}
				<button class="install-button" onclick={onAndroidInstall}>
					<LandPlot size="16" />
					Install podds
				</button>
			{/if}
		{/if}
		{#if isAppleWeb && !isPodcastsPage}
			<button class="install-button" onclick={onIosInstall}>
				<LandPlot size="16" />
				Install podds
			</button>
		{/if}
	</div>
{/if}

{#if showIosInstructions}
	<dialog class="instructions" open>
		<div class="instructions-header">
			<div class="instructions-header-title">Install podds app</div>
			<button class="instructions-close-button" onclick={closeIosInstructions}
				><X size="24" /></button
			>
		</div>
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
	</dialog>
{/if}
{#if showAndroidInstructions}
	<dialog class="instructions" open>
		<div class="instructions-header">
			<div class="instructions-header-title">Install podds app</div>
			<button class="instructions-close-button" onclick={closeAndroidInstructions}
				><X size="24" /></button
			>
		</div>
		<div class="instructions-install-text">You only need to do this once</div>
		<ol class="instructions-list">
			<li>
				Tap the <img src="/android-more.svg" alt="Share button" class="icon" /> button
			</li>
			<li>
				Tap <img src="/android-add-to-home-screen.svg" alt="Add to Home Screen" class="icon" />
			</li>
			<li>
				Tap the <img src="/podds.svg" alt="Podds" class="icon" /> button
				<div class="instructions-list-item-text">on your home screen</div>
			</li>
		</ol>
	</dialog>
{/if}

<style>
	.setup-wizard {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 1rem 0.25rem 0.5rem;
		height: 4rem;
		align-items: center;
		view-transition-name: setup-wizard;
	}

	.setup-wizard.is-pwa {
		background: light-dark(var(--grey-700), var(--grey-900));
	}

	.logo-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo {
		height: 4rem;
		opacity: 1;
	}

	.wave {
		position: absolute;
		top: 0;
		left: 0;
		height: 4.5rem;
		width: 100%;
		z-index: -1;
		border-bottom: 3px solid light-dark(var(--grey-750), var(--primary-more));
		opacity: 0.7;
		filter: contrast(125%);
		--wave-bg: light-dark(var(--bg-less), var(--bg-less));
		--wave-fg: light-dark(var(--grey-750), var(--primary-more));
	}

	.install-button {
		display: flex;
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

	.install-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.install-button :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.instructions {
		border: none;
		width: 60vw;
		padding: 1rem 0.5rem 1rem 1rem;
		z-index: 1000;
		border-radius: 0.25rem;
		position: fixed;
		top: 4rem;
	}

	.instructions-install-text {
		font-size: var(--text-xs);
	}

	.instructions-list {
		line-height: 3.5;
		padding-left: 1.5rem;
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

	.instructions-close-button {
		background: none;
		border: none;
		color: var(--text);
	}

	.instructions-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.instructions-header-title {
		font-size: var(--text-xl);
		font-weight: bold;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
