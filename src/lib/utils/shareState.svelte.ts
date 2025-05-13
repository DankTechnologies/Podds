let clickedShareBeforeInstall = $state(false);

export function getClickedShareBeforeInstall() {
    return clickedShareBeforeInstall;
}

export function setClickedShareBeforeInstall(value: boolean) {
    clickedShareBeforeInstall = value;
}

// Reset this state when PWA is installed
export function resetShareState() {
    clickedShareBeforeInstall = false;
} 