/**
 * 学生 CRUD 与批量操作
 *
 * 重写自课表 dataService（学生部分）+ eventHandlerService（批量操作）
 * 与 course.ts 风格一致，保持页面组件清爽
 */
import { useStore } from '@/stores/useStore';
import type { Student, StudentFees } from './types';
import { generateColor } from './utils';

/* ---------- CRUD ---------- */

/**
 * 批量更新学生字段（机构/年级/费用）
 * 机构变化时级联更新课程的 organizations/colors 冗余字段
 * fees 为 Partial<StudentFees>，仅更新提供的字段
 */
export function batchUpdateStudents(
  ids: string[],
  patch: { organization?: string; grade?: string; fees?: Partial<StudentFees> },
): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const newOrg = patch.organization;

  useStore.getState().mutateData((draft) => {
    draft.students = draft.students.map((s) => {
      if (!idSet.has(s.id)) return s;
      const updated: Student = { ...s };
      if (newOrg !== undefined) updated.organization = newOrg;
      if (patch.grade !== undefined) updated.grade = patch.grade;
      if (patch.fees !== undefined) updated.fees = { ...s.fees, ...patch.fees };
      return updated;
    });

    // 机构变化时级联更新课程的 organizations/colors 及机构颜色映射
    if (newOrg !== undefined) {
      const newColor = generateColor(newOrg);
      // 同步更新 organizationColors，避免后续 initColorsFromState 重新分配不同颜色导致不一致
      draft.organizationColors[newOrg] = newColor;
      draft.courses = draft.courses.map((c) => {
        if (c.frozen) return c; // 冷数据课程解除联动
        let changed = false;
        const newOrgs = [...c.organizations];
        const newColors = [...(c.colors || [])];
        c.studentIds.forEach((sid, idx) => {
          if (idSet.has(sid) && newOrgs[idx] !== undefined) {
            newOrgs[idx] = newOrg;
            newColors[idx] = newColor;
            changed = true;
          }
        });
        return changed ? { ...c, organizations: newOrgs, colors: newColors } : c;
      });
    }

    // 年级变化时级联更新课程的 grades 冗余字段（与机构逻辑一致）
    if (patch.grade !== undefined) {
      const newGrade = patch.grade;
      draft.courses = draft.courses.map((c) => {
        if (c.frozen) return c; // 冷数据课程解除联动
        let changed = false;
        const newGrades = [...(c.grades || [])];
        c.studentIds.forEach((sid, idx) => {
          if (idSet.has(sid) && newGrades[idx] !== undefined) {
            newGrades[idx] = newGrade;
            changed = true;
          }
        });
        return changed ? { ...c, grades: newGrades } : c;
      });
    }
  });
}

/* ---------- 查询/过滤/排序 ---------- */

/** 按姓名或机构过滤（不排序，由调用方决定排序策略） */
export function filterStudents(students: Student[], term: string): Student[] {
  const t = term.trim().toLowerCase();
  if (!t) return students;
  return students.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(t) ||
      (s.organization || '').toLowerCase().includes(t),
  );
}

/** 按机构→年级→姓名排序（无搜索词时使用） */
export function sortStudentsByOrgGradeName(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const orgCompare = (a.organization || '').localeCompare(b.organization || '');
    if (orgCompare !== 0) return orgCompare;
    const gradeCompare = (a.grade || '').localeCompare(b.grade || '');
    if (gradeCompare !== 0) return gradeCompare;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/** 仅按姓名排序（有搜索词时使用，与源项目 listRenderService 一致） */
export function sortStudentsByName(students: Student[]): Student[] {
  return [...students].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/** 按机构分组（多列布局使用），"未分配"机构归为未分配组 */
export function groupStudentsByOrg(students: Student[]): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  students.forEach((s) => {
    const org = s.organization || '未分配';
    const arr = map.get(org) || [];
    arr.push(s);
    map.set(org, arr);
  });
  return map;
}
