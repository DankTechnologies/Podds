<script lang="ts">
	import type { Settings } from '$lib/types/db';
	import PodcastIndexClient from '$lib/api/podcast-index';
	import { getHelperUrl } from '$lib/utils/corsHelper';
	let {
		settings = $bindable<Settings>(),
		onTestComplete
	}: {
		settings: Settings;
		onTestComplete?: (isValid: boolean) => void;
	} = $props();

	let corsTestUrl = $state('https://feeds.publicradio.org/public_feeds/marketplace');
	let podcastIndexStatus = $state<'untested' | 'testing' | 'success' | 'error'>('untested');
	let corsStatus = $state<'untested' | 'testing' | 'success' | 'error'>('untested');
	let corsStatus2 = $state<'untested' | 'testing' | 'success' | 'error'>('untested');
	let isValid = $derived(podcastIndexStatus === 'success' && corsStatus === 'success');

	async function testPodcastIndex() {
		try {
			const api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
			const result = await api.testConnection();
			podcastIndexStatus = result ? 'success' : 'error';
		} catch (error) {
			podcastIndexStatus = 'error';
		}
	}

	async function testCorsHelpers() {
		if (settings.corsHelper) {
			try {
				const corsUrl = `${getHelperUrl(settings.corsHelper)}?url=${encodeURIComponent(corsTestUrl)}`;
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
				const corsUrl2 = `${getHelperUrl(settings.corsHelper2)}?url=${encodeURIComponent(corsTestUrl)}`;
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
		podcastIndexStatus = 'testing';
		corsStatus = 'testing';
		corsStatus2 = 'testing';
		await Promise.all([testPodcastIndex(), testCorsHelpers()]);
		onTestComplete?.(isValid);
	}
</script>

<section class="section">
	<div>
		<label for="podcastIndexKey">Podcast Index Key</label>
		<input
			id="podcastIndexKey"
			class="api-input"
			type="text"
			spellcheck="false"
			bind:value={settings.podcastIndexKey}
			required
		/>
	</div>
	<div>
		<label for="podcastIndexSecret">Podcast Index Secret</label>
		<input
			id="podcastIndexSecret"
			class="api-input"
			type="text"
			spellcheck="false"
			bind:value={settings.podcastIndexSecret}
			required
		/>
	</div>
	<div>
		<label for="corsHelper">CORS Helper</label>
		<input
			id="corsHelper"
			class="api-input"
			spellcheck="false"
			type="text"
			bind:value={settings.corsHelper}
			required
		/>
	</div>
	<div>
		<label for="corsHelper2">CORS Helper 2</label>
		<input
			id="corsHelper2"
			class="api-input"
			spellcheck="false"
			type="text"
			bind:value={settings.corsHelper2}
		/>
	</div>
	<div>
		<label for="corsTestUrl">Test URL</label>
		<input
			id="corsTestUrl"
			class="api-input"
			spellcheck="false"
			type="text"
			bind:value={corsTestUrl}
			placeholder="URL to test CORS helper with"
		/>
	</div>
	<div>
		<label for="connectionStatus">Connection Status</label>
		<div class="status-container">
			<div class="status-item">
				<span class="status-label">Podcast Index:</span>
				<div
					role="status"
					class="status"
					class:success={podcastIndexStatus === 'success'}
					class:error={podcastIndexStatus === 'error'}
					class:testing={podcastIndexStatus === 'testing'}
				>
					{#if podcastIndexStatus === 'untested'}
						Not tested
					{:else if podcastIndexStatus === 'testing'}
						Testing...
					{:else if podcastIndexStatus === 'success'}
						Connection successful
					{:else}
						Connection failed
					{/if}
				</div>
			</div>
			<div class="status-item">
				<span class="status-label">CORS Helper:</span>
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
						Connection successful
					{:else}
						Connection failed
					{/if}
				</div>
			</div>
			<div class="status-item">
				<span class="status-label">CORS Helper 2:</span>
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
						Connection successful
					{:else}
						Connection failed
					{/if}
				</div>
			</div>
		</div>
	</div>
	<div class="actions">
		<button type="button" onclick={handleTest}>Test Connection</button>
	</div>
</section>

<style>
	.section {
		& > div {
			padding-bottom: 2rem;
			display: flex;
			flex-direction: column;
		}

		label {
			font-weight: 600;
			font-size: var(--text-large);
			padding-bottom: 1rem;
		}

		input {
			padding: 0.75rem;
			background-color: var(--bg-less);

			border: 1px solid var(--primary-less);
			color: var(--text);
		}
	}

	input,
	button {
		padding: 0.5em;
		border-radius: 0.25rem;
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

	.api-input {
		font-size: var(--text-small);
		font-family: monospace;
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	.actions button {
		display: flex;
		width: fit-content;
		font-size: var(--text-smallish);
		font-weight: 600;
		align-items: center;
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		flex: 1;
		background: var(--bg-less);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
	}

	.status-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-label {
		min-width: 120px;
		font-weight: 500;
	}
</style>
