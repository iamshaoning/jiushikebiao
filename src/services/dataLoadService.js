/**
 * 数据加载服务模块
 * 负责从服务器加载数据、与本地数据同步、处理实时数据监听等功能
 */

class DataLoadService {
    constructor(state, notificationService, serverStatusService, utils) {
        this.state = state;
        this.notificationService = notificationService;
        this.serverStatusService = serverStatusService;
        this.utils = utils;
        this.currentDeviceId = this.getDeviceId();
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    setDeviceId(deviceId) {
        this.currentDeviceId = deviceId;
    }

    async loadData() {
        const defaults = {
            organizations: [],
            grades: [],
            organizationColors: {},
            gradeColors: {}
        };

        try {
            const auth = window.supabaseAuth;
            let isLoggedIn = false;
            let session = null;

            if (auth) {
                try {
                    const result = await this.utils.withTimeout(() => auth.getSession(), 10000, '获取会话超时');
                    if (result && typeof result === 'object') {
                        if (result.data && typeof result.data === 'object') {
                            session = result.data.session;
                        } else if (result.session) {
                            session = result.session;
                        }
                    }
                    isLoggedIn = !!session;
                } catch (error) {
                    this.utils.handleError(error, '获取 session 失败');
                }
            }

            const currentUserId = session?.user?.id;

            // ================================================
            // 步骤 1：先读取并保存本地数据的原始状态（用于创建快照）
            // ================================================
            const originalLocalDataStr = localStorage.getItem('coursemanagerdata');
            const originalLocalData = originalLocalDataStr ? JSON.parse(originalLocalDataStr) : null;

            let shouldCreateLoginSnapshot = false;
            let isOtherAccountData = false;

            // 检查是否是其他账号的数据
            if (originalLocalData && currentUserId && originalLocalData.userid !== currentUserId) {
                isOtherAccountData = true;
            }

            // 检查是否需要创建登录快照（只有当前账号的数据才创建）
            if (originalLocalData && isLoggedIn && currentUserId && !isOtherAccountData) {
                if (!originalLocalData.userid || originalLocalData.userid === currentUserId) {
                    shouldCreateLoginSnapshot = true;
                }
            }

            // ================================================
            // 步骤 2：立即创建快照！（此时还没有任何数据同步操作）
            // ================================================
            if (shouldCreateLoginSnapshot && window.snapshotUtils) {
                await window.snapshotUtils.createSnapshot('login', false);
            }

            // ================================================
            // 步骤 3：处理账号数据问题
            // ================================================
            if (isOtherAccountData) {
                localStorage.removeItem('coursemanagerdata');
                this.state.students = [];
                this.state.courses = [];
                this.state.organizations = defaults.organizations;
                this.state.grades = defaults.grades;
            }

            // ================================================
            // 步骤 4：开始数据同步流程
            // ================================================
            if (window.supabaseClient && isLoggedIn) {
                const userId = session.user.id;

                if (!window.realtimeChannel) {
                    try {
                        window.realtimeChannel = window.supabaseClient
                            .channel('course-manager-channel')
                            .on('postgres_changes', {
                                event: '*',
                                schema: 'public',
                                table: 'coursemanagerdata',
                                filter: `userid=eq.${userId}`
                            }, (payload) => {
                                try {
                                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                                        const serverData = payload.new;
                                        
                                        const localDataStr = localStorage.getItem('coursemanagerdata');
                                        const localData = localDataStr ? JSON.parse(localDataStr) : null;
                                        const localTimestamp = this.utils.getTimestamp(localData?.lastupdated);
                                        const serverTimestamp = this.utils.getTimestamp(serverData.lastupdated);
                                        
                                        if (serverTimestamp > localTimestamp) {
                                            this.utils.updateStateFromData(serverData, false);
                                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                                            this.utils.refreshAllViews(true);
                                        }
                                    }
                                } catch (error) {
                                    console.error('[实时监听] 处理实时数据变化失败:', error);
                                    this.utils.handleError?.(error, '处理实时数据变化失败');
                                }
                            })
                            .subscribe((status) => {
                            });
                    } catch (error) {
                        this.utils.handleError(error, '建立实时数据连接失败');
                    }
                }

                // 加载本地数据到状态
                const currentLocalDataStr = localStorage.getItem('coursemanagerdata');
                const currentLocalData = currentLocalDataStr ? JSON.parse(currentLocalDataStr) : null;

                if (currentLocalData) {
                    this.utils.updateStateFromData(currentLocalData);
                } else {
                    this.utils.updateStateFromData({});
                }

                try {
                    const { data: serverData, error } = await this.utils.withTimeout(() =>
                        window.supabaseClient
                            .from('coursemanagerdata')
                            .select('*')
                            .eq('userid', userId)
                            .single()
                    , 10000, '加载数据超时');

                    if (error) {
                        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
                            const defaultData = {
                                userid: userId,
                                students: [],
                                courses: [],
                                organizations: [],
                                grades: [],
                                organizationColors: {},
                                gradeColors: {},
                                lastupdated: new Date().toISOString()
                            };

                            try {
                                await this.utils.withTimeout(() =>
                                    window.supabaseClient
                                        .from('coursemanagerdata')
                                        .insert(defaultData)
                                , 10000, '创建初始数据超时');
                                this.serverStatusService.updateServerStatus('online');

                                this.utils.updateStateFromData(defaultData, false);
                                localStorage.setItem('coursemanagerdata', JSON.stringify(defaultData));
                                this.utils.refreshAllViews(true);
                                this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);
                            } catch (insertError) {
                                this.utils.handleError(insertError, '创建初始数据失败', true);
                                this.serverStatusService.updateServerStatus('offline');
                                this.notificationService.show('数据加载失败，请刷新页面重试', 'error');
                            }
                            return;
                        }

                        this.utils.handleError(error, '从服务器加载数据失败');
                        this.serverStatusService.updateServerStatus('offline');
                        return;
                    }

                    const localTimestamp = this.utils.getTimestamp(currentLocalData?.lastupdated);

                    if (serverData) {
                        const serverTimestamp = this.utils.getTimestamp(serverData.lastupdated);

                        if (currentLocalData) {
                            if (serverTimestamp > localTimestamp) {
                                this.utils.updateStateFromData(serverData, false);
                                localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                                this.utils.refreshAllViews(true);
                                this.serverStatusService.updateServerStatus('online');
                            } else if (localTimestamp > serverTimestamp) {
                                try {
                                    await this.utils.withTimeout(() =>
                                        window.supabaseClient
                                            .from('coursemanagerdata')
                                            .upsert({
                                                userid: userId,
                                                students: currentLocalData.students,
                                                courses: currentLocalData.courses,
                                                organizations: currentLocalData.organizations,
                                                grades: currentLocalData.grades,
                                                organizationColors: currentLocalData.organizationColors || {},
                                                gradeColors: currentLocalData.gradeColors || {},
                                                lastupdated: currentLocalData.lastupdated
                                            })
                                    , 5000, '上传数据超时');
                                } catch (uploadError) {
                                    this.utils.handleError(uploadError, '上传数据失败');
                                }
                                this.serverStatusService.updateServerStatus('online');
                                this.utils.refreshAllViews(true);
                            } else {
                                this.serverStatusService.updateServerStatus('online');
                                this.utils.refreshAllViews(true);
                            }
                        } else {
                            this.utils.updateStateFromData(serverData, false);
                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                            this.utils.refreshAllViews(true);
                            this.serverStatusService.updateServerStatus('online');
                        }
                    } else if (currentLocalData) {
                        const insertData = {
                            userid: userId,
                            students: currentLocalData.students,
                            courses: currentLocalData.courses,
                            organizations: currentLocalData.organizations,
                            grades: currentLocalData.grades,
                            organizationColors: currentLocalData.organizationColors || {},
                            gradeColors: currentLocalData.gradeColors || {},
                            lastupdated: currentLocalData.lastupdated
                        };
                        if (this.currentDeviceId) {
                            insertData.device_id = this.currentDeviceId;
                        }
                        try {
                            await this.utils.withTimeout(() =>
                                window.supabaseClient
                                    .from('coursemanagerdata')
                                    .insert(insertData)
                            , 5000, '上传数据超时');
                            this.serverStatusService.updateServerStatus('online');
                        } catch (uploadError) {
                            this.utils.handleError(uploadError, '本地数据上传到服务器失败', true);
                            this.serverStatusService.updateServerStatus('offline');
                        }

                        this.utils.updateStateFromData(currentLocalData);
                        this.utils.refreshAllViews(true);
                    } else {
                        const now = new Date();
                        const isoDateTimeString = now.toISOString();

                        const defaultData = {
                            userid: userId,
                            students: [],
                            courses: [],
                            organizations: [],
                            grades: [],
                            organizationColors: {},
                            gradeColors: {},
                            lastupdated: isoDateTimeString
                        };
                        if (this.currentDeviceId) {
                            defaultData.device_id = this.currentDeviceId;
                        }

                        try {
                            await this.utils.withTimeout(() =>
                                window.supabaseClient
                                    .from('coursemanagerdata')
                                    .insert(defaultData)
                            , 5000, '创建初始数据超时');
                            this.serverStatusService.updateServerStatus('online');
                        } catch (error) {
                            this.utils.handleError(error, '创建初始数据失败', true);
                            this.serverStatusService.updateServerStatus('offline');
                        }

                        this.utils.updateStateFromData({});
                        this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);   
                        this.utils.refreshAllViews(true);
                    }
                } catch (error) {
                    console.error('从服务器加载数据失败:', error);
                    this.utils.handleError(error, '从服务器加载数据失败', true);
                    this.serverStatusService.updateServerStatus('offline');

                    const fallbackLocalDataStr = localStorage.getItem('coursemanagerdata');
                    const fallbackLocalData = fallbackLocalDataStr ? JSON.parse(fallbackLocalDataStr) : null;

                    if (fallbackLocalData) {
                        this.utils.updateStateFromData(fallbackLocalData);
                        this.notificationService.show('已使用本地缓存数据', 'info');
                    } else {
                        this.utils.updateStateFromData({});
                        this.notificationService.show('无法连接到服务器，请检查网络连接', 'error');
                    }

                    this.utils.refreshAllViews(true);
                }
            } else {
                if (!isLoggedIn) {
                    this.serverStatusService.updateServerStatus('loggedout');
                } else {
                    this.serverStatusService.updateServerStatus('offline');
                }

                const fallbackLocalDataStr = localStorage.getItem('coursemanagerdata');
                const fallbackLocalData = fallbackLocalDataStr ? JSON.parse(fallbackLocalDataStr) : null;

                if (fallbackLocalData) {
                    this.utils.updateStateFromData(fallbackLocalData);
                } else {
                    this.utils.updateStateFromData({});
                    this.notificationService.show('无法连接到服务器，请检查网络连接', 'error');
                }

                this.utils.refreshAllViews(true);
            }

            // 在完成所有步骤后，重新加载用户的时间轴
            if (window.timelineService && window.timelineService.reloadTimelineForUser) {
                await window.timelineService.reloadTimelineForUser();
            }
        } catch (error) {
            this.utils.handleError(error, '加载数据失败', true);
            this.utils.updateStateFromData({});
            this.utils.refreshAllViews(true);
        } finally {
            this.utils.startAutoSnapshotTimer();
        }
    }
}

export default DataLoadService;
