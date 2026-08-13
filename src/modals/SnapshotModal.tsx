/**
 * 快照管理模态框
 *
 * 还原原项目布局：按类型分组（登录/自动/手动），手动快照显示空栏位（点击创建），
 * 支持恢复、覆盖、删除操作
 */
import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  listSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} from '@/lib/snapshot';
import type { Snapshot, SnapshotType } from '@/lib/types';
import { Camera, Plus, Clock, RefreshCw, Trash2, Replace } from 'lucide-react';

interface SnapshotModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_META: Record<SnapshotType, { label: string; icon: typeof Camera; color: string }> = {
  auto: { label: '自动快照（每15分钟，保留2个）', icon: RefreshCw, color: 'text-green-600' },
  manual: { label: '手动快照（最多3个）', icon: Camera, color: 'text-amber-600' },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SnapshotModal({ open, onClose }: SnapshotModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [confirmRestore, setConfirmRestore] = useState<Snapshot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Snapshot | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);

  const refresh = useCallback(() => {
    if (user) setSnapshots(listSnapshots(user.id));
  }, [user]);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmRestore(null);
      setConfirmDelete(null);
      setConfirmOverwrite(null);
    }
  }, [open, refresh]);

  const handleCreate = () => {
    const snap = createSnapshot('manual', '手动快照');
    if (snap) {
      toast.success('快照创建成功');
      refresh();
    } else {
      toast.error('快照创建失败');
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    const ok = await restoreSnapshot(confirmRestore.id);
    setRestoring(false);
    setConfirmRestore(null);
    if (ok) {
      toast.success('快照恢复成功');
      onClose();
    } else {
      toast.error('快照恢复失败');
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const ok = deleteSnapshot(confirmDelete.id);
    setConfirmDelete(null);
    if (ok) {
      toast.success('快照已删除');
      refresh();
    } else {
      toast.error('快照删除失败');
    }
  };

  const handleOverwrite = () => {
    if (!confirmOverwrite) return;
    // 覆盖 = 先删除旧快照腾出配额，再创建新快照
    // （若先创建会触发配额trim丢弃最旧快照，再删除旧快照会导致额外数据丢失）
    const overwriteId = confirmOverwrite.id;
    const deleted = deleteSnapshot(overwriteId);
    if (!deleted) {
      toast.error('快照覆盖失败');
      return;
    }
    const newSnap = createSnapshot('manual', '手动快照');
    if (newSnap) {
      setConfirmOverwrite(null);
      toast.success('快照覆盖成功');
      refresh();
    } else {
      // 创建失败：尝试恢复被删除的旧快照（数据已在 deleteSnapshot 中从存储移除，
      // 无法直接恢复，提示用户手动重建）
      toast.error('快照覆盖失败，旧快照已被删除');
      refresh();
    }
  };

  // 按类型分组
  const autoSnapshots = snapshots.filter((s) => s.type === 'auto');
  const autoEmptySlots = Math.max(0, 2 - autoSnapshots.length);
  const manualSnapshots = snapshots.filter((s) => s.type === 'manual');
  const manualEmptySlots = Math.max(0, 3 - manualSnapshots.length);

  /** 渲染单条快照 */
  const renderSnapshotItem = (snap: Snapshot, showOverwrite = false, showDelete = false) => {
    const meta = TYPE_META[snap.type];
    const Icon = meta.icon;
    return (
      <div
        key={snap.id}
        className="p-3 border border-ink-200 rounded-lg mb-2 flex justify-between items-center bg-white"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800">
              {formatTime(snap.createdAt)}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {snap.data.courses?.length || 0} 节课程 · {snap.data.students?.length || 0} 位学生
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setConfirmRestore(snap)}
            disabled={restoring}
            className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center gap-1"
            title="恢复"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden desktop:inline">恢复</span>
          </button>
          {showOverwrite && (
            <button
              onClick={() => setConfirmOverwrite(snap)}
              className="px-2 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
              title="覆盖"
            >
              <Replace className="w-3 h-3" />
              <span className="hidden desktop:inline">覆盖</span>
            </button>
          )}
          {showDelete && (
            <button
              onClick={() => setConfirmDelete(snap)}
              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center gap-1"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden desktop:inline">删除</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="快照管理" width="max-w-lg">
      <div className="max-h-[60vh] overflow-y-auto">
        {/* 自动快照：已有 + 空栏位 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 text-gray-700">自动快照（每15分钟，保留2个）</h4>
          {autoSnapshots.map((snap) => renderSnapshotItem(snap, false, false))}
          {Array.from({ length: autoEmptySlots }).map((_, i) => (
            <div
              key={`auto-empty-${i}`}
              className="p-3 border border-ink-200 rounded-lg mb-2 flex justify-center items-center bg-white"
            >
              <div className="text-center text-gray-400">
                <Clock className="w-4 h-4 mx-auto mb-1" />
                <div className="text-sm">等待自动创建</div>
              </div>
            </div>
          ))}
        </div>

        {/* 手动快照：已有 + 空栏位 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 text-gray-700">手动快照（最多3个）</h4>
          {manualSnapshots.map((snap) => renderSnapshotItem(snap, true, true))}
          {/* 空栏位：点击创建 */}
          {Array.from({ length: manualEmptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={handleCreate}
              className="w-full p-3 border border-ink-200 rounded-lg mb-2 flex justify-center items-center cursor-pointer bg-white hover:bg-ink-50 transition-colors"
            >
              <div className="text-center">
                <Plus className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                <div className="text-sm text-gray-400">空快照栏位 {manualSnapshots.length + i + 1}</div>
                <div className="text-xs text-gray-400">点击创建快照</div>
              </div>
            </button>
          ))}
          {manualSnapshots.length === 0 && manualEmptySlots === 0 && (
            <p className="text-center p-3 border border-ink-200 rounded-lg text-sm text-gray-400">
              暂无快照
            </p>
          )}
        </div>
      </div>

      {/* 恢复确认 */}
      <ConfirmDialog
        open={!!confirmRestore}
        type="warning"
        confirmText="恢复"
        message="确认用此快照覆盖当前数据吗？此操作可撤销。"
        onConfirm={() => {
          setConfirmRestore(null);
          handleRestore();
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      {/* 覆盖确认 */}
      <ConfirmDialog
        open={!!confirmOverwrite}
        type="delete"
        confirmText="覆盖"
        message="确认用当前数据覆盖此快照吗？此操作不可撤销。"
        onConfirm={handleOverwrite}
        onCancel={() => setConfirmOverwrite(null)}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!confirmDelete}
        type="delete"
        message="确认删除此快照吗？此操作不可撤销。"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Modal>
  );
}
