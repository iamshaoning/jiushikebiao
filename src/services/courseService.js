/**
 * 课程服务模块
 * 负责课程相关的业务逻辑
 */

import dataService from './dataService.js';
import coreUtils from '../utils/coreUtils.js';

class CourseService {
    constructor() {
        this.state = null;
    }

    /**
     * 初始化课程服务
     * @param {Object} state - 全局状态
     */
    init(state) {
        this.state = state;
    }

    /**
     * 添加课程
     * @param {Object} course - 课程信息
     * @param {boolean} isPaste - 是否是粘贴操作
     * @returns {Object} 添加的课程
     */
    addCourse(course, isPaste = false) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const newCourse = {
            id: coreUtils.generateId(),
            ...course,
            createdAt: new Date().toISOString()
        };

        this.state.courses.push(newCourse);
        this.syncDataToMaps();
        this.saveData();
        
        // 记录到时间轴
        if (window.timelineService) {
            window.timelineService.recordAddCourse(newCourse, isPaste);
        }

        return newCourse;
    }

    /**
     * 更新课程
     * @param {string} courseId - 课程ID
     * @param {Object} updates - 更新的信息
     * @param {string} reason - 变更原因
     * @returns {Object|null} 更新后的课程
     */
    updateCourse(courseId, updates, reason = '') {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const courseIndex = this.state.courses.findIndex(c => c.id === courseId);
        if (courseIndex === -1) {
            return null;
        }
        
        const oldCourse = { ...this.state.courses[courseIndex] };

        this.state.courses[courseIndex] = {
            ...this.state.courses[courseIndex],
            ...updates
        };
        
        const newCourse = this.state.courses[courseIndex];

        this.syncDataToMaps();
        this.saveData();
        
        // 记录到时间轴
        if (window.timelineService) {
            window.timelineService.recordUpdateCourse(oldCourse, newCourse, reason);
        }

        return newCourse;
    }

    /**
     * 删除课程
     * @param {string} courseId - 课程ID
     * @returns {boolean} 是否删除成功
     */
    deleteCourse(courseId) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const courseToDelete = this.state.courses.find(c => c.id === courseId);
        const initialLength = this.state.courses.length;
        this.state.courses = this.state.courses.filter(c => c.id !== courseId);
        const deleted = this.state.courses.length < initialLength;

        if (deleted && courseToDelete) {
            this.syncDataToMaps();
            this.saveData();
            
            // 记录到时间轴
            if (window.timelineService) {
                window.timelineService.recordDeleteCourse(courseToDelete);
            }
        }

        return deleted;
    }

    /**
     * 批量删除一天的课程
     * @param {string} date - 日期（YYYY-MM-DD）
     * @returns {Array} 删除的课程
     */
    deleteDayCourses(date) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const coursesToDelete = this.getCoursesByDate(date);
        if (coursesToDelete.length === 0) {
            return [];
        }

        const courseIdsToDelete = coursesToDelete.map(c => c.id);
        this.state.courses = this.state.courses.filter(c => !courseIdsToDelete.includes(c.id));

        this.syncDataToMaps();
        this.saveData();
        
        // 记录到时间轴
        if (window.timelineService && coursesToDelete.length > 0) {
            window.timelineService.recordDeleteDayCourses(date, coursesToDelete);
        }

        return coursesToDelete;
    }

    /**
     * 批量粘贴添加课程
     * @param {Array} courses - 课程列表
     * @returns {Array} 添加的课程
     */
    pasteCourses(courses) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const addedCourses = [];
        courses.forEach(course => {
            const newCourse = {
                id: coreUtils.generateId(),
                ...course,
                createdAt: new Date().toISOString()
            };
            this.state.courses.push(newCourse);
            addedCourses.push(newCourse);
        });

        this.syncDataToMaps();
        this.saveData();
        
        // 记录到时间轴
        if (window.timelineService && addedCourses.length > 0) {
            window.timelineService.recordPasteCourses(addedCourses);
        }

        return addedCourses;
    }

    /**
     * 根据日期获取课程
     * @param {string} date - 日期（YYYY-MM-DD）
     * @returns {Array} 课程列表
     */
    getCoursesByDate(date) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        return this.state.coursesByDate.get(date) || [];
    }

    /**
     * 根据学生ID获取课程
     * @param {string} studentId - 学生ID
     * @returns {Array} 课程列表
     */
    getCoursesByStudentId(studentId) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        return this.state.courses.filter(course => 
            course.studentIds && course.studentIds.includes(studentId)
        );
    }

    /**
     * 计算课程结束时间
     * @param {string} startTime - 开始时间（HH:MM）
     * @param {number} duration - 时长（分钟）
     * @returns {string} 结束时间（HH:MM）
     */
    calculateEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    }

    /**
     * 同步数据到Map结构
     */
    syncDataToMaps() {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        // 同步课程数据到coursesByDate
        this.state.coursesByDate.clear();
        this.state.courses.forEach(course => {
            if (!this.state.coursesByDate.has(course.date)) {
                this.state.coursesByDate.set(course.date, []);
            }
            this.state.coursesByDate.get(course.date).push(course);
        });
    }

    /**
     * 保存数据
     */
    saveData() {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        dataService.saveAppData(this.state);
    }
}

// 导出单例实例
const courseService = new CourseService();
export default courseService;  