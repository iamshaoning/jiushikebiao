/**
 * 课程表单模态框
 *
 * @description 添加/编辑课程的模态框逻辑，含学生选择、课型切换、时间冲突检查
 * @module courseFormModal
 */
import { registry } from '../../core/registry.js';
export class CourseFormModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    showAddCourse(date) {
        const content = registry.get('utils').getCourseFormTemplate(false, { date });

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                const addCourseForm = document.getElementById('add-course-form');
                if (addCourseForm) {
                    addCourseForm.replaceWith(addCourseForm.cloneNode(true));
                }

                registry.get('utils').initCourseFormEvents(false, { date });

                const freshForm = document.getElementById('add-course-form');
                if (freshForm) {
                    freshForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const saveCourseBtn = document.getElementById('add-course-save');
                        const resetSaveBtn = () => { if (saveCourseBtn) { saveCourseBtn.disabled = false; saveCourseBtn.textContent = '保存'; } };
                        if (saveCourseBtn?.disabled) return;
                        if (saveCourseBtn) { saveCourseBtn.disabled = true; saveCourseBtn.textContent = '保存中...'; }
                        const courseDate = document.getElementById('course-date')?.value;
                        const lessonTypeEl = document.querySelector('input[name="course-lesson-type"]:checked');
                        const lessonType = lessonTypeEl?.value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time')?.value;
                        const note = document.getElementById('course-note')?.value || '';

                        if (!courseDate) { registry.get('notificationService').show('请选择日期', 'warning'); resetSaveBtn(); return; }
                        if (!lessonType) { registry.get('notificationService').show('请选择课型', 'warning'); resetSaveBtn(); return; }
                        if (selectedStudents.length === 0) { registry.get('notificationService').show('请选择学生', 'warning'); resetSaveBtn(); return; }
                        if (!startTime) { registry.get('notificationService').show('请选择开始时间', 'warning'); resetSaveBtn(); return; }

                        // 多人课课时费必填
                        if (lessonType !== '一对一') {
                            const feeVal = parseFloat(document.getElementById('course-fee')?.value);
                            if (isNaN(feeVal) || feeVal <= 0) {
                                registry.get('notificationService').show('多人课请填写课时费', 'warning');
                                resetSaveBtn();
                                return;
                            }
                        }

                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        const newCourse = {
                            id: registry.get('utils').generateId(),
                            date: courseDate,
                            lessonType,
                            studentIds: selectedStudents.map(s => s.dataset.id),
                            studentNames: selectedStudents.map(s => s.dataset.name),
                            organizations: selectedStudents.map(s => s.dataset.organization),
                            colors: selectedStudents.map(s => s.dataset.color || 'var(--color-secondary)'),
                            startTime, duration,
                            fees: [fee], note,
                            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                        };

                        if (registry.get('utils').checkTimeConflict(newCourse)) {
                            registry.get('notificationService').show('该时间段已有课程安排', 'warning');
                            resetSaveBtn();
                            return;
                        }

                        try {
                        registry.get('setState')(draft => { draft.courses.push(newCourse); }, 'courses');
                        registry.get('timelineService').recordAddCourse(newCourse, false);
                        await registry.get('utils').saveData();
                        this.modal.hide();
                        registry.get('notificationService').show('课程添加成功', 'success');
                        } catch (error) { registry.get('errorHandlerService').log('error', '课程添加失败', error); registry.get('notificationService').show('课程添加失败', 'error'); resetSaveBtn(); }
                    });
                }
            }
        });
    }

    showEditCourse(course) {
        const content = registry.get('utils').getCourseFormTemplate(true, course);

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                const editCourseForm = document.getElementById('edit-course-form');
                if (editCourseForm) {
                    editCourseForm.replaceWith(editCourseForm.cloneNode(true));
                }

                registry.get('utils').initCourseFormEvents(true, course);

                const freshEditForm = document.getElementById('edit-course-form');
                if (freshEditForm) {
                    freshEditForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const saveCourseBtn = document.getElementById('save-course');
                        const resetSaveBtn = () => {
                            if (saveCourseBtn) { saveCourseBtn.disabled = false; saveCourseBtn.textContent = '保存'; }
                        };
                        const fail = (msg) => { registry.get('notificationService').show(msg, 'warning'); resetSaveBtn(); };
                        if (saveCourseBtn) {
                            saveCourseBtn.disabled = true;
                            saveCourseBtn.innerHTML = '<i data-lucide="loader-circle" class="inline-block animate-spin mr-2" style="width: 16px; height: 16px;"></i>保存中...';
                        }

                        const courseId = document.getElementById('edit-course-id')?.value;
                        const courseDate = document.getElementById('course-date')?.value;
                        const lessonTypeEl = document.querySelector('input[name="course-lesson-type"]:checked');
                        const lessonType = lessonTypeEl?.value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time')?.value;
                        const note = document.getElementById('course-note')?.value || '';

                        if (!courseDate) return fail('请选择日期');
                        if (!lessonType) return fail('请选择课型');
                        if (selectedStudents.length === 0) return fail('请选择学生');
                        if (!startTime) return fail('请选择开始时间');

                        // 多人课课时费必填
                        if (lessonType !== '一对一') {
                            const feeVal = parseFloat(document.getElementById('course-fee')?.value);
                            if (isNaN(feeVal) || feeVal <= 0) return fail('多人课请填写课时费');
                        }

                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        const updatedCourse = {
                            id: courseId, date: courseDate, lessonType,
                            studentIds: selectedStudents.map(s => s.dataset.id),
                            studentNames: selectedStudents.map(s => s.dataset.name),
                            organizations: selectedStudents.map(s => s.dataset.organization),
                            colors: selectedStudents.map(s => s.dataset.color || 'var(--color-secondary)'),
                            startTime, duration,
                            fees: [fee], note,
                            createdAt: course.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        if (registry.get('utils').checkTimeConflict(updatedCourse)) return fail('该时间段已有课程安排');

                        const courseIndex = registry.get('state').courses.findIndex(c => c.id === courseId);
                        if (courseIndex === -1) { resetSaveBtn(); registry.get('notificationService').show('课程不存在', 'error'); return; }

                        try {
                        const oldCourse = JSON.parse(JSON.stringify(registry.get('state').courses[courseIndex]));
                        registry.get('setState')(draft => { draft.courses[courseIndex] = updatedCourse; }, 'courses');
                        registry.get('timelineService').recordUpdateCourse(oldCourse, updatedCourse, '');
                        await registry.get('utils').saveData();
                        this.modal.hide();
                        registry.get('notificationService').show('课程编辑成功', 'success');
                        } catch (error) { registry.get('errorHandlerService').log('error', '课程编辑失败', error); registry.get('notificationService').show('课程编辑失败', 'error'); resetSaveBtn(); }
                    });
                }
            }
        });
    }
}
