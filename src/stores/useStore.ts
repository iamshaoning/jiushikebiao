import { create } from 'zustand';
import type {
  AppState,
  SessionUser,
  SyncStatus,
} from '@/lib/types';
import { initColorsFromState } from '@/lib/utils';

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

  /* 日历视图状态 */
  currentYear: number;
  currentMonth: number; // 0-11
  privacyMode: boolean;

  /* 用户/同步 */
  user: SessionUser | null;
  syncStatus: SyncStatus;
  dataLoaded: boolean;

  /* 选择状态 */
  selectedDates: string[];
  selectedCourseIds: string[];
  selectedStudentIds: string[];

  /* actions —— 用户/同步 */
  setSessionUser: (u: SessionUser | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
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

  currentYear: now.getFullYear(),
  currentMonth: now.getMonth(),
  privacyMode: false,

  user: null,
  syncStatus: 'offline',
  dataLoaded: false,

  selectedDates: [],
  selectedCourseIds: [],
  selectedStudentIds: [],

  setSessionUser: (u) => set({ user: u }),
  setSyncStatus: (s) => set({ syncStatus: s }),
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
    }));
    if (triggerColorInit) {
      initColorsFromState(get().organizationColors, get().gradeColors);
    }
  },

  mutateData: (producer) => {
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
      };
      producer(draft);
      draft.lastupdated = Date.now();
      return {
        ...state,
        ...draft,
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
