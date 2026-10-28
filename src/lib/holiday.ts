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

/**
 * 节假日标签样式
 *
 * 沿用改版前的色系分工（红 / 金 / 蓝 / 绿 / 琥珀），
 * 仅把原来的高饱和原色换成同色系的浅色底 + 深色字，
 * 既保持各节日的识别度，又不会在米白页面上显得刺眼。
 */
export function getHolidayTagStyle(name: string): CSSProperties {
  const nm = simplifyHolidayName(name);
  const styles: Record<string, CSSProperties> = {
    // 元旦：玫红
    元旦: { backgroundColor: '#FCE7EF', color: '#A8335E' },
    // 春节：金黄底 + 朱红字（加粗）
    春节: { backgroundColor: '#FAE7B8', color: '#B3261E', fontWeight: 'bold' },
    // 劳动：砖橙实心
    劳动: { backgroundColor: '#FBE3D3', color: '#A34A21' },
    // 清明：雨蓝
    清明: { backgroundColor: '#E4EDF8', color: '#2B5C9B' },
    // 端午：艾绿
    端午: { backgroundColor: '#E3F0E4', color: '#2F6B3C' },
    // 中秋：月黄底 + 橄榄棕字
    中秋: { backgroundColor: '#F3EDD8', color: '#7A6418' },
    // 国庆：正红（加粗）
    国庆: { backgroundColor: '#F9DEDE', color: '#9B1B2E', fontWeight: 'bold' },
  };
  return styles[nm] || { backgroundColor: '#E8F0EC', color: '#0F3D2E' };
}
