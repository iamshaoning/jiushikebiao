/**
 * 管理模态框
 *
 * @description 机构/年级的增删改管理界面，含颜色分配和关联数据级联更新
 * @module managementModal
 */
import { registry } from '../../core/registry.js';
export class ManagementModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    showManagementModal(config) {
        const { title, items, itemName, addItem, editItem, deleteItem, onDelete, updateUI } = config;
        const colorType = itemName === '机构' ? 'organization' : 'grade';

        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">${title}</h3>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">名称 <span class="text-xs font-normal" style="color: var(--text-secondary);">(支持批量添加，用空格/逗号/顿号分隔)</span></label>
                        <div class="flex items-center space-x-2">
                            <input type="text" id="new-${itemName}" class="flex-grow px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                            <button id="add-${itemName}" class="bg-primary text-white px-3 py-2 rounded-md" data-action="add-org-inline" data-item-name="${itemName}">添加</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium mb-2" style="color: var(--text-primary);">已有${itemName} <span class="text-xs font-normal" style="color: var(--text-secondary);">（点击名称可修改颜色）</span></h4>
                        <div id="${itemName}s-list" class="space-y-2 max-h-80 overflow-y-auto pr-2">
                            ${items.map(item => {
                                const bgColor = registry.get('utils').generateColor(item, colorType);
                                return `
                                <div class="flex items-center justify-between p-2 rounded" style="background-color: var(--bg-secondary);" data-${itemName}="${registry.get('utils').escapeHtml(item)}">
                                    <button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color: color-mix(in srgb, ${bgColor} 20%, transparent); color: ${bgColor};" data-item="${registry.get('utils').escapeHtml(item)}" data-item-name="${itemName}" data-color="${bgColor}">${registry.get('utils').escapeHtml(item)}</button>
                                    <div class="flex items-center">
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${registry.get('utils').escapeHtml(item)}">
                                            <i data-lucide="square-pen" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                                        </button>
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${registry.get('utils').escapeHtml(item)}">
                                            <i data-lucide="trash-2" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="button" class="close-modal text-white px-4 py-2 rounded-lg" style="background-color: var(--color-danger);">关闭</button>
                    </div>
                </div>
            </div>
        `;

        registry.set('currentManagementModalConfig', config);

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                document.querySelectorAll(`.${itemName}-name.color-picker-trigger`).forEach(trigger => {
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const item = trigger.dataset.item;
                        const currentColor = trigger.dataset.color;

                        this.modal.colorPicker.show({
                            itemName: item,
                            itemType: colorType,
                            currentColor: currentColor,
                            onSelect: (newColor) => {
                                registry.get('utils').setColor(item, newColor, colorType);
                                trigger.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`;
                                trigger.style.color = newColor;
                                trigger.dataset.color = newColor;

                                if (colorType === 'organization') {
                                    registry.get('setState')(draft => {
                                        draft.courses.forEach(course => {
                                            if (Array.isArray(course.organizations)) {
                                                course.organizations.forEach((org, idx) => {
                                                    if (org === item && course.colors && course.colors[idx]) {
                                                        course.colors[idx] = newColor;
                                                    }
                                                });
                                            }
                                        });
                                    }, ['courses', 'organizationColors']);
                                }
                                registry.get('utils').saveData().catch(err => { registry.get('errorHandlerService').log('error', '颜色保存失败', err); });
                                if (updateUI) updateUI();
                            }
                        });
                    });
                });
            }
        });

        setTimeout(() => {
            const newItemInput = document.getElementById(`new-${itemName}`);
            if (newItemInput) {
                newItemInput.focus();
                newItemInput.onkeydown = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        const addBtn = document.querySelector(`[data-action="add-org-inline"][data-item-name="${itemName}"]`);
                        if (addBtn) addBtn.click();
                    }
                };
            }
        }, 50);
    }

    _buildConfig(title, items, itemName, colorType) {
        const self = this;
        const attrKey = itemName === '机构' ? 'organization' : 'grade';
        const stateList = itemName === '机构' ? 'organizations' : 'grades';

        return {
            title, items, itemName,
            addItem: (val) => {
                registry.get('setState')(draft => { draft[stateList].push(val); }, [stateList, attrKey]);
                this._config.items = registry.get('state')[stateList];
                return true;
            },
            editItem: (index, newVal) => {
                const oldVal = this._config.items[index];
                if (!oldVal) return false;
                registry.get('utils').removeColorAssignment(oldVal, attrKey);
                const newColor = registry.get('utils').generateColor(newVal, attrKey);

                registry.get('setState')(draft => {
                    draft[stateList][index] = newVal;
                    if (itemName === '机构') {
                        draft.courses.forEach(course => {
                            if (!course.colors) course.colors = [];
                            if (Array.isArray(course.organizations)) {
                                course.organizations = course.organizations.map((o, idx) => {
                                    if (o === oldVal) { course.colors[idx] = newColor; return newVal; }
                                    return o;
                                });
                            } else if (course.studentIds) {
                                course.studentIds.forEach((studentId, idx) => {
                                    const student = draft.students.find(s => s.id === studentId);
                                    if (student && student.organization === oldVal) { course.colors[idx] = newColor; }
                                });
                            }
                        });
                    }
                    draft.students.forEach(student => {
                        const field = itemName === '机构' ? 'organization' : 'grade';
                        if (student[field] === oldVal) student[field] = newVal;
                    });
                }, itemName === '机构' ? ['organizations', 'courses', 'students', 'organizationColors'] : ['grades', 'students', 'gradeColors']);
                this._config.items[index] = newVal;

                const el = document.querySelector(`[data-${CSS.escape(itemName)}="${CSS.escape(oldVal)}"]`);
                if (el) {
                    const span = el.querySelector(`.${itemName}-name`);
                    if (span) { span.textContent = newVal; span.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`; span.style.color = newColor; }
                    el.dataset[itemName] = newVal;
                    const editBtn = el.querySelector('[data-action="edit-org-inline"]');
                    if (editBtn) editBtn.dataset.item = newVal;
                    const deleteBtn = el.querySelector('[data-action="delete-org-inline"]');
                    if (deleteBtn) deleteBtn.dataset.item = newVal;
                }
                return true;
            },
            deleteItem: (val) => {
                const idx = registry.get('state')[stateList].indexOf(val);
                if (idx !== -1) {
                    registry.get('utils').removeColorAssignment(val, attrKey);
                    registry.get('setState')(draft => {
                        draft[stateList].splice(idx, 1);
                    }, [stateList, attrKey]);
                    this._config.items = registry.get('state')[stateList];
                }
            },
            onDelete: (val) => {
                const field = itemName === '机构' ? 'organization' : 'grade';
                return registry.get('state').students.some(s => s[field] === val);
            },
            updateUI: () => { registry.get('render').students(); registry.get('render').calendar(); }
        };
    }

    showManageOrganizations() {
        this._config = this._buildConfig('机构管理', registry.get('state').organizations, '机构', 'organization');
        this.showManagementModal(this._config);
    }

    showManageGrades() {
        this._config = this._buildConfig('年级管理', registry.get('state').grades, '年级', 'grade');
        this.showManagementModal(this._config);
    }
}
