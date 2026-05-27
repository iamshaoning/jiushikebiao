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
        this._studentDragState = { active: false, startX: 0, startY: 0, rect: null, touchedRows: [], _justDragged: false };
        this._selectedStudentIds = new Set();

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

        // Student list drag selection - mousedown
        document.body.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (this._dragState.active) return;
            if (e.ctrlKey || e.metaKey) return;

            const studentRow = e.target.closest('#students-list tr') || e.target.closest('.student-item');
            if (!studentRow) return;
            if (e.target.closest('.edit-student') || e.target.closest('.delete-student')) return;
            if (e.target.closest('button')) return;

            // Check if we're on the students page
            const studentsPage = document.getElementById('students-page');
            if (!studentsPage || studentsPage.classList.contains('hidden')) return;

            // Reset calendar drag state in case it's stuck
            this._dragState.active = false;
            this._studentDragState.active = true;
            this._studentDragState.startX = e.clientX;
            this._studentDragState.startY = e.clientY;
            this._studentDragState.touchedRows = [];
        });

        // Student list drag selection - mousemove
        document.addEventListener('mousemove', (e) => {
            if (!this._studentDragState.active && this._dragState.active) return;

            if (this._studentDragState.active) {
                const dx = e.clientX - this._studentDragState.startX;
                const dy = e.clientY - this._studentDragState.startY;
                if (!this._studentDragState.rect && (Math.abs(dx) < 5 && Math.abs(dy) < 5)) return;

                if (!this._studentDragState.rect) {
                    this._studentDragState.rect = document.createElement('div');
                    this._studentDragState.rect.className = 'selection-rect';
                    document.body.appendChild(this._studentDragState.rect);
                    // Clear previous student selections on drag start
                    this._clearStudentSelections();
                }

                const left = Math.min(e.clientX, this._studentDragState.startX);
                const top = Math.min(e.clientY, this._studentDragState.startY);
                const width = Math.abs(dx);
                const height = Math.abs(dy);

                this._studentDragState.rect.style.left = left + 'px';
                this._studentDragState.rect.style.top = top + 'px';
                this._studentDragState.rect.style.width = width + 'px';
                this._studentDragState.rect.style.height = height + 'px';

                const selRect = { left, top, right: left + width, bottom: top + height };

                // Get all student rows (both table and virtual)
                const rows = [
                    ...document.querySelectorAll('#students-list tr'),
                    ...document.querySelectorAll('#students-virtual-container .student-item')
                ];

                rows.forEach(row => {
                    const cr = row.getBoundingClientRect();
                    const overlaps = !(cr.right < selRect.left || cr.left > selRect.right || cr.bottom < selRect.top || cr.top > selRect.bottom);
                    if (overlaps) {
                        row.classList.add('student-selected');
                        if (!this._studentDragState.touchedRows.includes(row)) {
                            this._studentDragState.touchedRows.push(row);
                        }
                    } else {
                        row.classList.remove('student-selected');
                        const idx = this._studentDragState.touchedRows.indexOf(row);
                        if (idx !== -1) this._studentDragState.touchedRows.splice(idx, 1);
                    }
                });

                return;
            }
        });

        // Student list drag selection - mouseup
        document.addEventListener('mouseup', (e) => {
            if (!this._studentDragState.active) return;
            this._studentDragState.active = false;

            if (this._studentDragState.rect) {
                this._studentDragState.rect.remove();
                this._studentDragState.rect = null;

                const selectedRows = document.querySelectorAll('#students-page .student-selected');
                if (selectedRows.length > 0) {
                    const ids = [];
                    selectedRows.forEach(row => {
                        const sid = row.dataset.studentId;
                        if (sid) {
                            ids.push(sid);
                            this._selectedStudentIds.add(sid);
                        }
                    });
                    this._updateStudentMultiSelectUI();
                    this._studentDragState._justDragged = true;
                    setTimeout(() => { this._studentDragState._justDragged = false; }, 300);
                }
            }

            this._studentDragState.touchedRows = [];
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
            
            // Student row ctrl+click
            if (e.ctrlKey || e.metaKey) {
                const studentRow = e.target.closest('#students-list tr') || e.target.closest('.student-item');
                if (studentRow && !e.target.closest('.edit-student') && !e.target.closest('.delete-student') && !e.target.closest('button')) {
                    const studentsPage = document.getElementById('students-page');
                    if (studentsPage && !studentsPage.classList.contains('hidden')) {
                        e.preventDefault();
                        const sid = studentRow.dataset.studentId;
                        if (sid) {
                            registry.get('eventHandlerService').handle('student-row-ctrl-click', { studentId: sid }, e);
                        }
                        return;
                    }
                }
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
                if (this._dragState._justDragged || this._studentDragState._justDragged) return;
                registry.get('utils').closeAllSelectDropdowns();

                if (!e.target.closest('#duration-dropdown')) {
                    registry.get('utils').safeAddClass(registry.get('elements').durationDropdown, 'hidden');
                }

                // Clear student multi-selection when clicking on a student row
                const studentsPage2 = document.getElementById('students-page');
                const isStudentRow2 = e.target.closest('#students-list tr') || e.target.closest('.student-item');
                if (studentsPage2 && !studentsPage2.classList.contains('hidden') && isStudentRow2 && this._selectedStudentIds.size > 0) {
                    this._clearStudentSelections();
                    return;
                }

                registry.get('modalService').closeAllPopovers();

                // Clear student multi-selection when clicking outside student rows
                const studentsPage = document.getElementById('students-page');
                const isStudentRow = e.target.closest('#students-list tr') || e.target.closest('.student-item');
                if (studentsPage && !studentsPage.classList.contains('hidden') && !isStudentRow && this._selectedStudentIds.size > 0) {
                    this._clearStudentSelections();
                }

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

    /**
     * Clear all student selections
     */
    _clearStudentSelections() {
        document.querySelectorAll('#students-page .student-selected').forEach(row => {
            row.classList.remove('student-selected');
        });
        this._selectedStudentIds.clear();
        this._updateStudentMultiSelectUI();
    }

    /**
     * Update the multi-select UI (floating delete bar)
     */
    _updateStudentMultiSelectUI() {
        const studentsPage = document.getElementById('students-page');
        const fab = document.getElementById('floating-action-bar');
        const fabContent = document.getElementById('floating-action-bar-content');

        if (this._selectedStudentIds.size > 0) {
            if (studentsPage) studentsPage.classList.add('students-multi-selecting');
            if (fab && fabContent) {
                const cnt = this._selectedStudentIds.size;
                fabContent.innerHTML = `<span class="text-sm font-medium" style="color:var(--text-primary);padding:0 8px;">已选择 ${cnt} 位学生</span><div data-action="students-multi-edit" class="fab-btn" style="background-color:var(--color-primary);"><i data-lucide="pencil" class="pointer-events-none inline-block"></i>编辑</div><div data-action="students-multi-delete" class="fab-btn" style="background-color:var(--color-danger);"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>删除</div>`;
                fabContent.dataset.type = 'student';
                fab.classList.add('active');
                if (registry.get('lucide')) registry.get('lucide').createIcons();
            }
        } else {
            if (studentsPage) studentsPage.classList.remove('students-multi-selecting');
            if (fab && fabContent?.dataset.type === 'student') {
                fab.classList.remove('active');
            }
        }
    }

    /**
     * Get current selected student IDs
     */
    getSelectedStudentIds() {
        return [...this._selectedStudentIds];
    }

    /**
     * Clear all student selections (public, for external use)
     */
    clearAllStudentSelections() {
        this._clearStudentSelections();
    }
}

const eventDispatcherService = new EventDispatcherService();

export default eventDispatcherService;