/**
 * 公告服务
 *
 * 重写自课表 announcementService.js
 * 通过 Supabase Realtime 订阅公告推送，支持加载全部公告和实时监听新公告
 */
import { supabase, TABLES } from './supabase';

export interface Announcement {
  content: string;
  created_at: string;
}

/**
 * 订阅公告实时推送
 * @param callback 回调函数，接收新公告
 * @param channelName 频道名（可选，避免多个订阅者使用同名频道冲突）
 * @returns 取消订阅函数
 */
export function subscribeAnnouncements(
  callback: (a: Announcement) => void,
  channelName: string = 'announcements',
): () => void {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLES.ANNOUNCEMENTS },
      (payload: { new: { content: string; created_at: string } }) => {
        callback({
          content: payload.new.content,
          created_at: payload.new.created_at,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 加载全部公告（按创建时间倒序）
 */
export async function loadAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.ANNOUNCEMENTS)
      .select('content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Announcement] 查询失败:', error);
      return [];
    }
    if (!data) return [];
    return data as Announcement[];
  } catch (e) {
    console.error('[Announcement] 异常:', e);
    return [];
  }
}
