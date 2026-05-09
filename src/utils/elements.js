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
    logoutBtn: null,
    settingsBtn: null,
    settingsDropdown: null,
    settingsUserName: null,
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
    userInfo: null,
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
    authBackground: null,
    authContainer: null,
    loginTab: null,
    registerTab: null,
    authForm: null,
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
    courseDate: null,
    courseStartTime: null,
    courseEndTime: null,
    courseDuration: null,
    courseFee: null,
    courseNote: null,
    editCourseId: null,
    editCourseForm: null,
    saveCourse: null,
    addCourseSave: null,
    studentSelectionArea: null,
    courseFeeContainer: null,
    studentButtons: null,
    studentName: null,
    editStudentName: null,
    editStudentId: null,
    editStudentSave: null,
    addStudentForm: null,
    addStudentSave: null,
    durationDropdown: null,
    organizationTable: null,
    detailedTypeTableContainer: null,
    studentDataContainer: null,
    cancelConfirm: null,
    acceptConfirm: null,
    studentSort: null
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
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.settingsBtn = document.getElementById('settings-btn');
    elements.settingsDropdown = document.getElementById('settings-dropdown');
    elements.settingsUserName = document.getElementById('settings-user-name');
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
    elements.userInfo = document.getElementById('user-info');
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
    elements.authBackground = document.getElementById('auth-background');
    elements.authContainer = document.getElementById('auth-container');
    elements.loginTab = document.getElementById('login-tab');
    elements.registerTab = document.getElementById('register-tab');
    elements.authForm = document.getElementById('auth-form');
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
    elements.courseDate = document.getElementById('course-date');
    elements.courseStartTime = document.getElementById('course-start-time');
    elements.courseEndTime = document.getElementById('course-end-time');
    elements.courseDuration = document.getElementById('course-duration');
    elements.courseFee = document.getElementById('course-fee');
    elements.courseNote = document.getElementById('course-note');
    elements.editCourseId = document.getElementById('edit-course-id');
    elements.editCourseForm = document.getElementById('edit-course-form');
    elements.saveCourse = document.getElementById('save-course');
    elements.addCourseSave = document.getElementById('add-course-save');
    elements.studentSelectionArea = document.getElementById('student-selection-area');
    elements.courseFeeContainer = document.getElementById('course-fee-container');
    elements.studentButtons = document.getElementById('student-buttons');
    elements.studentName = document.getElementById('student-name');
    elements.editStudentName = document.getElementById('edit-student-name');
    elements.editStudentId = document.getElementById('edit-student-id');
    elements.editStudentSave = document.getElementById('edit-student-save');
    elements.addStudentForm = document.getElementById('add-student-form');
    elements.addStudentSave = document.getElementById('add-student-save');
    elements.durationDropdown = document.getElementById('duration-dropdown');
    elements.organizationTable = document.getElementById('organization-table');
    elements.detailedTypeTableContainer = document.getElementById('detailed-type-table-container');
    elements.studentDataContainer = document.getElementById('student-data-container');
    elements.cancelConfirm = document.getElementById('cancel-confirm');
    elements.acceptConfirm = document.getElementById('accept-confirm');
    elements.studentSort = document.getElementById('student-sort');

    return elements;
}

export { elements, initElements };
export default elements;