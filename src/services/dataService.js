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

        if (localData.students?.length !== serverData.students?.length) return true;
        if (localData.courses?.length !== serverData.courses?.length) return true;
        if (localData.organizations?.length !== serverData.organizations?.length) return true;
        if (localData.grades?.length !== serverData.grades?.length) return true;

        if (JSON.stringify(localData.organizationColors) !== JSON.stringify(serverData.organizationColors)) return true;
        if (JSON.stringify(localData.gradeColors) !== JSON.stringify(serverData.gradeColors)) return true;

        if (localData.lastupdated !== serverData.lastupdated) return true;

        if (JSON.stringify(localData.students) !== JSON.stringify(serverData.students)) return true;
        if (JSON.stringify(localData.courses) !== JSON.stringify(serverData.courses)) return true;
        if (JSON.stringify(localData.organizations) !== JSON.stringify(serverData.organizations)) return true;
        if (JSON.stringify(localData.grades) !== JSON.stringify(serverData.grades)) return true;

        return false;
    }
}

const dataService = new DataService();
export default dataService;