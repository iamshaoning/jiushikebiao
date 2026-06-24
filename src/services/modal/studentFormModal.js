/**
 * 学生表单模态框
 *
 * @description 添加/编辑学生的模态框逻辑，含机构/年级选择及预设课时费配置
 * @module studentFormModal
 */
import { registry } from '../../core/registry.js';
export class StudentFormModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    _renderForm(isEdit, student) {
        const pfx = isEdit ? 'edit-' : '';
        const formId = isEdit ? 'edit-student-form' : 'add-student-form';
        const title = isEdit ? '编辑学生' : '添加学生';
        const saveBtnId = isEdit ? 'edit-student-save' : 'add-student-save';
        const defOrg = student ? student.organization : registry.get('state').organizations[0];
        const defGrade = student ? student.grade : registry.get('state').grades[0];
        const defDuration = student && student.fees && student.fees['一对一_duration'] != null ? student.fees['一对一_duration'] : 120;
        const defFee = student && student.fees ? (student.fees['一对一'] ?? 0) : 0;

        return `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary); display: flex; align-items: center; gap: 6px;"><i data-lucide="${isEdit ? 'square-pen' : 'user-plus'}" class="inline-block" style="width: 18px; height: 18px;"></i>${title}</h3>
                    </div>
                    <form id="${formId}">
                        ${isEdit ? `<input type="hidden" id="${pfx}student-id" value="${student.id}">` : ''}
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名 <span class="text-xs font-normal" style="color: var(--text-secondary);">(支持批量添加，用空格/逗号/顿号分隔)</span></label>
                            <input type="text" id="${pfx}student-name" class="w-full px-3 py-2 rounded-md" value="${isEdit ? registry.get('utils').escapeHtml(student.name || '') : ''}" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                        </div>
                        <div class="mb-4 flex space-x-4">
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">机构</label>
                                <div class="custom-select w-full" id="${pfx}student-organization-wrapper">
                                    <div class="custom-select-trigger" id="${pfx}student-organization-trigger" data-action="toggle-select" data-select-wrapper="${pfx}student-organization-wrapper">
                                        <span>${registry.get('utils').escapeHtml(defOrg || '请选择机构')}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="${pfx}student-organization-options">
                                        ${registry.get('state').organizations.map((org, i) => `<div class="custom-option ${(isEdit ? org === student.organization : i === 0) ? 'selected' : ''}" data-value="${registry.get('utils').escapeHtml(org)}">${registry.get('utils').escapeHtml(org)}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">年级</label>
                                <div class="custom-select w-full" id="${pfx}student-grade-wrapper">
                                    <div class="custom-select-trigger" id="${pfx}student-grade-trigger" data-action="toggle-select" data-select-wrapper="${pfx}student-grade-wrapper">
                                        <span>${registry.get('utils').escapeHtml(defGrade || '请选择年级')}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="${pfx}student-grade-options">
                                        ${registry.get('state').grades.map((g, i) => `<div class="custom-option ${(isEdit ? g === student.grade : i === 0) ? 'selected' : ''}" data-value="${registry.get('utils').escapeHtml(g)}">${registry.get('utils').escapeHtml(g)}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">预设课时费</label>
                            <div class="flex items-center justify-between p-3 rounded-md" style="border: 1px solid var(--border-color);">
                                <span style="color: var(--text-primary);">一对一课型</span>
                                <div class="flex items-center">
                                    <span class="text-sm mr-2" style="color: var(--text-secondary);">每</span>
                                    <input type="number" id="${pfx}duration-one-on-one" min="1" value="${defDuration}" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="${pfx}fee-one-on-one" min="0" step="0.01" value="${defFee}" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                            <div class="mt-2 text-sm" style="color: var(--text-secondary);">多人课请在排课时定价</div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal text-white px-4 py-2 rounded-lg mr-2" style="background-color: var(--color-danger);">关闭</button>
                            <button type="submit" id="${saveBtnId}" class="bg-primary text-white px-4 py-2 rounded-lg">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    showAddStudent() {
        const content = this._renderForm(false);

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                const form = document.getElementById('add-student-form');
                if (!form) return;
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const saveStudentBtn = document.getElementById('add-student-save');
                    const resetSaveBtn = () => { if (saveStudentBtn) { saveStudentBtn.disabled = false; saveStudentBtn.textContent = '保存'; } };
                    if (saveStudentBtn?.disabled) return;
                    if (saveStudentBtn) { saveStudentBtn.disabled = true; saveStudentBtn.textContent = '保存中...'; }
                    const rawName = document.getElementById('student-name').value.trim();
                    const organization = document.querySelector('#student-organization-options .custom-option.selected')?.dataset.value;
                    const grade = document.querySelector('#student-grade-options .custom-option.selected')?.dataset.value;
                    const duration = parseInt(document.getElementById('duration-one-on-one').value) || 120;
                    const fee = parseFloat(document.getElementById('fee-one-on-one').value) || 0;

                    if (!rawName || !organization || !grade) {
                        registry.get('notificationService').show(!rawName ? '请输入学生姓名' : !organization ? '请选择机构' : '请选择年级', 'warning');
                        resetSaveBtn();
                        return;
                    }
                    // Batch add: split by comma, 顿号, or whitespace
                    const names = rawName.split(/[，,、\s]+/).filter(n => n.trim());
                    if (names.length === 0) {
                        registry.get('notificationService').show('请输入学生姓名', 'warning');
                        resetSaveBtn();
                        return;
                    }
                    try {
                        const newStudents = names.map(name => ({
                            id: registry.get('utils').generateId(), name: name.trim(), organization, grade,
                            fees: { '一对一': fee, '一对一_duration': duration },
                            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                        }));
                        registry.get('setState')(draft => { draft.students.push(...newStudents); }, 'students');
                        await registry.get('utils').saveData();
                        this.modal.hide();
                        registry.get('notificationService').show(`成功添加 ${names.length} 位学生`, 'success');
                    } catch (error) { registry.get('errorHandlerService').log('error', '学生添加失败', error); registry.get('notificationService').show('学生添加失败', 'error'); resetSaveBtn(); }
                });
            }
        });
    }

    showEditStudent(student) {
        const content = this._renderForm(true, student);

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                const nameEl = document.getElementById('edit-student-name');
                if (nameEl) nameEl.value = student.name;

                const form = document.getElementById('edit-student-form');
                if (!form) return;
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const saveStudentBtn = document.getElementById('edit-student-save');
                    const resetSaveBtn = () => { if (saveStudentBtn) { saveStudentBtn.disabled = false; saveStudentBtn.textContent = '保存'; } };
                    if (saveStudentBtn?.disabled) return;
                    if (saveStudentBtn) { saveStudentBtn.disabled = true; saveStudentBtn.textContent = '保存中...'; }
                    const studentId = document.getElementById('edit-student-id').value;
                    const name = document.getElementById('edit-student-name').value.trim();
                    const organization = document.querySelector('#edit-student-organization-options .custom-option.selected')?.dataset.value;
                    const grade = document.querySelector('#edit-student-grade-options .custom-option.selected')?.dataset.value;
                    const duration = parseInt(document.getElementById('edit-duration-one-on-one').value) || 120;
                    const fee = parseFloat(document.getElementById('edit-fee-one-on-one').value) || 0;

                    if (!name || !organization || !grade) {
                        registry.get('notificationService').show(!name ? '请输入学生姓名' : !organization ? '请选择机构' : '请选择年级', 'warning');
                        resetSaveBtn();
                        return;
                    }
                    const studentIndex = registry.get('state').students.findIndex(s => s.id === studentId);
                    if (studentIndex === -1) { registry.get('notificationService').show('学生不存在', 'error'); resetSaveBtn(); return; }

                    try {
                    registry.get('setState')(draft => {
                        draft.students[studentIndex] = {
                            ...draft.students[studentIndex],
                            name, organization, grade,
                            fees: { '一对一': fee, '一对一_duration': duration },
                            updatedAt: new Date().toISOString()
                        };
                        draft.courses.forEach(course => {
                            if (course.studentIds) {
                                const idx = course.studentIds.indexOf(studentId);
                                if (idx !== -1) {
                                    if (course.studentNames) course.studentNames[idx] = name;
                                    if (course.organizations) course.organizations[idx] = organization;
                                    if (course.colors) course.colors[idx] = registry.get('utils').generateColor(organization, 'organization');
                                }
                            }
                        });
                    }, ['students', 'courses']);
                    await registry.get('utils').saveData();
                    this.modal.hide();
                    registry.get('notificationService').show('学生编辑成功', 'success');
                    } catch (error) { registry.get('errorHandlerService').log('error', '学生编辑失败', error); registry.get('notificationService').show('学生编辑失败', 'error'); resetSaveBtn(); }
                });
            }
        });
    }

    showBatchEditStudents(studentIds) {
        const state = registry.get('state');
        const students = studentIds.map(id => state.students.find(s => s.id === id)).filter(Boolean);
        if (students.length === 0) return;

        // Use the first student's org/grade as default, but form fields are for all
        const defOrg = students[0].organization;
        const defGrade = students[0].grade;

        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary); display: flex; align-items: center; gap: 6px;"><i data-lucide="pencil" class="inline-block" style="width: 18px; height: 18px;"></i>批量编辑学生</h3>
                        <p class="text-xs mt-1" style="color: var(--text-secondary);">将新数据应用到已选择的 ${students.length} 位学生</p>
                    </div>
                    <form id="batch-edit-student-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名（不可编辑）</label>
                            <input type="text" class="w-full px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); color: var(--text-secondary); background-color: var(--bg-content);" value="${students.map(s => registry.get('utils').escapeHtml(s.name)).join('、')}" disabled>
                        </div>
                        <div class="mb-4 flex space-x-4">
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">机构</label>
                                <div class="custom-select w-full" id="batch-student-organization-wrapper">
                                    <div class="custom-select-trigger" id="batch-student-organization-trigger" data-action="toggle-select" data-select-wrapper="batch-student-organization-wrapper">
                                        <span>不修改</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="batch-student-organization-options">
                                        <div class="custom-option selected" data-value="">不修改</div>
                                        ${registry.get('state').organizations.map(org => `<div class="custom-option" data-value="${registry.get('utils').escapeHtml(org)}">${registry.get('utils').escapeHtml(org)}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">年级</label>
                                <div class="custom-select w-full" id="batch-student-grade-wrapper">
                                    <div class="custom-select-trigger" id="batch-student-grade-trigger" data-action="toggle-select" data-select-wrapper="batch-student-grade-wrapper">
                                        <span>不修改</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="batch-student-grade-options">
                                        <div class="custom-option selected" data-value="">不修改</div>
                                        ${registry.get('state').grades.map(g => `<div class="custom-option" data-value="${registry.get('utils').escapeHtml(g)}">${registry.get('utils').escapeHtml(g)}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">预设课时费</label>
                            <div class="flex items-center justify-between p-3 rounded-md" style="border: 1px solid var(--border-color);">
                                <span style="color: var(--text-primary);">一对一课型</span>
                                <div class="flex items-center">
                                    <span class="text-sm mr-2" style="color: var(--text-secondary);">每</span>
                                    <input type="number" id="batch-duration-one-on-one" min="1" placeholder="不修改" class="w-12 px-2 py-1 rounded-md appearance-none text-[10px] placeholder:text-[10px]" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="batch-fee-one-on-one" min="0" step="0.01" placeholder="不修改" class="w-12 px-2 py-1 rounded-md appearance-none text-[10px] placeholder:text-[10px]" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal text-white px-4 py-2 rounded-lg mr-2" style="background-color: var(--color-danger);">关闭</button>
                            <button type="submit" id="batch-student-save" class="bg-primary text-white px-4 py-2 rounded-lg">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                const form = document.getElementById('batch-edit-student-form');
                if (!form) return;
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const saveBtn = document.getElementById('batch-student-save');
                    const resetSaveBtn = () => { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; } };
                    if (saveBtn?.disabled) return;
                    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }

                    const organization = document.querySelector('#batch-student-organization-options .custom-option.selected')?.dataset.value || '';
                    const grade = document.querySelector('#batch-student-grade-options .custom-option.selected')?.dataset.value || '';
                    const durationVal = document.getElementById('batch-duration-one-on-one')?.value;
                    const feeVal = document.getElementById('batch-fee-one-on-one')?.value;
                    const duration = durationVal ? (parseInt(durationVal) || 120) : null;
                    const fee = feeVal ? (parseFloat(feeVal) || 0) : null;

                    if (!organization && !grade && duration === null && fee === null) {
                        registry.get('notificationService').show('没有选择要修改的项', 'warning');
                        resetSaveBtn();
                        return;
                    }

                    try {
                        registry.get('setState')(draft => {
                            draft.students.forEach(s => {
                                if (!studentIds.includes(s.id)) return;
                                if (organization) s.organization = organization;
                                if (grade) s.grade = grade;
                                if (duration !== null || fee !== null) {
                                    const newFees = { ...s.fees };
                                    if (duration !== null) newFees['一对一_duration'] = duration;
                                    if (fee !== null) newFees['一对一'] = fee;
                                    s.fees = newFees;
                                }
                                s.updatedAt = new Date().toISOString();
                            });
                            draft.courses.forEach(course => {
                                if (!course.studentIds) return;
                                course.studentIds.forEach((sid, idx) => {
                                    if (!studentIds.includes(sid)) return;
                                    const s = draft.students.find(st => st.id === sid);
                                    if (!s) return;
                                    if (organization) {
                                        if (course.organizations) course.organizations[idx] = organization;
                                        if (course.colors) course.colors[idx] = registry.get('utils').generateColor(organization, 'organization');
                                    }
                                });
                            });
                        }, ['students', 'courses']);
                        await registry.get('utils').saveData();
                        this.modal.hide();
                        registry.get('eventDispatcherService')?.clearAllStudentSelections();
                        registry.get('notificationService').show(`已批量更新 ${students.length} 位学生`, 'success');
                    } catch (error) {
                        registry.get('errorHandlerService').log('error', '批量编辑失败', error);
                        registry.get('notificationService').show('批量编辑失败', 'error');
                        resetSaveBtn();
                    }
                });
            }
        });
    }
}
