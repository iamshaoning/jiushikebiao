/**
 * 状态工具
 *
 * @description 数据持久化保存到 localStorage、同步到 Supabase、防抖保存、初始化防抖函数
 * @module stateUtils
 */
import { registry } from '../core/registry.js';

const LOCAL_STORAGE_KEY = 'coursemanagerdata';

const CONSTANTS = {
    DEBOUNCE_SAVE_DELAY: 2000,
    DEBOUNCE_SYNC_DELAY: 3000,
    SESSION_TIMEOUT: 5000,
    SYNC_TIMEOUT: 10000,
    DEFAULT_DURATION: 120,
    MAX_DURATION_MINUTES: 1440
};

const stateUtils = {
    saveData: async () => {
        try {
            const currentState = registry.get('state');
            
            const now = new Date();
            const isoDateTimeString = now.toISOString();
            const appData = {
                students: currentState.students,
                courses: currentState.courses,
                organizations: currentState.organizations,
                grades: currentState.grades,
                organizationColors: currentState.organizationColors || {},
                gradeColors: currentState.gradeColors || {},
                lastupdated: isoDateTimeString
            };
            
            currentState.lastupdated = appData.lastupdated;
            
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
            } catch (error) {
                console.error('[存储] 本地存储保存失败:', error);
            }
            
            const isOffline = registry.get('elements')?.syncIcon?.classList.contains('sync-offline');
            
            if (!isOffline && registry.get('serverStatusService')) {
                registry.get('serverStatusService').setSyncing();
                
                const auth = registry.get('supabaseAuth');
                
                if (registry.get('supabaseClient') && auth) {
                    try {
                        let sessionData = null;
                        try {
                            let result;
                            if (registry.get('utils')?.withTimeout) {
                                result = await registry.get('utils').withTimeout(() => auth.getSession(), CONSTANTS.SESSION_TIMEOUT, '获取会话超时');
                            } else {
                                result = await auth.getSession();
                            }
                            
                            if (result && typeof result === 'object') {
                                if (result.data && typeof result.data === 'object') {
                                    sessionData = result.data;
                                } else if (result.session) {
                                    sessionData = result;
                                }
                            }
                        } catch (sessionError) {
                            console.error('[存储] 获取session异常:', sessionError);
                        }
                        
                        const session = sessionData?.session;
                        const userId = session?.user?.id;
                        
                        if (session && userId) {
                            try {
                                const upsertData = {
                                    userid: userId,
                                    students: appData.students,
                                    courses: appData.courses,
                                    organizations: appData.organizations,
                                    grades: appData.grades,
                                    organizationColors: appData.organizationColors,
                                    gradeColors: appData.gradeColors,
                                    lastupdated: appData.lastupdated
                                };
                                
                                const upsertPromise = registry.get('supabaseClient')
                                    .from('coursemanagerdata')
                                    .upsert(upsertData, { onConflict: 'userid' });
                                
                                let upsertResult;
                                if (registry.get('utils')?.withTimeout) {
                                    upsertResult = await registry.get('utils').withTimeout(() => upsertPromise, CONSTANTS.SYNC_TIMEOUT, '同步数据超时');
                                } else {
                                    upsertResult = await upsertPromise;
                                }
                                
                                const { error } = upsertResult;
                                
                                if (error) {
                                    throw error;
                                } else {
                                    const localDataStr = localStorage.getItem(LOCAL_STORAGE_KEY);
                                    if (localDataStr) {
                                        const localData = JSON.parse(localDataStr);
                                        localData.userid = userId;
                                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
                                    }
                                    registry.get('serverStatusService').updateServerStatus('online');
                                }
                            } catch (syncError) {
                                if (registry.get('utils')?.handleError) {
                                    registry.get('utils').handleError(syncError, '同步数据到服务器失败', true);
                                } else {
                                    console.error('[存储] 同步数据到服务器失败:', syncError);
                                }
                                registry.get('serverStatusService').updateServerStatus('offline');
                            }
                        } else {
                            registry.get('serverStatusService').updateServerStatus('loggedout');
                        }
                    } catch (error) {
                        if (registry.get('utils')?.handleError) {
                            registry.get('utils').handleError(error, '获取 session 失败', true);
                        } else {
                            console.error('[存储] 获取 session 失败:', error);
                        }
                        registry.get('serverStatusService').updateServerStatus('loggedout');
                    }
                } else {
                    registry.get('serverStatusService').updateServerStatus('loggedout');
                }
            }
        } catch (error) {
            if (registry.get('utils')?.handleError) {
                registry.get('utils').handleError(error, '保存数据失败', true);
            } else {
                console.error('[存储] 保存数据失败:', error);
            }
            try {
                const currentState = registry.get('state');
                if (!currentState || !currentState.students) return;
                const now = new Date();
                const isoDateTimeString = now.toISOString();
                const appData = {
                    students: currentState.students,
                    courses: currentState.courses,
                    organizations: currentState.organizations,
                    grades: currentState.grades,
                    organizationColors: currentState.organizationColors || {},
                    gradeColors: currentState.gradeColors || {},
                    lastupdated: isoDateTimeString
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
            } catch (localError) {
                console.error('[存储] 本地存储也失败:', localError);
            }
        }
    },
    
    debouncedSaveData: null,
    debouncedSyncToServer: null,
    
    syncToServer: async (force = false) => {
        const auth = registry.get('supabaseAuth');
        if (!registry.get('supabaseClient') || !auth) {
            registry.get('serverStatusService')?.updateServerStatus('loggedout');
            return false;
        }
        
        try {
            const sessionResult = await auth.getSession();
            if (!sessionResult || !sessionResult.data) {
                return false;
            }
            const { data: sessionData } = sessionResult;
            const session = sessionData.session;
            
            if (!session) {
                registry.get('serverStatusService').updateServerStatus('loggedout');
                return false;
            }
            
            const userId = session.user.id;
            const localDataStr = localStorage.getItem(LOCAL_STORAGE_KEY);
            
            if (!localDataStr) {
                registry.get('serverStatusService').updateServerStatus('online');
                return true;
            }
            
            let localData;
            try {
                localData = JSON.parse(localDataStr);
            } catch (parseError) {
                console.error('[同步] 解析本地数据失败:', parseError);
                return false;
            }
            
            const { error } = await registry.get('supabaseClient')
                .from('coursemanagerdata')
                .upsert({
                userid: userId,
                students: localData.students,
                courses: localData.courses,
                organizations: localData.organizations,
                grades: localData.grades,
                organizationColors: localData.organizationColors || {},
                gradeColors: localData.gradeColors || {},
                lastupdated: localData.lastupdated
            }, { onConflict: 'userid' });
            
            if (error) {
                throw error;
            }
            
            registry.get('serverStatusService').updateServerStatus('online');
            return true;
        } catch (error) {
            if (registry.get('utils')?.handleError) {
                registry.get('utils').handleError(error, '同步到服务器失败', true);
            } else {
                console.error('[同步] 同步到服务器失败:', error);
            }
            registry.get('serverStatusService').updateServerStatus('offline');
            return false;
        }
    },
    
    initDebouncedSave: function() {
        const debounce = registry.get('coreUtils')?.debounce;
        if (typeof debounce !== 'function') {
            console.error('[状态] coreUtils.debounce not found');
            return;
        }
        this.debouncedSaveData = debounce(this.saveData.bind(this), CONSTANTS.DEBOUNCE_SAVE_DELAY);
        this.debouncedSyncToServer = debounce(this.syncToServer.bind(this), CONSTANTS.DEBOUNCE_SYNC_DELAY);
    }
};

export { stateUtils };
export default stateUtils;
