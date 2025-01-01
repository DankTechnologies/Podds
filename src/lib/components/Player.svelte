<div
	class="fixed bottom-[56px] left-0 z-50 grid h-24 w-full grid-cols-1 border-t border-gray-200 bg-white px-8 md:grid-cols-3 dark:border-gray-600 dark:bg-gray-700"
>
	<div class="me-auto hidden items-center justify-center md:flex"></div>
	<div class="flex w-full items-center">
		<div class="w-full">
			<div class="mx-auto mb-1 flex items-center justify-center">
				<button
					data-tooltip-target="tooltip-shuffle"
					type="button"
					class="group me-1 rounded-full p-2.5 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
				>
					<svg
						class=" h-4 w-4 text-gray-500 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 20 18"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11.484 6.166 13 4h6m0 0-3-3m3 3-3 3M1 14h5l1.577-2.253M1 4h5l7 10h6m0 0-3 3m3-3-3-3"
						/>
					</svg>
					<span class="sr-only">Shuffle video</span>
				</button>
				<div
					id="tooltip-shuffle"
					role="tooltip"
					class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
				>
					Shuffle video
					<div class="tooltip-arrow" data-popper-arrow></div>
				</div>
				<button
					data-tooltip-target="tooltip-previous"
					type="button"
					class="group rounded-full p-2.5 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
				>
					<svg
						class="h-4 w-4 text-gray-500 group-hover:text-gray-900 rtl:rotate-180 dark:text-gray-300 dark:group-hover:text-white"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 12 16"
					>
						<path
							d="M10.819.4a1.974 1.974 0 0 0-2.147.33l-6.5 5.773A2.014 2.014 0 0 0 2 6.7V1a1 1 0 0 0-2 0v14a1 1 0 1 0 2 0V9.3c.055.068.114.133.177.194l6.5 5.773a1.982 1.982 0 0 0 2.147.33A1.977 1.977 0 0 0 12 13.773V2.227A1.977 1.977 0 0 0 10.819.4Z"
						/>
					</svg>
					<span class="sr-only">Previous video</span>
				</button>
				<div
					id="tooltip-previous"
					role="tooltip"
					class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
				>
					Previous video
					<div class="tooltip-arrow" data-popper-arrow></div>
				</div>
				<button
					data-tooltip-target="tooltip-pause"
					type="button"
					class="group mx-2 inline-flex items-center justify-center rounded-full bg-blue-600 p-2.5 font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
				>
					<svg
						class="h-3 w-3 text-white"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 10 16"
					>
						<path
							fill-rule="evenodd"
							d="M0 .8C0 .358.32 0 .714 0h1.429c.394 0 .714.358.714.8v14.4c0 .442-.32.8-.714.8H.714a.678.678 0 0 1-.505-.234A.851.851 0 0 1 0 15.2V.8Zm7.143 0c0-.442.32-.8.714-.8h1.429c.19 0 .37.084.505.234.134.15.209.354.209.566v14.4c0 .442-.32.8-.714.8H7.857c-.394 0-.714-.358-.714-.8V.8Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="sr-only">Pause video</span>
				</button>
				<div
					id="tooltip-pause"
					role="tooltip"
					class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
				>
					Pause video
					<div class="tooltip-arrow" data-popper-arrow></div>
				</div>
				<button
					data-tooltip-target="tooltip-next"
					type="button"
					class="group me-1 rounded-full p-2.5 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
				>
					<svg
						class="h-4 w-4 text-gray-500 group-hover:text-gray-900 rtl:rotate-180 dark:text-gray-300 dark:group-hover:text-white"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 12 16"
					>
						<path
							d="M11 0a1 1 0 0 0-1 1v5.7a2.028 2.028 0 0 0-.177-.194L3.33.732A2 2 0 0 0 0 2.227v11.546A1.977 1.977 0 0 0 1.181 15.6a1.982 1.982 0 0 0 2.147-.33l6.5-5.773A1.88 1.88 0 0 0 10 9.3V15a1 1 0 1 0 2 0V1a1 1 0 0 0-1-1Z"
						/>
					</svg>
					<span class="sr-only">Next video</span>
				</button>
				<div
					id="tooltip-next"
					role="tooltip"
					class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
				>
					Next video
					<div class="tooltip-arrow" data-popper-arrow></div>
				</div>
				<button
					data-tooltip-target="tooltip-restart"
					type="button"
					class="group me-1 rounded-full p-2.5 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
				>
					<svg
						class="h-4 w-4 text-gray-500 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 18 20"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 1v5h-5M2 19v-5h5m10-4a8 8 0 0 1-14.947 3.97M1 10a8 8 0 0 1 14.947-3.97"
						/>
					</svg>
					<span class="sr-only">Restart video</span>
				</button>
				<div
					id="tooltip-restart"
					role="tooltip"
					class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
				>
					Restart video
					<div class="tooltip-arrow" data-popper-arrow></div>
				</div>
			</div>
			<div class="flex items-center justify-between space-x-2 rtl:space-x-reverse">
				<span class="text-sm font-medium text-gray-500 dark:text-gray-400">3:45</span>
				<div class="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800">
					<div class="h-1.5 rounded-full bg-blue-600" style="width: 75%"></div>
				</div>
				<span class="text-sm font-medium text-gray-500 dark:text-gray-400">5:00</span>
			</div>
		</div>
	</div>
</div>
