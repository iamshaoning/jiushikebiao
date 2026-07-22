/**
 * 历史记录模态框
 *
 * 列出操作历史（时间倒序），支持撤销/重做/清空
 */
import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
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
} from 'lucide-react';

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

export default function HistoryModal({ open, onClose }: HistoryModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => {
    if (user) setRecords(getHistory(user.id));
  }, [user]);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmClear(false);
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
          className="btn btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          清空全部
        </button>
      )}
      <button onClick={onClose} className="btn btn-secondary">
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
            return (
              <div
                key={record.id}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-[var(--bg-secondary)] transition-shadow ${
                  undone
                    ? 'border-ink-200 opacity-60'
                    : 'border-ink-100 hover:shadow-sm'
                }`}
              >
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
                {undone ? (
                  <button
                    onClick={() => handleRedo(record.id)}
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                    title="重做"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleUndo(record.id)}
                    className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors"
                    title="撤销"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 清空确认 */}
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="确认清空历史"
        nested
        width="max-w-sm"
        footer={
          <>
            <button onClick={handleClear} className="btn btn-danger">
              清空
            </button>
            <button onClick={() => setConfirmClear(false)} className="btn btn-secondary">
              取消
            </button>
          </>
        }
      >
        <p className="text-sm">
          确认清空全部历史记录？已撤销的操作将无法重做。此操作不可撤销。
        </p>
      </Modal>
    </Modal>
  );
}
