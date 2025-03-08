<script lang="ts">
	import { goto } from '$app/navigation';
	import { SessionInfo, SettingsService } from '$lib/service/SettingsService.svelte';
	import { onMount } from 'svelte';
	import { decodeShareLink, encodeShareLink } from '$lib/utils/shareLink';
	import { applyUpdate } from '$lib/utils/versionUpdate';
	import { Log } from '$lib/service/LogService';
	import { db, getSettings } from '$lib/stores/db.svelte';
	import type { LogEntry, Settings } from '$lib/types/db';
	import { formatTimestamp } from '$lib/utils/time';
	import PodcastIndexClient from '$lib/api/podcast-index';
	import { FeedService } from '$lib/service/FeedService';
	import { StorageService, StorageInfo } from '$lib/service/StorageService.svelte';
	let feedService = new FeedService();

	let settings: Settings = $state<Settings>({
		id: '1',
		podcastIndexKey: import.meta.env.VITE_PODCAST_INDEX_KEY || '',
		podcastIndexSecret: import.meta.env.VITE_PODCAST_INDEX_SECRET || '',
		syncIntervalMinutes: 10,
		logLevel: 'info'
	});

	let importFeedIds = $state<string>(
		'6596894,637281,2138618,5320480,1074603,3240656,522889,1329334,542376,853158,3745116,1052374,5928182,743229,6752757,548735,223113,214340,309699,577105'
	);

	let isFirstVisit = $state<boolean>(true);
	let apiStatus = $state<'untested' | 'success' | 'error'>('untested');
	let isValid = $derived(
		settings.podcastIndexKey &&
			settings.podcastIndexSecret &&
			settings.syncIntervalMinutes > 0 &&
			apiStatus === 'success'
	);

	// Raw state holders for query results
	let logs = $state.raw<LogEntry[]>([]);

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const logsCursor = db.logs.find({}, { sort: { timestamp: -1 }, limit: 100 });

		logs = logsCursor.fetch();

		return () => {
			logsCursor.cleanup();
		};
	});

	onMount(() => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			try {
				const decoded = decodeShareLink(hash);
				settings = {
					id: '1',
					syncIntervalMinutes: 10,
					logLevel: 'info',
					...decoded
				};
				history.replaceState(null, '', window.location.pathname);
				onTest();
			} catch (error) {
				Log.error('Invalid settings URL');
			}
		} else {
			const savedSettings = getSettings();
			if (savedSettings) {
				settings = savedSettings;
				isFirstVisit = false;
			}
		}
	});

	onMount(async () => {
		// await StorageService.calculateStorageUsage();
	});

	async function onSave() {
		SettingsService.saveSettings(settings);
		if (isFirstVisit) goto('/search');
	}

	async function onTest() {
		const api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
		apiStatus = (await api.testConnection()) ? 'success' : 'error';
	}

	async function onImportFeeds() {
		await feedService.importFeeds(importFeedIds);
	}

	function onExportFeeds() {
		const feedIds = feedService.exportFeeds();
		navigator.clipboard.writeText(feedIds);
		alert('Feed IDs copied to clipboard!');
	}

	function generateShareLink() {
		const url = encodeShareLink({
			podcastIndexKey: settings.podcastIndexKey,
			podcastIndexSecret: settings.podcastIndexSecret
		});
		navigator.clipboard.writeText(url);
		alert('Shareable link copied to clipboard!');
	}

	async function onReset() {
		await SettingsService.clearAllLocalState();
		location.reload();
	}
</script>

<div class="settings">
	<header>
		<h2>Podcast Index Configuration</h2>
		{#if SessionInfo.hasUpdate}
			<button class="update-button" onclick={applyUpdate}>Update</button>
		{/if}
	</header>
	<form>
		<div>
			<label for="podcastIndexKey">Podcast Index Key</label>
			<input
				id="podcastIndexKey"
				type="text"
				bind:value={settings.podcastIndexKey}
				onchange={() => (apiStatus = 'untested')}
				required
			/>
		</div>
		<div>
			<label for="podcastIndexSecret">Podcast Index Secret</label>
			<input
				id="podcastIndexSecret"
				type="text"
				bind:value={settings.podcastIndexSecret}
				onchange={() => (apiStatus = 'untested')}
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
			<label for="importFeeds">Import Feeds</label>
			<input
				id="importFeeds"
				type="text"
				bind:value={importFeedIds}
				placeholder="Enter feed IDs separated by commas"
			/>
			<button type="button" onclick={onImportFeeds}>Import</button>
		</div>
		<div>
			<label for="exportFeeds">Export Feeds</label>
			<button type="button" onclick={onExportFeeds}>Export</button>
		</div>
		<!-- <div>
			<label for="storageUsage">Storage Usage</label>
			{#if StorageInfo.loading}
				<div class="storage-stats">Loading storage information...</div>
			{:else}
				<div class="storage-stats">
					<div>Service Worker Cache: {StorageService.formatBytes(StorageInfo.cacheSize)}</div>
					<div>IndexedDB Usage: {StorageService.formatBytes(StorageInfo.dbSize)}</div>
					<div>Storage Quota: {StorageService.formatBytes(StorageInfo.quota)}</div>
					<div>Remaining Space: {StorageService.formatBytes(StorageInfo.remaining)}</div>
				</div>
			{/if}
		</div> -->
		<div class="actions">
			<button type="button" onclick={onReset}>Reset Data</button>
			<button type="button" onclick={onTest}>Test Connection</button>
			<button type="button" disabled={!isValid} onclick={generateShareLink}>Share Config</button>
			<button type="button" disabled={!isValid} onclick={onSave}>Save Changes</button>
		</div>
		{#if logs}
			<div>
				<label for="logs">Logs</label>
				<div id="logs" class="logs">
					{#each logs as log}
						[{log.level}][{formatTimestamp(log.timestamp)}] {log.message}
						<br />
						<br />
					{/each}
				</div>
			</div>
		{/if}
	</form>
</div>

<style>
	.settings {
		padding: 0 2rem;
	}

	form {
		box-sizing: border-box;

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
			background-color: var(--bg-less);
			border: 1px solid var(--bg-less);
			color: var(--text);
		}
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
		gap: 1rem;
	}

	.actions button {
		flex: 1;
	}

	.update-button {
		border: none;
		font-weight: 600;
		background: var(--primary-less);
		color: var(--neutral);
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		margin-top: 0.5rem;
		cursor: pointer;
	}

	.logs {
		height: 80vh;
		overflow-y: scroll;
		background-color: var(--bg-less);
		font-family: monospace;
		font-size: var(--text-xs);
		word-break: break-all;
	}

	.storage-stats {
		padding: 0.5rem;
		background-color: var(--bg-less);
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}
</style>
