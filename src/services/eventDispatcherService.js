/**
 * 事件分发服务
 *
 * @description 在 document.body 上委托捕获 data-action 属性事件，解析 payload 并分发到 eventHandlerService
 * @module eventDispatcherService
 */
import { registry } from '../core/registry.js';

class EventDispatcherService {
    constructor() {
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        document.body.addEventListener('contextmenu', (e) => {
            const calendarCell = e.target.closest('.calendar-cell');
            const courseTag = e.target.closest('.course-tag-item');
            if (calendarCell || courseTag) {
                e.preventDefault();
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'time') {
                const container = e.target.closest('[data-action="toggle-time-picker"]');
                if (container) {
                    const targetId = container.dataset.target;
                    registry.get('utils').toggleTimePicker(targetId);
                    return;
                }
            }
            
            const calendarCell = e.target.closest('.calendar-cell');
            if (calendarCell) {
                registry.get('utils').closeAllSelectDropdowns();
                registry.get('modalService').closeAllPopovers();
                registry.get('eventHandlerService').handle('calendar-cell-click', { date: calendarCell.dataset.date }, e);
                e.stopPropagation();
            }
            
            const customOption = e.target.closest('.custom-option');
            if (customOption) {
                const selectWrapper = customOption.closest('.custom-select');
                if (selectWrapper && selectWrapper.id) {
                    const value = customOption.dataset.value;
                    registry.get('eventHandlerService').handle('select-option', { value, wrapper: selectWrapper.id }, e);
                }
                return;
            }
            
            const target = e.target.closest('[data-action]');
            const courseTagItem = e.target.closest('.course-tag-item');

            if (!target && !calendarCell && !courseTagItem) {
                registry.get('utils').closeAllSelectDropdowns();

                if (!e.target.closest('#duration-dropdown')) {
                    registry.get('utils').safeAddClass(registry.get('elements').durationDropdown, 'hidden');
                }

                registry.get('modalService').closeAllPopovers();

                return;
            }

            const action = target ? target.dataset.action : null;
            if (action === 'course-click') {
                document.querySelectorAll('.custom-select-options.open').forEach(options => {
                    options.classList.remove('open');
                    options.parentElement.querySelector('.custom-select-trigger')?.classList.remove('active');
                });
                registry.get('modalService').closeAllPopovers();
            }

            if (action === 'toggle-select') {
                registry.get('modalService').closeAllPopovers();
            }

            if (target) {
                const payload = { ...target.dataset };
                registry.get('eventHandlerService').handle(action, payload, e);
            }
        });

        document.body.addEventListener('change', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            registry.get('eventHandlerService').handle(action, { ...target.dataset }, e);
        });
    }
}

const eventDispatcherService = new EventDispatcherService();

export { EventDispatcherService, eventDispatcherService };
export default eventDispatcherService;