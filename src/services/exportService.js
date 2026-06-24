/**
 * 数据导出服务
 *
 * @description 将课时统计数据导出为 HTML 格式文件，布局与统计页一致
 * @module exportService
 */
import { registry } from '../core/registry.js';
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

class ExportService {
    constructor() {}
    escapeHtml(text) { if (text == null) return ''; return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

    /** 计算SVG弧线路径（与chartService一致） */
    _describeArc(cx, cy, r, startAngle, endAngle) {
        const toRad = (deg) => deg * Math.PI / 180;
        const sa = toRad(startAngle - 90), ea = toRad(endAngle - 90);
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const large = (endAngle - startAngle) > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }

    /** 生成SVG饼图（与统计页一致） */
    _generatePieChartSVG(byOrganization, utils) {
        const entries = Object.entries(byOrganization || {});
        if (entries.length === 0) return '';

        const total = entries.reduce((sum, [, s]) => sum + s.courses, 0);
        if (total === 0) return '';
        const size = 220, cx = size / 2, cy = size / 2, r = size / 2 - 4;

        let cumulative = 0;
        const paths = [];
        const labels = [];

        entries.sort(([, a], [, b]) => b.courses - a.courses).forEach(([label, stats]) => {
            const color = utils.generateColor(label, 'organization');
            const pct = stats.courses / total;
            if (pct >= 1) {
                paths.push(`<g class="pie-segment"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/></g>`);
            } else {
                const startAngle = cumulative * 360, endAngle = (cumulative + pct) * 360;
                const pathD = this._describeArc(cx, cy, r, startAngle, endAngle);
                paths.push(`<g class="pie-segment"><path d="${pathD}" fill="${color}"/></g>`);
            }
            cumulative += pct;
            labels.push({ label, color });
        });

        return `<div class="pie-wrapper"><svg class="pie-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths.join('')}</svg><div class="pie-legend">${labels.map(l => `<span class="pie-legend-item"><span class="pie-legend-dot" style="background-color:${l.color};"></span><span class="pie-legend-label">${this.escapeHtml(l.label)}</span></span>`).join('')}</div></div>`;
    }

    generateHTMLContent(data, filename, year, month, organization, utils = null, byOrganization = null) {
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
            totalCourseCount = sections.org.reduce((s, r) => s + (parseInt(r.时间) || 0), 0);
            totalFee = sections.org.reduce((s, r) => s + (parseFloat(r.学生姓名) || 0), 0);
            totalStudents = sections.org.reduce((s, r) => s + (parseInt(r.所属机构) || 0), 0);
        }

        const css = this._getExportCSS();

        let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>${css}</style></head><body><div class="container">`;

        // 页面标题（与统计页一致）
        html += `<h1 class="page-title">${title}</h1>`;

        // 概览统计卡片（与统计页一致，带卡片效果）
        html += `<div class="stats-row"><div class="stat-card"><div class="stat-card-icon" style="background:rgba(59,130,246,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="stat-label">总课节数</div><div class="stat-value" style="color:#3b82f6">${totalCourseCount}</div></div></div><div class="stat-card"><div class="stat-card-icon" style="background:rgba(16,185,129,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><div class="stat-label">总课时费</div><div class="stat-value" style="color:#10b981">¥${totalFee.toFixed(0)}</div></div></div><div class="stat-card"><div class="stat-card-icon" style="background:rgba(139,92,246,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="stat-label">学生人数</div><div class="stat-value" style="color:#8b5cf6">${totalStudents}</div></div></div></div>`;

        // 饼图 + 机构详细数据（两列并排，与统计页一致）
        const pieChartSVG = this._generatePieChartSVG(byOrganization, validUtils);
        let hasOrgData = sections.org.length > 0;
        if (pieChartSVG || hasOrgData) {
            html += `<div class="section"><h2>机构数据</h2><div class="grid-2col">`;
            // 左列：饼图
            html += `<div>`;
            if (pieChartSVG) {
                html += `<h3>机构课量分布</h3>${pieChartSVG}`;
            } else {
                html += `<div class="empty">暂无数据</div>`;
            }
            html += `</div>`;
            // 右列：机构详细数据表格
            html += `<div>`;
            if (hasOrgData) {
                html += `<h3>机构详细数据</h3><div class="table-wrap"><table><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr><th>机构</th><th>课节数</th><th>课时费</th><th>学生数</th><th>占比</th></tr></thead><tbody>`;
                sections.org.forEach(r => {
                    const org = r.日期;
                    const color = validUtils?.generateColor ? validUtils.generateColor(org, 'organization') : '#3b82f6';
                    const pct = totalCourseCount > 0 ? (parseInt(r.时间) || 0) / totalCourseCount * 100 : 0;
                    html += `<tr><td><span class="badge" style="background:${color}20;color:${color}">${this.escapeHtml(org)}</span></td><td>${r.时间 || ''} 节</td><td>¥${r.学生姓名 || '0'}</td><td>${r.所属机构 || ''} 人</td><td><div class="pct-bar"><div class="pct-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div></div><span class="pct-text">${pct.toFixed(1)}%</span></td></tr>`;
                });
                html += `</tbody></table></div>`;
            } else {
                html += `<div class="empty">暂无机构数据</div>`;
            }
            html += `</div></div></div>`;
        }

        // 机构课型数据
        html += `<div class="section"><h2>机构课型数据</h2>`;

        if (sections.oneOnOne.length > 0) {
            html += `<div class="sub-section"><h3>一对一分布数据</h3><div class="table-wrap"><table><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr><th>机构</th><th>年级</th><th>学生数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.oneOnOne.forEach(r => html += `<tr><td>${getOrgBadge(r.日期)}</td><td>${getGradeBadge(r.时间)}</td><td>${r.学生姓名 || ''} 人</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table></div></div>`;
        }

        if (sections.group.length > 0) {
            html += `<div class="sub-section"><h3>多人课分布数据</h3><div class="table-wrap"><table><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr><th>机构</th><th>年级</th><th>上课人数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.group.forEach(r => html += `<tr><td>${getOrgBadge(r.日期)}</td><td>${getGradeBadge(r.时间)}</td><td>${r.学生姓名 || ''} 人</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table></div></div>`;
        }
        html += `</div>`;

        // 学生课量数据
        html += `<div class="section"><h2>学生课量数据</h2>`;
        if (sections.student.length > 0) {
            html += `<div class="table-wrap"><table><colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr><th>学生姓名</th><th>所属机构</th><th>年级</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            sections.student.forEach(r => html += `<tr><td>${this.escapeHtml(r.日期)}</td><td>${getOrgBadge(r.时间)}</td><td>${getGradeBadge(r.学生姓名)}</td><td>${r.所属机构 || ''} 节</td><td>¥${r.年级 || '0'}</td></tr>`);
            html += `</tbody></table></div>`;
        } else {
            html += `<div class="empty">暂无学生课量数据</div>`;
        }
        html += `</div>`;

        html += `<div class="footer">报告生成于 ${new Date().toLocaleString('zh-CN')} · 玖拾课表</div></div></body></html>`;
        return html;
    }

    _getExportCSS() {
        return `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;padding:40px;background:#f1f5f9;color:#334155}
.container{max-width:1200px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.08);overflow:hidden}
.stats-row{display:flex;gap:24px;padding:28px 32px 20px}
.stat-card{flex:1;display:flex;align-items:flex-start;gap:14px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.stat-card-icon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;flex-shrink:0}
.stat-value{font-size:28px;font-weight:700;line-height:1.2}
.stat-label{font-size:13px;color:#64748b;margin-top:2px}
.grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.grid-2col h3{color:#475569;margin-bottom:12px;font-size:15px;font-weight:600}
.section{padding:20px 32px}
.section h2{color:#1e293b;margin-bottom:16px;font-size:18px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px}
.sub-section{margin-bottom:20px}
.sub-section h3{color:#475569;margin-bottom:10px;font-size:15px;font-weight:600}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
thead tr{background:#f8fafc}
th{padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0}
td{padding:12px 16px;font-size:14px;border-bottom:1px solid #f1f5f9}
tbody tr:hover{background:#fafafa}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500}
.pct-bar{display:inline-block;width:96px;height:8px;border-radius:4px;background:#e2e8f0;margin-right:8px;vertical-align:middle}
.pct-fill{height:100%;border-radius:4px}
.pct-text{font-size:12px;color:#64748b;vertical-align:middle}
.empty{text-align:center;padding:40px;color:#94a3b8}
.page-title{font-size:24px;font-weight:700;color:#1e293b;padding:28px 32px 0;margin:0;text-align:center}
.pie-wrapper{display:flex;flex-direction:column;align-items:center;gap:0.8rem}
.pie-svg{width:220px;height:220px;flex-shrink:0}
.pie-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem 1rem}
.pie-legend-item{display:inline-flex;align-items:center;gap:0.3rem;font-size:0.8rem}
.pie-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.pie-legend-label{color:#475569}
.footer{padding:20px 32px;text-align:center;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0}
`;
    }

    exportHTML(data, filename, year, month, organization, byOrganization = null) {
        const utils = registry.get('utils');
        const htmlContent = this.generateHTMLContent(data, filename, year, month, organization, utils, byOrganization);
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
        rows.push({ 日期: '学生姓名', 时间: '所属机构', 学生姓名: '年级', 所属机构: '课节数', 年级: '课时费' });

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

            if (allData.length > 0) { const monthLabel = month === 'all' ? '全年' : MONTH_NAMES[month]; const orgLabel = organization || '全部机构'; this.exportHTML(allData, `${year}年${monthLabel}${orgLabel}课时费统计.html`, year, month, organization, stats.byOrganization); ns?.show('数据导出成功', 'success'); }
            else ns?.show('暂无数据可导出', 'warning');
        } else {
            ns?.show('统计数据暂不可用', 'warning');
        }
    }
}

const exportService = new ExportService();
export default exportService;