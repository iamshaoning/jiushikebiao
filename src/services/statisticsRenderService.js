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
            const color = utils.generateColor(org);
            const row = document.createElement('tr');
            row.style.backgroundColor = 'var(--bg-secondary)';
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">${utils.escapeHtml(org)}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap" style="color: var(--text-primary);">${stats.courses}节</td>
                <td class="px-4 py-3 whitespace-nowrap" style="color: var(--text-primary);">¥${stats.fee.toFixed(2)}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">${stats.students?.size || 0}人</span>
                </td>
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
                                <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(org)} 20%, transparent); color: ${utils.generateColor(org)}">
                                    ${org}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-left">
                                <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(grade)} 20%, transparent); color: ${utils.generateColor(grade)}">
                                    ${grade}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-left">
                                <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(String(stats.students.size))} 20%, transparent); color: ${utils.generateColor(String(stats.students.size))}">
                                    ${stats.students.size} 人
                                </span>
                            </td>
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
                    <h4 class="text-md font-medium text-gray-800 mb-3">一对一分布数据</h4>
                    <div class="text-center py-8 text-gray-500">
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
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(org)} 20%, transparent); color: ${utils.generateColor(org)}">
                                        ${org}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(grade)} 20%, transparent); color: ${utils.generateColor(grade)}">
                                        ${grade}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-left">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${utils.generateColor(studentCount)} 20%, transparent); color: ${utils.generateColor(studentCount)}">
                                        ${studentCount}人
                                    </span>
                                </td>
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
                const orgColor = utils.generateColor(student.organization);
                const gradeColor = utils.generateColor(student.grade);
                
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
