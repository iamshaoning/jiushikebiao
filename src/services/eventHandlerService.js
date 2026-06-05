/**
 * 事件处理服务
 *
 * @description 注册并管理所有业务事件处理器（学生/课程/机构/年级/日历/UI 交互），由 eventDispatcherService 调起
 * @module eventHandlerService
 */
import { registry } from '../core/registry.js';

class EventHandlerService {
    constructor() {
        this.handlers = {};
        this._isSaving = false;
        this.initHandlers();
    }

    initHandlers() {
        this.handlers = {};
        Object.assign(this.handlers,
            this._setupStudentHandlers(),
            this._setupCourseHandlers(),
            this._setupAuthHandlers(),
            this._setupCalendarHandlers(),
            this._setupUIHandlers(),
            this._setupOrgGradeHandlers()
        );
    }

    _setupStudentHandlers() { return {
        'edit-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) registry.get('modalService').showEditStudent(s); },
        'delete-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) { const rc = registry.get('state').courses.filter(c => Array.isArray(c.studentIds) && c.studentIds.includes(s.id)); registry.get('modalService').showConfirm(`删除学生 <strong>${registry.get('utils').escapeHtml(s.name)}</strong> 后，相关的${rc.length}节课也将全部删除`, async () => { if (rc.length > 0) registry.get('timelineService').recordBatchDeleteCourses(rc.map(c => ({...c}))); const deleteIds = new Set(rc.map(r => r.id)); registry.get('setState')(d => { d.courses = d.courses.filter(c => !deleteIds.has(c.id)); d.students = d.students.filter(st => st.id !== s.id); }, ['students', 'courses']); await registry.get('utils').saveData(); registry.get('notificationService').show('学生删除成功', 'success'); }, 'delete'); } },
        'add-student-main': () => { registry.get('modalService').showAddStudent(); },
         'student-row-ctrl-click': (payload) => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const sid = payload.studentId;
            const row = document.querySelector(`[data-student-id="${CSS.escape(sid)}"]`);
            if (!row) return;
            if (ed._selectedStudentIds.has(sid)) {
                ed._selectedStudentIds.delete(sid);
                row.classList.remove('student-selected');
            } else {
                ed._selectedStudentIds.add(sid);
                row.classList.add('student-selected');
            }
            ed._updateStudentMultiSelectUI();
        },
        'students-multi-delete': () => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const selectedIds = ed.getSelectedStudentIds();
            if (!selectedIds.length) return;
            const state = registry.get('state');
            const affectedCourses = state.courses.filter(c => Array.isArray(c.studentIds) && c.studentIds.some(sid => selectedIds.includes(sid)));
            registry.get('modalService').showConfirm(
                `删除 <strong>${selectedIds.length}</strong> 位学生后，相关的 <strong>${affectedCourses.length}</strong> 节课也将全部删除。`,
                async () => {
                    if (affectedCourses.length > 0) registry.get('timelineService').recordBatchDeleteCourses(affectedCourses.map(c => ({...c})));
                    const deleteCourseIds = new Set(affectedCourses.map(c => c.id));
                    const deleteStudentIds = new Set(selectedIds);
                    registry.get('setState')(d => {
                        d.courses = d.courses.filter(c => !deleteCourseIds.has(c.id));
                        d.students = d.students.filter(st => !deleteStudentIds.has(st.id));
                    }, ['students', 'courses']);
                    ed.clearAllStudentSelections();
                    await registry.get('utils').saveData();
                    registry.get('notificationService').show(`已删除 ${selectedIds.length} 位学生`, 'success');
                },
                'delete'
            );
        },
        'students-multi-cancel': () => {
            const ed = registry.get('eventDispatcherService');
            if (ed) ed.clearAllStudentSelections();
        },
        'students-multi-edit': () => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const selectedIds = ed.getSelectedStudentIds();
            if (!selectedIds.length) return;
            registry.get('modalService').studentForm.showBatchEditStudents(Array.from(selectedIds));
        },
    };}

    /**
     * 根据选中元素数量更新浮动操作栏
     * @param {'course'|'cell'} type
     */
    _updateSelectedFab(type) {
        const isCourse = type === 'course';
        const sel = isCourse
            ? document.querySelectorAll('.course-tag-item.is-selected')
            : document.querySelectorAll('.calendar-cell-selected');
        const fab = document.getElementById('floating-action-bar');
        const fabContent = document.getElementById('floating-action-bar-content');
        if (!fab || !fabContent) return;

        if (sel.length === 0) {
            registry.get('modalService').closeAllPopovers();
            return;
        }
        if (sel.length === 1) {
            const id = isCourse
                ? (sel[0].dataset.courseId || sel[0].closest('[data-course-id]')?.dataset.courseId)
                : sel[0].dataset.date;
            if (id) {
                fabContent.innerHTML = isCourse
                    ? this._renderCourseActionButtons(registry.get('utils').escapeHtml(id))
                    : this._renderCellActionButtons(registry.get('utils').escapeHtml(id));
            }
        } else {
            const ids = Array.from(sel).map(el =>
                isCourse
                    ? (el.dataset.courseId || el.closest('[data-course-id]')?.dataset.courseId)
                    : el.dataset.date
            ).filter(Boolean);
            if (ids.length) {
                fabContent.innerHTML = isCourse
                    ? this._renderMultiCourseActionButtons(ids)
                    : this._renderMultiCellActionButtons(ids);
            }
        }
        fabContent.dataset.type = type;
        fab.classList.add('active');
        if (registry.get('lucide')) registry.get('lucide').createIcons();
    }

    /** 渲染机构/年级列表项HTML */
    _renderOrgGradeItem(item, itemName, ct) {
        const bc = registry.get('utils').generateColor(item, ct);
        const esc = registry.get('utils').escapeHtml(item);
        return `<div class="flex items-center justify-between p-2 rounded" style="background-color:var(--bg-secondary);" data-${itemName}="${esc}">
            <button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color:color-mix(in srgb,${bc} 20%,transparent);color:${bc};" data-item="${esc}" data-item-name="${itemName}" data-color="${bc}">${esc}</button>
            <div class="flex items-center">
                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${esc}">
                    <i data-lucide="square-pen" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-success)"></i>
                </button>
                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${esc}">
                    <i data-lucide="trash-2" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-danger)"></i>
                </button>
            </div>
        </div>`;
    }

    _setupCourseHandlers() { return {
        'edit-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('modalService').showEditCourse(c); },
        'copy-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('utils').copyCourses([c]); },
        'delete-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); registry.get('modalService').showConfirm('确定要删除这节课程吗？', async () => { if (c) registry.get('timelineService').recordDeleteCourse(c); registry.get('setState')(d => { d.courses = d.courses.filter(co => co.id !== p.id); }, 'courses'); await registry.get('utils').saveData(); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
        'course-click': (p, e) => { 
            const ci = e.target.closest('.course-tag-item'); 
            if (!ci) return;
            if (e && (e.ctrlKey || e.metaKey)) {
                ci.classList.toggle('is-selected');
                this._updateSelectedFab('course');
            } else {
                registry.get('modalService').closeAllPopovers();
                registry.get('utils').handleCourseClick(ci, p.courseId, e);
            }
        },
        'add-course': (p) => { if (p.date) registry.get('modalService').showAddCourse(p.date); },
        'copy-date': (p) => { registry.get('utils').copyCourses(registry.get('state').courses.filter(c => c.date === p.date)); },
        'paste-to-date': (p) => { registry.get('utils').pasteCourses(p.date); },
        'delete-date-courses': (p) => { const cs = registry.get('state').courses.filter(c => c.date === p.date); if (!cs.length) { registry.get('notificationService').show('该日期没有课程可删除', 'warning'); return; } registry.get('modalService').showConfirm(`确定要删除 ${p.date} 的全部课程吗？`, async () => { registry.get('timelineService').recordDeleteDayCourses(p.date, [...cs]); const deleteIds = new Set(cs.map(c => c.id)); registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses'); await registry.get('utils').saveData(); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
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
                            const conflictDates = [];
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
                                if (registry.get('utils').checkTimeConflict(newCourse)) {
                                    conflictDates.push(date);
                                } else {
                                    coursesToAdd.push(newCourse);
                                }
                            });
                            if (coursesToAdd.length > 0) {
                                try {
                                    registry.get('setState')(draft => { draft.courses.push(...coursesToAdd); }, 'courses');
                                    registry.get('timelineService').recordBatchAddCourses(coursesToAdd);
                                    await registry.get('utils').saveData();
                                    registry.get('modalService').hide();
                                    const formatDate = (d) => d.replace(/-/g, '');
                                    const successCount = coursesToAdd.length;
                                    if (conflictDates.length > 0) {
                                        registry.get('notificationService').show(`批量添加到${successCount}天成功`, 'success');
                                        registry.get('notificationService').show(`添加到以下日期失败：${[...new Set(conflictDates)].map(formatDate).join('、')}`, 'error');
                                    } else {
                                        registry.get('notificationService').show(`批量添加到${successCount}天成功`, 'success');
                                    }
                                } catch (error) {
                                    registry.get('errorHandlerService').log('error', '批量添加课程失败', error);
                                    registry.get('notificationService').show('批量添加课程失败', 'error');
                                    resetBtn();
                                }
                            } else {
                                registry.get('notificationService').show(`所有日期均存在时间冲突，未能添加`, 'warning');
                                resetBtn();
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
                const results = [];
                dates.forEach(date => {
                    const targetDateCourses = registry.get('state').courses.filter(c => c.date === date);
                    let added = 0, conflict = 0, dup = 0;
                    const dateToAdd = [];
                    courses.forEach(course => {
                        const isDup = targetDateCourses.some(ec => ec.startTime === course.startTime && ec.duration === course.duration && ec.lessonType === course.lessonType && JSON.stringify((ec.studentIds || []).slice().sort()) === JSON.stringify((course.studentIds || []).slice().sort()));
                        if (isDup) { dup++; return; }
                        const newCourse = { ...JSON.parse(JSON.stringify(course)), id: registry.get('utils').generateId(), date, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                        let hasConflict = false;
                        for (const ec of targetDateCourses) {
                            const ns = registry.get('utils').timeToMins(newCourse.startTime), ne = ns + Number(newCourse.duration ?? 120);
                            const es = registry.get('utils').timeToMins(ec.startTime), ee = es + Number(ec.duration ?? 120);
                            if (Math.max(ns, es) < Math.min(ne, ee)) { hasConflict = true; break; }
                        }
                        if (!hasConflict) {
                            for (const ac of dateToAdd) {
                                const ns = registry.get('utils').timeToMins(newCourse.startTime), ne = ns + Number(newCourse.duration ?? 120);
                                const as2 = registry.get('utils').timeToMins(ac.startTime), ae = as2 + Number(ac.duration ?? 120);
                                if (Math.max(ns, as2) < Math.min(ne, ae)) { hasConflict = true; break; }
                            }
                        }
                        if (hasConflict) { conflict++; } else { dateToAdd.push(newCourse); added++; }
                    });
                    allToAdd.push(...dateToAdd);
                    results.push({ date, added, conflict, dup });
                });
                if (allToAdd.length > 0) {
                    registry.get('setState')(draft => { draft.courses.push(...allToAdd); }, 'courses');
                    if (registry.get('timelineService')) registry.get('timelineService').recordBatchPasteCourses(allToAdd);
                    await registry.get('utils').saveData();
                }
                const successDates = results.filter(r => r.added > 0).map(r => r.date);
                const failDates = results.filter(r => r.added === 0 || r.conflict > 0 || r.dup > 0).map(r => r.date);
                const formatDate = (d) => d.replace(/-/g, '');
                if (successDates.length === 0) {
                    registry.get('notificationService').show('所有日期均未能粘贴', 'warning');
                } else if (failDates.length > 0) {
                    registry.get('notificationService').show(`批量粘贴到${successDates.length}天成功`, 'success');
                    registry.get('notificationService').show(`粘贴到以下日期部分或全部失败：${failDates.map(formatDate).join('、')}`, 'error');
                } else {
                    registry.get('notificationService').show(`批量粘贴到${successDates.length}天成功`, 'success');
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
                registry.get('timelineService').recordBatchDeleteDayCourses(dates, allCourses);
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
                registry.get('timelineService').recordBatchDeleteCourses(courses);
                registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses');
                await registry.get('utils').saveData();
                registry.get('notificationService').show(`已删除 ${courses.length} 节课程`, 'success');
            }, 'delete');
        },
    };}

    _setupAuthHandlers() { return {
        'show-login': () => { registry.get('authUIService').showAuthModal(); },
        'show-register': () => { registry.get('authUIService').showAuthModal(); const rt = document.getElementById('register-tab'); if (rt) rt.click(); },
        'logout': () => { registry.get('authUIService').logout(); },
        'navigate-home': () => { registry.get('router').navigate('/'); },
    };}

    _renderCellActionButtons(escapedDate) {
        return `<div data-action="add-course" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="plus" class="pointer-events-none inline-block"></i>添加</div><div data-action="copy-date" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-success)"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="paste-to-date" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-warning)"><i data-lucide="clipboard" class="pointer-events-none inline-block"></i>粘贴</div><div data-action="delete-date-courses" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>删除</div>`;
    }

    _renderMultiCellActionButtons(dates) {
        const datesAttr = dates.map(d => registry.get('utils').escapeHtml(d)).join(',');
        return `<div data-action="add-course-multi" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="plus" class="pointer-events-none inline-block"></i>批量添加</div><div data-action="copy-date" data-date="" class="fab-btn" style="background-color:var(--color-success);opacity:0.5;pointer-events:none"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="paste-to-dates" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-warning)"><i data-lucide="clipboard" class="pointer-events-none inline-block"></i>批量粘贴</div><div data-action="delete-date-courses-multi" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>批量删除</div>`;
    }

    _renderCourseActionButtons(escapedCourseId) {
        return `<div data-action="edit-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="square-pen" class="pointer-events-none inline-block"></i>编辑</div><div data-action="copy-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-success)"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="delete-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>删除</div>`;
    }

    _renderMultiCourseActionButtons(courseIds) {
        const idsAttr = courseIds.map(id => registry.get('utils').escapeHtml(id)).join(',');
        return `<div data-action="edit-course" data-id="" class="fab-btn" style="background-color:var(--color-primary);opacity:0.5;pointer-events:none"><i data-lucide="square-pen" class="pointer-events-none inline-block"></i>编辑</div><div data-action="copy-course" data-id="" class="fab-btn" style="background-color:var(--color-success);opacity:0.5;pointer-events:none"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="delete-courses-multi" data-ids="${idsAttr}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>批量删除</div>`;
    }

    _setupCalendarHandlers() { return {
        'prev-month': () => { const d = registry.get('state').currentDate; registry.get('state').currentDate = new Date(d.getFullYear(), d.getMonth() - 1, 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'next-month': () => { const d = registry.get('state').currentDate; registry.get('state').currentDate = new Date(d.getFullYear(), d.getMonth() + 1, 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'toggle-privacy': () => {
            const state = registry.get('state');
            state.privacyMode = !state.privacyMode;
            const btn = document.getElementById('toggle-privacy');
            if (btn) {
                if (state.privacyMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
            registry.get('render').calendar();
        },
        'calendar-cell-click': (p, e) => { if (e && e.button !== 0) return; if (e.target.closest('.course-tag-item')) return; if (e.target.closest('#floating-action-bar')) return; const cell = e.target.closest('.calendar-cell'); if (!cell) return; document.querySelectorAll('.calendar-cell-selected').forEach(c => c.classList.remove('calendar-cell-selected')); const ds = cell.dataset.date; cell.classList.add('calendar-cell-selected'); const fab = document.getElementById('floating-action-bar'); const fabContent = document.getElementById('floating-action-bar-content'); if (!fab || !fabContent) return; const prevType = fabContent.dataset.type; const isCrossType = prevType && prevType !== 'cell'; const showButtons = () => { fabContent.innerHTML = this._renderCellActionButtons(registry.get('utils').escapeHtml(ds)); fabContent.dataset.type = 'cell'; fab.classList.add('active'); if (registry.get('lucide')) registry.get('lucide').createIcons(); }; if (isCrossType) { setTimeout(showButtons, 180); } else { showButtons(); } },
        'calendar-cell-ctrl-click': (p, e) => { if (e && e.button !== 0) return; if (e.target.closest('.course-tag-item')) return; if (e.target.closest('#floating-action-bar')) return; const cell = e.target.closest('.calendar-cell'); if (!cell) return; cell.classList.toggle('calendar-cell-selected'); this._updateSelectedFab('cell'); },
        'calendar-cells-selected': (p, e) => { const dates = p.dates; if (!dates || dates.length === 0) return; const fab = document.getElementById('floating-action-bar'); const fabContent = document.getElementById('floating-action-bar-content'); if (!fab || !fabContent) return; fabContent.innerHTML = this._renderMultiCellActionButtons(dates); fabContent.dataset.type = 'cell'; fab.classList.add('active'); if (registry.get('lucide')) registry.get('lucide').createIcons(); },
    };}

    _setupUIHandlers() { return {
        'close-modal': () => { registry.get('modalService').hide(); },
        'toggle-duration-dropdown': (p, e) => { if (e.target.closest('#duration-dropdown')) return; const u = registry.get('utils'); const durEl = document.getElementById('course-duration'); if (durEl) durEl.select(); u.toggleDurationPicker('duration-dropdown'); },
        'select-duration': (p, e) => { const b = e.target.closest('[data-duration]'); if (!b) return; const d = parseInt(b.dataset.duration); if (isNaN(d)) return; const el = document.getElementById('course-duration'); if (el) el.value = d; const sti = document.getElementById('course-start-time'); const st = sti?.value || ''; const u = registry.get('utils'); if (st) u.calculateEndTime('course-start-time', 'course-end-time', d); u.calculateFee(); const dd = document.getElementById('duration-dropdown'); if (dd) dd.classList.add('hidden'); },
        'toggle-select': (p) => { const c = document.getElementById(p.selectWrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector('.custom-select-options'); if (!t || !o) return; document.querySelectorAll('.custom-select-options.open').forEach(oo => { if (oo !== o) { oo.classList.remove('open'); oo.parentElement.querySelector('.custom-select-trigger').classList.remove('active'); } }); o.classList.toggle('open'); t.classList.toggle('active'); },
        'select-option': (p) => { const c = document.getElementById(p.wrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector(`.custom-option[data-value="${CSS.escape(p.value)}"]`); if (!t || !o) return; (t.querySelector('span') || t).textContent = o.textContent; c.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); o.classList.add('selected'); c.querySelector('.custom-select-options')?.classList.remove('open'); t.classList.remove('active'); c.dispatchEvent(new CustomEvent('change', { detail: { value: p.value, text: o.textContent }, bubbles: true })); },
        'show-course-detail': (payload) => {
            const service = registry.get('statisticsRenderService');
            if (service) {
                service.showCourseDetail(payload, registry.get('utils'));
            }
        },
    };}

    _setupOrgGradeHandlers() { const self = this; return {
        'manage-organizations': () => { registry.get('modalService').showManageOrganizations(); },
        'manage-grades': () => { registry.get('modalService').showManageGrades(); },
        'edit-org-inline': (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; const el = e.target.closest(`[data-${itemName}]`); if (!el) return; const nip = document.getElementById(`new-${itemName}`), ab = document.getElementById(`add-${itemName}`); if (!nip || !ab) return; const oiv = nip.value; nip.value = item; nip.focus(); nip.select(); const obt = ab.textContent; ab.textContent = '保存'; ab.classList.remove('bg-primary'); ab.style.backgroundColor = 'var(--color-success)'; cfg.editingItem = { itemName, originalItem: item, itemElement: el, originalInputValue: oiv, originalBtnText: obt }; if (ab._originalClickHandler) ab.removeEventListener('click', ab._originalClickHandler); const cancelEdit = () => { nip.value = oiv; ab.textContent = obt; ab.style.backgroundColor = 'var(--color-primary)'; nip.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const beb = document.querySelector(`[data-action="add-org-inline"][data-item-name="${itemName}"]`); if (beb) beb.click(); } }; ab.onclick = ab._originalClickHandler || null; delete cfg.editingItem; }; ab.onclick = async (ev) => { ev.preventDefault(); ev.stopPropagation(); const nn = nip.value.trim(); if (!nn) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; } if (nn === item) { cancelEdit(); return; } if (cfg.items.includes(nn)) { registry.get('notificationService').show(`该${itemName}名称已存在`, 'warning'); return; } if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } self._isSaving = true; ab.disabled = true; nip.disabled = true; try { const idx = cfg.items.indexOf(item); if (cfg.editItem && idx !== -1) { const r = cfg.editItem(idx, nn); if (r === false) { cancelEdit(); return; } }; await registry.get('utils').saveData(); registry.get('notificationService').show(`${itemName}修改成功`, 'success'); if (cfg.updateUI) cfg.updateUI(); cancelEdit(); } catch (error) { registry.get('errorHandlerService').log('error', `${itemName}修改失败`, error); registry.get('notificationService').show(`${itemName}修改失败`, 'error'); cancelEdit(); } finally { self._isSaving = false; ab.disabled = false; nip.disabled = false; } }; nip.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); ab.click(); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cancelEdit(); } }; },
        'delete-org-inline': async (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } const ci = cfg.items.find(i => i === item || i === p[itemName]), di = ci || item; if (cfg.onDelete?.(di)) { registry.get('notificationService').show(`该${itemName}正在被使用，无法删除`, 'warning'); return; } self._isSaving = true; const ib = document.getElementById(`new-${itemName}`); if (ib) ib.disabled = true; const rowElem = e.target.closest(`[data-${itemName}]`); try { const idx = cfg.items.indexOf(di); if (idx !== -1) { cfg.deleteItem?.(di); await registry.get('utils').saveData(); if (rowElem) rowElem.remove(); registry.get('notificationService').show(`${itemName}删除成功`, 'success'); cfg.updateUI?.(); } } finally { self._isSaving = false; if (ib) { ib.disabled = false; ib.focus(); } } },
        'add-org-inline': async (p, e) => {
            const itemName = p.itemName;
            const nip = document.getElementById(`new-${itemName}`);
            const ab = document.getElementById(`add-${itemName}`);
            if (!nip || !registry.get('currentManagementModalConfig')) return;
            if (ab && !ab._originalClickHandler) ab._originalClickHandler = ab.onclick || function(){};
            if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; }
            const rawValue = nip.value.trim();
            if (!rawValue) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; }
            const cfg = registry.get('currentManagementModalConfig');
            const names = rawValue.split(/[，,、\s]+/).filter(n => n.trim());

            let addedCount = 0;
            const addedNames = [];
            self._isSaving = true;
            if (ab) ab.disabled = true;
            nip.disabled = true;
            try {
                const ct = itemName === '机构' ? 'organization' : 'grade';
                for (const ni of names) {
                    const trimmed = ni.trim();
                    if (cfg.items.includes(trimmed)) continue;
                    cfg.addItem(trimmed);
                    cfg.onAdd?.(trimmed);
                    addedCount++;
                    addedNames.push(trimmed);
                }
                if (addedCount === 0) {
                    registry.get('notificationService').show(`所有${itemName}名称已存在`, 'warning');
                    return;
                }
                await registry.get('utils').saveData();
                // Refresh the entire list UI by re-rendering the list
                const il = document.getElementById(`${itemName}s-list`);
                if (il) {
                    il.innerHTML = registry.get('state')[itemName === '机构' ? 'organizations' : 'grades'].map(item => this._renderOrgGradeItem(item, itemName, ct)).join('');
                    // Re-attach color picker listeners
                    if (registry.get('lucide')) registry.get('lucide').createIcons();
                    il.querySelectorAll(`.${itemName}-name.color-picker-trigger`).forEach(cpt => {
                        cpt.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            registry.get('modalService').showColorPicker({
                                itemName: cpt.dataset.item,
                                itemType: ct,
                                currentColor: cpt.dataset.color,
                                onSelect: (nc) => {
                                    registry.get('utils').setColor(cpt.dataset.item, nc, ct);
                                    cpt.style.backgroundColor = `color-mix(in srgb, ${nc} 20%, transparent)`;
                                    cpt.style.color = nc;
                                    cpt.dataset.color = nc;
                                    if (ct === 'organization') {
                                        registry.get('setState')(draft => {
                                            draft.courses.forEach(c => {
                                                if (Array.isArray(c.organizations)) c.organizations.forEach((o, i) => {
                                                    if (o === cpt.dataset.item && c.colors?.[i]) c.colors[i] = nc;
                                                });
                                            });
                                        }, ['courses', 'organizationColors']);
                                    }
                                    registry.get('utils').saveData().catch(err => { registry.get('errorHandlerService').log('error', '颜色保存失败', err); });
                                    registry.get('currentManagementModalConfig').updateUI?.();
                                }
                            });
                        });
                    });
                }
                nip.value = '';
                nip.focus();
                registry.get('notificationService').show(`成功添加 ${addedCount} 个${itemName}`, 'success');
                cfg.updateUI?.();
            } finally {
                self._isSaving = false;
                if (ab) ab.disabled = false;
                nip.disabled = false;
                nip.focus();
            }
        },
    };}
    
    handle(action, payload, e) {
        const h = this.handlers[action];
        if (h) {
            try {
                const result = h(payload, e);
                if (result && typeof result.catch === 'function') {
                    result.catch(error => {
                        registry.get('errorHandlerService').log('error', `处理事件 ${action} 失败`, error);
                        registry.get('notificationService').show('操作失败', 'error');
                    });
                }
            } catch (error) {
                registry.get('errorHandlerService').log('error', `处理事件 ${action} 失败`, error);
                registry.get('notificationService').show('操作失败', 'error');
            }
        }
    }
}

const eventHandlerService = new EventHandlerService();
export default eventHandlerService;
