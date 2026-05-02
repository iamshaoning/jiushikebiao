/**
 * 系统加载服务模块
 * 处理系统初始化、试用模式、正常模式等加载逻辑
 */

class LoadSystemService {
    constructor() {
        this.state = null;
        this.elements = null;
        this.utils = null;
        this.render = null;
        this.themeService = null;
        this.authUIService = null;
        this.serverStatusService = null;
        this.notificationService = null;
        this.originalSaveData = null;
        this.originalLoadData = null;
        this.systemLoaded = false; // 标志位：系统是否已加载
    }

    /**
     * 初始化服务
     */
    init(state, elements, utils, render, themeService, authUIService, serverStatusService, notificationService) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
        this.render = render;
        this.themeService = themeService;
        this.authUIService = authUIService;
        this.serverStatusService = serverStatusService;
        this.notificationService = notificationService;
        this.originalSaveData = utils.saveData;
        this.originalLoadData = utils.loadData;
    }

    /**
     * 设置原始方法（用于试用模式恢复）
     */
    setOriginalMethods(saveData, loadData) {
        this.originalSaveData = saveData;
        this.originalLoadData = loadData;
    }

    /**
     * 加载系统
     * @param {boolean} isTrialMode - 是否为试用模式
     */
    async loadSystem(isTrialMode = false) {
        if (window.lucide) {
            lucide.createIcons();
        }

        const isSystemVisible =
            this.elements.nav &&
            this.elements.nav.style.display === 'block' &&
            this.elements.main &&
            this.elements.main.style.display === 'block';

        if (!isSystemVisible) {
            this.render.page('calendar-page');
            this.showSystemFramework();
            this.themeService.init();
        }

        this.utils.generateYearDropdowns();
        this.utils.generateMonthDropdowns();

        if (isTrialMode) {
            this.enterTrialMode();
        } else {
            await this.enterNormalMode();
        }
        
        this.systemLoaded = true;
    }

    /**
     * 显示系统框架
     */
    showSystemFramework() {
        if (this.elements.nav && this.elements.main) {
            document.body.style.opacity = '1';
            this.elements.nav.style.display = 'block';
            this.elements.main.style.display = 'block';
        }
    }

    /**
     * 进入试用模式
     */
    enterTrialMode() {
        this.authUIService.enterTrialMode();

        if (window.realtimeChannel) {
            try {
                window.realtimeChannel.unsubscribe();
                window.realtimeChannel = null;
            } catch (error) {
                if (window.GLOBAL_DEBUG) console.error('取消实时监听器订阅失败:', error);
            }
        }

        this.state.students = [];
        this.state.courses = [];
        this.state.organizations = [];
        this.state.grades = [];
        this.state.organizationColors = {};
        this.state.gradeColors = {};

        localStorage.removeItem('coursemanagerdata');

        this.notificationService.show('您现在处于试用模式，数据不会被保存', 'info');

        this.render.students();
        this.render.calendar();
        const { year, month, organization } = this.utils.getStatisticsParams();
        this.render.statistics(year, month, organization);

        this.utils.saveData = () => {
            this.render.students();
            this.render.calendar();
            const params = this.utils.getStatisticsParams();
            this.render.statistics(params.year, params.month, params.organization);
        };

        this.utils.loadData = () => {};
    }

    /**
     * 退出试用模式
     */
    exitTrialMode() {
        this.authUIService.exitTrialMode();

        if (this.originalSaveData) {
            this.utils.saveData = this.originalSaveData;
        }
        if (this.originalLoadData) {
            this.utils.loadData = this.originalLoadData;
        }
    }

    /**
     * 进入正常模式
     */
    async enterNormalMode() {
        this.exitTrialMode();
        this.serverStatusService.startMonitoring();
        
        try {
            await this.utils.loadData();
        } catch (error) {
            if (window.GLOBAL_DEBUG) console.error('加载数据失败:', error);
            // 即使加载失败，也确保刷新视图
            this.utils.refreshAllViews(true);
        }
    }
}

export default LoadSystemService;