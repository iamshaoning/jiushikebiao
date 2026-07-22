/**
 * CSV 导出
 *
 * 重写自课表 exportService.js（源项目导出 HTML，此处改为更通用的 CSV）
 * UTF-8 BOM 头确保 Excel/WPS 中文正常
 */
import type { Course, Student } from './types';
import { getStudentCourseFee } from './statistics';
import type { StatResult, DetailedStatItem } from './statistics';
import { calculateEndTimeFromDuration, generateColor } from './utils';

function downloadCSV(filename: string, rows: (string | number)[][]): void {
  const BOM = '\uFEFF';
  const escape = (val: string | number): string => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csv = BOM + rows.map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 导出统计汇总 */
export function exportStatsCSV(stats: StatResult, range: string): void {
  const rows: (string | number)[][] = [];
  rows.push(['类型', '项目', '数量', '费用']);
  rows.push(['汇总', '总课时', stats.totalCourses, Math.round(stats.totalFee)]);
  rows.push(['汇总', '学生数', stats.uniqueStudentCount, '']);
  rows.push([]);
  rows.push(['—— 机构统计 ——']);
  rows.push(['机构', '课时数', '费用', '学生数']);
  stats.orgStats.forEach((o) =>
    rows.push([o.organization, o.courseCount, Math.round(o.totalFee), o.studentCount]),
  );
  rows.push([]);
  rows.push(['—— 学生明细 ——']);
  rows.push(['姓名', '机构', '年级', '课时数', '费用']);
  stats.studentStats.forEach((s) =>
    rows.push([s.name, s.organization, s.grade, s.courseCount, Math.round(s.totalFee)]),
  );
  rows.push([]);
  rows.push(['—— 课型统计 ——']);
  rows.push(['课型', '课时数', '费用', '学生数']);
  stats.lessonTypeStats.forEach((l) =>
    rows.push([l.lessonType, l.courseCount, Math.round(l.totalFee), l.studentCount]),
  );
  rows.push([]);
  rows.push(['—— 一对一分布数据 ——']);
  rows.push(['机构', '年级', '学生数', '课节数', '课时费']);
  Object.entries(stats.detailedStats['一对一']).forEach(([grade, orgMap]) => {
    Object.entries(orgMap).forEach(([org, item]) => {
      if (item.courses === 0) return;
      rows.push([org, grade, item.studentCount, item.courses, Math.round(item.fee)]);
    });
  });
  rows.push([]);
  rows.push(['—— 多人课分布数据 ——']);
  rows.push(['机构', '年级', '上课人数', '课节数', '课时费']);
  Object.entries(stats.detailedStats['多人课']).forEach(([sc, gradeMap]) => {
    Object.entries(gradeMap).forEach(([grade, orgMap]) => {
      Object.entries(orgMap).forEach(([org, item]) => {
        if (item.courses === 0) return;
        rows.push([org, grade, sc, item.courses, Math.round(item.fee)]);
      });
    });
  });

  const date = new Date().toISOString().slice(0, 10);
  downloadCSV(`课表统计_${range}_${date}.csv`, rows);
}

/** 导出原始课程明细 */
export function exportCoursesCSV(courses: Course[], students: Student[]): void {
  const rows: (string | number)[][] = [];
  rows.push(['日期', '课型', '开始时间', '结束时间', '时长(分钟)', '学生', '机构', '费用', '备注']);
  const sorted = [...courses].sort((a, b) =>
    (a.date + a.startTime).localeCompare(b.date + b.startTime),
  );
  sorted.forEach((c) => {
    const names = (c.studentNames || []).join('、');
    const orgs = (c.organizations || []).join('、');
    const fee =
      c.lessonType === '多人课'
        ? c.fees[0] ?? 0
        : c.fees.reduce((s, f) => s + (f || 0), 0);
    rows.push([
      c.date,
      c.lessonType,
      c.startTime,
      calculateEndTimeFromDuration(c.startTime, c.duration),
      c.duration,
      names,
      orgs,
      Math.round(fee),
      c.note || '',
    ]);
  });
  // 静态分析引用 getStudentCourseFee 避免未使用
  void getStudentCourseFee;
  const date = new Date().toISOString().slice(0, 10);
  downloadCSV(`课表明细_${date}.csv`, rows);
}

/* ============ HTML 导出（还原统计页面外观） ============ */

function escHtml(s: string | number): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orgTagHtml(org: string, colors: Record<string, string>): string {
  const color = colors[org] || generateColor(org, 'organization');
  return `<span class="tag" style="background-color:color-mix(in srgb, ${color} 20%, transparent);color:${color}">${escHtml(org)}</span>`;
}

function gradeTagHtml(grade: string, colors: Record<string, string>): string {
  const color = colors[grade] || generateColor(grade, 'grade');
  return `<span class="tag" style="background-color:color-mix(in srgb, ${color} 20%, transparent);color:${color}">${escHtml(grade)}</span>`;
}

/** 导出统计页面为独立 HTML 文件（内联样式，还原页面外观） */
export function exportStatsHTML(
  stats: StatResult,
  range: string,
  organization: string,
  organizationColors: Record<string, string> = {},
  gradeColors: Record<string, string> = {},
): void {
  // 重构一对一分布行（与页面一致：org -> grade 排序）
  const orgMap1: Record<string, { grade: string; item: DetailedStatItem }[]> = {};
  Object.entries(stats.detailedStats['一对一']).forEach(([grade, orgs]) => {
    Object.entries(orgs).forEach(([org, item]) => {
      if (item.courses === 0) return;
      if (!orgMap1[org]) orgMap1[org] = [];
      orgMap1[org].push({ grade, item });
    });
  });
  const oneOnOneRows: { org: string; grade: string; item: DetailedStatItem }[] = [];
  Object.keys(orgMap1)
    .sort((a, b) => a.localeCompare(b))
    .forEach((org) => {
      orgMap1[org].forEach(({ grade, item }) => oneOnOneRows.push({ org, grade, item }));
    });

  // 重构多人课分布行
  const orgMap2: Record<string, { grade: string; sc: string; item: DetailedStatItem }[]> = {};
  Object.entries(stats.detailedStats['多人课']).forEach(([sc, gradeMap]) => {
    Object.entries(gradeMap).forEach(([grade, orgs]) => {
      Object.entries(orgs).forEach(([org, item]) => {
        if (item.courses === 0) return;
        if (!orgMap2[org]) orgMap2[org] = [];
        orgMap2[org].push({ grade, sc, item });
      });
    });
  });
  const groupRows: { org: string; grade: string; sc: string; item: DetailedStatItem }[] = [];
  Object.keys(orgMap2)
    .sort((a, b) => a.localeCompare(b))
    .forEach((org) => {
      orgMap2[org]
        .sort((a, b) => parseInt(a.sc) - parseInt(b.sc))
        .forEach(({ grade, sc, item }) => groupRows.push({ org, grade, sc, item }));
    });

  const fmt = (n: number) => Math.round(n).toLocaleString();

  // 统计卡片
  const cardsHtml = `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">总课节数</div>
        <div class="stat-value" style="color:#3b82f6">${stats.totalCourses}</div>
        <div class="stat-unit">节课程</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总课时费</div>
        <div class="stat-value" style="color:#10b981">¥${fmt(stats.totalFee)}</div>
        <div class="stat-unit">人民币</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">学生人数</div>
        <div class="stat-value" style="color:#8b5cf6">${stats.uniqueStudentCount}</div>
        <div class="stat-unit">名学生</div>
      </div>
    </div>`;

  // 机构数据表行
  const orgRowsHtml = stats.orgStats
    .map((o) => {
      const color =
        organizationColors[o.organization] || generateColor(o.organization, 'organization');
      const pct = stats.totalFee > 0 ? (o.totalFee / stats.totalFee) * 100 : 0;
      return `<tr>
        <td>${orgTagHtml(o.organization, organizationColors)}</td>
        <td class="num">${o.courseCount}节</td>
        <td class="num">¥${fmt(o.totalFee)}</td>
        <td class="num">${o.studentCount}人</td>
        <td><div class="progress"><div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct, 100)}%;background-color:${color}"></div></div><span class="progress-text">${pct.toFixed(1)}%</span></div></td>
      </tr>`;
    })
    .join('');

  // 一对一分布表行
  const oneOnOneRowsHtml = oneOnOneRows
    .map(
      (r) => `<tr>
        <td>${orgTagHtml(r.org, organizationColors)}</td>
        <td>${gradeTagHtml(r.grade, gradeColors)}</td>
        <td>${r.item.studentCount}人</td>
        <td>${r.item.courses}节</td>
        <td class="num">¥${fmt(r.item.fee)}</td>
      </tr>`,
    )
    .join('');

  // 多人课分布表行
  const groupRowsHtml = groupRows
    .map(
      (r) => `<tr>
        <td>${orgTagHtml(r.org, organizationColors)}</td>
        <td>${gradeTagHtml(r.grade, gradeColors)}</td>
        <td>${r.sc}人</td>
        <td>${r.item.courses}节</td>
        <td class="num">¥${fmt(r.item.fee)}</td>
      </tr>`,
    )
    .join('');

  // 学生课量表行
  const studentRowsHtml = stats.studentStats
    .map(
      (s) => `<tr>
        <td class="font-medium">${escHtml(s.name)}</td>
        <td>${orgTagHtml(s.organization || '未分配', organizationColors)}</td>
        <td>${gradeTagHtml(s.grade || '未设置', gradeColors)}</td>
        <td>${s.courseCount}节</td>
        <td class="num font-medium">¥${fmt(s.totalFee)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>费用统计 - ${escHtml(range)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Noto Sans SC",system-ui,-apple-system,"Segoe UI",sans-serif;background-color:#FAF7F2;color:#1a1a1a;line-height:1.6;padding:2rem}
.container{max-width:1000px;margin:0 auto}
header{margin-bottom:1.5rem}
header h1{font-family:"Noto Serif SC",Georgia,serif;font-size:1.5rem;font-weight:700;color:#08231A}
header p{font-size:0.875rem;color:#6b7280;margin-top:0.25rem}
.range-labels{display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap}
.range-label{display:inline-block;padding:0.25rem 0.75rem;font-size:0.8rem;color:#4b5563;background:#F5F0E8;border:1px solid #C7DACF;border-radius:0.5rem}
.stat-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem}
.stat-card{background:#F8F3EC;border:1px solid #C7DACF;border-radius:0.75rem;padding:1.25rem;box-shadow:0 2px 8px rgba(15,61,46,0.06)}
.stat-label{font-size:0.75rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}
.stat-value{font-family:"JetBrains Mono",monospace;font-size:1.875rem;font-weight:700;margin-top:0.25rem}
.stat-unit{font-size:0.75rem;color:#6b7280;margin-top:0.75rem}
.card{background:#F8F3EC;border:1px solid #C7DACF;border-radius:0.75rem;padding:1.25rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(15,61,46,0.06)}
.card h3{font-family:"Noto Serif SC",Georgia,serif;font-size:1.125rem;font-weight:700;color:#08231A;margin-bottom:1rem}
.card h4{font-size:0.875rem;font-weight:500;color:#4b5563;margin-bottom:0.75rem;margin-top:1.5rem}
.card h4:first-of-type{margin-top:0}
.empty{text-align:center;padding:2rem;font-size:0.875rem;color:#9ca3af}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #C7DACF;border-radius:0.5rem;overflow:hidden}
th{padding:0.75rem 1rem;text-align:left;font-size:0.875rem;font-weight:600;color:#6b7280;border-bottom:1px solid #C7DACF;background-color:#F5F0E8}
td{padding:0.75rem 1rem;font-size:0.875rem;color:#374151;border-bottom:1px solid #C7DACF}
tr:last-child td{border-bottom:none}
.num{font-family:"JetBrains Mono",monospace}
.font-medium{font-weight:500}
.tag{display:inline-block;padding:0.125rem 0.5rem;font-size:0.75rem;font-weight:500;border-radius:9999px}
.progress{display:flex;align-items:center;gap:0.5rem}
.progress-bar{width:6rem;height:0.5rem;background:#F5F0E8;border-radius:9999px;overflow:hidden}
.progress-fill{height:100%;border-radius:9999px}
.progress-text{font-size:0.75rem;color:#6b7280;font-family:"JetBrains Mono",monospace}
@media(max-width:768px){.stat-cards{grid-template-columns:1fr}}
@media print{body{padding:0}.card{break-inside:avoid}}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>费用统计</h1>
    <p>按时间与机构维度统计课时与费用</p>
    <div class="range-labels">
      <span class="range-label">${escHtml(range)}</span>
      <span class="range-label">${escHtml(organization)}</span>
    </div>
  </header>
  ${cardsHtml}
  <div class="card">
    <h3>机构数据</h3>
    <h4>机构详细数据</h4>
    ${stats.orgStats.length > 0 ? `<table><thead><tr><th>机构名称</th><th>课节数</th><th>课时费</th><th>学生数</th><th>占比</th></tr></thead><tbody>${orgRowsHtml}</tbody></table>` : '<div class="empty">暂无数据</div>'}
  </div>
  <div class="card">
    <h3>机构课型数据</h3>
    <h4>一对一分布数据</h4>
    ${oneOnOneRows.length > 0 ? `<table><thead><tr><th>机构</th><th>年级</th><th>学生数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>${oneOnOneRowsHtml}</tbody></table>` : '<div class="empty">暂无数据</div>'}
    <h4>多人课分布数据</h4>
    ${groupRows.length > 0 ? `<table><thead><tr><th>机构</th><th>年级</th><th>上课人数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>${groupRowsHtml}</tbody></table>` : '<div class="empty">暂无数据</div>'}
  </div>
  <div class="card">
    <h3>学生课量数据</h3>
    ${stats.studentStats.length > 0 ? `<table><thead><tr><th>学生姓名</th><th>所属机构</th><th>年级</th><th>课节数</th><th>课时费</th></tr></thead><tbody>${studentRowsHtml}</tbody></table>` : '<div class="empty">暂无数据</div>'}
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${range} ${organization} 费用统计.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
