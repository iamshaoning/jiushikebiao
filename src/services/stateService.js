/**
 * 状态服务模块
 * 负责管理应用全局状态，包括学生、课程、机构、年级数据等
 */
class StateService {
    constructor() {
        this.state = {
            currentDate: new Date(),
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            students: [],
            studentsMap: new Map(),
            courses: [],
            coursesByDate: new Map(),
            organizations: [],
            grades: [],
            organizationColors: {},
            gradeColors: {},
            lastupdated: null
        };
    }

    /**
     * 获取状态对象
     */
    getState() {
        return this.state;
    }

    /**
     * 同步数据到Map结构
     */
    syncDataToMaps() {
        this.state.studentsMap.clear();
        this.state.students.forEach(student => {
            this.state.studentsMap.set(student.id, student);
        });

        this.state.coursesByDate.clear();
        this.state.courses.forEach(course => {
            if (!this.state.coursesByDate.has(course.date)) {
                this.state.coursesByDate.set(course.date, []);
            }
            this.state.coursesByDate.get(course.date).push(course);
        });
    }

    /**
     * 更新状态
     * @param {Function} updater - 更新函数
     * @param {string|Array|null} scope - 刷新范围
     */
    setState(updater, scope = null) {
        const oldCourses = [...this.state.courses];
        
        updater(this.state);
        
        if (window.serverStatusService) {
            window.serverStatusService.setSyncing();
        }
        
        if (window.utils && window.utils.debouncedSaveData) {
            window.utils.debouncedSaveData();
        }
        
        if (window.utils && window.utils.refreshAllViews) {
            window.utils.refreshAllViews(scope);
        }
    }

    /**
     * 更新状态数据
     * @param {Object} data - 数据对象
     * @param {boolean} useDefaults - 是否使用默认值
     */
    updateStateFromData(data, useDefaults = true) {
        const oldCourses = [...this.state.courses];
        
        const defaults = { organizations: [], grades: [], organizationColors: {}, gradeColors: {} };
        this.state.students = data.students || [];
        this.state.courses = data.courses || [];
        this.state.organizations = data.organizations || (useDefaults ? defaults.organizations : []);
        this.state.grades = data.grades || (useDefaults ? defaults.grades : []);
        this.state.organizationColors = data.organizationColors || {};
        this.state.gradeColors = data.gradeColors || {};
        this.state.lastupdated = data.lastupdated;
        
        if (window.utils && window.utils.initColorsFromState) {
            window.utils.initColorsFromState();
        }
        
        this.syncDataToMaps();
        
        if (window.utils && window.utils.refreshAllViews) {
            window.utils.refreshAllViews(true);
        }
    }

    /**
     * 初始化服务
     */
    init() {
        window.state = this.state;
        window.setState = (updater, scope) => this.setState(updater, scope);
    }
}

const stateService = new StateService();
export default stateService;
