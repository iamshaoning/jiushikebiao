import modalService from './modalService.js';
import notificationService from './notificationService.js';

/**
 * 事件处理器服务
 * 管理所有事件处理函数，包括学生管理、课程操作、机构/年级管理等
 * 
 * @class EventHandlerService
 * @exports EventHandlerService
 * @exports eventHandlerService
 */
class EventHandlerService {
    constructor() {
        this.handlers = {};
        this.initHandlers();
    }
    
    initHandlers() {
        this.handlers = {
            'edit-student': (payload, e) => {
                const student = window.state.students.find(s => s.id === payload.id);
                if (student) {
                    modalService.showEditStudent(student);
                }
            },
            
            'delete-student': (payload, e) => {
                const student = window.state.students.find(s => s.id === payload.id);
                if (student) {
                    const relatedCourses = window.state.courses.filter(course => {
                        if (course.studentIds && Array.isArray(course.studentIds)) {
                            return course.studentIds.includes(student.id);
                        }
                        return false;
                    });
                    const courseCount = relatedCourses.length;
                    modalService.showConfirm(
                        `删除学生 <strong>${window.utils.escapeHtml(student.name)}</strong> 后，相关的${courseCount}节课也将全部删除，确定吗？`,
                        async () => {
                            // 删除相关课程
                            relatedCourses.forEach(course => {
                                const idx = window.state.courses.findIndex(c => c.id === course.id);
                                if (idx !== -1) {
                                    window.state.courses.splice(idx, 1);
                                }
                            });
                            
                            // 删除学生
                            const studentIndex = window.state.students.findIndex(s => s.id === student.id);
                            if (studentIndex !== -1) {
                                window.state.students.splice(studentIndex, 1);
                            }
                            
                            // 设置同步状态并保存
                            if (window.serverStatusService) {
                                window.serverStatusService.setSyncing();
                            }
                            await window.utils.saveData();
                            
                            // 刷新视图
                            window.utils.refreshAllViews();
                            
                            // 显示成功提示
                            window.notificationService.show('学生删除成功', 'success');
                        },
                        'delete'
                    );
                }
            },
            
            'close-modal': () => {
                modalService.hide();
            },
            
            'toggle-duration-dropdown': (payload, e) => {
                const dropdownElement = e.target.closest('#duration-dropdown');
                if (dropdownElement) return;
                
                const utils = window.utils;
                utils.safe(window.elements.courseDuration, 'select');
                
                if (typeof utils.toggleDurationPicker === 'function') {
                    utils.toggleDurationPicker('duration-dropdown');
                }
            },
            
            'select-duration': (payload, e) => {
                const btn = e.target.closest('[data-duration]');
                if (!btn) return;
                
                const duration = parseInt(btn.dataset.duration);
                if (isNaN(duration)) return;
                
                const courseDuration = document.getElementById('course-duration');
                if (courseDuration) {
                    courseDuration.value = duration;
                }
                
                const courseStartTime = document.getElementById('course-start-time');
                const startTime = courseStartTime ? courseStartTime.value : '';
                const utils = window.utils;
                if (startTime && typeof utils.calculateEndTime === 'function') {
                    utils.calculateEndTime('course-start-time', 'course-end-time', duration);
                }
                
                if (typeof utils.calculateFee === 'function') {
                    utils.calculateFee();
                }
                
                const durationDropdown = document.getElementById('duration-dropdown');
                if (durationDropdown) {
                    durationDropdown.classList.add('hidden');
                }
            },
            
            'show-login': () => {
                if (window.authUIService?.showAuthModal) {
                    window.authUIService.showAuthModal();
                }
            },

            'show-register': () => {
                if (window.authUIService?.showAuthModal) {
                    window.authUIService.showAuthModal();
                    const registerTab = document.getElementById('register-tab');
                    if (registerTab) {
                        registerTab.click();
                    }
                }
            },

            'logout': () => {
                if (window.authUIService?.logout) {
                    window.authUIService.logout();
                }
            },

            'navigate-home': () => {
                if (window.routerService) {
                    window.routerService.navigate('/');
                }
            },
            
            'export-data': () => {
                modalService.showConfirm('确定要导出课时统计数据吗？', () => {
                    const utils = window.utils;
                    const { year, month, organization } = utils.getStatisticsParams();
                    utils.exportStatisticsData(year, month, organization);
                }, 'confirm');
            },
            
            'check-sync': () => {
                if (window.serverStatusService) {
                    window.serverStatusService.monitorServerStatus();
                }
            },
            
            'prev-month': () => {
                window.state.currentDate.setMonth(window.state.currentDate.getMonth() - 1);
                if (typeof window.utils.generateYearDropdowns === 'function') {
                    window.utils.generateYearDropdowns();
                }
                if (typeof window.utils.generateMonthDropdowns === 'function') {
                    window.utils.generateMonthDropdowns();
                }
                window.render.calendar();
            },
            
            'next-month': () => {
                window.state.currentDate.setMonth(window.state.currentDate.getMonth() + 1);
                if (typeof window.utils.generateYearDropdowns === 'function') {
                    window.utils.generateYearDropdowns();
                }
                if (typeof window.utils.generateMonthDropdowns === 'function') {
                    window.utils.generateMonthDropdowns();
                }
                window.render.calendar();
            },
            
            'add-student-main': () => {
                modalService.showAddStudent();
            },
            
            'manage-organizations': () => {
                modalService.showManageOrganizations();
            },
            
            'manage-grades': () => {
                modalService.showManageGrades();
            },
            
            'toggle-select': (payload) => {
                const { selectWrapper } = payload;
                const container = document.getElementById(selectWrapper);
                if (!container) return;

                const trigger = container.querySelector('.custom-select-trigger');
                const options = container.querySelector('.custom-select-options');
                if (!trigger || !options) return;

                document.querySelectorAll('.custom-select-options.open').forEach(otherOptions => {
                    if (otherOptions !== options) {
                        otherOptions.classList.remove('open');
                        otherOptions.parentElement.querySelector('.custom-select-trigger').classList.remove('active');
                    }
                });

                options.classList.toggle('open');
                trigger.classList.toggle('active');
            },
            
            'select-option': (payload) => {
                const { value, wrapper: selectWrapper } = payload;
                const container = document.getElementById(selectWrapper);
                if (!container) return;

                const trigger = container.querySelector('.custom-select-trigger');
                const option = container.querySelector(`.custom-option[data-value="${value}"]`);
                if (!trigger || !option) return;

                const triggerSpan = trigger.querySelector('span') || trigger;
                triggerSpan.textContent = option.textContent;

                container.querySelectorAll('.custom-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');

                container.querySelector('.custom-select-options')?.classList.remove('open');
                trigger.classList.remove('active');

                container.dispatchEvent(new CustomEvent('change', {
                    detail: { value, text: option.textContent },
                    bubbles: true
                }));
            },
            
            'course-time-change': () => {
                const utils = window.utils;
                const duration = utils.safe(window.elements.courseDuration, 'value') ? 
                    parseInt(utils.safe(window.elements.courseDuration, 'value')) : 120;

                if (typeof utils.calculateEndTime === 'function') {
                    utils.calculateEndTime('course-start-time', 'course-end-time', duration);
                }
                if (typeof utils.calculateFee === 'function') {
                    utils.calculateFee();
                }
            },
            
            'calendar-cell-click': (payload, e) => {
                if (e && e.button !== 0) {
                    return;
                }
                
                const courseItem = e.target.closest('.course-tag-item');
                if (courseItem) {
                    return;
                }
                
                const currentCell = e.target.closest('.calendar-cell');
                if (!currentCell) return;
                
                const currentDateStr = currentCell.dataset.date;

                currentCell.classList.add('calendar-cell-selected');

                const btnGroup = document.createElement('div');
                btnGroup.className = 'cell-action-group flex items-center space-x-2 transform translate-y-full opacity-0 transition-all duration-300';
                btnGroup.style.position = 'absolute';
                btnGroup.style.bottom = '4px';
                btnGroup.style.left = '50%';
                btnGroup.style.transform = 'translate(-50%, 100%)';
                btnGroup.style.zIndex = '10';

                const escapedDateStr = window.utils.escapeHtml(currentDateStr);
                btnGroup.innerHTML = `
                    <div data-action="add-course" data-date="${escapedDateStr}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color: var(--color-primary);">
                        <i data-lucide="plus" class="text-base pointer-events-none inline-block" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div data-action="copy-date" data-date="${escapedDateStr}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color: var(--color-success);">
                        <i data-lucide="copy" class="text-base pointer-events-none inline-block" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div data-action="paste-to-date" data-date="${escapedDateStr}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color: var(--color-warning);">
                        <i data-lucide="clipboard" class="text-base pointer-events-none inline-block" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div data-action="delete-date-courses" data-date="${escapedDateStr}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color: var(--color-danger);">
                        <i data-lucide="trash-2" class="text-base pointer-events-none inline-block" style="width: 16px; height: 16px;"></i>
                    </div>
                `;

                currentCell.style.position = 'relative';
                currentCell.appendChild(btnGroup);

                if (window.lucide) {
                    lucide.createIcons();
                }

                setTimeout(() => {
                    btnGroup.style.transform = 'translate(-50%, 0)';
                    btnGroup.style.opacity = '1';
                }, 10);
            },
            
            'add-course': (payload, e) => {
                const date = payload.date;
                if (!date) return;
                
                modalService.showAddCourse(date);
            },
            
            'copy-date': (payload) => {
                const date = payload.date;
                const utils = window.utils;
                const courses = window.state.courses.filter(c => c.date === date);
                utils.copyCourses(courses);
            },
            
            'paste-to-date': (payload) => {
                const date = payload.date;
                const utils = window.utils;
                utils.pasteCourses(date);
            },
            
            'delete-date-courses': (payload, e) => {
                const date = payload.date;
                const courses = window.state.courses.filter(c => c.date === date);
                
                if (courses.length === 0) {
                    notificationService.show('该日期没有课程可删除', 'warning');
                    return;
                }
                
                modalService.showConfirm(`确定要删除 ${date} 的全部课程吗？`, () => {
                    // 记录到时间轴
                    if (window.timelineService && courses.length > 0) {
                        window.timelineService.recordDeleteDayCourses(date, [...courses]);
                    }
                    
                    courses.forEach(course => {
                        window.setState(draft => {
                            const index = draft.courses.findIndex(c => c.id === course.id);
                            if (index !== -1) {
                                draft.courses.splice(index, 1);
                            }
                        }, 'courses');
                    });
                    notificationService.show('课程已删除', 'success');
                }, 'delete');
            },
            
            'edit-course': (payload) => {
                const courseId = payload.id;
                const course = window.state.courses.find(c => c.id === courseId);
                if (course) {
                    modalService.showEditCourse(course);
                }
            },
            
            'copy-course': (payload) => {
                const courseId = payload.id;
                const course = window.state.courses.find(c => c.id === courseId);
                if (course) {
                    window.utils.copyCourses([course]);
                }
            },
            
            'delete-course': (payload) => {
                const courseId = payload.id;
                const courseToDelete = window.state.courses.find(c => c.id === courseId);
                
                modalService.showConfirm('确定要删除这节课程吗？', () => {
                    // 记录到时间轴
                    if (window.timelineService && courseToDelete) {
                        window.timelineService.recordDeleteCourse(courseToDelete);
                    }
                    
                    window.setState(draft => {
                        draft.courses = draft.courses.filter(c => c.id !== courseId);
                    }, 'courses');
                    notificationService.show('课程已删除', 'success');
                }, 'delete');
            },
            
            'course-click': (payload, e) => {
                const courseId = payload.courseId;
                const courseItem = e.target.closest('.course-tag-item');
                
                if (courseItem) {
                    modalService.closeAllPopovers();
                    if (window.render?.handleCourseClick) {
                        window.render.handleCourseClick(courseItem, courseId, e);
                    }
                }
            },
            
            'edit-org-inline': (payload, e) => {
                const itemName = payload.itemName;
                const item = payload.item;

                const currentManagementModalConfig = window.currentManagementModalConfig;
                if (!currentManagementModalConfig) return;
                
                // 找到对应的item元素
                const itemElement = e.target.closest(`[data-${itemName}]`);
                if (!itemElement) return;
                
                // 找到顶部输入框和添加按钮
                const newItemInput = document.getElementById(`new-${itemName}`);
                const addBtn = document.getElementById(`add-${itemName}`);
                
                if (!newItemInput || !addBtn) return;
                
                // 保存原始输入框值
                const originalInputValue = newItemInput.value;
                
                // 将条目文本提取到输入框中
                newItemInput.value = item;
                newItemInput.focus();
                newItemInput.select();
                
                // 保存原始按钮文本
                const originalBtnText = addBtn.textContent;
                
                // 将添加按钮变为保存按钮
                addBtn.textContent = '保存';
                addBtn.classList.remove('bg-primary');
                addBtn.style.backgroundColor = 'var(--color-success)';
                
                // 保存当前编辑的项目信息
                currentManagementModalConfig.editingItem = {
                    itemName,
                    originalItem: item,
                    itemElement,
                    originalInputValue,
                    originalBtnText
                };
                
                // 移除添加按钮的原有事件
                if (addBtn._originalClickHandler) {
                    addBtn.removeEventListener('click', addBtn._originalClickHandler);
                }
                
                // 添加保存按钮的事件
                addBtn.onclick = async (e) => {
                    // 阻止事件冒泡，避免触发add-org-inline事件
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const newName = newItemInput.value.trim();
                    if (!newName) {
                        notificationService.show(`请输入${itemName}名称`, 'warning');
                        return;
                    }
                    if (newName === item) {
                        cancelEdit();
                        return;
                    }
                    if (currentManagementModalConfig.items.includes(newName)) {
                        notificationService.show(`该${itemName}名称已存在`, 'warning');
                        return;
                    }

                    if (window._isSaving) {
                        notificationService.show('正在保存中，请稍候...', 'info');
                        return;
                    }

                    window._isSaving = true;
                    addBtn.disabled = true;
                    newItemInput.disabled = true;

                    try {
                        // 获取索引
                        const index = currentManagementModalConfig.items.indexOf(item);

                        // 执行更新
                        if (currentManagementModalConfig.editItem) {
                            if (index !== -1) {
                                const result = currentManagementModalConfig.editItem(index, newName);
                                if (result === false) {
                                    return;
                                }
                            } else {
                                return;
                            }
                        }

                        // 更新UI - 注意：具体的颜色更新和UI更新已经在 currentManagementModalConfig.editItem 中处理了

                await window.utils.saveData();
                notificationService.show(`${itemName}修改成功`, 'success');

                        // 刷新视图 - 更新学生列表和日历
                        if (currentManagementModalConfig.updateUI) {
                            currentManagementModalConfig.updateUI();
                        }

                        // 恢复输入框和按钮状态
                        cancelEdit();
                    } finally {
                        window._isSaving = false;
                        addBtn.disabled = false;
                        newItemInput.disabled = false;
                    }
                };
                
                // 添加编辑模式下的按键事件 - 回车保存，ESC取消
                newItemInput.onkeydown = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        event.stopPropagation();
                        addBtn.click();
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        cancelEdit();
                    }
                };
                
                function cancelEdit() {
                    // 恢复输入框值
                    newItemInput.value = originalInputValue;
                    
                    // 恢复按钮状态
                    addBtn.textContent = originalBtnText;
                    addBtn.style.backgroundColor = 'var(--color-primary)';
                    
                    // 重新绑定添加模式的回车键事件
                    newItemInput.onkeydown = (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const addBtnElement = document.querySelector(`[data-action="add-org-inline"][data-item-name="${itemName}"]`);
                            if (addBtnElement) {
                                addBtnElement.click();
                            }
                        }
                    };
                    
                    // 恢复添加按钮的原有事件
                    if (addBtn._originalClickHandler) {
                        addBtn.addEventListener('click', addBtn._originalClickHandler);
                    }
                    
                    // 清除编辑状态
                    delete currentManagementModalConfig.editingItem;
                }
            },
            
            'delete-org-inline': async (payload, e) => {
                const itemName = payload.itemName;
                const item = payload.item;

                const config = window.currentManagementModalConfig;
                if (!config) return;

                if (window._isSaving) {
                    notificationService.show('正在保存中，请稍候...', 'info');
                    return;
                }

                const currentItem = config.items.find(i => i === item || i === payload[itemName]);
                const deleteItem = currentItem || item;

                if (config.onDelete && config.onDelete(deleteItem)) {
                    notificationService.show(`该${itemName}正在被使用，无法删除`, 'warning');
                    return;
                }

                window._isSaving = true;
                
                const inputBox = document.getElementById(`new-${itemName}`);
                if (inputBox) inputBox.disabled = true;
                
                try {
                    const itemIndex = config.items.indexOf(deleteItem);
                    if (itemIndex !== -1) {
                        if (config.deleteItem) {
                            config.deleteItem(deleteItem);
                        }
                        
                        await window.utils.saveData();

                        const itemElement = e.target.closest(`[data-${itemName}="${deleteItem}"]`);
                        if (itemElement) {
                            itemElement.remove();
                        }

                        notificationService.show(`${itemName}删除成功`, 'success');
                        if (config.updateUI) {
                            config.updateUI();
                        }
                    }
                } finally {
                    window._isSaving = false;
                    if (inputBox) {
                        inputBox.disabled = false;
                        inputBox.focus();
                    }
                }
            },
            
            'add-org-inline': async (payload, e) => {
                const itemName = payload.itemName;
                const newItemInput = document.getElementById(`new-${itemName}`);
                const addBtn = document.getElementById(`add-${itemName}`);
                
                if (!newItemInput || !window.currentManagementModalConfig) return;
                
                // 保存原始点击事件处理器
                if (addBtn && !addBtn._originalClickHandler) {
                    addBtn._originalClickHandler = addBtn.onclick || function() {};
                }
                
                if (window._isSaving) {
                    notificationService.show('正在保存中，请稍候...', 'info');
                    return;
                }
                
                const newItem = newItemInput.value.trim();
                if (!newItem) {
                    notificationService.show(`请输入${itemName}名称`, 'warning');
                    return;
                }
                
                if (window.currentManagementModalConfig.items.includes(newItem)) {
                    notificationService.show(`该${itemName}名称已存在`, 'warning');
                    return;
                }

                window._isSaving = true;
                if (addBtn) addBtn.disabled = true;
                newItemInput.disabled = true;
                
                try {
                    window.currentManagementModalConfig.addItem(newItem);
                    if (window.currentManagementModalConfig.onAdd) {
                        window.currentManagementModalConfig.onAdd(newItem);
                    }
                    
                    await window.utils.saveData();
                    
                    const itemsList = document.getElementById(`${itemName}s-list`);
                    if (itemsList) {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'flex items-center justify-between p-2 rounded';
                        itemDiv.style.backgroundColor = 'var(--bg-secondary)';
                        itemDiv.dataset[itemName] = newItem;
                        
                        const colorType = itemName === '机构' ? 'organization' : 'grade';
                        const bgColor = window.utils.generateColor(newItem, colorType);
                        
                        itemDiv.innerHTML = `
                            <button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color: color-mix(in srgb, ${bgColor} 20%, transparent); color: ${bgColor};" data-item="${newItem}" data-item-name="${itemName}" data-color="${bgColor}">${window.utils.escapeHtml(newItem)}</button>
                            <div class="flex items-center">
                                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${newItem}">
                                    <i data-lucide="square-pen" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                                </button>
                                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${newItem}">
                                    <i data-lucide="trash-2" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                                </button>
                            </div>
                        `;
                        itemsList.appendChild(itemDiv);

                        if (window.lucide) {
                            lucide.createIcons();
                        }

                        const colorPickerTrigger = itemDiv.querySelector(`.${itemName}-name.color-picker-trigger`);
                        if (colorPickerTrigger) {
                            colorPickerTrigger.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const item = colorPickerTrigger.dataset.item;
                                const currentColor = colorPickerTrigger.dataset.color;
                                
                                window.modalService.showColorPicker({
                                    itemName: item,
                                    itemType: colorType,
                                    currentColor: currentColor,
                                    onSelect: (newColor) => {
                                        window.utils.setColor(item, newColor, colorType);
                                        colorPickerTrigger.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`;
                                        colorPickerTrigger.style.color = newColor;
                                        colorPickerTrigger.dataset.color = newColor;
                                        
                                        if (colorType === 'organization') {
                                            window.state.courses.forEach(course => {
                                                if (Array.isArray(course.organizations)) {
                                                    course.organizations.forEach((org, idx) => {
                                                        if (org === item) {
                                                            if (course.colors && course.colors[idx]) {
                                                                course.colors[idx] = newColor;
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                        
                                        window.utils.saveData();
                                        
                                        if (window.currentManagementModalConfig.updateUI) {
                                            window.currentManagementModalConfig.updateUI();
                                        }
                                    }
                                });
                            });
                        }
                    }
                    
                    newItemInput.value = '';
                    newItemInput.focus();
                    
                    notificationService.show(`${itemName}添加成功`, 'success');
                    if (window.currentManagementModalConfig.updateUI) {
                        window.currentManagementModalConfig.updateUI();
                    }
                } finally {
                    window._isSaving = false;
                    if (addBtn) addBtn.disabled = false;
                    newItemInput.disabled = false;
                    newItemInput.focus();
                }
            }
        };
    }
    
    handle(action, payload, e) {
        const handler = this.handlers[action];
        if (handler) {
            try {
                handler(payload, e);
            } catch (error) {
                console.error(`处理事件 ${action} 失败:`, error);
                notificationService.show('操作失败', 'error');
            }
        }
    }
}

const eventHandlerService = new EventHandlerService();

export { EventHandlerService, eventHandlerService };
export default eventHandlerService;