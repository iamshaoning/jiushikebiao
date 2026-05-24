/**
 * 系统加载服务
 *
 * @description 编排系统完整加载流程：认证检查、数据加载、Realtime 连接、视图初始化
 * @module loadSystemService
 */
import { registry } from '../core/registry.js';

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
        this.loginSnapshotCreated = false; // 标志位：登录快照是否已创建
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
     * 加载系统
     * @param {boolean} isTrialMode - 是否为试用模式
     */
    async loadSystem(isTrialMode = false) {
        if (this.systemLoaded) return;

        if (registry.get('lucide')) {
            registry.get('lucide').createIcons();
        }

        const isSystemVisible =
            this.elements.nav &&
            this.elements.nav.style.display === 'block' &&
            this.elements.main &&
            this.elements.main.style.display === 'block';

        if (!isSystemVisible) {
            const currentHash = window.location.hash.slice(1) || '/';
            const pageMap = {
                '/': 'calendar-page',
                '/calendar': 'calendar-page',
                '/students': 'students-page',
                '/statistics': 'statistics-page'
            };
            this.render.page(pageMap[currentHash] || 'calendar-page');
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

        if (registry.get('realtimeChannel')) {
            try {
                registry.get('realtimeChannel').unsubscribe();
                registry.set('realtimeChannel', null);
            } catch (error) {
                console.error('取消实时监听器订阅失败:', error);
            }
        }

        this.state.students = [];
        this.state.courses = [];
        this.state.organizations = [];
        this.state.grades = [];
        this.state.organizationColors = {};
        this.state.gradeColors = {};

        localStorage.removeItem('coursemanagerdata');
        
        // 重置时间轴服务状态，避免显示其他账号的历史操作记录
        // 注意：不删除 localStorage 中的时间轴数据，只重置内存中的状态
        if (registry.get('timelineService')) {
            registry.get('timelineService').currentUserId = null;
            registry.get('timelineService').timeline = [];
        }

        this.notificationService.show('您现在处于试用模式，数据不会被保存', 'info');

        this.render.students();
        this.render.calendar();
        const { year, month, organization } = this.utils.getStatisticsParams();
        this.render.statistics(year, month, organization);

        const trialSaveData = () => {
            this.render.students();
            this.render.calendar();
            const params = this.utils.getStatisticsParams();
            this.render.statistics(params.year, params.month, params.organization);
        };
        this.utils.saveData = trialSaveData;
        this.utils.debouncedSaveData = trialSaveData;

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
        this.utils.initDebouncedSave();
    }

    /**
     * 进入正常模式
     */
    async enterNormalMode() {
        this.exitTrialMode();
        this.serverStatusService.startMonitoring();

        try {
            // 快照创建已在 dataLoadService.loadData() 内部处理
            // 确保在数据同步前就创建快照
            await this.utils.loadData();
            // 设置标志位避免重复创建（实际的快照创建在 dataLoadService 内部）
            this.loginSnapshotCreated = true;
            // 数据加载完成后，如果当前是日历页，显式渲染日历
            // 避免 requestAnimationFrame 延迟导致 refreshAllViews 跳过日历渲染
            const currentHash = window.location.hash.slice(1) || '/';
            if (currentHash === '/' || currentHash === '/calendar') {
                this.render.calendar();
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            // 即使加载失败，也确保刷新视图
            this.utils.refreshAllViews(true);
        }
    }
}

export default LoadSystemService;
