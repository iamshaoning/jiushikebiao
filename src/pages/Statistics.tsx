/**
 * 费用统计页面
 *
 * 完全还原原项目 statisticsRenderService.js 布局：
 * 1. 三张统计卡片（总课节数/总课时费/学生人数，含图标）
 * 2. 机构数据模块（grid-cols-2：左饼图 + 右机构表含进度条）
 * 3. 机构课型数据模块（一对一分布表 + 多人课分布表，课节数可点击弹窗）
 * 4. 学生课量数据模块（课节数可点击弹窗）
 */
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PieChart, { type PieChartData } from '@/components/PieChart';
import {
  calculateStats,
  filterCoursesForDetail,
  type StatFilters,
  type DetailFilter,
  type DetailedStatItem,
} from '@/lib/statistics';
import { exportStatsHTML } from '@/lib/export';
import { generateColor } from '@/lib/utils';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CircleDollarSign,
  UsersRound,
  List,
} from 'lucide-react';

const NOW = new Date();

export default function Statistics() {
  const courses = useStore((s) => s.courses);
  const students = useStore((s) => s.students);
  const organizations = useStore((s) => s.organizations);
  const organizationColors = useStore((s) => s.organizationColors);
  const gradeColors = useStore((s) => s.gradeColors);
  const toast = useToast();

  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(NOW.getMonth());
  const [orgFilter, setOrgFilter] = useState('');

  // 课程详情弹窗筛选条件
  const [detailFilter, setDetailFilter] = useState<DetailFilter | null>(null);
  // 导出确认弹窗
  const [exportConfirm, setExportConfirm] = useState(false);

  const filters: StatFilters = { year, month, organization: orgFilter };
  const stats = useMemo(
    () => calculateStats(courses, students, filters),
    [courses, students, year, month, orgFilter],
  );

  // 机构详细数据表溢出检测：桌面端当表格横向溢出（需要滚动条）时，
  // 表格另起一行独占，环形图居中于所在行；否则双列并排
  // 关键：测量表格"自然宽度"（克隆到无限宽隐藏容器，不受当前布局影响），
  // 与双列时每列可用宽度（card宽度的一半，card宽度不随 tableOverflow 变化）比较，
  // 避免双列↔单列的反馈循环导致闪烁
  const orgTableRef = useRef<HTMLDivElement>(null);
  const [tableOverflow, setTableOverflow] = useState(false);
  // 检测表格自然宽度是否超过双列半宽（决定是否换行独占一行）
  const checkTableOverflow = () => {
    const tbl = orgTableRef.current?.querySelector('table');
    if (!tbl) return;
    // 克隆表格到无限宽隐藏容器测量自然宽度（不随当前布局变化）
    const clone = tbl.cloneNode(true) as HTMLTableElement;
    clone.style.width = 'auto';
    clone.style.minWidth = '0';
    clone.style.maxWidth = 'none';
    const measure = document.createElement('div');
    measure.style.position = 'absolute';
    measure.style.visibility = 'hidden';
    measure.style.width = 'max-content';
    measure.style.whiteSpace = 'nowrap';
    measure.appendChild(clone);
    document.body.appendChild(measure);
    const naturalWidth = clone.offsetWidth;
    document.body.removeChild(measure);
    // card 宽度不随 tableOverflow 变化（始终全宽），双列每列可用宽度
    const card = orgTableRef.current?.closest('.card') as HTMLElement | null;
    const cardWidth = card?.clientWidth ?? 0;
    const halfWidth = (cardWidth - 40 - 24) / 2; // card p-5(40) + grid gap-6(24)
    setTableOverflow(naturalWidth > halfWidth);
  };
  // useLayoutEffect：首次/数据变化时同步检测，在浏览器绘制前完成，避免切换页面时先显示双列再跳单列的闪烁
  useLayoutEffect(() => {
    checkTableOverflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.orgStats]);
  // useEffect：resize 时防抖检测
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkTableOverflow, 200);
    };
    window.addEventListener('resize', debounced);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', debounced);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.orgStats]);

  // 年月下拉选项：默认当前年前两年到后一年，若数据超出范围则自适应扩展
  const yearOptions = useMemo(() => {
    const currentYear = NOW.getFullYear();
    let minYear = currentYear - 2;
    let maxYear = currentYear + 1;
    for (const c of courses) {
      if (c.date) {
        const y = parseInt(c.date.substring(0, 4), 10);
        if (!isNaN(y)) {
          if (y < minYear) minYear = y;
          if (y > maxYear) maxYear = y;
        }
      }
    }
    const arr: { value: number; label: string }[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      arr.push({ value: y, label: `${y}年` });
    }
    return arr;
  }, [courses]);

  const monthOptions = [
    { value: 'all' as const, label: '全年' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i as number, label: `${i + 1}月` })),
  ];

  const orgOptions = [
    { value: '', label: '全部机构' },
    ...organizations.map((o) => ({ value: o, label: o })),
  ];

  // 月份切换
  const prevMonth = () => {
    if (month === 'all') {
      setYear(year - 1);
      return;
    }
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    if (month === 'all') {
      setYear(year + 1);
      return;
    }
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const rangeLabel = `${year}年${month === 'all' ? '全年' : `${(month as number) + 1}月`}`;

  // 饼图数据（按机构费用）
  const pieData: PieChartData[] = useMemo(
    () =>
      stats.orgStats.map((o) => ({
        label: o.organization,
        value: o.totalFee,
        color: organizationColors[o.organization] || generateColor(o.organization, 'organization'),
      })),
    [stats.orgStats, organizationColors],
  );

  // 一对一分布表行（重构为 org -> grade 排序）
  const oneOnOneRows = useMemo(() => {
    const orgMap: Record<string, { grade: string; item: DetailedStatItem }[]> = {};
    Object.entries(stats.detailedStats['一对一']).forEach(([grade, orgs]) => {
      Object.entries(orgs).forEach(([org, item]) => {
        if (item.courses === 0) return; // 过滤空行
        if (!orgMap[org]) orgMap[org] = [];
        orgMap[org].push({ grade, item });
      });
    });
    const rows: { org: string; grade: string; item: DetailedStatItem }[] = [];
    Object.keys(orgMap)
      .sort((a, b) => a.localeCompare(b))
      .forEach((org) => {
        orgMap[org].forEach(({ grade, item }) => rows.push({ org, grade, item }));
      });
    return rows;
  }, [stats.detailedStats]);

  // 多人课分布表行（重构为 org -> grade -> studentCount 排序）
  const groupRows = useMemo(() => {
    const orgMap: Record<string, { grade: string; studentCount: string; item: DetailedStatItem }[]> = {};
    Object.entries(stats.detailedStats['多人课']).forEach(([sc, gradeMap]) => {
      Object.entries(gradeMap).forEach(([grade, orgs]) => {
        Object.entries(orgs).forEach(([org, item]) => {
          if (item.courses === 0) return; // 过滤空行
          if (!orgMap[org]) orgMap[org] = [];
          orgMap[org].push({ grade, studentCount: sc, item });
        });
      });
    });
    const rows: { org: string; grade: string; studentCount: string; item: DetailedStatItem }[] = [];
    Object.keys(orgMap)
      .sort((a, b) => a.localeCompare(b))
      .forEach((org) => {
        orgMap[org]
          .sort((a, b) => parseInt(a.studentCount) - parseInt(b.studentCount))
          .forEach(({ grade, studentCount, item }) =>
            rows.push({ org, grade, studentCount, item }),
          );
      });
    return rows;
  }, [stats.detailedStats]);

  // 详情弹窗课程
  const detailCourses = useMemo(() => {
    if (!detailFilter) return [];
    return filterCoursesForDetail(courses, students, filters, detailFilter);
  }, [detailFilter, courses, students, year, month, orgFilter]);

  // 详情弹窗标题
  const detailTitle = useMemo(() => {
    if (!detailFilter) return '课节数详情';
    if (detailFilter.studentId) {
      const st = students.find((s) => s.id === detailFilter.studentId);
      return st ? `${st.name} 的课节详情` : '课节数详情';
    }
    const parts: string[] = [];
    if (detailFilter.org) parts.push(detailFilter.org);
    if (detailFilter.grade) parts.push(detailFilter.grade);
    if (detailFilter.lessonType) parts.push(detailFilter.lessonType);
    if (detailFilter.studentCount != null) parts.push(`${detailFilter.studentCount}人`);
    return parts.join(' · ') || '课节数详情';
  }, [detailFilter, students]);

  // 详情弹窗统计
  const detailStats = useMemo(() => {
    const oneOnOneCount = detailCourses.filter((c) => c.lessonType !== '多人课').length;
    const groupCount = detailCourses.filter((c) => c.lessonType === '多人课').length;
    const totalFee = detailCourses.reduce((sum, c) => {
      if (c.lessonType === '多人课' && c.fees[0] !== undefined) return sum + c.fees[0];
      if (c.fees && c.fees.length > 0) return sum + c.fees.reduce((s, f) => s + f, 0);
      return sum;
    }, 0);
    return { oneOnOneCount, groupCount, totalFee };
  }, [detailCourses]);

  // 辅助：获取机构色 / 年级色
  const getOrgColor = (org: string) =>
    organizationColors[org] || generateColor(org, 'organization');
  const getGradeColor = (grade: string) =>
    gradeColors[grade] || generateColor(grade, 'grade');

  // 渲染机构标签
  const renderOrgTag = (org: string) => {
    const color = getOrgColor(org);
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
      >
        {org}
      </span>
    );
  };
  // 渲染年级标签
  const renderGradeTag = (grade: string) => {
    const color = getGradeColor(grade);
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
      >
        {grade}
      </span>
    );
  };

  const handleExport = () => {
    if (stats.totalCourses === 0) {
      toast.warning('当前筛选无数据可导出');
      return;
    }
    setExportConfirm(true);
  };

  const performExport = () => {
    const orgLabel = orgFilter || '全部机构';
    exportStatsHTML(stats, rangeLabel, orgLabel, organizationColors, gradeColors);
    toast.success('已导出 HTML');
    setExportConfirm(false);
  };

  // 表头/单元格样式（仅水平边框，垂直边框由外层容器提供）
  const thCls =
    'px-4 py-3 text-left text-sm font-semibold text-gray-500 border-b border-ink-100';
  const tdCls = 'px-4 py-3 text-sm text-gray-700 border-b border-ink-100';

  return (
    <div className="space-y-4">
      {/* 顶部工具栏：仅标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-700">
            费用统计
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            注意核实月份与机构信息
          </p>
        </div>
      </div>

      {/* 筛选器：无外轮廓；本月移到下月右侧，导出按钮移到末尾（原本月位置） */}
      <div className="flex items-center gap-1.5 desktop:gap-3 flex-nowrap">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-ink-50 shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <CustomSelect
          value={year}
          options={yearOptions}
          onChange={(v) => setYear(v as number)}
          className="w-24 shrink-0"
        />
        <CustomSelect
          value={month}
          options={monthOptions}
          onChange={(v) => setMonth(v as number | 'all')}
          className="w-20 shrink-0"
        />
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-ink-50 shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        <CustomSelect
          value={orgFilter}
          options={orgOptions}
          onChange={(v) => setOrgFilter(v as string)}
          className="min-w-0 desktop:flex-none desktop:w-32 desktop:shrink-0"
        />
        <button onClick={handleExport} className="btn-primary hidden desktop:inline-flex ml-auto shrink-0">
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>

      {/* 统计卡片（3张，含图标） */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium mb-1 text-gray-500">
                总课节数
              </h3>
              <p
                className="text-3xl font-bold font-num"
                style={{ color: 'var(--color-primary)' }}
              >
                {stats.totalCourses}
              </p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <CalendarCheck className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">节课程</div>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium mb-1 text-gray-500">
                总课时费
              </h3>
              <p
                className="text-3xl font-bold font-num"
                style={{ color: 'var(--color-success)' }}
              >
                ¥{Math.round(stats.totalFee).toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <CircleDollarSign className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">人民币</div>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium mb-1 text-gray-500">
                学生人数
              </h3>
              <p
                className="text-3xl font-bold font-num"
                style={{ color: 'var(--color-purple)' }}
              >
                {stats.uniqueStudentCount}
              </p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <UsersRound className="w-5 h-5" style={{ color: 'var(--color-purple)' }} />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">名学生</div>
        </div>
      </div>

      {stats.totalCourses === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="font-display text-lg font-bold text-ink-700 mb-1">
            暂无数据
          </h3>
          <p className="text-sm text-gray-500">
            {rangeLabel} 范围内没有课程记录
          </p>
        </div>
      ) : (
        <>
          {/* 机构数据模块（grid-cols-2：左饼图 + 右机构表含进度条） */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-ink-700 mb-4">
              机构数据
            </h3>
            <div className={tableOverflow ? 'flex flex-col gap-6' : 'grid grid-cols-1 desktop:grid-cols-2 gap-6'}>
              {/* 左：饼图（表格溢出时居中独占一行） */}
              <div className={tableOverflow ? 'flex flex-col items-center' : ''}>
                <h4 className="text-sm font-medium text-gray-600 mb-4 self-start">
                  机构课量分布
                </h4>
                <div className="flex items-center justify-center py-2">
                  <PieChart
                    data={pieData}
                    centerLabel="总费用"
                    centerValue={`¥${Math.round(stats.totalFee).toLocaleString()}`}
                  />
                </div>
              </div>
              {/* 右：机构详细数据表（溢出时独占一行） */}
              <div ref={orgTableRef}>
                <h4 className="text-sm font-medium text-gray-600 mb-4">
                  机构详细数据
                </h4>
                <div className="rounded-lg overflow-hidden border border-ink-100"><div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[var(--bg-content)]">
                        <th className={thCls}>机构名称</th>
                        <th className={thCls}>课节数</th>
                        <th className={thCls}>课时费</th>
                        <th className={thCls}>学生数</th>
                        <th className={thCls}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.orgStats.map((o) => {
                        const color = getOrgColor(o.organization);
                        const pct =
                          stats.totalFee > 0 ? (o.totalFee / stats.totalFee) * 100 : 0;
                        return (
                          <tr key={o.organization}>
                            <td className="px-4 py-3 border-b border-ink-100">{renderOrgTag(o.organization)}</td>
                            <td className={`${tdCls} font-num`}>{o.courseCount}节</td>
                            <td className={`${tdCls} font-num`}>
                              ¥{Math.round(o.totalFee).toLocaleString()}
                            </td>
                            <td className={`${tdCls} font-num`}>{o.studentCount}人</td>
                            <td className="px-4 py-3 border-b border-ink-100">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-24 rounded-full h-2"
                                  style={{ backgroundColor: 'var(--bg-content)' }}
                                >
                                  <div
                                    className="rounded-full h-2"
                                    style={{
                                      width: `${Math.min(pct, 100)}%`,
                                      backgroundColor: color,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 font-num">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
            </div>
          </div>
          </div>

          {/* 机构课型数据模块（一对一分布 + 多人课分布） */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-ink-700 mb-4">
              机构课型数据
            </h3>

            {/* 一对一分布数据 */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                一对一分布数据
              </h4>
              {oneOnOneRows.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">暂无数据</div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-ink-100"><div className="overflow-x-auto">
                  <table
                    className="min-w-full border-separate border-spacing-0"
                    style={{ tableLayout: 'fixed' }}
                  >
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[var(--bg-content)]">
                        <th className={thCls}>机构</th>
                        <th className={thCls}>年级</th>
                        <th className={thCls}>学生数</th>
                        <th className={thCls}>课节数</th>
                        <th className={thCls}>课时费</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oneOnOneRows.map((r, i) => (
                        <tr key={`1v1-${i}`}>
                          <td className="px-4 py-3 border-b border-ink-100">{renderOrgTag(r.org)}</td>
                          <td className="px-4 py-3 border-b border-ink-100">{renderGradeTag(r.grade)}</td>
                          <td className={tdCls}>{r.item.studentCount}人</td>
                          <td className="px-4 py-3 border-b border-ink-100">
                            <span
                              className="cursor-pointer hover:underline font-medium"
                              style={{ color: 'var(--color-primary)' }}
                              onClick={() =>
                                setDetailFilter({
                                  lessonType: '一对一',
                                  org: r.org,
                                  grade: r.grade,
                                })
                              }
                            >
                              {r.item.courses}节
                            </span>
                          </td>
                          <td className={`${tdCls} font-num`}>
                            ¥{Math.round(r.item.fee).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </div>

            {/* 多人课分布数据 */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                多人课分布数据
              </h4>
              {groupRows.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">暂无数据</div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-ink-100"><div className="overflow-x-auto">
                  <table
                    className="min-w-full border-separate border-spacing-0"
                    style={{ tableLayout: 'fixed' }}
                  >
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[var(--bg-content)]">
                        <th className={thCls}>机构</th>
                        <th className={thCls}>年级</th>
                        <th className={thCls}>上课人数</th>
                        <th className={thCls}>课节数</th>
                        <th className={thCls}>课时费</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRows.map((r, i) => (
                        <tr key={`grp-${i}`}>
                          <td className="px-4 py-3 border-b border-ink-100">{renderOrgTag(r.org)}</td>
                          <td className="px-4 py-3 border-b border-ink-100">{renderGradeTag(r.grade)}</td>
                          <td className={tdCls}>{r.studentCount}人</td>
                          <td className="px-4 py-3 border-b border-ink-100">
                            <span
                              className="cursor-pointer hover:underline font-medium"
                              style={{ color: 'var(--color-primary)' }}
                              onClick={() =>
                                setDetailFilter({
                                  lessonType: '多人课',
                                  org: r.org,
                                  grade: r.grade,
                                  studentCount: parseInt(r.studentCount),
                                })
                              }
                            >
                              {r.item.courses}节
                            </span>
                          </td>
                          <td className={`${tdCls} font-num`}>
                            ¥{Math.round(r.item.fee).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </div>
          </div>

          {/* 学生课量数据模块 */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-ink-700 mb-4">
              学生课量数据
            </h3>
            {stats.studentStats.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">暂无数据</div>
            ) : (
              <div className="rounded-lg overflow-hidden border border-ink-100"><div className="overflow-x-auto">
                <table
                  className="min-w-full"
                  style={{ borderColor: 'var(--border-color)', tableLayout: 'fixed', borderCollapse: 'collapse' }}
                >
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[var(--bg-content)]">
                      <th className={thCls}>学生姓名</th>
                      <th className={thCls}>所属机构</th>
                      <th className={thCls}>年级</th>
                      <th className={thCls}>课节数</th>
                      <th className={thCls}>课时费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.studentStats.map((s) => (
                      <tr key={s.studentId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-ink-100">
                          {s.name}
                        </td>
                        <td className="px-4 py-3 border-b border-ink-100">{renderOrgTag(s.organization || '未分配')}</td>
                        <td className="px-4 py-3 border-b border-ink-100">{renderGradeTag(s.grade || '未设置')}</td>
                        <td className="px-4 py-3 border-b border-ink-100">
                          <span
                            className="cursor-pointer hover:underline font-medium"
                            style={{ color: 'var(--color-primary)' }}
                            onClick={() => setDetailFilter({ studentId: s.studentId })}
                          >
                            {s.courseCount}节
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 font-num border-b border-ink-100">
                          ¥{Math.round(s.totalFee).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </div>
            )}
          </div>
        </>
      )}

      {/* 课程详情弹窗（统一处理学生/课型/机构+年级+人数筛选） */}
      <Modal
        open={!!detailFilter}
        onClose={() => setDetailFilter(null)}
        title={
          <span className="flex items-center gap-1.5">
            <List className="w-4 h-4" />
            {detailTitle}
          </span>
        }
        width="max-w-lg"
      >
        <div className="mb-3 text-sm text-gray-500">
          {rangeLabel}
        </div>
        {detailCourses.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">暂无可显示的课程</div>
        ) : (
          <>
            {/* 统计信息条 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md"
                style={{
                  background:
                    'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                一对一 {detailStats.oneOnOneCount}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md"
                style={{
                  background: 'color-mix(in srgb, var(--color-purple) 12%, transparent)',
                  color: 'var(--color-purple)',
                }}
              >
                多人课 {detailStats.groupCount}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md"
                style={{
                  background:
                    'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  color: 'var(--color-success)',
                }}
              >
                ¥{Math.round(detailStats.totalFee).toLocaleString()}
              </span>
            </div>
            {/* 课程表格 */}
            <div className="max-h-96 overflow-auto rounded-lg border border-ink-100">
              <table
                className="w-full text-sm"
                style={{
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                }}
              >
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-ink-100 bg-[var(--bg-content)]">
                      日期
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-ink-100 bg-[var(--bg-content)]">
                      时间
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-ink-100 bg-[var(--bg-content)]">
                      学生
                    </th>
                    <th className="px-3 pr-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-right text-gray-500 border-b border-ink-100 bg-[var(--bg-content)]">
                      费用
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailCourses.map((c, idx) => {
                    const studentNames = (c.studentNames || []).join('、') || '-';
                    const startTime = c.startTime ? c.startTime.substring(0, 5) : '-';
                    let feeDisplay = '-';
                    if (c.lessonType === '多人课' && c.fees?.[0] !== undefined) {
                      feeDisplay = `¥${Math.round(c.fees[0]).toLocaleString()}`;
                    } else if (c.fees && c.fees.length > 0) {
                      feeDisplay = `¥${Math.round(
                        c.fees.reduce((s, f) => s + f, 0),
                      ).toLocaleString()}`;
                    }
                    return (
                      <tr
                        key={c.id}
                        className={
                          idx % 2 === 1
                            ? 'bg-[var(--bg-content)]/50'
                            : ''
                        }
                      >
                        <td className="px-3 py-2.5 text-gray-700 border-b border-ink-100 whitespace-nowrap">
                          {c.date ? c.date.substring(5) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 border-b border-ink-100">
                          {startTime}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 border-b border-ink-100 break-all">
                          {studentNames}
                        </td>
                        <td
                          className="px-3 pr-4 py-2.5 text-right font-medium border-b border-ink-100"
                          style={{ color: 'var(--color-success)' }}
                        >
                          {feeDisplay}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* 导出确认弹窗 */}
      <ConfirmDialog
        open={exportConfirm}
        message={`确定要导出 ${rangeLabel} 的课时统计数据吗？`}
        type="confirm"
        confirmText="导出"
        onConfirm={performExport}
        onCancel={() => setExportConfirm(false)}
      />
    </div>
  );
}
