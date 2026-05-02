/**
 * 学生服务模块
 * 负责学生相关的业务逻辑
 */

import dataService from './dataService.js';
import coreUtils from '../utils/coreUtils.js';

class StudentService {
    constructor() {
        this.state = null;
    }

    /**
     * 初始化学生服务
     * @param {Object} state - 全局状态
     */
    init(state) {
        this.state = state;
    }

    /**
     * 添加学生
     * @param {Object} student - 学生信息
     * @returns {Object} 添加的学生
     */
    addStudent(student) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        const newStudent = {
            id: coreUtils.generateId(),
            ...student,
            createdAt: new Date().toISOString()
        };

        this.state.students.push(newStudent);
        this.syncDataToMaps();
        this.saveData();

        return newStudent;
    }

    /**
     * 更新学生信息
     * @param {string} studentId - 学生ID
     * @param {Object} updates - 更新的信息
     * @returns {Object|null} 更新后的学生
     */
    updateStudent(studentId, updates) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        const studentIndex = this.state.students.findIndex(s => s.id === studentId);
        if (studentIndex === -1) {
            return null;
        }

        this.state.students[studentIndex] = {
            ...this.state.students[studentIndex],
            ...updates
        };

        this.syncDataToMaps();
        this.saveData();

        return this.state.students[studentIndex];
    }

    /**
     * 删除学生
     * @param {string} studentId - 学生ID
     * @returns {boolean} 是否删除成功
     */
    deleteStudent(studentId) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        // 检查学生是否有关联的课程
        const hasCourses = this.state.courses.some(course => 
            course.studentIds && course.studentIds.includes(studentId)
        );

        if (hasCourses) {
            throw new Error('该学生有关联的课程，无法删除');
        }

        const initialLength = this.state.students.length;
        this.state.students = this.state.students.filter(s => s.id !== studentId);
        const deleted = this.state.students.length < initialLength;

        if (deleted) {
            this.syncDataToMaps();
            this.saveData();
        }

        return deleted;
    }

    /**
     * 根据ID获取学生
     * @param {string} studentId - 学生ID
     * @returns {Object|null} 学生信息
     */
    getStudentById(studentId) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        return this.state.studentsMap.get(studentId) || null;
    }

    /**
     * 根据机构获取学生
     * @param {string} organization - 机构名称
     * @returns {Array} 学生列表
     */
    getStudentsByOrganization(organization) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        return this.state.students.filter(s => s.organization === organization);
    }

    /**
     * 根据年级获取学生
     * @param {string} grade - 年级
     * @returns {Array} 学生列表
     */
    getStudentsByGrade(grade) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        return this.state.students.filter(s => s.grade === grade);
    }

    /**
     * 搜索学生
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 学生列表
     */
    searchStudents(keyword) {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        const lowerKeyword = keyword.toLowerCase();
        return this.state.students.filter(s => 
            s.name.toLowerCase().includes(lowerKeyword) ||
            (s.organization && s.organization.toLowerCase().includes(lowerKeyword)) ||
            (s.grade && s.grade.toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * 同步数据到Map结构
     */
    syncDataToMaps() {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        // 同步学生数据到studentsMap
        this.state.studentsMap.clear();
        this.state.students.forEach(student => {
            this.state.studentsMap.set(student.id, student);
        });
    }

    /**
     * 保存数据
     */
    saveData() {
        if (!this.state) {
            throw new Error('学生服务未初始化');
        }

        dataService.saveAppData(this.state);
    }
}

// 导出单例实例
const studentService = new StudentService();
export default studentService;