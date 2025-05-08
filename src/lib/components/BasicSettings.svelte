<script lang="ts">
	import { FeedService } from '$lib/service/FeedService';
	import { Download, Upload, Loader2, Signpost } from 'lucide-svelte';
	import type { Settings } from '$lib/types/db';

	let {
		settings = $bindable<Settings>(),
		onSave
	}: {
		settings: Settings;
		onSave: () => void;
	} = $props();

	let feedService = new FeedService();
	let isImporting = $state(false);

	async function onImportFeeds(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			isImporting = true;
			const text = await file.text();
			await feedService.importFeeds(text);
			isImporting = false;
			// Reset the input so the same file can be selected again
			target.value = '';
		}
	}

	function onExportFeeds() {
		feedService.exportFeeds();
	}
</script>

<section class="section">
	<div>
		<label for="advancedMode">Advanced Mode</label>
		<div class="toggle-switch">
			<input
				type="checkbox"
				id="advancedMode"
				bind:checked={settings.isAdvanced}
				onchange={onSave}
			/>
			<label for="advancedMode" class="slider"></label>
		</div>
	</div>
	<div>
		<label for="importFeeds">Import / Export Podcasts</label>
		<div class="section-help-text">
			<Signpost size="24" /> Bring your podcasts with you to your app of choice. Most podcast apps have
			this feature; look in the settings for Backup / Restore / OPML
		</div>
		<div class="actions">
			<input
				id="importFeeds"
				type="file"
				accept=".txt,.opml,.xml,text/xml,application/xml"
				onchange={onImportFeeds}
				class="file-input"
			/>
			<button
				type="button"
				onclick={() => document.getElementById('importFeeds')?.click()}
				disabled={isImporting}
			>
				{#if isImporting}
					<Loader2 size="16" class="spinner" /> Importing...
				{:else}
					<Upload size="16" /> Import
				{/if}
			</button>
			<button type="button" onclick={onExportFeeds} disabled={isImporting}>
				<Download size="16" /> Export
			</button>
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

		input {
			background-color: var(--bg-less);
			border: 1px solid var(--bg-less);
			color: var(--text);
		}
	}

	input,
	button {
		padding: 0.5em;
		border-radius: 0.25rem;
	}

	.actions {
		display: flex;
		gap: 1.5rem;
		padding: 1rem 0;
	}

	.actions button {
		display: flex;
		width: fit-content;
		font-size: var(--text-smallish);
		font-weight: 600;
		align-items: center;
		background: var(--bg-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--text);
		border-radius: 0.25rem;
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

	.file-input {
		display: none;
	}

	.section-help-text {
		font-size: var(--text-xs);
		line-height: var(--line-height-tight);

		:global(svg) {
			float: left;
			margin-right: 0.5rem;
			color: light-dark(var(--primary), var(--primary-more));
		}
	}
</style>
