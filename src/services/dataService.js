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

    getLocalData() {
        try {
            const dataStr = localStorage.getItem(this.localStorageKey);
            return dataStr ? JSON.parse(dataStr) : null;
        } catch (error) {
            console.error('从本地存储读取数据失败:', error);
            return null;
        }
    }

    _normalize(obj) {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this._normalize(item));
        return Object.keys(obj).sort().reduce((result, key) => {
            result[key] = this._normalize(obj[key]);
            return result;
        }, {});
    }

    checkDataDifference(localData, serverData) {
        if (!localData || !serverData) {
            return true;
        }

        const fieldsToCompare = ['students', 'courses', 'organizations', 'grades', 'organizationColors', 'gradeColors'];
        for (const field of fieldsToCompare) {
            const localNormalized = JSON.stringify(this._normalize(localData[field]));
            const serverNormalized = JSON.stringify(this._normalize(serverData[field]));
            if (localNormalized !== serverNormalized) return true;
        }

        return false;
    }
}

const dataService = new DataService();
export default dataService;