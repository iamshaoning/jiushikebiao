/**
 * 学生表单模态框
 *
 * 重写自课表 studentFormModal
 * 添加/编辑/批量添加学生
 */
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import CustomSelect from '@/components/CustomSelect';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import type { Student } from '@/lib/types';
import { generateId, generateColor, setColorAssignment } from '@/lib/utils';
import { recordAddStudents, recordUpdateStudent } from '@/lib/history';

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  editStudent?: Student | null;
}

/** 解析批量输入的名字（空格/逗号/顿号分隔） */
function parseNames(input: string): string[] {
  return input
    .split(/[\s,，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function StudentFormModal({
  open,
  onClose,
  editStudent,
}: StudentFormModalProps) {
  const students = useStore((s) => s.students);
  const courses = useStore((s) => s.courses);
  const organizations = useStore((s) => s.organizations);
  const grades = useStore((s) => s.grades);
  const mutateData = useStore((s) => s.mutateData);
  const toast = useToast();
  const isEdit = !!editStudent;

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [grade, setGrade] = useState('');
  const [fee, setFee] = useState(0);
  const [duration, setDuration] = useState(120);

  useEffect(() => {
    if (!open) return;
    if (editStudent) {
      setName(editStudent.name);
      setOrganization(editStudent.organization);
      setGrade(editStudent.grade);
      setFee(editStudent.fees?.['一对一'] ?? 0);
      setDuration(editStudent.fees?.['一对一_duration'] ?? 120);
    } else {
      setName('');
      setOrganization(organizations[0] || '');
      setGrade(grades[0] || '');
      setFee(0);
      setDuration(120);
    }
  }, [open, editStudent]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning('请输入学生姓名');
      return;
    }

    const names = parseNames(name);

    if (isEdit && editStudent) {
      // 编辑单个学生
      if (names.length > 1) {
        toast.warning('编辑模式不支持批量');
        return;
      }
      const updatedStudent: Student = {
        ...editStudent,
        name: names[0],
        organization,
        grade,
        fees: { '一对一': fee, '一对一_duration': duration },
      };

      const beforeCourses = courses.filter((c) => (c.studentIds || []).includes(editStudent.id));

      mutateData((draft) => {
        const idx = draft.students.findIndex((s) => s.id === editStudent.id);
        if (idx >= 0) draft.students[idx] = updatedStudent;

        // 级联更新课程的冗余字段
        draft.courses = draft.courses.map((c) => {
          if (c.frozen) return c; // 冷数据课程解除联动
          const studentIdx = c.studentIds.indexOf(editStudent.id);
          if (studentIdx >= 0) {
            const newNames = [...c.studentNames];
            const newOrgs = [...c.organizations];
            const newGrades = c.grades ? [...c.grades] : null;
            const newColors = [...c.colors];
            newNames[studentIdx] = names[0];
            newOrgs[studentIdx] = organization;
            if (newGrades) newGrades[studentIdx] = grade;
            newColors[studentIdx] = generateColor(organization);
            return {
              ...c,
              studentNames: newNames,
              organizations: newOrgs,
              ...(newGrades ? { grades: newGrades } : {}),
              colors: newColors,
            };
          }
          return c;
        });
      });

      const afterCourses = useStore.getState().courses.filter((c) =>
        (c.studentIds || []).includes(editStudent.id),
      );
      recordUpdateStudent(editStudent, updatedStudent, beforeCourses, afterCourses);

      toast.success('学生信息已更新');
    } else {
      // 添加（支持批量）
      const newStudents: Student[] = names.map((n) => ({
        id: generateId(),
        name: n,
        organization,
        grade,
        fees: { '一对一': fee, '一对一_duration': duration },
      }));

      mutateData((draft) => {
        draft.students.push(...newStudents);
      });
      recordAddStudents(newStudents);

      // 为新机构生成颜色
      if (organization && !useStore.getState().organizationColors[organization]) {
        const color = generateColor(organization);
        setColorAssignment(organization, color, 'organization');
        mutateData((draft) => {
          draft.organizationColors[organization] = color;
        });
      }

      if (newStudents.length > 1) {
        toast.success(`已添加 ${newStudents.length} 名学生`);
      } else {
        toast.success('学生已添加');
      }
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑学生' : '添加学生'}
      width="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={handleSubmit} className="btn-primary">
            {isEdit ? '保存' : '添加'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 姓名（支持批量） */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            学生姓名{!isEdit && '（多个姓名用空格、逗号或顿号分隔可批量添加）'}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder={isEdit ? '请输入学生姓名' : '如：张三 李四,王五、赵六'}
            autoFocus
          />
        </div>

        {/* 机构 + 年级（并排） */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">机构</label>
            <CustomSelect
              value={organization}
              options={[{ value: '', label: '未设置' }, ...organizations.map((org) => ({ value: org, label: org }))]}
              onChange={(v) => setOrganization(v as string)}
              className="w-full"
              triggerClassName="py-2 w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">年级</label>
            <CustomSelect
              value={grade}
              options={[{ value: '', label: '未设置' }, ...grades.map((g) => ({ value: g, label: g }))]}
              onChange={(v) => setGrade(v as string)}
              className="w-full"
              triggerClassName="py-2 w-full"
            />
          </div>
        </div>

        {/* 费用 + 时长 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">预设课时费</label>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">基础时长(分钟)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 120)}
              className="input-field"
              placeholder="120"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
