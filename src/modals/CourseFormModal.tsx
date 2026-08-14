/**
 * 课程表单模态框
 *
 * 重写自课表 courseFormTemplate.js + courseFormEvents.js
 * 添加/编辑课程：日期/课型/学生选择/费用/时间/备注
 */
import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/Modal';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import ComboBox from '@/components/ComboBox';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import type { Course, Student, LessonType } from '@/lib/types';
import {
  createCourseObject,
  addCourse,
  updateCourse,
  calculateOneOnOneFee,
  sortStudents,
  checkMultiStudentSelection,
  type PasteConflict,
} from '@/lib/course';
import { findConflictingCourses } from '@/lib/conflict';
import { calculateEndTimeFromDuration, generateColor, generateId } from '@/lib/utils';
import { recordAddCourse, recordBatchAddCourses, recordUpdateCourse } from '@/lib/history';

interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  /** 批量添加时的全部目标日期（单日时为 [date]） */
  dates?: string[];
  editCourse?: Course | null;
  /** 冲突回调：conflicts 为冲突课程，added 为批量添加中无冲突的课程（解决后一并添加） */
  onConflict?: (conflicts: PasteConflict[], added: Course[]) => void;
}

const DURATION_OPTIONS = [60, 90, 120];

export default function CourseFormModal({
  open,
  onClose,
  date,
  dates,
  editCourse,
  onConflict,
}: CourseFormModalProps) {
  const students = useStore((s) => s.students);
  const courses = useStore((s) => s.courses);
  const toast = useToast();
  const isEdit = !!editCourse;
  // 批量添加：非编辑模式且 dates 长度 > 1
  const isBatchAdd = !isEdit && (dates?.length ?? 0) > 1;
  const batchDates = isBatchAdd ? dates! : [];

  // 表单状态
  const [formDate, setFormDate] = useState(date);
  const [lessonType, setLessonType] = useState<LessonType>('一对一');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState(120);
  const [fee, setFee] = useState<number>(0);
  // 冻结课程手动输入值：学生姓名（多个用空格/逗号/顿号分隔）、机构、年级
  const [manualNames, setManualNames] = useState('');
  const [manualOrg, setManualOrg] = useState('');
  const [manualGrade, setManualGrade] = useState('');
  // 冻结课程提交前的同名关联询问：linkableNames 为存在同名学生的姓名，submit 决定是否关联后继续提交
  const [linkConfirm, setLinkConfirm] = useState<{
    linkableNames: string[];
    submit: (link: boolean) => void;
  } | null>(null);

  // 是否为冻结课程编辑：进入手动输入模式，可纠错冻结数据
  const isFrozenEdit = isEdit && !!editCourse?.frozen;

  // 初始化/重置表单
  useEffect(() => {
    if (!open) return;
    if (editCourse) {
      setFormDate(editCourse.date);
      setLessonType(editCourse.lessonType);
      setSelectedStudentIds(editCourse.studentIds || []);
      setStartTime(editCourse.startTime);
      setDuration(editCourse.duration);
      setFee(editCourse.fees[0] ?? 0);
      setManualNames((editCourse.studentNames || []).join('、'));
      setManualOrg(editCourse.organizations?.[0] ?? '');
      setManualGrade(editCourse.grades?.[0] ?? '');
    } else {
      setFormDate(date);
      setLessonType('一对一');
      setSelectedStudentIds([]);
      setStartTime('08:00');
      setDuration(120);
      setFee(0);
      setManualNames('');
      setManualOrg('');
      setManualGrade('');
    }
  }, [open, editCourse, date]);

  // 排序后的学生列表
  const sortedStudents = useMemo(() => sortStudents(students), [students]);

  // 结束时间（自动计算，上限 24:00 即显示为 00:00）
  const endTime = calculateEndTimeFromDuration(startTime, duration);

  // 开始时间 + 时长超过 24:00 时，自动将时长截断为当天剩余时间，以便正确计算费用
  useEffect(() => {
    const parts = startTime.split(':');
    if (parts.length < 2) return;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return;
    const startMins = h * 60 + m;
    if (startMins + duration > 24 * 60) {
      setDuration(24 * 60 - startMins);
    }
  }, [startTime, duration]);

  // 一对一费用自动计算
  useEffect(() => {
    // 冻结课程：费用手动输入，不自动重算
    if (editCourse?.frozen) return;
    if (lessonType === '一对一' && selectedStudentIds.length > 0) {
      const student = students.find((s) => s.id === selectedStudentIds[0]);
      if (student) {
        setFee(calculateOneOnOneFee(student, duration));
      }
    }
  }, [lessonType, selectedStudentIds, duration, students]);

  // 学生选择
  const toggleStudent = (student: Student) => {
    if (lessonType === '一对一') {
      setSelectedStudentIds([student.id]);
    } else {
      // 多人课：检查同机构同年级
      const selected = students.filter((s) => selectedStudentIds.includes(s.id));
      if (!selectedStudentIds.includes(student.id)) {
        const { organizationMatch, gradeMatch } = checkMultiStudentSelection(selected, student);
        if (!organizationMatch) {
          toast.warning('多人课只能选择同一机构的学生');
          return;
        }
        if (!gradeMatch) {
          toast.warning('多人课只能选择同一年级的学生');
          return;
        }
      }
      setSelectedStudentIds((prev) =>
        prev.includes(student.id)
          ? prev.filter((id) => id !== student.id)
          : [...prev, student.id],
      );
    }
  };

  // 所选学生的机构/年级汇总（去重展示，仅用于只读展示）
  const selectedStudentsInfo = useMemo(() => {
    const sel = students.filter((s) => selectedStudentIds.includes(s.id));
    const orgs = [...new Set(sel.map((s) => s.organization).filter(Boolean))];
    const grades = [...new Set(sel.map((s) => s.grade).filter(Boolean))];
    return {
      orgs: orgs.join('、'),
      grades: grades.join('、'),
    };
  }, [students, selectedStudentIds]);

  // 提交表单（支持单日/批量多日添加）
  const handleSubmit = () => {
    // 冻结课程编辑：手动输入模式，不校验学生选择
    if (!isFrozenEdit && selectedStudentIds.length === 0) {
      toast.warning('请选择学生');
      return;
    }
    if (!startTime) {
      toast.warning('请选择开始时间');
      return;
    }

    const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

    // 批量添加：为每个日期创建课程，检查冲突
    if (isBatchAdd) {
      const coursesToAdd: Course[] = [];
      const conflicts: PasteConflict[] = [];

      batchDates.forEach((d) => {
        const courseData = createCourseObject(
          {
            date: d,
            lessonType,
            startTime,
            duration,
            studentIds: selectedStudentIds,
            fees: lessonType === '一对一' ? undefined : [fee],
          },
          selectedStudents,
        );

        // 检查与已有课程的冲突（排除自身，但批量添加都是新的）
        const targetDateCourses = courses.filter((c) => c.date === d);
        const conflictingCourses = findConflictingCourses(courseData, targetDateCourses);

        if (conflictingCourses.length > 0) {
          conflicts.push({ newCourse: courseData, conflictingCourses });
        } else {
          // 检查与已加入队列的课程冲突（同日期）
          const hasQueueConflict = coursesToAdd.some(
            (added) => added.date === d && findConflictingCourses(courseData, [added]).length > 0,
          );
          if (!hasQueueConflict) {
            coursesToAdd.push(courseData);
          }
        }
      });

      if (conflicts.length > 0 && onConflict) {
        // 无冲突的课程随回调一并传递，由冲突解决流程统一提交，避免被静默丢弃
        onConflict(conflicts, coursesToAdd);
        return;
      }

      // 无冲突：批量添加
      if (coursesToAdd.length > 0) {
        useStore.getState().mutateData((draft) => {
          draft.courses.push(...coursesToAdd);
        });
        recordBatchAddCourses(coursesToAdd);
        toast.success(`批量添加 ${coursesToAdd.length} 节课程成功`);
      }
      onClose();
      return;
    }

    // 冻结课程编辑：所有字段手动输入，更新冻结课程（纠错冻结数据）
    if (isFrozenEdit) {
      if (!formDate) {
        toast.warning('请选择日期');
        return;
      }
      if (!startTime) {
        toast.warning('请选择开始时间');
        return;
      }
      const names = manualNames
        .split(/[\s,，、]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 0) {
        toast.warning('请输入学生姓名');
        return;
      }
      if (lessonType === '一对一' && names.length > 1) {
        toast.warning('一对一课程只能输入一位学生姓名');
        return;
      }

      // 提交动作：link 为 true 时，同名学生复用其 ID（统计并入现有学生）；否则使用虚拟 ID（统计独立）
      const doSubmit = (link: boolean) => {
        const count = names.length;
        const frozenId = isEdit && editCourse ? editCourse.id : generateId();
        const now = new Date().toISOString();
        const studentIds = names.map((name, idx) => {
          const matched = link ? students.find((s) => s.name === name) : undefined;
          return matched ? matched.id : `frozen:${frozenId}:${idx}`;
        });
        const frozenCourse: Course = {
          id: frozenId,
          date: formDate,
          lessonType,
          startTime,
          duration,
          fees: Array(count).fill(fee),
          studentIds,
          studentNames: names,
          organizations: Array(count).fill(manualOrg),
          grades: Array(count).fill(manualGrade),
          colors: names.map(() => generateColor(manualOrg || '未分配', 'organization')),
          frozen: true,
          createdAt: isEdit && editCourse ? editCourse.createdAt : now,
          updatedAt: now,
        };

        // 检查冲突
        const otherCourses = courses.filter((c) => c.id !== frozenCourse.id);
        const conflicts = findConflictingCourses(frozenCourse, otherCourses);
        if (conflicts.length > 0 && onConflict) {
          onConflict([{ newCourse: frozenCourse, conflictingCourses: conflicts }], []);
          return;
        }

        if (isEdit && editCourse) {
          updateCourse(frozenCourse);
          recordUpdateCourse(editCourse, frozenCourse);
          toast.success('课程已更新');
        } else {
          addCourse(frozenCourse);
          recordAddCourse(frozenCourse);
          toast.success('课程已添加');
        }
        onClose();
      };

      // 存在同名学生时先询问是否关联到现有学生（减少统计人数虚增）
      const linkable = [...new Set(names.filter((n) => students.some((s) => s.name === n)))];
      if (linkable.length > 0) {
        setLinkConfirm({ linkableNames: linkable, submit: doSubmit });
        return;
      }
      doSubmit(false);
      return;
    }

    // 单日添加/编辑
    if (!formDate) {
      toast.warning('请选择日期');
      return;
    }

    const courseData = createCourseObject(
      {
        date: formDate,
        lessonType,
        startTime,
        duration,
        studentIds: selectedStudentIds,
        fees: lessonType === '一对一' ? undefined : [fee],
      },
      selectedStudents,
    );

    if (isEdit && editCourse) {
      courseData.id = editCourse.id;
      courseData.createdAt = editCourse.createdAt;
    }

    // 检查冲突
    const otherCourses = courses.filter((c) => c.id !== courseData.id);
    const conflicts = findConflictingCourses(courseData, otherCourses);

    if (conflicts.length > 0 && onConflict) {
      onConflict([{ newCourse: courseData, conflictingCourses: conflicts }], []);
      return;
    }

    // 无冲突：直接添加/更新
    if (isEdit) {
      updateCourse(courseData);
      recordUpdateCourse(editCourse!, courseData);
      toast.success('课程已更新');
    } else {
      addCourse(courseData);
      recordAddCourse(courseData);
      toast.success('课程已添加');
    }
    onClose();
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={isFrozenEdit ? '冻结课程（纠错）' : isEdit ? '编辑课程' : isBatchAdd ? `批量添加课程（${batchDates.length}天）` : '添加课程'}
      width="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            {isEdit ? '保存' : isBatchAdd ? `批量添加` : '添加'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 日期 / 批量日期 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            {isBatchAdd ? `批量添加到 ${batchDates.length} 个日期` : '日期'}
          </label>
          {isBatchAdd ? (
            <div className="px-3 py-2 rounded-lg border border-ink-200 bg-[var(--bg-content)] text-sm text-gray-600 max-h-24 overflow-y-auto">
              {[...batchDates].sort().map((d) => (
                <span key={d} className="inline-block mr-2 mb-1 px-2 py-0.5 rounded bg-ink-100 text-ink-700 text-xs">
                  {d}
                </span>
              ))}
            </div>
          ) : (
            <DatePicker value={formDate} onChange={setFormDate} className="w-full" />
          )}
        </div>

        {/* 课型 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">课型</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-content)] rounded-lg border border-ink-200">
            {(['一对一', '多人课'] as LessonType[]).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => {
                  setLessonType(lt);
                  setSelectedStudentIds([]);
                }}
                className={`py-2 rounded-md text-sm font-medium transition-all ${
                  lessonType === lt
                    ? 'bg-ink-200 text-ink-700 font-medium shadow-sm'
                    : 'text-gray-500 hover:text-ink-700 hover:bg-ink-50'
                }`}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

        {/* 学生（冻结模式：手动输入姓名；普通模式：点击选择） */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            {isFrozenEdit
              ? lessonType === '一对一'
                ? '学生姓名（仅一位）'
                : '学生姓名（多位，用空格、逗号或顿号分隔）'
              : lessonType === '一对一'
              ? '点击选择一位学生'
              : '点击可选多位学生（同机构同年级）'}
          </label>
          {isFrozenEdit ? (
            <input
              value={manualNames}
              onChange={(e) => setManualNames(e.target.value)}
              placeholder={lessonType === '一对一' ? '输入学生姓名' : '如：张三、李四、王五'}
              className="input-field"
            />
          ) : sortedStudents.length === 0 ? (
            <div className="text-sm p-3 border rounded-md text-gray-400 border-ink-200 bg-[var(--bg-content)]">
              暂无学生，请先添加学生
            </div>
          ) : (
            <div className="border rounded-md p-3 max-h-32 overflow-y-auto border-ink-200 bg-[var(--bg-content)]">
              <div className="flex flex-wrap gap-2">
                {sortedStudents.map((student) => {
                  const color = generateColor(student.organization);
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student)}
                      className="px-3 py-1 rounded-full text-sm border-2 transition-all duration-200"
                      style={{
                        borderColor: color,
                        color: isSelected ? '#fff' : color,
                        backgroundColor: isSelected ? color : 'transparent',
                      }}
                    >
                      {student.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 所选学生的机构/年级（普通课程只读展示；冻结模式手动输入） */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">机构</label>
            <input
              value={isFrozenEdit ? manualOrg : selectedStudentsInfo.orgs}
              onChange={(e) => setManualOrg(e.target.value)}
              disabled={!isFrozenEdit}
              placeholder="未设置"
              className={`input-field ${
                !isFrozenEdit ? 'bg-[var(--bg-content)] cursor-default opacity-70 border border-ink-200' : ''
              }`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">年级</label>
            <input
              value={isFrozenEdit ? manualGrade : selectedStudentsInfo.grades}
              onChange={(e) => setManualGrade(e.target.value)}
              disabled={!isFrozenEdit}
              placeholder="未设置"
              className={`input-field ${
                !isFrozenEdit ? 'bg-[var(--bg-content)] cursor-default opacity-70 border border-ink-200' : ''
              }`}
            />
          </div>
        </div>

        {/* 时间 + 费用：开始时间+时长一行，结束时间+课时费一行（双端统一） */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">开始时间</label>
            <TimePicker value={startTime} onChange={setStartTime} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">时长(分钟)</label>
            <ComboBox
              value={duration}
              options={DURATION_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
              onChange={(v) => setDuration(Number(v))}
              className="w-full"
              inputClassName="w-full"
              type="number"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">结束时间</label>
            <input
              value={endTime}
              disabled
              className="input-field bg-[var(--bg-content)] cursor-default opacity-70 border border-ink-200"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              {lessonType === '一对一' ? '课时费' : '总课时费'}
            </label>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
              disabled={lessonType === '一对一' && !isFrozenEdit}
              className={`input-field ${
                lessonType === '一对一' && !isFrozenEdit
                  ? 'bg-[var(--bg-content)] cursor-default opacity-70 border border-ink-200'
                  : ''
              }`}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </Modal>

    {/* 冻结课程：手输姓名存在同名学生时，询问是否关联到现有学生 */}
    <ConfirmDialog
      open={!!linkConfirm}
      type="confirm"
      confirmText="关联"
      cancelText="不关联"
      message={
        <span>
          以下姓名已存在同名学生，是否关联到现有学生？
          <span className="mt-2 block space-y-1.5">
            {linkConfirm?.linkableNames.map((n) => {
              const s = students.find((x) => x.name === n);
              const nameColor = generateColor(n);
              const orgColor = generateColor(s?.organization || '未分配', 'organization');
              const gradeColor = generateColor(s?.grade || '未设置', 'grade');
              const tagCls = 'px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap';
              return (
                <span key={n} className="flex justify-center items-center gap-1.5">
                  <span
                    className={tagCls}
                    style={{ backgroundColor: `color-mix(in srgb, ${nameColor} 15%, transparent)`, color: nameColor }}
                  >
                    {n}
                  </span>
                  <span
                    className={tagCls}
                    style={{ backgroundColor: `color-mix(in srgb, ${orgColor} 15%, transparent)`, color: orgColor }}
                  >
                    {s?.organization || '未分配'}
                  </span>
                  <span
                    className={tagCls}
                    style={{ backgroundColor: `color-mix(in srgb, ${gradeColor} 15%, transparent)`, color: gradeColor }}
                  >
                    {s?.grade || '未设置'}
                  </span>
                </span>
              );
            })}
          </span>
          关联后并入现有学生；不关联记为独立学生。
        </span>
      }
      onConfirm={() => {
        linkConfirm?.submit(true);
        setLinkConfirm(null);
      }}
      onCancel={() => {
        linkConfirm?.submit(false);
        setLinkConfirm(null);
      }}
    />
    </>
  );
}
