/**
 * 费用统计计算
 *
 * 重写自课表 statisticsCalculatorService.js
 * 忠实保留：多人课费用只算一次（计入第一个匹配学生机构），一对一按学生累加
 */
import type { Course, Student } from './types';

export interface StatFilters {
  year: number;
  month: number | 'all'; // 'all' 表示全年
  organization?: string; // 空字符串/undefined 表示全部
}

export interface OrgStat {
  organization: string;
  courseCount: number;
  totalFee: number;
  studentCount: number;
}

export interface StudentStat {
  studentId: string;
  name: string;
  organization: string;
  grade: string;
  courseCount: number;
  totalFee: number;
}

export interface LessonTypeStat {
  lessonType: '一对一' | '多人课';
  courseCount: number;
  totalFee: number;
  studentCount: number;
}

/** 详细统计项（按课型/年级/机构/人数分组） */
export interface DetailedStatItem {
  courses: number;
  fee: number;
  studentCount: number;
}

/** 一对一详细统计：{ 年级: { 机构: item } } */
export type OneOnOneDetailed = Record<string, Record<string, DetailedStatItem>>;

/** 多人课详细统计：{ 上课人数: { 年级: { 机构: item } } } */
export type GroupDetailed = Record<string, Record<string, Record<string, DetailedStatItem>>>;

export interface DetailedStats {
  '一对一': OneOnOneDetailed;
  '多人课': GroupDetailed;
}

export interface StatResult {
  totalCourses: number;
  totalFee: number;
  uniqueStudentCount: number;
  orgStats: OrgStat[];
  studentStats: StudentStat[];
  lessonTypeStats: LessonTypeStat[];
  detailedStats: DetailedStats;
}

/** 课程详情弹窗筛选条件 */
export interface DetailFilter {
  studentId?: string;
  lessonType?: '一对一' | '多人课';
  org?: string;
  grade?: string;
  studentCount?: number;
}

/** 按年月过滤课程 */
export function filterCoursesByDate(
  courses: Course[],
  filters: StatFilters,
): Course[] {
  const { year, month } = filters;
  const isFullYear = month === 'all';
  return courses.filter((c) => {
    if (!c.date || typeof c.date !== 'string') return false;
    const parts = c.date.split('-');
    if (parts.length < 2) return false;
    const cy = Number(parts[0]);
    const cm = Number(parts[1]);
    if (isNaN(cy) || isNaN(cm)) return false;
    if (isFullYear) return cy === year;
    return cy === year && cm === (month as number) + 1;
  });
}

/**
 * 计算完整统计
 * 规则（与源项目一致）：
 * - 多人课费用只算一次（fees[0]），计入第一个匹配筛选条件的学生机构
 * - 一对一费用按学生索引累加（fees[index]）
 * - 学生分摊费用：多人课 = 总费用/人数
 */
export function calculateStats(
  courses: Course[],
  students: Student[],
  filters: StatFilters,
): StatResult {
  const org = filters.organization?.trim() || '';
  const filtered = filterCoursesByDate(courses, filters);

  let totalCourses = 0;
  let totalFee = 0;
  const uniqueStudents = new Set<string>();

  const orgMap = new Map<string, { fee: number; courses: number; students: Set<string> }>();
  const lessonMap = new Map<string, { fee: number; courses: number; students: Set<string> }>();
  const studentMap = new Map<string, StudentStat>();

  // 详细统计：一对一 { grade: { org: { courses, fee, students } } }
  const detailedOneOnOne: Record<string, Record<string, { courses: number; fee: number; students: Set<string> }>> = {};
  // 详细统计：多人课 { studentCount: { grade: { org: { courses, fee, students } } } }
  const detailedGroup: Record<string, Record<string, Record<string, { courses: number; fee: number; students: Set<string> }>>> = {};

  const ensureOrg = (name: string) => {
    if (!orgMap.has(name)) {
      orgMap.set(name, { fee: 0, courses: 0, students: new Set() });
    }
    return orgMap.get(name)!;
  };
  const ensureLesson = (name: string) => {
    if (!lessonMap.has(name)) {
      lessonMap.set(name, { fee: 0, courses: 0, students: new Set() });
    }
    return lessonMap.get(name)!;
  };
  const ensureStudent = (s: Student) => {
    if (!studentMap.has(s.id)) {
      studentMap.set(s.id, {
        studentId: s.id,
        name: s.name,
        organization: s.organization,
        grade: s.grade,
        courseCount: 0,
        totalFee: 0,
      });
    }
    return studentMap.get(s.id)!;
  };

  filtered.forEach((course) => {
    const lessonType = course.lessonType || '一对一';
    const isGroup = lessonType === '多人课';
    const studentIds = course.studentIds || [];
    const studentCount = Math.max(1, studentIds.length);
    const groupFee = isGroup ? course.fees[0] ?? 0 : 0;
    const perStudentFee = isGroup ? groupFee / studentCount : 0;

    if (isGroup) {
      // 多人课：找第一个匹配机构筛选的学生
      let firstMatch: Student | null = null;
      for (const sid of studentIds) {
        const s = students.find((x) => x.id === sid);
        if (s && (!org || s.organization === org)) {
          firstMatch = s;
          break;
        }
      }
      if (firstMatch) {
        totalFee += groupFee;
        totalCourses++;
        const orgName = firstMatch.organization || '未分配';
        const o = ensureOrg(orgName);
        o.fee += groupFee;
        o.courses += 1;
        const l = ensureLesson(lessonType);
        l.fee += groupFee;
        l.courses += 1;
      }
    }

    // 按学生遍历（一对一累加费用，多人课累加分摊费用到学生维度）
    let oneOnOneCounted = false;
    studentIds.forEach((sid, idx) => {
      const s = students.find((x) => x.id === sid);
      if (!s) return;
      if (org && s.organization !== org) return;

      let fee = 0;
      if (!isGroup) {
        fee = course.fees[idx] ?? 0;
        totalFee += fee;
        if (!oneOnOneCounted) {
          totalCourses++;
          oneOnOneCounted = true;
        }
        const orgName = s.organization || '未分配';
        const o = ensureOrg(orgName);
        o.fee += fee;
        o.courses += 1;
        const l = ensureLesson(lessonType);
        l.fee += fee;
        l.courses += 1;
      } else {
        fee = perStudentFee;
      }

      uniqueStudents.add(sid);
      const o2 = ensureOrg(s.organization || '未分配');
      o2.students.add(sid);
      const l2 = ensureLesson(lessonType);
      l2.students.add(sid);

      const ss = ensureStudent(s);
      ss.totalFee += fee;
      ss.courseCount += 1;

      // 详细统计：按课型/年级/机构/人数分组
      const grade = s.grade || '未设置';
      const orgName = s.organization || '未分配';
      if (!isGroup) {
        // 一对一：按年级 + 机构统计
        if (!detailedOneOnOne[grade]) detailedOneOnOne[grade] = {};
        if (!detailedOneOnOne[grade][orgName]) {
          detailedOneOnOne[grade][orgName] = { courses: 0, fee: 0, students: new Set() };
        }
        detailedOneOnOne[grade][orgName].courses += 1;
        detailedOneOnOne[grade][orgName].fee += fee;
        detailedOneOnOne[grade][orgName].students.add(sid);
      } else {
        // 多人课：按上课人数 + 年级 + 机构统计
        const sc = String(studentCount);
        if (!detailedGroup[sc]) detailedGroup[sc] = {};
        if (!detailedGroup[sc][grade]) detailedGroup[sc][grade] = {};
        if (!detailedGroup[sc][grade][orgName]) {
          detailedGroup[sc][grade][orgName] = { courses: 0, fee: 0, students: new Set() };
        }
        // 多人课费用只计算一次（第一个学生时）
        if (idx === 0) {
          detailedGroup[sc][grade][orgName].courses += 1;
          detailedGroup[sc][grade][orgName].fee += groupFee;
        }
        detailedGroup[sc][grade][orgName].students.add(sid);
      }
    });
  });

  const orgStats: OrgStat[] = Array.from(orgMap.entries())
    .map(([organization, v]) => ({
      organization,
      courseCount: v.courses,
      totalFee: v.fee,
      studentCount: v.students.size,
    }))
    .sort((a, b) => b.totalFee - a.totalFee);

  const studentStats: StudentStat[] = Array.from(studentMap.values()).sort(
    (a, b) => b.totalFee - a.totalFee,
  );

  const lessonTypeStats: LessonTypeStat[] = (
    ['一对一', '多人课'] as const
  )
    .map((lt) => {
      const v = lessonMap.get(lt);
      return {
        lessonType: lt,
        courseCount: v?.courses ?? 0,
        totalFee: v?.fee ?? 0,
        studentCount: v?.students.size ?? 0,
      };
    })
    .filter((s) => s.courseCount > 0);

  // 转换详细统计：Set -> studentCount
  const convertOneOnOne = (map: typeof detailedOneOnOne): OneOnOneDetailed =>
    Object.fromEntries(
      Object.entries(map).map(([grade, orgMap]) => [
        grade,
        Object.fromEntries(
          Object.entries(orgMap).map(([org, v]) => [
            org,
            { courses: v.courses, fee: v.fee, studentCount: v.students.size },
          ]),
        ),
      ]),
    );

  const convertGroup = (map: typeof detailedGroup): GroupDetailed =>
    Object.fromEntries(
      Object.entries(map).map(([sc, gradeMap]) => [
        sc,
        Object.fromEntries(
          Object.entries(gradeMap).map(([grade, orgMap]) => [
            grade,
            Object.fromEntries(
              Object.entries(orgMap).map(([org, v]) => [
                org,
                { courses: v.courses, fee: v.fee, studentCount: v.students.size },
              ]),
            ),
          ]),
        ),
      ]),
    );

  return {
    totalCourses,
    totalFee,
    uniqueStudentCount: uniqueStudents.size,
    orgStats,
    studentStats,
    lessonTypeStats,
    detailedStats: {
      '一对一': convertOneOnOne(detailedOneOnOne),
      '多人课': convertGroup(detailedGroup),
    },
  };
}

/** 按详情筛选条件过滤课程（用于课节数弹窗） */
export function filterCoursesForDetail(
  courses: Course[],
  students: Student[],
  filters: StatFilters,
  detail: DetailFilter,
): Course[] {
  const { year, month, organization: globalOrg } = filters;
  const isFullYear = month === 'all';

  let filtered = courses.filter((c) => {
    if (!c.date || typeof c.date !== 'string') return false;
    const parts = c.date.split('-');
    if (parts.length < 2) return false;
    const cy = Number(parts[0]);
    const cm = Number(parts[1]);
    if (isNaN(cy) || isNaN(cm)) return false;
    if (isFullYear) return cy === year;
    return cy === year && cm === (month as number) + 1;
  });

  // 课型筛选
  if (detail.lessonType) {
    filtered = filtered.filter((c) => (c.lessonType || '一对一') === detail.lessonType);
  }

  // 多人课人数筛选
  if (detail.studentCount != null) {
    filtered = filtered.filter((c) => c.studentIds && c.studentIds.length === detail.studentCount);
  }

  // 学生筛选
  if (detail.studentId) {
    filtered = filtered.filter(
      (c) => c.studentIds && Array.isArray(c.studentIds) && c.studentIds.includes(detail.studentId!),
    );
  }

  // 机构/年级筛选（学生ID筛选路径不需要再按机构/年级过滤）
  if (!detail.studentId && (detail.org || detail.grade || globalOrg)) {
    filtered = filtered.filter((c) => {
      if (!c.studentIds || !Array.isArray(c.studentIds)) return false;
      return c.studentIds.some((sid) => {
        const student = students.find((s) => s.id === sid);
        if (!student) return false;
        if (globalOrg && student.organization !== globalOrg) return false;
        if (detail.org && student.organization !== detail.org) return false;
        if (detail.grade && student.grade !== detail.grade) return false;
        return true;
      });
    });
  }

  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

/** 获取学生在指定课程中的费用 */
export function getStudentCourseFee(course: Course, index: number): number {
  if (course.lessonType === '一对一') {
    return course.fees[index] ?? 0;
  }
  const total = course.fees[0] ?? 0;
  const count = Math.max(1, course.studentIds.length);
  return total / count;
}
