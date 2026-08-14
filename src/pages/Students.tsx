/**
 * 学生管理页面
 *
 * 重写自课表 listRenderService.js + eventHandlerService.js
 * 机构分组分列布局（随宽度自适应列数）+ 搜索防抖 + 多选 + 浮动操作栏
 */
import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';

// 机构列的 droppable id 前缀（区分「拖到某机构」与「拖到某列」）
const ORG_COL_PREFIX = '__org_col__';
// 机构列布局持久化键
const ORG_COLS_KEY = 'studentOrgCols';

/** 持久化机构列布局（每列一个有序数组） */
function persistOrgCols(cols: string[][]) {
  try {
    localStorage.setItem(ORG_COLS_KEY, JSON.stringify(cols));
  } catch {
    /* 忽略 */
  }
}

/**
 * 计算指针位置对应的列内插入目标（列 + 列内位置）
 * - 列：取指针 x 最近的列中心（列宽固定，判定稳定不抖动）
 * - 空列：pos 0（列顶）
 * - 非空：指针在分组上半 → 插其上方；下半 → 插其下方（同列）
 */
function findOrgInsertTarget(
  x: number,
  y: number,
  cols: string[][],
): { col: number; pos: number } | null {
  const colEls = Array.from(document.querySelectorAll<HTMLElement>('[data-org-col]'));
  if (colEls.length === 0) return null;
  let bestCol = 0;
  let bestDist = Infinity;
  colEls.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const d = Math.abs(x - (r.left + r.width / 2));
    if (d < bestDist) {
      bestDist = d;
      bestCol = i;
    }
  });
  const colArr = cols[bestCol] ?? [];
  if (colArr.length === 0) return { col: bestCol, pos: 0 };
  for (let i = 0; i < colArr.length; i++) {
    const el = document.querySelector<HTMLElement>(
      `[data-org-sortable=${JSON.stringify(colArr[i])}]`,
    );
    const r = el?.getBoundingClientRect();
    if (!r) continue;
    if (y < r.top + r.height / 2) return { col: bestCol, pos: i };
  }
  return { col: bestCol, pos: colArr.length };
}

/** 把机构从原位置移动到目标列的目标位置（同列相对位置会自动校正） */
function moveOrgBetweenCols(
  cols: string[][],
  org: string,
  toCol: number,
  toPos: number,
): string[][] | null {
  let fromCol = -1;
  let fromPos = -1;
  cols.forEach((col, ci) => {
    const pi = col.indexOf(org);
    if (pi >= 0) {
      fromCol = ci;
      fromPos = pi;
    }
  });
  if (fromCol < 0) return null;
  const next = cols.map((col) => [...col]);
  next[fromCol].splice(fromPos, 1);
  // 同列内后移时，移除自身后目标位置 -1
  let pos = toPos;
  if (fromCol === toCol && fromPos < toPos) pos -= 1;
  pos = Math.max(0, Math.min(pos, next[toCol].length));
  next[toCol].splice(pos, 0, org);
  return next;
}
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import CustomSelect from '@/components/CustomSelect';
import FloatingActionBar, { type FabType } from '@/components/FloatingActionBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import StudentFormModal from '@/modals/StudentFormModal';
import ManagementModal from '@/modals/ManagementModal';
import UpgradeModal, { type UpgradeModalMode } from '@/modals/UpgradeModal';
import {
  filterStudents,
  sortStudentsByOrgGradeName,
  sortStudentsByName,
  groupStudentsByOrg,
  batchUpdateStudents,
} from '@/lib/student';
import { generateColor } from '@/lib/utils';
import { recordDeleteStudent, recordBatchDeleteStudents, recordBatchUpdateStudents } from '@/lib/history';
import type { Student, StudentFees } from '@/lib/types';
import {
  Plus,
  Search,
  School,
  GraduationCap,
  Rocket,
  UserRoundX,
} from 'lucide-react';

export default function Students() {
  const students = useStore((s) => s.students);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const courses = useStore((s) => s.courses);
  const organizations = useStore((s) => s.organizations);
  const grades = useStore((s) => s.grades);
  const selectedStudentIds = useStore((s) => s.selectedStudentIds);
  const setSelectedStudentIds = useStore((s) => s.setSelectedStudentIds);
  const toast = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 模态框状态
  const [formModal, setFormModal] = useState<{ open: boolean; editStudent: Student | null }>({
    open: false,
    editStudent: null,
  });
  const [mgmtModal, setMgmtModal] = useState<{ open: boolean; type: 'organization' | 'grade' }>({
    open: false,
    type: 'organization',
  });
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  // 升级计划模态框：已有 pending 计划则进入确认模式，否则创建模式
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; mode: UpgradeModalMode }>({
    open: false,
    mode: 'create',
  });

  const handleOpenUpgrade = () => {
    const plan = useStore.getState().upgradePlan;
    setUpgradeModal({
      open: true,
      mode: plan && plan.status === 'pending' ? 'confirm' : 'create',
    });
  };

  // 批量编辑字段
  const [batchOrg, setBatchOrg] = useState('');
  const [batchGrade, setBatchGrade] = useState('');
  const [batchFee, setBatchFee] = useState('');
  const [batchDuration, setBatchDuration] = useState('');

  // 拖拽框选
  const [isDragging, setIsDragging] = useState(false);
  const dragOccurredRef = useRef(false);
  // 拖拽框线
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // 确认弹窗
  const [confirm, setConfirm] = useState<{
    open: boolean;
    message: React.ReactNode;
    type: 'confirm' | 'delete' | 'warning';
    onConfirm: () => void;
  }>({ open: false, message: '', type: 'confirm', onConfirm: () => {} });

  // 全局拖拽监听：mousedown 在页面任意空白处启动自由拖拽，mousemove 绘制框线+相交检测，mouseup 结束
  useEffect(() => {
    const onGlobalMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // 点击交互元素/FAB/模态框/机构表头（表头用于长按排序）：不启动拖拽
      if (target.closest('button, input, select, textarea, .modal-overlay, .floating-action-bar, .student-org-group-header')) return;
      // 点击学生行/卡片：由行的 onMouseDown 处理
      if (target.closest('.student-card')) return;
      // Ctrl+click：不启动拖拽
      if (e.ctrlKey || e.metaKey) return;
      // 启动自由拖拽（从页面任意空白处开始）
      setSelectedStudentIds([]);
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragOccurredRef.current = false;
      setIsDragging(true);
    };

    const onGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStartPosRef.current) return;
      const start = dragStartPosRef.current;
      dragOccurredRef.current = true;
      const rect = {
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        w: Math.abs(e.clientX - start.x),
        h: Math.abs(e.clientY - start.y),
      };
      setDragRect(rect);
      // 框选区相交检测：选中所有与框选矩形相交的卡片
      if (rect.w > 3 || rect.h > 3) {
        const cards = document.querySelectorAll('[data-student-id]');
        const intersected: string[] = [];
        cards.forEach((card) => {
          const cr = card.getBoundingClientRect();
          if (
            cr.left < rect.x + rect.w &&
            cr.right > rect.x &&
            cr.top < rect.y + rect.h &&
            cr.bottom > rect.y
          ) {
            const id = card.getAttribute('data-student-id');
            if (id) intersected.push(id);
          }
        });
        setSelectedStudentIds(intersected);
      }
    };

    const onGlobalMouseUp = () => {
      setIsDragging(false);
      dragStartPosRef.current = null;
      setDragRect(null);
    };

    window.addEventListener('mousedown', onGlobalMouseDown);
    if (isDragging) {
      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', onGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousedown', onGlobalMouseDown);
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isDragging, setSelectedStudentIds]);

  // 搜索 300ms 防抖
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 过滤 + 排序（有搜索词仅按姓名排序，无搜索词按机构→年级→姓名）
  const filtered = useMemo(() => {
    const list = filterStudents(students, searchTerm);
    return searchTerm ? sortStudentsByName(list) : sortStudentsByOrgGradeName(list);
  }, [students, searchTerm]);

  // 按机构分组
  const grouped = useMemo(() => groupStudentsByOrg(filtered), [filtered]);

  // 机构列布局（每列一个有序数组 = 瀑布流），localStorage 持久化，长按表头拖拽调整
  const [orgCols, setOrgCols] = useState<string[][]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORG_COLS_KEY) || 'null');
      if (Array.isArray(saved) && saved.every((col) => Array.isArray(col))) return saved;
    } catch {
      /* 忽略 */
    }
    // 迁移旧版平铺顺序（轮流分配转列数组）
    try {
      const old = JSON.parse(localStorage.getItem('studentOrgOrder') || '[]');
      if (Array.isArray(old)) {
        const cols: string[][] = [[], [], []];
        old.forEach((org, i) => {
          if (typeof org === 'string') cols[i % 3].push(org);
        });
        localStorage.removeItem('studentOrgOrder');
        return cols;
      }
    } catch {
      /* 忽略 */
    }
    return [];
  });

  // 列数随宽度自适应（窗口宽度断点：≥1300 三列 / ≥650 两列 / 其余单列）
  // 初始值直接按窗口宽度计算，避免与保存的布局列数不匹配导致加载时被重排覆盖
  const [numCols, setNumCols] = useState(() => {
    const w = window.innerWidth;
    return w >= 1300 ? 3 : w >= 650 ? 2 : 1;
  });
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1300) setNumCols(3);
      else if (w >= 650) setNumCols(2);
      else setNumCols(1);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // 机构增减/列数变化：列数对齐 + 新机构按长度（学生数）放入最短列，尽量平均每列长度
  useEffect(() => {
    // 搜索过滤期间不重排/不保存布局（避免覆盖用户自定义顺序）
    if (searchTerm) return;
    setOrgCols((prev) => {
      const present = new Set(grouped.keys());
      // 数据尚未加载完成（grouped 为空但已保存布局有内容）时保留布局，避免覆盖持久化数据
      if (!dataLoaded && present.size === 0 && prev.flat().length > 0) return prev;
      let cols: string[][];
      if (prev.length === numCols) {
        cols = prev.map((col) => col.filter((org) => present.has(org)));
      } else {
        // 列数变化：展平后按最短列重新分配（保持相对顺序）
        cols = Array.from({ length: numCols }, () => []);
        const heights = new Array(numCols).fill(0);
        prev
          .flat()
          .filter((org) => present.has(org))
          .forEach((org) => {
            const len = grouped.get(org)?.length ?? 0;
            const minIdx = heights.indexOf(Math.min(...heights));
            cols[minIdx].push(org);
            heights[minIdx] += len;
          });
      }
      // 新增机构：放入当前最短列
      const existing = new Set(cols.flat());
      const missing = Array.from(grouped.keys()).filter((org) => !existing.has(org));
      if (missing.length > 0) {
        const heights = cols.map((col) =>
          col.reduce((s, org) => s + (grouped.get(org)?.length ?? 0), 0),
        );
        missing.forEach((org) => {
          const len = grouped.get(org)?.length ?? 0;
          const minIdx = heights.indexOf(Math.min(...heights));
          cols[minIdx].push(org);
          heights[minIdx] += len;
        });
      }
      if (JSON.stringify(cols) === JSON.stringify(prev)) return prev;
      persistOrgCols(cols);
      return cols;
    });
  }, [grouped, numCols, searchTerm, dataLoaded]);

  // 渲染数据：每列机构分组（按列布局顺序；仅显示当前过滤后存在的机构，不影响 orgCols 完整布局数据）
  const columns = useMemo(
    () =>
      orgCols.map((col) =>
        col
          .filter((org) => grouped.has(org))
          .map((org) => ({ org, students: grouped.get(org) ?? [] })),
      ),
    [orgCols, grouped],
  );

  // 拖拽触发：按住表头 250ms（容差 30px，避免轻微抖动取消）或直接拖动 8px，任一满足即进入排序
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 30, distance: 8 },
    }),
  );

  // 当前被拖拽的机构（用于 DragOverlay 预览）
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  // 拖拽期间最新布局（onDragEnd 持久化用）+ FLIP 起点位置缓存
  const orgColsRef = useRef(orgCols);
  orgColsRef.current = orgCols;
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const draggingOrgRef = useRef(false);
  // 拖拽起始指针坐标（结合 delta 计算当前指针位置，用于精确插入判定）
  const dragStartPointerRef = useRef({ x: 0, y: 0 });

  // 捕获所有机构分组的当前屏幕位置
  const captureOrgRects = useCallback(() => {
    const map = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>('[data-org-sortable]').forEach((el) => {
      const org = el.dataset.orgSortable;
      if (org) map.set(org, el.getBoundingClientRect());
    });
    return map;
  }, []);

  // 拖拽开始：记录各分组初始位置（FLIP 起点）与指针起始坐标
  const handleOrgDragStart = (event: DragStartEvent) => {
    setActiveOrg(event.active.id as string);
    draggingOrgRef.current = true;
    prevRectsRef.current = captureOrgRects();
    const ev = event.activatorEvent as { clientX?: number; clientY?: number };
    dragStartPointerRef.current = { x: ev.clientX ?? 0, y: ev.clientY ?? 0 };
  };

  // 拖拽中：按指针坐标精确计算列内插入目标，实时移动（浏览器重排，不重叠、不抖动）
  const handleOrgDragOver = (event: DragOverEvent) => {
    const activeId = event.active.id as string;
    const pointerX = dragStartPointerRef.current.x + event.delta.x;
    const pointerY = dragStartPointerRef.current.y + event.delta.y;
    const target = findOrgInsertTarget(pointerX, pointerY, orgColsRef.current);
    if (!target) return;
    const next = moveOrgBetweenCols(orgColsRef.current, activeId, target.col, target.pos);
    if (!next) return;
    if (JSON.stringify(next) === JSON.stringify(orgColsRef.current)) return;
    orgColsRef.current = next;
    setOrgCols(next);
  };

  // 拖拽结束：持久化最终布局
  const handleOrgDragEnd = () => {
    setActiveOrg(null);
    draggingOrgRef.current = false;
    prevRectsRef.current = new Map();
    persistOrgCols(orgColsRef.current);
  };

  // 拖拽取消：清理状态并持久化（拖拽中布局已实时更新，取消也应保存）
  const handleOrgDragCancel = () => {
    setActiveOrg(null);
    draggingOrgRef.current = false;
    prevRectsRef.current = new Map();
    persistOrgCols(orgColsRef.current);
  };

  // FLIP 动画：机构顺序变化时，各分组从旧位置平滑位移到新位置（仅位移、不变尺寸、不重叠）
  useLayoutEffect(() => {
    if (!draggingOrgRef.current || prevRectsRef.current.size === 0) return;
    // 先清除上一次 FLIP 残留 transform，测量真实重排位置
    document.querySelectorAll<HTMLElement>('[data-org-sortable]').forEach((el) => {
      el.style.transition = 'none';
      el.style.transform = '';
    });
    const next = captureOrgRects();
    next.forEach((rect, org) => {
      const prev = prevRectsRef.current.get(org);
      if (!prev) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (dx === 0 && dy === 0) return;
      const el = document.querySelector<HTMLElement>(
        `[data-org-sortable=${JSON.stringify(org)}]`,
      );
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.25s ease';
        el.style.transform = '';
      });
    });
    prevRectsRef.current = next;
  }, [orgCols, captureOrgRects]);

  // 选择
  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (dragOccurredRef.current) {
      dragOccurredRef.current = false;
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedStudentIds(
        selectedStudentIds.includes(id)
          ? selectedStudentIds.filter((x) => x !== id)
          : [...selectedStudentIds, id],
      );
    } else {
      setSelectedStudentIds([id]);
    }
  };

  // 拖拽框选（从卡片/行上按下鼠标启动）
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    // Ctrl+click 不启动拖拽，由 click 处理切换
    if (e.ctrlKey || e.metaKey) return;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragOccurredRef.current = false;
    setIsDragging(true);
  };

  // FAB 类型
  const fabType: FabType =
    selectedStudentIds.length === 0
      ? null
      : selectedStudentIds.length === 1
      ? 'student'
      : 'multi-student';

  const handleEdit = () => {
    if (selectedStudentIds.length === 1) {
      const s = students.find((x) => x.id === selectedStudentIds[0]);
      if (s) setFormModal({ open: true, editStudent: s });
    } else if (selectedStudentIds.length > 1) {
      setBatchOrg('');
      setBatchGrade('');
      setBatchFee('');
      setBatchDuration('');
      setBatchEditOpen(true);
    }
  };

  const handleDelete = () => {
    const count = selectedStudentIds.length;
    const deletedStudents = students.filter((s) => selectedStudentIds.includes(s.id));
    // 关联课程：包含任一被删学生的课程也将删除
    const affectedCourses = courses.filter((c) =>
      Array.isArray(c.studentIds) && c.studentIds.some((sid) => selectedStudentIds.includes(sid)),
    );

    const msg =
      count === 1
        ? `删除学生「${deletedStudents[0]?.name || ''}」后，相关的 ${affectedCourses.length} 节课也将全部删除。`
        : `删除 ${count} 位学生后，相关的 ${affectedCourses.length} 节课也将全部删除。`;

    setConfirm({
      open: true,
      message: msg,
      type: 'delete',
      onConfirm: () => {
        // 级联删除关联课程
        const deleteCourseIds = new Set(affectedCourses.map((c) => c.id));
        useStore.getState().mutateData((draft) => {
          draft.courses = draft.courses.filter((c) => !deleteCourseIds.has(c.id));
          draft.students = draft.students.filter((s) => !selectedStudentIds.includes(s.id));
        });
        recordBatchDeleteStudents(deletedStudents, affectedCourses);
        toast.success(`已删除 ${count} 名学生`);
        setSelectedStudentIds([]);
        setConfirm((c) => ({ ...c, open: false }));
      },
    });
  };

  // 批量编辑提交
  const handleBatchEditSubmit = () => {
    const patch: { organization?: string; grade?: string; fees?: Partial<StudentFees> } = {};
    if (batchOrg) patch.organization = batchOrg;
    if (batchGrade) patch.grade = batchGrade;
    const fees: Partial<StudentFees> = {};
    if (batchFee !== '') fees['一对一'] = parseFloat(batchFee) || 0;
    if (batchDuration !== '') fees['一对一_duration'] = parseInt(batchDuration) || 120;
    if (Object.keys(fees).length > 0) patch.fees = fees;

    if (Object.keys(patch).length === 0) {
      toast.warning('请至少修改一项');
      return;
    }
    const beforeStudents = students.filter((s) => selectedStudentIds.includes(s.id));
    const beforeCourses = courses.filter((c) =>
      (c.studentIds || []).some((sid) => selectedStudentIds.includes(sid)),
    );
    batchUpdateStudents(selectedStudentIds, patch);
    const st = useStore.getState();
    const afterStudents = st.students.filter((s) => selectedStudentIds.includes(s.id));
    const afterCourses = st.courses.filter((c) =>
      (c.studentIds || []).some((sid) => selectedStudentIds.includes(sid)),
    );
    recordBatchUpdateStudents(beforeStudents, afterStudents, beforeCourses, afterCourses);
    toast.success(`已批量更新 ${selectedStudentIds.length} 名学生`);
    setBatchEditOpen(false);
    setSelectedStudentIds([]);
  };

  // 渲染学生卡片（多列）
  const renderCard = (student: Student) => {
    const isSelected = selectedStudentIds.includes(student.id);
    const gradeColor = generateColor(student.grade || '未设置', 'grade');
    const fee = student.fees?.['一对一'] ?? 0;
    const duration = student.fees?.['一对一_duration'] ?? 120;
    return (
      <div
        key={student.id}
        className={`student-card ${isSelected ? 'student-card-selected' : ''}`}
        onClick={(e) => handleSelect(student.id, e)}
      >
        <span className="student-card-name truncate">{student.name || '未命名'}</span>
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full justify-self-start truncate"
          style={{
            backgroundColor: `color-mix(in srgb, ${gradeColor} 20%, transparent)`,
            color: gradeColor,
          }}
        >
          {student.grade || '未设置'}
        </span>
        <span className="student-card-fee justify-self-start truncate">
          {Math.round(fee)}元/{duration}分钟
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4 select-none">
      {/* 顶部工具栏：移动端纵向（标题独占一行），桌面端横向 */}
      <div className="flex flex-col gap-3 desktop:flex-row desktop:items-end desktop:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-700">
            学生管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {students.length} 名学生 · {organizations.length} 个机构 · {grades.length} 个年级
          </p>
        </div>
        {/* 移动端按钮组（桌面端隐藏，桌面端按钮移至搜索框同行） */}
        <div className="flex items-center gap-2 shrink-0 desktop:hidden">
          <button
            onClick={() => setMgmtModal({ open: true, type: 'organization' })}
            className="btn-secondary"
          >
            <School className="w-4 h-4" />
            <span className="hidden desktop:inline">机构管理</span>
            <span className="desktop:hidden">机构</span>
          </button>
          <button
            onClick={() => setMgmtModal({ open: true, type: 'grade' })}
            className="btn-secondary"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden desktop:inline">年级管理</span>
            <span className="desktop:hidden">年级</span>
          </button>
          <button onClick={handleOpenUpgrade} className="btn-secondary">
            <Rocket className="w-4 h-4" />
            <span className="hidden desktop:inline">年级升级</span>
            <span className="desktop:hidden">升级</span>
          </button>
          <button onClick={() => setFormModal({ open: true, editStudent: null })} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden desktop:inline">添加学生</span>
            <span className="desktop:hidden">新增</span>
          </button>
        </div>
      </div>

      {/* 搜索 + 桌面端操作按钮同行 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field pl-9"
            placeholder="搜索学生姓名或机构"
          />
        </div>
        {/* 桌面端按钮组（移动端隐藏，靠右） */}
        <div className="hidden desktop:flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={() => setMgmtModal({ open: true, type: 'organization' })}
            className="btn-secondary"
          >
            <School className="w-4 h-4" />
            机构管理
          </button>
          <button
            onClick={() => setMgmtModal({ open: true, type: 'grade' })}
            className="btn-secondary"
          >
            <GraduationCap className="w-4 h-4" />
            年级管理
          </button>
          <button onClick={handleOpenUpgrade} className="btn-secondary">
            <Rocket className="w-4 h-4" />
            年级升级
          </button>
          <button onClick={() => setFormModal({ open: true, editStudent: null })} className="btn-primary">
            <Plus className="w-4 h-4" />
            添加学生
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-ink-50 flex items-center justify-center mx-auto mb-4">
            <UserRoundX className="w-7 h-7 text-ink-300" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-700 mb-1">
            {searchTerm ? '未找到匹配学生' : '暂无学生信息'}
          </h3>
          <p className="text-sm text-gray-500">
            {searchTerm ? '尝试修改搜索条件' : '点击"添加学生"开始管理'}
          </p>
        </div>
      ) : (
        /* 机构分组瀑布流：长按表头拖拽排序（被拖组浮起预览，拖拽中实时重排，FLIP 平滑过渡） */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleOrgDragStart}
          onDragOver={handleOrgDragOver}
          onDragEnd={handleOrgDragEnd}
          onDragCancel={handleOrgDragCancel}
        >
          <SortableContext
            items={orgCols.flat().filter((org) => grouped.has(org))}
            strategy={rectSortingStrategy}
          >
            <div ref={gridRef} className="flex gap-4 items-start">
              {Array.from({ length: numCols }, (_, colIdx) => (
                <OrgColumn
                  key={colIdx}
                  colIdx={colIdx}
                  items={columns[colIdx] ?? []}
                  onCardMouseDown={handleDragStart}
                  renderCard={renderCard}
                  disabled={!!searchTerm}
                />
              ))}
            </div>
          </SortableContext>
          {/* 拖拽浮起预览：尺寸固定不变形 */}
          <DragOverlay>
            {activeOrg ? (
              <OrgPreview
                org={activeOrg}
                students={grouped.get(activeOrg) ?? []}
                renderCard={renderCard}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 浮动操作栏 */}
      <FloatingActionBar
        type={fabType}
        count={selectedStudentIds.length}
        onEdit={selectedStudentIds.length >= 1 ? handleEdit : undefined}
        onDelete={selectedStudentIds.length > 0 ? handleDelete : undefined}
        onClear={() => setSelectedStudentIds([])}
      />

      {/* 学生表单模态框 */}
      <StudentFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, editStudent: null })}
        editStudent={formModal.editStudent}
      />

      {/* 机构/年级管理模态框 */}
      <ManagementModal
        open={mgmtModal.open}
        onClose={() => setMgmtModal({ open: false, type: 'organization' })}
        type={mgmtModal.type}
      />

      {/* 年级升级模态框（创建 / 确认模式） */}
      <UpgradeModal
        open={upgradeModal.open}
        mode={upgradeModal.mode}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
      />

      {/* 批量编辑模态框 */}
      <Modal
        open={batchEditOpen}
        onClose={() => setBatchEditOpen(false)}
        title={`批量编辑 ${selectedStudentIds.length} 名学生`}
        footer={
          <>
            <button onClick={() => setBatchEditOpen(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleBatchEditSubmit} className="btn-primary">
              保存
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* 学生姓名（只读展示，不可修改） */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">学生姓名</label>
            <input
              type="text"
              value={students.filter((s) => selectedStudentIds.includes(s.id)).map((s) => s.name).join('、')}
              readOnly
              className="input-field opacity-60"
            />
          </div>
          {/* 机构 + 年级（并排一行，与单个编辑一致） */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1.5">机构</label>
              <CustomSelect
                value={batchOrg}
                options={[{ value: '', label: '不改' }, ...organizations.map((org) => ({ value: org, label: org }))]}
                onChange={(v) => setBatchOrg(v as string)}
                className="w-full"
                triggerClassName="py-2 w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1.5">年级</label>
              <CustomSelect
                value={batchGrade}
                options={[{ value: '', label: '不改' }, ...grades.map((g) => ({ value: g, label: g }))]}
                onChange={(v) => setBatchGrade(v as string)}
                className="w-full"
                triggerClassName="py-2 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">预设课时费</label>
              <input
                type="number"
                value={batchFee}
                onChange={(e) => setBatchFee(e.target.value)}
                className="input-field"
                placeholder="不改"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">基础时长(分钟)</label>
              <input
                type="number"
                value={batchDuration}
                onChange={(e) => setBatchDuration(e.target.value)}
                className="input-field"
                placeholder="不改"
              />
            </div>
          </div>
        </div>
      </Modal>

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

/**
 * 机构列容器：固定渲染（空列也可放置），整列是可放置目标（拖入按指针位置插入列内）
 */
function OrgColumn({
  colIdx,
  items,
  onCardMouseDown,
  renderCard,
  disabled,
}: {
  colIdx: number;
  items: { org: string; students: Student[] }[];
  onCardMouseDown: (e: React.MouseEvent) => void;
  renderCard: (s: Student) => React.ReactNode;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ORG_COL_PREFIX}${colIdx}` });
  return (
    <div
      ref={setNodeRef}
      data-org-col={colIdx}
      className={`org-col ${isOver ? 'org-col-over' : ''} ${items.length === 0 ? 'org-col-empty' : ''}`}
    >
      {items.map(({ org, students }) => (
        <SortableOrgGroup
          key={org}
          org={org}
          students={students}
          onCardMouseDown={onCardMouseDown}
          renderCard={renderCard}
          disabled={disabled}
        />
      ))}
      {items.length === 0 && <div className="org-col-placeholder">拖拽分组放置到此列</div>}
    </div>
  );
}

/**
 * 可排序机构分组组件
 * 长按表头（左键按住 250ms）进入拖拽；拖拽期间由父级实时重排 DOM + FLIP 动画（不用 dnd-kit 让位 transform）
 */
function SortableOrgGroup({
  org,
  students,
  onCardMouseDown,
  renderCard,
  disabled,
}: {
  org: string;
  students: Student[];
  onCardMouseDown: (e: React.MouseEvent) => void;
  renderCard: (s: Student) => React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: org, disabled });
  const orgColor = generateColor(org, 'organization');
  return (
    <div
      ref={setNodeRef}
      data-org-sortable={org}
      className="student-org-group"
      style={{ opacity: isDragging ? 0 : undefined }}
    >
      <div
        className="student-org-group-header"
        style={{ cursor: 'grab', touchAction: 'none' }}
        title="长按拖动排序"
        {...attributes}
        {...listeners}
      >
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${orgColor} 20%, transparent)`,
            color: orgColor,
          }}
        >
          {org}
        </span>
        <span className="text-xs text-gray-400">{students.length} 人</span>
      </div>
      <div className="student-org-group-body">
        {students.map((s) => (
          <div key={s.id} data-student-id={s.id} onMouseDown={onCardMouseDown}>
            {renderCard(s)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 拖拽浮起预览（DragOverlay 内容）：尺寸固定，不随排序变换变形
 */
function OrgPreview({
  org,
  students,
  renderCard,
}: {
  org: string;
  students: Student[];
  renderCard: (s: Student) => React.ReactNode;
}) {
  const orgColor = generateColor(org, 'organization');
  return (
    <div
      className="student-org-group"
      style={{
        boxShadow: '0 16px 40px rgba(15, 61, 46, 0.3)',
        outline: '2px solid var(--color-primary)',
      }}
    >
      <div className="student-org-group-header">
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${orgColor} 20%, transparent)`,
            color: orgColor,
          }}
        >
          {org}
        </span>
        <span className="text-xs text-gray-400">{students.length} 人</span>
      </div>
      <div className="student-org-group-body">
        {students.map((s) => (
          <div key={s.id}>{renderCard(s)}</div>
        ))}
      </div>
    </div>
  );
}
