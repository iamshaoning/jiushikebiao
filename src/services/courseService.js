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
     * @returns {Object} 添加的课程
     */
    addCourse(course) {
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

        return newCourse;
    }

    /**
     * 更新课程
     * @param {string} courseId - 课程ID
     * @param {Object} updates - 更新的信息
     * @returns {Object|null} 更新后的课程
     */
    updateCourse(courseId, updates) {
        if (!this.state) {
            throw new Error('课程服务未初始化');
        }

        const courseIndex = this.state.courses.findIndex(c => c.id === courseId);
        if (courseIndex === -1) {
            return null;
        }

        this.state.courses[courseIndex] = {
            ...this.state.courses[courseIndex],
            ...updates
        };

        this.syncDataToMaps();
        this.saveData();

        return this.state.courses[courseIndex];
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

        const initialLength = this.state.courses.length;
        this.state.courses = this.state.courses.filter(c => c.id !== courseId);
        const deleted = this.state.courses.length < initialLength;

        if (deleted) {
            this.syncDataToMaps();
            this.saveData();
        }

        return deleted;
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