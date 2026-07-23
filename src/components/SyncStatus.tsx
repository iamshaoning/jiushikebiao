/**
 * 同步状态显示组件
 *
 * 复用 index.css 中 .sync-card / .sync-dot 样式
 * 在侧边栏墨绿背景上显示，用固定颜色不受深色模式影响
 * online 绿色呼吸灯，syncing 黄色脉冲，checking 橙色呼吸（检测中），offline 灰色静态
 * 点击触发主动连接检测
 */
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import { checkConnection } from '@/lib/data';
import type { SyncStatus as SyncStatusType } from '@/lib/types';

const STATUS_MAP: Record<SyncStatusType, { label: string; cls: string }> = {
  online: { label: '已同步', cls: '' },
  syncing: { label: '同步中', cls: 'syncing' },
  checking: { label: '检测中', cls: 'checking' },
  offline: { label: '离线', cls: 'offline' },
  loggedout: { label: '未登录', cls: 'loggedout' },
};

export default function SyncStatus() {
  const syncStatus = useStore((s) => s.syncStatus);
  const user = useStore((s) => s.user);
  const toast = useToast();
  const cfg = STATUS_MAP[syncStatus];

  const handleCheck = async () => {
    // 检测中/同步中不重复触发
    if (syncStatus === 'checking' || syncStatus === 'syncing') return;
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    const ok = await checkConnection(user.id);
    if (ok) toast.success('连接正常');
    else toast.warning('连接失败，请检查网络');
  };

  return (
    <div
      className={`sync-card ${cfg.cls} cursor-pointer select-none`}
      title={`同步状态：${cfg.label}（点击检测连接）`}
      onClick={handleCheck}
    >
      <span className="sync-dot" />
      <span>{cfg.label}</span>
    </div>
  );
}
