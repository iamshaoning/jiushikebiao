/**
 * 自定义下拉选择器
 *
 * 重写自课表 customSelectService.js
 * 用于年/月/机构等选择，替代原生 select
 * 带展开/收起动画
 *
 * 下拉菜单使用 fixed 定位（基于 trigger 的 getBoundingClientRect 计算），
 * 通过 createPortal 渲染到 body，脱离父级 overflow 限制，
 * 使模态框内容区可正常使用 overflow-y-auto 收起超出的表单内容。
 * 底部空间不足时自动向上展开。
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className = '',
  triggerClassName = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number; direction: 'up' | 'down' } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 展开/收起动画
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 打开时基于 trigger 位置计算下拉菜单坐标（fixed 定位，脱离父级 overflow）
  // 底部空间不足时自动向上展开
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_HEIGHT = 250; // max-h-60(240px) + py-1(8px) 预估高度
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;
      const direction = spaceBelow < DROPDOWN_HEIGHT && spaceAbove >= DROPDOWN_HEIGHT ? 'up' : 'down';
      setDropdownPos({
        // 向上展开时用 bottom 定位（相对视口底部），让菜单底部紧贴 trigger 顶部
        ...(direction === 'up' ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
        left: rect.left,
        width: rect.width,
        direction,
      });
    } else {
      setDropdownPos(null);
    }
  }, [open]);

  // 点击外部 / 滚动 / 窗口尺寸变化时关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        (ref.current && ref.current.contains(e.target as Node)) ||
        (dropdownRef.current && dropdownRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', handler);
    // 任何可滚动祖先滚动时关闭，避免下拉菜单与输入框错位
    let el: HTMLElement | null = ref.current;
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
      document.removeEventListener('mousedown', handler);
      scrollParents.forEach((p) => p.removeEventListener('scroll', close));
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-ink-200 bg-[var(--bg-secondary)] text-sm transition-colors hover:border-ink-300 ${triggerClassName}`}
      >
        <span className={`flex-1 min-w-0 truncate ${selected ? 'text-ink-700' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {shouldRender && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[70] max-h-60 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 transition-all duration-200 ${
            dropdownPos.direction === 'up' ? 'origin-bottom' : 'origin-top'
          } ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          }`}
          style={{ top: dropdownPos.top, bottom: dropdownPos.bottom, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-ink-50 ${
                opt.value === value
                  ? 'text-ink-700 font-medium bg-ink-50'
                  : 'text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
