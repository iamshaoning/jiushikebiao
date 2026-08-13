/**
 * 历史记录服务
 *
 * 重写自课表 historyService.js
 * 按用户 ID 分组存储到 localStorage，最多 20 条
 * 支持课程/学生操作的撤销与重做，通过 zustand mutateData 修改数据
 */
import { useStore } from '@/stores/useStore';
import { isOffline } from './data';
import { useToastStore } from '@/components/Toast';
import type {
  Course,
  Student,
  AppState,
  HistoryType,
  HistoryRecord,
} from './types';
import { generateId } from './utils';

const STORAGE_KEY = 'coursemanagerhistory';
const MAX_RECORDS = 20;

/* ---------- 存储读写 ---------- */

function getAllHistories(): Record<string, HistoryRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && !Array.isArray(parsed)) return parsed as Record<string, HistoryRecord[]>;
    return {};
  } catch {
    return {};
  }
}

function saveHistories(all: Record<string, HistoryRecord[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('保存历史记录失败:', e);
  }
}

function getCurrentUserId(): string | null {
  return useStore.getState().user?.id || null;
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- 添加记录 ---------- */

function addToHistory(record: HistoryRecord): void {
  // 离线限制：业务修改被 mutateData 拦截后，调用方的 record* 仍会执行，
  // 在此兜底，避免离线时写入假操作记录
  if (isOffline()) return;
  const userId = getCurrentUserId();
  if (!userId) return;
  record.userid = userId;

  const all = getAllHistories();
  const mine = all[userId] || [];
  mine.unshift(record);
  all[userId] = mine.slice(0, MAX_RECORDS);
  saveHistories(all);
}

/* ---------- 记录函数 ---------- */

export function recordAddCourse(course: Course, isPaste = false): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: isPaste ? 'paste-courses' : 'add-course',
    timestamp: Date.now(),
    userid: '',
    description: isPaste ? '粘贴课程' : '添加课程',
    after: clone(course),
    meta: { isPaste },
  };
  addToHistory(record);
}

export function recordPasteCourses(courses: Course[]): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'paste-courses',
    timestamp: Date.now(),
    userid: '',
    description: `粘贴 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length },
  };
  addToHistory(record);
}

export function recordUpdateCourse(oldCourse: Course, newCourse: Course): void {
  const changes: { field: string; old?: string; new?: string }[] = [];
  if (oldCourse.date !== newCourse.date) {
    changes.push({ field: '日期', old: oldCourse.date, new: newCourse.date });
  }
  if (oldCourse.startTime !== newCourse.startTime) {
    changes.push({ field: '时间', old: oldCourse.startTime, new: newCourse.startTime });
  }
  if (oldCourse.duration !== newCourse.duration) {
    changes.push({ field: '时长', old: `${oldCourse.duration}分钟`, new: `${newCourse.duration}分钟` });
  }
  if (oldCourse.lessonType !== newCourse.lessonType) {
    changes.push({ field: '课型', old: oldCourse.lessonType, new: newCourse.lessonType });
  }
  const oldFee = oldCourse.fees?.[0] ?? 0;
  const newFee = newCourse.fees?.[0] ?? 0;
  if (oldFee !== newFee) {
    changes.push({ field: '课时费', old: `¥${oldFee}`, new: `¥${newFee}` });
  }
  const oldIds = (oldCourse.studentIds || []).slice().sort().join(',');
  const newIds = (newCourse.studentIds || []).slice().sort().join(',');
  if (oldIds !== newIds) {
    changes.push({ field: '学生' });
  }

  const record: HistoryRecord = {
    id: generateId(),
    type: 'update-course',
    timestamp: Date.now(),
    userid: '',
    description: '修改课程',
    before: clone(oldCourse),
    after: clone(newCourse),
    meta: { changes },
  };
  addToHistory(record);
}

export function recordDeleteCourse(course: Course): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'delete-course',
    timestamp: Date.now(),
    userid: '',
    description: '删除课程',
    before: clone(course),
  };
  addToHistory(record);
}

export function recordDeleteDayCourses(date: string, courses: Course[]): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'delete-day-courses',
    timestamp: Date.now(),
    userid: '',
    description: `删除 ${date} 共 ${courses.length} 节课程`,
    before: clone(courses),
    meta: { date, count: courses.length },
  };
  addToHistory(record);
}

export function recordBatchAddCourses(courses: Course[]): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-add-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量添加 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length },
  };
  addToHistory(record);
}

export function recordBatchDeleteCourses(courses: Course[]): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-delete-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量删除 ${courses.length} 节课程`,
    before: clone(courses),
    meta: { count: courses.length },
  };
  addToHistory(record);
}

export function recordBatchDeleteDayCourses(dates: string[], allCourses: Course[]): void {
  if (!allCourses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-delete-day-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量删除 ${dates.length} 天共 ${allCourses.length} 节课程`,
    before: clone(allCourses),
    meta: { dates, count: allCourses.length },
  };
  addToHistory(record);
}

export function recordBatchPasteCourses(courses: Course[]): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-paste-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量粘贴 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length },
  };
  addToHistory(record);
}

export function recordDeleteStudent(student: Student, deletedCourses: Course[]): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'delete-student',
    timestamp: Date.now(),
    userid: '',
    description: `删除学生：${student.name}`,
    before: clone(student),
    meta: { deletedCourses: clone(deletedCourses), courseCount: deletedCourses.length },
  };
  addToHistory(record);
}

export function recordBatchDeleteStudents(students: Student[], deletedCourses: Course[]): void {
  if (!students.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-delete-students',
    timestamp: Date.now(),
    userid: '',
    description: `批量删除 ${students.length} 位学生`,
    before: clone(students),
    meta: { deletedCourses: clone(deletedCourses), courseCount: deletedCourses.length },
  };
  addToHistory(record);
}

export function recordRestoreSnapshot(
  previousData: AppState,
  snapshotData: AppState,
  meta: { snapshotType: string; snapshotDate: string },
): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'restore-snapshot',
    timestamp: Date.now(),
    userid: '',
    description: `恢复${meta.snapshotType}快照 (${meta.snapshotDate})`,
    meta: {
      previousData: clone(previousData),
      snapshotData: clone(snapshotData),
      snapshotType: meta.snapshotType,
      snapshotDate: meta.snapshotDate,
    },
  };
  addToHistory(record);
}

/* ---------- 查询 ---------- */

export function getHistory(userId?: string): HistoryRecord[] {
  const uid = userId || getCurrentUserId();
  if (!uid) return [];
  const all = getAllHistories();
  return (all[uid] || []).slice();
}

export function clearHistory(userId?: string): void {
  // 离线限制
  if (isOffline()) {
    useToastStore.getState().push('warning', '当前处于离线状态，仅可查看数据，无法修改');
    return;
  }
  const uid = userId || getCurrentUserId();
  if (!uid) return;
  const all = getAllHistories();
  delete all[uid];
  saveHistories(all);
}

/* ---------- 撤销/重做 ---------- */

/** 从 before/after/meta 中提取课程数组 */
function extractCourses(record: HistoryRecord, field: 'before' | 'after'): Course[] {
  const val = record[field];
  if (!val) return [];
  if (Array.isArray(val)) return val as Course[];
  return [val as Course];
}

/** 从 before 中提取学生数组 */
function extractStudents(record: HistoryRecord): Student[] {
  const val = record.before;
  if (!val) return [];
  if (Array.isArray(val)) return val as Student[];
  return [val as Student];
}

/** 标记记录为已撤销/未撤销 */
function markUndone(actionId: string, undone: boolean): void {
  const uid = getCurrentUserId();
  if (!uid) return;
  const all = getAllHistories();
  const mine = all[uid] || [];
  const idx = mine.findIndex((r) => r.id === actionId);
  if (idx === -1) return;
  mine[idx] = { ...mine[idx], meta: { ...mine[idx].meta, undone } };
  all[uid] = mine;
  saveHistories(all);
}

export function undoAction(actionId: string): boolean {
  // 离线限制
  if (isOffline()) {
    useToastStore.getState().push('warning', '当前处于离线状态，仅可查看数据，无法修改');
    return false;
  }
  const records = getHistory();
  const record = records.find((r) => r.id === actionId);
  if (!record) return false;

  let success = false;
  const { mutateData, replaceData } = useStore.getState();

  switch (record.type) {
    case 'add-course':
    case 'paste-courses':
    case 'batch-add-courses':
    case 'batch-paste-courses': {
      const courses = extractCourses(record, 'after');
      const ids = new Set(courses.map((c) => c.id));
      mutateData((draft) => {
        draft.courses = draft.courses.filter((c) => !ids.has(c.id));
      });
      success = true;
      break;
    }
    case 'update-course': {
      const oldCourse = record.before as Course;
      mutateData((draft) => {
        const idx = draft.courses.findIndex((c) => c.id === oldCourse.id);
        if (idx >= 0) draft.courses[idx] = clone(oldCourse);
      });
      success = true;
      break;
    }
    case 'delete-course':
    case 'delete-day-courses':
    case 'batch-delete-courses':
    case 'batch-delete-day-courses': {
      const courses = extractCourses(record, 'before');
      const existingIds = new Set(useStore.getState().courses.map((c) => c.id));
      mutateData((draft) => {
        courses.forEach((course) => {
          if (!existingIds.has(course.id)) draft.courses.push(clone(course));
        });
      });
      success = true;
      break;
    }
    case 'delete-student':
    case 'batch-delete-students': {
      const students = extractStudents(record);
      const courses = (record.meta?.deletedCourses as Course[]) || [];
      const existingStudentIds = new Set(useStore.getState().students.map((s) => s.id));
      const existingCourseIds = new Set(useStore.getState().courses.map((c) => c.id));
      mutateData((draft) => {
        students.forEach((student) => {
          if (!existingStudentIds.has(student.id)) draft.students.push(clone(student));
        });
        courses.forEach((course) => {
          if (!existingCourseIds.has(course.id)) draft.courses.push(clone(course));
        });
      });
      success = true;
      break;
    }
    case 'restore-snapshot': {
      const prevData = record.meta?.previousData as AppState | undefined;
      if (!prevData) return false;
      replaceData({
        students: prevData.students || [],
        courses: prevData.courses || [],
        organizations: prevData.organizations || [],
        grades: prevData.grades || [],
        organizationColors: prevData.organizationColors || {},
        gradeColors: prevData.gradeColors || {},
        lastupdated: Date.now(),
      });
      success = true;
      break;
    }
  }

  if (success) markUndone(actionId, true);
  return success;
}

export function redoAction(actionId: string): boolean {
  // 离线限制
  if (isOffline()) {
    useToastStore.getState().push('warning', '当前处于离线状态，仅可查看数据，无法修改');
    return false;
  }
  const records = getHistory();
  const record = records.find((r) => r.id === actionId);
  if (!record || !record.meta?.undone) return false;

  let success = false;
  const { mutateData, replaceData } = useStore.getState();

  switch (record.type) {
    case 'add-course':
    case 'paste-courses':
    case 'batch-add-courses':
    case 'batch-paste-courses': {
      const courses = extractCourses(record, 'after');
      const existingIds = new Set(useStore.getState().courses.map((c) => c.id));
      mutateData((draft) => {
        courses.forEach((course) => {
          if (!existingIds.has(course.id)) draft.courses.push(clone(course));
        });
      });
      success = true;
      break;
    }
    case 'update-course': {
      const newCourse = record.after as Course;
      mutateData((draft) => {
        const idx = draft.courses.findIndex((c) => c.id === newCourse.id);
        if (idx >= 0) draft.courses[idx] = clone(newCourse);
      });
      success = true;
      break;
    }
    case 'delete-course':
    case 'delete-day-courses':
    case 'batch-delete-courses':
    case 'batch-delete-day-courses': {
      const courses = extractCourses(record, 'before');
      const ids = new Set(courses.map((c) => c.id));
      mutateData((draft) => {
        draft.courses = draft.courses.filter((c) => !ids.has(c.id));
      });
      success = true;
      break;
    }
    case 'delete-student':
    case 'batch-delete-students': {
      const students = extractStudents(record);
      const courses = (record.meta?.deletedCourses as Course[]) || [];
      const studentIds = new Set(students.map((s) => s.id));
      const courseIds = new Set(courses.map((c) => c.id));
      mutateData((draft) => {
        draft.students = draft.students.filter((s) => !studentIds.has(s.id));
        draft.courses = draft.courses.filter((c) => !courseIds.has(c.id));
      });
      success = true;
      break;
    }
    case 'restore-snapshot': {
      const snapData = record.meta?.snapshotData as AppState | undefined;
      if (!snapData) return false;
      replaceData({
        students: snapData.students || [],
        courses: snapData.courses || [],
        organizations: snapData.organizations || [],
        grades: snapData.grades || [],
        organizationColors: snapData.organizationColors || {},
        gradeColors: snapData.gradeColors || {},
        lastupdated: Date.now(),
      });
      success = true;
      break;
    }
  }

  if (success) markUndone(actionId, false);
  return success;
}
