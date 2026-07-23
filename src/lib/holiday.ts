/**
 * 节假日工具
 *
 * 封装 chinese-days npm 包，重写自课表 calendarRenderService.getDateInfo
 * - getDayDetail(dateStr) → { isWorkday, isHoliday, isInLieu, name }
 */
import * as chineseDays from 'chinese-days';
import type { CSSProperties } from 'react';

export interface DateInfo {
  isWorkday: boolean;
  isHoliday: boolean;
  isInLieu: boolean;
  name: string;
}

/** 获取日期详情（节假日/调休/工作日） */
export function getDateInfo(dateStr: string): DateInfo | null {
  try {
    const dd = (chineseDays as any).getDayDetail(dateStr);
    if (!dd) return null;

    // dd.name 为英文星期名或 '1' 表示普通日，中文名表示节假日
    const isDayName = /^[A-Z][a-z]+$/.test(dd.name) || dd.name === '1';

    const info: DateInfo = {
      isWorkday: dd.work === true,
      isHoliday: !isDayName && dd.work !== true,
      isInLieu: (chineseDays as any).isInLieu ? (chineseDays as any).isInLieu(dateStr) : false,
      name: '',
    };

    if (info.isHoliday && dd.name) {
      const parts = dd.name.split(',');
      info.name =
        parts.find((p: string) => /[\u4e00-\u9fa5]/.test(p)) ||
        parts[parts.length - 1] ||
        dd.name;
    }

    return info;
  } catch {
    return null;
  }
}

/** 节假日名称简化（用于标签显示） */
export function simplifyHolidayName(name: string): string {
  if (!name) return '';
  if (name.includes('劳动节')) return '劳动';
  if (name.includes('国庆')) return '国庆';
  if (name.includes('清明')) return '清明';
  if (name.includes('中秋')) return '中秋';
  return name;
}

/** 节假日标签样式（背景色+文字色） */
export function getHolidayTagStyle(name: string): CSSProperties {
  const nm = simplifyHolidayName(name);
  const styles: Record<string, CSSProperties> = {
    元旦: { backgroundColor: 'rgba(239,68,68,0.2)', color: 'var(--color-danger)' },
    春节: { backgroundColor: 'var(--color-gold)', color: 'var(--color-danger)', fontWeight: 'bold' },
    劳动: { backgroundColor: 'transparent', color: 'var(--color-warning)', border: '2px solid var(--color-warning)' },
    清明: { backgroundColor: 'rgba(59,130,246,0.2)', color: '#2563eb' },
    端午: { backgroundColor: 'rgba(34,197,94,0.2)', color: 'var(--color-success)' },
    中秋: { backgroundColor: 'rgba(234,179,8,0.2)', color: '#b45309' },
    国庆: { backgroundColor: 'var(--color-danger)', color: 'var(--color-gold)', fontWeight: 'bold' },
  };
  return styles[nm] || { backgroundColor: 'var(--color-warning)', color: 'black' };
}
