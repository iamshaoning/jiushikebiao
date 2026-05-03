/**
 * 快照管理模块
 * 提供数据快照的创建、恢复、删除等功能
 * 支持手动、自动、登录等多种快照类型
 *
 * @module snapshotUtils
 * @exports snapshotUtils
 */
const snapshotUtils = {
    previousServerStatus: null,
    
    /**
     * 获取当前用户ID
     * @returns {string|null} 用户ID
     */
    getCurrentUserId: async () => {
        try {
            if (window.authService) {
                const session = await window.authService.getSession();
                return session?.user?.id || null;
            }
        } catch (error) {
            console.error('获取用户ID失败:', error);
        }
        return null;
    },
    
    createSnapshot: async (type = 'manual', showNotification = true) => {
        const localDataStr = localStorage.getItem('coursemanagerdata');
        if (!localDataStr) {
            if (type === 'manual' && typeof window.notificationService !== 'undefined') {
                window.notificationService.show('没有数据可创建快照', 'warning');
            }
            return;
        }
        
        const userId = await snapshotUtils.getCurrentUserId();
        if (!userId) {
            if (type === 'manual' && typeof window.notificationService !== 'undefined') {
                window.notificationService.show('请先登录后再创建快照', 'warning');
            }
            return;
        }
        
        const snapshot = {
            id: window.utils?.generateId ? window.utils.generateId() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
            timestamp: new Date().toISOString(),
            userId: userId,
            data: JSON.parse(localDataStr),
            type: type
        };
        
        let snapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        
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
        
        if (showNotification !== false && type === 'manual' && typeof window.notificationService !== 'undefined') {
            window.notificationService.show('快照创建成功', 'success');
        }
    },
    
    startAutoSnapshotTimer: () => {
        if (!window.autoSnapshotInterval) {
            window.autoSnapshotInterval = setInterval(() => {
                snapshotUtils.createSnapshot('auto');
            }, 15 * 60 * 1000);
        }
    },
    
    getSnapshots: async () => {
        const allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            return [];
        }
        
        return allSnapshots.filter(s => s.userId === userId);
    },
    
    restoreSnapshot: async (snapshotId) => {
        const allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            if (typeof window.notificationService !== 'undefined') {
                window.notificationService.show('请先登录', 'error');
            }
            return;
        }
        
        const snapshot = allSnapshots.find(s => s.id === snapshotId && s.userId === userId);
        
        if (!snapshot) {
            if (typeof window.notificationService !== 'undefined') {
                window.notificationService.show('快照不存在或无权访问', 'error');
            }
            return;
        }
        
        // 更新快照数据的时间戳，确保服务器接受新数据
        const restoredData = {
            ...snapshot.data,
            lastupdated: new Date().toISOString()
        };
        
        localStorage.setItem('coursemanagerdata', JSON.stringify(restoredData));
        
        if (typeof window.utils?.updateStateFromData === 'function') {
            window.utils.updateStateFromData(restoredData, false);
        }
        
        if (typeof window.utils?.refreshAllViews === 'function') {
            window.utils.refreshAllViews(true);
        }
        
        if (typeof window.notificationService !== 'undefined') {
            window.notificationService.show('快照恢复成功', 'success');
        }
        
        // 恢复快照后立即上传数据到服务器，带重试机制
        if (typeof window.utils?.syncToServer === 'function') {
            await snapshotUtils.syncAfterRestore();
        }
    },
    
    syncAfterRestore: async () => {
        const maxRetries = 3;
        const retryDelay = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const success = await window.utils.syncToServer(true);
                if (success) {
                    if (typeof window.notificationService !== 'undefined') {
                        window.notificationService.show('数据已同步到服务器', 'success');
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
        
        if (typeof window.notificationService !== 'undefined') {
            window.notificationService.show('数据同步失败，请检查网络连接', 'error');
        }
    },
    
    deleteSnapshot: async (snapshotId, showNotification = true) => {
        const allSnapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        const userId = await snapshotUtils.getCurrentUserId();
        
        if (!userId) {
            if (showNotification !== false && typeof window.notificationService !== 'undefined') {
                window.notificationService.show('请先登录', 'error');
            }
            return;
        }
        
        const snapshotIndex = allSnapshots.findIndex(s => s.id === snapshotId && s.userId === userId);
        
        if (snapshotIndex === -1) {
            if (showNotification !== false && typeof window.notificationService !== 'undefined') {
                window.notificationService.show('快照不存在或无权访问', 'error');
            }
            return;
        }
        
        const updatedSnapshots = [...allSnapshots];
        updatedSnapshots.splice(snapshotIndex, 1);
        localStorage.setItem('coursemanagerSnapshots', JSON.stringify(updatedSnapshots));
        
        if (showNotification !== false && typeof window.notificationService !== 'undefined') {
            window.notificationService.show('快照删除成功', 'success');
        }
    }
};

export { snapshotUtils };
export default snapshotUtils;