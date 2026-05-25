/**
 * DOM 元素引用缓存
 *
 * @description 集中管理所有常用 DOM 元素的引用，避免重复查询
 * @module elements
 */
const elements = {
    nav: null,
    navButtons: null,
    prevMonth: null,
    nextMonth: null,
    addStudentBtn: null,
    manageOrganizationsBtn: null,
    manageGradesBtn: null,
    exportStatisticsBtn: null,
    syncStatus: null,
    syncIcon: null,
    syncTitle: null,
    logoutBtn: null,
    settingsBtn: null,
    settingsDropdown: null,
    settingsUserName: null,
    settingsEmailProvider: null,
    studentSearch: null,
    main: null,
    studentsList: null,
    calendarGrid: null,
    calendarYearOptions: null,
    calendarMonthOptions: null,
    calendarYearTrigger: null,
    calendarMonthTrigger: null,
    calendarMonthWrapper: null,
    calendarYearWrapper: null,
    statisticsYearOptions: null,
    statisticsYearTrigger: null,
    statisticsMonthWrapper: null,
    statisticsYearWrapper: null,
    statisticsOrganizationOptions: null,
    statisticsOrganizationTrigger: null,
    statisticsOrganizationWrapper: null,
    totalHours: null,
    totalFee: null,
    totalStudents: null,
    authModal: null,
    authContainer: null,
    loginTab: null,
    registerTab: null,
    authEmail: null,
    authPassword: null,
    loginBtnContainer: null,
    loginSubmit: null,
    loginBtnText: null,
    loginLoading: null,
    registerBtnContainer: null,
    registerSubmit: null,
    registerBtnText: null,
    registerLoading: null,
    notificationContainer: null,
    studentsPage: null,
    calendarPage: null,
    statisticsPage: null,
    modalContainer: null,
    modalContent: null,
    nestedModalContainer: null,
    nestedModalContent: null,
    durationDropdown: null,
    organizationTable: null,
    detailedTypeTableContainer: null,
    studentDataContainer: null,
    timelineBtn: null,
    snapshotBtn: null
};

function initElements() {
    elements.nav = document.querySelector('nav');
    elements.navButtons = document.querySelectorAll('[data-page]');
    elements.prevMonth = document.getElementById('prev-month');
    elements.nextMonth = document.getElementById('next-month');
    elements.addStudentBtn = document.getElementById('add-student-btn');
    elements.manageOrganizationsBtn = document.getElementById('manage-organizations-btn');
    elements.manageGradesBtn = document.getElementById('manage-grades-btn');
    elements.exportStatisticsBtn = document.getElementById('export-statistics');
    elements.syncStatus = document.getElementById('sync-status');
    elements.syncIcon = document.getElementById('sync-icon');
    elements.syncTitle = document.getElementById('sync-title');
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.settingsBtn = document.getElementById('settings-btn');
    elements.settingsDropdown = document.getElementById('settings-dropdown');
    elements.settingsUserName = document.getElementById('settings-user-name');
    elements.settingsEmailProvider = document.getElementById('settings-email-provider');
    elements.studentSearch = document.getElementById('student-search');
    elements.main = document.querySelector('main');
    elements.studentsList = document.getElementById('students-list');
    elements.calendarGrid = document.getElementById('calendar-grid');
    elements.calendarYearOptions = document.getElementById('calendar-year-options');
    elements.calendarMonthOptions = document.getElementById('calendar-month-options');
    elements.calendarYearTrigger = document.querySelector('#calendar-year-wrapper .custom-select-trigger span');
    elements.calendarMonthTrigger = document.querySelector('#calendar-month-wrapper .custom-select-trigger span');
    elements.calendarMonthWrapper = document.getElementById('calendar-month-wrapper');
    elements.calendarYearWrapper = document.getElementById('calendar-year-wrapper');
    elements.statisticsYearOptions = document.getElementById('statistics-year-options');
    elements.statisticsYearTrigger = document.querySelector('#statistics-year-wrapper .custom-select-trigger span');
    elements.statisticsMonthWrapper = document.getElementById('statistics-month-wrapper');
    elements.statisticsYearWrapper = document.getElementById('statistics-year-wrapper');
    elements.statisticsOrganizationOptions = document.getElementById('statistics-organization-options');
    elements.statisticsOrganizationTrigger = document.querySelector('#statistics-organization-trigger span');
    elements.statisticsOrganizationWrapper = document.getElementById('statistics-organization-wrapper');
    elements.totalHours = document.getElementById('total-hours');
    elements.totalFee = document.getElementById('total-fee');
    elements.totalStudents = document.getElementById('total-students');
    elements.authModal = document.getElementById('auth-modal');
    elements.authContainer = document.getElementById('auth-container');
    elements.loginTab = document.getElementById('login-tab');
    elements.registerTab = document.getElementById('register-tab');
    elements.authEmail = document.getElementById('auth-email');
    elements.authPassword = document.getElementById('auth-password');
    elements.loginBtnContainer = document.getElementById('login-btn-container');
    elements.loginSubmit = document.getElementById('login-submit');
    elements.loginBtnText = document.getElementById('login-btn-text');
    elements.loginLoading = document.getElementById('login-loading');
    elements.registerBtnContainer = document.getElementById('register-btn-container');
    elements.registerSubmit = document.getElementById('register-submit');
    elements.registerBtnText = document.getElementById('register-btn-text');
    elements.registerLoading = document.getElementById('register-loading');
    elements.notificationContainer = document.getElementById('notification-container');
    elements.studentsPage = document.getElementById('students-page');
    elements.calendarPage = document.getElementById('calendar-page');
    elements.statisticsPage = document.getElementById('statistics-page');
    elements.modalContainer = document.getElementById('modal-container');
    elements.modalContent = document.getElementById('modal-content');
    elements.nestedModalContainer = document.getElementById('nested-modal-container');
    elements.nestedModalContent = document.getElementById('nested-modal-content');
    elements.durationDropdown = document.getElementById('duration-dropdown');
    elements.organizationTable = document.getElementById('organization-table');
    elements.detailedTypeTableContainer = document.getElementById('detailed-type-table-container');
    elements.studentDataContainer = document.getElementById('student-data-container');
    elements.timelineBtn = document.getElementById('timeline-btn');
    elements.snapshotBtn = document.getElementById('snapshot-btn');

    return elements;
}

export { elements, initElements };
export default elements;