/**
 * 时间轴服务
 *
 * @description 记录课程操作历史（添加/编辑/删除），支持撤销/重做，按用户 ID 分组存储
 * @module timelineService
 */
import { registry } from '../core/registry.js';

class TimelineService {
    constructor() {
        this.timelineKey = 'coursemanagertimeline';
        this.maxRecords = 20; // 限制最多保存20条记录
        this.timeline = [];
        this.currentUserId = null;
    }

    /**
     * 直接获取用户ID（不依赖authService，避免初始化顺序问题）
     */
    async getUserIdDirectly() {
        try {
            if (registry.get('supabaseAuth')) {
                const { data } = await registry.get('supabaseAuth').getSession();
                return data?.session?.user?.id || null;
            }
        } catch (error) {
            console.error('获取用户ID失败:', error);
        }
        return null;
    }

    async reloadTimelineForUser() {
        const isTrialMode = registry.get('serverStatusService')?.isTrialMode || false;
        if (isTrialMode) {
            this.currentUserId = null;
            this.timeline = [];
            return;
        }
        
        this.currentUserId = await this.getUserIdDirectly();
        if (this.currentUserId) {
            this.loadTimeline();
        } else {
            this.timeline = [];
        }
    }

    /**
     * 从本地存储加载当前用户的时间轴
     */
    loadTimeline() {
        try {
            if (!this.currentUserId) {
                this.timeline = [];
                return;
            }

            const dataStr = localStorage.getItem(this.timelineKey);
            if (dataStr) {
                const storedData = JSON.parse(dataStr);
                
                // 检查是否是按用户分组的格式
                if (storedData && !Array.isArray(storedData)) {
                    // 只加载当前用户的数据
                    this.timeline = storedData[this.currentUserId] || [];
                } else {
                    // 旧格式或不是分组格式，清除并重新开始
                    this.timeline = [];
                    // 保存空的分组格式
                    this.saveTimeline();
                }
            } else {
                this.timeline = [];
            }
        } catch (error) {
            console.error('加载时间轴失败:', error);
            this.timeline = [];
        }
    }

    /**
     * 保存时间轴到本地存储（按用户ID分组存储）
     */
    async saveTimeline() {
        try {
            if (!this.currentUserId) {
                this.currentUserId = await this.getUserIdDirectly();
            }
            
            if (!this.currentUserId) {
                return; // 没有用户ID，不保存
            }

            const dataStr = localStorage.getItem(this.timelineKey);
            let allTimelines = {};
            
            if (dataStr) {
                const parsedData = JSON.parse(dataStr);
                if (parsedData && !Array.isArray(parsedData)) {
                    allTimelines = parsedData;
                }
                // 如果是旧格式数组数据，直接忽略，使用新格式
            }
            
            // 只更新当前用户的数据
            allTimelines[this.currentUserId] = this.timeline;
            localStorage.setItem(this.timelineKey, JSON.stringify(allTimelines));
        } catch (error) {
            console.error('保存时间轴失败:', error);
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return registry.get('utils').generateId();
    }

    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hour, minute] = timeStr.split(':');
        return `${hour}点${minute ? minute + '分' : ''}`;
    }

    /**
     * 格式化日期显示（简短版本）
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    }

    /**
     * 生成课程标签HTML（类似日历样式）
     */
    generateCourseTag(course, changes = [], compact = false) {
        if (!course) return '';

        const escapeHtml = (str) => registry.get('utils').escapeHtml(str) || '';

        const primaryColor = course.colors && course.colors[0] ? course.colors[0] : 'var(--color-secondary)';
        const studentNames = course.studentNames || [];

        const namesArray = Array.isArray(studentNames) ? studentNames : studentNames.split('、').filter(n => n);
        const changedSet = new Set(changes.map(c => c.field));
        const hlStyle = 'font-weight:700;color:var(--color-warning);text-shadow:0 0 6px rgba(250,204,21,0.3)';
        const hl = (key) => changedSet.has(key) ? hlStyle : '';
        const hlTime = changedSet.has('时间') || changedSet.has('时长');

        const studentTagSize = compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
        const studentTags = namesArray.map((name, index) => {
            const color = course.colors && course.colors[index] ? course.colors[index] : primaryColor;
            return `
                <span class="${studentTagSize} rounded font-medium"
                      style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">
                    ${escapeHtml(name)}
                </span>
            `;
        }).join('');

        const endTime = this.calculateEndTime(course.startTime, course.duration);
        const fee = course.fees?.[0] ?? 0;
        const feeText = fee > 0 ? `¥${fee}` : '';
        const dateText = course.date ? this.formatDate(course.date) : '';

        const padding = compact ? 'p-2' : 'p-3';
        const tagStyle = compact ? 'width: 100%; box-sizing: border-box;' : 'min-width: 220px';
        const studentGap = compact ? 'margin-bottom: 4px' : 'margin-bottom: 8px';
        const detailGap = compact ? 'margin-top: 2px' : 'margin-top: 4px';
        const textSize = compact ? 'text-[10px]' : 'text-xs';

        return `
            <div class="course-tag-item course-item mt-1 rounded ${textSize} relative z-10 inline-block" style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent); ${tagStyle}; max-width: 100%;">
                <div class="tag-content ${padding}">
                    <div class="flex flex-wrap gap-1" style="${studentGap};">
                        ${studentTags}
                    </div>
                    <div>
                        <span style="color: var(--text-primary);${hl('课型')}">${escapeHtml(course.lessonType)}</span>
                        ${feeText ? '<span style="color: var(--text-primary); margin-left: 6px;' + hl('课时费') + '">' + feeText + '</span>' : ''}
                    </div>
                    <div style="${detailGap};">
                        <span style="color: var(--text-secondary);${hl('日期')}">${dateText || ''}</span>
                        <span style="color: var(--text-secondary); margin-left: 2px;${hlTime ? hlStyle : ''}">${dateText ? ' · ' : ''}${course.startTime} - ${endTime}</span>
                    </div>
                    ${course.note ? `<div class="text-[10px] truncate mt-1 ml-1" style="color: var(--text-secondary);${hl('备注')}">${escapeHtml(course.note)}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 计算结束时间
     */
    calculateEndTime(startTime, duration) {
        return registry.get('dateUtils')?.calculateEndTimeFromDuration(startTime, duration);
    }

    /**
     * 确保用户已初始化
     */
    async ensureUserInitialized() {
        // 检查是否处于试用模式，如果是则不初始化时间轴
        const isTrialMode = registry.get('serverStatusService')?.isTrialMode || false;
        if (isTrialMode) {
            this.currentUserId = null;
            this.timeline = [];
            return false;
        }
        
        if (!this.currentUserId) {
            this.currentUserId = await this.getUserIdDirectly();
            if (this.currentUserId) {
                this.loadTimeline();
            }
        }
        return !!this.currentUserId;
    }

    /**
     * 创建添加课程记录
     */
    async recordAddCourse(course, isPaste = false) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
        const action = {
            id: this.generateId(),
            type: 'add-course',
            timestamp: new Date().toISOString(),
            isPaste,
            course: JSON.parse(JSON.stringify(course)),
            description: `添加：`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 批量记录粘贴添加的课程
     */
    async recordPasteCourses(courses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !courses || courses.length === 0) return;
        
        const action = {
            id: this.generateId(),
            type: 'paste-courses',
            timestamp: new Date().toISOString(),
            courses: courses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `粘贴：`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 创建修改课程记录
     */
    async recordUpdateCourse(oldCourse, newCourse, reason = '') {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
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

        const oldFee = oldCourse.fees?.[0] ?? 0;
        const newFee = newCourse.fees?.[0] ?? 0;
        if (oldFee !== newFee) {
            changes.push({
                field: '课时费',
                old: `¥${oldFee}`,
                new: `¥${newFee}`
            });
        }

        const action = {
            id: this.generateId(),
            type: 'update-course',
            timestamp: new Date().toISOString(),
            oldCourse: JSON.parse(JSON.stringify(oldCourse)),
            newCourse: JSON.parse(JSON.stringify(newCourse)),
            changes: changes,
            reason: reason,
            description: `修改：`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 创建删除课程记录
     */
    async recordDeleteCourse(course) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
        const action = {
            id: this.generateId(),
            type: 'delete-course',
            timestamp: new Date().toISOString(),
            course: JSON.parse(JSON.stringify(course)),
            description: `删除：`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 批量记录删除一天的课程
     */
    async recordDeleteDayCourses(date, courses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !courses || courses.length === 0) return;

        const action = {
            id: this.generateId(),
            type: 'delete-day-courses',
            timestamp: new Date().toISOString(),
            date: date,
            courses: courses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `删除：`
        };

        await this.addToTimeline(action);
        return action;
    }

    async recordBatchAddCourses(courses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !courses || courses.length === 0) return;
        const action = {
            id: this.generateId(),
            type: 'batch-add-courses',
            timestamp: new Date().toISOString(),
            courses: courses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `批量添加 ${courses.length} 节课程：`
        };
        await this.addToTimeline(action);
        return action;
    }

    async recordBatchDeleteCourses(courses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !courses || courses.length === 0) return;
        const action = {
            id: this.generateId(),
            type: 'batch-delete-courses',
            timestamp: new Date().toISOString(),
            courses: courses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `批量删除 ${courses.length} 节课程：`
        };
        await this.addToTimeline(action);
        return action;
    }

    async recordBatchDeleteDayCourses(dates, allCourses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !allCourses || allCourses.length === 0) return;
        const action = {
            id: this.generateId(),
            type: 'batch-delete-day-courses',
            timestamp: new Date().toISOString(),
            dates: dates,
            courses: allCourses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `批量删除 ${dates.length} 天共 ${allCourses.length} 节课程：`
        };
        await this.addToTimeline(action);
        return action;
    }

    async recordBatchPasteCourses(courses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !courses || courses.length === 0) return;
        const action = {
            id: this.generateId(),
            type: 'batch-paste-courses',
            timestamp: new Date().toISOString(),
            courses: courses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `批量粘贴 ${courses.length} 节课程：`
        };
        await this.addToTimeline(action);
        return action;
    }

    /**
     * 记录删除学生操作（含联动删除的课程）
     */
    async recordDeleteStudent(student, deletedCourses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;

        const action = {
            id: this.generateId(),
            type: 'delete-student',
            timestamp: new Date().toISOString(),
            student: JSON.parse(JSON.stringify(student)),
            deletedCourses: deletedCourses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `删除学生：${student.name}`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 记录批量删除学生操作（含联动删除的课程）
     */
    async recordBatchDeleteStudents(students, deletedCourses) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized || !students || students.length === 0) return;

        const action = {
            id: this.generateId(),
            type: 'batch-delete-students',
            timestamp: new Date().toISOString(),
            students: students.map(s => JSON.parse(JSON.stringify(s))),
            deletedCourses: deletedCourses.map(c => JSON.parse(JSON.stringify(c))),
            expanded: false,
            description: `批量删除 ${students.length} 位学生：`
        };

        await this.addToTimeline(action);
        return action;
    }

    /**
     * 添加记录到时间轴
     */
    async addToTimeline(action) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
        this.timeline.unshift(action);
        
        if (this.timeline.length > this.maxRecords) {
            this.timeline = this.timeline.slice(0, this.maxRecords);
        }
        
        await this.saveTimeline();
    }

    /**
     * 撤销操作
     */
    async undoAction(actionId) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return false;
        
        const index = this.timeline.findIndex(a => a.id === actionId);
        if (index === -1) return false;

        const action = this.timeline[index];
        let success = false;

        switch (action.type) {
            case 'add-course':
            case 'paste-courses':
            case 'batch-add-courses':
            case 'batch-paste-courses':
                success = this.undoAddCourses(action);
                break;
            case 'update-course':
                success = this.undoUpdateCourse(action);
                break;
            case 'delete-course':
            case 'delete-day-courses':
            case 'batch-delete-courses':
            case 'batch-delete-day-courses':
                success = this.undoDeleteCourses(action);
                break;
            case 'delete-student':
            case 'batch-delete-students':
                success = this.undoDeleteStudents(action);
                break;
            case 'restore-snapshot':
                success = this.undoRestoreSnapshot(action);
                break;
        }

        if (success) {
            action.undone = true;
            await this.saveTimeline();
        }

        return success;
    }

    /**
     * 撤销添加课程
     */
    undoAddCourses(action) {
        if (!registry.get('state')) return false;
        
        let coursesToRemove = [];
        
        if (action.courses && action.courses.length > 0) {
            coursesToRemove = action.courses.map(c => c.id);
        } else if (action.course) {
            coursesToRemove = [action.course.id];
        }

        if (!coursesToRemove.length) return false;

        const removeSet = new Set(coursesToRemove);
        registry.get('setState')(draft => draft.courses = draft.courses.filter(c => !removeSet.has(c.id)), ['courses', 'calendar']);
        return true;
    }

    /**
     * 撤销修改课程
     */
    undoUpdateCourse(action) {
        if (!registry.get('state')) return false;

        const state = registry.get('state');
        const index = state.courses.findIndex(c => c.id === action.newCourse.id);
        if (index === -1) return false;

        registry.get('setState')(draft => {
            const idx = draft.courses.findIndex(c => c.id === action.newCourse.id);
            if (idx !== -1) {
                draft.courses[idx] = JSON.parse(JSON.stringify(action.oldCourse));
            }
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 撤销删除课程
     */
    undoDeleteCourses(action) {
        if (!registry.get('state')) return false;
        
        let coursesToRestore = [];
        
        if (action.courses && action.courses.length > 0) {
            coursesToRestore = action.courses;
        } else if (action.course) {
            coursesToRestore = [action.course];
        }

        if (!coursesToRestore.length) return false;

        registry.get('setState')(draft => {
            coursesToRestore.forEach(course => {
                const exists = draft.courses.find(c => c.id === course.id);
                if (!exists) {
                    draft.courses.push(JSON.parse(JSON.stringify(course)));
                }
            });
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做已撤销的操作
     */
    async redoAction(actionId) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return false;
        
        const index = this.timeline.findIndex(a => a.id === actionId);
        if (index === -1 || !this.timeline[index].undone) return false;

        const action = this.timeline[index];
        let success = false;

        switch (action.type) {
            case 'add-course':
            case 'paste-courses':
            case 'batch-add-courses':
            case 'batch-paste-courses':
                success = this.redoAddCourses(action);
                break;
            case 'update-course':
                success = this.redoUpdateCourse(action);
                break;
            case 'delete-course':
            case 'delete-day-courses':
            case 'batch-delete-courses':
            case 'batch-delete-day-courses':
                success = this.redoDeleteCourses(action);
                break;
            case 'delete-student':
            case 'batch-delete-students':
                success = this.redoDeleteStudents(action);
                break;
            case 'restore-snapshot':
                success = this.redoRestoreSnapshot(action);
                break;
        }

        if (success) {
            action.undone = false;
            await this.saveTimeline();
        }

        return success;
    }

    /**
     * 重做添加课程
     */
    redoAddCourses(action) {
        if (!registry.get('state')) return false;
        
        let coursesToAdd = [];
        
        if (action.courses && action.courses.length > 0) {
            coursesToAdd = action.courses;
        } else if (action.course) {
            coursesToAdd = [action.course];
        }

        if (!coursesToAdd.length) return false;

        registry.get('setState')(draft => {
            coursesToAdd.forEach(course => {
                const exists = draft.courses.find(c => c.id === course.id);
                if (!exists) {
                    draft.courses.push(JSON.parse(JSON.stringify(course)));
                }
            });
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做修改课程
     */
    redoUpdateCourse(action) {
        if (!registry.get('state')) return false;

        const state = registry.get('state');
        const index = state.courses.findIndex(c => c.id === action.oldCourse.id);
        if (index === -1) return false;

        registry.get('setState')(draft => {
            const idx = draft.courses.findIndex(c => c.id === action.oldCourse.id);
            if (idx !== -1) {
                draft.courses[idx] = JSON.parse(JSON.stringify(action.newCourse));
            }
        }, ['courses', 'calendar']);

        return true;
    }

    /**
     * 重做删除课程
     */
    redoDeleteCourses(action) {
        if (!registry.get('state')) return false;
        
        let coursesToRemove = [];
        
        if (action.courses && action.courses.length > 0) {
            coursesToRemove = action.courses.map(c => c.id);
        } else if (action.course) {
            coursesToRemove = [action.course.id];
        }

        if (!coursesToRemove.length) return false;

        const removeSet = new Set(coursesToRemove);
        registry.get('setState')(draft => draft.courses = draft.courses.filter(c => !removeSet.has(c.id)), ['courses', 'calendar']);

        return true;
    }

    /**
     * 撤销删除学生（还原学生和联动删除的课程）
     */
    undoDeleteStudents(action) {
        if (!registry.get('state')) return false;

        const students = action.students || (action.student ? [action.student] : []);
        const courses = action.deletedCourses || [];

        if (!students.length && !courses.length) return false;

        registry.get('setState')(draft => {
            students.forEach(student => {
                const exists = draft.students.find(s => s.id === student.id);
                if (!exists) {
                    draft.students.push(JSON.parse(JSON.stringify(student)));
                }
            });
            courses.forEach(course => {
                const exists = draft.courses.find(c => c.id === course.id);
                if (!exists) {
                    draft.courses.push(JSON.parse(JSON.stringify(course)));
                }
            });
        }, ['students', 'courses', 'calendar']);

        return true;
    }

    /**
     * 重做删除学生（再次删除学生和联动课程）
     */
    redoDeleteStudents(action) {
        if (!registry.get('state')) return false;

        const students = action.students || (action.student ? [action.student] : []);
        const courses = action.deletedCourses || [];

        if (!students.length && !courses.length) return false;

        const studentIds = new Set(students.map(s => s.id));
        const courseIds = new Set(courses.map(c => c.id));

        registry.get('setState')(draft => {
            draft.students = draft.students.filter(s => !studentIds.has(s.id));
            draft.courses = draft.courses.filter(c => !courseIds.has(c.id));
        }, ['students', 'courses', 'calendar']);

        return true;
    }

    /**
     * 撤销快照恢复（还原到快照恢复前的数据）
     */
    undoRestoreSnapshot(action) {
        if (!registry.get('state') || !action.previousData) return false;

        const prevData = action.previousData;

        registry.get('setState')(draft => {
            draft.students = prevData.students || [];
            draft.courses = prevData.courses || [];
            draft.organizations = prevData.organizations || [];
            draft.grades = prevData.grades || [];
            draft.organizationColors = prevData.organizationColors || {};
            draft.gradeColors = prevData.gradeColors || {};
            draft.lastupdated = prevData.lastupdated;
        }, ['students', 'courses', 'organizations', 'grades', 'organizationColors', 'gradeColors', 'calendar']);

        localStorage.setItem('coursemanagerdata', JSON.stringify(prevData));

        return true;
    }

    /**
     * 重做快照恢复（重新应用快照数据）
     */
    redoRestoreSnapshot(action) {
        if (!registry.get('state') || !action.snapshotData) return false;

        const snapData = action.snapshotData;

        registry.get('setState')(draft => {
            draft.students = snapData.students || [];
            draft.courses = snapData.courses || [];
            draft.organizations = snapData.organizations || [];
            draft.grades = snapData.grades || [];
            draft.organizationColors = snapData.organizationColors || {};
            draft.gradeColors = snapData.gradeColors || {};
            draft.lastupdated = snapData.lastupdated;
        }, ['students', 'courses', 'organizations', 'grades', 'organizationColors', 'gradeColors', 'calendar']);

        localStorage.setItem('coursemanagerdata', JSON.stringify(snapData));

        return true;
    }

    /**
     * 获取时间轴记录
     */
    async getTimeline() {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return [];
        return [...this.timeline];
    }

    /**
     * 清空时间轴
     */
    async clearTimeline() {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
        this.timeline = [];
        await this.saveTimeline();
    }

    /**
     * 切换聚合显示
     */
    async toggleExpand(actionId) {
        const isInitialized = await this.ensureUserInitialized();
        if (!isInitialized) return;
        
        const action = this.timeline.find(a => a.id === actionId);
        if (action && action.expanded !== undefined) {
            action.expanded = !action.expanded;
            await this.saveTimeline();
        }
    }
}

const timelineService = new TimelineService();
export default timelineService;