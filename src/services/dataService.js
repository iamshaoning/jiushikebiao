/**
 * 数据服务
 *
 * @description 数据的本地存储读取、数据差异比较
 * @module dataService
 */
class DataService {
    constructor() {
        this.localStorageKey = 'coursemanagerdata';
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

        if (JSON.stringify(localData.organizationColors) !== JSON.stringify(serverData.organizationColors)) return true;
        if (JSON.stringify(localData.gradeColors) !== JSON.stringify(serverData.gradeColors)) return true;

        if (localData.lastupdated !== serverData.lastupdated) return true;

        return false;
    }
}

const dataService = new DataService();
export default dataService;