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
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useAnchoredPopover } from '@/hooks/useAnchoredPopover';

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
  // 进出场动画、fixed 定位、点击外部/滚动关闭由共用 Hook 处理
  const {
    open,
    setOpen,
    toggle,
    shouldRender,
    visible,
    position,
    containerRef,
    anchorRef,
    popoverRef,
  } = useAnchoredPopover<HTMLButtonElement>({ estimatedHeight: 250 });

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-ink-200 bg-[var(--bg-secondary)] text-sm transition-colors hover:border-ink-300 ${triggerClassName}`}
      >
        <span className={`flex-1 min-w-0 truncate ${selected ? 'text-ink-700' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {shouldRender && position && createPortal(
        <div
          ref={popoverRef}
          className={`fixed z-[70] max-h-60 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 transition-all duration-200 ${
            position.direction === 'up' ? 'origin-bottom' : 'origin-top'
          } ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          }`}
          style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width }}
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
