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
        // 如果是 calendar-cell 类型的细粒度更新，直接执行不需要防抖
        if (typeof scope === 'object' && scope !== null && scope.type === 'calendar-cell') {
            this._doRefresh(scope);
            return;
        }

        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this._doRefresh(scope);
        }, this._debounceDelay);
    }

    _doRefresh(scope) {
        if (typeof scope === 'object' && scope !== null && scope.type) {
            switch (scope.type) {
                case 'calendar-cell':
                    if (scope.dates && Array.isArray(scope.dates)) {
                        scope.dates.forEach(dateStr => {
                            const cell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
                            if (cell) {
                                const courses = this.state.courses.filter(course => course.date === dateStr);
                                const existingCell = cell;
                                const newCell = this.render.createDayCell(
                                    parseInt(dateStr.split('-')[2]),
                                    dateStr,
                                    courses,
                                    true,
                                    false
                                );
                                existingCell.replaceWith(newCell);
                            }
                        });
                    }
                    return;
                default:
                    break;
            }
        }

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

        if (scopes.includes('courses') && registry.get('utils') && registry.get('utils').generateYearDropdowns) {
            registry.get('utils').generateYearDropdowns();
        }

        const currentPage = document.querySelector('.page.active');

        if (scopes.includes('students')) {
            // 清除 listRenderService 的缓存
            if (registry.get('listRenderService') && registry.get('listRenderService').resetStudentCache) {
                registry.get('listRenderService').resetStudentCache();
            }
        }

        if (currentPage === this.elements.studentsPage && scopes.includes('students')) {
            this.render.students();
        }
        if (currentPage === this.elements.calendarPage) {
            if (scopes.includes('calendar') || scopes.includes('courses')) {
                this.render.calendar();
            }
        }
        if (currentPage === this.elements.statisticsPage) {
            if (scopes.includes('statistics') || scopes.includes('courses')) {
                let params = { year: new Date().getFullYear(), month: new Date().getMonth(), organization: '' };
                if (registry.get('utils') && registry.get('utils').getStatisticsParams) {
                    params = registry.get('utils').getStatisticsParams();
                }
                this.render.statistics(params.year, params.month, params.organization);
            }
        }
    }
}

export default ViewRefreshService;
