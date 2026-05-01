/**
 * 数据比较服务模块
 * 负责比较本地和服务器数据差异等功能
 */

export class DataCompareService {
    constructor(state, notificationService, viewRefreshService) {
        this.state = state;
        this.notificationService = notificationService;
        this.viewRefreshService = viewRefreshService;
    }

    /**
     * 检查本地和服务器数据是否有差异
     * @param {Object} localData - 本地数据
     * @param {Object} serverData - 服务器数据
     * @returns {boolean} 是否有差异
     */
    checkDataDifference(localData, serverData) {
        // 检查数据是否存在
        if (!localData || !serverData) {
            return true;
        }

        // 比较数据长度
        const localStats = {
            students: localData?.students?.length || 0,
            courses: localData?.courses?.length || 0,
            organizations: localData?.organizations?.length || 0,
            grades: localData?.grades?.length || 0
        };

        const serverStats = {
            students: serverData?.students?.length || 0,
            courses: serverData?.courses?.length || 0,
            organizations: serverData?.organizations?.length || 0,
            grades: serverData?.grades?.length || 0
        };

        // 比较各个数据长度
        if (localStats.students !== serverStats.students) return true;
        if (localStats.courses !== serverStats.courses) return true;
        if (localStats.organizations !== serverStats.organizations) return true;
        if (localStats.grades !== serverStats.grades) return true;

        // 比较最后更新时间
        if (localData.lastupdated !== serverData.lastupdated) return true;

        // 数据没有差异
        return false;
    }

    /**
     * 比较本地和服务器数据
     * @param {Object} utils - 工具函数对象
     */
    async compareLocalAndServerData(utils) {
        // 触发数据比较
        const localDataStr = localStorage.getItem('coursemanagerdata');
        const localData = localDataStr ? JSON.parse(localDataStr) : null;

        // 检查用户是否已登录
        const auth = window.supabaseAuth;
        if (!auth) {
            this.notificationService.show('认证服务未初始化', 'error');
            return;
        }

        try {
            const { data } = await auth.getSession();
            const session = data.session;
            const isLoggedIn = !!session;

            if (isLoggedIn && window.supabaseClient) {
                const userId = session.user.id;
                // 从服务器加载数据
                try {
                    const { data: serverData, error } = await window.supabaseClient
                        .from('coursemanagerdata')
                        .select('*')
                        .eq('userid', userId)
                        .single();

                    if (!error && serverData) {
                        // 比较本地和服务器数据的时间戳
                        const localTimestamp = utils.getTimestamp(localData?.lastupdated);
                        const serverTimestamp = utils.getTimestamp(serverData.lastupdated);

                        if (serverTimestamp > localTimestamp) {
                            // 服务器数据较新，直接更新
                            utils.updateStateFromData(serverData, false);
                            localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                            this.viewRefreshService.refreshAllViews(true);
                        } else if (localTimestamp > serverTimestamp) {
                            // 本地数据较新，直接上传
                            utils.saveData();
                        }
                    } else {
                        this.notificationService.show('无法连接到服务器，请检查网络连接', 'error');
                    }
                } catch (error) {
                    if (window.GLOBAL_DEBUG) console.error('从服务器加载数据失败:', error);
                    this.notificationService.show('无法连接到服务器，请检查网络连接', 'error');
                }
            } else {
                this.notificationService.show('请先登录', 'warning');
            }
        } catch (error) {
            if (window.GLOBAL_DEBUG) console.error('获取 session 失败:', error);
            this.notificationService.show('请先登录', 'warning');
        }
    }
}
