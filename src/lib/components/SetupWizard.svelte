<script lang="ts">
	import type { Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import ApiSettings from '$lib/components/ApiSettings.svelte';
	import { isAppleDevice } from '$lib/utils/osCheck';
	import { CheckCircle, Download } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let settings = $state<Settings>({
		id: '1',
		podcastIndexKey: import.meta.env.VITE_PODCAST_INDEX_KEY || '',
		podcastIndexSecret: import.meta.env.VITE_PODCAST_INDEX_SECRET || '',
		corsHelperUrl: import.meta.env.VITE_CORS_HELPER_URL || '',
		syncIntervalMinutes: 15,
		lastSyncAt: new Date(),
		isAdvanced: false,
		logLevel: 'info'
	});

	let isPwaInstalled = $derived(window.matchMedia('(display-mode: standalone)').matches);
	let isConfigValid = $state(false);

	function onTestComplete(isValid: boolean) {
		isConfigValid = isValid;
	}

	function onFinish() {
		SettingsService.saveSettings(settings);
		goto('/search');
	}
</script>

<div class="setup-wizard">
	<div class="header">
		<img src="/podds.svg" alt="Podds" class="logo" />
		<h1>Podds Setup</h1>
	</div>

	<div class="content">
		{#if !isPwaInstalled}
			<div class="step-content">
				<h2>Install Podds</h2>
				<div class="status-item">
					<span class="status-icon"><Download size={20} /></span>
					<span class="status-text">Install as PWA</span>
					{#if isAppleDevice}
						<div class="install-instructions">
							<p>To install Podds on your iOS device:</p>
							<ol>
								<li>Tap the Share button <span class="icon">📤</span> in Safari</li>
								<li>Scroll down and tap "Add to Home Screen"</li>
								<li>Tap "Add" in the top right corner</li>
							</ol>
						</div>
					{:else}
						<div class="install-instructions">
							<p>To install Podds on your Android device:</p>
							<ol>
								<li>Tap the three dots menu <span class="icon">⋮</span> in Chrome</li>
								<li>Select "Install app" or "Add to Home screen"</li>
								<li>Tap "Install" to confirm</li>
							</ol>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="step-content">
				<ApiSettings bind:settings {onTestComplete} />
				<div class="actions">
					<button class="finish-button" onclick={onFinish} disabled={!isConfigValid}>
						<CheckCircle size={20} />
						Complete Setup
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.setup-wizard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo {
		height: 3rem;
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: 600;
		margin: 0;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.step-content {
		background: var(--bg-less);
		padding: 2rem;
		border-radius: 0.5rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.status-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.install-instructions {
		margin-left: auto;
		text-align: right;
		font-size: var(--text-small);
	}

	.install-instructions ol {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		text-align: left;
	}

	.install-instructions .icon {
		font-size: 1.2em;
		vertical-align: middle;
	}

	.actions {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.finish-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 2rem;
		background: var(--success);
		color: white;
		border: none;
		border-radius: 0.25rem;
		font-size: var(--text-large);
		font-weight: 600;
	}

	.finish-button:disabled {
		opacity: 0.3;
		color: var(--neutral);
		cursor: not-allowed;
		background: var(--primary);
	}
</style>
