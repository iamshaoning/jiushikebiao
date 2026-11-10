/**
 * 单行不换行的横向内容容器（学生名胶囊行使用）
 *
 * - 未选中或内容未溢出：正常显示；溢出时右侧渐隐，视觉上等同省略
 * - 选中且内容确实溢出：左右往复滚动播放，便于看全所有学生姓名
 */
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react';

interface MarqueeProps {
  /** 是否允许滚动播放（通常是该课程被选中） */
  active: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}

export default function Marquee({
  active,
  className = '',
  innerClassName = '',
  children,
}: MarqueeProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  // 测量内容宽度与容器宽度之差，只有真的溢出才需要滚动或渐隐
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const diff = inner.scrollWidth - outer.clientWidth;
    setShift(diff > 1 ? diff : 0);
  }, [children, active]);

  const running = active && shift > 0;
  const truncated = !running && shift > 0;

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden ${className}`}
      style={
        truncated
          ? {
              WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 14px), transparent)',
              maskImage: 'linear-gradient(to right, #000 calc(100% - 14px), transparent)',
            }
          : undefined
      }
    >
      <div
        ref={innerRef}
        className={`flex flex-nowrap ${running ? 'marquee-run' : ''} ${innerClassName}`}
        style={
          running
            ? ({
                '--marquee-shift': `-${shift}px`,
                // 距离越长播放越慢，保证阅读速度稳定
                '--marquee-duration': `${Math.max(3, Math.round(shift / 28))}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
