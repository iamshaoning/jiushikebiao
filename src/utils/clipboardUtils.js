/**
 * 剪贴板工具
 *
 * @description 课程复制/粘贴功能，支持跨日期批量粘贴和时间偏移处理
 * @module clipboardUtils
 */
import { registry } from '../core/registry.js';

const clipboardUtils = {
    copyCourses: (courses) => {
        if (courses.length > 0) {
            localStorage.setItem('copiedCourses', JSON.stringify(courses));
            registry.get('notificationService').show(`已复制 ${courses.length} 节课程`, 'success');
        } else {
            registry.get('notificationService').show('该日期没有课程可复制', 'warning');
        }
    },
    
    pasteCourses: async (dateStr) => {
        const copiedCourses = localStorage.getItem('copiedCourses');
        if (copiedCourses) {
            try {
                const courses = JSON.parse(copiedCourses);
                
                if (!courses || courses.length === 0) {
                    registry.get('notificationService').show('没有可粘贴的课程', 'warning');
                    return;
                }
                
                const originalCourses = [...registry.get('state').courses];
                const targetDateCourses = originalCourses.filter(course => course.date === dateStr);
                
                const coursesToAdd = [];
                const conflicts = [];
                let duplicateCount = 0;
                
                courses.forEach(course => {
                    const isDuplicate = targetDateCourses.some(existingCourse => {
                        if (existingCourse.startTime !== course.startTime || 
                            existingCourse.duration !== course.duration || 
                            existingCourse.lessonType !== course.lessonType) {
                            return false;
                        }
                        
                        const existingIds = Array.isArray(existingCourse.studentIds) ? existingCourse.studentIds : [];
                        const courseIds = Array.isArray(course.studentIds) ? course.studentIds : [];
                        if (existingIds.length !== courseIds.length) {
                            return false;
                        }
                        
                        return courseIds.every(studentId => 
                            existingIds.includes(studentId)
                        );
                    }) || coursesToAdd.some(addedCourse => {
                        if (addedCourse.startTime !== course.startTime || 
                            addedCourse.duration !== course.duration || 
                            addedCourse.lessonType !== course.lessonType) {
                            return false;
                        }
                        
                        const addedIds = Array.isArray(addedCourse.studentIds) ? addedCourse.studentIds : [];
                        const courseIds = Array.isArray(course.studentIds) ? course.studentIds : [];
                        if (addedIds.length !== courseIds.length) {
                            return false;
                        }
                        
                        return courseIds.every(studentId => 
                            addedIds.includes(studentId)
                        );
                    });
                    
                    if (!isDuplicate) {
                        const newCourse = {
                            ...JSON.parse(JSON.stringify(course)),
                            id: registry.get('utils').generateId(),
                            date: dateStr,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        
                        // 查找冲突的课程
                        const conflictingCourses = [];
                        for (const existingCourse of targetDateCourses) {
                            const newStartMins = registry.get('utils').timeToMins(newCourse.startTime);
                            const newEndMins = newStartMins + Number(newCourse.duration ?? 120);
                            const existingStartMins = registry.get('utils').timeToMins(existingCourse.startTime);
                            const existingEndMins = existingStartMins + Number(existingCourse.duration ?? 120);
                            if (Math.max(newStartMins, existingStartMins) < Math.min(newEndMins, existingEndMins)) {
                                conflictingCourses.push(existingCourse);
                            }
                        }
                        
                        if (conflictingCourses.length > 0) {
                            conflicts.push({ newCourse, conflictingCourses });
                        } else {
                            // 检查与已加入队列的课程冲突
                            let hasConflictWithQueue = false;
                            for (const addedCourse of coursesToAdd) {
                                const newStartMins = registry.get('utils').timeToMins(newCourse.startTime);
                                const newEndMins = newStartMins + Number(newCourse.duration ?? 120);
                                const addedStartMins = registry.get('utils').timeToMins(addedCourse.startTime);
                                const addedEndMins = addedStartMins + Number(addedCourse.duration ?? 120);
                                if (Math.max(newStartMins, addedStartMins) < Math.min(newEndMins, addedEndMins)) {
                                    hasConflictWithQueue = true;
                                    break;
                                }
                            }
                            if (!hasConflictWithQueue) {
                                coursesToAdd.push(newCourse);
                            }
                        }
                    } else {
                        duplicateCount++;
                    }
                });

                const processResults = async ({ skipped, overridden }) => {
                    const deleteIds = new Set();
                    overridden.forEach(o => {
                        o.conflictingCourses.forEach(c => deleteIds.add(c.id));
                    });
                    if (deleteIds.size > 0) {
                        const deletedCourses = registry.get('state').courses.filter(c => deleteIds.has(c.id));
                        registry.get('historyService').recordBatchDeleteCourses(deletedCourses);
                    }
                    const overriddenCourses = overridden.map(o => o.newCourse);
                    const allCoursesToAdd = [...coursesToAdd, ...overriddenCourses];
                    
                    if (allCoursesToAdd.length > 0) {
                        registry.get('setState')(draft => {
                            draft.courses = draft.courses.filter(c => !deleteIds.has(c.id));
                            draft.courses.push(...allCoursesToAdd);
                        }, 'courses');
                        await registry.get('utils').saveData();
                        // 合并所有新增课程为一次历史记录，避免双重记录
                        registry.get('historyService').recordPasteCourses(allCoursesToAdd);
                        const skippedCount = skipped.length;
                        let msg = `成功粘贴 ${allCoursesToAdd.length} 节课程`;
                        if (skippedCount > 0) msg += `，跳过 ${skippedCount} 节`;
                        if (duplicateCount > 0) msg += `，${duplicateCount} 节已存在`;
                        registry.get('notificationService').show(msg, 'success');
                    } else {
                        registry.get('notificationService').show('所有课程均已跳过', 'warning');
                    }
                };

                if (conflicts.length > 0) {
                    registry.get('modalService').conflict.show({
                        conflicts,
                        isSingleAdd: false,
                        useNested: false,
                        onResolve: processResults
                    });
                } else if (coursesToAdd.length > 0) {
                    registry.get('setState')(draft => draft.courses.push(...coursesToAdd), 'courses');
                    await registry.get('utils').saveData();
                    if (registry.get('historyService')) {
                        registry.get('historyService').recordPasteCourses(coursesToAdd);
                    }
                    let msg = `成功粘贴 ${coursesToAdd.length} 节课程`;
                    if (duplicateCount > 0) msg += `，${duplicateCount} 节已存在`;
                    registry.get('notificationService').show(msg, 'success');
                } else {
                    registry.get('notificationService').show(duplicateCount > 0 ? '所有课程已存在' : '没有可粘贴的课程', 'warning');
                }
            } catch (error) {
                console.error('数据异常，操作失败:', error);
                registry.get('notificationService').show('数据异常，操作失败', 'error');
            }
        } else {
            registry.get('notificationService').show('没有可粘贴的课程', 'warning');
        }
    }
};

export { clipboardUtils };
export default clipboardUtils;