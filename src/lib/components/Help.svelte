<main class="container">
	<header>
		<div class="logo-container">
			<img src="/podds.svg" alt="Podds" class="logo" />
			<div class="logo-text">podds</div>
		</div>
	</header>

	<section class="section">
		<p>
			<b>Podds</b> is a podcast web app that you can run for your family and friends, free of ads and
			data mining.
		</p>
		<p>
			It uses the iTunes API for podcast and episode discovery, along with CORS Helpers to reach RSS
			feeds and download episodes without any hassles. These get configured in the <a
				href="/settings?section=api">API</a
			> section.
		</p>
		<p>
			If you're somewhat technical, follow the steps below to start your own branch and propogate.
		</p>
	</section>

	<section class="section">
		<section class="section">
			<h3 class="subtitle">CORS Helper - Cloudflare Way</h3>
			<p>
				<a href="https://dash.cloudflare.com/sign-up">With a Cloudflare account</a>, create + deploy
				a worker with the <i>Hello World</i> template. Then <b>Edit Code</b> and paste in this
				<a
					href="https://github.com/DankTechnologies/Podds/blob/main/cors-helpers/cloudflare/worker.js"
					>worker.js</a
				> script
			</p>
			<p>
				The free tier quota is 100k requests per day, as of April 2025. It should suffice for dozens
				of users in your branch.
			</p>
		</section>
		<section>
			<h3 class="subtitle">CORS Helper - Self-Hosted Way</h3>
			<p>
				Equivalent NodeJS app and Docker files can be found
				<a href="https://github.com/DankTechnologies/Podds/blob/main/cors-helpers/node">here</a>.
				Plumbing out to the internet is left as an exercise for the self-hoster.
			</p>
		</section>
	</section>
</main>

<style>
	.logo-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}
	.logo {
		height: 3.5rem;
	}
	.logo-text {
		font-size: var(--text-3xl);
		letter-spacing: 0.2em;
		font-weight: bold;
		color: light-dark(var(--primary), var(--primary-more));
		transform: rotate(-3deg);
	}

	.container {
		line-height: var(--line-height-slack);
		font-size: var(--text-smaller);
		display: flex;
		flex-direction: column;
	}

	.section {
		display: flex;
		flex-direction: column;
		padding: 1rem 0;
	}

	.subtitle {
		font-size: var(--text-large);
		font-weight: bold;
		color: var(--primary);
		text-wrap-style: pretty;
	}

	p {
		text-wrap-style: pretty;
		margin: 0.5rem 0;
	}
</style>
