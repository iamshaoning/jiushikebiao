/**
 * 数据导出服务
 *
 * @description 将课时统计数据导出为 HTML 格式文件，支持按年月和机构筛选
 * @module exportService
 */
import { registry } from '../core/registry.js';
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

class ExportService {
    constructor() {}
    escapeHtml(text) { if (text == null) return ''; return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

    generateHTMLContent(data, filename, year, month, organization, utils = null) {
        const monthLabel = month === 'all' ? '全年' : MONTH_NAMES[month];
        const orgLabel = organization || '全部机构';
        const title = `${year}年${monthLabel}${orgLabel}课时费统计`;
        const validUtils = utils || registry.get('utils');

        const getOrgBadge = (name) => {
            if (!name) return '';
            const color = validUtils?.generateColor ? validUtils.generateColor(name, 'organization') : '#3b82f6';
            return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;background:${color}20;color:${color};border:1px solid ${color}40">${this.escapeHtml(name)}</span>`;
        };
        const getGradeBadge = (name) => {
            if (!name) return '';
            const color = validUtils?.generateColor ? validUtils.generateColor(name, 'grade') : '#8b5cf6';
            return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;background:${color}20;color:${color};border:1px solid ${color}40">${this.escapeHtml(name)}</span>`;
        };

        let idx = 0;
        const courseDetails = [];
        while (idx < data.length && data[idx].课型 !== undefined) {
            courseDetails.push(data[idx]);
            idx++;
        }

        const rest = data.slice(idx);
        const sections = { org: [], oneOnOne: [], group: [], student: [] };
        let cur = null;
        for (const row of rest) {
            const label = row.日期;
            if (label === '机构详细数据') { cur = 'org'; continue; }
            if (label === '一对一分布数据') { cur = 'oneOnOne'; continue; }
            if (label === '多人课分布数据') { cur = 'group'; continue; }
            if (label === '学生课量数据') { cur = 'student'; continue; }
            if (label === '机构课型数据' || !cur) continue;
            if (label === '机构' || label === '学生姓名') continue;
            if (!label) continue;
            sections[cur].push(row);
        }

        let totalCourseCount = 0, totalFee = 0, totalStudents = 0;
        if (sections.org.length > 0) {
            // 机构详细数据行格式: 日期=机构名称, 时间=课节数, 学生姓名=课时费, 所属机构=学生数, 年级=占比
            totalCourseCount = sections.org.reduce((s, r) => s + (parseInt(r.时间) || 0), 0);
            totalFee = sections.org.reduce((s, r) => s + (parseFloat(r.学生姓名) || 0), 0);
            totalStudents = sections.org.reduce((s, r) => s + (parseInt(r.所属机构) || 0), 0);
        }

        const systemUrl = typeof window !== 'undefined' ? (window.location.origin || '玖拾课表') : '玖拾课表';

        let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;padding:40px;background-color:#f5f7fa}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:14px 20px;text-align:left;font-weight:600;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e2e8f0}td{padding:14px 20px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155}tr:hover{background:#fafafa}.container{max-width:1200px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.08);overflow:hidden}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:24px 32px}.header h1{margin:0;font-size:24px;font-weight:600}.header p{margin:8px 0 0;opacity:.9;font-size:14px}.stats{display:flex;gap:24px;padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.stat-item{text-align:center;flex:1}.stat-value{font-size:28px;font-weight:700;color:#1e293b}.stat-label{font-size:13px;color:#64748b;margin-top:4px}.section{padding:20px 32px}.section h2{color:#374151;margin-bottom:15px;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px}.section h3{color:#4b5563;margin-top:20px;margin-bottom:10px;font-size:16px}.empty{text-align:center;padding:40px;color:#6b7280;font-style:italic}.footer{padding:20px 32px;text-align:center;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0}.footer a{color:#667eea;text-decoration:none}.footer a:hover{text-decoration:underline}</style></head><body><div class="container"><div class="header"><h1>${title}</h1><p>生成时间：${new Date().toLocaleString('zh-CN')}${organization ? ' | 机构：' + organization : ''}</p></div><div class="stats"><div class="stat-item"><div class="stat-value">${totalCourseCount}</div><div class="stat-label">总课节数</div></div><div class="stat-item"><div class="stat-value">¥${totalFee.toFixed(0)}</div><div class="stat-label">总课时费</div></div><div class="stat-item"><div class="stat-value">${totalStudents}</div><div class="stat-label">学生人数</div></div></div>`;

        html += `<div class="section"><h2>机构详细数据</h2>`;
        if (sections.org.length > 0) {
            html += `<table><thead><tr><th>机构</th><th>课节数</th><th>课时费</th><th>学生数</th><th>占比</th></tr></thead><tbody>`;
            sections.org.forEach(r => html += `<tr><td>${getOrgBadge(r.日期)}</td><td>${r.时间 || ''} 节</td><td>¥${r.学生姓名 || '0'}</td><td>${r.所属机构 || ''} 人</td><td>${r.年级 || ''}</td></tr>`);
            html += `</tbody></table>`;
        } else {
            html += `<div class="empty">暂无机构数据</div>`;
        }

        html += `</div><div class="section"><h2>机构课型数据</h2>`;
        if (sections.oneOnOne.length > 0) {
            html += `<h3>一对一分布数据</h3><table><thead><tr><th>机构</th><th>年级</th><th>学生数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.oneOnOne.forEach(r => html += `<tr><td>${getOrgBadge(r.日期)}</td><td>${getGradeBadge(r.时间)}</td><td>${r.学生姓名 || ''} 人</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table>`;
        }
        if (sections.group.length > 0) {
            html += `<h3>多人课分布数据</h3><table><thead><tr><th>机构</th><th>年级</th><th>上课人数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.group.forEach(r => html += `<tr><td>${getOrgBadge(r.日期)}</td><td>${getGradeBadge(r.时间)}</td><td>${r.学生姓名 || ''} 人</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table>`;
        }

        html += `</div><div class="section"><h2>学生课量数据</h2>`;
        if (sections.student.length > 0) {
            html += `<table><thead><tr><th>学生姓名</th><th>所属机构</th><th>年级</th><th>上课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.student.forEach(r => html += `<tr><td>${this.escapeHtml(r.日期)}</td><td>${getOrgBadge(r.时间)}</td><td>${getGradeBadge(r.学生姓名)}</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table>`;
        } else {
            html += `<div class="empty">暂无学生课量数据</div>`;
        }

        html += `</div><div class="footer">报告生成于 <a href="${systemUrl}" target="_blank">玖拾课表</a></div></div></body></html>`;
        return html;
    }

    exportHTML(data, filename, year, month, organization) {
        const utils = registry.get('utils');
        const htmlContent = this.generateHTMLContent(data, filename, year, month, organization, utils);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.setAttribute('href', url); link.setAttribute('download', filename); link.style.visibility = 'hidden';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    _buildDetailRows(filteredCourses, state, organizationFilter) {
        const exportData = [];
        filteredCourses.forEach(course => {
            const courseLessonType = course.lessonType || '一对一';
            const endTime = (registry.get('utils') || {}).calculateEndTimeFromDuration ? registry.get('utils').calculateEndTimeFromDuration(course.startTime, course.duration) : '';
            const studentCount = Array.isArray(course.studentIds) ? course.studentIds.length : 1;

            if (Array.isArray(course.studentIds)) {
                course.studentIds.forEach((studentId, index) => {
                    const student = state.students.find(s => s.id === studentId);
                    if (!student) return;
                    if (organizationFilter && student.organization !== organizationFilter) return;
                    const studentFee = registry.get('utils').getCourseFee ? registry.get('utils').getCourseFee(course, student, index) : (course.fees?.[index] ?? student?.fees?.['一对一'] ?? 0);
                    exportData.push({
                        日期: course.date, 时间: `${course.startTime} - ${endTime}`,
                        学生姓名: student.name, 所属机构: student.organization,
                        年级: student.grade || '未设置', 课型: courseLessonType,
                        上课人数: studentCount, 课时费: courseLessonType === '多人课' ? (course.fees?.[0] ?? 0) : studentFee,
                        备注: course.note || ''
                    });
                });
            }
        });
        return exportData;
    }

    _buildExportRows(organizationStats, studentStats, detailedStats, state) {
        const rows = [];
        rows.push({});
        rows.push({ 日期: '机构详细数据' });
        rows.push({ 日期: '机构', 时间: '课节数', 学生姓名: '课时费', 所属机构: '学生数', 年级: '占比' });
        const totalCourses = Object.values(organizationStats).reduce((s, v) => s + v.courses, 0);
        Object.entries(organizationStats).sort(([,a],[,b]) => b.courses - a.courses).forEach(([org, stats]) => rows.push({ 日期: org, 时间: stats.courses, 学生姓名: stats.fee.toFixed(0), 所属机构: stats.students.size, 年级: totalCourses > 0 ? (stats.courses / totalCourses * 100).toFixed(1) + '%' : '0%' }));

        rows.push({}); rows.push({ 日期: '机构课型数据' }); rows.push({});
        rows.push({ 日期: '一对一分布数据' });
        rows.push({ 日期: '机构', 时间: '年级', 学生姓名: '学生数', 所属机构: '课节数', 年级: '课时费' });

        const orgGradeStats = {};
        Object.entries(detailedStats['一对一']).forEach(([grade, orgStats]) => Object.entries(orgStats).forEach(([org, stats]) => { if (!orgGradeStats[org]) orgGradeStats[org] = {}; orgGradeStats[org][grade] = stats; }));
        Object.entries(orgGradeStats).sort(([a],[b]) => a.localeCompare(b)).forEach(([org, gradeStats]) => Object.entries(gradeStats).forEach(([grade, stats]) => rows.push({ 日期: org, 时间: grade, 学生姓名: stats.students.size, 所属机构: stats.courses, 年级: stats.fee.toFixed(0) })));

        rows.push({});
        rows.push({ 日期: '多人课分布数据' });
        rows.push({ 日期: '机构', 时间: '年级', 学生姓名: '上课人数', 所属机构: '课节数', 年级: '课时费' });

        const orgGradeCountStats = {};
        Object.entries(detailedStats['多人课']).forEach(([sc, gs]) => Object.entries(gs).forEach(([grade, os]) => Object.entries(os).forEach(([org, stats]) => { if (!orgGradeCountStats[org]) orgGradeCountStats[org] = {}; if (!orgGradeCountStats[org][grade]) orgGradeCountStats[org][grade] = {}; orgGradeCountStats[org][grade][sc] = stats; })));
        Object.entries(orgGradeCountStats).sort(([a],[b]) => a.localeCompare(b)).forEach(([org, gs]) => Object.entries(gs).forEach(([grade, cs]) => Object.entries(cs).sort(([ca],[cb]) => parseInt(ca) - parseInt(cb)).forEach(([sc, stats]) => rows.push({ 日期: org, 时间: grade, 学生姓名: sc, 所属机构: stats.courses, 年级: stats.fee.toFixed(0) }))));

        rows.push({});
        rows.push({ 日期: '学生课量数据' });
        rows.push({ 日期: '学生姓名', 时间: '所属机构', 学生姓名: '年级', 所属机构: '上课节数', 年级: '课时费' });

        Object.entries(studentStats).map(([sid, stats]) => { const st = state.students.find(s => s.id === sid); return { name: st?.name || '未知学生', organization: st?.organization || '未分配', grade: st?.grade || '未设置', courses: stats.courses, fee: stats.fee }; }).sort((a, b) => b.courses - a.courses).forEach(s => rows.push({ 日期: s.name, 时间: s.organization, 学生姓名: s.grade, 所属机构: s.courses, 年级: s.fee.toFixed(0) }));

        return rows;
    }

    exportStatisticsData(year, month, organization = '') {
        const state = registry.get('state'), ns = registry.get('notificationService');
        const statisticsCalc = registry.get('statisticsCalculatorService');
        const utils = registry.get('utils');

        const isFullYear = month === 'all';
        const filteredCourses = state.courses.filter(c => { const [courseYear, courseMonth] = c.date.split('-').map(Number); if (isFullYear) return courseYear === year; return courseYear === year && courseMonth === month + 1; });
        const exportData = this._buildDetailRows(filteredCourses, state, organization);

        if (statisticsCalc && utils) {
            const stats = statisticsCalc.calculateStatistics(year, month, organization, utils);

            const organizationStats = {};
            Object.entries(stats.byOrganization).forEach(([org, s]) => {
                organizationStats[org] = { courses: s.courses, fee: s.fee, students: s.students };
            });
            const studentStats = {};
            Object.entries(stats.byStudent).forEach(([id, s]) => {
                studentStats[id] = { courses: s.courses, fee: s.fee };
            });

            const rows = this._buildExportRows(organizationStats, studentStats, stats.detailedStats, state);
            const allData = [...exportData, ...rows];

            if (allData.length > 0) { const monthLabel = month === 'all' ? '全年' : MONTH_NAMES[month]; const orgLabel = organization || '全部机构'; this.exportHTML(allData, `${year}年${monthLabel}${orgLabel}课时费统计.html`, year, month, organization); ns?.show('数据导出成功', 'success'); }
            else ns?.show('暂无数据可导出', 'warning');
        } else {
            ns?.show('统计数据暂不可用', 'warning');
        }
    }
}

const exportService = new ExportService();
export default exportService;
