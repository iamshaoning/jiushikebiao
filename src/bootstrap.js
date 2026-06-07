/**
 * 应用启动器
 *
 * @description 负责导入所有模块、创建服务实例、组装依赖图并注册到 registry，按依赖顺序初始化并启动应用
 * @module bootstrap
 */
import { createClient } from '@supabase/supabase-js';
import { registry } from './core/registry.js';

import dataService from './services/dataService.js';
import authService from './services/authService.js';
import serverStatusService from './services/serverStatusService.js';
import notificationService from './services/notificationService.js';
import modalService from './services/modalService.js';
import routerService from './services/routerService.js';
import eventDispatcherService from './services/eventDispatcherService.js';
import eventHandlerService from './services/eventHandlerService.js';
import FabHandlerService from './services/fabHandlerService.js';
import CourseEventHandlerService from './services/courseEventHandlerService.js';
import stateService from './services/stateService.js';
import exportService from './services/exportService.js';
import errorHandlerService from './services/errorHandlerService.js';
import historyService from './services/historyService.js';

import { getCourseFormTemplate } from './utils/courseFormTemplate.js';
import { initCourseFormEvents } from './utils/courseFormEvents.js';
import { elements, initElements } from './utils/elements.js';
import { VirtualList } from './components/VirtualList.js';
import coreUtils from './utils/coreUtils.js';
import dateUtils from './utils/dateUtils.js';
import snapshotUtils from './utils/snapshotUtils.js';
import clipboardUtils from './utils/clipboardUtils.js';
import stateUtils from './utils/stateUtils.js';

import { ChartService } from './services/chartService.js';
import { StatisticsCalculatorService } from './services/statisticsCalculatorService.js';
import { StatisticsRenderService } from './services/statisticsRenderService.js';
import { ConflictCheckService } from './services/conflictCheckService.js';
import { FeeCalculationService } from './services/feeCalculationService.js';
import { CalendarRenderService } from './services/calendarRenderService.js';
import { ListRenderService } from './services/listRenderService.js';
import PageRenderService from './services/pageRenderService.js';
import DatePickerService from './services/datePickerService.js';
import CustomSelectService from './services/customSelectService.js';
import ThemeService from './services/themeService.js';
import AuthUIService from './services/authUIService.js';
import DataLoadService from './services/dataLoadService.js';
import ViewRefreshService from './services/viewRefreshService.js';
import InitService from './services/initService.js';
import EventBindingService from './services/eventBindingService.js';
import LoadSystemService from './services/loadSystemService.js';

import { generateColor, removeColorAssignment, getUsedColors, setColor, getColorPalette, initColorsFromState, isLightColor } from './utils/colorUtils.js';

export function bootstrap() {

registry.set('createClient', createClient);
registry.set('dataService', dataService);
registry.set('authService', authService);
registry.set('serverStatusService', serverStatusService);
registry.set('notificationService', notificationService);
registry.set('modalService', modalService);
registry.set('routerService', routerService);
registry.set('router', routerService);
registry.set('eventDispatcherService', eventDispatcherService);
registry.set('eventHandlerService', eventHandlerService);
registry.set('fabHandlerService', eventHandlerService.getFabHandlerService());
registry.set('courseEventHandlerService', eventHandlerService.getCourseEventHandlerService());
registry.set('stateService', stateService);
registry.set('exportService', exportService);
registry.set('historyService', historyService);
registry.set('coreUtils', coreUtils);
registry.set('dateUtils', dateUtils);
registry.set('snapshotUtils', snapshotUtils);
registry.set('clipboardUtils', clipboardUtils);
registry.set('stateUtils', stateUtils);
registry.set('VirtualList', VirtualList);

initElements();
registry.set('elements', elements);
errorHandlerService.init();
registry.set('errorHandlerService', errorHandlerService);

stateService.init();
registry.set('state', stateService.getState());
registry.set('setState', (updater, scope) => stateService.setState(updater, scope));

const render = {};
registry.set('render', render);

const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY
};
if (!supabaseConfig.url || !supabaseConfig.key) {
    if (import.meta.env?.DEV) console.error('Supabase配置缺失');
}

try {
    const client = createClient(supabaseConfig.url, supabaseConfig.key, {
        auth: { storageKey: 'sb-auth-token', autoRefreshToken: true, persistSession: true }
    });
    registry.set('supabaseClient', client);
    registry.set('supabaseAuth', client.auth);
    registry.set('supabaseReady', Promise.resolve(client));
    registry.set('lucide', window.lucide || null);
    authService.init(client.auth);
    serverStatusService.init(client, client.auth);
} catch (error) {
    if (import.meta.env?.DEV) console.error('Supabase初始化失败:', error);
    registry.set('supabaseClient', null);
    registry.set('supabaseAuth', null);
    registry.set('supabaseReady', Promise.resolve(null));
}

routerService.register('/', () => { registry.get('render').page('calendar-page'); });
routerService.register('/calendar', () => { registry.get('render').page('calendar-page'); });
routerService.register('/students', () => { registry.get('render').page('students-page'); });
routerService.register('/statistics', () => { registry.get('render').page('statistics-page'); });


document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
        // Close any open modals/popovers before switching pages
        if (registry.get('modalService')) registry.get('modalService').hide();
        if (registry.get('eventDispatcherService')) registry.get('eventDispatcherService').clearAllStudentSelections();
        const page = button.dataset.page;
        let path = '/';
        if (page === 'calendar-page') path = '/calendar';
        if (page === 'students-page') path = '/students';
        if (page === 'statistics-page') path = '/statistics';
        routerService.navigate(path);
    });
});

eventDispatcherService.init();

const customSelectService = new CustomSelectService();
registry.set('customSelectService', customSelectService);
const datePickerService = new DatePickerService(coreUtils);
registry.set('datePickerService', datePickerService);
const viewRefreshService = new ViewRefreshService(registry.get('state'), render, elements);
registry.set('viewRefreshService', viewRefreshService);

const state = registry.get('state');

const utils = {
    // ---- 核心工具 (coreUtils) ----
    generateId: coreUtils.generateId, escapeHtml: coreUtils.escapeHtml,
    debounce: coreUtils.debounce, safe: coreUtils.safe, safeSet: coreUtils.safeSet,
    safeAddClass: coreUtils.safeAddClass, safeRemoveClass: coreUtils.safeRemoveClass,
    withTimeout: coreUtils.withTimeout,

    // ---- 日期工具 (dateUtils) ----
    timeToMins: dateUtils.timeToMins,
    getTimestamp: dateUtils.getTimestamp, calculateEndTime: dateUtils.calculateEndTime,
    calculateEndTimeFromDuration: dateUtils.calculateEndTimeFromDuration,

    // ---- 快照工具 (snapshotUtils) ----
    createSnapshot: snapshotUtils.createSnapshot, getSnapshots: snapshotUtils.getSnapshots,
    restoreSnapshot: snapshotUtils.restoreSnapshot, deleteSnapshot: snapshotUtils.deleteSnapshot,
    startAutoSnapshotTimer: snapshotUtils.startAutoSnapshotTimer,

    // ---- 剪贴板工具 (clipboardUtils) ----
    copyCourses: clipboardUtils.copyCourses, pasteCourses: clipboardUtils.pasteCourses,

    // ---- 状态工具 (stateUtils) ----
    saveData: stateUtils.saveData, syncToServer: stateUtils.syncToServer,
    debouncedSaveData: null,
    initDebouncedSave: function() { this.debouncedSaveData = this.debounce(this.saveData, 2000); },

    // ---- 颜色工具 (colorUtils) ----
    generateColor, removeColorAssignment, getUsedColors, setColor,
    getColorPalette, initColorsFromState, isLightColor,

    // ---- 数据对比 ----
    compareLocalAndServerData: async () => {
        const localData = dataService.getLocalData();
        if (!localData) return true;
        const supabaseClient = registry.get('supabaseClient');
        const auth = registry.get('supabaseAuth');
        if (!supabaseClient || !auth) return true;
        try {
            const { data: sessionData } = await auth.getSession();
            const userId = sessionData?.session?.user?.id;
            if (!userId) return true;
            const { data: serverData, error } = await supabaseClient
                .from('coursemanagerdata')
                .select('*')
                .eq('userid', userId)
                .maybeSingle();
            if (error) return true;
            if (!serverData) return true;
            return dataService.checkDataDifference(localData, serverData);
        } catch { return true; }
    },
    checkDataDifference: (localData, serverData) => dataService.checkDataDifference(localData, serverData),
    startServerStatusMonitor: () => registry.get('serverStatusService').startMonitoring(),
    stopServerStatusMonitor: () => registry.get('serverStatusService').stopMonitoring(),

    // ---- 服务代理 (bind 到实例) ----
    checkTimeConflict: (newCourse) => conflictCheckService.checkTimeConflict(newCourse, utils),
    findConflictingCourses: (newCourse) => conflictCheckService.findConflictingCourses(newCourse, utils),
    calculateFee: () => feeCalculationService.calculateFee(),
    toggleTimePicker: datePickerService.toggleTimePicker.bind(datePickerService),
    toggleDatePicker: datePickerService.toggleDatePicker.bind(datePickerService),
    closeAllSelectDropdowns: customSelectService.closeAllSelectDropdowns.bind(customSelectService),
    selectDate: datePickerService.selectDate.bind(datePickerService),
    changeDateMonth: datePickerService.changeDateMonth.bind(datePickerService),
    renderDatePicker: datePickerService.renderDatePicker.bind(datePickerService),
    createCloseListener: customSelectService.createCloseListener.bind(customSelectService),
    togglePicker: customSelectService.togglePicker.bind(customSelectService),
    toggleDurationPicker: customSelectService.toggleDurationPicker.bind(customSelectService),
    getCustomSelectValue: customSelectService.getCustomSelectValue.bind(customSelectService),
    setCustomSelectValue: customSelectService.setCustomSelectValue.bind(customSelectService),
    getCourseFee: function(course, student, index) { return feeCalculationService.getCourseFee(course, student, index); },

    // ---- 视图/状态 ----
    updateStateFromData: (data, useDefaults = true) => registry.get('stateService').updateStateFromData(data, useDefaults),
    refreshAllViews: viewRefreshService.refreshAllViews.bind(viewRefreshService),
    loadData: null,
    exportStatisticsData: (year, month, organization = '') => registry.get('exportService').exportStatisticsData(year, month, organization),
};

registry.set('utils', utils);

const dataLoadService = new DataLoadService(state, notificationService, serverStatusService, utils);
registry.set('dataLoadService', dataLoadService);
utils.loadData = () => dataLoadService.loadData();

const themeService = new ThemeService(elements, utils, render);
registry.set('themeService', themeService);

const loadSystemService = new LoadSystemService();
registry.set('loadSystemService', loadSystemService);

const authUIService = new AuthUIService(elements, utils, notificationService, authService, modalService, serverStatusService);
registry.set('authUIService', authUIService);
authUIService.setLoadSystemService(loadSystemService);

loadSystemService.init(state, elements, utils, render, themeService, authUIService, serverStatusService, notificationService);

const initService = new InitService(utils, notificationService, serverStatusService, authUIService, themeService, loadSystemService, elements);
registry.set('initService', initService);

const chartService = new ChartService();
registry.set('chartService', chartService);
const statisticsCalculatorService = new StatisticsCalculatorService(state);
registry.set('statisticsCalculatorService', statisticsCalculatorService);
const statisticsRenderService = new StatisticsRenderService(state, elements, chartService, statisticsCalculatorService);
registry.set('statisticsRenderService', statisticsRenderService);
const conflictCheckService = new ConflictCheckService(state);
const feeCalculationService = new FeeCalculationService(state);
const calendarRenderService = new CalendarRenderService(state, elements, utils);
registry.set('calendarRenderService', calendarRenderService);
const listRenderService = new ListRenderService(state, elements, utils);
registry.set('listRenderService', listRenderService);
const pageRenderService = new PageRenderService(elements);
registry.set('pageRenderService', pageRenderService);
const eventBindingService = new EventBindingService(elements, state, utils, render, modalService, notificationService);
registry.set('eventBindingService', eventBindingService);

utils.getCourseFormTemplate = getCourseFormTemplate;
utils.initCourseFormEvents = initCourseFormEvents;
utils.generateYearDropdowns = (up = utils) => statisticsRenderService.generateYearDropdowns(up);
utils.generateMonthDropdowns = (up = utils) => statisticsRenderService.generateMonthDropdowns(up);
utils.getStatisticsParams = (up = utils) => statisticsRenderService.getStatisticsParams(up);
utils.handleCourseClick = (element, courseId, event) => calendarRenderService.handleCourseClick(element, courseId, event);
utils.createDatePickerTemplate = (id, inputId) => datePickerService.createDatePickerTemplate(id, inputId);
utils.createTimePickerTemplate = (id, inputId) => datePickerService.createTimePickerTemplate(id, inputId);

Object.assign(render, {
    getCourseTagHTML: (course) => calendarRenderService.getCourseTagHTML(course),
    calendar: (forceUpdate = false) => calendarRenderService.calendar(forceUpdate),
    updateCourseCells: () => calendarRenderService.updateCourseCells(),
    updateDayCell: (cell, courses) => calendarRenderService.updateDayCell(cell, courses),
    getDateInfo: (dateStr) => calendarRenderService.getDateInfo(dateStr),
    students: () => listRenderService.students(),
    statistics: (year, month, organization = '') => statisticsRenderService.statistics(year, month, organization, utils),
    chart: (canvasId, data, title) => chartService.chart(canvasId, data, title, utils),
    orgTable: (data, totalCourses) => statisticsRenderService.orgTable(data, totalCourses, utils),
    detailedTypeTable: (detailedStats) => statisticsRenderService.detailedTypeTable(detailedStats, utils),
    studentData: (studentStats) => statisticsRenderService.studentData(studentStats, utils),
    page: (pageId) => {
        pageRenderService.page(pageId);
        const renderMap = {
            'calendar-page': () => render.calendar(),
            'students-page': () => render.students(),
            'statistics-page': () => { const { year, month, organization } = utils.getStatisticsParams(); render.statistics(year, month, organization); }
        };
        renderMap[pageId]?.();
    }
});

routerService.init();
eventBindingService.init();
initService.init();

}
