<script lang="ts">
	import { goto } from '$app/navigation';
	import { SessionInfo, SettingsService } from '$lib/service/SettingsService.svelte';
	import { onMount } from 'svelte';
	import { decodeShareLink, encodeShareLink } from '$lib/utils/shareLink';
	import { applyUpdate } from '$lib/utils/versionUpdate';
	import { Log } from '$lib/service/LogService';
	import MinifluxClient from '$lib/api/miniflux';
	import { db } from '$lib/stores/db.svelte';
	import type { LogEntry } from '$lib/types/db';

	let settings: Settings = $state<Settings>({
		host: 'https://feed.pitpat.me',
		apiKey: '78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=',
		categories: '5',
		syncIntervalHours: 1,
		logLevel: 'info'
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

	// Raw state holders for query results
	let logs = $state.raw<LogEntry[]>([]);

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const logsCursor = db.logs.find({}, { sort: { timestamp: -1 }, limit: 20 });

		logs = logsCursor.fetch();

		return () => {
			logsCursor.cleanup();
		};
	});

	onMount(async () => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			try {
				const decoded = decodeShareLink(hash);
				settings = {
					...decoded,
					syncIntervalHours: 1,
					logLevel: 'info'
				};
				history.replaceState(null, '', window.location.pathname);
				await onTest();
			} catch (error) {
				Log.error('Invalid settings URL');
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
		const api = new MinifluxClient(settings.host, settings.apiKey);
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

	async function onReset() {
		await SettingsService.clearAllLocalState();
		location.reload();
	}

	async function debugSetLastSync() {
		const currentSettings = await SettingsService.getSettings();
		if (!currentSettings) return;

		// @ts-ignore
		settings.lastSyncAt -= 3 * 60 * 60 * 1000;

		await SettingsService.updateSettings({
			lastSyncAt: settings.lastSyncAt
		});
	}
</script>

<header>
	<h2>Miniflux Configuration</h2>
	<!-- {#if SessionInfo.hasUpdate} -->
	{#if true}
		<button class="update-button" onclick={applyUpdate}>Update</button>
	{/if}
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
		<button type="button" onclick={onReset}>Reset Data</button>
		<button type="button" onclick={onTest}>Test Connection</button>
		<button type="button" disabled={!isValid} onclick={generateShareableLink}>Share Config</button>
		<button type="button" disabled={!isValid} onclick={onSave}>Save Changes</button>
		<button type="button" onclick={debugSetLastSync}>Debug: Set Last Sync -3h</button>
	</div>
	{#if logs}
		<div>
			<label for="logs">Logs</label>
			<div id="logs" role="status" class="status" style="font-family: monospace;">
				{#each logs as log}
					[{log.level}][{new Date(log.id).toISOString().slice(0, 19).replace('T', ' ')}] {log.message}
					<br />
					<br />
				{/each}
			</div>
		</div>
	{/if}
</form>

<style>
	header {
		padding: 0 1.25rem;
	}

	form {
		display: grid;
		gap: 0.5rem;
		padding: 0 1rem;
	}

	form > div {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
	}

	label {
		font-weight: 600;
		font-size: var(--text-large);
		padding-bottom: 1rem;
	}

	input,
	button {
		padding: 0.5em;
	}

	.status.success {
		color: var(--success);
	}

	.status.error {
		color: var(--error);
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
		/* background: var(--bg-less); */
	}

	.update-button {
		border: none;
		font-weight: 600;
		/* background: var(--accent); */
		background-color: var(--accent);
		color: var(--text-more);
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		margin-top: 0.5rem;
		cursor: pointer;
	}
</style>
