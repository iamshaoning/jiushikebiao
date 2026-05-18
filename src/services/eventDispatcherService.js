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
        this._dragState = { active: false, startX: 0, startY: 0, rect: null, selectedCells: [], _justDragged: false };

        document.body.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const calendarCell = e.target.closest('.calendar-cell');
            if (!calendarCell) return;
            if (e.target.closest('.course-tag-item')) return;
            if (e.target.closest('#floating-action-bar')) return;
            if (e.ctrlKey || e.metaKey) return;

            this._dragState.active = true;
            this._dragState.startX = e.clientX;
            this._dragState.startY = e.clientY;
            this._dragState.selectedCells = [];
        });

        document.addEventListener('mousemove', (e) => {
            if (!this._dragState.active) return;
            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;
            if (!this._dragState.rect && (Math.abs(dx) < 5 && Math.abs(dy) < 5)) return;

            if (!this._dragState.rect) {
                this._dragState.rect = document.createElement('div');
                this._dragState.rect.className = 'selection-rect';
                document.body.appendChild(this._dragState.rect);
                document.querySelectorAll('.calendar-cell-selected').forEach(c => {
                    c.classList.remove('calendar-cell-selected');
                });
                registry.get('modalService').closeAllPopovers();
            }

            const left = Math.min(e.clientX, this._dragState.startX);
            const top = Math.min(e.clientY, this._dragState.startY);
            const width = Math.abs(dx);
            const height = Math.abs(dy);

            this._dragState.rect.style.left = left + 'px';
            this._dragState.rect.style.top = top + 'px';
            this._dragState.rect.style.width = width + 'px';
            this._dragState.rect.style.height = height + 'px';

            const selRect = { left, top, right: left + width, bottom: top + height };

            document.querySelectorAll('.calendar-cell').forEach(cell => {
                const cr = cell.getBoundingClientRect();
                const overlaps = !(cr.right < selRect.left || cr.left > selRect.right || cr.bottom < selRect.top || cr.top > selRect.bottom);
                if (overlaps) {
                    cell.classList.add('calendar-cell-selected', 'calendar-cell-selecting');
                    if (!this._dragState.selectedCells.includes(cell)) {
                        this._dragState.selectedCells.push(cell);
                    }
                } else {
                    cell.classList.remove('calendar-cell-selected', 'calendar-cell-selecting');
                    const idx = this._dragState.selectedCells.indexOf(cell);
                    if (idx !== -1) this._dragState.selectedCells.splice(idx, 1);
                }
            });
        });

        document.addEventListener('mouseup', (e) => {
            if (!this._dragState.active) return;
            this._dragState.active = false;

            if (this._dragState.rect) {
                this._dragState.rect.remove();
                this._dragState.rect = null;

                document.querySelectorAll('.calendar-cell-selecting').forEach(c => c.classList.remove('calendar-cell-selecting'));

                const selectedCells = document.querySelectorAll('.calendar-cell-selected');
                if (selectedCells.length >= 1) {
                    const dates = Array.from(selectedCells).map(c => c.dataset.date);
                    if (dates.length > 1) {
                        registry.get('eventHandlerService').handle('calendar-cells-selected', { dates }, e);
                    }
                    this._dragState._justDragged = true;
                    setTimeout(() => { this._dragState._justDragged = false; }, 300);
                }
            }

            this._dragState.selectedCells = [];
        });

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
                if (this._dragState._justDragged) {
                    e.stopPropagation();
                    return;
                }
                registry.get('utils').closeAllSelectDropdowns();
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    registry.get('eventHandlerService').handle('calendar-cell-ctrl-click', { date: calendarCell.dataset.date }, e);
                } else {
                    registry.get('modalService').closeAllPopovers();
                    registry.get('eventHandlerService').handle('calendar-cell-click', { date: calendarCell.dataset.date }, e);
                }
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
            const floatingBar = e.target.closest('#floating-action-bar');

            if (!target && !calendarCell && !courseTagItem && !floatingBar) {
                if (this._dragState._justDragged) return;
                registry.get('utils').closeAllSelectDropdowns();

                if (!e.target.closest('#duration-dropdown')) {
                    registry.get('utils').safeAddClass(registry.get('elements').durationDropdown, 'hidden');
                }

                registry.get('modalService').closeAllPopovers();

                return;
            }

            if (floatingBar && !target) return;

            const action = target ? target.dataset.action : null;
            if (action === 'course-click') {
                document.querySelectorAll('.custom-select-options.open').forEach(options => {
                    options.classList.remove('open');
                    options.parentElement.querySelector('.custom-select-trigger')?.classList.remove('active');
                });
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                } else {
                    registry.get('modalService').closeAllPopovers();
                }
            }

            if (action === 'toggle-select') {
                registry.get('modalService').closeAllPopovers();
            }

            if (target) {
                const payload = { ...target.dataset };
                registry.get('eventHandlerService').handle(action, payload, e);
                if (floatingBar) {
                    const fab = document.getElementById('floating-action-bar');
                    if (fab) { fab.classList.remove('active'); }
                }
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

export default eventDispatcherService;