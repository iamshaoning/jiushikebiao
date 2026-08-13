/**
 * 课程事件处理 + 费用计算 + 剪贴板
 *
 * 重写自课表 courseEventHandlerService.js + clipboardUtils.js + feeCalculationService.js
 */
import { useStore } from '@/stores/useStore';
import type { Course, Student, LessonType } from './types';
import { generateId, timeToMins, calculateEndTimeFromDuration, generateColor } from './utils';
import { findConflictingCourses, checkTimeConflict } from './conflict';

/* ---------- 费用计算 ---------- */

/**
 * 计算一对一课程费用
 * 公式：(baseFee / baseDuration) * finalDuration
 */
export function calculateOneOnOneFee(student: Student, duration: number): number {
  const baseFee = student.fees?.['一对一'] ?? 0;
  const baseDuration = student.fees?.['一对一_duration'] ?? 120;
  const divisor = Math.max(1, baseDuration);
  // Math.round 修正浮点精度（如 123/120*120 = 122.999...）
  return Math.round((baseFee / divisor) * duration * 100) / 100;
}

/**
 * 获取课程的费用数组（按学生索引）
 * - 一对一：按学生计算费用
 * - 多人课：费用手动输入，取 course.fees[0] 作为总费用
 */
export function getCourseFees(
  lessonType: LessonType,
  students: Student[],
  duration: number,
  manualFee?: number,
): number[] {
  if (lessonType === '一对一') {
    return students.map((s) => calculateOneOnOneFee(s, duration));
  }
  // 多人课：费用只算一次，存在 fees[0]
  const totalFee = manualFee ?? 0;
  return students.length > 0 ? [totalFee] : [];
}

/** 获取课程显示费用（用于日历标签） */
export function getCourseDisplayFee(course: Course): number {
  if (course.lessonType === '一对一') {
    return course.fees[0] ?? 0;
  }
  // 多人课：总费用
  return course.fees[0] ?? 0;
}

/* ---------- 课程 CRUD ---------- */

/** 创建课程对象（补全冗余字段） */
export function createCourseObject(
  partial: Partial<Course>,
  students: Student[],
): Course {
  const studentIds = partial.studentIds || [];
  const selectedStudents = studentIds
    .map((id) => students.find((s) => s.id === id))
    .filter(Boolean) as Student[];

  const now = new Date().toISOString();

  return {
    id: partial.id || generateId(),
    date: partial.date || '',
    lessonType: partial.lessonType || '一对一',
    startTime: partial.startTime || '08:00',
    duration: partial.duration ?? 120,
    fees: partial.fees || getCourseFees(
      partial.lessonType || '一对一',
      selectedStudents,
      partial.duration ?? 120,
      partial.fees?.[0],
    ),
    studentIds,
    studentNames: selectedStudents.map((s) => s.name),
    organizations: selectedStudents.map((s) => s.organization),
    grades: selectedStudents.map((s) => s.grade || ''),
    colors: selectedStudents.map((s) => generateColor(s.organization || '未分配', 'organization')),
    createdAt: partial.createdAt || now,
    updatedAt: now,
  };
}

/** 添加课程 */
export function addCourse(course: Course): void {
  useStore.getState().mutateData((draft) => {
    draft.courses.push(course);
  });
}

/** 更新课程 */
export function updateCourse(course: Course): void {
  useStore.getState().mutateData((draft) => {
    const idx = draft.courses.findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      draft.courses[idx] = { ...course, updatedAt: new Date().toISOString() };
    }
  });
}

/** 删除课程 */
export function deleteCourse(courseId: string): void {
  useStore.getState().mutateData((draft) => {
    draft.courses = draft.courses.filter((c) => c.id !== courseId);
  });
}

/** 批量删除课程 */
export function batchDeleteCourses(courseIds: string[]): void {
  const idSet = new Set(courseIds);
  useStore.getState().mutateData((draft) => {
    draft.courses = draft.courses.filter((c) => !idSet.has(c.id));
  });
}

/** 删除某日期所有课程 */
export function deleteDayCourses(dateStr: string): void {
  useStore.getState().mutateData((draft) => {
    draft.courses = draft.courses.filter((c) => c.date !== dateStr);
  });
}

/* ---------- 剪贴板（复制/粘贴） ---------- */

const CLIPBOARD_KEY = 'copiedCourses';

/** 复制课程到剪贴板 */
export function copyCourses(courses: Course[]): boolean {
  if (courses.length === 0) return false;
  localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(courses));
  return true;
}

/** 获取剪贴板课程 */
export function getClippedCourses(): Course[] {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    return raw ? (JSON.parse(raw) as Course[]) : [];
  } catch {
    return [];
  }
}

/** 清空剪贴板（重新登录时调用，避免跨账号残留课程数据） */
export function clearCopiedCourses(): void {
  localStorage.removeItem(CLIPBOARD_KEY);
}

/** 检查两节课是否重复（同时间+同课型+同学生） */
function isDuplicateCourse(a: Course, b: Course): boolean {
  if (a.startTime !== b.startTime || a.duration !== b.duration || a.lessonType !== b.lessonType) {
    return false;
  }
  const aIds = a.studentIds || [];
  const bIds = b.studentIds || [];
  if (aIds.length !== bIds.length) return false;
  return aIds.every((id) => bIds.includes(id));
}

export interface PasteConflict {
  newCourse: Course;
  conflictingCourses: Course[];
}

export interface PasteResult {
  added: Course[];
  conflicts: PasteConflict[];
  duplicateCount: number;
}

/**
 * 粘贴课程到目标日期
 * 返回待添加课程和冲突列表，由调用方决定如何处理冲突
 */
export function pasteCoursesToDate(
  dateStr: string,
  existingCourses: Course[],
): PasteResult {
  const copied = getClippedCourses();
  if (copied.length === 0) {
    return { added: [], conflicts: [], duplicateCount: 0 };
  }

  const targetDateCourses = existingCourses.filter((c) => c.date === dateStr);
  const coursesToAdd: Course[] = [];
  const conflicts: PasteConflict[] = [];
  let duplicateCount = 0;

  for (const course of copied) {
    // 检查重复
    const isDup =
      targetDateCourses.some((existing) => isDuplicateCourse(existing, course)) ||
      coursesToAdd.some((added) => isDuplicateCourse(added, course));

    if (isDup) {
      duplicateCount++;
      continue;
    }

    const now = new Date().toISOString();
    const newCourse: Course = {
      ...JSON.parse(JSON.stringify(course)),
      id: generateId(),
      date: dateStr,
      createdAt: now,
      updatedAt: now,
      // 跨版本剪贴板：旧格式课程可能缺 grades，补齐数组结构（内容留空，统计层显示"未设置"）
      ...(!Array.isArray(course.grades) || course.grades.length !== (course.studentIds || []).length
        ? { grades: (course.studentIds || []).map(() => '') }
        : {}),
    };

    // 检查与已有课程的冲突
    const conflictingCourses = findConflictingCourses(newCourse, targetDateCourses);

    if (conflictingCourses.length > 0) {
      conflicts.push({ newCourse, conflictingCourses });
    } else {
      // 检查与已加入队列的课程冲突
      const hasQueueConflict = coursesToAdd.some((added) =>
        checkTimeConflict(newCourse, added),
      );
      if (!hasQueueConflict) {
        coursesToAdd.push(newCourse);
      }
    }
  }

  return { added: coursesToAdd, conflicts, duplicateCount };
}

/**
 * 批量粘贴课程到多个日期
 * 遍历每个目标日期，对每个日期独立检查重复和冲突
 */
export function pasteCoursesToDates(
  dates: string[],
  existingCourses: Course[],
): PasteResult {
  if (dates.length === 0) {
    return { added: [], conflicts: [], duplicateCount: 0 };
  }

  const copied = getClippedCourses();
  if (copied.length === 0) {
    return { added: [], conflicts: [], duplicateCount: 0 };
  }

  const coursesToAdd: Course[] = [];
  const conflicts: PasteConflict[] = [];
  let duplicateCount = 0;

  dates.forEach((dateStr) => {
    const targetDateCourses = existingCourses.filter((c) => c.date === dateStr);

    for (const course of copied) {
      // 检查重复
      const isDup =
        targetDateCourses.some((existing) => isDuplicateCourse(existing, course)) ||
        coursesToAdd.some((added) => added.date === dateStr && isDuplicateCourse(added, course));

      if (isDup) {
        duplicateCount++;
        continue;
      }

      const now = new Date().toISOString();
      const newCourse: Course = {
        ...JSON.parse(JSON.stringify(course)),
        id: generateId(),
        date: dateStr,
        createdAt: now,
        updatedAt: now,
        // 跨版本剪贴板：旧格式课程可能缺 grades，补齐数组结构
        ...(!Array.isArray(course.grades) || course.grades.length !== (course.studentIds || []).length
          ? { grades: (course.studentIds || []).map(() => '') }
          : {}),
      };

      // 检查与已有课程的冲突
      const conflictingCourses = findConflictingCourses(newCourse, targetDateCourses);

      if (conflictingCourses.length > 0) {
        conflicts.push({ newCourse, conflictingCourses });
      } else {
        // 检查与已加入队列的课程冲突（同日期）
        const hasQueueConflict = coursesToAdd.some(
          (added) => added.date === dateStr && checkTimeConflict(newCourse, added),
        );
        if (!hasQueueConflict) {
          coursesToAdd.push(newCourse);
        }
      }
    }
  });

  return { added: coursesToAdd, conflicts, duplicateCount };
}

/** 确认粘贴：添加课程（可能包含覆盖冲突课程） */
export function confirmPaste(
  coursesToAdd: Course[],
  overrideCourseIds: string[],
): void {
  const idSet = new Set(overrideCourseIds);
  useStore.getState().mutateData((draft) => {
    // 删除被覆盖的冲突课程
    if (idSet.size > 0) {
      draft.courses = draft.courses.filter((c) => !idSet.has(c.id));
    }
    // 添加新课程
    draft.courses.push(...coursesToAdd);
  });
}

/* ---------- 学生选择排序 ---------- */

/** 学生按机构→年级→姓名排序 */
export function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const orgCompare = (a.organization || '').localeCompare(b.organization || '');
    if (orgCompare !== 0) return orgCompare;
    const gradeCompare = (a.grade || '').localeCompare(b.grade || '');
    if (gradeCompare !== 0) return gradeCompare;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/** 检查多人课学生选择是否同机构同年级 */
export function checkMultiStudentSelection(
  students: Student[],
  newStudent: Student,
): { organizationMatch: boolean; gradeMatch: boolean } {
  if (students.length === 0) return { organizationMatch: true, gradeMatch: true };
  const orgMatch = students.every((s) => s.organization === newStudent.organization);
  const gradeMatch = students.every((s) => s.grade === newStudent.grade);
  return { organizationMatch: orgMatch, gradeMatch };
}

/* ---------- 隐私模式 ---------- */

/** 隐私模式下遮罩学生姓名（保留首字，其余用*） */
export function maskName(name: string): string {
  if (!name) return '';
  return name[0] + '*'.repeat(Math.max(0, name.length - 1));
}
