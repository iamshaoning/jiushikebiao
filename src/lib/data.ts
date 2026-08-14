/**
 * 数据层：加载、保存、同步、Realtime
 *
 * 重写自课表 dataLoadService.js + dataService.js + stateService.js
 * - localStorage key: coursemanagerdata
 * - Supabase 表: coursemanagerdata（按 userid upsert）
 * - 2000ms 防抖保存
 * - Realtime 订阅 coursemanagerdata 表变化
 */
import { supabase, TABLES } from './supabase';
import { useStore } from '@/stores/useStore';
import type { AppState } from './types';
import { debounce } from './utils';

const LOCAL_KEY = 'coursemanagerdata';
const SAVE_DEBOUNCE = 2000;

/* ---------- 离线限制 ---------- */

/**
 * 是否处于离线限制状态：已登录、数据已加载、但同步状态非在线。
 * 此时禁止一切增删改操作（含快照/历史/升级等），仅可查看数据。
 */
export function isOffline(): boolean {
  const { user, dataLoaded, syncStatus } = useStore.getState();
  return !!user && dataLoaded && syncStatus !== 'online';
}

/* ---------- 本地数据读写 ---------- */

function getLocalData(): AppState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

function setLocalData(data: AppState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    // 忽略写入失败
  }
}

/* ---------- 时间戳工具 ---------- */

/** 将 lastupdated（number | ISO string | null）统一转为 number 时间戳 */
function getTimestamp(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const n = Number(ts);
    if (!isNaN(n)) return n;
    const d = Date.parse(ts);
    return isNaN(d) ? 0 : d;
  }
  return 0;
}

/* ---------- 服务器同步 ---------- */

/**
 * 将服务器返回的行映射为 AppState。
 * 服务器列 upgradeplan/lastupgrade 为小写，需映射回驼峰 upgradePlan/lastUpgrade；
 * 其余列（students/courses/.../organizationColors/gradeColors/lastupdated/userid）名称一致。
 */
function normalizeServerData(server: any): AppState {
  return {
    students: server.students || [],
    courses: server.courses || [],
    organizations: server.organizations || [],
    grades: server.grades || [],
    organizationColors: server.organizationColors || {},
    gradeColors: server.gradeColors || {},
    lastupdated: server.lastupdated ?? null,
    userid: server.userid,
    upgradePlan: server.upgradeplan ?? null,
    lastUpgrade: server.lastupgrade ?? null,
  };
}

/** 上传本地数据到服务器（带重试） */
async function uploadToServer(localData: AppState, userId: string): Promise<void> {
  const payload = {
    userid: userId,
    students: localData.students || [],
    courses: localData.courses || [],
    organizations: localData.organizations || [],
    grades: localData.grades || [],
    organizationColors: localData.organizationColors || {},
    gradeColors: localData.gradeColors || {},
    lastupdated: localData.lastupdated,
    // 服务器新增列（JSONB）；旧表需先执行 ALTER TABLE 添加列
    upgradeplan: localData.upgradePlan ?? null,
    lastupgrade: localData.lastUpgrade ?? null,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const { error } = await supabase
        .from(TABLES.COURSE_DATA)
        .upsert(payload, { onConflict: 'userid' });
      // supabase-js 不抛异常，错误以 { error } 返回，需手动检查否则重试与上层 catch 失效
      if (error) throw error;
      return;
    } catch (e) {
      lastError = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** 创建默认空数据（服务器无记录时） */
async function createDefaultData(userId: string): Promise<void> {
  const defaultData: AppState = {
    students: [],
    courses: [],
    organizations: [],
    grades: [],
    organizationColors: {},
    gradeColors: {},
    lastupdated: Date.now(),
    userid: userId,
    upgradePlan: null,
    lastUpgrade: null,
  };
  try {
    // 服务器列名与 AppState 不同：upgradeplan/lastupgrade 为小写，需显式映射，避免直接展开 defaultData 引入不存在的驼峰列
    const { error } = await supabase.from(TABLES.COURSE_DATA).upsert({
      userid: userId,
      students: defaultData.students,
      courses: defaultData.courses,
      organizations: defaultData.organizations,
      grades: defaultData.grades,
      organizationColors: defaultData.organizationColors,
      gradeColors: defaultData.gradeColors,
      lastupdated: defaultData.lastupdated,
      upgradeplan: defaultData.upgradePlan,
      lastupgrade: defaultData.lastUpgrade,
    }, { onConflict: 'userid' });
    if (error) throw error;
    setLocalData(defaultData);
    useStore.getState().replaceData(defaultData);
    useStore.getState().setSyncStatus('online');
  } catch (e) {
    console.error('创建初始数据失败:', e);
    useStore.getState().setSyncStatus('offline');
  }
}

/** 比较本地/服务器时间戳，决定同步方向 */
async function compareAndSync(
  localData: AppState | null,
  serverData: AppState | null,
  userId: string,
): Promise<void> {
  // 服务器返回行的列名为小写 upgradeplan/lastupgrade，先映射回驼峰 AppState
  const server = serverData ? normalizeServerData(serverData) : null;

  if (!server) {
    if (localData) {
      await uploadToServer(localData, userId);
      useStore.getState().replaceData(localData);
    } else {
      await createDefaultData(userId);
    }
    useStore.getState().setSyncStatus('online');
    return;
  }

  const localTs = getTimestamp(localData?.lastupdated);
  const serverTs = getTimestamp(server.lastupdated);

  if (localData) {
    if (serverTs > localTs) {
      // 服务器更新 → 覆盖本地
      setLocalData(server);
      useStore.getState().replaceData(server);
    } else if (localTs > serverTs) {
      // 本地更新 → 上传服务器
      await uploadToServer(localData, userId);
    }
  } else {
    // 无本地数据 → 用服务器数据
    setLocalData(server);
    useStore.getState().replaceData(server);
  }
  useStore.getState().setSyncStatus('online');
}

/* ---------- 加载数据（主流程） ---------- */

/**
 * 加载数据：本地 → Realtime → 服务器同步
 * 流程重写自课表 dataLoadService.loadData()
 */
export async function loadData(userId: string): Promise<void> {
  const localData = getLocalData();

  // 账号切换检测：本地数据属于其他用户 → 清除
  if (localData && localData.userid && localData.userid !== userId) {
    localStorage.removeItem(LOCAL_KEY);
    useStore.getState().replaceData({
      students: [],
      courses: [],
      organizations: [],
      grades: [],
      organizationColors: {},
      gradeColors: {},
      lastupdated: null,
      userid: userId,
      // 清空升级计划/执行记录，避免残留上一账号数据
      upgradePlan: null,
      lastUpgrade: null,
    });
  }

  // 设置 Realtime 通道
  setupRealtime(userId);

  // 先用本地数据更新 store（快速渲染）
  const currentLocal = getLocalData();
  if (currentLocal) {
    useStore.getState().replaceData(currentLocal);
  }

  // 从服务器加载并同步
  try {
    const { data: serverData, error } = await supabase
      .from(TABLES.COURSE_DATA)
      .select('*')
      .eq('userid', userId)
      .single();

    if (error) {
      // PGRST116 = 0 rows（服务器无数据）
      if (error.code === 'PGRST116') {
        await createDefaultData(userId);
      } else {
        console.error('从服务器加载数据失败:', error);
        useStore.getState().setSyncStatus('offline');
      }
    } else {
      await compareAndSync(getLocalData(), serverData as AppState, userId);
    }
  } catch (e) {
    console.error('从服务器加载数据失败:', e);
    useStore.getState().setSyncStatus('offline');
    // 降级使用本地缓存
    const fallback = getLocalData();
    if (fallback) useStore.getState().replaceData(fallback);
  }

  useStore.getState().setDataLoaded(true);
}

/* ---------- 保存数据（防抖） ---------- */

/** 立即保存到 localStorage + 服务器（无防抖，用于关键操作） */
export async function saveImmediate(): Promise<void> {
  const store = useStore.getState();
  const user = store.user;
  if (!user) return;

  const data = store.getData();
  // 数据归属校验
  data.userid = user.id;
  setLocalData(data);

  store.setSyncStatus('syncing');
  try {
    await uploadToServer(data, user.id);
    store.setSyncStatus('online');
  } catch {
    store.setSyncStatus('offline');
  }
}

/** 防抖保存（2000ms），store 数据变化时自动触发 */
export const saveData = debounce(async () => {
  await saveImmediate();
}, SAVE_DEBOUNCE);

/* ---------- 连接检测 ---------- */

/**
 * 主动检测 Supabase 连接状态
 * 用于同步指示器点击检测：设置 checking（橙色呼吸灯）→ 查询 → online/offline
 * @returns 是否连接正常
 */
export async function checkConnection(userId: string): Promise<boolean> {
  const store = useStore.getState();
  store.setSyncStatus('checking');
  try {
    const { error } = await supabase
      .from(TABLES.COURSE_DATA)
      .select('userid')
      .eq('userid', userId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    store.setSyncStatus('online');
    return true;
  } catch (e) {
    console.error('连接检测失败:', e);
    store.setSyncStatus('offline');
    return false;
  }
}

/* ---------- Realtime 订阅 ---------- */

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

/** 建立 Realtime 通道，监听 coursemanagerdata 表变化 */
export function setupRealtime(userId: string): void {
  // 清理旧通道
  cleanupRealtime();

  try {
    realtimeChannel = supabase.channel('course-manager-channel');
    realtimeChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.COURSE_DATA,
        filter: `userid=eq.${userId}`,
      },
      (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const serverData = normalizeServerData(payload.new);
          const localData = getLocalData();
          const serverTs = getTimestamp(serverData.lastupdated);
          const localTs = getTimestamp(localData?.lastupdated);

          // 仅当服务器更新时覆盖本地（避免回环）
          if (serverTs > localTs) {
            setLocalData(serverData);
            useStore.getState().replaceData(serverData);
          }
        }
      },
    );
    realtimeChannel.subscribe();
  } catch (e) {
    console.error('建立 Realtime 通道失败:', e);
  }
}

/** 清理 Realtime 通道 */
export function cleanupRealtime(): void {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch {
      // 忽略
    }
    realtimeChannel = null;
  }
}

/* ---------- 注入 store 变化监听 ---------- */

let unsubscribeStore: (() => void) | null = null;

/**
 * 初始化数据保存监听：订阅 store 持久化字段变化，触发防抖保存
 * 应在 App 挂载后调用一次
 */
export function initDataSave(): void {
  if (unsubscribeStore) return;

  let lastLastupdated: number | null = null;

  unsubscribeStore = useStore.subscribe((state) => {
    // 仅当持久化数据的 lastupdated 变化时触发保存
    if (state.lastupdated !== lastLastupdated) {
      lastLastupdated = state.lastupdated;
      if (state.user && state.dataLoaded) {
        saveData();
      }
    }
  });
}

/** 清理数据保存监听 */
export function cleanupDataSave(): void {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
}
