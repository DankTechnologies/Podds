<script lang="ts">
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { LandPlot, Rocket, Loader2, X } from 'lucide-svelte';
	import { getSettings } from '$lib/stores/db.svelte';

	let settings = $derived(getSettings());
	let isPwaConfigured = $derived(settings.isPwaInstalled);

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
				showAndroidInstallButton = false;
				showAndroidLaunchButton = true;
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
			<div class="logo-text">podds</div>
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
		{#if isAppleWeb}
			<button class="install-button" onclick={onIosInstall}>
				<LandPlot size="16" />
				Install podds
			</button>
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
	</div>
{/if}

<style>
	.setup-wizard {
		background: var(--primary);
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 1rem 0.25rem 0.25rem;
		align-items: center;
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
		height: 3rem;
	}

	.logo-text {
		font-size: var(--text-2xl);
		letter-spacing: 0.15em;
		font-weight: bold;
		color: var(--grey-100);
		transform: rotate(-3deg);
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
