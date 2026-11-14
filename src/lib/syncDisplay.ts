/**
 * 同步状态展示文案
 *
 * 状态需如实反映：接口是否可达、是否有待上传修改、Realtime 通道是否已订阅。
 * 避免出现“显示已同步但其他端收不到更新”的误导。
 */
import type { SyncStatus } from './types';

export interface SyncDisplay {
  label: string;
  /** 对应 .sync-card 的状态类名（online 为空） */
  cls: string;
  title: string;
}

export function getSyncDisplay(
  status: SyncStatus,
  pending: boolean,
  realtimeConnected: boolean,
): SyncDisplay {
  switch (status) {
    case 'loggedout':
      return { label: '未登录', cls: 'loggedout', title: '登录后自动同步' };
    case 'offline':
      return { label: '离线', cls: 'offline', title: '网络不可用，当前仅可查看数据' };
    case 'checking':
      return { label: '检测中', cls: 'checking', title: '正在检测连接并同步数据' };
    case 'syncing':
      return { label: '同步中', cls: 'syncing', title: '本地修改正在上传' };
    default:
      if (pending) {
        return { label: '同步中', cls: 'syncing', title: '本地修改等待上传' };
      }
      if (!realtimeConnected) {
        return { label: '实时断开', cls: 'realtime', title: '实时通道未连接，点击重连并同步' };
      }
      return { label: '已同步', cls: '', title: '数据已同步，实时更新正常' };
  }
}
