/**
 * 日历排课页面
 *
 * 重写自课表 calendarRenderService.js + pageRenderService.js
 * 月历42格 + 课程标签 + 节假日 + 拖拽多选 + 浮动操作栏
 */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import FloatingActionBar, { type FabType } from '@/components/FloatingActionBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import CourseFormModal from '@/modals/CourseFormModal';
import ConflictModal from '@/modals/ConflictModal';
import { getDateInfo, getHolidayTagStyle, simplifyHolidayName } from '@/lib/holiday';
import { calculateEndTimeFromDuration, safeColor, parseDateLocal } from '@/lib/utils';
import { maskName, copyCourses, pasteCoursesToDate, pasteCoursesToDates, confirmPaste } from '@/lib/course';
import { deleteCourse, batchDeleteCourses, deleteDayCourses } from '@/lib/course';
import { getCourseDisplayFee } from '@/lib/course';
import {
  recordDeleteCourse,
  recordBatchDeleteCourses,
  recordDeleteDayCourses,
  recordBatchDeleteDayCourses,
  recordPasteCourses,
  recordBatchPasteCourses,
  recordAddCourse,
  recordBatchAddCourses,
} from '@/lib/history';
import type { Course } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Snowflake,
} from 'lucide-react';

import PageLoading from '@/components/PageLoading';
import ScrollHelperButton from '@/components/ScrollHelperButton';
import Marquee from '@/components/Marquee';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** 构建日历42格 */
function buildCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; dateStr: string; isCurrent: boolean }[] = [];

  // 上月填充
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, dateStr: `${y}-${pad(m + 1)}-${pad(day)}`, isCurrent: false });
  }
  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${year}-${pad(month + 1)}-${pad(d)}`, isCurrent: true });
  }
  // 下月填充
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, isCurrent: false });
  }

  return cells;
}

export default function Calendar() {
  const courses = useStore((s) => s.courses);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const currentYear = useStore((s) => s.currentYear);
  const currentMonth = useStore((s) => s.currentMonth);
  const privacyMode = useStore((s) => s.privacyMode);
  const setCurrentMonth = useStore((s) => s.setCurrentMonth);
  const togglePrivacy = useStore((s) => s.togglePrivacy);
  const selectedDates = useStore((s) => s.selectedDates);
  const selectedCourseIds = useStore((s) => s.selectedCourseIds);
  const setSelectedDates = useStore((s) => s.setSelectedDates);
  const setSelectedCourseIds = useStore((s) => s.setSelectedCourseIds);
  const clearSelections = useStore((s) => s.clearSelections);
  const toast = useToast();

  // 本月课程数（小标题展示）
  const monthCourseCount = courses.filter((c) =>
    (c.date || '').startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`),
  ).length;

  // 模态框状态
  const [formModal, setFormModal] = useState<{
    open: boolean;
    date: string;
    dates: string[];
    editCourse: Course | null;
  }>({
    open: false,
    date: '',
    dates: [],
    editCourse: null,
  });
  const [conflictData, setConflictData] = useState<{
    open: boolean;
    conflicts: ReturnType<typeof pasteCoursesToDate>['conflicts'];
    added: Course[];
    /** 冲突来源：粘贴课程或添加课程，决定解决后的通知/历史记录文案 */
    source: 'paste' | 'add';
  }>({ open: false, conflicts: [], added: [], source: 'paste' });

  // 拖拽多选
  const dragStartRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽框线（从鼠标按下位置到当前位置的矩形）
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  // 响应式：移动端用列表视图（每天一卡），桌面端用月历网格
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1100,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // 全局拖拽监听：mousedown 在页面任意空白处启动自由拖拽，mousemove 绘制框线，mouseup 结束
  useEffect(() => {
    const onGlobalMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // 窄屏（手机触摸或窄桌面窗口）：不做自由拖拽框选，点击空白处直接取消选中
      if (isMobile) {
        if (
          target.closest(
            'button, input, select, textarea, .modal-overlay, .floating-action-bar, .course-tag-item, .mobile-day-card',
          )
        ) {
          return;
        }
        clearSelections();
        return;
      }
      // 点击交互元素/课程标签/模态框/FAB：不启动拖拽
      if (target.closest('button, input, select, textarea, .modal-overlay, .floating-action-bar, .course-tag-item')) return;
      // 点击日历格子：由格子的 onMouseDown 处理
      if (target.closest('.calendar-cell')) return;
      // Ctrl+click：不启动拖拽
      if (e.ctrlKey || e.metaKey) return;
      // 启动自由拖拽（从页面任意空白处开始）
      clearSelections();
      dragStartRef.current = null;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    };

    // 移动端：点击非日期卡片、非课程标签、非交互元素的空白区域时收起浮动操作栏
    const onGlobalTouchStart = (e: TouchEvent) => {
      if (!isMobile) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, input, select, textarea, .modal-overlay, .floating-action-bar, .course-tag-item, .calendar-cell, .mobile-day-card',
        )
      ) {
        return;
      }
      clearSelections();
    };

    const onGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStartPosRef.current) return;
      const start = dragStartPosRef.current;
      setDragRect({
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        w: Math.abs(e.clientX - start.x),
        h: Math.abs(e.clientY - start.y),
      });
    };

    const onGlobalMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      dragStartPosRef.current = null;
      setDragRect(null);
    };

    window.addEventListener('mousedown', onGlobalMouseDown);
    window.addEventListener('touchstart', onGlobalTouchStart, { passive: true });
    if (isDragging) {
      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', onGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousedown', onGlobalMouseDown);
      window.removeEventListener('touchstart', onGlobalTouchStart);
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isDragging, clearSelections, isMobile]);

  // 确认弹窗
  const [confirm, setConfirm] = useState<{
    open: boolean;
    message: React.ReactNode;
    type: 'confirm' | 'delete' | 'warning';
    onConfirm: () => void;
  }>({ open: false, message: '', type: 'confirm', onConfirm: () => {} });

  // 日历单元格
  const cells = useMemo(() => buildCells(currentYear, currentMonth), [currentYear, currentMonth]);

  // 课程按日期分组
  const coursesByDate = useMemo(() => {
    const map = new Map<string, Course[]>();
    courses.forEach((c) => {
      const arr = map.get(c.date) || [];
      arr.push(c);
      map.set(c.date, arr);
    });
    // 在此处统一按开始时间排序，避免每个日期格渲染时重复排序
    map.forEach((arr) =>
      arr.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    );
    return map;
  }, [courses]);

  // 今日
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // 年月下拉选项：默认当前年前两年到后一年，若数据超出范围则自适应扩展
  const yearOptions = useMemo(() => {
    let minYear = today.getFullYear() - 2;
    let maxYear = today.getFullYear() + 1;
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

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `${i + 1}月` }));

  // 月份切换
  const prevMonth = () => {
    if (currentMonth === 0) setCurrentMonth(currentYear - 1, 11);
    else setCurrentMonth(currentYear, currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) setCurrentMonth(currentYear + 1, 0);
    else setCurrentMonth(currentYear, currentMonth + 1);
  };

  // 浮动操作栏类型
  const fabType: FabType = useMemo(() => {
    if (selectedCourseIds.length > 1) return 'multi-course';
    if (selectedCourseIds.length === 1) return 'course';
    if (selectedDates.length > 1) return 'multi-date';
    if (selectedDates.length === 1) return 'date';
    return null;
  }, [selectedCourseIds, selectedDates]);

  // 单选课程是否为冻结课程（冻结课程不可编辑/复制，只可删除）
  const singleCourseFrozen =
    selectedCourseIds.length === 1 &&
    !!courses.find((c) => c.id === selectedCourseIds[0])?.frozen;

  // 日期选择
  const selectDate = useCallback(
    (dateStr: string, e: React.MouseEvent) => {
      // 清除课程选择
      setSelectedCourseIds([]);

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+click 切换
        setSelectedDates(
          selectedDates.includes(dateStr)
            ? selectedDates.filter((d) => d !== dateStr)
            : [...selectedDates, dateStr],
        );
      } else {
        setSelectedDates([dateStr]);
      }
    },
    [selectedDates, selectedCourseIds, setSelectedDates, setSelectedCourseIds],
  );

  // —— 窄屏日期多选 ——
  // 长按日期格 500ms 进入多选模式，之后点击格子为切换选中；点击空白处退出
  const [multiDateMode, setMultiDateMode] = useState(false);
  const multiDateModeRef = useRef(false);
  multiDateModeRef.current = multiDateMode;
  const datePressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const datePressStartRef = useRef<{ x: number; y: number } | null>(null);
  const dateLongPressFiredRef = useRef(false);

  const clearDatePressTimer = () => {
    if (datePressTimerRef.current) {
      clearTimeout(datePressTimerRef.current);
      datePressTimerRef.current = null;
    }
  };

  const handleDateTouchStart = (dateStr: string, e: React.TouchEvent) => {
    // 课程标签有自己的点击/长按语义，不启动日期多选
    if ((e.target as HTMLElement).closest('.course-tag-item')) return;
    const t = e.touches[0];
    datePressStartRef.current = { x: t.clientX, y: t.clientY };
    dateLongPressFiredRef.current = false;
    clearDatePressTimer();
    datePressTimerRef.current = setTimeout(() => {
      dateLongPressFiredRef.current = true;
      setMultiDateMode(true);
      const current = useStore.getState().selectedDates;
      setSelectedCourseIds([]);
      if (!current.includes(dateStr)) setSelectedDates([...current, dateStr]);
      toast.info('已进入日期多选，点击格子继续选择');
    }, 500);
  };

  // 手指移动超过 10px 视为滚动，取消长按
  const handleDateTouchMove = (e: React.TouchEvent) => {
    const start = datePressStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10) {
      clearDatePressTimer();
      datePressStartRef.current = null;
    }
  };

  const handleDateTouchEnd = () => {
    clearDatePressTimer();
    datePressStartRef.current = null;
  };

  // 选中项被清空时自动退出多选模式
  useEffect(() => {
    if (selectedDates.length === 0 && multiDateMode) setMultiDateMode(false);
  }, [selectedDates.length, multiDateMode]);

  // 窄屏日期点选：多选模式切换选中；否则单选，再点已选日期则取消
  const toggleDateMobile = useCallback(
    (dateStr: string) => {
      // 长按触发的那次点击已由长按逻辑处理，忽略随后的 click
      if (dateLongPressFiredRef.current) {
        dateLongPressFiredRef.current = false;
        return;
      }
      setSelectedCourseIds([]);
      if (multiDateModeRef.current) {
        setSelectedDates(
          selectedDates.includes(dateStr)
            ? selectedDates.filter((d) => d !== dateStr)
            : [...selectedDates, dateStr],
        );
        return;
      }
      if (selectedDates.length === 1 && selectedDates[0] === dateStr) {
        clearSelections();
        return;
      }
      setSelectedDates([dateStr]);
    },
    [selectedDates, clearSelections, setSelectedDates, setSelectedCourseIds],
  );

  // 定位到今天：不在当前月份时先切月，等渲染完成后再滚动到格子中部
  const locateToday = useCallback(() => {
    const now = new Date();
    const doScroll = () => {
      const el = document.querySelector<HTMLElement>(`[data-date="${todayStr}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (now.getFullYear() !== currentYear || now.getMonth() !== currentMonth) {
      setCurrentMonth(now.getFullYear(), now.getMonth());
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
    } else {
      doScroll();
    }
  }, [currentYear, currentMonth, setCurrentMonth, todayStr]);

  // 拖拽开始
  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // 检查是否点击在课程标签上（课程标签有自己的点击处理）
    const target = e.target as HTMLElement;
    if (target.closest('.course-tag-item')) return;

    // Ctrl+click 不启动拖拽，由 click 处理切换
    if (e.ctrlKey || e.metaKey) {
      dragStartRef.current = null;
      return;
    }

    dragStartRef.current = dateStr;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setSelectedCourseIds([]);
    setSelectedDates([dateStr]);
  };

  // 拖拽进入
  const handleMouseEnter = (dateStr: string) => {
    if (!isDragging) return;
    // 自由拖拽首次进入格子：设置起点
    if (dragStartRef.current === null) {
      dragStartRef.current = dateStr;
      setSelectedCourseIds([]);
      setSelectedDates([dateStr]);
      return;
    }
    const startIdx = cells.findIndex((c) => c.dateStr === dragStartRef.current);
    const endIdx = cells.findIndex((c) => c.dateStr === dateStr);
    if (startIdx < 0 || endIdx < 0) return;
    // 按 6×7 网格的行列矩形选择（而非索引范围连续填充），
    // 避免跨周拖拽时自动选中起点到终点之间的所有格子
    const startRow = Math.floor(startIdx / 7);
    const startCol = startIdx % 7;
    const endRow = Math.floor(endIdx / 7);
    const endCol = endIdx % 7;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const dates: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * 7 + c;
        if (idx >= 0 && idx < cells.length) dates.push(cells[idx].dateStr);
      }
    }
    setSelectedDates(dates);
  };

  // 课程点击
  const handleCourseClick = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    // 再次点击已选中的课程即取消选中（窄屏没有 Ctrl 键，用点击切换更直接）
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      selectedCourseIds.length === 1 &&
      selectedCourseIds[0] === course.id
    ) {
      clearSelections();
      return;
    }
    setSelectedDates([]);

    if (e.ctrlKey || e.metaKey) {
      setSelectedCourseIds(
        selectedCourseIds.includes(course.id)
          ? selectedCourseIds.filter((id) => id !== course.id)
          : [...selectedCourseIds, course.id],
      );
    } else {
      setSelectedCourseIds([course.id]);
    }
  };

  // 添加课程（单日/批量多日）
  const handleAdd = () => {
    if (selectedDates.length === 0) return;
    setFormModal({
      open: true,
      date: selectedDates[0],
      dates: [...selectedDates],
      editCourse: null,
    });
  };

  // 编辑课程（冻结课程默认打开只读视图，可打开冻结开关纠错）
  const handleEdit = () => {
    if (selectedCourseIds.length !== 1) return;
    const course = courses.find((c) => c.id === selectedCourseIds[0]);
    if (!course) return;
    setFormModal({ open: true, date: course.date, dates: [course.date], editCourse: course });
  };

  // 删除（带二次确认）
  const handleDelete = () => {
    if (selectedCourseIds.length > 0) {
      const count = selectedCourseIds.length;
      const msg =
        count === 1
          ? '确定要删除这节课程吗？'
          : `确定要删除选中的 ${count} 节课程吗？`;
      setConfirm({
        open: true,
        message: msg,
        type: 'delete',
        onConfirm: () => {
          const deletedCourses = courses.filter((c) => selectedCourseIds.includes(c.id));
          batchDeleteCourses(selectedCourseIds);
          if (deletedCourses.length === 1) {
            recordDeleteCourse(deletedCourses[0]);
          } else {
            recordBatchDeleteCourses(deletedCourses);
          }
          toast.success(`已删除 ${count} 节课程`);
          clearSelections();
          setConfirm((c) => ({ ...c, open: false }));
        },
      });
    } else if (selectedDates.length > 0) {
      const dateCount = selectedDates.length;
      const allDeleted: Course[] = [];
      selectedDates.forEach((date) => {
        allDeleted.push(...courses.filter((c) => c.date === date));
      });
      const msg =
        dateCount === 1
          ? `确定要删除 ${selectedDates[0]} 的全部课程吗？`
          : `确定要删除 ${dateCount} 天的共 ${allDeleted.length} 节课程吗？`;
      setConfirm({
        open: true,
        message: msg,
        type: 'delete',
        onConfirm: () => {
          selectedDates.forEach((date) => deleteDayCourses(date));
          if (dateCount === 1) {
            recordDeleteDayCourses(selectedDates[0], allDeleted);
          } else {
            recordBatchDeleteDayCourses(selectedDates, allDeleted);
          }
          toast.success(`已删除 ${dateCount} 天的课程`);
          clearSelections();
          setConfirm((c) => ({ ...c, open: false }));
        },
      });
    }
  };

  // 复制课程（冻结课程不可复制，自动排除）
  const handleCopy = () => {
    const selectedCourses = courses.filter(
      (c) => selectedCourseIds.includes(c.id) && !c.frozen,
    );
    if (selectedCourses.length === 0) {
      toast.warning('冻结课程不可复制');
      return;
    }
    if (copyCourses(selectedCourses)) {
      toast.success(`已复制 ${selectedCourses.length} 节课程`);
    }
  };

  // 复制选中日期的所有课程（冻结课程不可复制，自动排除）
  const handleCopyDayCourses = () => {
    const dayCourses = courses.filter(
      (c) => selectedDates.includes(c.date) && !c.frozen,
    );
    if (dayCourses.length === 0) {
      toast.warning('所选日期没有可复制的课程');
      return;
    }
    if (copyCourses(dayCourses)) {
      toast.success(`已复制 ${dayCourses.length} 节课程`);
    }
  };

  // 粘贴课程（支持批量多日期）
  const handlePaste = () => {
    if (selectedDates.length === 0) return;

    let result;
    if (selectedDates.length === 1) {
      // 单日粘贴
      result = pasteCoursesToDate(selectedDates[0], courses);
    } else {
      // 批量多日粘贴
      result = pasteCoursesToDates(selectedDates, courses);
    }

    if (result.conflicts.length > 0) {
      setConflictData({ open: true, conflicts: result.conflicts, added: result.added, source: 'paste' });
    } else if (result.added.length > 0) {
      const deleted = confirmPaste(result.added, []);
      if (result.added.length === 1) {
        recordPasteCourses(result.added, deleted);
      } else {
        recordBatchPasteCourses(result.added, deleted);
      }
      let msg = `成功粘贴 ${result.added.length} 节课程`;
      if (result.duplicateCount > 0) msg += `，${result.duplicateCount} 节已存在`;
      toast.success(msg);
      clearSelections();
    } else {
      toast.warning(result.duplicateCount > 0 ? '所有课程已存在' : '没有可粘贴的课程');
    }
  };

  // 冲突解决（区分粘贴/添加来源，通知与历史记录文案保持一致）
  const handleConflictResolve = (
    skipped: typeof conflictData.conflicts,
    overridden: typeof conflictData.conflicts,
  ) => {
    const source = conflictData.source;
    const overrideIds = overridden.flatMap((o) => o.conflictingCourses.map((c) => c.id));
    const allToAdd = [...conflictData.added, ...overridden.map((o) => o.newCourse)];
    const deleted = confirmPaste(allToAdd, overrideIds);
    // 全部跳过时没有可添加/粘贴的课程，提示跳过而非"成功 0 节"
    if (allToAdd.length === 0) {
      toast.warning(`已跳过 ${skipped.length} 节冲突课程，未${source === 'add' ? '添加' : '粘贴'}新课程`);
    } else if (source === 'add') {
      if (allToAdd.length === 1) {
        recordAddCourse(allToAdd[0], false, deleted);
      } else {
        recordBatchAddCourses(allToAdd, deleted);
      }
      let msg = `成功添加 ${allToAdd.length} 节课程`;
      if (skipped.length > 0) msg += `，跳过 ${skipped.length} 节`;
      toast.success(msg);
    } else {
      if (allToAdd.length === 1) {
        recordPasteCourses(allToAdd, deleted);
      } else {
        recordBatchPasteCourses(allToAdd, deleted);
      }
      let msg = `成功粘贴 ${allToAdd.length} 节课程`;
      if (skipped.length > 0) msg += `，跳过 ${skipped.length} 节`;
      toast.success(msg);
    }
    setConflictData({ open: false, conflicts: [], added: [], source: 'paste' });
    clearSelections();
  };

  // 数据未加载完成且本地为空时先显示加载态，避免先闪一下空日历
  if (!dataLoaded && courses.length === 0) return <PageLoading label="正在加载课表…" />;

  return (
    <div className="space-y-4 select-none">
      {/* 页面标题 */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-700">日历排课</h1>
        <p className="text-sm text-gray-500 mt-1">
          本月已有 {monthCourseCount} 节课，{monthCourseCount >= 30 ? '注意休息哦~' : '保持开心哦~'}
        </p>
      </div>

      {/* 月份导航 */}
      <div className="flex items-center gap-1.5 desktop:gap-3 flex-nowrap">
        <button
          onClick={prevMonth}
          className="p-2 desktop:p-1.5 rounded-lg hover:bg-ink-50 shrink-0"
          aria-label="上个月"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <CustomSelect
          value={currentYear}
          options={yearOptions}
          onChange={(v) => setCurrentMonth(v as number, currentMonth)}
          className="w-24 shrink-0"
        />
        <CustomSelect
          value={currentMonth}
          options={monthOptions}
          onChange={(v) => setCurrentMonth(currentYear, v as number)}
          className="w-20 shrink-0"
        />
        <button
          onClick={nextMonth}
          className="p-2 desktop:p-1.5 rounded-lg hover:bg-ink-50 shrink-0"
          aria-label="下个月"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        {/* 隐私模式：圆角矩形墨绿色按钮（图标区分状态），自动靠右；移动端隐藏 */}
        <button
          onClick={togglePrivacy}
          className="hidden desktop:flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-ink-700 text-white transition-opacity shrink-0 ml-auto"
          title={privacyMode ? '隐私模式已开启' : '点击开启隐私模式'}
        >
          {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* 移动端：自适应多格布局（空日期格自动变矮，每行按可用宽度排列多个格子） */}
      {isMobile && (
        <div className="desktop:hidden flex flex-wrap items-start gap-2">
          {cells.filter((c) => c.isCurrent).map((cell) => {
            const dayCourses = coursesByDate.get(cell.dateStr) || [];
            const dateInfo = getDateInfo(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const isSelected = selectedDates.includes(cell.dateStr);
            const wd = parseDateLocal(cell.dateStr).getDay();
            const weekdayLabel = WEEKDAYS[wd === 0 ? 6 : wd - 1];
            const isWeekend = wd === 0 || wd === 6;

            return (
              <div
                key={cell.dateStr}
                data-date={cell.dateStr}
                className={`mobile-day-card min-w-0 shrink-0 rounded-lg border overflow-hidden cursor-pointer transition-shadow bg-[var(--bg-content)] ${
                  dayCourses.length > 0
                    ? 'basis-full'
                    : 'grow basis-[140px] min-w-[130px] min-h-[60px] flex flex-col justify-center'
                } ${
                  isSelected
                    ? 'border-ink ring-2 ring-inset ring-ink'
                    : isToday
                      ? 'border-amber-500 ring-2 ring-inset ring-amber-500'
                      : 'border-ink-100'
                }`}
                onClick={() => toggleDateMobile(cell.dateStr)}
                onTouchStart={(e) => handleDateTouchStart(cell.dateStr, e)}
                onTouchMove={handleDateTouchMove}
                onTouchEnd={handleDateTouchEnd}
                onTouchCancel={handleDateTouchEnd}
              >
                {/* 日期头 */}
                <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
                  <span
                    className={`text-base font-semibold leading-none ${
                      isToday ? 'text-amber-600' : isWeekend ? 'text-gray-500' : 'text-gray-700'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <span className="text-[11px] text-gray-500">{weekdayLabel}</span>
                  {dateInfo?.isHoliday && dateInfo.name && (
                    <span
                      className="px-1 h-4 rounded text-[10px] font-semibold inline-flex items-center justify-center"
                      style={getHolidayTagStyle(dateInfo.name)}
                    >
                      {simplifyHolidayName(dateInfo.name)}
                    </span>
                  )}
                  {dateInfo?.isInLieu && (
                    <span className="w-4 h-4 rounded-full text-[10px] font-semibold text-white bg-[#B03A5E] inline-flex items-center justify-center">
                      调
                    </span>
                  )}
                  {dateInfo?.isWorkday && isWeekend && (
                    <span className="w-4 h-4 rounded-full text-[10px] font-semibold text-white bg-ink inline-flex items-center justify-center">
                      班
                    </span>
                  )}
                  {dayCourses.length > 0 && (
                    <span className="ml-auto text-[11px] text-gray-500">{dayCourses.length} 节</span>
                  )}
                </div>

                {/* 课程标签：与桌面端一致（学生名胶囊 + 时间/费用），等分铺满整行，最小宽度保证时间完整显示 */}
                {dayCourses.length > 0 && (
                  <div className="px-2 pb-2 flex flex-wrap gap-2">
                    {dayCourses.map((course) => {
                      const isSelectedCourse = selectedCourseIds.includes(course.id);
                      const primaryColor = safeColor(course.colors?.[0] || 'var(--color-secondary)');
                      const fee = getCourseDisplayFee(course);
                      const feeHtml = !privacyMode && fee > 0 ? `¥${fee}` : '';
                      return (
                        <div
                          key={course.id}
                          className={`course-tag-item rounded grow basis-[150px] min-w-[150px] relative cursor-pointer transition-all ${
                            isSelectedCourse ? 'is-selected' : ''
                          }`}
                          style={{
                            '--tag-theme-color': primaryColor,
                            backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                          } as React.CSSProperties}
                          onClick={(e) => handleCourseClick(course, e)}
                        >
                          {course.frozen && (
                            <Snowflake className="absolute top-1.5 right-1.5 w-[18px] h-[18px] text-[#7dd3fc] pointer-events-none z-20" strokeWidth={2.5} />
                          )}
                          <div className="p-1">
                            {/* 学生姓名：单行不换行，过长渐隐；选中后左右滚动播放 */}
                            <Marquee
                              active={isSelectedCourse || isSelected}
                              className="mb-0.5"
                              innerClassName="gap-0.5"
                            >
                              {(course.studentNames || []).map((name, idx) => {
                                const color = safeColor(course.colors?.[idx] || primaryColor);
                                const displayName = privacyMode ? maskName(name) : name;
                                return (
                                  <span
                                    key={idx}
                                    className="shrink-0 px-1 py-0.5 rounded text-[10px]"
                                    style={{
                                      backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                                      color,
                                    }}
                                  >
                                    {displayName}
                                  </span>
                                );
                              })}
                            </Marquee>
                            {/* 时间 + 费用 */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                {course.startTime}-{calculateEndTimeFromDuration(course.startTime, course.duration)}
                              </span>
                              {feeHtml && (
                                <span className="text-[10px] text-gray-600">{feeHtml}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 桌面端：月历网格 */}
      <div className="hidden desktop:block rounded-xl overflow-hidden border border-ink-200">
        {/* 星期表头 */}
        <div className="grid grid-cols-7 bg-[var(--bg-content)] border-b border-ink-200">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center text-xs py-2 font-medium ${
                i >= 5 ? 'text-gray-500' : 'text-gray-600'
              } ${i < 6 ? 'border-r border-ink-100' : ''}`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日期格 */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayCourses = coursesByDate.get(cell.dateStr) || [];
            const dateInfo = getDateInfo(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const isSelected = selectedDates.includes(cell.dateStr);

            return (
              <div
                key={cell.dateStr}
                data-date={cell.dateStr}
                className={`calendar-cell border-r border-b border-ink-100 p-1.5 min-h-[110px] cursor-pointer ${
                  cell.isCurrent ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-content)]'
                } ${isToday ? 'today-border' : ''} ${isSelected ? 'selected' : ''} ${
                  i % 7 === 6 ? 'border-r-0' : ''
                }`}
                onMouseDown={(e) => handleMouseDown(cell.dateStr, e)}
                onMouseEnter={() => handleMouseEnter(cell.dateStr)}
                onClick={(e) => {
                  if (!isDragging) selectDate(cell.dateStr, e);
                }}
              >
                {/* 日期头部 */}
                <div className="flex items-center justify-end gap-1 mb-1">
                  {/* 节假日标签 */}
                  {dateInfo?.isHoliday && dateInfo.name && (
                    <span
                      className="holiday-tag px-1.5 h-5 rounded text-[10px] font-semibold inline-flex items-center justify-center"
                      style={getHolidayTagStyle(dateInfo.name)}
                    >
                      {simplifyHolidayName(dateInfo.name)}
                    </span>
                  )}
                  {/* 今日标识 */}
                  {isToday && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white bg-amber-500">
                      今
                    </span>
                  )}
                  {/* 调休/班标识 */}
                  {dateInfo?.isInLieu && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white bg-[#B03A5E]">
                      调
                    </span>
                  )}
                  {dateInfo?.isWorkday && (() => {
                    const d = parseDateLocal(cell.dateStr);
                    if (d.getDay() === 0 || d.getDay() === 6) {
                      return (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white bg-ink">
                          班
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {/* 日期数字 */}
                  <span
                    className={`text-xs ${
                      cell.isCurrent
                        ? isToday
                          ? 'font-bold text-amber-600'
                          : 'text-gray-600'
                        : 'text-gray-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>

                {/* 课程标签 */}
                <div className="space-y-1">
                  {dayCourses.map((course) => {
                    const isSelectedCourse = selectedCourseIds.includes(course.id);
                    const primaryColor = safeColor(course.colors?.[0] || 'var(--color-secondary)');
                    const fee = getCourseDisplayFee(course);
                    const feeHtml = !privacyMode && fee > 0 ? `¥${fee}` : '';

                    return (
                      <div
                        key={course.id}
                        className={`course-tag-item rounded text-xs relative z-10 cursor-pointer transition-all ${
                          isSelectedCourse ? 'is-selected' : ''
                        }`}
                        style={{
                          '--tag-theme-color': primaryColor,
                          backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                        } as React.CSSProperties}
                        onClick={(e) => handleCourseClick(course, e)}
                      >
                        {course.frozen && (
                          <Snowflake className="absolute top-1.5 right-1.5 w-[18px] h-[18px] text-[#7dd3fc] pointer-events-none z-20" strokeWidth={2.5} />
                        )}
                        <div className="p-1">
                          {/* 学生姓名：单行不换行，过长渐隐；选中后左右滚动播放 */}
                          <Marquee
                            active={isSelectedCourse || isSelected}
                            className="mb-0.5"
                            innerClassName="gap-0.5"
                          >
                            {(course.studentNames || []).map((name, idx) => {
                              const color = safeColor(course.colors?.[idx] || primaryColor);
                              const displayName = privacyMode ? maskName(name) : name;
                              return (
                                <span
                                  key={idx}
                                  className="shrink-0 px-1 py-0.5 rounded text-[10px]"
                                  style={{
                                    backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                                    color,
                                  }}
                                >
                                  {displayName}
                                </span>
                              );
                            })}
                          </Marquee>
                          {/* 时间 + 费用 */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              {course.startTime}-{calculateEndTimeFromDuration(course.startTime, course.duration)}
                            </span>
                            {feeHtml && (
                              <span className="text-[10px] text-gray-600">
                                {feeHtml}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右下角快捷按钮：定位到今天（浮动操作栏出现时隐藏，避免重叠） */}
      <ScrollHelperButton mode="today" onClick={locateToday} hidden={!!fabType} />

      {/* 浮动操作栏 */}
      <FloatingActionBar
        type={fabType}
        count={selectedCourseIds.length || selectedDates.length}
        onAdd={selectedDates.length > 0 ? handleAdd : undefined}
        onEdit={selectedCourseIds.length === 1 ? handleEdit : undefined}
        onDelete={selectedCourseIds.length > 0 || selectedDates.length > 0 ? handleDelete : undefined}
        onCopy={
          selectedCourseIds.length > 0
            ? singleCourseFrozen
              ? undefined
              : handleCopy
            : selectedDates.length > 0
              ? handleCopyDayCourses
              : undefined
        }
        onPaste={selectedDates.length > 0 ? handlePaste : undefined}
      />

      {/* 课程表单模态框 */}
      <CourseFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, date: '', dates: [], editCourse: null })}
        date={formModal.date}
        dates={formModal.dates}
        editCourse={formModal.editCourse}
        onConflict={(conflicts, preAdded) => {
          setFormModal({ open: false, date: '', dates: [], editCourse: null });
          setConflictData({ open: true, conflicts, added: preAdded ?? [], source: 'add' });
        }}
      />

      {/* 冲突模态框 */}
      <ConflictModal
        open={conflictData.open}
        onClose={() => setConflictData({ open: false, conflicts: [], added: [], source: 'paste' })}
        conflicts={conflictData.conflicts}
        onResolve={handleConflictResolve}
      />

      {/* 拖拽选择框线 */}
      {dragRect && dragRect.w > 2 && dragRect.h > 2 && (
        <div
          className="fixed pointer-events-none z-[55] border-2 border-dashed border-ink-300 bg-ink-100/20 rounded"
          style={{
            left: dragRect.x,
            top: dragRect.y,
            width: dragRect.w,
            height: dragRect.h,
          }}
        />
      )}

      {/* 二次确认弹窗 */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        type={confirm.type}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
