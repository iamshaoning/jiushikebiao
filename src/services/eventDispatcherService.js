import modalService from './modalService.js';
import eventHandlerService from './eventHandlerService.js';

/**
 * 事件分发器服务
 * 统一处理DOM事件，根据事件目标分发到相应的处理器
 * 
 * @class EventDispatcherService
 * @exports EventDispatcherService
 * @exports eventDispatcherService
 */
class EventDispatcherService {
    constructor() {
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'time') {
                const container = e.target.closest('[data-action="toggle-time-picker"]');
                if (container) {
                    const targetId = container.dataset.target;
                    if (typeof window.utils.toggleTimePicker === 'function') {
                        window.utils.toggleTimePicker(targetId);
                    }
                    return;
                }
            }
            
            const calendarCell = e.target.closest('.calendar-cell');
            if (calendarCell) {
                window.utils.closeAllSelectDropdowns();
                modalService.closeAllPopovers();
                eventHandlerService.handle('calendar-cell-click', { date: calendarCell.dataset.date }, e);
                e.stopPropagation();
            }
            
            const customOption = e.target.closest('.custom-option');
            if (customOption) {
                const selectWrapper = customOption.closest('.custom-select');
                if (selectWrapper && selectWrapper.id) {
                    const value = customOption.dataset.value;
                    eventHandlerService.handle('select-option', { value, wrapper: selectWrapper.id }, e);
                }
                return;
            }
            
            const target = e.target.closest('[data-action]');
            const courseTagItem = e.target.closest('.course-tag-item');

            if (!target && !calendarCell && !courseTagItem) {
                window.utils.closeAllSelectDropdowns();

                if (!e.target.closest('#duration-dropdown')) {
                    window.utils.safeAddClass(window.elements.durationDropdown, 'hidden');
                }

                modalService.closeAllPopovers();

                return;
            }

            const action = target ? target.dataset.action : null;
            if (action === 'course-click') {
                document.querySelectorAll('.custom-select-options.open').forEach(options => {
                    options.classList.remove('open');
                    options.parentElement.querySelector('.custom-select-trigger')?.classList.remove('active');
                });
                modalService.closeAllPopovers();
            }

            if (action === 'toggle-select') {
                modalService.closeAllPopovers();
            }

            if (target) {
                const payload = { ...target.dataset };
                eventHandlerService.handle(action, payload, e);
            }
        });

        document.body.addEventListener('change', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) {
                if (e.target.classList.contains('custom-select') || e.target.closest('.custom-select')) {
                    const container = e.target.closest('.custom-select') || e.target;
                    if (container && container.id) {
                        if (container.id === 'statistics-organization-wrapper') {
                            const { year, month } = window.utils.getStatisticsParams();
                            const organization = window.utils.getCustomSelectValue('statistics-organization-wrapper');
                            if (typeof window.render.statistics === 'function') {
                                window.render.statistics(year, month, organization);
                            }
                        } else if (container.id === 'statistics-year-wrapper') {
                            const { month, organization } = window.utils.getStatisticsParams();
                            if (typeof window.render.statistics === 'function') {
                                const year = parseInt(window.utils.getCustomSelectValue('statistics-year-wrapper')) || new Date().getFullYear();
                                window.render.statistics(year, month, organization);
                            }
                        } else if (container.id === 'statistics-month-wrapper') {
                            const { year, organization } = window.utils.getStatisticsParams();
                            if (typeof window.render.statistics === 'function') {
                                const month = parseInt(window.utils.getCustomSelectValue('statistics-month-wrapper')) || 0;
                                window.render.statistics(year, month, organization);
                            }
                        } else if (container.id === 'calendar-year-wrapper') {
                            const year = parseInt(window.utils.getCustomSelectValue('calendar-year-wrapper')) || new Date().getFullYear();
                            const month = parseInt(window.utils.getCustomSelectValue('calendar-month-wrapper')) || new Date().getMonth();
                            if (typeof window.render.calendar === 'function') {
                                window.render.calendar(year, month);
                            }
                        } else if (container.id === 'calendar-month-wrapper') {
                            const year = parseInt(window.utils.getCustomSelectValue('calendar-year-wrapper')) || new Date().getFullYear();
                            const month = parseInt(window.utils.getCustomSelectValue('calendar-month-wrapper')) || new Date().getMonth();
                            if (typeof window.render.calendar === 'function') {
                                window.render.calendar(year, month);
                            }
                        }
                    }
                }
                return;
            }

            const action = target.dataset.action;
            eventHandlerService.handle(action, { ...target.dataset }, e);
        });
    }
}

const eventDispatcherService = new EventDispatcherService();

export { EventDispatcherService, eventDispatcherService };
export default eventDispatcherService;