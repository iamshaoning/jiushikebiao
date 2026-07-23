import { type ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: string;
  /** 嵌套模态框（二级），z-index 更高 */
  nested?: boolean;
  /** 是否点击遮罩关闭，默认 true */
  closeOnOverlay?: boolean;
  /** 隐藏默认头部 */
  hideHeader?: boolean;
  /** 内容区使用 overflow-visible（用于含下拉菜单等绝对定位元素的模态框） */
  overflowVisible?: boolean;
}

const FADE_MS = 200;

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  width = 'max-w-md',
  nested = false,
  closeOnOverlay = true,
  hideHeader = false,
  overflowVisible = false,
}: ModalProps) {
  // shouldRender 控制 DOM 是否存在；visible 控制淡入/淡出过渡
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      // 双重 rAF 确保初始 opacity:0 先渲染到 DOM，再触发淡入
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      // 等淡出动画完成后再移除 DOM
      const t = setTimeout(() => setShouldRender(false), FADE_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!shouldRender) return null;

  // 遮罩覆盖内容区域：移动端从次级导航栏下方开始（top-88px），避免模态框伸进导航栏被遮盖；
  // 桌面端从侧边栏右侧开始（desktop:left-64），顶部贴顶。
  // 断点统一为 desktop(1100px)，与侧边栏显示断点一致，避免 md/lg 与 desktop 错位产生空白
  const overlayCls = nested
    ? 'modal-overlay fixed top-[88px] inset-x-0 bottom-0 desktop:top-0 desktop:inset-y-0 desktop:left-64 bg-black/70 z-[60] flex items-center justify-center p-4'
    : 'modal-overlay fixed top-[88px] inset-x-0 bottom-0 desktop:top-0 desktop:inset-y-0 desktop:left-64 bg-ink-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4';

  return createPortal(
    <div
      className={`${overlayCls} transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`bg-[var(--bg-secondary)] rounded-xl2 shadow-lift w-full ${width} max-h-[calc(100vh-7.5rem)] desktop:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden transition-all duration-200 ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 shrink-0">
            <h3 className="font-display text-lg font-bold text-ink-700">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`flex-1 min-h-0 px-5 py-4 text-sm text-gray-700 leading-relaxed ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-ink-100 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
