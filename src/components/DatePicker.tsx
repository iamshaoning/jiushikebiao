/**
 * 日期选择器
 *
 * 重写自课表 datePickerService.js
 * 弹出月历网格，选择单个日期
 *
 * 日历弹窗使用 fixed 定位（基于 trigger 的 getBoundingClientRect 计算），
 * 通过 createPortal 渲染到 body，脱离父级 overflow 限制，
 * 使模态框内容区可正常使用 overflow-y-auto 收起超出的表单内容。
 * 底部空间不足时自动向上展开。
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function DatePicker({
  value,
  onChange,
  className = '',
  placeholder = '选择日期',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarPos, setCalendarPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const initial = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // 打开时基于 trigger 位置计算日历坐标（fixed 定位，脱离父级 overflow）
  // 底部空间不足时自动向上展开
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const CAL_HEIGHT = 320; // 日历预估高度（导航+星期表头+6行日期+padding）
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;
      const direction = spaceBelow < CAL_HEIGHT && spaceAbove >= CAL_HEIGHT ? 'up' : 'down';
      setCalendarPos({
        // 向上展开时用 bottom 定位（相对视口底部），让日历底部紧贴 trigger 顶部
        ...(direction === 'up' ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    } else {
      setCalendarPos(null);
    }
  }, [open]);

  // 点击外部 / 滚动 / 窗口尺寸变化时关闭（fixed 定位需自行同步关闭）
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        (ref.current && ref.current.contains(e.target as Node)) ||
        (calendarRef.current && calendarRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', handler);
    // 任何可滚动祖先滚动时关闭，避免日历与输入框错位
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

  // 生成 42 格日历
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrent: boolean }[] = [];
  // 上月填充
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrent: false,
    });
  }
  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrent: true });
  }
  // 下月填充
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear,
      isCurrent: false,
    });
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDate = (cell: (typeof cells)[0]) => {
    const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
    onChange(dateStr);
    setOpen(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-ink-700' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400" />
      </button>

      {open && calendarPos && createPortal(
        <div
          ref={calendarRef}
          className="fixed z-[70] p-3 rounded-lg border border-ink-200 bg-[var(--bg-secondary)] shadow-lg"
          style={{ top: calendarPos.top, bottom: calendarPos.bottom, left: calendarPos.left, width: calendarPos.width }}
        >
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-ink-700">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs text-gray-400 py-1">{w}</div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(cell)}
                  className={`date-picker-cell w-8 h-8 rounded text-sm transition-colors ${
                    isSelected
                      ? 'bg-ink-200 text-ink-700 font-medium'
                      : isToday
                      ? 'bg-amber-100 text-ink-700 font-medium'
                      : cell.isCurrent
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-300'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
