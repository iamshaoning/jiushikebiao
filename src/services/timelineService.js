/**
 * 时间轴服务模块
 * 负责记录操作历史、提供撤销恢复功能
 */
class TimelineService {
    constructor() {
        this.timelineKey = 'coursemanagertimeline';
        this.maxRecords = 100;
        this.timeline = [];
    }

    /**
     * 初始化服务
     */
    init() {
        this.loadTimeline();
    }

    /**
     * 从本地存储加载时间轴
     */
    loadTimeline() {
        try {
            const dataStr = localStorage.getItem(this.timelineKey);
            if (dataStr) {
                this.timeline = JSON.parse(dataStr);
            }
        } catch (error) {
            console.error('加载时间轴失败:', error);
            this.timeline = [];
        }
    }

    /**
     * 保存时间轴到本地存储
     */
    saveTimeline() {
        try {
            localStorage.setItem(this.timelineKey, JSON.stringify(this.timeline));
        } catch (error) {
            console.error('保存时间轴失败:', error);
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    /**
     * 获取学生信息
     */
    getStudentInfo(studentId) {
        if (!window.state) return { name: '未知学生' };
        const student = window.state.students.find(s => s.id === studentId);
        return student || { name: '未知学生' };
    }

    /**
     * 格式化时间显示
     */
    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hour, minute] = timeStr.split(':');
        return `${hour}点${minute ? minute + '分' : ''}`;
    }

    /**
     * 格式化日期显示
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekDay = weekDays[date.getDay()];
        return `${year}年${month}月${day}日 ${weekDay}`;
    }

    /**
     * 创建添加课程记录
     */
    recordAddCourse(course, isPaste = false) {
        const studentInfos = [];
        const studentNames = [];
        if (course.studentIds && course.studentIds.length > 0) {
            course.studentIds.forEach(id => {
                const student = this.getStudentInfo(id);
                studentInfos.push(student);
                studentNames.push(student.name);
            });
        }

        const action = {
            id: this.generateId(),
            type: 'add-course',
            timestamp: new Date().toISOString(),
            isPaste,
            course: { ...course },
            studentNames: studentNames.join('、'),
            description: `添加${isPaste ? '(粘贴)' : ''}了${this.formatDate(course.date)}${this.formatTime(course.startTime)}${studentNames.join('、')}的${course.lessonType}课程`
        };

        this.addToTimeline(action);
        return action;
    }

    /**
     * 批量记录粘贴添加的课程
     */
    recordPasteCourses(courses) {
        if (!courses || courses.length === 0) return;

        const courseDates = new Set();
        courses.forEach(c => courseDates.add(c.date));
        const uniqueDates = Array.from(courseDates);
        
        const action = {
            id: this.generateId(),
            type: 'paste-courses',
            timestamp: new Date().toISOString(),
            courses: courses.map(c => ({ ...c })),
            expanded: false,
            description: `粘贴添加了${uniqueDates.length}天共${courses.length}节课程`,
            uniqueDates: uniqueDates
        };

        this.addToTimeline(action);
        return action;
    }

    /**
     * 创建修改课程记录
     */
    recordUpdateCourse(oldCourse, newCourse, reason = '') {
        const studentInfos = [];
        const studentNames = [];
        if (newCourse.studentIds && newCourse.studentIds.length > 0) {
            newCourse.studentIds.forEach(id => {
                const student = this.getStudentInfo(id);
                studentInfos.push(student);
                studentNames.push(student.name);
            });
        }

        const changes = [];
        
        if (oldCourse.date !== newCourse.date) {
            changes.push({
                field: '日期',
                old: this.formatDate(oldCourse.date),
                new: this.formatDate(newCourse.date)
            });
        }
        if (oldCourse.startTime !== newCourse.startTime) {
            changes.push({
                field: '时间',
                old: this.formatTime(oldCourse.startTime),
                new: this.formatTime(newCourse.startTime)
            });
        }
        if (oldCourse.duration !== newCourse.duration) {
            changes.push({
                field: '时长',
                old: `${oldCourse.duration}分钟`,
                new: `${newCourse.duration}分钟`
            });
        }
        if (oldCourse.lessonType !== newCourse.lessonType) {
            changes.push({
                field: '课型',
                old: oldCourse.lessonType,
                new: newCourse.lessonType
            });
        }
        if (oldCourse.note !== newCourse.note) {
            changes.push({
                field: '备注',
                old: oldCourse.note || '(无)',
                new: newCourse.note || '(无)'
            });
        }
        
        const oldStudentIds = (oldCourse.studentIds || []).sort().join(',');
        const newStudentIds = (newCourse.studentIds || []).sort().join(',');
        if (oldStudentIds !== newStudentIds) {
            changes.push({
                field: '学生',
                hasChange: true
            });
        }

        const action = {
            id: this.generateId(),
            type: 'update-course',
            timestamp: new Date().toISOString(),
            oldCourse: { ...oldCourse },
            newCourse: { ...newCourse },
            studentNames: studentNames.join('、'),
            changes: changes,
            reason: reason,
            description: `修改了${this.formatDate(newCourse.date)}${this.formatTime(newCourse.startTime)}${studentNames.join('、')}的课程`
        };

        this.addToTimeline(action);
        return action;
    }

    /**
     * 创建删除课程记录
     */
    recordDeleteCourse(course) {
        const studentInfos = [];
        const studentNames = [];
        if (course.studentIds && course.studentIds.length > 0) {
            course.studentIds.forEach(id => {
                const student = this.getStudentInfo(id);
                studentInfos.push(student);
                studentNames.push(student.name);
            });
        }

        const action = {
            id: this.generateId(),
            type: 'delete-course',
            timestamp: new Date().toISOString(),
            course: { ...course },
            studentNames: studentNames.join('、'),
            description: `删除了${this.formatDate(course.date)}${this.formatTime(course.startTime)}${studentNames.join('、')}的课程`
        };

        this.addToTimeline(action);
        return action;
    }

    /**
     * 批量记录删除一天的课程
     */
    recordDeleteDayCourses(date, courses) {
        if (!courses || courses.length === 0) return;

        const action = {
            id: this.generateId(),
            type: 'delete-day-courses',
            timestamp: new Date().toISOString(),
            date: date,
            courses: courses.map(c => ({ ...c })),
            expanded: false,
            description: `删除了${this.formatDate(date)}共${courses.length}节课程`
        };

        this.addToTimeline(action);
        return action;
    }

    /**
     * 添加记录到时间轴
     */
    addToTimeline(action) {
        this.timeline.unshift(action);
        
        if (this.timeline.length > this.maxRecords) {
            this.timeline = this.timeline.slice(0, this.maxRecords);
        }
        
        this.saveTimeline();
    }

    /**
     * 撤销操作
     */
    undoAction(actionId) {
        const index = this.timeline.findIndex(a => a.id === actionId);
        if (index === -1) return false;

        const action = this.timeline[index];
        let success = false;

        switch (action.type) {
            case 'add-course':
            case 'paste-courses':
                success = this.undoAddCourses(action);
                break;
            case 'update-course':
                success = this.undoUpdateCourse(action);
                break;
            case 'delete-course':
            case 'delete-day-courses':
                success = this.undoDeleteCourses(action);
                break;
            case 'restore-snapshot':
                return false;
        }

        if (success) {
            action.undone = true;
            this.saveTimeline();
        }

        return success;
    }

    /**
     * 撤销添加课程
     */
    undoAddCourses(action) {
        if (!window.state) return false;
        
        let coursesToRemove = [];
        
        if (action.type === 'paste-courses') {
            coursesToRemove = action.courses.map(c => c.id);
        } else {
            coursesToRemove = [action.course.id];
        }

        if (!coursesToRemove.length) return false;

        window.setState(draft => draft.courses = draft.courses.filter(c => !coursesToRemove.includes(c.id)), ['courses', 'calendar']);
        return true;
    }

    /**
     * 撤销修改课程
     */
    undoUpdateCourse(action) {
        if (!window.state) return false;

        window.setState(draft => {
            const index = draft.courses.findIndex(c => c.id === action.newCourse.id);
            if (index !== -1) {
                draft.courses[index] = { ...action.oldCourse };
            }
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 撤销删除课程
     */
    undoDeleteCourses(action) {
        if (!window.state) return false;
        
        let coursesToRestore = [];
        
        if (action.type === 'delete-day-courses') {
            coursesToRestore = action.courses;
        } else {
            coursesToRestore = [action.course];
        }

        if (!coursesToRestore.length) return false;

        window.setState(draft => {
            coursesToRestore.forEach(course => {
                const exists = draft.courses.find(c => c.id === course.id);
                if (!exists) {
                    draft.courses.push({ ...course });
                }
            });
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做已撤销的操作
     */
    redoAction(actionId) {
        const index = this.timeline.findIndex(a => a.id === actionId);
        if (index === -1 || !this.timeline[index].undone) return false;

        const action = this.timeline[index];
        let success = false;

        switch (action.type) {
            case 'add-course':
            case 'paste-courses':
                success = this.redoAddCourses(action);
                break;
            case 'update-course':
                success = this.redoUpdateCourse(action);
                break;
            case 'delete-course':
            case 'delete-day-courses':
                success = this.redoDeleteCourses(action);
                break;
            case 'restore-snapshot':
                return false;
        }

        if (success) {
            action.undone = false;
            this.saveTimeline();
        }

        return success;
    }

    /**
     * 重做添加课程
     */
    redoAddCourses(action) {
        if (!window.state) return false;
        
        let coursesToAdd = [];
        
        if (action.type === 'paste-courses') {
            coursesToAdd = action.courses;
        } else {
            coursesToAdd = [action.course];
        }

        if (!coursesToAdd.length) return false;

        window.setState(draft => {
            coursesToAdd.forEach(course => {
                const exists = draft.courses.find(c => c.id === course.id);
                if (!exists) {
                    draft.courses.push({ ...course });
                }
            });
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做修改课程
     */
    redoUpdateCourse(action) {
        if (!window.state) return false;

        window.setState(draft => {
            const index = draft.courses.findIndex(c => c.id === action.oldCourse.id);
            if (index !== -1) {
                draft.courses[index] = { ...action.newCourse };
            }
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做删除课程
     */
    redoDeleteCourses(action) {
        if (!window.state) return false;
        
        let coursesToRemove = [];
        
        if (action.type === 'delete-day-courses') {
            coursesToRemove = action.courses.map(c => c.id);
        } else {
            coursesToRemove = [action.course.id];
        }

        if (!coursesToRemove.length) return false;

        window.setState(draft => draft.courses = draft.courses.filter(c => !coursesToRemove.includes(c.id)), ['courses', 'calendar']);

        return true;
    }

    /**
     * 获取时间轴记录
     */
    getTimeline() {
        return [...this.timeline];
    }

    /**
     * 清空时间轴
     */
    clearTimeline() {
        this.timeline = [];
        this.saveTimeline();
    }

    /**
     * 切换聚合显示
     */
    toggleExpand(actionId) {
        const action = this.timeline.find(a => a.id === actionId);
        if (action && (action.type === 'paste-courses' || action.type === 'delete-day-courses')) {
            action.expanded = !action.expanded;
            this.saveTimeline();
        }
    }
}

const timelineService = new TimelineService();
export default timelineService;