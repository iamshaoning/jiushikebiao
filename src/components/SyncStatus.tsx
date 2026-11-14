/**
 * 同步状态显示组件
 *
 * 复用 index.css 中 .sync-card / .sync-dot 样式
 * 在侧边栏墨绿背景上显示，用固定颜色不受深色模式影响
 * online 绿色呼吸灯，syncing 黄色脉冲，checking 橙色呼吸，realtime 橙色静态，offline 灰色静态
 * 点击执行真正的同步（重建 Realtime 通道 + 拉取/上传对齐），而不是仅探测接口
 */
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import { syncNow } from '@/lib/data';
import { getSyncDisplay } from '@/lib/syncDisplay';

export default function SyncStatus() {
  const syncStatus = useStore((s) => s.syncStatus);
  const syncPending = useStore((s) => s.syncPending);
  const realtimeConnected = useStore((s) => s.realtimeConnected);
  const user = useStore((s) => s.user);
  const toast = useToast();
  const cfg = getSyncDisplay(syncStatus, syncPending, realtimeConnected);

  const handleCheck = async () => {
    if (syncStatus === 'checking' || syncStatus === 'syncing') return;
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    const ok = await syncNow(user.id);
    if (ok) toast.success('连接正常，数据已对齐');
    else toast.warning('连接失败，请检查网络');
  };

  return (
    <button
      type="button"
      className={`sync-card ${cfg.cls} cursor-pointer select-none`}
      title={`${cfg.title}（点击立即同步）`}
      onClick={handleCheck}
    >
      <span className="sync-dot" />
      <span aria-live="polite">{cfg.label}</span>
    </button>
  );
}
