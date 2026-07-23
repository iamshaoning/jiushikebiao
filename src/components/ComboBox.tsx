/**
 * 可编辑下拉选择器
 *
 * trigger 使用 input-field 类，外观与系统其他输入框完全一致
 * ChevronDown 绝对定位在右侧，支持手动输入 + 下拉选择
 * 带展开/收起动画
 *
 * 下拉菜单使用 fixed 定位（基于 input 的 getBoundingClientRect 计算），
 * 使其脱离父级 overflow 限制，从而允许模态框内容区使用 overflow-y-auto 收起超出的表单内容
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from '@/components/CustomSelect';

interface ComboBoxProps {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** 下拉菜单自定义类名（如 max-h-40 缩短高度） */
  dropdownClassName?: string;
  /** 输入类型 */
  type?: 'text' | 'number';
}

export default function ComboBox({
  value,
  options,
  onChange,
  placeholder = '',
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  type = 'text',
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

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

  // 打开时基于 input 位置计算下拉菜单坐标（fixed 定位，脱离父级 overflow）
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setDropdownPos(null);
    }
  }, [open]);

  // 点击外部 / 滚动 / 窗口尺寸变化时关闭下拉菜单（fixed 定位需自行同步关闭）
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type={type}
        value={inputValue}
        onChange={(e) => {
          const v = e.target.value;
          setInputValue(v);
          onChange(type === 'number' ? Number(v) || 0 : v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setInputValue(String(value));
          setOpen(false);
        }}
        className={`input-field !pr-8 ${inputClassName}`}
        placeholder={placeholder}
      />
      <ChevronDown
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 transition-transform duration-200 cursor-pointer ${open ? 'rotate-180' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      />

      {shouldRender && dropdownPos && createPortal(
        <div
          className={`fixed z-[70] max-h-48 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 transition-all duration-200 origin-top ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          } ${dropdownClassName}`}
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-ink-50 ${
                String(opt.value) === String(value)
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
