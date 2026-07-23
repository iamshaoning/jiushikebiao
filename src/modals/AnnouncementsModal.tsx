/**
 * 公告板模态框
 *
 * 列出全部公告（按时间倒序），实时监听新公告并追加到顶部
 */
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import {
  loadAnnouncements,
  subscribeAnnouncements,
  type Announcement,
} from '@/lib/announcement';
import { Bell, Clock } from 'lucide-react';

interface AnnouncementsModalProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function AnnouncementsModal({ open, onClose }: AnnouncementsModalProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const list = await loadAnnouncements();
        if (!cancelled) {
          setAnnouncements(list);
          setLoading(false);
        }
      } catch (e) {
        console.error('[AnnouncementsModal] 加载失败:', e);
        if (!cancelled) {
          setLoading(false);
          setAnnouncements([]);
        }
      }
    })();

    // 订阅新公告（使用独立 channel 避免与 Layout 订阅冲突）
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = subscribeAnnouncements((a) => {
        if (!cancelled) {
          setAnnouncements((prev) => [a, ...prev]);
        }
      }, 'announcements-modal');
    } catch (e) {
      console.error('[AnnouncementsModal] 订阅失败:', e);
    }

    return () => {
      cancelled = true;
      try { unsubscribe(); } catch { /* ignore */ }
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="公告板" width="max-w-lg">
      {loading ? (
        <div className="text-center py-10 text-gray-400">加载中...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>暂无公告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => (
            <div
              key={`${a.created_at}-${i}`}
              className="p-3 rounded-lg border border-ink-100 bg-[var(--bg-secondary)]"
            >
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {a.content}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                <Clock className="w-3 h-3" />
                {formatTime(a.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
