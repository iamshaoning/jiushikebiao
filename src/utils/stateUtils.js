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
            
            const status = registry.get('serverStatusService').previousStatus;
            const isOffline = !status || status === 'offline' || status === 'loggedout';
            
            if (!isOffline && registry.get('serverStatusService')) {
                registry.get('serverStatusService').setSyncing();
                
                const auth = registry.get('supabaseAuth');
                
                if (registry.get('supabaseClient') && auth) {
                    try {
                        let sessionData = null;
                        try {
                            let result;
                            result = await registry.get('utils').withTimeout(() => auth.getSession(), CONSTANTS.SESSION_TIMEOUT, '获取会话超时');
                            
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
                                upsertResult = await registry.get('utils').withTimeout(() => upsertPromise, CONSTANTS.SYNC_TIMEOUT, '同步数据超时');
                                
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
                                registry.get('errorHandlerService').handleError(syncError, '同步数据到服务器失败', true);
                                registry.get('serverStatusService').updateServerStatus('offline');
                            }
                        } else {
                            registry.get('serverStatusService').updateServerStatus('loggedout');
                        }
                    } catch (error) {
                        registry.get('errorHandlerService').handleError(error, '获取 session 失败', true);
                        registry.get('serverStatusService').updateServerStatus('loggedout');
                    }
                } else {
                    registry.get('serverStatusService').updateServerStatus('loggedout');
                }
            }
        } catch (error) {
            registry.get('errorHandlerService').handleError(error, '保存数据失败', true);
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
    
    syncToServer: async () => {
        const auth = registry.get('supabaseAuth');
        if (!registry.get('supabaseClient') || !auth) {
            registry.get('serverStatusService').updateServerStatus('loggedout');
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
            registry.get('errorHandlerService').handleError(error, '同步到服务器失败', true);
            registry.get('serverStatusService').updateServerStatus('offline');
            return false;
        }
    }
};

export { stateUtils };
export default stateUtils;
