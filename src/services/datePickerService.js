/**
 * 日期选择器服务
 *
 * @description 创建和管理日期/时间选择器 UI 组件，处理日切换、时/分选择交互
 * @module datePickerService
 */
import { registry } from '../core/registry.js';

class DatePickerService {
    constructor(utils) {
        this.utils = utils;
    }

    createCloseListener(containerId, triggerSelector) {
        const listener = (event) => {
            const container = document.getElementById(containerId);
            const trigger = document.querySelector(triggerSelector);
            if (container && !container.contains(event.target) && (!trigger || !trigger.contains(event.target))) {
                container.classList.add('hidden');
                document.removeEventListener('click', listener);
            }
        };
        return listener;
    }

    togglePicker(containerId, otherContainers, closeListener, renderCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        otherContainers.forEach(id => {
            const otherContainer = document.getElementById(id);
            if (otherContainer && otherContainer !== container) {
                otherContainer.classList.add('hidden');
            }
        });

        const isHidden = container.classList.contains('hidden');
        
        if (isHidden) {
            container.classList.remove('hidden');
            
            if (typeof renderCallback === 'function') {
                renderCallback(containerId);
            }
            
            if (!container.classList.contains('hidden') && typeof closeListener === 'function') {
                document.removeEventListener('click', closeListener);
                document.addEventListener('click', closeListener);
            }
        } else {
            container.classList.add('hidden');
        }
    }

    createDatePickerTemplate(id, inputId) {
        return `<div id="${id}" class="absolute z-50 mt-1 w-full border rounded-md shadow-lg hidden" style="background-color: var(--bg-secondary); border-color: var(--border-color);"><div class="p-3"><div class="flex justify-between items-center mb-3"><button type="button" class="px-2 py-1 text-sm" data-action="change-date-month" data-target="${inputId}" data-delta="-1" style="color: var(--text-primary);"><i data-lucide="chevron-left" class="inline-block" style="width: 16px; height: 16px;"></i></button><h3 id="current-date-month" class="text-sm font-medium" style="color: var(--text-primary);"></h3><button type="button" class="px-2 py-1 text-sm" data-action="change-date-month" data-target="${inputId}" data-delta="1" style="color: var(--text-primary);"><i data-lucide="chevron-right" class="inline-block" style="width: 16px; height: 16px;"></i></button></div><div class="grid grid-cols-7 gap-1 mb-2">${['日','一','二','三','四','五','六'].map(d => `<div class="text-center text-xs" style="color: var(--text-secondary);">${d}</div>`).join('')}</div><div id="date-grid" class="grid grid-cols-7 gap-1"></div></div></div>`;
    }

    createTimePickerTemplate(id, inputId) {
        return `<div id="${id}" class="absolute z-50 mt-1 w-full border rounded-md shadow-lg hidden" style="background-color: var(--bg-secondary); border-color: var(--border-color);"><div class="p-3"><div class="flex"><div class="flex-1 border-r" style="border-color: var(--border-color);"><div class="overflow-hidden max-h-40 overflow-y-auto scrollbar-hide">${Array.from({length:24},(_,i) => `<button type="button" class="w-full py-2 text-center text-sm" data-action="select-time-hour" data-input-id="${inputId}" data-hour="${String(i).padStart(2,'0')}" style="color: var(--text-primary);">${String(i).padStart(2,'0')}</button>`).join('')}</div></div><div class="flex-1"><div class="overflow-hidden max-h-40 overflow-y-auto scrollbar-hide">${Array.from({length:12},(_,i) => `<button type="button" class="w-full py-1.5 text-center text-sm" data-action="select-time-minute" data-input-id="${inputId}" data-minute="${String(i*5).padStart(2,'0')}" style="color: var(--text-primary);">${String(i*5).padStart(2,'0')}</button>`).join('')}</div></div></div></div></div>`;
    }

    toggleTimePicker(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!container.classList.contains('hidden')) return;

        if (this._timePickerCloseListener) {
            document.removeEventListener('click', this._timePickerCloseListener);
        }

        this._timePickerCloseListener = (event) => {
            const targetContainer = document.getElementById(containerId);
            const trigger = document.querySelector(`[data-action="toggle-time-picker"][data-target="${containerId}"]`);

            if (targetContainer && !targetContainer.contains(event.target) && (!trigger || !trigger.contains(event.target))) {
                targetContainer.classList.add('hidden');
                document.removeEventListener('click', this._timePickerCloseListener);
                this._timePickerCloseListener = null;
            }
        };

        this.togglePicker(
            containerId,
            [containerId, 'course-date-container', 'duration-dropdown'],
            this._timePickerCloseListener
        );
    }

    toggleDatePicker(containerId) {
        const closeListener = this.createCloseListener('course-date-container', '[data-action="toggle-date-picker"]');
        this.togglePicker(
            containerId,
            ['start-time-container', 'duration-dropdown'],
            closeListener,
            (id) => {
                if (id === 'course-date-container') {
                    const inputId = 'course-date';
                    const input = document.getElementById(inputId);
                    const date = input && input.value ? new Date(input.value) : new Date();
                    this.renderDatePicker(id, inputId, date);
                }
            }
        );
    }

    selectDate(inputId, date) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = date;
            
            const updateCalendarSelection = () => {
                const calendarCells = document.querySelectorAll('.calendar-cell');
                if (calendarCells.length > 0) {
                    document.querySelectorAll('.calendar-cell-selected').forEach(el => {
                        el.classList.remove('calendar-cell-selected');
                    });
                    const targetCell = document.querySelector(`.calendar-cell[data-date="${date}"]`);
                    if (targetCell) {
                        targetCell.classList.add('calendar-cell-selected');
                    }
                }
            };
            
            updateCalendarSelection();
            
            const currentPage = window.location.hash.slice(1) || '/';
            if (currentPage === '/') {
                if (typeof registry.get('render').calendar === 'function') {
                    registry.get('render').calendar();
                    setTimeout(updateCalendarSelection, 100);
                }
            }
            
            const container = document.getElementById('course-date-container');
            if (container) {
                container.classList.add('hidden');
            }
        }
    }

    changeDateMonth(inputId, delta) {
        const container = document.getElementById('course-date-container');
        const currentMonthElement = container ? container.querySelector('#current-date-month') : null;
        let year, month;
        
        if (currentMonthElement) {
            const monthText = currentMonthElement.textContent;
            const match = monthText.match(/(\d+)年(\d+)月/);
            if (match) {
                year = parseInt(match[1]);
                month = parseInt(match[2]) - 1 + delta;
            } else {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth() + delta;
            }
        } else {
            const input = document.getElementById(inputId);
            const d = input && input.value ? new Date(input.value) : new Date();
            year = d.getFullYear();
            month = d.getMonth() + delta;
        }
        
        this.renderDatePicker('course-date-container', inputId, new Date(year, month, 1));
    }

    renderDatePicker(containerId, inputId, date = new Date()) {
        const container = document.getElementById(containerId);
        if (container) {
            const dateGrid = container.querySelector('#date-grid');
            const currentMonthElement = container.querySelector('#current-date-month');
            
            if (dateGrid && currentMonthElement) {
                const year = date.getFullYear();
                const month = date.getMonth();
                
                const input = document.getElementById(inputId);
                const selectedDate = input ? input.value : '';
                
                currentMonthElement.textContent = `${year}年${month + 1}月`;
                
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const today = new Date();
                
                dateGrid.innerHTML = '';

                // 移除旧的 click 事件监听器（如果存在）
                if (this._dateGridClickHandler) {
                    dateGrid.removeEventListener('click', this._dateGridClickHandler);
                }

                // 创建新的处理器并保存引用
                this._dateGridClickHandler = (e) => {
                    const dayElement = e.target.closest('button[data-date]');
                    if (dayElement) {
                        this.selectDate(dayElement.dataset.inputId, dayElement.dataset.date);
                    }
                };
                dateGrid.addEventListener('click', this._dateGridClickHandler);

                const prevMonth = month === 0 ? 11 : month - 1;
                const prevYear = month === 0 ? year - 1 : year;
                const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
                
                for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                    const day = daysInPrevMonth - i;
                    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayElement = document.createElement('button');
                    dayElement.type = 'button';
                    
                    const isSelected = dateStr === selectedDate;
                    
                    if (isSelected) {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-selected date-picker-hover';
                    } else {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-hover';
                        dayElement.style.color = 'var(--text-secondary)';
                    }
                    
                    dayElement.textContent = day;
                    dayElement.dataset.date = dateStr;
                    dayElement.dataset.inputId = inputId;
                    dateGrid.appendChild(dayElement);
                }
                
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                    const isSelected = dateStr === selectedDate;
                    const dayElement = document.createElement('button');
                    dayElement.type = 'button';
                    
                    if (isSelected) {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-selected date-picker-hover';
                    } else if (isToday) {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-today date-picker-hover';
                    } else {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-hover';
                    }
                    
                    dayElement.textContent = day;
                    dayElement.dataset.date = dateStr;
                    dayElement.dataset.inputId = inputId;
                    dateGrid.appendChild(dayElement);
                }
                
                const nextMonth = month === 11 ? 0 : month + 1;
                const nextYear = month === 11 ? year + 1 : year;
                const remainingCells = 42 - dateGrid.children.length;
                
                for (let day = 1; day <= remainingCells; day++) {
                    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayElement = document.createElement('button');
                    dayElement.type = 'button';
                    
                    const isSelected = dateStr === selectedDate;
                    
                    if (isSelected) {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-selected date-picker-hover';
                    } else {
                        dayElement.className = 'w-full py-2 text-center text-sm date-picker-hover';
                        dayElement.style.color = 'var(--text-secondary)';
                    }
                    
                    dayElement.textContent = day;
                    dayElement.dataset.date = dateStr;
                    dayElement.dataset.inputId = inputId;
                    dateGrid.appendChild(dayElement);
                }
            }
        }
    }

}

export default DatePickerService;