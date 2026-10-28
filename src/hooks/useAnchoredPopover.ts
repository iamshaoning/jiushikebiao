/**
 * 锚定浮层的通用逻辑（DatePicker / CustomSelect / ComboBox 共用）
 *
 * 统一处理三件事：
 * 1. 进出场动画：打开时先挂载再淡入，关闭时等淡出结束再卸载
 * 2. fixed 定位：基于触发元素的视口坐标计算，底部空间不足时自动向上展开
 * 3. 关闭时机：点击外部、任意可滚动祖先滚动、窗口尺寸变化
 *
 * 浮层通过 createPortal 渲染到 body，脱离父级 overflow 限制，
 * 使模态框内容区可以正常使用 overflow-y-auto。
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react';

export interface PopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  direction: 'up' | 'down';
}

interface Options {
  /** 浮层预估高度，用于判断向上还是向下展开 */
  estimatedHeight: number;
  /** 触发元素过窄时的最小浮层宽度 */
  minWidth?: number;
  /** 淡出时长（ms），需与浮层 CSS 过渡时长一致 */
  exitDuration?: number;
}

export function useAnchoredPopover<T extends HTMLElement = HTMLElement>({
  estimatedHeight,
  minWidth,
  exitDuration = 200,
}: Options) {
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<T>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 进出场：打开时先挂载、下一帧再淡入；关闭时等淡出结束再卸载
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setShouldRender(false), exitDuration);
    return () => clearTimeout(t);
  }, [open, exitDuration]);

  // 定位：用 fixed 坐标，向上展开时改用 bottom 定位，使浮层底部紧贴触发元素顶部
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 4;
    const spaceAbove = rect.top - 4;
    const direction =
      spaceBelow < estimatedHeight && spaceAbove >= estimatedHeight ? 'up' : 'down';
    setPosition({
      ...(direction === 'up'
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      left: rect.left,
      width: minWidth ? Math.max(rect.width, minWidth) : rect.width,
      direction,
    });
  }, [open, estimatedHeight, minWidth]);

  // 点击外部 / 滚动 / 尺寸变化时关闭（fixed 定位需自行同步关闭）
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onMouseDown);

    // 任意可滚动祖先滚动时关闭，避免浮层与触发元素错位
    let el: HTMLElement | null = containerRef.current;
    const scrollParents: HTMLElement[] = [];
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow)) {
        scrollParents.push(el);
      }
      el = el.parentElement;
    }
    scrollParents.forEach((p) => p.addEventListener('scroll', close, { passive: true }));
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close, { passive: true });

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      scrollParents.forEach((p) => p.removeEventListener('scroll', close));
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return {
    open,
    setOpen,
    toggle: () => setOpen((v) => !v),
    shouldRender,
    visible,
    position,
    containerRef,
    anchorRef,
    popoverRef,
  };
}
