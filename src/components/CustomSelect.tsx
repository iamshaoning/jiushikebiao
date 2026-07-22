/**
 * 自定义下拉选择器
 *
 * 重写自课表 customSelectService.js
 * 用于年/月/机构等选择，替代原生 select
 * 带展开/收起动画
 */
import { useState, useRef, useEffect } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

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

  // 点击外部关闭
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-ink-200 bg-[var(--bg-secondary)] text-sm transition-colors hover:border-ink-300 ${triggerClassName}`}
      >
        <span className={selected ? 'text-ink-700' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {shouldRender && (
        <div
          className={`absolute z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 min-w-full transition-all duration-200 origin-top ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          }`}
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
        </div>
      )}
    </div>
  );
}
