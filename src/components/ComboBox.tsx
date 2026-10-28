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
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from '@/components/CustomSelect';
import { useAnchoredPopover } from '@/hooks/useAnchoredPopover';

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
  const [inputValue, setInputValue] = useState(String(value));
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
  } = useAnchoredPopover<HTMLInputElement>({ estimatedHeight: 200 });

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={anchorRef}
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
          toggle();
        }}
      />

      {shouldRender && position && createPortal(
        <div
          ref={popoverRef}
          className={`fixed z-[70] max-h-48 overflow-y-auto rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg py-1 transition-all duration-200 ${
            position.direction === 'up' ? 'origin-bottom' : 'origin-top'
          } ${
            visible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          } ${dropdownClassName}`}
          style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width }}
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
