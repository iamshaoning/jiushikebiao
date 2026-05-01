/**
 * 日历渲染服务模块
 * 负责日历页面的渲染逻辑
 */

export class CalendarRenderService {
    constructor(state, elements, utils) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
        
        // 将 getCourseTagHTML 方法绑定到 this
        this.getCourseTagHTML = (course) => {
            const primaryColor = course.colors[0] || 'var(--color-secondary)';
            return `
                <div class="course-tag-item course-item mt-1 rounded text-xs relative z-10"
                     data-action="course-click"
                     data-course-id="${course.id}"
                     style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent);">
                    <div class="tag-content p-1">
                        <div class="flex flex-wrap gap-1 mb-1">
                            ${course.studentNames.map((name, index) => {
                                const color = course.colors[index] || 'var(--color-secondary)';
                                return `
                                    <span class="px-1 py-0.5 rounded text-xs"
                                          style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">
                                        ${this.utils.escapeHtml(name)}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                        <div class="text-[10px]" style="color: var(--text-secondary);">${course.startTime} - ${this.utils.calculateEndTimeFromDuration(course.startTime, course.duration)}</div>
                        ${course.note ? `<div class="text-[9px] truncate" style="color: var(--text-secondary);">${this.utils.escapeHtml(course.note)}</div>` : ''}
                    </div>
                </div>
            `;
        };
    }

    /**
     * 渲染日历
     * @param {boolean} forceUpdate - 是否强制更新
     */
    calendar(forceUpdate = false) {
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        // 更新月份显示
        this.utils.safeSet(this.elements.calendarYearTrigger, 'textContent', `${year}年`);
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        this.utils.safeSet(this.elements.calendarMonthTrigger, 'textContent', monthNames[month]);

        // 更新日历年月下拉菜单的选中状态
        if (typeof this.utils.setCustomSelectValue === 'function') {
            this.utils.setCustomSelectValue('calendar-year-wrapper', year);
            this.utils.setCustomSelectValue('calendar-month-wrapper', month);
        }

        // 获取日历网格
        const grid = this.elements.calendarGrid;

        // 总是重新渲染整个日历，确保日期正确更新
        // 使用文档片段减少DOM操作
        const fragment = document.createDocumentFragment();

        // 计算月份数据
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const today = new Date();

        // 创建日期到课程的映射，优化性能
        const coursesByDate = new Map();
        this.state.courses.forEach(course => {
            if (!coursesByDate.has(course.date)) {
                coursesByDate.set(course.date, []);
            }
            coursesByDate.get(course.date).push(course);
        });

        // 添加上个月的日期（补齐第一行）
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastYear = month === 0 ? year - 1 : year;
        const daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate();

        for (let day = daysInLastMonth - firstDayOfMonth + 1; day <= daysInLastMonth; day++) {
            const dateStr = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const courses = coursesByDate.get(dateStr) || [];
            fragment.appendChild(this.createDayCell(day, dateStr, courses, false, false));
        }

        // 添加当前月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const courses = coursesByDate.get(dateStr) || [];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            fragment.appendChild(this.createDayCell(day, dateStr, courses, true, isToday));
        }

        // 添加下个月的日期
        const totalCells = 42;
        const cellsAdded = firstDayOfMonth + daysInMonth;
        const nextMonthCells = totalCells - cellsAdded;

        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;

        for (let day = 1; day <= nextMonthCells; day++) {
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const courses = coursesByDate.get(dateStr) || [];
            fragment.appendChild(this.createDayCell(day, dateStr, courses, false, false));
        }

        // 一次性添加所有单元格，减少DOM重排
        grid.innerHTML = '';
        grid.appendChild(fragment);

        // 为日历四个外角添加圆角
        const cells = grid.querySelectorAll('.calendar-cell');
        if (cells.length > 0) {
            // 左下角
            cells[cells.length - 7].style.borderBottomLeftRadius = '0.75rem';
            // 右下角
            cells[cells.length - 1].style.borderBottomRightRadius = '0.75rem';
        }

        // 为表头添加顶部圆角
        const headerRow = grid.previousElementSibling;
        if (headerRow) {
            // 为表头容器添加圆角
            headerRow.style.borderTopLeftRadius = '0.75rem';
            headerRow.style.borderTopRightRadius = '0.75rem';
            // 确保表头容器的溢出设置为hidden，裁剪内部元素的背景
            headerRow.style.overflow = 'hidden';

            // 为表头内部的第一个和最后一个单元格添加圆角
            const headerCells = headerRow.querySelectorAll('div');
            if (headerCells.length > 0) {
                // 第一个单元格（周日）
                headerCells[0].style.borderTopLeftRadius = '0.75rem';
                // 最后一个单元格（周六）
                headerCells[headerCells.length - 1].style.borderTopRightRadius = '0.75rem';
                // 确保内部单元格的背景色不会溢出
                headerCells.forEach(cell => {
                    cell.style.overflow = 'hidden';
                });
            }
        }

        // 同时为日历容器添加圆角，确保整体效果一致
        const calendarContainer = headerRow.parentElement;
        if (calendarContainer) {
            calendarContainer.style.borderTopLeftRadius = '0.75rem';
            calendarContainer.style.borderTopRightRadius = '0.75rem';
            calendarContainer.style.borderBottomLeftRadius = '0.75rem';
            calendarContainer.style.borderBottomRightRadius = '0.75rem';
            // 添加overflow: hidden确保背景色被正确裁剪
            calendarContainer.style.overflow = 'hidden';
        }

        // 标记日历已初始化
        grid._calendarInitialized = true;

        // 阻止浏览器默认文本选择行为（只添加一次）
        if (!grid._mousedownListenerAdded) {
            grid.addEventListener('mousedown', function(e) {
                // 阻止默认文本选择行为
                e.preventDefault();
            });
            grid._mousedownListenerAdded = true;
        }
    }

    /**
     * 更新所有包含课程的日期单元格
     */
    updateCourseCells() {
        // 创建日期到课程的映射，优化性能
        const coursesByDate = new Map();
        this.state.courses.forEach(course => {
            if (!coursesByDate.has(course.date)) {
                coursesByDate.set(course.date, []);
            }
            coursesByDate.get(course.date).push(course);
        });

        // 遍历所有日期单元格，只更新有课程的单元格
        const cells = document.querySelectorAll('.calendar-cell');
        cells.forEach(cell => {
            const dateStr = cell.dataset.date;
            if (dateStr) {
                const courses = coursesByDate.get(dateStr) || [];
                this.updateDayCell(cell, courses);
            }
        });
    }

    /**
     * 更新单个日期单元格的课程
     * @param {HTMLElement} cell - 单元格元素
     * @param {Array} courses - 课程列表
     */
    updateDayCell(cell, courses) {
        // 找到课程容器
        const coursesContainer = cell.querySelector('.course-container');
        if (coursesContainer) {
            let coursesHTML = '';
            if (courses.length > 0) {
                // 按开始时间排序课程
                const sortedCourses = [...courses].sort((a, b) => {
                    return a.startTime.localeCompare(b.startTime);
                });
                coursesHTML = sortedCourses.map(course => this.getCourseTagHTML(course)).join('');
            }

            // 更新课程容器的内容
            coursesContainer.innerHTML = coursesHTML;
        }
    }

    /**
     * 获取日期详细信息
     * @param {string} dateStr - 日期字符串
     * @returns {Object|null} 日期信息
     */
    getDateInfo(dateStr) {
        if (typeof chineseDays !== 'undefined') {
            try {
                const dayDetail = chineseDays.getDayDetail(dateStr);
                if (dayDetail) {
                    // 检查是否是真正的节假日（不是周末或普通工作日）
                    const isDayName = dayDetail.name === 'Sunday' ||
                        dayDetail.name === 'Monday' ||
                        dayDetail.name === 'Tuesday' ||
                        dayDetail.name === 'Wednesday' ||
                        dayDetail.name === 'Thursday' ||
                        dayDetail.name === 'Friday' ||
                        dayDetail.name === 'Saturday' ||
                        dayDetail.name === '1';

                    const info = {
                        isWorkday: dayDetail.work === true && !isDayName,
                        isHoliday: isDayName === false && dayDetail.work !== true,
                        isInLieu: chineseDays.isInLieu ? chineseDays.isInLieu(dateStr) : false,
                        name: ''
                    };

                    // 提取中文节假日名称（格式: "Holiday Name,中文名称"）
                    if (info.isHoliday && dayDetail.name) {
                        const nameParts = dayDetail.name.split(',');
                        // 找到包含中文字符的部分
                        const chineseName = nameParts.find(part => /[\u4e00-\u9fa5]/.test(part));
                        info.name = chineseName || nameParts[nameParts.length - 1] || dayDetail.name;
                    }
                    return info;
                }
            } catch (e) {
                console.error('Error checking date info:', e);
            }
        }
        return null;
    }

    /**
     * 创建日期单元格
     * @param {number} day - 日期
     * @param {string} dateStr - 日期字符串
     * @param {Array} courses - 课程列表
     * @param {boolean} isCurrentMonth - 是否当前月
     * @param {boolean} isToday - 是否今天
     * @returns {HTMLElement} 单元格元素
     */
    createDayCell(day, dateStr, courses, isCurrentMonth, isToday) {
        const cell = document.createElement('div');
        const dateInfo = this.getDateInfo(dateStr);
        const textColorClass = isCurrentMonth ? (isToday ? 'font-bold' : '') : '';
        const textColorStyle = isCurrentMonth ? (isToday ? 'var(--color-danger)' : 'var(--text-secondary)') : 'var(--text-secondary)';
        const borderClass = isToday ? 'today-border relative z-10 today-cell' : '';
        cell.className = `calendar-cell ${borderClass} border p-2 min-h-28 hover-cell transition-all cursor-pointer overflow-visible`;
        cell.style.backgroundColor = isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-content)';
        cell.style.color = textColorStyle;
        cell.tabIndex = 0; // 使单元格可以获得焦点
        cell.dataset.date = dateStr; // 添加日期数据属性
        let coursesHTML = '';
        if (courses.length > 0) {
            // 按开始时间排序课程
            const sortedCourses = [...courses].sort((a, b) => {
                return a.startTime.localeCompare(b.startTime);
            });
            coursesHTML = sortedCourses.map(course => this.getCourseTagHTML(course)).join('');
        }

        // 生成调休标识（彩色圆形背景白色文字）
        // 优先级：调 > 休 > 班
        let scheduleTag = '';
        if (dateInfo) {
            if (dateInfo.isInLieu) {
                // 调休 - 为了节假日连续休息，将本来周末的休息日调整到了这天，所以这天是休息日
                scheduleTag = '<span class="mr-2 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium">调</span>';
            } else if (dateInfo.isHoliday) {
                // 节假日
                scheduleTag = '<span class="mr-2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">休</span>';
            } else if (dateInfo.isWorkday) {
                // 周末需要上班的日子 - 本来要休息，因为节假日调休而需要上班
                const date = new Date(dateStr);
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    scheduleTag = '<span class="mr-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">班</span>';
                }
            }
        }

        // 生成节假日标签，根据不同节假日应用不同样式
        let holidayTag = '';
        if (dateInfo && dateInfo.isHoliday && dateInfo.name) {
            const holidayName = dateInfo.name;
            let tagClass = '';
            let holidayTagStyle = '';
            if (holidayName.includes('元旦')) {
                // 元旦：半透明浅红色背景，红字
                tagClass = 'bg-red-200 bg-opacity-60 text-red-600';
            } else if (holidayName.includes('春节')) {
                // 春节：金底红字
                tagClass = 'bg-yellow-300 text-[var(--color-danger)] font-bold';
            } else if (holidayName.includes('清明节') || holidayName.includes('清明')) {
                // 清明：透明底蓝字，加粗边框
                tagClass = 'border-2';
                holidayTagStyle = 'background-color: transparent; color: var(--color-info); border-color: var(--color-info);';
            } else if (holidayName.includes('劳动节')) {
                // 劳动节：透明底，金色字和加粗边框
                tagClass = 'border-2';
                holidayTagStyle = 'background-color: transparent; color: var(--color-warning); border-color: var(--color-warning);';
            } else if (holidayName.includes('端午')) {
                // 端午：半透明浅绿色背景，绿字
                tagClass = 'bg-green-200 bg-opacity-60 text-green-600';
            } else if (holidayName.includes('中秋') || holidayName.includes('中秋节')) {
                // 中秋：橙底白字
                tagClass = 'bg-orange-500 text-white';
            } else if (holidayName.includes('国庆')) {
                // 国庆：红底金字
                tagClass = 'bg-[var(--color-danger)] text-[var(--color-gold)] font-bold';
            } else {
                // 其他未定义的节假日：黄底黑字
                tagClass = 'bg-yellow-300 text-black';
            }

            if (!holidayTag) {
                if (holidayTagStyle) {
                    holidayTag = `<span class="mr-2 px-2 h-6 ${tagClass} rounded items-center justify-center text-xs font-semibold inline-flex shadow-sm" style="${holidayTagStyle}">${holidayName}</span>`;
                } else {
                    holidayTag = `<span class="mr-2 px-2 h-6 ${tagClass} rounded items-center justify-center text-xs font-semibold inline-flex shadow-sm">${holidayName}</span>`;
                }
            }
        }

        cell.innerHTML = `
            <div class="text-right ${textColorClass} flex items-center justify-end flex-wrap" style="color: ${textColorStyle};">
                <div class="flex items-center justify-end w-full">
                    ${holidayTag}
                    ${isToday ? '<span class="mr-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style="background-color: var(--color-danger); color: white;">今</span>' : ''}
                    ${scheduleTag}
                    ${day}
                </div>
            </div>
            <div class="course-container mt-1 space-y-1 max-h-[calc(100%-1rem)] overflow-y-auto overflow-x-hidden">
                ${coursesHTML}
            </div>
        `;

        // 单击选择日期，显示加号按钮
        return cell;
    }
}
