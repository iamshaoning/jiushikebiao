/**
 * 浮动操作栏
 *
 * 重写自课表 fabHandlerService.js
 * 单日期/多日期/单课程/多课程操作按钮
 * 出现时从底部上浮，消失时整体下沉（按钮内容保持不变）
 */
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ClipboardPaste,
  X,
} from 'lucide-react';

export type FabType =
  | 'date'
  | 'course'
  | 'multi-date'
  | 'multi-course'
  | 'student'
  | 'multi-student'
  | null;

interface FloatingActionBarProps {
  type: FabType;
  count?: number;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
}

export default function FloatingActionBar({
  type,
  count = 0,
  onAdd,
  onEdit,
  onDelete,
  onCopy,
  onPaste,
  onClear,
}: FloatingActionBarProps) {
  const [visible, setVisible] = useState(false);
  const [renderContent, setRenderContent] = useState(false);
  // displayType 保持上一个非 null 类型，确保消失时按钮内容不变
  const [displayType, setDisplayType] = useState<FabType>(null);

  // 最新 props（每次渲染更新）
  const latestRef = useRef({ count, onAdd, onEdit, onDelete, onCopy, onPaste, onClear });
  latestRef.current = { count, onAdd, onEdit, onDelete, onCopy, onPaste, onClear };
  // 缓存的 props（退出动画期间使用，保持按钮内容不变）
  const cachedRef = useRef(latestRef.current);

  useEffect(() => {
    if (type) {
      setDisplayType(type);
      cachedRef.current = latestRef.current;
      setRenderContent(true);
      // 双重 rAF 确保初始 translate-y-16 已渲染到 DOM，再触发上浮过渡
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      // 等下沉动画完成后再移除 DOM 和清空 displayType
      // 400ms > 300ms transition，确保 FAB 完全移出视口后再移除 DOM，避免"卡顿然后突然消失"
      const t = setTimeout(() => {
        setRenderContent(false);
        setDisplayType(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [type]);

  if (!renderContent) return null;

  // 退出动画期间使用缓存的 props，保持按钮内容完全不变
  const p = type ? latestRef.current : cachedRef.current;
  const t = type || displayType;

  const isMulti = t === 'multi-date' || t === 'multi-course' || t === 'multi-student';
  const isMultiDate = t === 'multi-date';
  const isMultiStudent = t === 'multi-student';
  const isSingleDate = t === 'date';
  const isSingleCourse = t === 'course';
  const isSingleStudent = t === 'student';

  // 添加：单日期 / 多日期
  const showAdd = (isSingleDate || isMultiDate) && p.onAdd;
  // 编辑：单课程 / 单学生 / 多学生（批量编辑）
  const showEdit = (isSingleCourse || isSingleStudent || isMultiStudent) && p.onEdit;
  // 复制：单课程（复制选中课程）/ 单日期（复制当天所有课程）
  const showCopy = (isSingleCourse || isSingleDate) && p.onCopy;
  // 粘贴：单日期 / 多日期
  const showPaste = (isSingleDate || isMultiDate) && p.onPaste;
  // 删除：全部类型
  const showDelete = p.onDelete;
  // 清除选择：所有多选
  const showClear = isMulti && p.onClear;

  return (
    <div
      className={`floating-action-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0 pointer-events-auto' : 'translate-y-32 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-ink-700 text-white shadow-lift">
        {/* 计数 */}
        {isMulti && (
          <span className="text-xs text-ink-100/70 px-2">已选 {p.count} 项</span>
        )}

        {/* 添加（单日期 / 多日期） */}
        {showAdd && (
          <button
            onClick={p.onAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-ink-600/50 transition-colors"
            title={isMultiDate ? '批量添加课程' : '添加课程'}
          >
            <Plus className="w-4 h-4" />
            {isMultiDate ? '批量添加' : '添加'}
          </button>
        )}

        {/* 编辑（单课程 / 单学生 / 多学生） */}
        {showEdit && (
          <button
            onClick={p.onEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-ink-600/50 transition-colors"
            title={isMultiStudent ? '批量编辑学生' : isSingleCourse ? '编辑课程' : '编辑学生'}
          >
            <Pencil className="w-4 h-4" />
            {isMultiStudent ? '批量编辑' : '编辑'}
          </button>
        )}

        {/* 复制（仅单课程） */}
        {showCopy && (
          <button
            onClick={p.onCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-ink-600/50 transition-colors"
            title={isSingleDate ? '复制当天所有课程' : '复制课程'}
          >
            <Copy className="w-4 h-4" />
            复制
          </button>
        )}

        {/* 粘贴（单日期 / 多日期） */}
        {showPaste && (
          <button
            onClick={p.onPaste}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-ink-600/50 transition-colors"
            title={isMultiDate ? '批量粘贴课程' : '粘贴课程'}
          >
            <ClipboardPaste className="w-4 h-4" />
            {isMultiDate ? '批量粘贴' : '粘贴'}
          </button>
        )}

        {/* 删除 */}
        {showDelete && (
          <button
            onClick={p.onDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            title={isMulti ? '批量删除' : '删除'}
          >
            <Trash2 className="w-4 h-4" />
            {isMulti ? '批量删除' : '删除'}
          </button>
        )}

        {/* 清除选择 */}
        {showClear && (
          <button
            onClick={p.onClear}
            className="flex items-center px-2 py-1.5 rounded-lg text-sm text-ink-100/70 hover:text-white hover:bg-ink-600/50 transition-colors"
            title="取消选择"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
