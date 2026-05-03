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
    }

    /**
     * 从Supabase加载数据并同步
     * @description 检查用户登录状态，从Supabase加载数据，并与本地数据同步
     * @returns {Promise<void>} 无返回值
     */
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

            const localDataStr = localStorage.getItem('coursemanagerdata');
            const localData = localDataStr ? JSON.parse(localDataStr) : null;

            if (localData && currentUserId && localData.userid !== currentUserId) {
                localStorage.removeItem('coursemanagerdata');
                this.state.students = [];
                this.state.courses = [];
                this.state.organizations = defaults.organizations;
                this.state.grades = defaults.grades;
            }

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

                                        console.log(`[实时监听] 服务器时间戳: ${serverTimestamp}, 本地时间戳: ${localTimestamp}`);

                                        if (serverTimestamp > localTimestamp) {
                                            console.log('[实时监听] 服务器数据更新，同步到本地');
                                            this.utils.updateStateFromData(serverData, false);
                                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                                            this.utils.refreshAllViews(true);
                                        } else {
                                            console.log('[实时监听] 本地数据更新，忽略服务器数据');
                                        }
                                    }
                                } catch (error) {
                                    this.utils.handleError(error, '处理实时数据变化失败');
                                }
                            })
                            .subscribe();
                    } catch (error) {
                        this.utils.handleError(error, '建立实时数据连接失败');
                    }
                }

                const localDataStr = localStorage.getItem('coursemanagerdata');
                const localData = localDataStr ? JSON.parse(localDataStr) : null;

                // 注意：先不立即刷新视图，等服务器加载完成后统一处理
                if (localData) {
                    this.utils.updateStateFromData(localData);
                } else {
                    this.utils.updateStateFromData({});
                }
                // 延迟刷新，避免重复渲染
                // this.utils.refreshAllViews(true);

                try {
                    const { data: serverData, error } = await this.utils.withTimeout(() =>
                        window.supabaseClient
                            .from('coursemanagerdata')
                            .select('*')
                            .eq('userid', userId)
                            .single()
                    , 10000, '加载数据超时');

                    if (error) {
                        // PGRST116 表示查询返回 0 行，这是新用户的正常情况
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
                                
                                // 创建初始数据后，更新本地状态并刷新视图
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
                        
                        // 其他错误
                        this.utils.handleError(error, '从服务器加载数据失败');
                        this.serverStatusService.updateServerStatus('offline');
                        return;
                    }

                    const localTimestamp = this.utils.getTimestamp(localData?.lastupdated);

                    if (serverData) {
                        const serverTimestamp = this.utils.getTimestamp(serverData.lastupdated);

                        if (localData) {
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
                                                students: localData.students,
                                                courses: localData.courses,
                                                organizations: localData.organizations,
                                                grades: localData.grades,
                                                organizationColors: localData.organizationColors || {},
                                                gradeColors: localData.gradeColors || {},
                                                lastupdated: localData.lastupdated
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
                    } else if (localData) {
                        const insertData = {
                            userid: userId,
                            students: localData.students,
                            courses: localData.courses,
                            organizations: localData.organizations,
                            grades: localData.grades,
                            organizationColors: localData.organizationColors || {},
                            gradeColors: localData.gradeColors || {},
                            lastupdated: localData.lastupdated
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

                        this.utils.updateStateFromData(localData);
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
                            if (window.GLOBAL_DEBUG) console.error('创建初始数据失败:', error);
                            this.utils.handleError(error, '创建初始数据失败', true);
                            this.serverStatusService.updateServerStatus('offline');
                        }

                        this.utils.updateStateFromData({});
                        this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);
                        this.utils.refreshAllViews(true);
                    }
                } catch (error) {
                    if (window.GLOBAL_DEBUG) console.error('从服务器加载数据失败:', error);
                    this.utils.handleError(error, '从服务器加载数据失败', true);
                    this.serverStatusService.updateServerStatus('offline');

                    const localDataStr = localStorage.getItem('coursemanagerdata');
                    const localData = localDataStr ? JSON.parse(localDataStr) : null;

                    if (localData) {
                        this.utils.updateStateFromData(localData);
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

                const localDataStr = localStorage.getItem('coursemanagerdata');
                const localData = localDataStr ? JSON.parse(localDataStr) : null;

                if (localData) {
                    this.utils.updateStateFromData(localData);
                } else {
                    this.utils.updateStateFromData({});
                    this.notificationService.show('无法连接到服务器，请检查网络连接', 'error');
                }

                this.utils.refreshAllViews(true);
            }
        } catch (error) {
            this.utils.handleError(error, '加载数据失败', true);
            this.utils.updateStateFromData({});
            this.utils.refreshAllViews(true);
        } finally {
            this.utils.startAutoSnapshotTimer();
        }
    }

    /**
     * 设置当前设备ID
     * @param {string} deviceId - 设备ID
     */
    setDeviceId(deviceId) {
        this.currentDeviceId = deviceId;
    }
}

export default DataLoadService;