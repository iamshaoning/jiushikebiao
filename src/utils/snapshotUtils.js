/**
 * 快照管理模块
 * 提供数据快照的创建、恢复、删除等功能
 * 支持手动、自动、登录、课程变更等多种快照类型
 * 
 * @module snapshotUtils
 * @exports snapshotUtils
 */
const snapshotUtils = {
    previousServerStatus: null,
    
    createSnapshot: (type = 'manual', showNotification = true) => {
        const localDataStr = localStorage.getItem('coursemanagerdata');
        if (!localDataStr) {
            if (type === 'manual' && typeof window.notificationService !== 'undefined') {
                window.notificationService.show('没有数据可创建快照', 'warning');
            }
            return;
        }
        
        const snapshot = {
            id: window.utils?.generateId ? window.utils.generateId() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
            timestamp: new Date().toISOString(),
            data: JSON.parse(localDataStr),
            type: type
        };
        
        let snapshots = JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
        
        const loginSnapshots = snapshots.filter(s => s.type === 'login' || s.type === 'auto');
        const courseChangeSnapshots = snapshots.filter(s => s.type === 'course_change');
        const manualSnapshots = snapshots.filter(s => s.type === 'manual');
        
        if (type === 'login' || type === 'auto') {
            loginSnapshots.unshift(snapshot);
            if (loginSnapshots.length > 1) {
                loginSnapshots.splice(1);
            }
        } else if (type === 'course_change') {
            courseChangeSnapshots.unshift(snapshot);
            if (courseChangeSnapshots.length > 1) {
                courseChangeSnapshots.splice(1);
            }
        } else {
            manualSnapshots.unshift(snapshot);
            if (manualSnapshots.length > 3) {
                manualSnapshots.splice(3);
            }
        }
        
        snapshots = [...loginSnapshots, ...courseChangeSnapshots, ...manualSnapshots];
        localStorage.setItem('coursemanagerSnapshots', JSON.stringify(snapshots));
        
        if (showNotification !== false && type === 'manual' && typeof window.notificationService !== 'undefined') {
            window.notificationService.show('快照创建成功', 'success');
        }
    },
    
    startAutoSnapshotTimer: () => {
        if (!window.autoSnapshotInterval) {
            window.autoSnapshotInterval = setInterval(() => {
                snapshotUtils.createSnapshot('auto');
            }, 5 * 60 * 1000);
        }
    },
    
    checkCourseChangeAndSnapshot: (oldCourses, newCourses) => {
        const oldCount = oldCourses?.length || 0;
        const newCount = newCourses?.length || 0;
        const changeCount = Math.abs(newCount - oldCount);
        
        if (changeCount > 5) {
            snapshotUtils.createSnapshot('course_change');
        }
    },
    
    getSnapshots: () => {
        return JSON.parse(localStorage.getItem('coursemanagerSnapshots') || '[]');
    },
    
    restoreSnapshot: async (snapshotId) => {
        const snapshots = snapshotUtils.getSnapshots();
        const snapshot = snapshots.find(s => s.id === snapshotId);
        
        if (!snapshot) {
            if (typeof window.notificationService !== 'undefined') {
                window.notificationService.show('快照不存在', 'error');
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
            window.notificationService.show('数据同步失败，请检查网络连接', 'warning');
        }
    },
    
    deleteSnapshot: (snapshotId, showNotification = true) => {
        const snapshots = snapshotUtils.getSnapshots();
        const updatedSnapshots = snapshots.filter(s => s.id !== snapshotId);
        
        localStorage.setItem('coursemanagerSnapshots', JSON.stringify(updatedSnapshots));
        
        if (showNotification !== false && typeof window.notificationService !== 'undefined') {
            window.notificationService.show('快照删除成功', 'success');
        }
    }
};

export { snapshotUtils };
export default snapshotUtils;