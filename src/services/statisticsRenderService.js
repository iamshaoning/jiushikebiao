/**
 * 统计渲染服务模块
 * 负责统计页面的渲染逻辑
 */

export class StatisticsRenderService {
    constructor(state, elements, chartService, statisticsCalculatorService) {
        this.state = state;
        this.elements = elements;
        this.chartService = chartService;
        this.statisticsCalculatorService = statisticsCalculatorService;
    }

    /**
     * 生成年份下拉菜单
     */
    generateYearDropdowns(utils) {
        const currentYear = new Date().getFullYear();
        const displayedYear = this.state.currentDate.getFullYear();
        const courseYears = new Set();

        this.state.courses.forEach(course => {
            if (course.date) {
                const year = parseInt(course.date.split('-')[0]);
                if (!isNaN(year)) {
                    courseYears.add(year);
                }
            }
        });

        let minYear = Math.min(currentYear - 1, displayedYear - 1);
        let maxYear = Math.max(currentYear + 1, displayedYear + 1);
        courseYears.forEach(year => {
            minYear = Math.min(minYear, year);
            maxYear = Math.max(maxYear, year);
        });

        utils.safeSet(this.elements.statisticsYearOptions, 'innerHTML', '');
        for (let year = minYear; year <= maxYear; year++) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            optionDiv.dataset.value = year;
            optionDiv.textContent = `${year}年`;
            if (year === currentYear) {
                optionDiv.classList.add('selected');
                utils.safeSet(this.elements.statisticsYearTrigger, 'textContent', `${year}年`);
            }
            utils.safe(this.elements.statisticsYearOptions, 'appendChild', optionDiv);
        }

        utils.safeSet(this.elements.calendarYearOptions, 'innerHTML', '');
        for (let i = minYear; i <= maxYear; i++) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option' + (i === this.state.currentDate.getFullYear() ? ' selected' : '');
            optionDiv.dataset.value = i;
            optionDiv.textContent = `${i}年`;
            utils.safe(this.elements.calendarYearOptions, 'appendChild', optionDiv);
        }
        utils.safeSet(this.elements.calendarYearTrigger, 'textContent', `${this.state.currentDate.getFullYear()}年`);
    }

    /**
     * 生成月份下拉菜单
     */
    generateMonthDropdowns(utils) {
        const currentMonth = new Date().getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        const monthOptions = utils.safe(this.elements.statisticsMonthWrapper, 'querySelectorAll', '.custom-option');
        const monthTrigger = utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-select-trigger span');
        if (monthOptions) {
            monthOptions.forEach((opt, index) => {
                if (index === currentMonth) {
                    opt.classList.add('selected');
                    utils.safeSet(monthTrigger, 'textContent', opt.textContent);
                } else {
                    opt.classList.remove('selected');
                }
            });
        }

        utils.safeSet(this.elements.calendarMonthOptions, 'innerHTML', '');
        monthNames.forEach((monthName, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option' + (index === this.state.currentDate.getMonth() ? ' selected' : '');
            optionDiv.dataset.value = index;
            optionDiv.textContent = monthName;
            utils.safe(this.elements.calendarMonthOptions, 'appendChild', optionDiv);
        });
        const calendarMonthTrigger = utils.safe(this.elements.calendarMonthWrapper, 'querySelector', '.custom-select-trigger span');
        utils.safeSet(calendarMonthTrigger, 'textContent', monthNames[this.state.currentDate.getMonth()]);
    }

    /**
     * 获取统计参数
     */
    getStatisticsParams(utils) {
        const year = parseInt(utils.safe(this.elements.statisticsYearWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getFullYear();
        const month = parseInt(utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getMonth();
        const organization = utils.safe(this.elements.statisticsOrgWrapper, 'querySelector', '.custom-option.selected')?.dataset.value || '';
        return { year, month, organization };
    }

    /**
     * 渲染统计页面
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称（可选）
     * @param {Object} utils - 工具函数对象
     */
    statistics(year, month, organization = '', utils) {
        // 定义月份名称
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        // 填充机构筛选下拉菜单
        const organizationOptions = document.getElementById('statistics-organization-options');
        const organizationTrigger = document.getElementById('statistics-organization-trigger');
        if (organizationOptions) {
            // 保存当前选中的值
            const currentValue = utils.getCustomSelectValue('statistics-organization-wrapper');
            // 清空现有选项，只保留"全部机构"
            organizationOptions.innerHTML = '<div class="custom-option ' + (currentValue === '' ? 'selected' : '') + '" data-value="">全部机构</div>';
            // 添加所有机构选项
            this.state.organizations.forEach(org => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option' + (org === currentValue ? ' selected' : '');
                optionDiv.dataset.value = org;
                optionDiv.textContent = org;
                organizationOptions.appendChild(optionDiv);
            });
            // 更新触发器显示文本
            if (organizationTrigger) {
                const selectedOption = organizationOptions.querySelector('.custom-option.selected');
                const triggerText = organizationTrigger.querySelector('span');
                if (triggerText) {
                    triggerText.textContent = selectedOption ? selectedOption.textContent : '全部机构';
                }
            }
        }

        // 计算统计数据
        const stats = this.statisticsCalculatorService.calculateStatistics(year, month, organization, utils);

        // 更新统计卡片
        utils.safeSet(this.elements.totalHours, 'textContent', stats.totalCourses);
        this.elements.totalHours.style.color = 'var(--color-primary)';
        utils.safeSet(this.elements.totalFee, 'textContent', `¥${stats.totalFee.toFixed(2)}`);
        this.elements.totalFee.style.color = 'var(--color-success)';
        utils.safeSet(this.elements.totalStudents, 'textContent', stats.uniqueStudents.size);
        this.elements.totalStudents.style.color = 'var(--color-purple)';

        // 渲染图表
        this.chartService.chart('organization-chart', stats.byOrganization, '机构课量分布', utils);

        // 渲染表格
        this.orgTable(stats.byOrganization, stats.totalCourses, utils);

        // 渲染详细课型分布表格
        this.detailedTypeTable(stats.detailedStats, utils);

        // 渲染学生数据模块
        this.studentData(stats.byStudent, utils);
    }

    /**
     * 渲染机构详细数据表格
     * @param {Object} data - 机构统计数据
     * @param {number} totalCourses - 总课程数
     * @param {Object} utils - 工具函数对象
     */
    orgTable(data, totalCourses, utils) {
        const tableBody = this.elements.organizationTable;
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (Object.keys(data).length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" class="px-4 py-8 text-center" style="color: var(--text-secondary);">
                    <i data-lucide="school" class="text-4xl mb-2 inline-block" style="color: var(--text-secondary); display: block; margin-left: auto; margin-right: auto; width: 24px; height: 24px;"></i><p>暂无机构数据</p>
                </td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        Object.entries(data).sort(([,a], [,b]) => b.courses - a.courses).forEach(([org, stats]) => {
            const pct = totalCourses > 0 ? (stats.courses / totalCourses * 100) : 0;
            const color = utils.generateColor(org, 'organization');
            const row = document.createElement('tr');
            row.style.backgroundColor = 'var(--bg-secondary)';
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">${utils.escapeHtml(org)}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap" style="color: var(--text-primary);">${stats.courses}节</td>
                <td class="px-4 py-3 whitespace-nowrap" style="color: var(--text-primary);">¥${stats.fee.toFixed(2)}</td>
                <td class="px-4 py-3 whitespace-nowrap" style="color: var(--text-primary);">${stats.students?.size || 0}人</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-24 rounded-full h-2 mr-2" style="background-color: var(--bg-content);">
                            <div class="rounded-full h-2" style="width: ${Math.min(pct, 100)}%; background-color: ${color}"></div>
                        </div>
                        <span class="text-xs" style="color: var(--text-secondary);">${pct.toFixed(1)}%</span>
                    </div>
                </td>
            `;
            fragment.appendChild(row);
        });
        tableBody.appendChild(fragment);
    }

    /**
     * 渲染详细课型分布表格
     * @param {Object} detailedStats - 详细统计数据
     * @param {Object} utils - 工具函数对象
     */
    detailedTypeTable(detailedStats, utils) {
        const detailedTableContainer = this.elements.detailedTypeTableContainer;
        if (!detailedTableContainer) return;

        // 一对一课程详细统计
        let oneOnOneHTML = '';
        const oneOnOneStats = detailedStats['一对一'];
        if (Object.keys(oneOnOneStats).length > 0) {
            oneOnOneHTML = `
                <div class="mb-6">
                    <h4 class="text-md font-medium mb-3" style="color: var(--text-primary);">一对一分布数据</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y" style="border-color: var(--border-color);">
                            <thead>
                                <tr style="background-color: var(--bg-secondary);">
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">机构</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">年级</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">学生数</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">课节数</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">课时费</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y" style="border-color: var(--border-color);">
            `;

            // 重构数据结构，按机构和年级排序
            const orgGradeStats = {};
            Object.entries(oneOnOneStats).forEach(([grade, orgStats]) => {
                Object.entries(orgStats).forEach(([org, stats]) => {
                    if (!orgGradeStats[org]) {
                        orgGradeStats[org] = {};
                    }
                    orgGradeStats[org][grade] = stats;
                });
            });

            // 按机构名称排序
            Object.entries(orgGradeStats).sort(([orgA], [orgB]) => orgA.localeCompare(orgB)).forEach(([org, gradeStats]) => {
                Object.entries(gradeStats).forEach(([grade, stats]) => {
                    oneOnOneHTML += `
                        <tr style="background-color: var(--bg-secondary);">
                            <td class="px-4 py-3 text-left">
                                <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(org, 'organization')} 20%, transparent); color: ${utils.generateColor(org, 'organization')}">
                                    ${org}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-left">
                                <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(grade, 'grade')} 20%, transparent); color: ${utils.generateColor(grade, 'grade')}">
                                    ${grade}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${stats.students.size}人</td>
                            <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${stats.courses}节</td>
                            <td class="px-4 py-3 text-left" style="color: var(--text-primary);">¥${stats.fee.toFixed(2)}</td>
                        </tr>
                    `;
                });
            });
            oneOnOneHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            oneOnOneHTML = `
                <div class="mb-6">
                    <h4 class="text-md font-medium mb-3" style="color: var(--text-primary);">一对一分布数据</h4>
                    <div class="text-center py-8" style="color: var(--text-secondary);">
                        <i data-lucide="user-round" style="color: var(--text-secondary); display: block; margin-left: auto; margin-right: auto;" class="text-4xl mb-2"></i>
                        <p style="color: var(--text-secondary);">暂无一对一课程数据</p>
                    </div>
                </div>
            `;
        }

        // 多人课课程详细统计
        let groupHTML = '';
        const groupStats = detailedStats['多人课'];
        if (Object.keys(groupStats).length > 0) {
            groupHTML = `
                <div>
                    <h4 class="text-md font-medium mb-3" style="color: var(--text-primary);">多人课分布数据</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y" style="border-color: var(--border-color);">
                            <thead>
                                <tr style="background-color: var(--bg-secondary);">
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">机构</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">年级</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">上课人数</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">课节数</th>
                                    <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">课时费</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y" style="border-color: var(--border-color);">
            `;

            // 重构数据结构，按机构、年级和人数排序
            const orgGradeCountStats = {};
            Object.entries(groupStats).forEach(([studentCount, gradeStats]) => {
                Object.entries(gradeStats).forEach(([grade, orgStats]) => {
                    Object.entries(orgStats).forEach(([org, stats]) => {
                        if (!orgGradeCountStats[org]) {
                            orgGradeCountStats[org] = {};
                        }
                        if (!orgGradeCountStats[org][grade]) {
                            orgGradeCountStats[org][grade] = {};
                        }
                        orgGradeCountStats[org][grade][studentCount] = stats;
                    });
                });
            });

            // 按机构名称排序
            Object.entries(orgGradeCountStats).sort(([orgA], [orgB]) => orgA.localeCompare(orgB)).forEach(([org, gradeStats]) => {
                Object.entries(gradeStats).forEach(([grade, countStats]) => {
                    Object.entries(countStats).sort(([countA], [countB]) => parseInt(countA) - parseInt(countB)).forEach(([studentCount, stats]) => {
                        groupHTML += `
                            <tr style="background-color: var(--bg-secondary);">
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(org, 'organization')} 20%, transparent); color: ${utils.generateColor(org, 'organization')}">
                                        ${org}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(grade, 'grade')} 20%, transparent); color: ${utils.generateColor(grade, 'grade')}">
                                        ${grade}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${studentCount}人</td>
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${stats.courses}节</td>
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">¥${stats.fee.toFixed(2)}</td>
                            </tr>
                        `;
                    });
                });
            });
            groupHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            groupHTML = `
                <div>
                    <h4 class="text-md font-medium mb-3" style="color: var(--text-primary);">多人课分布数据</h4>
                    <div class="text-center py-8" style="color: var(--text-secondary);">
                        <i data-lucide="users-round" style="color: var(--text-secondary); display: block; margin-left: auto; margin-right: auto;" class="text-4xl mb-2"></i>
                        <p>暂无多人课课程数据</p>
                    </div>
                </div>
            `;
        }

        // 组装完整的HTML
        detailedTableContainer.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold" style="color: var(--text-primary);">机构课型数据</h3>
            </div>
            ${oneOnOneHTML}
            ${groupHTML}
        `;

        // 重新初始化 Lucide 图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * 渲染学生数据模块
     * @param {Object} studentStats - 学生统计数据
     * @param {Object} utils - 工具函数对象
     */
    studentData(studentStats, utils) {
        const container = this.elements.studentDataContainer;
        if (!container) return;

        // 按课程数量排序学生
        const sortedStudents = Object.entries(studentStats)
            .map(([studentId, stats]) => {
                const student = this.state.students.find(s => s.id === studentId);
                return {
                    id: studentId,
                    name: student ? student.name : '未知学生',
                    organization: student ? student.organization : '未分配',
                    grade: student ? student.grade : '未设置',
                    courses: stats.courses,
                    fee: stats.fee
                };
            })
            .sort((a, b) => b.courses - a.courses);

        if (sortedStudents.length > 0) {
            let html = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y" style="border-color: var(--border-color);">
                        <thead>
                            <tr style="background-color: var(--bg-secondary);">
                                <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">学生姓名</th>
                                <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">所属机构</th>
                                <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">年级</th>
                                <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">上课节数</th>
                                <th class="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider w-1/5" style="color: var(--text-secondary);">课时费</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y" style="border-color: var(--border-color);">
            `;

            sortedStudents.forEach(student => {
                const orgColor = utils.generateColor(student.organization, 'organization');
                const gradeColor = utils.generateColor(student.grade, 'grade');

                html += `
                            <tr style="background-color: var(--bg-secondary);">
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${utils.escapeHtml(student.name)}</td>
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${orgColor} 20%, transparent); color: ${orgColor}">
                                        ${utils.escapeHtml(student.organization)}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${gradeColor} 20%, transparent); color: ${gradeColor}">
                                        ${utils.escapeHtml(student.grade)}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">${student.courses}节</td>
                                <td class="px-4 py-3 text-left" style="color: var(--text-primary);">¥${student.fee.toFixed(2)}</td>
                            </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold" style="color: var(--text-primary);">学生课量数据</h3>
                </div>
                ${html}
            `;
        } else {
            container.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium" style="color: var(--text-primary);">学生课量数据</h3>
                </div>
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <i data-lucide="user-round-pen" style="color: var(--text-secondary); display: block; margin-left: auto; margin-right: auto;" class="text-4xl mb-2"></i>
                    <p>暂无学生课量数据</p>
                </div>
            `;
        }

        // 重新初始化 Lucide 图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}