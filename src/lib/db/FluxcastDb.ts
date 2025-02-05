import { Collection } from '@signaldb/core';

const Posts = new Collection({
	reactivity: {
		create() {
			let dep = $state(0);
			return {
				depend() {
					dep;
				},
				notify() {
					dep += 1;
				}
			};
		},
		isInScope: () => !!$effect.tracking()
	}
});

export { Posts };
