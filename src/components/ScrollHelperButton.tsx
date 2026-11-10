/**
 * 右下角圆形快捷按钮
 *
 * - mode="today"：日历页，滚动定位到今天所在格子并尽量居中
 * - mode="top"：学生 / 统计页，快速回到页面顶部
 *
 * 切页或有操作时出现，5 秒无操作自动隐藏；与浮动操作栏同处底部一行。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ArrowUp } from 'lucide-react';

const HIDE_DELAY = 5000;

interface ScrollHelperButtonProps {
  mode: 'today' | 'top';
  onClick: () => void;
  /** 为真时强制隐藏（例如页面上已出现浮动操作栏，避免两者重叠） */
  hidden?: boolean;
}

export default function ScrollHelperButton({ mode, onClick, hidden = false }: ScrollHelperButtonProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTemporarily = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, []);

  useEffect(() => {
    showTemporarily();
    const onInteract = () => showTemporarily();
    // 页面滚动发生在 main 容器内，需用捕获阶段监听才能接到
    document.addEventListener('scroll', onInteract, true);
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('touchstart', onInteract, { passive: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('scroll', onInteract, true);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, [showTemporarily]);

  const shown = visible && !hidden;
  const label = mode === 'today' ? '回到今天' : '回到顶部';

  // 外层与页面内容使用同一套 max-w-7xl + px 内边距，保证按钮右边缘与内容区右边缘严格对齐；
  // bottom 取值使按钮竖直中心线与浮动操作栏中心线重合（移动端 FAB 高 56 → 中心 52，按钮 44 高 → bottom 30）
  return (
    <div className="fixed inset-x-0 bottom-[30px] desktop:bottom-6 z-40 pointer-events-none">
      {/* 窄屏与内容区右边缘对齐（留 16px）；桌面端脱离内容容器，距窗口右侧 40px */}
      <div className="mx-auto px-4 max-w-7xl desktop:max-w-none desktop:px-[40px] flex justify-end">
        <button
          onClick={() => {
            onClick();
            showTemporarily();
          }}
          aria-label={label}
          title={label}
          className={`mr-4 desktop:mr-0 w-11 h-11 desktop:w-12 desktop:h-12 rounded-full bg-ink-700 text-white shadow-lift flex items-center justify-center transition-all duration-300 hover:bg-ink-600 active:scale-95 ${
            shown ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {mode === 'today' ? <CalendarDays className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
