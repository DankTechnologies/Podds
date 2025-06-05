<script lang="ts">
	import { db, getLogs } from '$lib/stores/db.svelte';
	import type { LogEntry, Settings } from '$lib/types/db';
	import { formatTimestamp } from '$lib/utils/time';
	import { calculateStorageUsage, formatBytes, type StorageInfo } from '$lib/utils/storage';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { ListFilter, Search } from 'lucide-svelte';

	const LIMIT_LOGS = 1000;
	const DEBOUNCE_DELAY = 300;

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

	let recentLogs = $derived(
		getLogs()
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, LIMIT_LOGS)
	);

	let matchingLogs = $state<LogEntry[]>([]);
	let searchQuery = $state('');
	let debouncedQuery = $state('');

	$effect(() => {
		if (searchQuery) {
			const timeoutId = setTimeout(() => {
				debouncedQuery = searchQuery;
			}, DEBOUNCE_DELAY);

			return () => clearTimeout(timeoutId);
		} else {
			debouncedQuery = '';
		}
	});

	$effect(() => {
		if (debouncedQuery) {
			matchingLogs = recentLogs.filter((log) => {
				const searchText = `${log.level} ${formatTimestamp(log.timestamp)} ${log.message}`;
				return searchText.match(new RegExp(debouncedQuery, 'i'));
			});
		} else {
			matchingLogs = recentLogs;
		}
	});

	onMount(async () => {
		storageInfo = await calculateStorageUsage();
		storageLoaded = true;
	});
</script>

<section class="section">
	<div>
		<label for="storage">Storage</label>
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
		<label for="logs">Logs</label>
		<div class="logs-container">
			<div class="control-row">
				<label for="logLevel">
					<ListFilter class="icon" size={16} /> Log level
				</label>
				<div class="control-input">
					<select id="logLevel" bind:value={settings.logLevel} onchange={onSave}>
						<option value="debug">Debug</option>
						<option value="info">Info</option>
						<option value="warn">Warning</option>
						<option value="error">Error</option>
					</select>
				</div>
			</div>
			<div class="control-row">
				<label for="logSearch">
					<Search class="icon" size={16} /> Search logs
				</label>
				<div class="control-input">
					<input
						id="logSearch"
						type="text"
						spellcheck="false"
						placeholder="filter logs"
						bind:value={searchQuery}
					/>
				</div>
			</div>
			<div id="logs" class="logs">
				{#each matchingLogs as log}
					[{log.level}][{formatTimestamp(log.timestamp)}] {log.message}
					<br />
					<br />
				{/each}
			</div>
		</div>
	</div>
</section>

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

		& > div > label {
			background-color: light-dark(var(--grey-200), var(--grey-800));
			color: light-dark(var(--primary-grey-dark), var(--text));
			padding: 0.25rem 0.75rem;
			border-radius: 0.25rem;
			letter-spacing: 0.05em;
		}

		label {
			font-weight: 600;
			font-size: var(--text-large);
		}

		select {
			background-color: var(--bg-less);
			border: 1px solid var(--bg-less);
			color: var(--text);
		}
	}

	.logs-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.control-row {
		display: flex;
		align-items: center;
		font-size: var(--text-smaller);
		gap: 1rem;

		label {
			flex: 2;
			font-weight: normal;
			font-size: var(--text-medium);
			padding-bottom: 0;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			:global(.icon) {
				color: var(--primary);
				transition: color 0.2s ease;
			}
		}

		.control-input {
			flex: 3;

			input,
			select {
				width: 100%;
			}

			input,
			select {
				padding: 0.5em;
				border-radius: 0.25rem;
				background-color: var(--bg-less);
				border: 1px solid var(--bg-less);
				font-size: var(--text-medium);
			}
		}

		&:has(select:focus) :global(.icon),
		&:has(select:focus-visible) :global(.icon),
		&:has(input:focus) :global(.icon),
		&:has(input:focus-visible) :global(.icon) {
			color: var(--primary-more);
		}
	}

	.logs {
		height: 80vh;
		overflow-y: scroll;
		background-color: var(--bg-less);
		font-family: monospace;
		font-size: var(--text-xs);
		word-break: break-all;
	}

	#logSearch {
		width: 90%;
		font-family: monospace;
	}

	.storage-stats {
		background-color: var(--bg-less);
		font-family: monospace;
		font-size: var(--text-smaller);
		line-height: var(--line-height-slack);
		border-radius: 0.25rem;
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
