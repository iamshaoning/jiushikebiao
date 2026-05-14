/**
 * 状态管理服务
 *
 * @description 管理应用全局状态（学生、课程、机构、年级数据），提供 setState/updateStateFromData 接口
 * @module stateService
 */
import { registry } from '../core/registry.js';

class StateService {
    constructor() {
        this.state = {
            currentDate: new Date(),
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            students: [],
            courses: [],
            organizations: [],
            grades: [],
            organizationColors: {},
            gradeColors: {},
            lastupdated: null
        };
    }

    getState() {
        return this.state;
    }

    setState(updater, scope = null) {
        updater(this.state);
        registry.get('serverStatusService').setSyncing();
        registry.get('utils').debouncedSaveData();
        registry.get('utils').refreshAllViews(scope);
    }

    updateStateFromData(data, useDefaults = true) {
        const defaults = { organizations: [], grades: [], organizationColors: {}, gradeColors: {} };
        this.state.students = data.students || [];
        this.state.courses = data.courses || [];
        this.state.organizations = data.organizations || (useDefaults ? defaults.organizations : []);
        this.state.grades = data.grades || (useDefaults ? defaults.grades : []);
        this.state.organizationColors = data.organizationColors || {};
        this.state.gradeColors = data.gradeColors || {};
        this.state.lastupdated = data.lastupdated;
        registry.get('utils').initColorsFromState();
        registry.get('utils').refreshAllViews(true);
    }

    init() {}
}

const stateService = new StateService();
export default stateService;
