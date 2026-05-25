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
        utils.safeSet(this.elements.totalFee, 'textContent', '¥' + stats.totalFee.toFixed(2)); if (this.elements.totalFee) this.elements.totalFee.style.color = 'var(--color-success)';
        utils.safeSet(this.elements.totalStudents, 'textContent', stats.uniqueStudents.size); if (this.elements.totalStudents) this.elements.totalStudents.style.color = 'var(--color-purple)';
        this.chartService.chart('organization-chart', stats.byOrganization, '机构课量分布', utils);
        this.orgTable(stats.byOrganization, stats.totalCourses, utils);
        this.detailedTypeTable(stats.detailedStats, utils);
        this.studentData(stats.byStudent, utils);
    }

    orgTable(data, totalCourses, utils) {
        const tb = this.elements.organizationTable; if (!tb) return; tb.innerHTML = '';
        if (!Object.keys(data).length) { tb.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center" style="color:var(--text-secondary)"><p>暂无机构数据</p></td></tr>'; return; }
        const f = document.createDocumentFragment();
        Object.entries(data).sort(function([,a],[,b]) { return b.courses - a.courses; }).forEach(function([org, stats]) {
            const pct = totalCourses > 0 ? (stats.courses / totalCourses * 100) : 0, color = utils.generateColor(org, 'organization'), row = document.createElement('tr');
            row.style.backgroundColor = 'var(--bg-secondary)';
            row.innerHTML = '<td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + color + ' 20%, transparent); color:' + color + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + stats.courses + '节</td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + stats.fee.toFixed(2) + '</td><td class="px-4 py-3" style="color:var(--text-primary)">' + (stats.students?.size || 0) + '人</td><td class="px-4 py-3"><div class="flex items-center"><div class="w-24 rounded-full h-2 mr-2" style="background-color:var(--bg-content)"><div class="rounded-full h-2" style="width:' + Math.min(pct, 100) + '%; background-color:' + color + '"></div></div><span class="text-xs" style="color:var(--text-secondary)">' + pct.toFixed(1) + '%</span></div></td>';
            f.appendChild(row);
        });
        tb.appendChild(f);
    }

    _renderTable(title, headers, rows) {
        let h = '<h4 class="text-md font-medium mb-3" style="color:var(--text-primary)">' + title + '</h4>';
        if (!rows.length) return '<div class="mb-6">' + h + '<div class="text-center py-8" style="color:var(--text-secondary)"><p>暂无数据</p></div></div>';
        let th = ''; headers.forEach(function(hdr) { th += '<th class="px-4 py-3 text-left text-base font-semibold" style="color:var(--text-secondary)">' + hdr + '</th>'; });
        return '<div class="mb-6">' + h + '<div class="overflow-x-auto"><table class="min-w-full divide-y" style="border-color:var(--border-color)"><thead><tr style="background-color:var(--bg-secondary)">' + th + '</tr></thead><tbody class="divide-y" style="border-color:var(--border-color)">' + rows.join('') + '</tbody></table></div></div>';
    }

    _renderOneOnOneTable(stats, utils) {
        if (!Object.keys(stats).length) return this._renderTable('一对一分布数据', ['机构','年级','学生数','课节数','课时费'], []);
        const orgGradeStats = {}; Object.entries(stats).forEach(function([grade, orgStats]) { Object.entries(orgStats).forEach(function([org, s]) { if (!orgGradeStats[org]) orgGradeStats[org] = {}; orgGradeStats[org][grade] = s; }); });
        const rows = []; Object.entries(orgGradeStats).sort(function([a],[b]) { return a.localeCompare(b); }).forEach(function([org, gradeStats]) { Object.entries(gradeStats).forEach(function([grade, s]) { rows.push('<tr><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(org,'organization') + ' 20%,transparent);color:' + utils.generateColor(org,'organization') + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(grade,'grade') + ' 20%,transparent);color:' + utils.generateColor(grade,'grade') + '">' + utils.escapeHtml(grade) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + s.students.size + '人</td><td class="px-4 py-3" style="color:var(--text-primary)">' + s.courses + '节</td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(2) + '</td></tr>'); }); });
        return this._renderTable('一对一分布数据', ['机构','年级','学生数','课节数','课时费'], rows);
    }

    _renderGroupTable(stats, utils) {
        if (!Object.keys(stats).length) return this._renderTable('多人课分布数据', ['机构','年级','上课人数','课节数','课时费'], []);
        const orgGradeCountStats = {}; Object.entries(stats).forEach(function([sc, gs]) { Object.entries(gs).forEach(function([grade, os]) { Object.entries(os).forEach(function([org, s]) { if (!orgGradeCountStats[org]) orgGradeCountStats[org] = {}; if (!orgGradeCountStats[org][grade]) orgGradeCountStats[org][grade] = {}; orgGradeCountStats[org][grade][sc] = s; }); }); });
        const rows = []; Object.entries(orgGradeCountStats).sort(function([a],[b]) { return a.localeCompare(b); }).forEach(function([org, gs]) { Object.entries(gs).forEach(function([grade, cs]) { Object.entries(cs).sort(function([ca],[cb]) { return parseInt(ca) - parseInt(cb); }).forEach(function([sc, s]) { rows.push('<tr><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(org,'organization') + ' 20%,transparent);color:' + utils.generateColor(org,'organization') + '">' + utils.escapeHtml(org) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + utils.generateColor(grade,'grade') + ' 20%,transparent);color:' + utils.generateColor(grade,'grade') + '">' + utils.escapeHtml(grade) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + sc + '人</td><td class="px-4 py-3" style="color:var(--text-primary)">' + s.courses + '节</td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(2) + '</td></tr>'); }); }); });
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
            let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y" style="border-color:var(--border-color)"><thead><tr style="background-color:var(--bg-secondary)"><th class="px-4 py-3 text-left" style="color:var(--text-secondary)">学生姓名</th><th class="px-4 py-3 text-left" style="color:var(--text-secondary)">所属机构</th><th class="px-4 py-3 text-left" style="color:var(--text-secondary)">年级</th><th class="px-4 py-3 text-left" style="color:var(--text-secondary)">上课节数</th><th class="px-4 py-3 text-left" style="color:var(--text-secondary)">课时费</th></tr></thead><tbody>';
            sorted.forEach(function(s) { const oc = utils.generateColor(s.organization, 'organization'), gc = utils.generateColor(s.grade, 'grade'); html += '<tr><td class="px-4 py-3" style="color:var(--text-primary)">' + utils.escapeHtml(s.name) + '</td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + oc + ' 20%,transparent);color:' + oc + '">' + utils.escapeHtml(s.organization) + '</span></td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,' + gc + ' 20%,transparent);color:' + gc + '">' + utils.escapeHtml(s.grade) + '</span></td><td class="px-4 py-3" style="color:var(--text-primary)">' + s.courses + '节</td><td class="px-4 py-3" style="color:var(--text-primary)">¥' + s.fee.toFixed(2) + '</td></tr>'; });
            html += '</tbody></table></div>';
            c.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold" style="color:var(--text-primary)">学生课量数据</h3></div>' + html;
        } else { c.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-medium" style="color:var(--text-primary)">学生课量数据</h3></div><div class="text-center py-8" style="color:var(--text-secondary)"><p>暂无学生课量数据</p></div>'; }
    }
}
