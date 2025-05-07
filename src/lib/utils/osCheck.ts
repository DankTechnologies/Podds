export const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
export const isPwa = window.matchMedia('(display-mode: standalone)').matches;