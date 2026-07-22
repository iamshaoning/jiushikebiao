/**
 * 同步状态显示组件
 *
 * 复用 index.css 中 .sync-card / .sync-dot 样式
 * 在侧边栏墨绿背景上显示，用固定颜色不受深色模式影响
 * online 状态绿色呼吸灯，syncing 黄色脉冲，offline 灰色静态
 */
import { useStore } from '@/stores/useStore';
import type { SyncStatus as SyncStatusType } from '@/lib/types';

const STATUS_MAP: Record<SyncStatusType, { label: string; cls: string }> = {
  online: { label: '已同步', cls: '' },
  syncing: { label: '同步中', cls: 'syncing' },
  offline: { label: '离线', cls: 'offline' },
  loggedout: { label: '未登录', cls: 'loggedout' },
  trial: { label: '试用', cls: 'offline' },
};

export default function SyncStatus() {
  const syncStatus = useStore((s) => s.syncStatus);
  const cfg = STATUS_MAP[syncStatus];

  return (
    <div className={`sync-card ${cfg.cls}`} title={`同步状态：${cfg.label}`}>
      <span className="sync-dot" />
      <span>{cfg.label}</span>
    </div>
  );
}
