<script lang="ts">
	function handleBack() {
		console.log('Seeking back 10 seconds');
	}

	function handlePlayPause() {
		console.log('Toggle play/pause');
	}

	function handleForward() {
		console.log('Seeking forward 30 seconds');
	}

	function handlePlaylist() {
		console.log('Opening playlist/menu');
	}
</script>

<div class="player">
	<div class="player__section player__section--left">
		<div class="player__artwork">
			<!-- <img src={episode.icon} alt="" /> -->
		</div>
	</div>

	<div class="player__section player__section--center">
		<button class="player__button" onclick={handleBack}> -10s </button>

		<button class="player__button" onclick={handlePlayPause}>
			<!-- {episode.state == 'playing' ? '⏸️' : '▶️'} -->
		</button>

		<button class="player__button" onclick={handleForward}> +30s </button>
	</div>

	<div class="player__section player__section--right">
		<button class="player__button" onclick={handlePlaylist}> ☰ </button>
	</div>
</div>

<style>
	.player {
		display: flex;
		align-items: center;
		padding: 0.5rem;
		background: lightgray;
		border-top: 0.0625rem solid darkgray;
	}

	.player__section {
		display: flex;
		align-items: center;
	}

	.player__section--left {
		flex: 1;
	}

	.player__section--center {
		flex: 2;
		justify-content: center;
		gap: 1.5rem;
	}

	.player__section--right {
		flex: 1;
		justify-content: flex-end;
	}

	.player__artwork {
		width: 2.5rem;
		height: 2.5rem;
	}

	.player__artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.player__button {
		border: none;
		background: none;
		padding: 0.5rem;
		cursor: pointer;
		color: darkgray;
	}
</style>
