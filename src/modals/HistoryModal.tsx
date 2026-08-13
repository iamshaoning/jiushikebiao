/**
 * 历史记录模态框
 *
 * 列出操作历史（时间倒序），支持撤销/重做/清空
 */
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  getHistory,
  clearHistory,
  undoAction,
  redoAction,
} from '@/lib/history';
import type { HistoryRecord } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  UserX,
  RotateCcw,
  Clock,
  History as HistoryIcon,
  CornerDownLeft,
  ChevronDown,
} from 'lucide-react';
import type { Course, Student } from '@/lib/types';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_META: Record<
  string,
  { icon: typeof Plus; color: string }
> = {
  'add-course': { icon: Plus, color: 'text-green-600' },
  'paste-courses': { icon: Plus, color: 'text-green-600' },
  'batch-add-courses': { icon: Plus, color: 'text-green-600' },
  'batch-paste-courses': { icon: Plus, color: 'text-green-600' },
  'update-course': { icon: Pencil, color: 'text-blue-600' },
  'delete-course': { icon: Trash2, color: 'text-red-500' },
  'delete-day-courses': { icon: Trash2, color: 'text-red-500' },
  'batch-delete-courses': { icon: Trash2, color: 'text-red-500' },
  'batch-delete-day-courses': { icon: Trash2, color: 'text-red-500' },
  'delete-student': { icon: UserX, color: 'text-red-500' },
  'batch-delete-students': { icon: UserX, color: 'text-red-500' },
  'restore-snapshot': { icon: RotateCcw, color: 'text-amber-600' },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 渲染变更摘要 */
function renderSummary(record: HistoryRecord): string {
  const changes = record.meta?.changes as { field: string; old?: string; new?: string }[] | undefined;
  if (changes && changes.length > 0) {
    return changes.map((c) => c.field).join('、');
  }
  return '';
}

/** 从 before/after 提取课程数组 */
function extractCourses(record: HistoryRecord, field: 'before' | 'after'): Course[] {
  const val = record[field];
  if (!val) return [];
  if (Array.isArray(val)) return val as Course[];
  return [val as Course];
}

/** 从 before 提取学生数组 */
function extractStudents(record: HistoryRecord): Student[] {
  const val = record.before;
  if (!val) return [];
  if (Array.isArray(val)) return val as Student[];
  return [val as Student];
}

/** 计算结束时间 */
function calcEndTime(start: string, duration: number): string {
  const [h, m] = start.split(':').map((n) => parseInt(n, 10));
  if (isNaN(h) || isNaN(m)) return start;
  const total = h * 60 + m + duration;
  const eh = Math.floor((total % (24 * 60)) / 60);
  const em = (total % (24 * 60)) % 60;
  return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
}

/** 渲染单节课摘要行 */
function renderCourseLine(c: Course, showFee = true): ReactNode {
  const endTime = calcEndTime(c.startTime, c.duration);
  const students = c.studentNames?.join('、') || '未设置';
  return (
    <div key={c.id} className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
      <span className="text-gray-600 font-medium">{c.date}</span>
      <span className="text-gray-400">·</span>
      <span>{c.startTime}-{endTime} ({c.duration}分钟)</span>
      <span className="text-gray-400">·</span>
      <span>{c.lessonType}</span>
      <span className="text-gray-400">·</span>
      <span>{students}</span>
      {showFee && (
        <>
          <span className="text-gray-400">·</span>
          <span>¥{c.fees?.[0] || 0}</span>
        </>
      )}
    </div>
  );
}

/** 渲染单节课字段（带变更高亮） */
function renderCourseField(label: string, value: ReactNode, changed: boolean): ReactNode {
  return (
    <span className={changed ? 'bg-amber-100 text-amber-700 px-1 rounded font-medium' : 'text-gray-600'}>
      {label}: {value}
    </span>
  );
}

/** 渲染课程变更对比（旧 → 新，变更字段突出） */
function renderCourseDiff(oldC: Course, newC: Course): ReactNode {
  const changed = {
    date: oldC.date !== newC.date,
    time: oldC.startTime !== newC.startTime,
    duration: oldC.duration !== newC.duration,
    lessonType: oldC.lessonType !== newC.lessonType,
    fee: (oldC.fees?.[0] ?? 0) !== (newC.fees?.[0] ?? 0),
    students:
      JSON.stringify([...(oldC.studentIds || [])].sort()) !==
      JSON.stringify([...(newC.studentIds || [])].sort()),
  };
  const sep = (show: boolean) => (show ? <span className="text-gray-400 mx-1">·</span> : null);
  const renderRow = (c: Course, label: string, labelCls: string) => (
    <div className="text-xs flex items-center gap-1 flex-wrap">
      <span className={labelCls}>{label}</span>
      {renderCourseField('日期', c.date, changed.date)}
      {sep(true)}
      {renderCourseField('时间', `${c.startTime}-${calcEndTime(c.startTime, c.duration)}`, changed.time)}
      {sep(true)}
      {renderCourseField('时长', `${c.duration}分钟`, changed.duration)}
      {sep(true)}
      {renderCourseField('课型', c.lessonType, changed.lessonType)}
      {sep(true)}
      {renderCourseField('学生', c.studentNames?.join('、') || '未设置', changed.students)}
      {sep(true)}
      {renderCourseField('费用', `¥${c.fees?.[0] || 0}`, changed.fee)}
    </div>
  );
  return (
    <div className="space-y-1">
      {renderRow(oldC, '旧', 'text-gray-400')}
      <div className="text-center text-amber-500 text-xs">↓</div>
      {renderRow(newC, '新', 'text-gray-400')}
    </div>
  );
}

/** 渲染操作详情（展开时显示） */
function renderDetail(record: HistoryRecord): ReactNode {
  switch (record.type) {
    case 'add-course': {
      const courses = extractCourses(record, 'after');
      return <div className="space-y-1">{courses.map((c) => renderCourseLine(c))}</div>;
    }
    case 'paste-courses':
    case 'batch-add-courses':
    case 'batch-paste-courses': {
      const courses = extractCourses(record, 'after');
      return <div className="space-y-1">{courses.map((c) => renderCourseLine(c))}</div>;
    }
    case 'update-course': {
      const oldCourse = record.before as Course;
      const newCourse = record.after as Course;
      if (!oldCourse || !newCourse) return null;
      return renderCourseDiff(oldCourse, newCourse);
    }
    case 'delete-course': {
      const courses = extractCourses(record, 'before');
      return <div className="space-y-1">{courses.map((c) => renderCourseLine(c))}</div>;
    }
    case 'delete-day-courses':
    case 'batch-delete-courses':
    case 'batch-delete-day-courses': {
      const courses = extractCourses(record, 'before');
      return <div className="space-y-1">{courses.map((c) => renderCourseLine(c, false))}</div>;
    }
    case 'delete-student': {
      const students = extractStudents(record);
      const deletedCourses = (record.meta?.deletedCourses as Course[]) || [];
      const courseCount = (record.meta?.courseCount as number) || 0;
      return (
        <div className="space-y-1">
          {students.map((s) => (
            <div key={s.id} className="text-xs text-gray-500">
              <span className="text-gray-400">机构:</span> {s.organization || '未设置'}
              <span className="mx-2 text-gray-400">·</span>
              <span className="text-gray-400">年级:</span> {s.grade || '未设置'}
            </div>
          ))}
          {deletedCourses.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-ink-100/60">
              <div className="text-xs text-red-400 mb-1">关联删除课程 {courseCount} 节:</div>
              <div className="space-y-1">
                {deletedCourses.map((c) => renderCourseLine(c, false))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case 'batch-delete-students': {
      const students = extractStudents(record);
      const deletedCourses = (record.meta?.deletedCourses as Course[]) || [];
      const courseCount = (record.meta?.courseCount as number) || 0;
      return (
        <div className="space-y-1">
          {students.map((s) => (
            <div key={s.id} className="text-xs text-gray-500">
              <span className="text-gray-600 font-medium">{s.name}</span>
              <span className="mx-1 text-gray-400">·</span>
              {s.organization || '未设置'}
              <span className="mx-1 text-gray-400">·</span>
              {s.grade || '未设置'}
            </div>
          ))}
          {deletedCourses.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-ink-100/60">
              <div className="text-xs text-red-400 mb-1">关联删除课程 {courseCount} 节:</div>
              <div className="space-y-1">
                {deletedCourses.map((c) => renderCourseLine(c, false))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case 'restore-snapshot': {
      const snapshotType = record.meta?.snapshotType as string;
      const snapshotDate = record.meta?.snapshotDate as string;
      return (
        <div className="text-xs text-gray-500 space-y-0.5">
          {snapshotType && <div><span className="text-gray-400">快照类型:</span> {snapshotType}</div>}
          {snapshotDate && <div><span className="text-gray-400">快照时间:</span> {snapshotDate}</div>}
        </div>
      );
    }
    default:
      return null;
  }
}

export default function HistoryModal({ open, onClose }: HistoryModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (user) setRecords(getHistory(user.id));
  }, [user]);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmClear(false);
      setExpandedId(null);
    }
  }, [open, refresh]);

  const handleUndo = (id: string) => {
    const ok = undoAction(id);
    if (ok) {
      toast.success('已撤销');
      refresh();
    } else {
      toast.error('撤销失败');
    }
  };

  const handleRedo = (id: string) => {
    const ok = redoAction(id);
    if (ok) {
      toast.success('已重做');
      refresh();
    } else {
      toast.error('重做失败');
    }
  };

  const handleClear = () => {
    clearHistory(user?.id);
    setConfirmClear(false);
    toast.success('历史记录已清空');
    refresh();
  };

  const footer = (
    <>
      {records.length > 0 && (
        <button
          onClick={() => setConfirmClear(true)}
          className="btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          清空全部
        </button>
      )}
      <button onClick={onClose} className="btn-secondary">
        关闭
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="操作历史" footer={footer} width="max-w-lg">
      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>暂无操作历史</p>
          <p className="text-xs mt-1">添加/修改/删除课程等操作将记录在此</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => {
            const meta = TYPE_META[record.type] || { icon: HistoryIcon, color: 'text-gray-400' };
            const Icon = meta.icon;
            const undone = !!record.meta?.undone;
            const summary = renderSummary(record);
            const expanded = expandedId === record.id;
            const detail = renderDetail(record);
            const hasDetail = !!detail;
            return (
              <div
                key={record.id}
                className={`rounded-lg border bg-[var(--bg-secondary)] transition-shadow ${
                  undone
                    ? 'border-ink-200 opacity-60'
                    : 'border-ink-100 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {record.description}
                      {undone && <span className="ml-2 text-xs text-gray-400">已撤销</span>}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(record.timestamp)}
                      {summary && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="truncate">{summary}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {hasDetail && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : record.id)}
                      className="p-1.5 rounded hover:bg-ink-50 text-gray-400 transition-all"
                      title={expanded ? '收起详情' : '展开详情'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {undone ? (
                    <button
                      onClick={() => handleRedo(record.id)}
                      className="p-1.5 rounded hover:bg-ink-50 text-blue-600 transition-colors"
                      title="重做"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUndo(record.id)}
                      className="p-1.5 rounded hover:bg-ink-50 text-amber-600 transition-colors"
                      title="撤销"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {expanded && hasDetail && (
                  <div className="px-3 pb-3 pt-1 border-t border-ink-100/60">
                    {detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 清空确认 */}
      <ConfirmDialog
        open={confirmClear}
        type="delete"
        confirmText="清空"
        message="确认清空全部历史记录？此操作不可撤销。"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </Modal>
  );
}
