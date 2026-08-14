/**
 * 通用工具函数（合并 coreUtils + dateUtils + colorUtils）
 */

/* ---------- 核心工具 ---------- */

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/* ---------- 日期/时间工具 ---------- */

export function timeToMins(timeStr: string | undefined | null): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function calculateEndTimeFromDuration(
  startTime: string | undefined | null,
  duration: number | undefined | null,
): string {
  if (!startTime || typeof startTime !== 'string') return '';
  const actualDuration = duration ?? 120;
  const parts = startTime.split(':');
  if (parts.length < 2) return '';
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return '';
  const totalMinutes = hours * 60 + minutes + actualDuration;
  const maxMinutes = 24 * 60; // 1440
  const finalMinutes = Math.min(totalMinutes, maxMinutes);

  if (finalMinutes === maxMinutes) {
    return '00:00';
  }
  const endHours = Math.floor(finalMinutes / 60);
  const endMinutes = finalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/* ---------- 颜色工具 ---------- */

export const COLOR_PALETTE = [
  '#3B82F6', '#7FFFD4', '#E0A458', '#FFB6C1',
  '#C0C0C0', '#0ABAB5', '#FFBF00', '#EE82EE',
  '#32CD32', '#1E90FF', '#FF4500', '#9400D3',
  '#0F3D2E', '#003153', '#800020', '#7B68EE',
];

const colorAssignments: Record<'organization' | 'grade', Map<string, string>> = {
  organization: new Map(),
  grade: new Map(),
};

const usedColors: Record<'organization' | 'grade', Set<string>> = {
  organization: new Set(),
  grade: new Set(),
};

/** 为文本生成稳定颜色（同文本同色） */
export function generateColor(text: string, type: 'organization' | 'grade' = 'organization'): string {
  const validType = colorAssignments[type] ? type : 'organization';
  if (colorAssignments[validType].has(text)) {
    return colorAssignments[validType].get(text)!;
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let color = COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
  if (usedColors[validType].has(color)) {
    const startIndex = COLOR_PALETTE.indexOf(color);
    for (let i = 1; i < COLOR_PALETTE.length; i++) {
      const nextColor = COLOR_PALETTE[(startIndex + i) % COLOR_PALETTE.length];
      if (!usedColors[validType].has(nextColor)) {
        color = nextColor;
        break;
      }
    }
  }
  colorAssignments[validType].set(text, color);
  usedColors[validType].add(color);
  return color;
}

export function setColorAssignment(text: string, color: string, type: 'organization' | 'grade' = 'organization') {
  const validType = colorAssignments[type] ? type : 'organization';
  const existing = colorAssignments[validType].get(text);
  if (existing && usedColors[validType]) {
    let stillUsed = false;
    for (const [key, c] of colorAssignments[validType]) {
      if (key !== text && c === existing) {
        stillUsed = true;
        break;
      }
    }
    if (!stillUsed) usedColors[validType].delete(existing);
  }
  colorAssignments[validType].set(text, color);
  if (usedColors[validType]) usedColors[validType].add(color);
}

export function removeColorAssignment(text: string, type: 'organization' | 'grade') {
  if (!colorAssignments[type]) return;
  const color = colorAssignments[type].get(text);
  colorAssignments[type].delete(text);
  if (color && usedColors[type]) {
    let stillUsed = false;
    for (const [, c] of colorAssignments[type]) {
      if (c === color) {
        stillUsed = true;
        break;
      }
    }
    if (!stillUsed) usedColors[type].delete(color);
  }
}

/** 从 state 的颜色映射表初始化内存颜色分配 */
export function initColorsFromState(
  orgColors: Record<string, string> | undefined,
  gradeColors: Record<string, string> | undefined,
) {
  colorAssignments.organization.clear();
  usedColors.organization.clear();
  colorAssignments.grade.clear();
  usedColors.grade.clear();
  if (orgColors) {
    Object.entries(orgColors).forEach(([text, color]) => {
      colorAssignments.organization.set(text, color);
      usedColors.organization.add(color);
    });
  }
  if (gradeColors) {
    Object.entries(gradeColors).forEach(([text, color]) => {
      colorAssignments.grade.set(text, color);
      usedColors.grade.add(color);
    });
  }
}

export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

/** 安全颜色值白名单校验（防止注入） */
export function safeColor(color: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(color) || /^var\(--[\w-]+\)$/.test(color)) return color;
  return 'var(--color-secondary)';
}
