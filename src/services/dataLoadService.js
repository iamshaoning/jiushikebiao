class DataLoadService {
    constructor(state, notificationService, serverStatusService, utils) {
        this.state = state;
        this.utils = utils || window.utils || {};
        this.notificationService = notificationService || window.notificationService || {
            show: (msg, type) => console.log(`[通知] ${type}: ${msg}`)
        };
        this.serverStatusService = serverStatusService || window.serverStatusService || {
            setSyncing: () => {},
            updateServerStatus: () => {}
        };
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

    async loadData() {
        try {
            const auth = window.supabaseAuth;
            if (!auth) {
                console.error('[数据加载] Supabase auth 未初始化');
                this.notificationService.show('系统未正确初始化', 'error');
                return;
            }

            let sessionData;
            try {
                sessionData = await auth.getSession();
            } catch (sessionError) {
                console.error('[数据加载] 获取 session 失败:', sessionError);
                sessionData = { data: { session: null } };
            }

            const session = sessionData?.data?.session || sessionData?.session;
            const isLoggedIn = !!session;

            if (window.GLOBAL_DEBUG) console.log('[数据加载] 会话状态:', isLoggedIn ? '已登录' : '未登录');

            const defaults = {
                students: [],
                courses: [],
                organizations: [],
                grades: []
            };

            if (!isLoggedIn) {
                this.state.students = [];
                this.state.courses = [];
                this.state.organizations = defaults.organizations;
                this.state.grades = defaults.grades;
            }

            if (window.supabaseClient && isLoggedIn) {
                const userId = session.user.id;

                if (window.GLOBAL_DEBUG) console.log('[数据加载] 用户已登录，建立实时频道, userId:', userId);

                if (!window.realtimeChannel) {
                    if (window.GLOBAL_DEBUG) console.log('[实时监听] 准备建立实时频道...');
                    try {
                        window.realtimeChannel = window.supabaseClient
                            .channel('course-manager-channel')
                            .on('postgres_changes', {
                                event: '*',
                                schema: 'public',
                                table: 'coursemanagerdata',
                                filter: `userid=eq.${userId}`
                            }, (payload) => {
                                if (window.GLOBAL_DEBUG) console.log('[实时监听] ====== 收到实时事件 ======');
                                try {
                                    if (window.GLOBAL_DEBUG) console.log('[实时监听] 事件类型:', payload.eventType);
                                    
                                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                                        const serverData = payload.new;
                                        if (window.GLOBAL_DEBUG) console.log('[实时监听] 服务器完整数据:', JSON.stringify(serverData, null, 2));
                                        
                                        const localDataStr = localStorage.getItem('coursemanagerdata');
                                        const localData = localDataStr ? JSON.parse(localDataStr) : null;
                                        const localTimestamp = this.utils.getTimestamp(localData?.lastupdated);
                                        const serverTimestamp = this.utils.getTimestamp(serverData.lastupdated);

                                        if (window.GLOBAL_DEBUG) console.log(`[实时监听] 服务器时间戳: ${serverTimestamp}, 本地时间戳: ${localTimestamp}`);
                                        if (window.GLOBAL_DEBUG) console.log(`[实时监听] 服务器数据 organizationColors:`, JSON.stringify(serverData.organizationColors));
                                        if (window.GLOBAL_DEBUG) console.log(`[实时监听] 服务器数据 gradeColors:`, JSON.stringify(serverData.gradeColors));

                                        if (serverTimestamp > localTimestamp) {
                                            if (window.GLOBAL_DEBUG) console.log('[实时监听] 服务器数据更新，同步到本地');
                                            this.utils.updateStateFromData(serverData, false);
                                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                                            if (window.GLOBAL_DEBUG) console.log('[实时监听] 调用 refreshAllViews()');
                                            this.utils.refreshAllViews(true);
                                        } else {
                                            if (window.GLOBAL_DEBUG) console.log('[实时监听] 本地数据更新，忽略服务器数据');
                                        }
                                    }
                                } catch (error) {
                                    console.error('[实时监听] 处理实时数据变化失败:', error);
                                    this.utils.handleError?.(error, '处理实时数据变化失败');
                                }
                            })
                            .subscribe((status) => {
                                if (window.GLOBAL_DEBUG) console.log('[实时监听] 订阅状态:', status);
                            });
                        if (window.GLOBAL_DEBUG) console.log('[实时监听] 实时频道已建立');
                    } catch (error) {
                        console.error('[实时监听] 建立实时数据连接失败:', error);
                        this.utils.handleError?.(error, '建立实时数据连接失败');
                    }
                } else {
                    if (window.GLOBAL_DEBUG) console.log('[数据加载] 实时频道已存在，跳过建立');
                }

                const localDataStr = localStorage.getItem('coursemanagerdata');
                const localData = localDataStr ? JSON.parse(localDataStr) : null;

                if (localData) {
                    this.utils.updateStateFromData(localData);
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
                                , 5000, '创建初始数据超时');
                                this.serverStatusService.updateServerStatus('online');
                            } catch (error) {
                                if (window.GLOBAL_DEBUG) console.error('[数据加载] 创建初始数据失败:', error);
                                this.utils.handleError(error, '创建初始数据失败', true);
                                this.serverStatusService.updateServerStatus('offline');
                            }

                            this.utils.updateStateFromData({});
                            this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);
                        } else {
                            throw error;
                        }
                    } else {
                        const localTimestamp = this.utils.getTimestamp(localData?.lastupdated);
                        const serverTimestamp = this.utils.getTimestamp(serverData.lastupdated);

                        if (serverTimestamp > localTimestamp) {
                            this.utils.updateStateFromData(serverData, false);
                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
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
                    }
                } catch (error) {
                    if (window.GLOBAL_DEBUG) console.error('[数据加载] 从服务器加载数据失败:', error);
                    this.utils.handleError(error, '从服务器加载数据失败');
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
            if (window.GLOBAL_DEBUG) console.error('[数据加载] 加载数据失败:', error);
            this.utils.handleError(error, '加载数据失败', true);
            this.utils.updateStateFromData({});
        }
    }
}

export default DataLoadService;
