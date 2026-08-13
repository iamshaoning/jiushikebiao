/**
 * 年级升级模态框
 *
 * 三种模式：
 * - create  创建升级计划（新学期日期 + 机构/年级/目标/费用加成/学生勾选）
 * - remind  到期提醒（取消升级 / 稍后处理 / 开始升级）
 * - confirm 执行确认（复用配置页 + 最新学生状态 + 上次升级记录醒目提示）
 */
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import Modal from '@/components/Modal';
import DatePicker from '@/components/DatePicker';
import CustomSelect from '@/components/CustomSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import {
  saveUpgradePlan,
  cancelUpgradePlan,
  executeUpgrade,
  todayStr,
} from '@/lib/upgrade';
import type { UpgradePlan, UpgradeOrgConfig } from '@/lib/types';
import { ArrowRight, Info, AlertTriangle } from 'lucide-react';

export type UpgradeModalMode = 'create' | 'remind' | 'confirm';

interface UpgradeModalProps {
  open: boolean;
  mode: UpgradeModalMode;
  onClose: () => void;
  /** remind -> confirm 切换 */
  onStartUpgrade?: () => void;
  /** confirm -> remind 返回（仅从提醒弹窗进入时提供；学生页直接进入则不传，返回即关闭） */
  onBackToRemind?: () => void;
}

interface DraftGrade {
  grade: string;
  target: string;
  feeIncrease: number;
}
interface DraftOrg {
  organization: string;
  grades: DraftGrade[];
  studentIds: string[];
}
interface DraftPlan {
  newTermStart: string;
  orgs: DraftOrg[];
}

const DEFAULT_FEE_INCREASE = 20;

/** 依据来源计划（无则新建）构建草稿：机构 -> 年级 -> 目标/加成/学生 */
function buildDraft(
  students: { id: string; name: string; organization: string; grade: string }[],
  organizations: string[],
  source?: UpgradePlan | null,
): DraftPlan {
  const orgs: DraftOrg[] = organizations.map((org) => {
    const orgStudents = students.filter((s) => s.organization === org);
    const gradeMap = new Map<string, typeof orgStudents>();
    orgStudents.forEach((s) => {
      const list = gradeMap.get(s.grade) || [];
      list.push(s);
      gradeMap.set(s.grade, list);
    });
    const sourceOrg = source?.orgs.find((o: UpgradeOrgConfig) => o.organization === org);
    const sourceStudentIds = new Set(sourceOrg?.studentIds || []);
    const grades: DraftGrade[] = [...gradeMap.keys()].map((grade) => {
      const srcGrade = sourceOrg?.grades.find((g) => g.grade === grade);
      return {
        grade,
        target: srcGrade?.target ?? '',
        feeIncrease: srcGrade?.feeIncrease ?? DEFAULT_FEE_INCREASE,
      };
    });
    // 学生勾选：来源于计划（仅保留仍存在的学生）；新建计划为空（选目标后默认全选）
    const studentIds = source
      ? orgStudents.map((s) => s.id).filter((id) => sourceStudentIds.has(id))
      : [];
    return { organization: org, grades, studentIds };
  });
  return {
    newTermStart: source?.newTermStart ?? '',
    orgs,
  };
}

export default function UpgradeModal({
  open,
  mode,
  onClose,
  onStartUpgrade,
  onBackToRemind,
}: UpgradeModalProps) {
  const students = useStore((s) => s.students);
  const organizations = useStore((s) => s.organizations);
  const grades = useStore((s) => s.grades);
  const upgradePlan = useStore((s) => s.upgradePlan);
  const lastUpgrade = useStore((s) => s.lastUpgrade);
  const toast = useToast();

  const [draft, setDraft] = useState<DraftPlan>({ newTermStart: '', orgs: [] });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    type: 'confirm' | 'warning' | 'delete';
    message: ReactNode;
    onConfirm: () => void;
  }>({ open: false, type: 'confirm', message: '', onConfirm: () => {} });

  // 初始化草稿
  useEffect(() => {
    if (!open) return;
    if (mode === 'confirm') {
      setDraft(buildDraft(students, organizations, upgradePlan));
    } else if (mode === 'create') {
      setDraft(buildDraft(students, organizations, null));
    }
  }, [open, mode, students, organizations, upgradePlan]);

  // 机构学生索引（用于渲染各年级学生）
  const studentsByOrg = useMemo(() => {
    const map = new Map<string, { id: string; name: string; grade: string }[]>();
    organizations.forEach((org) => {
      map.set(org, students.filter((s) => s.organization === org));
    });
    return map;
  }, [students, organizations]);

  // 目标年级选项（排除当前年级自身）
  const targetOptions = (currentGrade: string) =>
    [{ value: '', label: '不升级' }, ...grades.filter((g) => g !== currentGrade).map((g) => ({ value: g, label: g }))];

  const setOrgGrade = (orgIdx: number, gIdx: number, patch: Partial<DraftGrade>) => {
    setDraft((d) => {
      const orgs = d.orgs.map((o, i) =>
        i === orgIdx ? { ...o, grades: o.grades.map((g, j) => (j === gIdx ? { ...g, ...patch } : g)) } : o,
      );
      return { ...d, orgs };
    });
  };

  const toggleStudent = (orgIdx: number, sid: string) => {
    setDraft((d) => {
      const orgs = d.orgs.map((o, i) => {
        if (i !== orgIdx) return o;
        const has = o.studentIds.includes(sid);
        return { ...o, studentIds: has ? o.studentIds.filter((x) => x !== sid) : [...o.studentIds, sid] };
      });
      return { ...d, orgs };
    });
  };

  // 选择目标年级后该年级学生默认全选
  const handleTargetChange = (orgIdx: number, gIdx: number, target: string, grade: string) => {
    const orgStudents = studentsByOrg.get(draft.orgs[orgIdx].organization) || [];
    const gradeStudents = orgStudents.filter((s) => s.grade === grade);
    setDraft((d) => {
      const orgs = d.orgs.map((o, i) => {
        if (i !== orgIdx) return o;
        const gradesArr = o.grades.map((g, j) => (j === gIdx ? { ...g, target } : g));
        const studentIds = new Set(o.studentIds);
        if (target) {
          gradeStudents.forEach((s) => studentIds.add(s.id));
        }
        return { ...o, grades: gradesArr, studentIds: [...studentIds] };
      });
      return { ...d, orgs };
    });
  };

  const draftToPlan = (): UpgradePlan => ({
    newTermStart: draft.newTermStart,
    createdAt: upgradePlan?.createdAt ?? Date.now(),
    status: 'pending',
    orgs: draft.orgs
      .filter((o) => o.grades.some((g) => g.target))
      .map((o) => ({ organization: o.organization, grades: o.grades, studentIds: o.studentIds })),
  });

  const hasConfig = draft.orgs.some(
    (o) => o.grades.some((g) => g.target) && o.studentIds.length > 0,
  );

  /* ---------- 操作 ---------- */

  const handleCreate = () => {
    if (!draft.newTermStart) {
      toast.warning('请选择新学期开始日期');
      return;
    }
    if (!hasConfig) {
      toast.warning('请至少配置一个年级的升级目标并勾选学生');
      return;
    }
    const res = saveUpgradePlan(draftToPlan());
    if (!res.ok) {
      toast.warning(res.message || '创建失败');
      return;
    }
    toast.success(`已创建升级计划（${draft.newTermStart} 起）`);
    onClose();
  };

  const handleCancelPlan = () => {
    cancelUpgradePlan();
    toast.success('升级计划已取消');
    onClose();
  };

  const handleExecute = async () => {
    const res = await executeUpgrade(draftToPlan());
    if (!res.ok) {
      toast.warning(res.message);
      return;
    }
    toast.success(res.message);
    onClose();
  };

  /* ---------- 上次升级记录提示条 ---------- */
  const lastUpgradeBanner = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <Info className="w-4 h-4 shrink-0" />
      <span>
        {lastUpgrade
          ? `上次升级记录：${lastUpgrade.newTermStart} 起执行，共升级 ${lastUpgrade.studentCount} 名学生`
          : '尚未执行过年级升级，本次为首次升级'}
      </span>
    </div>
  );

  /* ---------- 配置渲染（create / confirm 共用） ---------- */
  const renderConfig = () => (
    <div className="space-y-4">
      {lastUpgradeBanner}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">新学期开始日期</label>
        <DatePicker
          value={draft.newTermStart}
          onChange={(v) => setDraft((d) => ({ ...d, newTermStart: v }))}
          className="w-full"
        />
      </div>

      {draft.orgs.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">暂无机构，请先添加学生</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {draft.orgs.map((org, oi) => {
            const orgStudents = studentsByOrg.get(org.organization) || [];
            return (
              <div key={org.organization} className="border rounded-lg p-3 border-ink-200 bg-[var(--bg-content)]">
                <div className="font-medium text-sm text-ink-700 mb-2">{org.organization}</div>
                {org.grades.length === 0 && (
                  <div className="text-xs text-gray-400">该机构暂无学生</div>
                )}
                {org.grades.map((g, gi) => {
                  const gradeStudents = orgStudents.filter((s) => s.grade === g.grade);
                  return (
                    <div key={g.grade} className="mb-2 last:mb-0">
                      {/* 费用行：置于箭头行上方，与箭头行同结构，居中于箭头中间位置 */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="invisible text-sm font-medium shrink-0">{g.grade}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5">
                          <span className="text-xs text-gray-500 shrink-0">预设课时费+</span>
                          <input
                            type="number"
                            value={g.feeIncrease}
                            disabled={!g.target}
                            onChange={(e) =>
                              setOrgGrade(oi, gi, { feeIncrease: parseFloat(e.target.value) || 0 })
                            }
                            className={`input-field w-20 py-1 shrink-0 ${
                              !g.target ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          />
                          <span className="text-xs text-gray-400 shrink-0">元</span>
                        </div>
                        <div className="w-28 shrink-0" />
                      </div>
                      {/* 年级 → 目标：横线+箭头占满中间，目标下拉固定宽 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium shrink-0">{g.grade}</span>
                        <div className="flex-1 min-w-0 flex items-center">
                          <div className="flex-1 h-px bg-ink-300" />
                          <ArrowRight className="w-4 h-4 text-ink-300 shrink-0 ml-1" />
                        </div>
                        <CustomSelect
                          value={g.target}
                          options={targetOptions(g.grade)}
                          onChange={(v) => handleTargetChange(oi, gi, String(v), g.grade)}
                          className="w-28 shrink-0"
                          triggerClassName="py-1 text-xs"
                          placeholder="不升级"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-5">
                        {gradeStudents.length === 0 && (
                          <span className="text-xs text-gray-400">无学生</span>
                        )}
                        {gradeStudents.map((s) => {
                          const checked = org.studentIds.includes(s.id);
                          const disabled = !g.target;
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                disabled
                                  ? 'border-ink-100 text-gray-400 cursor-not-allowed'
                                  : checked
                                  ? 'border-ink-400 bg-ink-50 text-ink-700 cursor-pointer'
                                  : 'border-ink-200 text-gray-500 hover:border-ink-300 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleStudent(oi, s.id)}
                              />
                              {s.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ---------- 提醒模式 ---------- */
  if (mode === 'remind') {
    const plan = upgradePlan;
    return (
      <>
        <Modal
          open={open}
          onClose={onClose}
          title={
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              新学期升级提醒
            </span>
          }
          width="max-w-md"
          footer={
            <>
              <button
                onClick={() =>
                  setConfirm({
                    open: true,
                    type: 'delete',
                    message: (
                      <>
                        确定取消本次升级计划吗？
                        <br />
                        取消后计划作废，不再提醒。
                      </>
                    ),
                    onConfirm: handleCancelPlan,
                  })
                }
                className="btn-primary"
              >
                取消升级
              </button>
              <button onClick={onClose} className="btn-secondary">
                稍后处理
              </button>
              <button onClick={() => onStartUpgrade?.()} className="btn-primary">
                开始升级
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              升级计划已到期（新学期 <span className="font-medium text-ink-700">{plan?.newTermStart}</span>{' '}
              已开始）。
              <br />
              确认开始年级升级后，学生年级与预设课时费将按计划批量调整。
            </p>
            {lastUpgradeBanner}
          </div>
        </Modal>
        <ConfirmDialog
          open={confirm.open}
          type={confirm.type}
          message={confirm.message}
          confirmText="确认"
          onConfirm={() => {
            setConfirm((c) => ({ ...c, open: false }));
            confirm.onConfirm();
          }}
          onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        />
      </>
    );
  }

  /* ---------- 创建 / 确认模式 ---------- */
  const isConfirm = mode === 'confirm';
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isConfirm ? '确认执行年级升级' : '创建年级升级计划'}
        width="max-w-xl"
        footer={
          <>
            {!isConfirm && (
              <button onClick={onClose} className="btn-secondary">取消</button>
            )}
            {isConfirm && (
              <button
                onClick={() => (onBackToRemind ? onBackToRemind() : onClose())}
                className="btn-secondary"
              >
                返回
              </button>
            )}
            <button
              onClick={() =>
                isConfirm
                  ? setConfirm({
                      open: true,
                      type: 'delete',
                      message: (
                        <>
                          确认对所选学生执行升级（新学期 {draft.newTermStart} 起）？
                          <br />
                          升级后历史课程将冻结，请仔细核对学生后确认。
                        </>
                      ),
                      onConfirm: handleExecute,
                    })
                  : handleCreate()
              }
              className={isConfirm ? 'btn-danger' : 'btn-primary'}
            >
              {isConfirm ? '升级' : '创建计划'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {isConfirm && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              请核对下方学生清单（计划创建后新添加的学生默认未选中），确认无误后执行。
            </div>
          )}
          {renderConfig()}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        type={confirm.type}
        message={confirm.message}
        confirmText="确认"
        onConfirm={() => {
          setConfirm((c) => ({ ...c, open: false }));
          confirm.onConfirm();
        }}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </>
  );
}
