/**
 * 课程冲突检查服务
 *
 * @description 检查课程时间是否冲突，支持多学生多时段检测
 * @module conflictCheckService
 */
export class ConflictCheckService {
    constructor(state) {
        this.state = state;
    }

    /**
     * 检查课程时间冲突
     * @param {Object} newCourse - 新课程对象
     * @param {Object} utils - 工具函数对象
     * @returns {boolean} 是否冲突
     */
    checkTimeConflict(newCourse, utils) {
        // 1. 筛选同日期的课程，并排除自己（如果是编辑状态）
        const sameDayCourses = this.state.courses.filter(course =>
            course.date === newCourse.date && (!newCourse.id || course.id !== newCourse.id)
        );

        // 2. 计算新课程的绝对开始和结束分钟数
        const newStartMins = utils.timeToMins(newCourse.startTime);
        const newEndMins = newStartMins + Number(newCourse.duration ?? 120);

        // 3. 遍历检测重叠：Max(开始A, 开始B) < Min(结束A, 结束B) 则代表有交集
        return sameDayCourses.some(course => {
            const courseStartMins = utils.timeToMins(course.startTime);
            const courseEndMins = courseStartMins + Number(course.duration ?? 120);

            return Math.max(newStartMins, courseStartMins) < Math.min(newEndMins, courseEndMins);
        });
    }

    /**
     * 查找与给定课程时间冲突的所有课程
     * @param {Object} newCourse - 新课程对象
     * @param {Object} utils - 工具函数对象
     * @returns {Array} 冲突的课程数组
     */
    findConflictingCourses(newCourse, utils) {
        const sameDayCourses = this.state.courses.filter(course =>
            course.date === newCourse.date && (!newCourse.id || course.id !== newCourse.id)
        );

        const newStartMins = utils.timeToMins(newCourse.startTime);
        const newEndMins = newStartMins + Number(newCourse.duration ?? 120);

        return sameDayCourses.filter(course => {
            const courseStartMins = utils.timeToMins(course.startTime);
            const courseEndMins = courseStartMins + Number(course.duration ?? 120);
            return Math.max(newStartMins, courseStartMins) < Math.min(newEndMins, courseEndMins);
        });
    }
}
