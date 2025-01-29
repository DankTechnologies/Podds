<script lang="ts">
	import { goto } from '$app/navigation';
	import MinifluxApi from '$lib/api/MinifluxApi';
	import { type OptionalId, type Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';
	import { onMount } from 'svelte';
	import { decodeShareLink, encodeShareLink } from '$lib/utils/shareLink';

	let settings = $state<OptionalId<Settings>>({
		host: 'https://feed.pitpat.me',
		apiKey: '78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=',
		categories: '5',
		syncIntervalHours: 1
	});

	let isFirstVisit = $state<boolean>(true);
	let apiStatus = $state<'untested' | 'success' | 'error'>('untested');
	let isValid = $derived(
		settings.host &&
			settings.apiKey &&
			settings.categories &&
			settings.syncIntervalHours > 0 &&
			apiStatus === 'success'
	);

	onMount(async () => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			try {
				const decoded = decodeShareLink(hash);
				settings = {
					...decoded,
					syncIntervalHours: 1
				};
				history.replaceState(null, '', window.location.pathname);
				await onTest();
			} catch (error) {
				console.error('Invalid settings URL');
			}
		} else {
			const savedSettings = await SettingsService.getSettings();
			if (savedSettings) {
				settings = savedSettings;
				isFirstVisit = false;
			}
		}
	});

	async function onSave() {
		await SettingsService.saveSettings(settings);
		if (isFirstVisit) goto('/sync');
	}

	async function onTest() {
		const api = new MinifluxApi(settings.host, settings.apiKey);
		try {
			await api.fetchCategories();
			apiStatus = 'success';
		} catch (error) {
			apiStatus = 'error';
		}
	}

	function generateShareableLink() {
		const url = encodeShareLink({
			host: settings.host,
			apiKey: settings.apiKey,
			categories: settings.categories
		});
		navigator.clipboard.writeText(url);
		alert('Shareable link copied to clipboard!');
	}
</script>

<header>
	<h2>Miniflux Configuration</h2>
</header>
<form class="grid">
	<div>
		<label for="host">Host</label>
		<input
			id="host"
			type="url"
			bind:value={settings.host}
			onchange={() => (apiStatus = 'untested')}
			required
		/>
	</div>
	<div>
		<label for="apiKey">API Key</label>
		<input
			id="apiKey"
			type="text"
			bind:value={settings.apiKey}
			onchange={() => (apiStatus = 'untested')}
			required
		/>
	</div>
	<div>
		<label for="categories">Categories</label>
		<input
			id="categories"
			placeholder="Comma-separated IDs"
			bind:value={settings.categories}
			required
		/>
	</div>
	<div>
		<label for="connectionStatus">Connection Status</label>
		<div
			id="connectionStatus"
			role="status"
			class="status"
			class:success={apiStatus === 'success'}
			class:error={apiStatus === 'error'}
		>
			{#if apiStatus === 'untested'}
				Not tested
			{:else if apiStatus === 'success'}
				Connection successful
			{:else}
				Connection failed
			{/if}
		</div>
	</div>
	<div>
		<label for="syncInterval">Sync Interval (hours)</label>
		<input
			id="syncInterval"
			type="number"
			min="1"
			bind:value={settings.syncIntervalHours}
			required
		/>
	</div>
	{#if settings.lastSyncAt}
		<div>
			<label for="lastSync">Last Sync</label>
			<div id="lastSync" role="status" class="status">
				{new Date(settings.lastSyncAt).toLocaleString()}
			</div>
		</div>
	{/if}
	<div class="actions">
		<button type="button" onclick={onTest}>Test Connection</button>
		<button type="button" disabled={!isValid} onclick={generateShareableLink}>Share Config</button>
		<button type="button" disabled={!isValid} onclick={onSave}>Save Changes</button>
	</div>
</form>

<style>
	header {
		padding: 0 1.25rem;
	}

	form {
		display: grid;
	}

	form > div {
		display: flex;
		flex-direction: column;
		padding: 1.25rem;
	}

	label {
		font-weight: bold;
		font-size: larger;
		padding-bottom: 1rem;
	}

	input,
	button {
		padding: 0.5em;
	}

	.status {
		padding: 0.5rem;
		background: whitesmoke;
	}

	.status.success {
		color: darkgreen;
	}

	.status.error {
		color: darkred;
	}

	button:disabled {
		opacity: 0.5;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.actions button {
		flex: 1;
	}
</style>
