<script lang="ts">
	import { page } from '$app/state';

	const isActive = $derived((href: string) => page.url.pathname === href);

	const navItems = [
		{
			href: '/',
			label: 'Podcasts',
			icon: {
				viewBox: '0 0 24 24',
				path: 'm4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5'
			}
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: {
				viewBox: '0 0 24 24',
				path: 'M11 9h6m-6 3h6m-6 3h6M6.996 9h.01m-.01 3h.01m-.01 3h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'
			}
		},
		{
			href: '/playlist',
			label: 'Playlist',
			icon: {
				viewBox: '0 0 24 24',
				path: 'M17.316 4.052a.99.99 0 0 0-.9.14c-.262.19-.416.495-.416.82v8.566a4.573 4.573 0 0 0-2-.464c-1.99 0-4 1.342-4 3.443 0 2.1 2.01 3.443 4 3.443 1.99 0 4-1.342 4-3.443V6.801c.538.5 1 1.219 1 2.262 0 .56.448 1.013 1 1.013s1-.453 1-1.013c0-1.905-.956-3.18-1.86-3.942a6.391 6.391 0 0 0-1.636-.998 4 4 0 0 0-.166-.063l-.013-.005-.005-.002h-.002l-.002-.001ZM4 5.012c-.552 0-1 .454-1 1.013 0 .56.448 1.013 1 1.013h9c.552 0 1-.453 1-1.013 0-.559-.448-1.012-1-1.012H4Zm0 4.051c-.552 0-1 .454-1 1.013 0 .56.448 1.013 1 1.013h9c.552 0 1-.454 1-1.013 0-.56-.448-1.013-1-1.013H4Zm0 4.05c-.552 0-1 .454-1 1.014 0 .559.448 1.012 1 1.012h4c.552 0 1-.453 1-1.012 0-.56-.448-1.013-1-1.013H4Z',
				fill: 'currentColor',
				usesFill: true
			}
		}
	];
</script>

<div class="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-gray-200 bg-white">
	<div class="mx-auto grid h-full max-w-lg auto-cols-fr grid-flow-col font-medium">
		{#each navItems as { href, label, icon }}
			<a
				{href}
				class="group inline-flex flex-col items-center justify-center transition-colors duration-200 active:bg-blue-100 [&.active]:bg-gray-100 [&.active]:font-semibold [&.active]:text-blue-600"
				class:active={isActive(href)}
			>
				<svg
					class="mb-1 h-6 w-6 text-gray-500 transition-all duration-200 [&.active]:text-blue-600"
					class:active={isActive(href)}
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					fill={icon.usesFill ? 'currentColor' : 'none'}
					viewBox={icon.viewBox}
				>
					<path
						{...icon.usesFill
							? { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd' }
							: {
									stroke: 'currentColor',
									'stroke-linecap': 'round',
									'stroke-linejoin': 'round',
									'stroke-width': '2'
								}}
						d={icon.path}
					/>
				</svg>

				<span
					class="text-sm text-gray-500 transition-colors duration-200 [&.active]:text-blue-600"
					class:active={isActive(href)}
				>
					{label}
				</span>
			</a>
		{/each}
	</div>
</div>
