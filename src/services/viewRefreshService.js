/**
 * 视图刷新服务
 *
 * @description 统一调度视图刷新，支持按作用域选择性刷新，内置 100ms 防抖
 * @module viewRefreshService
 */
import { registry } from '../core/registry.js';

class ViewRefreshService {
    constructor(state, render, elements) {
        this.state = state;
        this.render = render;
        this.elements = elements;
        this._debounceTimer = null;
        this._debounceDelay = 100;
    }

    /**
     * 刷新视图（支持作用域参数实现差异化重绘）
     * @param {string|Array|Object|null|boolean} scope - 作用域：'students', 'courses', 'organizations', 'grades', 'calendar', 'statistics', 或数组/null/true表示全部，或对象表示更细粒度的更新
     */
    refreshAllViews(scope = null) {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this._doRefresh(scope);
        }, this._debounceDelay);
    }

    _doRefresh(scope) {
        let scopes;
        if (scope === null || scope === undefined || scope === true) {
            scopes = ['students', 'courses', 'organizations', 'grades', 'calendar'];
        } else if (typeof scope === 'string') {
            scopes = [scope];
        } else if (Array.isArray(scope)) {
            scopes = scope;
        } else {
            scopes = ['students', 'courses', 'organizations', 'grades', 'calendar'];
        }

        if (scopes.includes('courses') || scopes.includes('organizations') || scopes.includes('grades')) {
            registry.get('utils').generateYearDropdowns();
        }

        if (scopes.includes('organizations') || scopes.includes('grades')) {
            registry.get('eventBindingService').refreshOrganizationOptions();
        }

        const currentPage = document.querySelector('.page.active');

        if (scopes.includes('students') || scopes.includes('organizations') || scopes.includes('grades')) {
            registry.get('listRenderService').resetStudentCache();
        }

        if (currentPage === this.elements.studentsPage && (scopes.includes('students') || scopes.includes('organizations') || scopes.includes('grades'))) {
            this.render.students();
        }
        if (currentPage === this.elements.calendarPage) {
            if (scopes.includes('calendar') || scopes.includes('courses') || scopes.includes('organizations') || scopes.includes('grades')) {
                this.render.calendar();
            }
        }
        if (currentPage === this.elements.statisticsPage) {
            if (scopes.includes('statistics') || scopes.includes('courses') || scopes.includes('students') || scopes.includes('organizations') || scopes.includes('grades')) {
                const params = registry.get('utils').getStatisticsParams();
                this.render.statistics(params.year, params.month, params.organization);
            }
        }
    }
}

export default ViewRefreshService;
