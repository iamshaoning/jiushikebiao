/**
 * 年级升级：计划创建/取消/到期检测/执行
 *
 * 设计要点（与需求确认）：
 * - 升级计划一次仅允许一个 pending；执行记录 lastUpgrade 只保留最新一条
 * - 执行时幂等校验：本次 newTermStart 已在 lastUpgrade 中存在则拒绝
 * - 升级只改学生年级 + 预设课时费，机构不变
 * - 旧课程（date < 新学期日期）标记 frozen 冻结，级联解除
 * - 新学期课程（date >= 新学期日期）：升级学生的 grades 快照更新，
 *   一对一费用按新预设课时费重算并保存（多人课手填不动）
 */
import { useStore } from '@/stores/useStore';
import { supabase, TABLES } from './supabase';
import { saveImmediate } from './data';
import type { AppState, Course, UpgradeGradeConfig, UpgradeOrgConfig, UpgradePlan, UpgradeRecord } from './types';

/** 本地日期 YYYY-MM-DD */
export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 计划是否到期（到达新学期开始日期） */
export function isUpgradeDue(plan: UpgradePlan, today: string): boolean {
  return plan.status === 'pending' && today >= plan.newTermStart;
}

/** 是否存在进行中的计划 */
export function hasActivePlan(state: AppState): boolean {
  return !!state.upgradePlan && state.upgradePlan.status === 'pending';
}

/** 保存升级计划（若已有 pending 计划则拒绝） */
export function saveUpgradePlan(plan: UpgradePlan): { ok: boolean; message?: string } {
  const cur = useStore.getState();
  if (hasActivePlan(cur)) {
    return { ok: false, message: '已存在进行中的升级计划，请先处理' };
  }
  cur.mutateData((draft) => {
    draft.upgradePlan = { ...plan, status: 'pending' };
  });
  return { ok: true };
}

/** 取消升级计划（二次确认由调用方处理） */
export function cancelUpgradePlan(): void {
  const cur = useStore.getState();
  if (!cur.upgradePlan) return;
  cur.mutateData((draft) => {
    if (draft.upgradePlan) draft.upgradePlan.status = 'cancelled';
  });
}

/**
 * 查询服务器最新升级执行记录（用于多端防重复）
 * 查询失败（如服务器表未加列）时返回 null，调用方降级为内存校验
 */
async function fetchServerLastUpgrade(userId: string): Promise<UpgradeRecord | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.COURSE_DATA)
      .select('lastupgrade')
      .eq('userid', userId)
      .maybeSingle();
    if (error || !data) return null;
    return ((data as { lastupgrade?: UpgradeRecord | null }).lastupgrade) ?? null;
  } catch {
    return null;
  }
}

/**
 * 执行升级
 * @returns 执行结果；失败时给出原因（幂等/计划状态/服务器已执行）
 */
export async function executeUpgrade(plan: UpgradePlan): Promise<{ ok: boolean; message: string }> {
  const cur = useStore.getState();

  // 幂等校验：该学期是否已执行过（只保留最新一条执行记录）
  if (cur.lastUpgrade?.newTermStart === plan.newTermStart) {
    return { ok: false, message: `该学期（${plan.newTermStart} 起）已执行过升级，请勿重复执行` };
  }
  // 计划状态校验：必须是当前进行中的计划
  if (!cur.upgradePlan || cur.upgradePlan.newTermStart !== plan.newTermStart || cur.upgradePlan.status !== 'pending') {
    return { ok: false, message: '升级计划不存在或已变更' };
  }

  // 服务器前置校验：其他设备可能已执行但本端尚未收到同步
  if (cur.user) {
    const serverRec = await fetchServerLastUpgrade(cur.user.id);
    if (serverRec?.newTermStart === plan.newTermStart) {
      return {
        ok: false,
        message: `该学期（${plan.newTermStart} 起）已在其他设备执行过升级，本端已自动更新，请刷新后查看`,
      };
    }
  }

  const students = cur.students;
  // 学生 Map 索引（构建升级集合 + 课程费用重算时按 id 查）
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const orgs = plan.orgs.filter((o) => o.studentIds.length > 0);

  // 构建升级集合：学生 id -> { 目标年级, 费用加成 }
  const upgradeInfo = new Map<string, { target: string; feeIncrease: number }>();
  orgs.forEach((o: UpgradeOrgConfig) => {
    o.studentIds.forEach((sid) => {
      if (upgradeInfo.has(sid)) return;
      const student = studentMap.get(sid);
      if (!student) return;
      const cfg: UpgradeGradeConfig | undefined = o.grades.find((g) => g.grade === student.grade);
      if (cfg && cfg.target) {
        upgradeInfo.set(sid, { target: cfg.target, feeIncrease: cfg.feeIncrease || 0 });
      }
    });
  });

  if (upgradeInfo.size === 0) {
    return { ok: false, message: '未选择任何需要升级的学生' };
  }

  const upgradedAt = Date.now();

  cur.mutateData((draft) => {
    // 1. 修改学生：年级 = 目标年级，预设课时费 += 加成
    draft.students = draft.students.map((s) => {
      const info = upgradeInfo.get(s.id);
      if (!info) return s;
      return {
        ...s,
        grade: info.target,
        fees: {
          ...s.fees,
          '一对一': (s.fees?.['一对一'] ?? 0) + info.feeIncrease,
        },
      };
    });

    // 2. 处理课程：
    //    - date < 新学期日期：标记 frozen 冻结
    //    - date >= 新学期日期：升级学生的 grades 快照更新 + 一对一费用按新预设课时费重算
    draft.courses = draft.courses.map((c: Course) => {
      if (c.frozen) return c;
      if (c.date < plan.newTermStart) {
        return { ...c, frozen: true };
      }
      let changed = false;
      const newGrades = [...(c.grades || [])];
      const newFees = [...c.fees];
      c.studentIds.forEach((sid, idx) => {
        const info = upgradeInfo.get(sid);
        if (!info) return;
        if (newGrades[idx] !== undefined && newGrades[idx] !== info.target) {
          newGrades[idx] = info.target;
          changed = true;
        }
        // 一对一：按新预设课时费重算本课程费用（多人课手填不动）
        if (c.lessonType === '一对一' && newFees[idx] !== undefined) {
          const s = studentMap.get(sid);
          if (s) {
            const baseFee = (s.fees?.['一对一'] ?? 0) + info.feeIncrease;
            const baseDuration = s.fees?.['一对一_duration'] ?? 120;
            const recalculated = Math.round((baseFee / Math.max(1, baseDuration)) * c.duration * 100) / 100;
            if (Math.abs(recalculated - newFees[idx]) > 0.001) {
              newFees[idx] = recalculated;
              changed = true;
            }
          }
        }
      });
      return changed ? { ...c, grades: newGrades, fees: newFees } : c;
    });

    // 3. 更新计划状态 + 写入执行记录（只保留最新一条）
    if (draft.upgradePlan) draft.upgradePlan.status = 'executed';
    draft.lastUpgrade = {
      newTermStart: plan.newTermStart,
      executedAt: upgradedAt,
      studentCount: upgradeInfo.size,
    };
  });

  // 立即上传，缩短其他设备的重复执行竞态窗口
  void saveImmediate();

  return { ok: true, message: `升级完成，共升级 ${upgradeInfo.size} 名学生` };
}
