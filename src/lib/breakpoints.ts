/**
 * 响应式断点（与 tailwind.config.js 的 desktop 保持一致）
 *
 * JS 侧判断统一走这里，避免各页面重复写 window.innerWidth < 1100 导致断点漂移。
 */
export const DESKTOP_BREAKPOINT = 1100;
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function isMobileViewport(): boolean {
  return !isDesktopViewport();
}
