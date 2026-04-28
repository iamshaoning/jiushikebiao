/**
 * 渲染服务模块
 * 负责页面渲染和UI更新
 */

class RenderService {
    constructor() {
        this.state = null;
    }

    /**
     * 初始化渲染服务
     * @param {Object} state - 全局状态
     */
    init(state) {
        this.state = state;
    }

    /**
     * 渲染页面
     * @param {string} pageName - 页面名称
     */
    page(pageName) {
        // 隐藏所有页面
        const pages = ['calendar-page', 'students-page', 'statistics-page'];
        pages.forEach(page => {
            const element = document.getElementById(page);
            if (element) {
                element.classList.add('hidden');
                element.classList.remove('active');
            }
        });

        // 显示目标页面
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.offsetHeight; // 强制重绘
            targetPage.classList.add('active');
        }

        // 更新导航按钮状态
        const navButtons = document.querySelectorAll('[data-page]');
        navButtons.forEach(button => {
            if (button.dataset.page === pageName) {
                button.classList.add('active', 'bg-gray-100');
            } else {
                button.classList.remove('active', 'bg-gray-100');
            }
        });

        // 根据页面类型执行相应的渲染
        if (pageName === 'calendar-page') {
            this.calendar();
        } else if (pageName === 'students-page') {
            this.students();
        } else if (pageName === 'statistics-page') {
            const { year, month, organization } = this.getStatisticsParams();
            this.statistics(year, month, organization);
        }
    }

    /**
     * 渲染日历页面
     */
    calendar() {
        if (!this.state) {
            throw new Error('渲染服务未初始化');
        }

        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        // 清空日历网格
        calendarGrid.innerHTML = '';

        // 获取当前月份的天数和第一天是星期几
        const year = this.state.currentYear;
        const month = this.state.currentMonth;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        // 创建日历头部
        const headerRow = document.createElement('div');
        headerRow.className = 'grid grid-cols-7 gap-1 mb-2';
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'text-center font-bold py-2';
            dayElement.textContent = day;
            headerRow.appendChild(dayElement);
        });
        calendarGrid.appendChild(headerRow);

        // 创建日历网格
        const gridRow = document.createElement('div');
        gridRow.className = 'grid grid-cols-7 gap-1';

        // 填充空白格子
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'p-1';
            gridRow.appendChild(emptyCell);
        }

        // 填充日期格子
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayCell = document.createElement('div');
            dayCell.className = 'p-1';

            const dayContent = document.createElement('div');
            dayContent.className = 'h-32 border rounded-lg p-2 overflow-y-auto';

            // 显示日期
            const dayHeader = document.createElement('div');
            dayHeader.className = 'font-bold mb-1';
            dayHeader.textContent = day;
            dayContent.appendChild(dayHeader);

            // 显示当天的课程
            const courses = this.state.coursesByDate.get(dateString) || [];
            courses.forEach(course => {
                const courseElement = document.createElement('div');
                courseElement.className = 'text-xs mb-1 p-1 bg-gray-100 rounded';
                courseElement.textContent = `${course.startTime} ${course.studentIds?.map(id => {
                    const student = this.state.studentsMap.get(id);
                    return student ? student.name : '未知学生';
                }).join(', ')}`;
                dayContent.appendChild(courseElement);
            });

            dayCell.appendChild(dayContent);
            gridRow.appendChild(dayCell);
        }

        calendarGrid.appendChild(gridRow);

        // 更新当前月份显示
        const currentMonthElement = document.getElementById('current-month');
        if (currentMonthElement) {
            const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
            currentMonthElement.textContent = `${year}年${monthNames[month]}`;
        }
    }

    /**
     * 渲染学生页面
     */
    students() {
        if (!this.state) {
            throw new Error('渲染服务未初始化');
        }

        const studentsList = document.getElementById('students-list');
        if (!studentsList) return;

        // 清空学生列表
        studentsList.innerHTML = '';

        // 按姓名排序学生
        const sortedStudents = [...this.state.students].sort((a, b) => a.name.localeCompare(b.name));

        // 渲染学生列表
        sortedStudents.forEach(student => {
            const studentElement = document.createElement('div');
            studentElement.className = 'student-item p-4 border-b flex justify-between items-center';
            studentElement.dataset.studentId = student.id;

            const studentInfo = document.createElement('div');
            studentInfo.className = 'student-info';
            studentInfo.innerHTML = `
                <div class="font-bold">${student.name}</div>
                <div class="text-sm text-gray-600">${student.organization || '未分配'} | ${student.grade || '未设置'}</div>
                <div class="text-sm text-gray-600">一对一: ${student.feeOneOnOne || 0}元/小时 | 多人课: ${student.feeGroup || 0}元/小时</div>
            `;

            const studentActions = document.createElement('div');
            studentActions.className = 'student-actions flex space-x-2';

            const editButton = document.createElement('button');
            editButton.className = 'px-3 py-1 bg-blue-500 text-white rounded';
            editButton.textContent = '编辑';
            editButton.dataset.action = 'edit-student';
            editButton.dataset.studentId = student.id;

            const deleteButton = document.createElement('button');
            deleteButton.className = 'px-3 py-1 bg-red-500 text-white rounded';
            deleteButton.textContent = '删除';
            deleteButton.dataset.action = 'delete-student';
            deleteButton.dataset.studentId = student.id;

            studentActions.appendChild(editButton);
            studentActions.appendChild(deleteButton);
            studentElement.appendChild(studentInfo);
            studentElement.appendChild(studentActions);
            studentsList.appendChild(studentElement);
        });
    }

    /**
     * 渲染统计页面
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称
     */
    statistics(year, month, organization) {
        // 这里实现统计页面的渲染逻辑
        // 由于统计功能比较复杂，这里只做简单的框架
        console.log('渲染统计页面:', { year, month, organization });
    }

    /**
     * 获取统计参数
     * @returns {Object} 统计参数
     */
    getStatisticsParams() {
        const yearValue = this.getCustomSelectValue('statistics-year-wrapper');
        const monthValue = this.getCustomSelectValue('statistics-month-wrapper');
        const organizationValue = this.getCustomSelectValue('statistics-organization-wrapper');
        const year = yearValue ? parseInt(yearValue) : new Date().getFullYear();
        const month = monthValue ? parseInt(monthValue) : new Date().getMonth();
        const organization = organizationValue || '';
        return { year, month, organization };
    }

    /**
     * 获取自定义选择器的值
     * @param {string} wrapperId - 包装器ID
     * @returns {string} 选择的值
     */
    getCustomSelectValue(wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return null;

        const selectedOption = wrapper.querySelector('.custom-select-option.selected');
        return selectedOption ? selectedOption.dataset.value : null;
    }

    /**
     * 刷新所有视图
     * @param {string} scope - 刷新范围
     */
    refreshAllViews(scope = null) {
        if (scope === 'students') {
            this.students();
        } else if (scope === 'calendar') {
            this.calendar();
        } else if (scope === 'statistics') {
            const { year, month, organization } = this.getStatisticsParams();
            this.statistics(year, month, organization);
        } else {
            // 刷新所有视图
            this.students();
            this.calendar();
            const { year, month, organization } = this.getStatisticsParams();
            this.statistics(year, month, organization);
        }
    }
}

// 导出单例实例
const renderService = new RenderService();
export default renderService;