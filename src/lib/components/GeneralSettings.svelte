<script lang="ts">
	import { FeedService } from '$lib/service/FeedService.svelte';
	import {
		Loader2,
		Signpost,
		RotateCw,
		RotateCcw,
		Route,
		Play,
		Check,
		DoorOpen,
		Caravan
	} from 'lucide-svelte';
	import type { Settings } from '$lib/types/db';
	import type { ImportProgress } from '$lib/types/ImportProgress';
	import { APP_VERSION } from '$lib/utils/version';

	let {
		settings = $bindable<Settings>(),
		onSave
	}: {
		settings: Settings;
		onSave: () => void;
	} = $props();

	let isConfigured = $derived(settings.corsHelper);

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

<div class="version-display">
	podds {APP_VERSION}
</div>
<section class="section">
	<div>
		<label id="playbackControlsLabel" for="skipBackwardButtonSeconds">Playback Controls</label>
		<div class="control-group" aria-labelledby="playbackControlsLabel">
			<div class="control-row">
				<label for="skipBackwardButtonSeconds">
					<RotateCcw class="icon" size={16} /> Back button
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
					<RotateCw class="icon" size={16} /> Forward button
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
					<Route class="icon" size={16} /> Go back on resume
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
		<label id="retentionLabel" for="completedEpisodeRetentionDays">Retain Podcast Episodes</label>
		<div class="control-group" aria-labelledby="retentionLabel">
			<div class="control-row">
				<label for="completedEpisodeRetentionDays"
					><Check class="icon" size={16} /> Completed episodes</label
				>
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
				<label for="inProgressEpisodeRetentionDays"
					><Play class="icon" size={16} /> In-Progress episodes</label
				>
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
	{#if isConfigured}
		<div>
			<label id="import" for="importFeeds">Import / Export Podcasts</label>
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
						<DoorOpen size="16" /> Import
					{/if}
				</button>
				<button type="button" onclick={onExportFeeds} disabled={isImporting}>
					<Caravan size="16" /> Export
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
	{/if}
	<div class="advanced-mode-wrapper">
		<div class="control-row">
			<label for="advanced-mode">Advanced Mode</label>
			<div class="toggle-switch-wrapper">
				<div class="toggle-switch">
					Mode <input
						type="checkbox"
						id="advanced-mode"
						bind:checked={settings.isAdvanced}
						onchange={onSave}
					/>
					<label for="advanced-mode" class="slider"></label>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.version-display {
		text-align: right;
		margin: -1.5rem 0.5rem 1.5rem 0;
		transform: rotate(4deg);
		opacity: 0.6;
		color: light-dark(var(--primary), var(--primary-more));
		font-size: var(--text-xs);
		font-family: monospace;
	}

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
			color: var(--primary);
		}
	}

	.import-progress {
		font-family: monospace;
		font-size: var(--text-smaller);
		padding: 1rem;
		background-color: var(--bg-less);
		min-height: 8rem;
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
		font-size: var(--text-smaller);
		gap: 1rem;

		label {
			flex: 1;
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

		.small-input {
			width: 3rem;
			font-size: var(--text-medium);
		}

		span {
			color: var(--grey-550);
		}

		&:has(.small-input:focus) :global(.icon),
		&:has(.small-input:focus-visible) :global(.icon) {
			color: var(--primary-more);
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

	.advanced-mode-wrapper {
		visibility: hidden;
	}
</style>
