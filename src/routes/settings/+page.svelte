<script lang="ts">
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { onMount } from 'svelte';
	import { db, getSettings } from '$lib/stores/db.svelte';
	import type { LogEntry, Settings } from '$lib/types/db';
	import { formatTimestamp } from '$lib/utils/time';
	import { FeedService } from '$lib/service/FeedService';
	import { calculateStorageUsage, formatBytes, type StorageInfo } from '$lib/utils/storage';
	import ApiSettings from '$lib/components/ApiSettings.svelte';
	let feedService = new FeedService();

	let settings = $state<Settings>(
		getSettings() || {
			id: '1',
			podcastIndexKey: import.meta.env.VITE_PODCAST_INDEX_KEY || '',
			podcastIndexSecret: import.meta.env.VITE_PODCAST_INDEX_SECRET || '',
			corsHelperUrl: import.meta.env.VITE_CORS_HELPER_URL || '',
			syncIntervalMinutes: 15,
			lastSyncAt: new Date(),
			isAdvanced: false,
			logLevel: 'debug'
		}
	);

	let importFeedIds = $state<string>(
		'1052374,1074603,1077200,1329334,1491827,165630,204504,214340,220911,223113,309699,318113,3240656,3455133,3745116,460150,480976,522889,5320480,533288,542376,548735,555339,561997,577105,5775917,5928182,6029956,637281,6596894,6660056,6752757,7123066,7132376,743229,853158,910728,5199634,7229334'
	);

	let activeSection = $state<'general' | 'api' | 'backup' | 'logs' | 'storage'>('general');
	let storageInfo = $state<StorageInfo>({
		cacheSize: 0,
		dbSize: 0,
		quota: 0,
		usage: 0
	});

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

	onMount(async () => {
		storageInfo = await calculateStorageUsage();
	});

	function onSave() {
		if (settings.syncIntervalMinutes < 15) {
			settings.syncIntervalMinutes = 15;
		}
		SettingsService.saveSettings(settings);
	}

	async function onImportFeeds() {
		await feedService.importFeeds(importFeedIds);
	}

	function onExportFeeds() {
		const feedIds = feedService.exportFeeds();
		navigator.clipboard.writeText(feedIds);
		alert('Feed IDs copied to clipboard!');
	}

	async function onReset() {
		await SettingsService.clearAllLocalState();
		location.reload();
	}
</script>

<nav class="settings-nav">
	<button
		class="nav-item"
		class:active={activeSection === 'general'}
		onclick={() => (activeSection = 'general')}>General</button
	>
	{#if settings.isAdvanced}
		<button
			class="nav-item"
			class:active={activeSection === 'api'}
			onclick={() => (activeSection = 'api')}>API</button
		>
		<button
			class="nav-item"
			class:active={activeSection === 'backup'}
			onclick={() => (activeSection = 'backup')}>Backup</button
		>
	{/if}
</nav>

<div class="settings-content">
	{#if activeSection === 'general'}
		<section class="section">
			<div>
				<label for="advancedMode">Advanced Mode</label>
				<div class="toggle-switch">
					<input type="checkbox" id="advancedMode" bind:checked={settings.isAdvanced} />
					<label for="advancedMode" class="slider"></label>
				</div>
			</div>
			{#if settings.isAdvanced}
				<div>
					<label for="syncInterval">Sync Interval (minutes)</label>
					<input
						id="syncInterval"
						type="number"
						min="15"
						bind:value={settings.syncIntervalMinutes}
						required
					/>
				</div>
				<div>
					<label for="logLevel">Log Level</label>
					<select id="logLevel" bind:value={settings.logLevel}>
						<option value="debug">Debug</option>
						<option value="info">Info</option>
						<option value="warn">Warning</option>
						<option value="error">Error</option>
					</select>
				</div>
				<div class="actions">
					<button type="button" onclick={onSave}>Save Changes</button>
				</div>
				<div>
					<h4>Storage</h4>
					<div class="storage-stats">
						Audio Files:&nbsp;&nbsp;{formatBytes(storageInfo.cacheSize)}
						<br />
						Database:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatBytes(storageInfo.dbSize)}
						<br />
						<br />
						Free:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatBytes(
							storageInfo.quota - storageInfo.usage
						)}
					</div>
				</div>
				<div>
					<h4>Logs</h4>
					<div id="logs" class="logs">
						{#each logs as log}
							[{log.level}][{formatTimestamp(log.timestamp)}] {log.message}
							<br />
							<br />
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if activeSection === 'api' && settings.isAdvanced}
		<ApiSettings bind:settings />
		<div class="actions">
			<button type="button" onclick={onSave}>Save Changes</button>
		</div>
	{/if}

	{#if activeSection === 'backup' && settings.isAdvanced}
		<section class="section">
			<div>
				<label for="importFeeds">Import Feeds</label>
				<input
					id="importFeeds"
					type="text"
					bind:value={importFeedIds}
					placeholder="Enter feed IDs separated by commas"
				/>
			</div>
			<div class="actions">
				<button type="button" onclick={onImportFeeds}>Import</button>
				<button type="button" onclick={onExportFeeds}>Export</button>
				<button type="button" onclick={onReset}>Reset Data</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.settings-nav {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--bg-less);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.settings-content {
		padding: 2rem;
		position: relative;
		z-index: 1;
	}

	.nav-item {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		color: var(--primary-less);
		border: none;
		cursor: pointer;
	}

	.nav-item.active {
		color: var(--primary-more);
		background-color: var(--bg);
	}

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

		input,
		select {
			background-color: var(--bg-less);
			border: 1px solid var(--bg-less);
			color: var(--text);
		}
	}

	input,
	select,
	button {
		padding: 0.5em;
		border-radius: 0.25rem;
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
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--neutral);
		border-radius: 0.25rem;
		flex: 1;
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
		background-color: var(--bg-less);
		font-family: monospace;
		font-size: var(--text-smallish);
		line-height: var(--line-height-slack);
		padding: 1rem;
	}

	.toggle-switch {
		position: relative;
		width: 4.5rem;
		height: 2.5rem;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--bg-less);
		transition: 0.25s;
		border-radius: 0.25rem;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 2rem;
		width: 2rem;
		left: 0.25rem;
		bottom: 0.25rem;
		background-color: var(--neutral);
		transition: 0.25s;
		border-radius: 0.25rem;
	}

	input:checked + .slider:before {
		transform: translateX(2rem);
		background-color: var(--primary);
	}
</style>
