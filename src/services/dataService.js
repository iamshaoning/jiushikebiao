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
     * 检查数据是否有差异
     * @param {Object} localData - 本地数据
     * @param {Object} serverData - 服务器数据
     * @returns {boolean} 是否有差异
     */
    checkDataDifference(localData, serverData) {
        if (!localData || !serverData) {
            return true;
        }

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

        if (localStats.students !== serverStats.students) return true;
        if (localStats.courses !== serverStats.courses) return true;
        if (localStats.organizations !== serverStats.organizations) return true;
        if (localStats.grades !== serverStats.grades) return true;
        if (localData.organizationColors !== serverData.organizationColors) return true;
        if (localData.gradeColors !== serverData.gradeColors) return true;

        if (localData.lastupdated !== serverData.lastupdated) return true;

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