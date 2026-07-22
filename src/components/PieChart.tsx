/**
 * 纯 SVG 环形饼图
 *
 * 重写自课表 chartService.js
 * 无第三方依赖，支持悬停 tooltip 和中心总计
 */
import { useState } from 'react';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 环形扇区路径 */
function describeDonutArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle - startAngle >= 359.99) {
    // 满圆：外圆 + 内圆反向
    return [
      `M ${cx - rOuter} ${cy}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy}`,
      `M ${cx - rInner} ${cy}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy}`,
      'Z',
    ].join(' ');
  }
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

export default function PieChart({
  data,
  size = 220,
  centerLabel,
  centerValue,
}: PieChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400 py-12">
        暂无数据
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.62;

  // 按值降序排列
  const sorted = [...data].sort((a, b) => b.value - a.value);
  let cumulative = 0;
  const segments = sorted.map((d) => {
    const pct = d.value / total;
    const startAngle = cumulative * 360;
    const endAngle = (cumulative + pct) * 360;
    cumulative += pct;
    return { ...d, pct, startAngle, endAngle };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => {
            const isHover = hoverIdx === i;
            const scale = isHover ? 1.04 : 1;
            const r = rOuter * scale;
            const path = describeDonutArc(cx, cy, r, rInner, seg.startAngle, seg.endAngle);
            return (
              <path
                key={i}
                d={path}
                fill={seg.color}
                style={{
                  transition: 'opacity 0.15s ease',
                  opacity: hoverIdx === null || isHover ? 1 : 0.5,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <title>{`${seg.label}: ${seg.value} (${(seg.pct * 100).toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerLabel && (
              <span className="text-xs text-gray-500">
                {centerLabel}
              </span>
            )}
            <span className="text-xl font-num font-bold text-gray-900">
              {centerValue}
            </span>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs cursor-pointer transition-opacity ${
              hoverIdx === null || hoverIdx === i ? 'opacity-100' : 'opacity-50'
            }`}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-600 truncate flex-1">
              {seg.label}
            </span>
            <span className="text-gray-400 font-num shrink-0">
              {seg.value} · {(seg.pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
