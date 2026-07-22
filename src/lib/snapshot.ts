/**
 * 快照服务
 *
 * 重写自课表 snapshotUtils.js
 * localStorage key `coursemanagerSnapshots`，按 userId 隔离
 * 配额：auto 最多2、manual 最多3
 * 恢复时记录历史 + 同步服务器
 */
import { useStore } from '@/stores/useStore';
import type { AppState, Snapshot, SnapshotType } from './types';
import { generateId } from './utils';
import { recordRestoreSnapshot } from './history';
import { saveImmediate } from './data';

const STORAGE_KEY = 'coursemanagerSnapshots';
const AUTO_SNAPSHOT_INTERVAL = 15 * 60 * 1000; // 15分钟

/* ---------- 配额 ---------- */
const QUOTA: Record<SnapshotType, number> = {
  auto: 2,
  manual: 3,
};

/* ---------- 存储读写 ---------- */

function getAllSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Snapshot[];
  } catch {
    return [];
  }
}

function saveAllSnapshots(all: Snapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('保存快照失败:', e);
  }
}

function getCurrentUserId(): string | null {
  return useStore.getState().user?.id || null;
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- 快照操作 ---------- */

/** 创建快照 */
export function createSnapshot(type: SnapshotType, label?: string): Snapshot | null {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const data = useStore.getState().getData();
  if (!data) return null;

  // 校验数据归属
  if (data.userid && data.userid !== userId) return null;

  const snapshot: Snapshot = {
    id: generateId(),
    type,
    data: clone(data),
    createdAt: Date.now(),
    userid: userId,
    label,
  };

  let all = getAllSnapshots();
  // 按类型分组，应用配额
  const mySnapshots = all.filter((s) => s.userid === userId);
  const otherSnapshots = all.filter((s) => s.userid !== userId);
  const sameType = mySnapshots.filter((s) => s.type === type);
  sameType.unshift(snapshot);
  const trimmed = sameType.slice(0, QUOTA[type]);
  const otherTypes = mySnapshots.filter((s) => s.type !== type);
  all = [...otherSnapshots, ...otherTypes, ...trimmed];
  saveAllSnapshots(all);

  return snapshot;
}

/** 列出当前用户快照（按时间倒序） */
export function listSnapshots(userId?: string): Snapshot[] {
  const uid = userId || getCurrentUserId();
  if (!uid) return [];
  return getAllSnapshots()
    .filter((s) => s.userid === uid)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 恢复快照 */
export async function restoreSnapshot(id: string): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const all = getAllSnapshots();
  const snapshot = all.find((s) => s.id === id && s.userid === userId);
  if (!snapshot) return false;

  // 保存恢复前的当前数据
  const previousData = clone(useStore.getState().getData());
  // 快照数据（深拷贝，更新 lastupdated）
  const snapshotData = clone(snapshot.data);
  snapshotData.lastupdated = Date.now();

  // 记录到历史
  const snapshotDate = new Date(snapshot.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const typeLabels: Record<SnapshotType, string> = {
    auto: '自动',
    manual: '手动',
  };
  recordRestoreSnapshot(previousData, snapshotData, {
    snapshotType: typeLabels[snapshot.type],
    snapshotDate,
  });

  // 替换数据
  useStore.getState().replaceData({
    students: snapshotData.students || [],
    courses: snapshotData.courses || [],
    organizations: snapshotData.organizations || [],
    grades: snapshotData.grades || [],
    organizationColors: snapshotData.organizationColors || {},
    gradeColors: snapshotData.gradeColors || {},
    lastupdated: snapshotData.lastupdated,
  });

  // 立即同步服务器
  try {
    await saveImmediate();
  } catch (e) {
    console.error('快照恢复后同步失败:', e);
  }

  return true;
}

/** 删除快照 */
export function deleteSnapshot(id: string): boolean {
  const userId = getCurrentUserId();
  if (!userId) return false;
  const all = getAllSnapshots();
  const idx = all.findIndex((s) => s.id === id && s.userid === userId);
  if (idx === -1) return false;
  all.splice(idx, 1);
  saveAllSnapshots(all);
  return true;
}

/* ---------- 自动快照定时器 ---------- */

let autoTimer: ReturnType<typeof setInterval> | null = null;

/** 启动自动快照定时器（15分钟），返回清理函数 */
export function startAutoSnapshotTimer(): () => void {
  stopAutoSnapshotTimer();
  autoTimer = setInterval(() => {
    createSnapshot('auto');
  }, AUTO_SNAPSHOT_INTERVAL);
  return stopAutoSnapshotTimer;
}

/** 停止自动快照定时器 */
export function stopAutoSnapshotTimer(): void {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}
