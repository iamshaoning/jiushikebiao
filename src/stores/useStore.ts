import { create } from 'zustand';
import type {
  AppState,
  SessionUser,
  SyncStatus,
} from '@/lib/types';
import { initColorsFromState } from '@/lib/utils';
import { useToastStore } from '@/components/Toast';

/** 持久化数据字段（保存到 localStorage + Supabase） */
const DATA_FIELDS: (keyof AppState)[] = [
  'students',
  'courses',
  'organizations',
  'grades',
  'organizationColors',
  'gradeColors',
  'lastupdated',
  'userid',
  'upgradePlan',
  'lastUpgrade',
];

function pickData(state: AppState): AppState {
  const out = {} as AppState;
  DATA_FIELDS.forEach((k) => {
    (out as any)[k] = state[k];
  });
  return out;
}

interface StoreState {
  /* 持久化数据 */
  students: AppState['students'];
  courses: AppState['courses'];
  organizations: string[];
  grades: string[];
  organizationColors: Record<string, string>;
  gradeColors: Record<string, string>;
  lastupdated: number | null;
  userid?: string;
  upgradePlan: AppState['upgradePlan'];
  lastUpgrade: AppState['lastUpgrade'];

  /* 日历视图状态 */
  currentYear: number;
  currentMonth: number; // 0-11
  privacyMode: boolean;

  /* 用户/同步 */
  user: SessionUser | null;
  syncStatus: SyncStatus;
  /** 本地有未确认上传的修改 */
  syncPending: boolean;
  /** Realtime 通道是否已订阅 */
  realtimeConnected: boolean;
  dataLoaded: boolean;

  /* 选择状态 */
  selectedDates: string[];
  selectedCourseIds: string[];
  selectedStudentIds: string[];

  /* actions —— 用户/同步 */
  setSessionUser: (u: SessionUser | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
  setSyncPending: (b: boolean) => void;
  setRealtimeConnected: (b: boolean) => void;
  setDataLoaded: (b: boolean) => void;

  /* actions —— 数据 */
  /** 整体替换持久化数据（从服务器/本地加载后） */
  replaceData: (data: Partial<AppState>, triggerColorInit?: boolean) => void;
  /** 不可变修改持久化数据；自动更新 lastupdated 并触发防抖保存（保存由 data.ts subscribe 注入） */
  mutateData: (producer: (draft: AppState) => void) => void;
  /** 读取当前持久化数据快照 */
  getData: () => AppState;

  /* actions —— 日历视图 */
  setCurrentMonth: (year: number, month: number) => void;
  togglePrivacy: () => void;

  /* actions —— 选择 */
  setSelectedDates: (d: string[]) => void;
  setSelectedCourseIds: (c: string[]) => void;
  setSelectedStudentIds: (s: string[]) => void;
  clearSelections: () => void;
}

const now = new Date();

export const useStore = create<StoreState>((set, get) => ({
  students: [],
  courses: [],
  organizations: [],
  grades: [],
  organizationColors: {},
  gradeColors: {},
  lastupdated: null,
  upgradePlan: null,
  lastUpgrade: null,

  currentYear: now.getFullYear(),
  currentMonth: now.getMonth(),
  privacyMode: false,

  user: null,
  syncStatus: 'offline',
  syncPending: false,
  realtimeConnected: false,
  dataLoaded: false,

  selectedDates: [],
  selectedCourseIds: [],
  selectedStudentIds: [],

  setSessionUser: (u) => set({ user: u }),
  setSyncStatus: (s) => set({ syncStatus: s }),
  setSyncPending: (b) => set({ syncPending: b }),
  setRealtimeConnected: (b) => set({ realtimeConnected: b }),
  setDataLoaded: (b) => set({ dataLoaded: b }),

  replaceData: (data, triggerColorInit = true) => {
    set((state) => ({
      ...state,
      students: data.students ?? state.students,
      courses: data.courses ?? state.courses,
      organizations: data.organizations ?? state.organizations,
      grades: data.grades ?? state.grades,
      organizationColors: data.organizationColors ?? state.organizationColors,
      gradeColors: data.gradeColors ?? state.gradeColors,
      lastupdated: data.lastupdated ?? state.lastupdated,
      userid: data.userid ?? state.userid,
      // 显式 null 需能覆盖旧值（升级计划取消/无记录），仅 undefined 时保留
      upgradePlan: data.upgradePlan !== undefined ? data.upgradePlan : state.upgradePlan,
      lastUpgrade: data.lastUpgrade !== undefined ? data.lastUpgrade : state.lastUpgrade,
    }));
    if (triggerColorInit) {
      initColorsFromState(get().organizationColors, get().gradeColors);
    }
  },

  mutateData: (producer) => {
    // 离线限制：仅真正离线时禁止修改；同步中/检测中不应阻塞编辑
    const { user, dataLoaded, syncStatus } = get();
    if (user && dataLoaded && syncStatus === 'offline') {
      useToastStore.getState().push('warning', '当前处于离线状态，仅可查看数据，无法修改');
      return;
    }
    set((state) => {
      // 浅拷贝持久化字段（创建新引用），producer 可安全 mutate
      const draft: AppState = {
        students: [...state.students],
        courses: [...state.courses],
        organizations: [...state.organizations],
        grades: [...state.grades],
        organizationColors: { ...state.organizationColors },
        gradeColors: { ...state.gradeColors },
        lastupdated: state.lastupdated,
        userid: state.userid,
        upgradePlan: state.upgradePlan,
        lastUpgrade: state.lastUpgrade,
      };
      producer(draft);
      draft.lastupdated = Date.now();
      return {
        ...state,
        ...draft,
        syncPending: true,
      };
    });
  },

  getData: () => pickData(get()),

  setCurrentMonth: (year, month) => set({ currentYear: year, currentMonth: month }),
  togglePrivacy: () => set((s) => ({ privacyMode: !s.privacyMode })),

  setSelectedDates: (d) => set({ selectedDates: d }),
  setSelectedCourseIds: (c) => set({ selectedCourseIds: c }),
  setSelectedStudentIds: (s) => set({ selectedStudentIds: s }),
  clearSelections: () =>
    set({ selectedDates: [], selectedCourseIds: [], selectedStudentIds: [] }),
}));
