<script>
	import { onMount } from 'svelte';

	let text1 = $state('');
	let text2 = $state('');
	let text3 = $state('');
	let text4 = $state('');
	let text5 = $state('');
	let text6 = $state('');
	let showSmiley = $state(false);
	const fullText1 = 'Thanks for trying out podds';
	const fullText2 = 'Hey, if you liked it...';
	const fullText3 = 'share a podcast with a friend!';
	const fullText4 = 'Love,';
	const fullText5 = 'Dank Technologies';
	const fullText6 = 'dan@danktech.io';

	onMount(() => {
		let i = 0;
		const typeWriter = () => {
			if (i < fullText1.length) {
				text1 += fullText1.charAt(i);
				i++;
				setTimeout(typeWriter, 50);
			} else {
				i = 0;
				const typeWriter2 = () => {
					if (i < fullText2.length) {
						text2 += fullText2.charAt(i);
						i++;
						setTimeout(typeWriter2, 50);
					} else {
						showSmiley = true;
						i = 0;
						const typeWriter3 = () => {
							if (i < fullText3.length) {
								text3 += fullText3.charAt(i);
								i++;
								setTimeout(typeWriter3, 50);
							} else {
								i = 0;
								const typeWriter4 = () => {
									if (i < fullText4.length) {
										text4 += fullText4.charAt(i);
										i++;
										setTimeout(typeWriter4, 50);
									} else {
										i = 0;
										const typeWriter5 = () => {
											if (i < fullText5.length) {
												text5 += fullText5.charAt(i);
												i++;
												setTimeout(typeWriter5, 50);
											} else {
												i = 0;
												const typeWriter6 = () => {
													if (i < fullText6.length) {
														text6 += fullText6.charAt(i);
														i++;
														setTimeout(typeWriter6, 50);
													}
												};
												setTimeout(typeWriter6, 500);
											}
										};
										setTimeout(typeWriter5, 500);
									}
								};
								setTimeout(typeWriter4, 500);
							}
						};
						setTimeout(typeWriter3, 500);
					}
				};
				setTimeout(typeWriter2, 500);
			}
		};
		typeWriter();
	});
</script>

<div class="container">
	<div class="text-container">
		<div class="typewriter">{text1}</div>
		<div class="typewriter">{text2}</div>
		<div class="typewriter">{text3}</div>
	</div>
	<div class="smiley" class:fade-in={showSmiley}>
		<img src="/gpa-smiley.svg" alt="GPA Smiley" />
	</div>
	<div class="signature">
		<div>{text4}</div>
		<div>{text5}</div>
		<div>{text6}</div>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		padding: 0 2rem;
		gap: 2rem;
	}

	.typewriter {
		font-family: monospace;
		white-space: pre;
		user-select: text;
		-webkit-user-select: text;
	}

	.text-container {
		display: flex;
		flex-direction: column;
		min-height: 5rem;
		line-height: 2;
		user-select: text;
		-webkit-user-select: text;
		width: 60vw;
	}

	.smiley {
		align-self: center;
		width: 7rem;
		height: 7rem;
		opacity: 0;
		transition: opacity 9s cubic-bezier(0.25, 0.1, 0.25, 1);
		position: relative;
		visibility: hidden;
	}

	.fade-in {
		opacity: 1;
		visibility: visible;
	}

	.smiley img {
		width: 100%;
		height: 100%;
	}

	.signature {
		align-self: flex-end;
		display: flex;
		flex-direction: column;
		font-family: monospace;
		user-select: text;
		-webkit-user-select: text;
	}
</style>
