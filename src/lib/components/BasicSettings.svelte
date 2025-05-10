<script lang="ts">
	import { FeedService } from '$lib/service/FeedService';
	import {
		Download,
		Upload,
		Loader2,
		Signpost,
		RotateCw,
		RotateCcw,
		Route,
		Play,
		Check
	} from 'lucide-svelte';
	import type { Settings } from '$lib/types/db';
	import type { ImportProgress } from '$lib/types/ImportProgress';

	let {
		settings = $bindable<Settings>(),
		onSave
	}: {
		settings: Settings;
		onSave: () => void;
	} = $props();

	let feedService = new FeedService();
	let isImporting = $state(false);
	let importProgress = $state<ImportProgress | null>(null);
	let exportMessage = $state<string | null>(null);

	async function onImportFeeds(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			isImporting = true;
			importProgress = null;
			exportMessage = null;
			const text = await file.text();
			await feedService.importFeeds(text, (progress) => {
				importProgress = progress;
			});
			isImporting = false;
		}
	}

	function onExportFeeds() {
		importProgress = null;
		exportMessage = null;
		const filename = feedService.exportFeeds();
		exportMessage = `Podcasts saved in ${filename}`;
	}
</script>

<section class="section">
	<div>
		<div class="control-row">
			<label for="advancedMode">Advanced Mode</label>
			<div class="toggle-switch-wrapper">
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
		</div>
	</div>
	<div>
		<label id="playbackControlsLabel" for="skipBackwardButtonSeconds">Playback Controls</label>
		<div class="control-group" aria-labelledby="playbackControlsLabel">
			<div class="control-row">
				<label for="skipBackwardButtonSeconds">
					<RotateCcw size={16} /> Back Button
				</label>
				<input
					type="number"
					id="skipBackwardButtonSeconds"
					bind:value={settings.skipBackwardButtonSeconds}
					onchange={onSave}
					min="5"
					max="99"
					class="small-input"
				/>
				<span>seconds</span>
			</div>
			<div class="control-row">
				<label for="skipForwardButtonSeconds">
					<RotateCw size={16} /> Forward Button
				</label>
				<input
					type="number"
					id="skipForwardButtonSeconds"
					bind:value={settings.skipForwardButtonSeconds}
					onchange={onSave}
					min="5"
					max="99"
					class="small-input"
				/>
				<span>seconds</span>
			</div>
			<div class="control-row">
				<label for="goBackOnResumeSeconds">
					<Route size={16} /> Go Back on Resume
				</label>
				<input
					type="number"
					id="goBackOnResumeSeconds"
					bind:value={settings.goBackOnResumeSeconds}
					onchange={onSave}
					min="0"
					max="99"
					class="small-input"
				/>
				<span>seconds</span>
			</div>
		</div>
	</div>
	<div>
		<label id="retentionLabel" for="completedEpisodeRetentionDays">Retention</label>
		<div class="control-group" aria-labelledby="retentionLabel">
			<div class="control-row">
				<label for="completedEpisodeRetentionDays"><Check size={16} /> Completed episodes</label>
				<input
					type="number"
					id="completedEpisodeRetentionDays"
					bind:value={settings.completedEpisodeRetentionDays}
					onchange={onSave}
					min="1"
					max="365"
					class="small-input"
				/>
				<span>days</span>
			</div>
			<div class="control-row">
				<label for="inProgressEpisodeRetentionDays"><Play size={16} /> In-Progress episodes</label>
				<input
					type="number"
					id="inProgressEpisodeRetentionDays"
					bind:value={settings.inProgressEpisodeRetentionDays}
					onchange={onSave}
					min="1"
					max="365"
					class="small-input"
				/>
				<span>days</span>
			</div>
		</div>
	</div>
	<div>
		<label for="importFeeds">Import / Export Podcasts</label>
		<div class="section-help-text">
			<Signpost size="24" /> Most podcast apps have a Backup/Export setting that writes your podcasts
			to a file. You can <b>import</b> that file here, to move over all your podcasts.
			<b>Export</b> helps you move in the other direction
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
		{#if importProgress}
			<div class="import-progress">
				{#if importProgress.total > 0}
					Added {importProgress.success} of {importProgress.total} podcasts
					<br />
					{#if importProgress.skipped > 0}
						({importProgress.skipped} already exist)
						<br />
					{/if}
				{:else}
					No podcasts detected
					<br />
				{/if}
				{#if importProgress.current}
					Processing: {importProgress.current}
					<br />
				{/if}
				{#if importProgress.failed.length > 0}
					Failed podcasts:
					{#each importProgress.failed as feed}
						<br /> * {feed}
					{/each}
				{/if}
			</div>
		{/if}
		{#if exportMessage}
			<div class="import-progress">
				{exportMessage}
			</div>
		{/if}
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

	.import-progress {
		font-family: monospace;
		font-size: var(--text-smallish);
		padding: 1rem;
		background-color: var(--bg-less);
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 1rem;

		label {
			flex: 1;
			font-size: var(--text-smallish);
			font-weight: normal;
			padding-bottom: 0;
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		.small-input {
			width: 3rem;
		}

		span {
			color: var(--grey-550);
		}
	}

	.control-row:has(.toggle-switch) {
		label {
			font-weight: 600;
			font-size: var(--text-large);
		}

		.toggle-switch-wrapper {
			flex: 1;
		}
	}
</style>
