/**
 * 可编辑下拉选择器
 *
 * trigger 使用 input-field 类，外观与系统其他输入框完全一致
 * ChevronDown 绝对定位在右侧，支持手动输入 + 下拉选择
 * 带展开/收起动画
 */
import { useState, useRef, useEffect } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
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

      {shouldRender && (
        <div
          className={`absolute z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 min-w-full transition-all duration-200 origin-top ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          } ${dropdownClassName}`}
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
        </div>
      )}
    </div>
  );
}
