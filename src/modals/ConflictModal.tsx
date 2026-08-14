/**
 * 冲突处理模态框
 *
 * 重写自课表 conflictModal
 * 显示冲突课程，提供跳过/覆盖选项，支持逐节或统一处理
 */
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import type { PasteConflict } from '@/lib/course';
import { calculateEndTimeFromDuration } from '@/lib/utils';

interface ConflictModalProps {
  open: boolean;
  onClose: () => void;
  conflicts: PasteConflict[];
  onResolve: (skipped: PasteConflict[], overridden: PasteConflict[]) => void;
}

export default function ConflictModal({
  open,
  onClose,
  conflicts,
  onResolve,
}: ConflictModalProps) {
  // 每个冲突的处理决定：'pending' | 'skip' | 'override'
  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'skip' | 'override'>>(
    {},
  );

  // 重置决定
  const resetDecisions = () => setDecisions({});

  // 弹窗打开时重置历史决定，避免残留上次选择导致误操作
  useEffect(() => {
    if (open) setDecisions({});
  }, [open]);

  // 全部跳过
  const skipAll = () => {
    const next: Record<number, 'skip'> = {};
    conflicts.forEach((_, i) => (next[i] = 'skip'));
    setDecisions(next);
  };

  // 全部覆盖（含冻结课程的冲突不可覆盖，自动改为跳过）
  const overrideAll = () => {
    const next: Record<number, 'skip' | 'override'> = {};
    conflicts.forEach((c, i) => {
      next[i] = c.conflictingCourses.some((x) => x.frozen) ? 'skip' : 'override';
    });
    setDecisions(next);
  };

  // 确认
  const handleConfirm = () => {
    const skipped: PasteConflict[] = [];
    const overridden: PasteConflict[] = [];
    conflicts.forEach((c, i) => {
      if (decisions[i] === 'override') overridden.push(c);
      else skipped.push(c);
    });
    onResolve(skipped, overridden);
    resetDecisions();
  };

  const allDecided = conflicts.every((_, i) => decisions[i] && decisions[i] !== 'pending');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="时间冲突"
      width="max-w-lg"
      nested
      footer={
        <>
          <button onClick={skipAll} className="btn-secondary">
            全部跳过
          </button>
          <button onClick={overrideAll} className="btn-secondary">
            全部覆盖
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allDecided}
            className="btn-primary"
          >
            执行
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          检测到 {conflicts.length} 节课程存在时间冲突，请选择处理方式：
        </p>

        {conflicts.map((conflict, i) => {
          const newCourse = conflict.newCourse;
          // 冲突中包含冻结课程时不可覆盖（冻结课程只可删除）
          const hasFrozen = conflict.conflictingCourses.some((c) => c.frozen);
          return (
            <div
              key={i}
              className="border rounded-lg p-3 space-y-2 border-ink-200 bg-[var(--bg-content)]"
            >
              {/* 新课程 */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-700">
                    {newCourse.studentNames.join('、') || '未命名'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {newCourse.startTime} - {calculateEndTimeFromDuration(newCourse.startTime, newCourse.duration)}
                    {' · '}
                    {newCourse.lessonType}
                  </div>
                </div>
              </div>

              {/* 冲突的已有课程 */}
              <div className="text-xs text-gray-400">与以下课程冲突：</div>
              {conflict.conflictingCourses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center text-xs text-red-600"
                >
                  <span className="flex-1">
                    {c.frozen && (
                      <span className="inline-flex items-center px-1 py-0.5 mr-1 rounded text-[10px] text-[#38bdf8] bg-[#e0f2fe] align-middle">
                        冻结
                      </span>
                    )}
                    {c.studentNames.join('、')}
                    {' · '}
                    {c.startTime} - {calculateEndTimeFromDuration(c.startTime, c.duration)}
                  </span>
                </div>
              ))}
              {hasFrozen && (
                <div className="text-xs text-[#38bdf8]">
                  冲突包含冻结课程，不可覆盖，只能跳过
                </div>
              )}

              {/* 处理选择 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDecisions((prev) => ({ ...prev, [i]: 'skip' }))}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition border ${
                    decisions[i] === 'skip'
                      ? 'bg-gray-200 text-ink-700 border-ink-300'
                      : 'text-gray-500 hover:bg-ink-50 border-ink-200'
                  }`}
                >
                  跳过
                </button>
                <button
                  onClick={() => setDecisions((prev) => ({ ...prev, [i]: 'override' }))}
                  disabled={hasFrozen}
                  title={hasFrozen ? '冲突包含冻结课程，不可覆盖' : undefined}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition border ${
                    hasFrozen
                      ? 'text-gray-300 border-ink-100 cursor-not-allowed'
                      : decisions[i] === 'override'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'text-gray-500 hover:bg-ink-50 border-ink-200'
                  }`}
                >
                  覆盖
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
