/**
 * 日期选择器服务模块
 * 负责处理日期选择器相关功能，包括创建日期选择器、时间选择器、日期选择等
 */
class DatePickerService {
    constructor(utils) {
        this.utils = utils;
    }

    createCloseListener(containerId, triggerSelector) {
        return (event) => {
            const container = document.getElementById(containerId);
            const trigger = document.querySelector(triggerSelector);
            if (container && !container.contains(event.target) && (!trigger || !trigger.contains(event.target))) {
                container.classList.add('hidden');
                document.removeEventListener('click', this.closeListener);
            }
        };
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
        return `
            <div class="date-picker" id="${id}-picker">
                <div class="date-picker-header">
                    <button class="date-picker-nav" data-action="prev-month">&lt;</button>
                    <span class="date-picker-title" id="${id}-title"></span>
                    <button class="date-picker-nav" data-action="next-month">&gt;</button>
                </div>
                <div class="date-picker-weekdays">
                    <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
                </div>
                <div class="date-picker-days" id="${id}-days"></div>
            </div>
        `;
    }

    createTimePickerTemplate(id, inputId) {
        return `
            <div class="time-picker" id="${id}-picker">
                <div class="time-picker-hours" id="${id}-hours"></div>
                <div class="time-picker-minutes" id="${id}-minutes"></div>
            </div>
        `;
    }

    toggleTimePicker(containerId) {
        const closeListener = (event) => {
            const startContainer = document.getElementById('start-time-container');
            const startTimeInput = document.querySelector('[data-action="toggle-time-picker"][data-target="start-time-container"]');

            if (startContainer && !startContainer.contains(event.target) && (!startTimeInput || !startTimeInput.contains(event.target))) {
                startContainer.classList.add('hidden');
                document.removeEventListener('click', closeListener);
            }
        };
        this.togglePicker(
            containerId,
            ['start-time-container', 'course-date-container', 'duration-dropdown'],
            closeListener
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
                if (typeof window.render?.calendar === 'function') {
                    window.render.calendar();
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
        let currentDate;
        
        if (currentMonthElement) {
            const monthText = currentMonthElement.textContent;
            const match = monthText.match(/(\d+)年(\d+)月/);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                currentDate = new Date(year, month, 1);
            } else {
                currentDate = new Date();
            }
        } else {
            const input = document.getElementById(inputId);
            currentDate = input && input.value ? new Date(input.value) : new Date();
        }
        
        currentDate.setDate(1);
        currentDate.setMonth(currentDate.getMonth() + delta);
        this.utils.renderDatePicker('course-date-container', inputId, currentDate);
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
                
                const prevMonth = month === 0 ? 11 : month - 1;
                const prevYear = month === 0 ? year - 1 : year;
                const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
                
                for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                    const day = daysInPrevMonth - i;
                    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayElement = document.createElement('button');
                    
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
                    dayElement.addEventListener('click', () => {
                        this.selectDate(inputId, dateStr);
                    });
                    dateGrid.appendChild(dayElement);
                }
                
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                    const isSelected = dateStr === selectedDate;
                    const dayElement = document.createElement('button');
                    
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
                    dayElement.addEventListener('click', () => {
                        this.selectDate(inputId, dateStr);
                    });
                    dateGrid.appendChild(dayElement);
                }
                
                const nextMonth = month === 11 ? 0 : month + 1;
                const nextYear = month === 11 ? year + 1 : year;
                const remainingCells = 42 - dateGrid.children.length;
                
                for (let day = 1; day <= remainingCells; day++) {
                    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayElement = document.createElement('button');
                    
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
                    dayElement.addEventListener('click', () => {
                        this.selectDate(inputId, dateStr);
                    });
                    dateGrid.appendChild(dayElement);
                }
            }
        }
    }
}

export default DatePickerService;