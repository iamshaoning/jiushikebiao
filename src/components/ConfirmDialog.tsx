/**
 * 通用二次确认弹窗
 *
 * 还原原项目 modalService.showConfirm 的视觉设计：
 * - 居中图标圆形背景 + 消息文本 + 取消/确认按钮
 * - 三种类型：confirm(蓝) / delete(红) / warning(琥珀)
 * - 遮罩效果与 Modal 一级一致（z-[45]，不覆盖导航栏）
 */
import { type ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, TriangleAlert, CircleAlert } from 'lucide-react';

export type ConfirmType = 'confirm' | 'delete' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  /** 消息文本（支持 JSX，便于加粗关键信息） */
  message: ReactNode;
  /** 弹窗类型：confirm=蓝色确定, delete=红色删除, warning=琥珀确定 */
  type?: ConfirmType;
  /** 确认按钮文案（默认按 type 自动选择） */
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TYPE_CONFIG: Record<
  ConfirmType,
  { icon: typeof HelpCircle; bg: string; color: string; btn: string; defaultText: string }
> = {
  confirm: {
    icon: HelpCircle,
    bg: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--color-primary)',
    btn: 'var(--color-primary)',
    defaultText: '确定',
  },
  delete: {
    icon: TriangleAlert,
    bg: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-danger)',
    btn: 'var(--color-danger)',
    defaultText: '删除',
  },
  warning: {
    icon: CircleAlert,
    bg: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-warning)',
    btn: 'var(--color-warning)',
    defaultText: '确定',
  },
};

export default function ConfirmDialog({
  open,
  message,
  type = 'confirm',
  confirmText,
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!shouldRender) return null;

  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const acceptText = confirmText || cfg.defaultText;

  return createPortal(
    <div
      className={`modal-overlay fixed top-[88px] inset-x-0 bottom-0 desktop:top-0 desktop:inset-y-0 desktop:left-64 bg-ink-900/40 backdrop-blur-sm z-[45] flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onCancel}
    >
      <div
        className={`bg-[var(--bg-modal)] rounded-xl2 shadow-lift w-full max-w-sm p-6 transition-all duration-200 ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* 图标 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: cfg.bg }}
          >
            <Icon className="w-7 h-7" style={{ color: cfg.color }} />
          </div>
          <p
            className="text-sm leading-relaxed text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            {message}
          </p>
        </div>
        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-ink-200 text-gray-700 bg-[var(--bg-secondary)] hover:bg-[var(--bg-content)]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: cfg.btn }}
          >
            {acceptText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
