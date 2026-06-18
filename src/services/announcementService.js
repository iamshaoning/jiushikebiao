/**
 * 公告服务
 *
 * @description 通过 Supabase Realtime 订阅公告推送，支持加载全部公告和实时监听新公告
 * @module announcementService
 */

import { registry } from '../core/registry.js';

/**
 * 获取 Supabase 客户端（通过 registry 获取，避免暴露密钥）
 */
function getClient() {
    return registry.get('supabaseClient');
}

/**
 * 订阅公告实时推送
 * @param {Function} callback - 回调函数，接收新公告对象 { content, created_at }
 * @returns {Function} 取消订阅函数
 */
export function subscribeAnnouncements(callback) {
    const client = getClient();
    if (!client) return () => {};

    const channel = client
        .channel('announcements')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'announcements' },
            (payload) => {
                callback({
                    content: payload.new.content,
                    created_at: payload.new.created_at,
                });
            }
        )
        .subscribe();

    return () => client.removeChannel(channel);
}

/**
 * 加载全部公告（按创建时间倒序）
 * @returns {Promise<Array<{content: string, created_at: string}>>}
 */
export async function loadAnnouncements() {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
        .from('announcements')
        .select('content, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Announcement] 查询失败:', error);
        const ns = registry.get('notificationService');
        if (ns) ns.show('公告加载失败，请稍后重试', 'error');
        return [];
    }
    if (!data) {
        console.warn('[Announcement] 查询结果为空');
        return [];
    }
    return data;
}