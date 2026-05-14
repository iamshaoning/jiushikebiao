/**
 * 快照工具
 *
 * @description 数据快照的创建/恢复/删除，支持 login/auto/manual 三种类型，含自动快照定时器
 * @module snapshotUtils
 */
import { registry } from '../core/registry.js';

const snapshotUtils = {
    
    /**
     * 获取当前用户ID
     * @returns {string|null} 用户ID
     */
    getCurrentUserId: async () => {
        try {
            if (registry.get('supabaseAuth')) {
                const { data } = await registry.get('supabaseAuth').getSession();
                return data?.session?.user?.id || null;
            }
        } catch (error) {
            console.error('获取用户ID失败:', error);
        }
        return null;
    },
    
    createSnapshot: async (type = 'manual', showNotification = true) => {
        const localDataStr = localStorage.getItem('coursemanagerdata');
        if (!localDataStr) {
            if (type === 'manual' && registry.get('notificationService')) {
                registry.get('notificationService').show('没有数据可创建快照', 'warning');
            }
            return;
        }
        
        const userId = await snapshotUtils.getCurrentUserId();
        if (!userId) {
            if (type === 'manual' && registry.get('notificationService')) {
                registry.get('notificationService').show('请先登录后再创建快照', 'warning');
            }
            return;
        }
        
        let data;
        try {
            data = JSON.parse(localDataStr);
        } catch (e) {
            if (type === 'manual' && registry.get('notificationService')) {
                registry.get('notificationService').show('数据格式错误，无法创建快照', 'error');
            }
            return;
        }

        const snapshot = {
            id: registry.get('utils').generateId ? registry.get('utils').generateId() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
            timestamp: new Date().toISOString(),
            userId: userId,
            data: data,
            type: type
        };

        let snapshots;
        try {
            snapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        } catch (e) {
            snapshots = [];
        }
        
        const loginSnapshots = snapshots.filter(s => s.type === 'login');
        const autoSnapshots = snapshots.filter(s => s.type === 'auto');
        const manualSnapshots = snapshots.filter(s => s.type === 'manual');
        
        if (type === 'login') {
            loginSnapshots.unshift(snapshot);
            if (loginSnapshots.length > 1) {
                loginSnapshots.splice(1);
            }
        } else if (type === 'auto') {
            autoSnapshots.unshift(snapshot);
            if (autoSnapshots.length > 1) {
                autoSnapshots.splice(1);
            }
        } else {
            manualSnapshots.unshift(snapshot);
            if (manualSnapshots.length > 3) {
                manualSnapshots.splice(3);
            }
        }
        
        snapshots = [...loginSnapshots, ...autoSnapshots, ...manualSnapshots];
        localStorage.setItem('coursemanagerSnapshots', JSON.stringify(snapshots));
        
        if (showNotification !== false && type === 'manual' && registry.get('notificationService')) {
            registry.get('notificationService').show('快照创建成功', 'success');
        }
    },
    
    startAutoSnapshotTimer: () => {
        if (!registry.get('autoSnapshotInterval')) {
            registry.set('autoSnapshotInterval', setInterval(() => {
                snapshotUtils.createSnapshot('auto');
            }, 15 * 60 * 1000));
        }
    },
    
    getSnapshots: async () => {
        let allSnapshots;
        try {
            allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        } catch (e) {
            allSnapshots = [];
        }
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            return [];
        }
        
        return allSnapshots.filter(s => s.userId === userId);
    },
    
    restoreSnapshot: async (snapshotId) => {
        let allSnapshots;
        try {
            allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        } catch (e) {
            allSnapshots = [];
        }
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            if (registry.get('notificationService')) {
                registry.get('notificationService').show('请先登录', 'error');
            }
            return;
        }
        
        const snapshot = allSnapshots.find(s => s.id === snapshotId && s.userId === userId);
        
        if (!snapshot) {
            if (registry.get('notificationService')) {
                registry.get('notificationService').show('快照不存在或无权访问', 'error');
            }
            return;
        }
        
        // 记录快照恢复操作到时间轴
        if (registry.get('timelineService')) {
            const snapshotDate = new Date(snapshot.timestamp);
            const formattedDate = snapshotDate.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const typeLabels = {
                'login': '登录快照',
                'auto': '自动快照',
                'manual': '手动快照'
            };
            
            // 使用timelineService添加记录
            const restoreRecord = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                type: 'restore-snapshot',
                timestamp: new Date().toISOString(),
                snapshotType: snapshot.type,
                snapshotDate: formattedDate,
                snapshotId: snapshotId,
                description: `恢复了 ${typeLabels[snapshot.type]} (${formattedDate})`
            };
            registry.get('timelineService').addToTimeline(restoreRecord);
        }
        
        // 更新快照数据的时间戳，确保服务器接受新数据
        const restoredData = {
            ...snapshot.data,
            lastupdated: new Date().toISOString()
        };
        
        localStorage.setItem('coursemanagerdata', JSON.stringify(restoredData));
        
        registry.get('utils').updateStateFromData(restoredData, false);
        
        registry.get('utils').refreshAllViews(true);
        
        registry.get('notificationService').show('快照恢复成功', 'success');

        await snapshotUtils.syncAfterRestore();
    },
    
    syncAfterRestore: async () => {
        const maxRetries = 3;
        const retryDelay = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const success = await registry.get('utils').syncToServer();
                if (success) {
                    if (registry.get('notificationService')) {
                        registry.get('notificationService').show('数据已同步到服务器', 'success');
                    }
                    return;
                }
            } catch (error) {
                console.error(`[syncAfterRestore] 同步失败 (尝试 ${attempt}):`, error);
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
        
        if (registry.get('notificationService')) {
            registry.get('notificationService').show('数据同步失败，请检查网络连接', 'error');
        }
    },
    
    deleteSnapshot: async (snapshotId, showNotification = true) => {
        let allSnapshots;
        try {
            allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        } catch (e) {
            allSnapshots = [];
        }
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            if (showNotification !== false && registry.get('notificationService')) {
                registry.get('notificationService').show('请先登录', 'error');
            }
            return;
        }
        
        const snapshotIndex = allSnapshots.findIndex(s => s.id === snapshotId && s.userId === userId);
        
        if (snapshotIndex === -1) {
            if (showNotification !== false && registry.get('notificationService')) {
                registry.get('notificationService').show('快照不存在或无权访问', 'error');
            }
            return;
        }
        
        const updatedSnapshots = [...allSnapshots];
        updatedSnapshots.splice(snapshotIndex, 1);
        localStorage.setItem('coursemanagerSnapshots', JSON.stringify(updatedSnapshots));
        
        if (showNotification !== false && registry.get('notificationService')) {
            registry.get('notificationService').show('快照删除成功', 'success');
        }
    }
};

export { snapshotUtils };
export default snapshotUtils;