<script lang="ts">
	import { db } from '$lib/stores/db.svelte';
	import type { LogEntry, Settings } from '$lib/types/db';
	import { formatTimestamp } from '$lib/utils/time';
	import { calculateStorageUsage, formatBytes, type StorageInfo } from '$lib/utils/storage';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		settings = $bindable<Settings>(),
		onSave
	}: {
		settings: Settings;
		onSave: () => void;
	} = $props();

	let storageLoaded = $state(false);

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
		storageLoaded = true;
	});
</script>

<section class="section">
	<div>
		<label for="logLevel">Log Level</label>
		<select id="logLevel" bind:value={settings.logLevel} onchange={onSave}>
			<option value="debug">Debug</option>
			<option value="info">Info</option>
			<option value="warn">Warning</option>
			<option value="error">Error</option>
		</select>
	</div>
	<div>
		<h4>Storage</h4>
		<div class="storage-stats">
			Audio Files:&nbsp;&nbsp;
			{#if storageLoaded}
				<span in:fly={{ y: 10, duration: 300 }}>{formatBytes(storageInfo.cacheSize)}</span>
			{:else}
				<span class="loading-dots" in:fade={{ duration: 200 }}>...</span>
			{/if}
			<br />
			Database:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
			{#if storageLoaded}
				<span in:fly={{ y: 10, duration: 300 }}>{formatBytes(storageInfo.dbSize)}</span>
			{:else}
				<span class="loading-dots" in:fade={{ duration: 200 }}>...</span>
			{/if}
			<br />
			<br />
			Free:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
			{#if storageLoaded}
				<span in:fly={{ y: 10, duration: 300 }}
					>{formatBytes(storageInfo.quota - storageInfo.usage)}</span
				>
			{:else}
				<span class="loading-dots" in:fade={{ duration: 200 }}>...</span>
			{/if}
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

		select {
			background-color: var(--bg-less);
			border: 1px solid var(--bg-less);
			color: var(--text);
		}
	}

	select {
		padding: 0.5em;
		border-radius: 0.25rem;
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

	.loading-dots {
		display: inline-block;
		animation: loading 1.5s infinite;
	}

	@keyframes loading {
		0% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.2;
		}
	}
</style>
