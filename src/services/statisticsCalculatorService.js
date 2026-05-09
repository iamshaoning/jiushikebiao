/**
 * 统计计算服务
 *
 * @description 统计数据的计算逻辑：课时统计、费用聚合、学生课量统计
 * @module statisticsCalculatorService
 */
export class StatisticsCalculatorService {
    constructor(state) {
        this.state = state;
    }

    /**
     * 计算统计数据
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称（可选）
     * @param {Object} utils - 工具函数对象
     * @returns {Object} 统计数据
     */
    calculateStatistics(year, month, organization = '', utils) {
        // 过滤当月课程
        const filteredCourses = this.state.courses.filter(course => {
            const [courseYear, courseMonth] = course.date.split('-').map(Number);
            return courseYear === year && courseMonth === month + 1;
        });

        // 初始化统计数据
        const stats = {
            totalCourses: 0,
            totalFee: 0,
            uniqueStudents: new Set(),
            byOrganization: {},
            byLessonType: {},
            byStudent: {},
            // 新增详细统计：按课型、年级、机构、人数
            detailedStats: {
                '一对一': {},
                '多人课': {}
            }
        };

        // 计算统计数据
        filteredCourses.forEach(course => {
            let shouldCountCourse = false;
            const courseLessonType = course.lessonType || '一对一';
            const isGroupLesson = courseLessonType === '多人课';

            // 预先计算课程相关数据，避免重复计算
            const groupFee = isGroupLesson ? (course.fees && course.fees[0] !== undefined ? course.fees[0] : 0) : 0;
            const studentCount = course.studentIds && Array.isArray(course.studentIds) ? course.studentIds.length : 1;
            const safeStudentCount = Math.max(1, studentCount);
            const perStudentFee = isGroupLesson ? Math.round((groupFee / safeStudentCount) * 100) / 100 : 0;

            // 先处理多人课的一次性费用计算
            if (isGroupLesson) {
                // 检查是否有任何学生符合机构筛选条件
                let hasMatchingStudent = false;
                let firstMatchingStudent = null;

                if (course.studentIds && Array.isArray(course.studentIds)) {
                    for (const studentId of course.studentIds) {
                        const student = this.state.students.find(s => s.id === studentId);
                        if (student && (!organization || student.organization === organization)) {
                            hasMatchingStudent = true;
                            firstMatchingStudent = student;
                            break;
                        }
                    }
                }

                // 只有在有匹配学生时才计算多人课费用
                if (hasMatchingStudent && firstMatchingStudent) {
                    stats.totalFee += groupFee;
                    stats.totalCourses++;

                    // 机构统计（多人课费用计入第一个匹配学生的机构）
                    if (!stats.byOrganization[firstMatchingStudent.organization]) {
                        stats.byOrganization[firstMatchingStudent.organization] = { fee: 0, courses: 0, students: new Set() };
                    }
                    stats.byOrganization[firstMatchingStudent.organization].fee += groupFee;
                    stats.byOrganization[firstMatchingStudent.organization].courses += 1;

                    // 课型统计（多人课费用只算一次）
                    if (!stats.byLessonType[courseLessonType]) {
                        stats.byLessonType[courseLessonType] = { fee: 0, courses: 0, students: new Set() };
                    }
                    stats.byLessonType[courseLessonType].fee += groupFee;
                    stats.byLessonType[courseLessonType].courses += 1;
                }
            }

            const processStudent = (studentId, index) => {
                const student = this.state.students.find(s => s.id === studentId);
                if (!student) return;

                // 机构筛选
                if (organization && student.organization !== organization) {
                    return;
                }

                // 计算学生费用
                let fee = 0;
                if (!isGroupLesson) {
                    // 一对一使用学生预设费用
                    fee = utils.getCourseFee(course, student, index);
                    stats.totalFee += fee;
                    // 只对一对一课程计数，且只计数一次
                    if (!shouldCountCourse) {
                        stats.totalCourses++;
                        shouldCountCourse = true;
                    }
                } else {
                    // 多人课：使用预先计算的人均费用
                    fee = perStudentFee;
                }

                stats.uniqueStudents.add(studentId);

                // 学生统计
                if (!stats.byStudent[studentId]) {
                    stats.byStudent[studentId] = {
                        name: student.name,
                        organization: student.organization,
                        lessonTypes: student.lessonTypes || (student.lessonType ? [student.lessonType] : []),
                        fee: 0,
                        courses: 0
                    };
                }
                // 计算学生费用
                stats.byStudent[studentId].fee += fee;
                stats.byStudent[studentId].courses += 1;

                // 机构统计（多人课的费用已经在上面统一计算了）
                if (!stats.byOrganization[student.organization]) {
                    stats.byOrganization[student.organization] = { fee: 0, courses: 0, students: new Set() };
                }
                // 一对一课程计算机构费用，多人课不重复计算
                if (!isGroupLesson) {
                    stats.byOrganization[student.organization].fee += fee;
                }
                stats.byOrganization[student.organization].courses += isGroupLesson ? 0 : 1;
                stats.byOrganization[student.organization].students.add(studentId);

                // 课型统计（多人课的费用已经在上面统一计算了）
                if (!stats.byLessonType[courseLessonType]) {
                    stats.byLessonType[courseLessonType] = { fee: 0, courses: 0, students: new Set() };
                }
                // 一对一课程计算课型费用，多人课不重复计算
                if (!isGroupLesson) {
                    stats.byLessonType[courseLessonType].fee += fee;
                }
                stats.byLessonType[courseLessonType].courses += isGroupLesson ? 0 : 1;
                stats.byLessonType[courseLessonType].students.add(studentId);

                // 详细统计：按课型、年级、机构、人数
                if (courseLessonType === '一对一') {
                    // 一对一课程：按年级和机构统计
                    const grade = student.grade || '未设置';
                    const org = student.organization || '未分配';

                    if (!stats.detailedStats['一对一'][grade]) {
                        stats.detailedStats['一对一'][grade] = {};
                    }
                    if (!stats.detailedStats['一对一'][grade][org]) {
                        stats.detailedStats['一对一'][grade][org] = {
                            courses: 0,
                            fee: 0,
                            students: new Set()
                        };
                    }
                    stats.detailedStats['一对一'][grade][org].courses += 1;
                    stats.detailedStats['一对一'][grade][org].fee += fee;
                    stats.detailedStats['一对一'][grade][org].students.add(studentId);
                } else if (courseLessonType === '多人课') {
                    // 多人课：按年级、机构和人数统计
                    const grade = student.grade || '未设置';
                    const org = student.organization || '未分配';

                    if (!stats.detailedStats['多人课'][studentCount]) {
                        stats.detailedStats['多人课'][studentCount] = {};
                    }
                    if (!stats.detailedStats['多人课'][studentCount][grade]) {
                        stats.detailedStats['多人课'][studentCount][grade] = {};
                    }
                    if (!stats.detailedStats['多人课'][studentCount][grade][org]) {
                        stats.detailedStats['多人课'][studentCount][grade][org] = {
                            courses: 0,
                            fee: 0,
                            students: new Set()
                        };
                    }
                    // 多人课费用只计算一次
                    if (index === 0) {
                        stats.detailedStats['多人课'][studentCount][grade][org].courses += 1;
                        stats.detailedStats['多人课'][studentCount][grade][org].fee += groupFee;
                    }
                    stats.detailedStats['多人课'][studentCount][grade][org].students.add(studentId);
                }
            };
            if (course.studentIds && Array.isArray(course.studentIds)) {
                course.studentIds.forEach((studentId, index) => processStudent(studentId, index));
            }
        });

        return stats;
    }
}
