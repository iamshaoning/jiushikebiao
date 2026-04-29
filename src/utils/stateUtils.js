/**
 * 状态和数据管理模块
 * 提供状态更新、数据保存、同步到服务器等功能
 * 
 * @module stateUtils
 * @exports stateUtils
 */
const stateUtils = {
    updateStateFromData: (data, useDefaults = true) => {
        const oldCourses = [...window.state.courses];
        
        const defaults = { organizations: [], grades: [] };
        window.state.students = data.students || [];
        window.state.courses = data.courses || [];
        window.state.organizations = data.organizations || (useDefaults ? defaults.organizations : []);
        window.state.grades = data.grades || (useDefaults ? defaults.grades : []);
        window.state.lastupdated = data.lastupdated;
        
        if (window.snapshotUtils) {
            window.snapshotUtils.checkCourseChangeAndSnapshot(oldCourses, window.state.courses);
        }
        
        if (window.syncDataToMaps) {
            window.syncDataToMaps();
        }
    },
    
    getStatisticsParams: function() {
        const yearTrigger = document.querySelector('#statistics-year-wrapper .custom-select-trigger span');
        const monthTrigger = document.querySelector('#statistics-month-wrapper .custom-select-trigger span');
        const orgTrigger = document.querySelector('#statistics-organization-trigger span');
        
        // 月份需要减1，因为JavaScript的月份是从0开始的（0代表1月）
        const monthText = monthTrigger?.textContent || '';
        const monthNum = parseInt(monthText) || (new Date().getMonth() + 1);
        
        // 机构：如果显示"全部机构"，返回空字符串表示显示所有机构
        const orgText = orgTrigger?.textContent || '';
        const organization = orgText === '全部机构' ? '' : orgText;
        
        return {
            year: parseInt(yearTrigger?.textContent) || new Date().getFullYear(),
            month: monthNum - 1,
            organization: organization
        };
    },
    
    saveData: async () => {
        try {
            const currentState = window.state;
            
            const now = new Date();
            const isoDateTimeString = now.toISOString();
            const appData = {
                students: currentState.students,
                courses: currentState.courses,
                organizations: currentState.organizations,
                grades: currentState.grades,
                lastupdated: isoDateTimeString
            };
            
            currentState.lastupdated = appData.lastupdated;
            
            try {
                localStorage.setItem('coursemanagerdata', JSON.stringify(appData));
            } catch (error) {
                console.error('[saveData] 本地保存失败:', error);
            }
            
            const isOffline = window.elements?.syncIcon?.classList.contains('sync-offline');
            
            if (!isOffline && window.serverStatusService) {
                window.serverStatusService.setSyncing();
                
                const auth = window.supabaseAuth;
                if (window.supabaseClient && auth) {
                    try {
                        const { data: sessionData } = await utils.withTimeout(() => auth.getSession(), 5000, '获取会话超时');
                        const session = sessionData.session;
                        
                        if (session) {
                            const userId = session.user.id;
                            
                            try {
                                const { error } = await utils.withTimeout(() => 
                                    window.supabaseClient
                                        .from('coursemanagerdata')
                                        .upsert({
                                        userid: userId,
                                        students: appData.students,
                                        courses: appData.courses,
                                        organizations: appData.organizations,
                                        grades: appData.grades,
                                        lastupdated: appData.lastupdated
                                    }, { onConflict: 'userid' })
                                , 10000, '同步数据超时');
                                
                                if (error) {
                                    utils.handleError(error, '数据同步到服务器失败', true);
                                    window.serverStatusService.updateServerStatus('offline');
                                } else {
                                    const localDataStr = localStorage.getItem('coursemanagerdata');
                                    if (localDataStr) {
                                        const localData = JSON.parse(localDataStr);
                                        localData.userid = userId;
                                        localStorage.setItem('coursemanagerdata', JSON.stringify(localData));
                                    }
                                    window.serverStatusService.updateServerStatus('online');
                                }
                            } catch (syncError) {
                                utils.handleError(syncError, '同步数据到服务器失败', true);
                                window.serverStatusService.updateServerStatus('offline');
                            }
                        }
                    } catch (error) {
                        utils.handleError(error, '获取 session 失败', true);
                        window.serverStatusService.updateServerStatus('loggedout');
                    }
                } else {
                    window.serverStatusService.updateServerStatus('loggedout');
                }
            }
        } catch (error) {
            utils.handleError(error, '保存数据失败', true);
            try {
                const now = new Date();
                const isoDateTimeString = now.toISOString();
                const currentState = window.state;
                const appData = {
                    students: currentState.students,
                    courses: currentState.courses,
                    organizations: currentState.organizations,
                    grades: currentState.grades,
                    lastupdated: isoDateTimeString
                };
                localStorage.setItem('coursemanagerdata', JSON.stringify(appData));
            } catch (localError) {
                if (window.GLOBAL_DEBUG) console.error('本地存储也失败:', localError);
            }
        }
    },
    
    debouncedSaveData: null,
    debouncedSyncToServer: null,
    
    saveToLocal: () => {
        const now = new Date();
        const isoDateTimeString = now.toISOString();
        const appData = {
            students: window.state.students,
            courses: window.state.courses,
            organizations: window.state.organizations,
            grades: window.state.grades,
            lastupdated: isoDateTimeString
        };
        localStorage.setItem('coursemanagerdata', JSON.stringify(appData));
    },
    
    syncToServer: async (force = false) => {
        const auth = window.supabaseAuth;
        if (!window.supabaseClient || !auth) {
            window.serverStatusService?.updateServerStatus('loggedout');
            return false;
        }
        
        try {
            const { data: sessionData } = await auth.getSession();
            const session = sessionData.session;
            
            if (!session) {
                window.serverStatusService.updateServerStatus('loggedout');
                return false;
            }
            
            const userId = session.user.id;
            const localDataStr = localStorage.getItem('coursemanagerdata');
            
            if (!localDataStr) {
                window.serverStatusService.updateServerStatus('online');
                return true;
            }
            
            const localData = JSON.parse(localDataStr);
            
            const { error } = await window.supabaseClient
                .from('coursemanagerdata')
                .upsert({
                userid: userId,
                students: localData.students,
                courses: localData.courses,
                organizations: localData.organizations,
                grades: localData.grades,
                lastupdated: localData.lastupdated
            }, { onConflict: 'userid' });
            
            if (error) {
                throw error;
            }
            
            window.serverStatusService.updateServerStatus('online');
            return true;
        } catch (error) {
            utils.handleError(error, '同步到服务器失败', true);
            window.serverStatusService.updateServerStatus('offline');
            return false;
        }
    },
    
    initDebouncedSave: function() {
        this.debouncedSaveData = this.debounce(this.saveData, 2000);
        this.debouncedSyncToServer = this.debounce(this.syncToServer, 3000);
    }
};

export { stateUtils };
export default stateUtils;