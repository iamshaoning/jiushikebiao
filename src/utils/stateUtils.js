/**
 * 状态和数据管理模块
 * 提供状态更新、数据保存、同步到服务器等功能
 * 
 * @module stateUtils
 * @exports stateUtils
 */

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
    updateStateFromData: (data, useDefaults = true) => {
        const defaults = { organizations: [], grades: [], organizationColors: {}, gradeColors: {} };
        window.state.students = data.students || [];
        window.state.courses = data.courses || [];
        window.state.organizations = data.organizations || (useDefaults ? defaults.organizations : []);
        window.state.grades = data.grades || (useDefaults ? defaults.grades : []);
        
        // 检测颜色变化
        const oldOrgColors = JSON.stringify(window.state.organizationColors || {});
        const oldGradeColors = JSON.stringify(window.state.gradeColors || {});
        
        window.state.organizationColors = data.organizationColors || {};
        window.state.gradeColors = data.gradeColors || {};
        window.state.lastupdated = data.lastupdated;
        
        try {
            if (window.utils && typeof window.utils.initColorsFromState === 'function') {
                window.utils.initColorsFromState();
            }
        } catch (error) {
            if (window.GLOBAL_DEBUG) console.error('初始化颜色失败:', error);
        }
        
        try {
            if (typeof window.syncDataToMaps === 'function') {
                window.syncDataToMaps();
            }
        } catch (error) {
            if (window.GLOBAL_DEBUG) console.error('同步数据到Maps失败:', error);
        }
        
        // 如果颜色发生变化，更新DOM中的颜色标签
        const newOrgColors = JSON.stringify(window.state.organizationColors);
        const newGradeColors = JSON.stringify(window.state.gradeColors);
        const orgColorsChanged = oldOrgColors !== newOrgColors;
        const gradeColorsChanged = oldGradeColors !== newGradeColors;
        
        if (orgColorsChanged || gradeColorsChanged) {
            if (window.GLOBAL_DEBUG) console.log('[颜色同步] 检测到颜色变化，更新DOM标签');
            stateUtils.updateColorLabelsInDOM(orgColorsChanged, gradeColorsChanged);
        }
    },
    
    updateColorLabelsInDOM: (updateOrg = true, updateGrade = true) => {
        try {
            // 更新机构颜色标签（机构管理模态框中的标签）
            if (updateOrg) {
                const orgLabels = document.querySelectorAll('[data-item-name="机构"].color-picker-trigger');
                if (window.GLOBAL_DEBUG) console.log('[颜色同步] 找到机构标签:', orgLabels.length);
                
                orgLabels.forEach(label => {
                    const orgName = label.dataset.item;
                    if (orgName) {
                        const color = window.utils.generateColor(orgName, 'organization');
                        label.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                        label.style.color = color;
                        label.dataset.color = color;
                    }
                });
            }
            
            // 更新年级颜色标签（年级管理模态框中的标签）
            if (updateGrade) {
                const gradeLabels = document.querySelectorAll('[data-item-name="年级"].color-picker-trigger');
                if (window.GLOBAL_DEBUG) console.log('[颜色同步] 找到年级标签:', gradeLabels.length);
                
                gradeLabels.forEach(label => {
                    const gradeName = label.dataset.item;
                    if (gradeName) {
                        const color = window.utils.generateColor(gradeName, 'grade');
                        label.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                        label.style.color = color;
                        label.dataset.color = color;
                    }
                });
            }
            
            // 更新学生列表中的机构和年级标签
            const studentRows = document.querySelectorAll('.students-list .flex.items-center.p-4');
            if (window.GLOBAL_DEBUG) console.log('[颜色同步] 找到学生行:', studentRows.length);
            
            studentRows.forEach(row => {
                // 更新机构标签颜色
                const orgSpan = row.querySelector('span.px-2');
                if (orgSpan) {
                    const orgName = orgSpan.textContent?.trim();
                    if (orgName && updateOrg) {
                        const color = window.utils.generateColor(orgName, 'organization');
                        orgSpan.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                        orgSpan.style.color = color;
                    }
                    
                    // 更新年级标签颜色（下一个兄弟节点）
                    const gradeSpan = orgSpan?.nextElementSibling;
                    if (gradeSpan && gradeSpan.tagName === 'SPAN' && gradeSpan.classList.contains('px-2') && updateGrade) {
                        const gradeName = gradeSpan.textContent?.trim();
                        if (gradeName) {
                            const color = window.utils.generateColor(gradeName, 'grade');
                            gradeSpan.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                            gradeSpan.style.color = color;
                        }
                    }
                }
            });
            
            // 更新机构列表中的颜色标签
            const orgListItems = document.querySelectorAll('#机构s-list [data-机构]');
            if (window.GLOBAL_DEBUG) console.log('[颜色同步] 找到机构列表项:', orgListItems.length);
            
            orgListItems.forEach(item => {
                const orgBtn = item.querySelector('.color-picker-trigger');
                if (orgBtn) {
                    const orgName = orgBtn.dataset.item;
                    if (orgName && updateOrg) {
                        const color = window.utils.generateColor(orgName, 'organization');
                        orgBtn.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                        orgBtn.style.color = color;
                        orgBtn.dataset.color = color;
                    }
                }
            });
            
            // 更新年级列表中的颜色标签
            const gradeListItems = document.querySelectorAll('#年级s-list [data-年级]');
            if (window.GLOBAL_DEBUG) console.log('[颜色同步] 找到年级列表项:', gradeListItems.length);
            
            gradeListItems.forEach(item => {
                const gradeBtn = item.querySelector('.color-picker-trigger');
                if (gradeBtn) {
                    const gradeName = gradeBtn.dataset.item;
                    if (gradeName && updateGrade) {
                        const color = window.utils.generateColor(gradeName, 'grade');
                        gradeBtn.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
                        gradeBtn.style.color = color;
                        gradeBtn.dataset.color = color;
                    }
                }
            });
            
        } catch (error) {
            if (window.GLOBAL_DEBUG) console.error('更新DOM颜色标签失败:', error);
        }
    },
    
    getStatisticsParams: function() {
        const yearTrigger = window.elements?.statisticsYearTrigger || document.querySelector('#statistics-year-wrapper .custom-select-trigger span');
        const monthTrigger = window.elements?.statisticsMonthTrigger || document.querySelector('#statistics-month-wrapper .custom-select-trigger span');
        const orgTrigger = window.elements?.statisticsOrganizationTrigger || document.querySelector('#statistics-organization-trigger span');
        
        const monthText = monthTrigger?.textContent?.trim() || '';
        const parsedMonth = parseInt(monthText, 10);
        const monthNum = isNaN(parsedMonth) ? (new Date().getMonth() + 1) : parsedMonth;
        
        const orgText = orgTrigger?.textContent?.trim() || '';
        const organization = orgText === '全部机构' ? '' : orgText;
        
        const yearText = yearTrigger?.textContent?.trim() || '';
        const parsedYear = parseInt(yearText, 10);
        const year = isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;
        
        return {
            year: year,
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
                organizationColors: currentState.organizationColors || {},
                gradeColors: currentState.gradeColors || {},
                lastupdated: isoDateTimeString
            };
            
            currentState.lastupdated = appData.lastupdated;
            
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
            } catch (error) {
                console.error('本地保存失败:', error);
            }
            
            const isOffline = window.elements?.syncIcon?.classList.contains('sync-offline');
            
            if (!isOffline && window.serverStatusService) {
                window.serverStatusService.setSyncing();
                
                const auth = window.supabaseAuth;
                
                if (window.supabaseClient && auth) {
                    try {
                        let sessionData = null;
                        try {
                            let result;
                            if (window.utils?.withTimeout) {
                                result = await window.utils.withTimeout(() => auth.getSession(), CONSTANTS.SESSION_TIMEOUT, '获取会话超时');
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
                            console.error('获取session异常:', sessionError);
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
                                
                                const upsertPromise = window.supabaseClient
                                    .from('coursemanagerdata')
                                    .upsert(upsertData, { onConflict: 'userid' });
                                
                                let upsertResult;
                                if (window.utils?.withTimeout) {
                                    upsertResult = await window.utils.withTimeout(() => upsertPromise, CONSTANTS.SYNC_TIMEOUT, '同步数据超时');
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
                                    window.serverStatusService.updateServerStatus('online');
                                }
                            } catch (syncError) {
                                if (window.utils?.handleError) {
                                    window.utils.handleError(syncError, '同步数据到服务器失败', true);
                                } else {
                                    console.error('同步数据到服务器失败:', syncError);
                                }
                                window.serverStatusService.updateServerStatus('offline');
                            }
                        } else {
                            if (window.GLOBAL_DEBUG) console.log('session不存在或userId无效，跳过服务器同步');
                            window.serverStatusService.updateServerStatus('loggedout');
                        }
                    } catch (error) {
                        if (window.utils?.handleError) {
                            window.utils.handleError(error, '获取 session 失败', true);
                        } else {
                            console.error('获取 session 失败:', error);
                        }
                        window.serverStatusService.updateServerStatus('loggedout');
                    }
                } else {
                    window.serverStatusService.updateServerStatus('loggedout');
                }
            }
        } catch (error) {
            if (window.utils?.handleError) {
                window.utils.handleError(error, '保存数据失败', true);
            } else {
                console.error('保存数据失败:', error);
            }
            try {
                const now = new Date();
                const isoDateTimeString = now.toISOString();
                const currentState = window.state;
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
                if (window.GLOBAL_DEBUG) console.error('本地存储也失败:', localError);
            }
        }
    },
    
    debouncedSaveData: null,
    debouncedSyncToServer: null,
    
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
            const localDataStr = localStorage.getItem(LOCAL_STORAGE_KEY);
            
            if (!localDataStr) {
                window.serverStatusService.updateServerStatus('online');
                return true;
            }
            
            let localData;
            try {
                localData = JSON.parse(localDataStr);
            } catch (parseError) {
                if (window.GLOBAL_DEBUG) console.error('解析本地数据失败:', parseError);
                return false;
            }
            
            const { error } = await window.supabaseClient
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
            
            window.serverStatusService.updateServerStatus('online');
            return true;
        } catch (error) {
            if (window.utils?.handleError) {
                window.utils.handleError(error, '同步到服务器失败', true);
            } else {
                console.error('同步到服务器失败:', error);
            }
            window.serverStatusService.updateServerStatus('offline');
            return false;
        }
    },
    
    initDebouncedSave: function() {
        const debounce = window.coreUtils?.debounce;
        if (typeof debounce !== 'function') {
            console.error('coreUtils.debounce not found');
            return;
        }
        this.debouncedSaveData = debounce(this.saveData.bind(this), CONSTANTS.DEBOUNCE_SAVE_DELAY);
        this.debouncedSyncToServer = debounce(this.syncToServer.bind(this), CONSTANTS.DEBOUNCE_SYNC_DELAY);
    }
};

export { stateUtils, CONSTANTS };
export default stateUtils;
