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
  UpgradePlan,
  UpgradeRecord,
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

export function recordAddCourse(course: Course, isPaste = false, deletedCourses: Course[] = []): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: isPaste ? 'paste-courses' : 'add-course',
    timestamp: Date.now(),
    userid: '',
    description: isPaste ? '粘贴课程' : '添加课程',
    after: clone(course),
    meta: { isPaste, deletedCourses: clone(deletedCourses) },
  };
  addToHistory(record);
}

export function recordPasteCourses(courses: Course[], deletedCourses: Course[] = []): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'paste-courses',
    timestamp: Date.now(),
    userid: '',
    description: `粘贴 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length, deletedCourses: clone(deletedCourses) },
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

export function recordBatchAddCourses(courses: Course[], deletedCourses: Course[] = []): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-add-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量添加 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length, deletedCourses: clone(deletedCourses) },
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

export function recordBatchPasteCourses(courses: Course[], deletedCourses: Course[] = []): void {
  if (!courses.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-paste-courses',
    timestamp: Date.now(),
    userid: '',
    description: `批量粘贴 ${courses.length} 节课程`,
    after: clone(courses),
    meta: { count: courses.length, deletedCourses: clone(deletedCourses) },
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

/** 添加学生（含批量） */
export function recordAddStudents(students: Student[]): void {
  if (!students.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'add-students',
    timestamp: Date.now(),
    userid: '',
    description:
      students.length > 1 ? `批量添加 ${students.length} 名学生` : `添加学生：${students[0].name}`,
    after: clone(students),
    meta: { count: students.length },
  };
  addToHistory(record);
}

/** 编辑学生（含级联更新的课程前后快照） */
export function recordUpdateStudent(
  before: Student,
  after: Student,
  coursesBefore: Course[],
  coursesAfter: Course[],
): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'update-student',
    timestamp: Date.now(),
    userid: '',
    description: `修改学生：${before.name || after.name}`,
    before: clone(before),
    after: clone(after),
    meta: { coursesBefore: clone(coursesBefore), coursesAfter: clone(coursesAfter) },
  };
  addToHistory(record);
}

/** 批量更新学生（含级联更新的课程前后快照） */
export function recordBatchUpdateStudents(
  before: Student[],
  after: Student[],
  coursesBefore: Course[],
  coursesAfter: Course[],
): void {
  if (!before.length) return;
  const record: HistoryRecord = {
    id: generateId(),
    type: 'batch-update-students',
    timestamp: Date.now(),
    userid: '',
    description: `批量更新 ${before.length} 名学生`,
    before: clone(before),
    after: clone(after),
    meta: { coursesBefore: clone(coursesBefore), coursesAfter: clone(coursesAfter) },
  };
  addToHistory(record);
}

/** 机构/年级管理操作的局部状态快照（列表/颜色/受影响学生/受影响课程） */
export interface ManageState {
  list: string[];
  colors: Record<string, string>;
  students: Student[];
  courses: Course[];
}

/** 机构/年级管理：添加/重命名/删除/改色 */
export function recordManageItem(
  description: string,
  type: 'manage-org' | 'manage-grade',
  before: ManageState,
  after: ManageState,
): void {
  const record: HistoryRecord = {
    id: generateId(),
    type,
    timestamp: Date.now(),
    userid: '',
    description,
    meta: { before: clone(before), after: clone(after) },
  };
  addToHistory(record);
}

/** 升级前后快照（全量学生/课程 + 升级计划/执行记录） */
export interface UpgradeState {
  students: Student[];
  courses: Course[];
  upgradePlan: UpgradePlan | null;
  lastUpgrade: UpgradeRecord | null;
}

/** 执行升级（全量学生/课程 + 升级计划/执行记录前后快照） */
export function recordUpgrade(
  description: string,
  before: UpgradeState,
  after: UpgradeState,
): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'upgrade',
    timestamp: Date.now(),
    userid: '',
    description,
    meta: { before: clone(before), after: clone(after) },
  };
  addToHistory(record);
}

/** 创建/取消升级计划（upgradePlan 前后） */
export function recordUpgradePlan(
  description: string,
  before: UpgradePlan | null,
  after: UpgradePlan | null,
): void {
  const record: HistoryRecord = {
    id: generateId(),
    type: 'upgrade-plan',
    timestamp: Date.now(),
    userid: '',
    description,
    meta: { before: clone(before), after: clone(after) },
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

/** 可撤销的最新一条记录（栈顶未撤销记录；历史为最新在前） */
export function getUndoableRecord(): HistoryRecord | null {
  const records = getHistory();
  return records.find((r) => !r.meta?.undone) || null;
}

/** 可重做的最新一条记录（最近被撤销的记录） */
export function getRedoableRecord(): HistoryRecord | null {
  const records = getHistory();
  return records.find((r) => !!r.meta?.undone) || null;
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

/** 从 before/after 提取任意数组（单值包装为数组） */
function extractArray(record: HistoryRecord, field: 'before' | 'after'): unknown[] {
  const val = record[field];
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** 按 id 覆盖学生数组（用于撤销/重做恢复快照） */
function overrideStudents(draft: AppState, students: Student[]): void {
  students.forEach((s) => {
    const idx = draft.students.findIndex((x) => x.id === s.id);
    if (idx >= 0) draft.students[idx] = clone(s);
  });
}

/** 按 id 覆盖课程数组（用于撤销/重做恢复快照） */
function overrideCourses(draft: AppState, courses: Course[]): void {
  courses.forEach((c) => {
    const idx = draft.courses.findIndex((x) => x.id === c.id);
    if (idx >= 0) draft.courses[idx] = clone(c);
  });
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
  const record = getUndoableRecord();
  // 仅允许撤销最新一条未撤销记录（栈式，须按顺序操作）
  if (!record || record.id !== actionId) return false;

  let success = false;
  const { mutateData, replaceData } = useStore.getState();

  switch (record.type) {
    case 'add-course':
    case 'paste-courses':
    case 'batch-add-courses':
    case 'batch-paste-courses': {
      const courses = extractCourses(record, 'after');
      const ids = new Set(courses.map((c) => c.id));
      const deletedCourses = (record.meta?.deletedCourses as Course[]) || [];
      mutateData((draft) => {
        draft.courses = draft.courses.filter((c) => !ids.has(c.id));
        // 恢复被覆盖删除的冲突课程
        const existing = new Set(draft.courses.map((c) => c.id));
        deletedCourses.forEach((c) => {
          if (!existing.has(c.id)) draft.courses.push(clone(c));
        });
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
        userid: prevData.userid,
        upgradePlan: prevData.upgradePlan ?? null,
        lastUpgrade: prevData.lastUpgrade ?? null,
      });
      success = true;
      break;
    }
    case 'add-students': {
      const added = extractArray(record, 'after') as Student[];
      const ids = new Set(added.map((s) => s.id));
      mutateData((draft) => {
        draft.students = draft.students.filter((s) => !ids.has(s.id));
      });
      success = true;
      break;
    }
    case 'update-student':
    case 'batch-update-students': {
      const students = extractArray(record, 'before') as Student[];
      const courses = (record.meta?.coursesBefore as Course[]) || [];
      mutateData((draft) => {
        overrideStudents(draft, students);
        overrideCourses(draft, courses);
      });
      success = true;
      break;
    }
    case 'manage-org':
    case 'manage-grade': {
      const isOrg = record.type === 'manage-org';
      const b = record.meta?.before as ManageState | undefined;
      if (!b) return false;
      mutateData((draft) => {
        overrideStudents(draft, b.students);
        overrideCourses(draft, b.courses);
      });
      replaceData({
        organizations: isOrg ? b.list : undefined,
        grades: isOrg ? undefined : b.list,
        organizationColors: isOrg ? b.colors : undefined,
        gradeColors: isOrg ? undefined : b.colors,
      });
      success = true;
      break;
    }
    case 'upgrade': {
      const b = record.meta?.before as UpgradeState | undefined;
      if (!b) return false;
      replaceData({
        students: b.students,
        courses: b.courses,
        upgradePlan: b.upgradePlan,
        lastUpgrade: b.lastUpgrade,
        lastupdated: Date.now(),
      });
      success = true;
      break;
    }
    case 'upgrade-plan': {
      const b = record.meta?.before as UpgradePlan | null | undefined;
      replaceData({ upgradePlan: b ?? null, lastupdated: Date.now() });
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
  const record = getRedoableRecord();
  // 仅允许重做最新一条已撤销记录（栈式，须按顺序操作）
  if (!record || record.id !== actionId) return false;

  let success = false;
  const { mutateData, replaceData } = useStore.getState();

  switch (record.type) {
    case 'add-course':
    case 'paste-courses':
    case 'batch-add-courses':
    case 'batch-paste-courses': {
      const courses = extractCourses(record, 'after');
      const existingIds = new Set(useStore.getState().courses.map((c) => c.id));
      const deletedCourses = (record.meta?.deletedCourses as Course[]) || [];
      const deletedIds = new Set(deletedCourses.map((c) => c.id));
      mutateData((draft) => {
        courses.forEach((course) => {
          if (!existingIds.has(course.id)) draft.courses.push(clone(course));
        });
        // 重新删除被覆盖的冲突课程
        draft.courses = draft.courses.filter((c) => !deletedIds.has(c.id));
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
        userid: snapData.userid,
        upgradePlan: snapData.upgradePlan ?? null,
        lastUpgrade: snapData.lastUpgrade ?? null,
      });
      success = true;
      break;
    }
    case 'add-students': {
      const added = extractArray(record, 'after') as Student[];
      const existingIds = new Set(useStore.getState().students.map((s) => s.id));
      mutateData((draft) => {
        added.forEach((s) => {
          if (!existingIds.has(s.id)) draft.students.push(clone(s));
        });
      });
      success = true;
      break;
    }
    case 'update-student':
    case 'batch-update-students': {
      const students = extractArray(record, 'after') as Student[];
      const courses = (record.meta?.coursesAfter as Course[]) || [];
      mutateData((draft) => {
        overrideStudents(draft, students);
        overrideCourses(draft, courses);
      });
      success = true;
      break;
    }
    case 'manage-org':
    case 'manage-grade': {
      const isOrg = record.type === 'manage-org';
      const a = record.meta?.after as ManageState | undefined;
      if (!a) return false;
      mutateData((draft) => {
        overrideStudents(draft, a.students);
        overrideCourses(draft, a.courses);
      });
      replaceData({
        organizations: isOrg ? a.list : undefined,
        grades: isOrg ? undefined : a.list,
        organizationColors: isOrg ? a.colors : undefined,
        gradeColors: isOrg ? undefined : a.colors,
      });
      success = true;
      break;
    }
    case 'upgrade': {
      const a = record.meta?.after as UpgradeState | undefined;
      if (!a) return false;
      replaceData({
        students: a.students,
        courses: a.courses,
        upgradePlan: a.upgradePlan,
        lastUpgrade: a.lastUpgrade,
        lastupdated: Date.now(),
      });
      success = true;
      break;
    }
    case 'upgrade-plan': {
      const a = record.meta?.after as UpgradePlan | null | undefined;
      replaceData({ upgradePlan: a ?? null, lastupdated: Date.now() });
      success = true;
      break;
    }
  }

  if (success) markUndone(actionId, false);
  return success;
}
