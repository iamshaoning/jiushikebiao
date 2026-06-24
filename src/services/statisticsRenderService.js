/**
 * 统计渲染服务
 *
 * @description 渲染统计页面：机构课量分布表格、一对一/多人课分布表格、学生课量数据、图表
 * @module statisticsRenderService
 */
import { registry } from '../core/registry.js';
export class StatisticsRenderService {
    constructor(state, elements, chartService, statisticsCalculatorService) {
        this.state = state;
        this.elements = elements;
        this.chartService = chartService;
        this.statisticsCalculatorService = statisticsCalculatorService;
    }

    generateYearDropdowns(utils) {
        const currentYear = new Date().getFullYear(), displayedYear = this.state.currentDate.getFullYear(), courseYears = new Set();
        this.state.courses.forEach(course => { if (course.date) { const y = parseInt(course.date.split('-')[0]); if (!isNaN(y)) courseYears.add(y); } });
        let minYear = Math.min(currentYear - 1, displayedYear - 1), maxYear = Math.max(currentYear + 1, displayedYear + 1);
        courseYears.forEach(y => { minYear = Math.min(minYear, y); maxYear = Math.max(maxYear, y); });
        utils.safeSet(this.elements.statisticsYearOptions, 'innerHTML', '');
        for (let y = minYear; y <= maxYear; y++) { const od = document.createElement('div'); od.className = 'custom-option'; od.dataset.value = y; od.textContent = y + '年'; if (y === currentYear) { od.classList.add('selected'); utils.safeSet(this.elements.statisticsYearTrigger, 'textContent', y + '年'); } utils.safe(this.elements.statisticsYearOptions, 'appendChild', od); }
        utils.safeSet(this.elements.calendarYearOptions, 'innerHTML', '');
        for (let i = minYear; i <= maxYear; i++) { const od = document.createElement('div'); od.className = 'custom-option' + (i === this.state.currentDate.getFullYear() ? ' selected' : ''); od.dataset.value = i; od.textContent = i + '年'; utils.safe(this.elements.calendarYearOptions, 'appendChild', od); }
        utils.safeSet(this.elements.calendarYearTrigger, 'textContent', this.state.currentDate.getFullYear() + '年');
    }

    generateMonthDropdowns(utils) {
        const currentMonth = new Date().getMonth(), monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        const monthOptions = utils.safe(this.elements.statisticsMonthWrapper, 'querySelectorAll', '.custom-option'), monthTrigger = utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-select-trigger span');
        if (monthOptions) monthOptions.forEach((opt, i) => { if (opt.dataset.value === 'all') { opt.classList.remove('selected'); } else if (i - 1 === currentMonth) { opt.classList.add('selected'); utils.safeSet(monthTrigger, 'textContent', opt.textContent); } else opt.classList.remove('selected'); });
        utils.safeSet(this.elements.calendarMonthOptions, 'innerHTML', '');
        monthNames.forEach((mn, i) => { const od = document.createElement('div'); od.className = 'custom-option' + (i === this.state.currentDate.getMonth() ? ' selected' : ''); od.dataset.value = i; od.textContent = mn; utils.safe(this.elements.calendarMonthOptions, 'appendChild', od); });
        const ct = utils.safe(this.elements.calendarMonthWrapper, 'querySelector', '.custom-select-trigger span'); utils.safeSet(ct, 'textContent', monthNames[this.state.currentDate.getMonth()]);
    }

    getStatisticsParams(utils) {
        const year = parseInt(utils.safe(this.elements.statisticsYearWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getFullYear();
        const monthValue = utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-option.selected')?.dataset.value;
        const parsedMonth = parseInt(monthValue);
        const month = monthValue === 'all' ? 'all' : (isNaN(parsedMonth) ? new Date().getMonth() : parsedMonth);
        const organization = utils.safe(this.elements.statisticsOrganizationWrapper, 'querySelector', '.custom-option.selected')?.dataset.value || '';
        return { year, month, organization };
    }

    statistics(year, month, organization, utils) {
        const oo = this.elements.statisticsOrganizationOptions, ot = this.elements.statisticsOrganizationTrigger;
        if (oo) { const cv = utils.getCustomSelectValue('statistics-organization-wrapper'); oo.innerHTML = '<div class="custom-option ' + (cv === '' ? 'selected' : '') + '" data-value="">全部机构</div>'; this.state.organizations.forEach(org => { const od = document.createElement('div'); od.className = 'custom-option' + (org === cv ? ' selected' : ''); od.dataset.value = org; od.textContent = org; oo.appendChild(od); }); if (ot) { const so = oo.querySelector('.custom-option.selected'); ot.textContent = so ? so.textContent : '全部机构'; } }
        const stats = this.statisticsCalculatorService.calculateStatistics(year, month, organization, utils);
        utils.safeSet(this.elements.totalHours, 'textContent', stats.totalCourses); if (this.elements.totalHours) this.elements.totalHours.style.color = 'var(--color-primary)';
        utils.safeSet(this.elements.totalFee, 'textContent', '¥' + stats.totalFee.toFixed(0)); if (this.elements.totalFee) this.elements.totalFee.style.color = 'var(--color-success)';
        utils.safeSet(this.elements.totalStudents, 'textContent', stats.uniqueStudents.size); if (this.elements.totalStudents) this.elements.totalStudents.style.color = 'var(--color-purple)';
        this.chartService.chart('organization-chart', stats.byOrganization, '机构课量分布', utils);
        this.orgTable(stats.byOrganization, stats.totalCourses, utils);
        this.detailedTypeTable(stats.detailedStats, utils);
        this.studentData(stats.byStudent, utils);
    }

    orgTable(data, totalCourses, utils) {
        const tb = this.elements.organizationTable; if (!tb) return; tb.innerHTML = '';
        if (!Object.keys(data).length) { tb.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center" style="color:var(--text-secondary)"><i data-lucide="file-x" style="display:block;margin:0 auto 8px" class="text-3xl"></i><p>暂无数据</p></td></tr>'; if (registry.get('lucide')) registry.get('lucide').createIcons({ nodes: [tb] }); return; }
        const f = document.createDocumentFragment();
        Object.entries(data).sort(function([,a],[,b]) { return b.courses - a.courses; }).forEach(function([org, stats]) {
            const pct = totalCourses > 0 ? (stats.courses / totalCourses * 100) : 0, color = utils.generateColor(org, 'organization'), row = document.createElement('tr');
            row.style.backgroundColor = 'var(--bg-secondary)';
            row.innerHTML = '<td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + color + ' 20%, transparent); color:' + color + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + stats.courses + '节</td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + stats.fee.toFixed(0) + '</td><td class="px-4 py-3" style="color:var(--text-primary)">' + (stats.students?.size || 0) + '人</td><td class="px-4 py-3"><div class="flex items-center"><div class="w-24 rounded-full h-2 mr-2" style="background-color:var(--bg-content)"><div class="rounded-full h-2" style="width:' + Math.min(pct, 100) + '%; background-color:' + color + '"></div></div><span class="text-xs" style="color:var(--text-secondary)">' + pct.toFixed(1) + '%</span></div></td>';
           f.appendChild(row);
        });
        tb.appendChild(f);
    }

    _renderTable(title, headers, rows) {
        let h = '<h4 class="text-md font-medium mb-3" style="color:var(--text-primary)">' + title + '</h4>';
        if (!rows.length) return '<div class="mb-6">' + h + '<div class="text-center py-8" style="color:var(--text-secondary)"><i data-lucide="file-x" style="display:block;margin:0 auto 8px" class="text-3xl"></i><p>暂无数据</p></div></div>';
        let th = ''; headers.forEach(function(hdr) { th += '<th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">' + hdr + '</th>'; });
        return '<div class="mb-6">' + h + '<div class="overflow-x-auto"><table class="min-w-full divide-y" style="border-color:var(--border-color);table-layout:fixed"><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr style="background-color:var(--bg-secondary)">' + th + '</tr></thead><tbody class="divide-y" style="border-color:var(--border-color)">' + rows.join('') + '</tbody></table></div></div>';
    }

    _renderOneOnOneTable(stats, utils) {
        if (!Object.keys(stats).length) return this._renderTable('一对一分布数据', ['机构','年级','学生数','课节数','课时费'], []);
        const orgGradeStats = {}; Object.entries(stats).forEach(function([grade, orgStats]) { Object.entries(orgStats).forEach(function([org, s]) { if (!orgGradeStats[org]) orgGradeStats[org] = {}; orgGradeStats[org][grade] = s; }); });
        const rows = []; Object.entries(orgGradeStats).sort(function([a],[b]) { return a.localeCompare(b); }).forEach(function([org, gradeStats]) { Object.entries(gradeStats).forEach(function([grade, s]) { rows.push('<tr><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(org,'organization') + ' 20%,transparent);color:' + utils.generateColor(org,'organization') + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(grade,'grade') + ' 20%,transparent);color:' + utils.generateColor(grade,'grade') + '">' + utils.escapeHtml(grade) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + s.students.size + '人</td><td class="px-4 py-3"><span class="cursor-pointer hover:underline font-medium" style="color:var(--color-primary)" data-action="show-course-detail" data-lesson-type="一对一" data-org="' + utils.escapeHtml(org) + '" data-grade="' + utils.escapeHtml(grade) + '">' + s.courses + '节</span></td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(0) + '</td></tr>'); }); });
        return this._renderTable('一对一分布数据', ['机构','年级','学生数','课节数','课时费'], rows);
    }

    _renderGroupTable(stats, utils) {
        if (!Object.keys(stats).length) return this._renderTable('多人课分布数据', ['机构','年级','上课人数','课节数','课时费'], []);
        const orgGradeCountStats = {}; Object.entries(stats).forEach(function([sc, gs]) { Object.entries(gs).forEach(function([grade, os]) { Object.entries(os).forEach(function([org, s]) { if (!orgGradeCountStats[org]) orgGradeCountStats[org] = {}; if (!orgGradeCountStats[org][grade]) orgGradeCountStats[org][grade] = {}; orgGradeCountStats[org][grade][sc] = s; }); }); });
        const rows = []; Object.entries(orgGradeCountStats).sort(function([a],[b]) { return a.localeCompare(b); }).forEach(function([org, gs]) { Object.entries(gs).forEach(function([grade, cs]) { Object.entries(cs).sort(function([ca],[cb]) { return parseInt(ca) - parseInt(cb); }).forEach(function([sc, s]) { rows.push('<tr><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(org,'organization') + ' 20%,transparent);color:' + utils.generateColor(org,'organization') + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(grade,'grade') + ' 20%,transparent);color:' + utils.generateColor(grade,'grade') + '">' + utils.escapeHtml(grade) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + sc + '人</td><td class="px-4 py-3"><span class="cursor-pointer hover:underline font-medium" style="color:var(--color-primary)" data-action="show-course-detail" data-lesson-type="多人课" data-org="' + utils.escapeHtml(org) + '" data-grade="' + utils.escapeHtml(grade) + '" data-student-count="' + sc + '">' + s.courses + '节</span></td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(0) + '</td></tr>'); }); }); });
        return this._renderTable('多人课分布数据', ['机构','年级','上课人数','课节数','课时费'], rows);
    }

    detailedTypeTable(detailedStats, utils) {
        const c = this.elements.detailedTypeTableContainer; if (!c) return;
        c.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold" style="color:var(--text-primary)">机构课型数据</h3></div>' + this._renderOneOnOneTable(detailedStats['一对一'], utils) + this._renderGroupTable(detailedStats['多人课'], utils);
    }

    studentData(studentStats, utils) {
        const c = this.elements.studentDataContainer; if (!c) return;
        const sorted = Object.entries(studentStats).map(function([sid, s]) { const st = this.state.students.find(function(s) { return s.id === sid; }); return { id: sid, name: st ? st.name : '未知', organization: st ? st.organization : '', grade: st ? st.grade : '', courses: s.courses, fee: s.fee }; }.bind(this)).sort(function(a, b) { return b.courses - a.courses; });
        if (sorted.length > 0) {
            let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y" style="border-color:var(--border-color);table-layout:fixed"><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr style="background-color:var(--bg-secondary)"><th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">学生姓名</th><th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">所属机构</th><th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">年级</th><th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">课节数</th><th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">课时费</th></tr></thead><tbody class="divide-y" style="border-color:var(--border-color)">';
            sorted.forEach(function(s) { const oc = utils.generateColor(s.organization, 'organization'), gc = utils.generateColor(s.grade, 'grade'); html += '<tr><td class="px-4 py-3" style="color:var(--text-primary)">' + utils.escapeHtml(s.name) + '</td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + oc + ' 20%,transparent);color:' + oc + '">' + utils.escapeHtml(s.organization) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + gc + ' 20%,transparent);color:' + gc + '">' + utils.escapeHtml(s.grade) + '</span></td><td class="px-4 py-3"><span class="cursor-pointer hover:underline font-medium" style="color:var(--color-primary)" data-action="show-course-detail" data-student-id="' + s.id + '">' + s.courses + '节</span></td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(0) + '</td></tr>'; });
            html += '</tbody></table></div>';
            c.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold" style="color:var(--text-primary)">学生课量数据</h3></div>' + html;
        } else { c.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-medium" style="color:var(--text-primary)">学生课量数据</h3></div><div class="text-center py-8" style="color:var(--text-secondary)"><i data-lucide="file-x" style="display:block;margin:0 auto 8px" class="text-3xl"></i><p>暂无数据</p></div>'; if (registry.get('lucide')) registry.get('lucide').createIcons({ nodes: [c] }); }
    }

    /**
     * 根据筛选条件查找匹配的课程
     */
    _filterCoursesByDetail(year, month, globalOrg, detailFilter) {
        const isFullYear = month === 'all';
        let filtered = this.state.courses.filter(course => {
            const [courseYear, courseMonth] = course.date.split('-').map(Number);
            if (isFullYear) return courseYear === year;
            return courseYear === year && courseMonth === month + 1;
        });

        // 课型筛选
        if (detailFilter.lessonType) {
            filtered = filtered.filter(c => (c.lessonType || '一对一') === detailFilter.lessonType);
        }

        // 多人课人数筛选
        if (detailFilter.studentCount) {
            const sc = parseInt(detailFilter.studentCount);
            filtered = filtered.filter(c => c.studentIds && c.studentIds.length === sc);
        }

        // 学生筛选
        if (detailFilter.studentId) {
            filtered = filtered.filter(c =>
                c.studentIds && Array.isArray(c.studentIds) && c.studentIds.includes(detailFilter.studentId)
            );
        }

        // 机构/年级筛选（排除学生ID筛选路径，因为学生已有明确机构）
        if (!detailFilter.studentId && (detailFilter.org || detailFilter.grade || globalOrg)) {
            filtered = filtered.filter(c => {
                if (!c.studentIds || !Array.isArray(c.studentIds)) return false;
                return c.studentIds.some(sid => {
                    const student = this.state.students.find(s => s.id === sid);
                    if (!student) return false;
                    if (globalOrg && student.organization !== globalOrg) return false;
                    if (detailFilter.org && student.organization !== detailFilter.org) return false;
                    if (detailFilter.grade && student.grade !== detailFilter.grade) return false;
                    return true;
                });
            });
        }

        // 日期排序
        filtered.sort((a, b) => a.date.localeCompare(b.date));
        return filtered;
    }

    /**
     * 展示课程详情模态框
     * @param {Object} detailFilter - 筛选条件 { lessonType, org, grade, studentCount, studentId }
     * @param {Object} utils
     */
    showCourseDetail(detailFilter, utils) {
        // 获取当前统计页面的全局筛选参数
        const year = parseInt(utils.safe(this.elements.statisticsYearWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getFullYear();
        const monthValue = utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-option.selected')?.dataset.value;
        const month = monthValue === 'all' ? 'all' : (parseInt(monthValue) || new Date().getMonth());
        const globalOrg = utils.safe(this.elements.statisticsOrganizationWrapper, 'querySelector', '.custom-option.selected')?.dataset.value || '';

        const courses = this._filterCoursesByDetail(year, month, globalOrg, detailFilter);

        // 月份标签
        const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        const monthLabel = month === 'all' ? '全年' : (monthNames[month] || `${month + 1}月`);

        // 构建标题
        let title = '课节数详情';
        if (detailFilter.studentId) {
            const st = this.state.students.find(s => s.id === detailFilter.studentId);
            title = st ? utils.escapeHtml(st.name) + ' 的课节详情' : '课节数详情';
        } else if (detailFilter.lessonType) {
            const parts = [];
            if (detailFilter.org) parts.push(detailFilter.org);
            if (detailFilter.grade) parts.push(detailFilter.grade);
            parts.push(detailFilter.lessonType);
            if (detailFilter.studentCount) parts.push(detailFilter.studentCount + '人');
            title = parts.join(' · ');
        }

        if (courses.length === 0) {
            registry.get('modalService').show(
                '<div class="text-center py-6"><h3 class="text-lg font-semibold mb-2" style="color:var(--text-primary); display: flex; align-items: center; gap: 6px; justify-content: center;"><i data-lucide="list" class="inline-block" style="width: 18px; height: 18px;"></i>' + title + '</h3><p class="text-sm mb-1" style="color:var(--text-secondary)">' + year + '年' + monthLabel + '</p><p style="color:var(--text-secondary)">暂无可显示的课程</p></div>'
            );
            return;
        }

        let html = '';
        // 标题区
        html += '<div style="min-width:400px">';
        html += '<div class="mb-4 px-1">';
        html += '<h3 class="text-lg font-semibold" style="color:var(--text-primary); display: flex; align-items: center; gap: 6px;"><i data-lucide="list" class="inline-block" style="width: 18px; height: 18px;"></i>' + title + '</h3></div>';

        // 课统计信息条
        const oneOnOneCount = courses.filter(c => c.lessonType !== '多人课').length;
        const groupCount = courses.filter(c => c.lessonType === '多人课').length;
        const totalFee = courses.reduce((sum, c) => {
            if (c.lessonType === '多人课' && c.fees && c.fees[0] !== undefined) return sum + c.fees[0];
            if (c.fees && Array.isArray(c.fees) && c.fees.length > 0) return sum + c.fees.reduce((s, f) => s + f, 0);
            return sum;
        }, 0);
        html += '<div class="flex gap-2 mb-4">';
        html += '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md" style="background:color-mix(in srgb,var(--color-primary) 10%,transparent);color:var(--color-primary)">一对一 ' + oneOnOneCount + '</span>';
        html += '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md" style="background:color-mix(in srgb,var(--color-purple) 12%,transparent);color:var(--color-purple)">多人课 ' + groupCount + '</span>';
        html += '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md" style="background:color-mix(in srgb,var(--color-success) 10%,transparent);color:var(--color-success)">¥' + totalFee.toFixed(0) + '</span>';
        html += '</div>';

        // 表格区域
        html += '<div class="scroll-fade-bottom"><div class="max-h-96 overflow-auto" id="course-detail-table-container">';
        html += '<table class="w-full text-sm" style="border-collapse:separate;border-spacing:0;table-layout:fixed"><colgroup><col style="width:25%"><col style="width:15%"><col style="width:45%"><col style="width:15%"></colgroup>';
        html += '<thead><tr class="text-left">';
        html += '<th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-secondary);background:color-mix(in srgb,var(--bg-content) 50%,transparent);border-bottom:2px solid var(--border-color);border-radius:6px 0 0 0">日期</th>';
        html += '<th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-secondary);background:color-mix(in srgb,var(--bg-content) 50%,transparent);border-bottom:2px solid var(--border-color)">时间</th>';
        html += '<th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-secondary);background:color-mix(in srgb,var(--bg-content) 50%,transparent);border-bottom:2px solid var(--border-color)">学生</th>';
        html += '<th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-right" style="color:var(--text-secondary);background:color-mix(in srgb,var(--bg-content) 50%,transparent);border-bottom:2px solid var(--border-color);border-radius:0 6px 0 0">费用</th>';
        html += '</tr></thead><tbody>';

        courses.forEach(function(course, index) {
            const studentNames = (course.studentNames || []).join('、') || '-';
            const startTime = course.startTime ? course.startTime.substring(0, 5) : '-';
            let feeDisplay = '-';
            if (course.lessonType === '多人课' && course.fees && course.fees[0] !== undefined) {
                feeDisplay = '¥' + course.fees[0].toFixed(0);
            } else if (course.fees && Array.isArray(course.fees) && course.fees.length > 0) {
                feeDisplay = '¥' + course.fees.reduce(function(s, f) { return s + f; }, 0).toFixed(0);
            }
            var bgStyle = index % 2 === 0 ? '' : 'background:color-mix(in srgb,var(--bg-content) 30%,transparent)';
            html += '<tr class="transition-colors" style="' + bgStyle + ';border-bottom:1px solid var(--border-color)">';
            html += '<td class="px-3 py-2.5" style="color:var(--text-primary)">' + course.date + '</td>';
            html += '<td class="px-3 py-2.5" style="color:var(--text-primary)">' + startTime + '</td>';
            html += '<td class="px-3 py-2.5" style="color:var(--text-primary);word-break:break-all">' + utils.escapeHtml(studentNames) + '</td>';
            html += '<td class="px-3 py-2.5 text-right text-sm font-medium" style="color:var(--color-success)">' + feeDisplay + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div></div>';
        registry.get('modalService').show(html, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                const wrapper = document.querySelector('#course-detail-table-container')?.closest('.scroll-fade-bottom');
                const container = document.getElementById('course-detail-table-container');
                if (wrapper && container) {
                    const checkScroll = () => {
                        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
                        wrapper.classList.toggle('scrolled-to-bottom', atBottom);
                    };
                    container.addEventListener('scroll', checkScroll);
                    checkScroll();
                }
            }
        });
    }
}
