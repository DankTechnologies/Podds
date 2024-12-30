class DankStore {
	count = $state(0);

	up() {
		this.count += 1;
	}

	reset() {
		this.count = 0;
	}
}

export const dankStore = new DankStore();
