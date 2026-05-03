/**
 * 数据服务模块
 * 负责数据的存储、读取和同步
 */

class DataService {
    constructor() {
        this.localStorageKey = 'coursemanagerdata';
        this.supabaseClient = null;
    }

    /**
     * 初始化Supabase客户端
     * @param {Object} supabaseClient - Supabase客户端实例
     */
    init(supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    /**
     * 从本地存储读取数据
     * @returns {Object} 本地存储的数据
     */
    getLocalData() {
        try {
            const dataStr = localStorage.getItem(this.localStorageKey);
            return dataStr ? JSON.parse(dataStr) : null;
        } catch (error) {
            console.error('从本地存储读取数据失败:', error);
            return null;
        }
    }

    /**
     * 保存数据到本地存储
     * @param {Object} data - 要保存的数据
     * @returns {boolean} 是否保存成功
     */
    saveLocalData(data) {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('保存数据到本地存储失败:', error);
            return false;
        }
    }

    /**
     * 从服务器加载数据
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} 服务器数据
     */
    async loadFromServer(userId) {
        if (!this.supabaseClient) {
            throw new Error('Supabase客户端未初始化');
        }

        try {
            const { data, error } = await this.supabaseClient
                .from('coursemanagerdata')
                .select('*')
                .eq('userid', userId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('从服务器加载数据失败:', error);
            throw error;
        }
    }

    /**
     * 同步数据到服务器
     * @param {string} userId - 用户ID
     * @param {Object} data - 要同步的数据
     * @returns {Promise<boolean>} 是否同步成功
     */
    async syncToServer(userId, data) {
        if (!this.supabaseClient) {
            throw new Error('Supabase客户端未初始化');
        }

        try {
            const { error } = await this.supabaseClient
                .from('coursemanagerdata')
                .upsert({
                    userid: userId,
                    students: data.students,
                    courses: data.courses,
                    organizations: data.organizations,
                    grades: data.grades,
                    organizationColors: data.organizationColors || {},
                    gradeColors: data.gradeColors || {},
                    lastupdated: data.lastupdated
                }, { onConflict: 'userid' });

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('同步数据到服务器失败:', error);
            throw error;
        }
    }

    /**
     * 比较本地和服务器数据的时间戳
     * @param {Object} localData - 本地数据
     * @param {Object} serverData - 服务器数据
     * @returns {number} 比较结果: 1=本地较新, -1=服务器较新, 0=相同
     */
    compareDataTimestamp(localData, serverData) {
        if (!localData || !localData.lastupdated) return -1;
        if (!serverData || !serverData.lastupdated) return 1;

        const localTimestamp = new Date(localData.lastupdated).getTime();
        const serverTimestamp = new Date(serverData.lastupdated).getTime();

        if (localTimestamp > serverTimestamp) return 1;
        if (localTimestamp < serverTimestamp) return -1;
        return 0;
    }

    /**
     * 检查数据是否有差异
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
     * 生成当前时间的ISO字符串
     * @returns {string} ISO格式的时间字符串
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /**
     * 统一保存应用数据（供上层服务调用）
     * @param {Object} state - 应用状态对象
     * @returns {boolean} 是否保存成功
     */
    saveAppData(state) {
        const appData = {
            students: state.students,
            courses: state.courses,
            organizations: state.organizations,
            grades: state.grades,
            organizationColors: state.organizationColors || {},
            gradeColors: state.gradeColors || {},
            lastupdated: this.getCurrentTimestamp()
        };
        return this.saveLocalData(appData);
    }
}

// 导出单例实例
const dataService = new DataService();
export default dataService;