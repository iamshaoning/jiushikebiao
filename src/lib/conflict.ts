/**
 * 冲突检测
 *
 * 重写自课表 conflictCheckService.js
 * 算法：两节课在同一天且时间区间重叠则冲突
 * Math.max(startA, startB) < Math.min(endA, endB)
 */
import type { Course } from './types';
import { timeToMins, calculateEndTimeFromDuration } from './utils';

/** 获取课程的开始和结束分钟数 */
export function getCourseTimeRange(course: Course): { start: number; end: number } {
  const start = timeToMins(course.startTime);
  const end = timeToMins(calculateEndTimeFromDuration(course.startTime, course.duration));
  // 24:00 边界：calculateEndTimeFromDuration 对结束于午夜的课程返回 '00:00'（即 0），
  // 此处视为 1440，否则 end=0 会使 checkTimeConflict 的区间重叠判定失效
  return { start, end: end === 0 ? 1440 : end };
}

/** 检查两节课时间是否冲突（同日 + 时间区间重叠） */
export function checkTimeConflict(a: Course, b: Course): boolean {
  if (a.date !== b.date) return false;
  if (a.id === b.id) return false;
  const { start: startA, end: endA } = getCourseTimeRange(a);
  const { start: startB, end: endB } = getCourseTimeRange(b);
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/** 查找与目标课程冲突的已有课程 */
export function findConflictingCourses(target: Course, existing: Course[]): Course[] {
  return existing.filter((c) => c.id !== target.id && checkTimeConflict(target, c));
}


