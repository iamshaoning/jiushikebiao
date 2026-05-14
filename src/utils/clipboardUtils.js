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
    
    pasteCourses: (dateStr) => {
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
                
                let addedCount = 0;
                let conflictCount = 0;
                let duplicateCount = 0;
                const coursesToAdd = [];
                
                courses.forEach(course => {
                    const isDuplicate = targetDateCourses.some(existingCourse => {
                        if (existingCourse.startTime !== course.startTime || 
                            existingCourse.duration !== course.duration || 
                            existingCourse.lessonType !== course.lessonType) {
                            return false;
                        }
                        
                        if (existingCourse.studentIds.length !== course.studentIds.length) {
                            return false;
                        }
                        
                        return course.studentIds.every(studentId => 
                            existingCourse.studentIds.includes(studentId)
                        );
                    }) || coursesToAdd.some(addedCourse => {
                        if (addedCourse.startTime !== course.startTime || 
                            addedCourse.duration !== course.duration || 
                            addedCourse.lessonType !== course.lessonType) {
                            return false;
                        }
                        
                        if (addedCourse.studentIds.length !== course.studentIds.length) {
                            return false;
                        }
                        
                        return course.studentIds.every(studentId => 
                            addedCourse.studentIds.includes(studentId)
                        );
                    });
                    
                    if (!isDuplicate) {
                        const newCourse = {
                            ...course,
                            id: registry.get('utils').generateId(),
                            date: dateStr,
                            createdAt: new Date().toISOString()
                        };
                        
                        let hasConflict = false;
                        
                        for (const existingCourse of targetDateCourses) {
                            const newStartMins = registry.get('utils').timeToMins(newCourse.startTime);
                            const newEndMins = newStartMins + Number(newCourse.duration || 120);

                            const existingStartMins = registry.get('utils').timeToMins(existingCourse.startTime);
                            const existingEndMins = existingStartMins + Number(existingCourse.duration || 120);
                            
                            if (Math.max(newStartMins, existingStartMins) < Math.min(newEndMins, existingEndMins)) {
                                hasConflict = true;
                                break;
                            }
                        }
                        
                        if (!hasConflict) {
                            for (const addedCourse of coursesToAdd) {
                                const newStartMins = registry.get('utils').timeToMins(newCourse.startTime);
                                const newEndMins = newStartMins + Number(newCourse.duration || 120);

                                const addedStartMins = registry.get('utils').timeToMins(addedCourse.startTime);
                                const addedEndMins = addedStartMins + Number(addedCourse.duration || 120);
                                
                                if (Math.max(newStartMins, addedStartMins) < Math.min(newEndMins, addedEndMins)) {
                                    hasConflict = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!hasConflict) {
                            coursesToAdd.push(newCourse);
                            addedCount++;
                        } else {
                            conflictCount++;
                        }
                    } else {
                        duplicateCount++;
                    }
                });
                
                if (coursesToAdd.length > 0) {
                    registry.get('setState')(draft => draft.courses.push(...coursesToAdd), 'courses');
                    
                    // 记录到时间轴
                    if (registry.get('timelineService')) {
                        registry.get('timelineService').recordPasteCourses(coursesToAdd);
                    }
                }
                
                if (addedCount > 0) {
                    if (conflictCount > 0 && duplicateCount > 0) {
                        registry.get('notificationService').show(`成功粘贴 ${addedCount} 节课程，${conflictCount} 节课程未能粘贴，${duplicateCount} 节课程已存在`, 'warning');
                    } else if (conflictCount > 0) {
                        registry.get('notificationService').show(`成功粘贴 ${addedCount} 节课程，${conflictCount} 节课程未能粘贴`, 'warning');
                    } else if (duplicateCount > 0) {
                        registry.get('notificationService').show(`成功粘贴 ${addedCount} 节课程，${duplicateCount} 节课程已存在`, 'warning');
                    } else {
                        registry.get('notificationService').show(`成功粘贴 ${addedCount} 节课程`, 'success');
                    }
                } else if (conflictCount > 0 && duplicateCount > 0) {
                    registry.get('notificationService').show('所有课程未能粘贴', 'warning');
                } else if (conflictCount > 0) {
                    registry.get('notificationService').show('所有课程未能粘贴', 'warning');
                } else if (duplicateCount > 0) {
                    registry.get('notificationService').show('所有课程已存在', 'warning');
                } else {
                    registry.get('notificationService').show('没有可粘贴的课程', 'warning');
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