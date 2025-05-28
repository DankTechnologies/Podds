<script lang="ts">
	import { DefaultSettings, SettingsService } from '$lib/service/SettingsService.svelte';
	import type { Settings } from '$lib/types/db';
	import { Loader2, FlaskRound, RotateCcw, Rss, Waypoints } from 'lucide-svelte';

	let {
		settings = $bindable<Settings>(),
		onTestComplete,
		onSave
	}: {
		settings: Settings;
		onTestComplete?: (isValid: boolean) => void;
		onSave?: () => void;
	} = $props();

	let corsTestUrl = $state('https://feeds.publicradio.org/public_feeds/marketplace');
	let corsStatus = $state<'untested' | 'testing' | 'success' | 'error'>('untested');
	let corsStatus2 = $state<'untested' | 'testing' | 'success' | 'error'>('untested');
	let isValid = $derived(corsStatus === 'success');

	function handleCorsChange() {
		const isCustom =
			settings.corsHelper !== DefaultSettings.corsHelper ||
			settings.corsHelper2 !== DefaultSettings.corsHelper2;
		settings.isCustomCorsHelpers = isCustom;
		onSave?.();
	}

	function handleReset() {
		SettingsService.resetCorsHelpers();
		settings = {
			...settings,
			corsHelper: DefaultSettings.corsHelper,
			corsHelper2: DefaultSettings.corsHelper2,
			isCustomCorsHelpers: false
		};
		onSave?.();
	}

	async function testCorsHelpers() {
		if (settings.corsHelper) {
			try {
				const corsUrl = `${settings.corsHelper}?url=${encodeURIComponent(corsTestUrl)}`;
				const response = await fetch(corsUrl);
				corsStatus = response.ok ? 'success' : 'error';
			} catch (error) {
				corsStatus = 'error';
			}
		} else {
			corsStatus = 'untested';
		}

		if (settings.corsHelper2) {
			try {
				const corsUrl2 = `${settings.corsHelper2}?url=${encodeURIComponent(corsTestUrl)}`;
				const corsResponse2 = await fetch(corsUrl2);
				corsStatus2 = corsResponse2.ok ? 'success' : 'error';
			} catch (error) {
				corsStatus2 = 'error';
			}
		} else {
			corsStatus2 = 'untested';
		}
	}

	async function handleTest() {
		corsStatus = 'testing';
		corsStatus2 = 'testing';
		await Promise.all([testCorsHelpers()]);
		onTestComplete?.(isValid);
	}
</script>

<section class="section">
	<div>
		<div class="section-header">CORS Proxies</div>
		<div class="cors-container">
			<div class="input-group">
				<label for="corsHelper" class="label-with-icon">
					<Waypoints class="icon" size={16} /> Primary
				</label>
				<input
					id="corsHelper"
					class="api-input"
					spellcheck="false"
					type="text"
					bind:value={settings.corsHelper}
					onchange={handleCorsChange}
					required
				/>
			</div>
			<div class="input-group">
				<label for="corsHelper2" class="label-with-icon">
					<Waypoints class="icon" size={16} /> Backup
				</label>
				<input
					id="corsHelper2"
					class="api-input"
					spellcheck="false"
					type="text"
					bind:value={settings.corsHelper2}
					onchange={handleCorsChange}
					required
				/>
			</div>
			<div class="input-group">
				<label for="corsTestUrl" class="label-with-icon">
					<Rss class="icon" size={16} /> Test RSS Feed
				</label>
				<input
					id="corsTestUrl"
					class="api-input"
					spellcheck="false"
					type="text"
					bind:value={corsTestUrl}
					placeholder="URL to test CORS helper with"
				/>
			</div>
			<div class="status-container">
				<div class="status-item">
					<span class="status-label">Primary Proxy:</span>
					<div
						role="status"
						class="status"
						class:success={corsStatus === 'success'}
						class:error={corsStatus === 'error'}
						class:testing={corsStatus === 'testing'}
					>
						{#if corsStatus === 'untested'}
							Not tested
						{:else if corsStatus === 'testing'}
							Testing...
						{:else if corsStatus === 'success'}
							Works!
						{:else}
							No luck
						{/if}
					</div>
				</div>
				<div class="status-item">
					<span class="status-label">Backup Proxy:</span>
					<div
						role="status"
						class="status"
						class:success={corsStatus2 === 'success'}
						class:error={corsStatus2 === 'error'}
						class:testing={corsStatus2 === 'testing'}
					>
						{#if corsStatus2 === 'untested'}
							Not tested
						{:else if corsStatus2 === 'testing'}
							Testing...
						{:else if corsStatus2 === 'success'}
							Works!
						{:else}
							No luck
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<div class="actions">
	<button
		type="button"
		onclick={handleTest}
		disabled={corsStatus === 'testing' || corsStatus2 === 'testing'}
	>
		{#if corsStatus === 'testing' || corsStatus2 === 'testing'}
			<Loader2 size="16" class="spinner" /> Testing...
		{:else}
			<FlaskRound size="16" /> Run Tests
		{/if}
	</button>
	<button type="button" onclick={handleReset} class="reset-button"
		><RotateCcw size="16" /> Use Public Proxies
	</button>
</div>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 2rem;

		& > div {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		& > div > .section-header {
			background-color: light-dark(var(--grey-200), var(--grey-800));
			color: light-dark(var(--primary-grey-dark), var(--text));
			padding: 0.25rem 0.75rem;
			border-radius: 0.25rem;
			letter-spacing: 0.05em;
			font-weight: 600;
			font-size: var(--text-large);
		}

		label {
			font-weight: 600;
			font-size: var(--text-large);
		}
	}

	.cors-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.label-with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		:global(.icon) {
			color: var(--primary);
			transition: color 0.2s ease;
		}
	}

	input {
		background-color: var(--bg-less);
		border: 1px solid var(--bg-less);
		color: var(--text);
		padding: 0.5em;
		border-radius: 0.25rem;
	}

	.api-input {
		font-family: monospace;
	}

	.status {
		font-family: monospace;
	}

	.status.success {
		color: var(--success);
	}

	.status.error {
		color: var(--error);
	}

	.status.testing {
		color: var(--primary);
	}

	.actions {
		display: flex;
		margin-top: 2rem;
		gap: 2rem;
	}

	.actions button {
		display: flex;
		min-width: 8.5rem;
		font-weight: 600;
		align-items: center;
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		background: var(--bg-less);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
	}

	.actions button:disabled {
		opacity: 0.7;
	}

	.actions button :global(.spinner) {
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

	.status-container {
		display: flex;
		flex-direction: column;
		padding: 0.25rem 0.75rem;
		gap: 0.5rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-label {
		min-width: 120px;
	}
</style>
