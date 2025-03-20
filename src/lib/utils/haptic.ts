export function haptic(node: HTMLElement, duration: number = 50) {
	function vibrate() {
		if ('vibrate' in navigator) {
			navigator.vibrate(duration);
		} else if ((window as any).webkit?.HapticFeedback) {
			((window as any).webkit.HapticFeedback as any).selectionChanged(); // iOS Safari/PWA support
		}
	}

	node.addEventListener('click', vibrate);

	return {
		update(newDuration: number) {
			duration = newDuration;
		},
		destroy() {
			node.removeEventListener('click', vibrate);
		}
	};
}
