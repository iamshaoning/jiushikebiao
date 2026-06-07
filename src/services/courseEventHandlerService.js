/**
 * 课程事件处理服务
 *
 * @description 处理所有课程相关的事件，包括添加、编辑、删除、复制、粘贴、批量操作等
 * @module courseEventHandlerService
 */
import { registry } from '../core/registry.js';

class CourseEventHandlerService {
    constructor() {}

    /**
     * 返回课程事件处理器对象
     */
    setup() {
        return this._setupCourseHandlers();
    }

    _setupCourseHandlers() { return {
        'edit-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('modalService').showEditCourse(c); },
        'copy-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('utils').copyCourses([c]); },
        'delete-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); registry.get('modalService').showConfirm('确定要删除这节课程吗？', async () => { if (c) registry.get('historyService').recordDeleteCourse(c); registry.get('setState')(d => { d.courses = d.courses.filter(co => co.id !== p.id); }, 'courses'); await registry.get('utils').saveData(); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
        'course-click': (p, e) => { 
            const ci = e.target.closest('.course-tag-item'); 
            if (!ci) return;
            if (e && (e.ctrlKey || e.metaKey)) {
                ci.classList.toggle('is-selected');
                registry.get('fabHandlerService')._updateSelectedFab('course');
            } else {
                registry.get('modalService').closeAllPopovers();
                registry.get('utils').handleCourseClick(ci, p.courseId, e);
            }
        },
        'add-course': (p) => { if (p.date) registry.get('modalService').showAddCourse(p.date); },
        'copy-date': (p) => { registry.get('utils').copyCourses(registry.get('state').courses.filter(c => c.date === p.date)); },
        'paste-to-date': (p) => { registry.get('utils').pasteCourses(p.date); },
        'delete-date-courses': (p) => { const cs = registry.get('state').courses.filter(c => c.date === p.date); if (!cs.length) { registry.get('notificationService').show('该日期没有课程可删除', 'warning'); return; } registry.get('modalService').showConfirm(`确定要删除 ${p.date} 的全部课程吗？`, async () => { registry.get('historyService').recordDeleteDayCourses(p.date, [...cs]); const deleteIds = new Set(cs.map(c => c.id)); registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses'); await registry.get('utils').saveData(); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
        'course-time-change': () => { const u = registry.get('utils'); const d = document.getElementById('course-duration'); const dVal = d ? parseInt(d.value) || 120 : 120; u.calculateEndTime('course-start-time', 'course-end-time', dVal); u.calculateFee(); },
        'export-data': () => { registry.get('modalService').showConfirm('确定要导出课时统计数据吗？', () => { const u = registry.get('utils'); const { year, month, organization } = u.getStatisticsParams(); u.exportStatisticsData(year, month, organization); }, 'confirm'); },
        'add-course-multi': (p) => {
            const dates = p.dates ? p.dates.split(',') : [];
            if (!dates.length) return;
            const content = registry.get('utils').getCourseFormTemplate(false, { date: dates[0] });
            registry.get('modalService').show(content, {
                onShow: () => {
                    if (registry.get('lucide')) registry.get('lucide').createIcons();
                    const dateInput = document.getElementById('course-date');
                    if (dateInput) { dateInput.value = dates.join(', '); dateInput.readOnly = true; dateInput.style.opacity = '0.6'; dateInput.style.cursor = 'not-allowed'; }
                    const dpBtn = document.querySelector('[data-action="toggle-date-picker"]');
                    if (dpBtn) { dpBtn.style.opacity = '0.5'; dpBtn.style.pointerEvents = 'none'; }
                    const addCourseForm = document.getElementById('add-course-form');
                    if (addCourseForm) addCourseForm.replaceWith(addCourseForm.cloneNode(true));
                    registry.get('utils').initCourseFormEvents(false, { date: dates[0] });
                    const freshForm = document.getElementById('add-course-form');
                    if (freshForm) {
                        freshForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const saveBtn = document.getElementById('add-course-save');
                            const resetBtn = () => { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; } };
                            if (saveBtn?.disabled) return;
                            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }
                            const lessonTypeEl = document.querySelector('input[name="course-lesson-type"]:checked');
                            const lessonType = lessonTypeEl?.value;
                            const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                            const startTime = document.getElementById('course-start-time')?.value;
                            const note = document.getElementById('course-note')?.value || '';
                            if (!lessonType) { registry.get('notificationService').show('请选择课型', 'warning'); resetBtn(); return; }
                            if (selectedStudents.length === 0) { registry.get('notificationService').show('请选择学生', 'warning'); resetBtn(); return; }
                            if (!startTime) { registry.get('notificationService').show('请选择开始时间', 'warning'); resetBtn(); return; }
                            const duration = parseInt(document.getElementById('course-duration').value) || 120;
                            // 多人课课时费必填
                            if (lessonType !== '一对一') {
                                const feeVal = parseFloat(document.getElementById('course-fee')?.value);
                                if (isNaN(feeVal) || feeVal <= 0) {
                                    registry.get('notificationService').show('多人课请填写课时费', 'warning');
                                    resetBtn();
                                    return;
                                }
                            }
                            const feeInput = document.getElementById('course-fee');
                            const fee = parseFloat(feeInput?.value) || 0;
                            const coursesToAdd = [];
                            const conflicts = [];
                            dates.forEach(date => {
                                const newCourse = {
                                    id: registry.get('utils').generateId(), date, lessonType,
                                    studentIds: selectedStudents.map(s => s.dataset.id),
                                    studentNames: selectedStudents.map(s => s.dataset.name),
                                    organizations: selectedStudents.map(s => s.dataset.organization),
                                    colors: selectedStudents.map(s => s.dataset.color || 'var(--color-secondary)'),
                                    startTime, duration, fees: [fee], note,
                                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                                };
                                const conflictingCourses = registry.get('utils').findConflictingCourses(newCourse);
                                if (conflictingCourses.length > 0) {
                                    conflicts.push({ newCourse, conflictingCourses });
                                } else {
                                    coursesToAdd.push(newCourse);
                                }
                            });

                            const processAddResults = async ({ skipped, overridden }) => {
                                // 删除被覆盖的冲突课程
                                const deleteIds = new Set();
                                overridden.forEach(o => {
                                    o.conflictingCourses.forEach(c => deleteIds.add(c.id));
                                });
                                if (deleteIds.size > 0) {
                                    const deletedCourses = registry.get('state').courses.filter(c => deleteIds.has(c.id));
                                    registry.get('historyService').recordBatchDeleteCourses(deletedCourses);
                                }
                                // 添加未被跳过的课程
                                const overriddenCourses = overridden.map(o => o.newCourse);
                                const allToAdd = [...coursesToAdd, ...overriddenCourses];
                                if (allToAdd.length > 0) {
                                    try {
                                        registry.get('setState')(draft => {
                                            draft.courses = draft.courses.filter(c => !deleteIds.has(c.id));
                                            draft.courses.push(...allToAdd);
                                        }, 'courses');
                                        if (overriddenCourses.length > 0) {
                                            registry.get('historyService').recordBatchAddCourses(overriddenCourses);
                                        }
                                        if (coursesToAdd.length > 0) {
                                            registry.get('historyService').recordBatchAddCourses(coursesToAdd);
                                        }
                                        await registry.get('utils').saveData();
                                        registry.get('modalService').hide();
                                        const skippedCount = skipped.length;
                                        const addedCount = allToAdd.length;
                                        if (skippedCount > 0) {
                                            registry.get('notificationService').show(`批量添加成功 ${addedCount} 节，跳过 ${skippedCount} 节`, 'success');
                                        } else {
                                            registry.get('notificationService').show(`批量添加 ${addedCount} 节成功`, 'success');
                                        }
                                    } catch (error) {
                                        registry.get('errorHandlerService').log('error', '批量添加课程失败', error);
                                        registry.get('notificationService').show('批量添加课程失败', 'error');
                                    }
                                } else {
                                    registry.get('notificationService').show('所有冲突课程均已跳过', 'warning');
                                }
                                resetBtn();
                            };

                            if (conflicts.length > 0) {
                                registry.get('modalService').conflict.show({
                                    conflicts,
                                    isSingleAdd: false,
                                    onResolve: processAddResults
                                });
                            } else if (coursesToAdd.length > 0) {
                                try {
                                    registry.get('setState')(draft => { draft.courses.push(...coursesToAdd); }, 'courses');
                                    registry.get('historyService').recordBatchAddCourses(coursesToAdd);
                                    await registry.get('utils').saveData();
                                    registry.get('modalService').hide();
                                    registry.get('notificationService').show(`批量添加 ${coursesToAdd.length} 节成功`, 'success');
                                } catch (error) {
                                    registry.get('errorHandlerService').log('error', '批量添加课程失败', error);
                                    registry.get('notificationService').show('批量添加课程失败', 'error');
                                    resetBtn();
                                }
                            }
                        });
                    }
                }
            });
        },
        'paste-to-dates': async (p) => {
            const dates = p.dates ? p.dates.split(',') : [];
            if (!dates.length) return;
            const copiedCourses = localStorage.getItem('copiedCourses');
            if (!copiedCourses) { registry.get('notificationService').show('没有可粘贴的课程', 'warning'); return; }
            try {
                const courses = JSON.parse(copiedCourses);
                if (!courses || !courses.length) { registry.get('notificationService').show('没有可粘贴的课程', 'warning'); return; }
                const allToAdd = [];
                const conflicts = [];
                let dupCount = 0;
                dates.forEach(date => {
                    const targetDateCourses = registry.get('state').courses.filter(c => c.date === date);
                    courses.forEach(course => {
                        const isDup = targetDateCourses.some(ec => ec.startTime === course.startTime && ec.duration === course.duration && ec.lessonType === course.lessonType && JSON.stringify((ec.studentIds || []).slice().sort()) === JSON.stringify((course.studentIds || []).slice().sort()));
                        if (isDup) { dupCount++; return; }
                        const newCourse = { ...JSON.parse(JSON.stringify(course)), id: registry.get('utils').generateId(), date, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                        // 检查与已存在课程的冲突
                        const conflictingCourses = [];
                        for (const ec of targetDateCourses) {
                            const ns = registry.get('utils').timeToMins(newCourse.startTime), ne = ns + Number(newCourse.duration ?? 120);
                            const es = registry.get('utils').timeToMins(ec.startTime), ee = es + Number(ec.duration ?? 120);
                            if (Math.max(ns, es) < Math.min(ne, ee)) { conflictingCourses.push(ec); }
                        }
                        if (conflictingCourses.length > 0) {
                            conflicts.push({ newCourse, conflictingCourses });
                        } else {
                            // 检查与已加入队列的课程冲突
                            let hasConflictWithQueue = false;
                            for (const ac of allToAdd) {
                                if (ac.date !== date) continue;
                                const ns = registry.get('utils').timeToMins(newCourse.startTime), ne = ns + Number(newCourse.duration ?? 120);
                                const as2 = registry.get('utils').timeToMins(ac.startTime), ae = as2 + Number(ac.duration ?? 120);
                                if (Math.max(ns, as2) < Math.min(ne, ae)) { hasConflictWithQueue = true; break; }
                            }
                            if (!hasConflictWithQueue) allToAdd.push(newCourse);
                        }
                    });
                });

                const processPasteResults = async ({ skipped, overridden }) => {
                    const deleteIds = new Set();
                    overridden.forEach(o => {
                        o.conflictingCourses.forEach(c => deleteIds.add(c.id));
                    });
                    if (deleteIds.size > 0) {
                        const deletedCourses = registry.get('state').courses.filter(c => deleteIds.has(c.id));
                        registry.get('historyService').recordBatchDeleteCourses(deletedCourses);
                    }
                    const overriddenCourses = overridden.map(o => o.newCourse);
                    const allCoursesToAdd = [...allToAdd, ...overriddenCourses];
                    if (allCoursesToAdd.length > 0) {
                        registry.get('setState')(draft => {
                            draft.courses = draft.courses.filter(c => !deleteIds.has(c.id));
                            draft.courses.push(...allCoursesToAdd);
                        }, 'courses');
                        if (overriddenCourses.length > 0) {
                            registry.get('historyService').recordBatchPasteCourses(overriddenCourses);
                        }
                        if (allToAdd.length > 0) {
                            registry.get('historyService').recordBatchPasteCourses(allToAdd);
                        }
                        await registry.get('utils').saveData();
                        const skippedCount = skipped.length;
                        const addedCount = allCoursesToAdd.length;
                        let msg = `批量粘贴成功 ${addedCount} 节`;
                        if (skippedCount > 0) msg += `，跳过 ${skippedCount} 节`;
                        if (dupCount > 0) msg += `，忽略重复 ${dupCount} 节`;
                        registry.get('notificationService').show(msg, 'success');
                    } else {
                        registry.get('notificationService').show('所有冲突课程均已跳过', 'warning');
                    }
                };

                if (conflicts.length > 0) {
                    registry.get('modalService').conflict.show({
                        conflicts,
                        isSingleAdd: false,
                        useNested: false,
                        onResolve: processPasteResults
                    });
                } else if (allToAdd.length > 0) {
                    registry.get('setState')(draft => { draft.courses.push(...allToAdd); }, 'courses');
                    registry.get('historyService').recordBatchPasteCourses(allToAdd);
                    await registry.get('utils').saveData();
                    let msg = `批量粘贴成功 ${allToAdd.length} 节`;
                    if (dupCount > 0) msg += `，忽略重复 ${dupCount} 节`;
                    registry.get('notificationService').show(msg, 'success');
                } else {
                    registry.get('notificationService').show(dupCount > 0 ? '所有课程均为重复' : '未能粘贴', 'warning');
                }
            } catch (error) {
                registry.get('notificationService').show('数据异常，操作失败', 'error');
            }
        },
        'delete-date-courses-multi': (p) => {
            const dates = p.dates ? p.dates.split(',') : [];
            if (!dates.length) return;
            const allCourses = [];
            dates.forEach(date => { allCourses.push(...registry.get('state').courses.filter(c => c.date === date)); });
            if (!allCourses.length) { registry.get('notificationService').show('选中日期没有课程可删除', 'warning'); return; }
            registry.get('modalService').showConfirm(`确定要删除 ${dates.length} 天的全部课程（共 ${allCourses.length} 节）吗？`, async () => {
                const deleteIds = new Set(allCourses.map(c => c.id));
                registry.get('historyService').recordBatchDeleteDayCourses(dates, allCourses);
                registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses');
                await registry.get('utils').saveData();
                registry.get('notificationService').show(`已删除 ${dates.length} 天共 ${allCourses.length} 节课程`, 'success');
            }, 'delete');
        },
        'delete-courses-multi': (p) => {
            const ids = p.ids ? p.ids.split(',') : [];
            if (!ids.length) return;
            const courses = ids.map(id => registry.get('state').courses.find(c => c.id === id)).filter(Boolean);
            if (!courses.length) { registry.get('notificationService').show('未找到要删除的课程', 'warning'); return; }
            registry.get('modalService').showConfirm(`确定要删除选中的 ${courses.length} 节课程吗？`, async () => {
                const deleteIds = new Set(ids);
                registry.get('historyService').recordBatchDeleteCourses(courses);
                registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses');
                await registry.get('utils').saveData();
                registry.get('notificationService').show(`已删除 ${courses.length} 节课程`, 'success');
            }, 'delete');
        },
    };}
}

export default CourseEventHandlerService;