import { useEffect } from 'react';

let openCount = 0;
let previousInert = false;

/**
 * 模态框打开时把「内容区域」设为 inert：屏幕阅读器与键盘焦点不会进入被遮罩的内容，
 * 但左侧导航 / 移动端顶栏仍可操作（遮罩本身也没有覆盖它们）。
 * 支持嵌套/多个弹窗同时打开（引用计数）。
 */
export function useInertBackground(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    // 仅内容区（Layout 的 main）不可交互；弹窗通过 Portal 渲染在 body 下，不受影响
    const target =
      document.querySelector<HTMLElement>('[data-app-content]') ?? document.getElementById('root');
    if (!target) return;
    if (openCount === 0) {
      previousInert = target.inert;
      target.inert = true;
    }
    openCount += 1;
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) target.inert = previousInert;
    };
  }, [open]);
}
