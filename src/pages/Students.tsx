/**
 * 学生管理页面
 *
 * 重写自课表 listRenderService.js + eventHandlerService.js
 * 单列/双列/三列布局 + 搜索防抖 + 虚拟滚动 + 多选 + 浮动操作栏
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import CustomSelect from '@/components/CustomSelect';
import FloatingActionBar, { type FabType } from '@/components/FloatingActionBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import StudentFormModal from '@/modals/StudentFormModal';
import ManagementModal from '@/modals/ManagementModal';
import {
  filterStudents,
  sortStudentsByOrgGradeName,
  sortStudentsByName,
  groupStudentsByOrg,
  batchUpdateStudents,
} from '@/lib/student';
import { generateColor } from '@/lib/utils';
import { recordDeleteStudent, recordBatchDeleteStudents } from '@/lib/history';
import type { Student, StudentFees } from '@/lib/types';
import {
  Plus,
  Search,
  School,
  GraduationCap,
  UserRoundX,
  LayoutGrid,
} from 'lucide-react';

type LayoutMode = 'single' | 'double' | 'triple';
const LAYOUT_KEY = 'studentListLayout';
const VALID_LAYOUTS: LayoutMode[] = ['single', 'double', 'triple'];

function loadLayout(): LayoutMode {
  const saved = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null;
  return saved && VALID_LAYOUTS.includes(saved) ? saved : 'single';
}

export default function Students() {
  const students = useStore((s) => s.students);
  const courses = useStore((s) => s.courses);
  const organizations = useStore((s) => s.organizations);
  const grades = useStore((s) => s.grades);
  const selectedStudentIds = useStore((s) => s.selectedStudentIds);
  const setSelectedStudentIds = useStore((s) => s.setSelectedStudentIds);
  const toast = useToast();

  const [layout, setLayout] = useState<LayoutMode>(loadLayout);
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
      // 点击交互元素/FAB/模态框：不启动拖拽
      if (target.closest('button, input, select, textarea, .modal-overlay, .floating-action-bar')) return;
      // 点击学生行/卡片：由行的 onMouseDown 处理
      if (target.closest('.student-table-row, .student-card')) return;
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

  // 按机构分组（多列布局）
  const grouped = useMemo(() => groupStudentsByOrg(filtered), [filtered]);

  // 虚拟滚动（单列且 >50 条）
  const parentRef = useRef<HTMLDivElement>(null);
  const enableVirtual = layout === 'single' && filtered.length > 50;
  const virtualizer = useVirtualizer({
    count: enableVirtual ? filtered.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // 布局切换
  const cycleLayout = () => {
    const next: LayoutMode =
      layout === 'single' ? 'double' : layout === 'double' ? 'triple' : 'single';
    setLayout(next);
    localStorage.setItem(LAYOUT_KEY, next);
  };

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
        ? `删除学生「${deletedStudents[0]?.name || ''}」后，相关的 ${affectedCourses.length} 节课也将全部删除`
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
    batchUpdateStudents(selectedStudentIds, patch);
    toast.success(`已批量更新 ${selectedStudentIds.length} 名学生`);
    setBatchEditOpen(false);
    setSelectedStudentIds([]);
  };

  // 渲染单行（表格行）
  const renderRow = (student: Student) => {
    const isSelected = selectedStudentIds.includes(student.id);
    const orgColor = generateColor(student.organization || '未分配', 'organization');
    const gradeColor = generateColor(student.grade || '未设置', 'grade');
    const fee = student.fees?.['一对一'] ?? 0;
    const duration = student.fees?.['一对一_duration'] ?? 120;
    return (
      <div
        className={`student-table-row flex items-center gap-3 px-6 ${
          isSelected ? 'student-row-selected' : ''
        }`}
        style={{ height: 80, boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}
        onClick={(e) => handleSelect(student.id, e)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {student.name || '未命名'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${orgColor} 20%, transparent)`,
              color: orgColor,
            }}
          >
            {student.organization || '未分配'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${gradeColor} 20%, transparent)`,
              color: gradeColor,
            }}
          >
            {student.grade || '未设置'}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-sm text-gray-500">
          {Math.round(fee)}元/{duration}分钟
        </div>
      </div>
    );
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
          className="px-2 py-0.5 text-xs font-medium rounded-full justify-self-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${gradeColor} 20%, transparent)`,
            color: gradeColor,
          }}
        >
          {student.grade || '未设置'}
        </span>
        <span className="student-card-fee justify-self-center">
          {Math.round(fee)}元/{duration}分钟
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4 select-none">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-700">
            学生管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {students.length} 名学生 · {organizations.length} 个机构 · {grades.length} 个年级
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <button onClick={() => setFormModal({ open: true, editStudent: null })} className="btn-primary">
            <Plus className="w-4 h-4" />
            添加学生
          </button>
        </div>
      </div>

      {/* 搜索 + 布局切换 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field pl-9"
            placeholder="搜索学生姓名或机构"
          />
        </div>
        <button
          onClick={cycleLayout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 border border-ink-200 hover:bg-[var(--bg-content)] transition-colors"
          title="切换布局"
        >
          <LayoutGrid className="w-4 h-4" />
          {layout === 'single' ? '1 列' : layout === 'double' ? '2 列' : '3 列'}
        </button>
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
      ) : layout === 'single' ? (
        /* 单列表格 */
        <div className="card overflow-hidden">
          {/* 表头 */}
          <div className="flex items-center gap-3 px-6 py-3 bg-[var(--bg-content)] border-b border-ink-100 text-xs font-medium text-gray-500">
            <div className="flex-1">姓名</div>
            <div className="flex-1">机构</div>
            <div className="flex-1">年级</div>
            <div className="flex-1">课时费</div>
          </div>
          {enableVirtual ? (
            <div ref={parentRef} className="max-h-[70vh] overflow-y-auto">
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((vi) => (
                  <div
                    key={filtered[vi.index].id}
                    data-student-id={filtered[vi.index].id}
                    onMouseDown={handleDragStart}
                    style={{
                      position: 'absolute',
                      top: vi.start,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                    }}
                  >
                    {renderRow(filtered[vi.index])}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  data-student-id={s.id}
                  onMouseDown={handleDragStart}
                >
                  {renderRow(s)}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 多列卡片网格（按机构分组） */
        <div className={`students-grid ${layout === 'triple' ? 'cols-3' : 'cols-2'}`}>
          {Array.from(grouped.entries()).map(([org, orgStudents]) => {
            const orgColor = generateColor(org, 'organization');
            return (
              <div key={org} className="student-org-group">
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
                  <span className="text-xs text-gray-400">
                    {orgStudents.length} 人
                  </span>
                </div>
                <div
                  className="student-org-group-body"
                >
                  {orgStudents.map((s) => (
                    <div
                      key={s.id}
                      data-student-id={s.id}
                      onMouseDown={handleDragStart}
                    >
                      {renderCard(s)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
              应用
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            留空的字段保持不变
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">机构</label>
            <CustomSelect
              value={batchOrg}
              options={[{ value: '', label: '不改' }, ...organizations.map((org) => ({ value: org, label: org }))]}
              onChange={(v) => setBatchOrg(v as string)}
              className="w-full"
              triggerClassName="py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">年级</label>
            <CustomSelect
              value={batchGrade}
              options={[{ value: '', label: '不改' }, ...grades.map((g) => ({ value: g, label: g }))]}
              onChange={(v) => setBatchGrade(v as string)}
              className="w-full"
              triggerClassName="py-2 w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">一对一课时费</label>
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
