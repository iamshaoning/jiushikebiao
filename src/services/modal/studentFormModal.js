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
        const defDuration = student && student.fees && student.fees['一对一_duration'] ? student.fees['一对一_duration'] : 120;
        const defFee = student && student.fees ? (student.fees['一对一'] || 0) : 0;

        return `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">${title}</h3>
                    </div>
                    <form id="${formId}">
                        ${isEdit ? `<input type="hidden" id="${pfx}student-id" value="${student.id}">` : ''}
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名</label>
                            <input type="text" id="${pfx}student-name" class="w-full px-3 py-2 rounded-md" value="${isEdit ? (student.name || '') : ''}" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                        </div>
                        <div class="mb-4 flex space-x-4">
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">机构</label>
                                <div class="custom-select w-full" id="${pfx}student-organization-wrapper">
                                    <div class="custom-select-trigger" id="${pfx}student-organization-trigger" data-action="toggle-select" data-select-wrapper="${pfx}student-organization-wrapper">
                                        <span>${defOrg || '请选择机构'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="${pfx}student-organization-options">
                                        ${registry.get('state').organizations.map((org, i) => `<div class="custom-option ${(isEdit ? org === student.organization : i === 0) ? 'selected' : ''}" data-value="${org}">${org}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">年级</label>
                                <div class="custom-select w-full" id="${pfx}student-grade-wrapper">
                                    <div class="custom-select-trigger" id="${pfx}student-grade-trigger" data-action="toggle-select" data-select-wrapper="${pfx}student-grade-wrapper">
                                        <span>${defGrade || '请选择年级'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="${pfx}student-grade-options">
                                        ${registry.get('state').grades.map((g, i) => `<div class="custom-option ${(isEdit ? g === student.grade : i === 0) ? 'selected' : ''}" data-value="${g}">${g}</div>`).join('')}
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
                    const name = document.getElementById('student-name').value.trim();
                    const organization = document.querySelector('#student-organization-options .custom-option.selected')?.dataset.value;
                    const grade = document.querySelector('#student-grade-options .custom-option.selected')?.dataset.value;
                    const duration = parseInt(document.getElementById('duration-one-on-one').value) || 120;
                    const fee = parseFloat(document.getElementById('fee-one-on-one').value) || 0;

                    if (!name || !organization || !grade) {
                        registry.get('notificationService').show(!name ? '请输入学生姓名' : !organization ? '请选择机构' : '请选择年级', 'warning');
                        return;
                    }
                    registry.get('setState')(draft => { draft.students.push({
                        id: registry.get('utils').generateId(), name, organization, grade,
                        fees: { '一对一': fee, '一对一_duration': duration },
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                    }); }, 'students');
                    await registry.get('utils').saveData();
                    this.modal.hide();
                    registry.get('notificationService').show('学生添加成功', 'success');
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
                    const studentId = document.getElementById('edit-student-id').value;
                    const name = document.getElementById('edit-student-name').value.trim();
                    const organization = document.querySelector('#edit-student-organization-options .custom-option.selected')?.dataset.value;
                    const grade = document.querySelector('#edit-student-grade-options .custom-option.selected')?.dataset.value;
                    const duration = parseInt(document.getElementById('edit-duration-one-on-one').value) || 120;
                    const fee = parseFloat(document.getElementById('edit-fee-one-on-one').value) || 0;

                    if (!name || !organization || !grade) {
                        registry.get('notificationService').show(!name ? '请输入学生姓名' : !organization ? '请选择机构' : '请选择年级', 'warning');
                        return;
                    }
                    const studentIndex = registry.get('state').students.findIndex(s => s.id === studentId);
                    if (studentIndex === -1) { registry.get('notificationService').show('学生不存在', 'error'); return; }
                    const oldName = registry.get('state').students[studentIndex].name;

                    registry.get('setState')(draft => {
                        draft.students[studentIndex] = {
                            ...draft.students[studentIndex],
                            name, organization, grade,
                            fees: { '一对一': fee, '一对一_duration': duration },
                            updatedAt: new Date().toISOString()
                        };
                        draft.courses.forEach(course => {
                            if (course.studentNames && course.studentNames.includes(oldName)) {
                                const idx = course.studentNames.indexOf(oldName);
                                if (idx !== -1) course.studentNames[idx] = name;
                            }
                        });
                    });
                    await registry.get('utils').saveData();
                    this.modal.hide();
                    registry.get('notificationService').show('学生编辑成功', 'success');
                });
            }
        });
    }
}
