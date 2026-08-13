// 全局类型定义

/** 学生费用配置：按课型存储基础费用与基础时长 */
export interface StudentFees {
  '一对一': number;
  '一对一_duration': number; // 基础时长（分钟）
}

/** 学生 */
export interface Student {
  id: string;
  name: string;
  organization: string;
  grade: string;
  fees: StudentFees;
}

/** 课型 */
export type LessonType = '一对一' | '多人课';

/** 课程 */
export interface Course {
  id: string;
  date: string; // YYYY-MM-DD
  lessonType: LessonType;
  startTime: string; // HH:MM
  duration: number; // 分钟
  fees: number[]; // 按学生索引的课时费
  studentIds: string[];
  studentNames: string[]; // 冗余，编辑学生时级联更新
  organizations: string[]; // 冗余
  grades: string[]; // 冗余（年级快照），编辑学生时级联更新；frozen 课程解除联动
  colors: string[]; // 冗余（机构色）
  frozen?: boolean; // 冷数据标记：升级后冻结，级联字段写死，编辑时解锁可纠错
  createdAt: string;
  updatedAt: string;
}

/** 升级计划中单个年级行的配置 */
export interface UpgradeGradeConfig {
  /** 当前年级 */
  grade: string;
  /** 升级目标年级（为空 = 该年级不升级） */
  target: string;
  /** 预设课时费加成 */
  feeIncrease: number;
}

/** 升级计划中单个机构的配置 */
export interface UpgradeOrgConfig {
  organization: string;
  grades: UpgradeGradeConfig[];
  /** 选中参与升级的学生 id（不在此列表中的学生不升级） */
  studentIds: string[];
}

/** 年级升级计划 */
export interface UpgradePlan {
  /** 新学期开始日期 YYYY-MM-DD */
  newTermStart: string;
  createdAt: number;
  /** pending 待执行 / cancelled 已作废 / executed 已执行 */
  status: 'pending' | 'cancelled' | 'executed';
  orgs: UpgradeOrgConfig[];
}

/** 升级执行记录（只保留最新一条） */
export interface UpgradeRecord {
  newTermStart: string;
  executedAt: number;
  /** 升级的学生数 */
  studentCount: number;
}

/** 应用数据状态（持久化到 localStorage + Supabase coursemanagerdata 表） */
export interface AppState {
  students: Student[];
  courses: Course[];
  organizations: string[];
  grades: string[];
  organizationColors: Record<string, string>;
  gradeColors: Record<string, string>;
  lastupdated: number | null;
  userid?: string;
  /** 升级计划（一次只允许一个进行中计划；null 表示无） */
  upgradePlan: UpgradePlan | null;
  /** 升级执行记录（只保留最新一条；默认数据条目为空记录） */
  lastUpgrade: UpgradeRecord | null;
}

/** 日历视图状态（非持久化） */
export interface CalendarView {
  currentYear: number;
  currentMonth: number; // 0-11
  privacyMode: boolean;
}

/** 会话用户 */
export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
}

/** 同步状态 */
export type SyncStatus = 'online' | 'offline' | 'loggedout' | 'syncing' | 'checking';

/** 历史记录类型 */
export type HistoryType =
  | 'add-course'
  | 'paste-courses'
  | 'update-course'
  | 'delete-course'
  | 'delete-day-courses'
  | 'batch-add-courses'
  | 'batch-delete-courses'
  | 'batch-delete-day-courses'
  | 'batch-paste-courses'
  | 'delete-student'
  | 'batch-delete-students'
  | 'restore-snapshot';

/** 快照类型 */
export type SnapshotType = 'auto' | 'manual';

/** 快照 */
export interface Snapshot {
  id: string;
  type: SnapshotType;
  data: AppState;
  createdAt: number;
  userid: string;
  label?: string;
}

/** 历史记录 */
export interface HistoryRecord {
  id: string;
  type: HistoryType;
  timestamp: number;
  userid: string;
  // 操作前后的数据（用于 undo/redo）
  before?: Course | Course[] | Student | Student[];
  after?: Course | Course[] | Student | Student[];
  description: string;
  meta?: Record<string, unknown>;
}
