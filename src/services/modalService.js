/**
 * 模态框服务模块
 * 负责显示各种模态框
 */

class ModalService {
    constructor() {
        this.container = null;
        this.content = null;
        this.nestedContainer = null;
        this.nestedContent = null;
        this.eventListeners = [];
        this.setTimeoutId = null;
        this._boundKeydownHandler = null;
    }

    /**
     * 初始化模态框服务
     */
    init() {
        this.container = document.getElementById('modal-container');
        this.content = document.getElementById('modal-content');
        this.nestedContainer = document.getElementById('nested-modal-container');
        this.nestedContent = document.getElementById('nested-modal-content');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'modal-container';
            this.container.className = 'fixed inset-0 bg-black/50 items-center justify-center z-40 hidden opacity-0 transition-opacity duration-400';
            document.body.appendChild(this.container);

            this.content = document.createElement('div');
            this.content.id = 'modal-content';
            this.content.className = 'rounded-lg border p-6 w-full max-w-md mx-4 no-shadow transform scale-90 opacity-0 translate-y-4 transition-all duration-400';
            this.content.style.backgroundColor = 'var(--bg-secondary)';
            this.content.style.borderColor = 'var(--border-color)';
            this.content.style.transitionTimingFunction = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
            this.container.appendChild(this.content);
        }

        if (!this.nestedContainer) {
            this.nestedContainer = document.createElement('div');
            this.nestedContainer.id = 'nested-modal-container';
            this.nestedContainer.className = 'fixed inset-0 bg-black/70 items-center justify-center z-50 hidden opacity-0 transition-opacity duration-300';
            document.body.appendChild(this.nestedContainer);

            this.nestedContent = document.createElement('div');
            this.nestedContent.id = 'nested-modal-content';
            this.nestedContent.className = 'rounded-lg border p-6 w-full max-w-md mx-4 no-shadow transform scale-90 opacity-0 translate-y-4 transition-all duration-300';
            this.nestedContent.style.backgroundColor = 'var(--bg-secondary)';
            this.nestedContent.style.borderColor = 'var(--border-color)';
            this.nestedContent.style.transitionTimingFunction = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
            this.nestedContainer.appendChild(this.nestedContent);
        }
    }

    /**
     * 显示模态框
     */
    show(content, options = {}) {
        if (!this.container || !this.content) {
            this.init();
        }

        this.eventListeners.forEach(({ element, type, listener }) => {
            element.removeEventListener(type, listener);
        });
        this.eventListeners = [];

        if (this.setTimeoutId) {
            clearTimeout(this.setTimeoutId);
            this.setTimeoutId = null;
        }

        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        }

        this.content.innerHTML = content;

        this.container.style.display = 'flex';
        this.container.offsetHeight;
        this.container.style.opacity = '1';
        this.content.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        this.content.classList.add('scale-100', 'opacity-100', 'translate-y-0');

        const closeButtons = this.content.querySelectorAll('.close-modal, [data-action="close-modal"]');
        closeButtons.forEach(btn => {
            const closeHandler = () => this.hide();
            btn.addEventListener('click', closeHandler);
            this.eventListeners.push({ element: btn, type: 'click', listener: closeHandler });
        });

        const actionListener = (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;

            switch (action) {
                case 'toggle-date-picker':
                    if (typeof window.utils.toggleDatePicker === 'function') {
                        window.utils.toggleDatePicker(btn.dataset.target);
                    }
                    break;
                case 'change-date-month':
                    if (typeof window.utils.changeDateMonth === 'function') {
                        window.utils.changeDateMonth(btn.dataset.target, parseInt(btn.dataset.delta));
                    }
                    break;
                case 'adjust-time':
                    if (typeof window.utils.adjustTime === 'function') {
                        window.utils.adjustTime(btn.dataset.target, parseInt(btn.dataset.delta));
                    }
                    break;
                case 'close-picker':
                    const pickerElement = document.getElementById(btn.dataset.target);
                    window.utils.safeAddClass(pickerElement, 'hidden');
                    break;
                case 'toggle-time-picker':
                    if (typeof window.utils.toggleTimePicker === 'function') {
                        window.utils.toggleTimePicker(btn.dataset.target);
                    }
                    break;
                case 'select-time-hour':
                    const inputHour = document.getElementById(btn.dataset.inputId);
                    if (inputHour) {
                        const currentValue = inputHour.value || '00:00';
                        const [, minute] = currentValue.split(':');
                        inputHour.value = `${btn.dataset.hour}:${minute}`;

                        if (btn.dataset.inputId === 'course-start-time') {
                            const startContainer = document.getElementById('start-time-container');
                            window.utils.safeAddClass(startContainer, 'hidden');
                        }

                        if (typeof window.utils.calculateFee === 'function') {
                            window.utils.calculateFee();
                        }

                        if (btn.dataset.inputId === 'course-start-time' && typeof window.utils.calculateEndTime === 'function') {
                            const durationInput = document.getElementById('course-duration');
                            const duration = durationInput ? parseInt(durationInput.value) || 120 : 120;
                            window.utils.calculateEndTime('course-start-time', 'course-end-time', duration);
                        }
                    }
                    break;
                case 'select-time-minute':
                    const inputMinute = document.getElementById(btn.dataset.inputId);
                    if (inputMinute) {
                        const currentValue = inputMinute.value || '00:00';
                        const [hour] = currentValue.split(':');
                        inputMinute.value = `${hour}:${btn.dataset.minute}`;

                        if (btn.dataset.inputId === 'course-start-time') {
                            const startContainer = document.getElementById('start-time-container');
                            window.utils.safeAddClass(startContainer, 'hidden');
                        }

                        if (typeof window.utils.calculateFee === 'function') {
                            window.utils.calculateFee();
                        }

                        if (btn.dataset.inputId === 'course-start-time' && typeof window.utils.calculateEndTime === 'function') {
                            const durationInput = document.getElementById('course-duration');
                            const duration = durationInput ? parseInt(durationInput.value) || 120 : 120;
                            window.utils.calculateEndTime('course-start-time', 'course-end-time', duration);
                        }
                    }
                    break;
                case 'select-duration':
                    const durationInput = document.getElementById('course-duration');
                    if (durationInput) {
                        durationInput.value = btn.dataset.duration;

                        const durationDropdown = document.getElementById('duration-dropdown');
                        window.utils.safeAddClass(durationDropdown, 'hidden');

                        if (typeof window.utils.calculateEndTime === 'function') {
                            window.utils.calculateEndTime('course-start-time', 'course-end-time', parseInt(btn.dataset.duration));
                        }

                        if (typeof window.utils.calculateFee === 'function') {
                            window.utils.calculateFee();
                        }
                    }
                    break;
                default:
                    break;
            }
        };

        this.content.addEventListener('click', actionListener);
        this.eventListeners.push({ element: this.content, type: 'click', listener: actionListener });

        let mouseDownPos = null;
        const mouseDownHandler = (e) => {
            if (e.target === this.container) {
                mouseDownPos = { x: e.clientX, y: e.clientY };
            }
        };
        const mouseUpHandler = (e) => {
            if (mouseDownPos && e.target === this.container) {
                const dx = Math.abs(e.clientX - mouseDownPos.x);
                const dy = Math.abs(e.clientY - mouseDownPos.y);
                if (dx < 5 && dy < 5 && !e.target.closest('input[type="date"]') && !e.target.closest('input[type="time"]')) {
                    this.hide();
                }
                mouseDownPos = null;
            }
        };
        this.container.addEventListener('mousedown', mouseDownHandler);
        this.container.addEventListener('mouseup', mouseUpHandler);
        this.eventListeners.push({ element: this.container, type: 'mousedown', listener: mouseDownHandler });
        this.eventListeners.push({ element: this.container, type: 'mouseup', listener: mouseUpHandler });

        this._boundKeydownHandler = this.handleKeydown.bind(this);
        document.addEventListener('keydown', this._boundKeydownHandler);

        if (options.onShow) {
            options.onShow();
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.hide();
        }
    }

    hide() {
        if (!this.container || !this.content) return;

        window.currentManagementModalConfig = null;

        this.content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        this.content.classList.add('scale-90', 'opacity-0', 'translate-y-4');
        this.container.style.opacity = '0';

        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        setTimeout(() => {
            this.container.style.display = 'none';
            const hideEvent = new Event('hide');
            this.container.dispatchEvent(hideEvent);
        }, 400);

        if (this._boundKeydownHandler) {
            document.removeEventListener('keydown', this._boundKeydownHandler);
            this._boundKeydownHandler = null;
        }

        this.eventListeners.forEach(({ element, type, listener }) => {
            if (element) {
                element.removeEventListener(type, listener);
            }
        });
        this.eventListeners = [];

        if (this.setTimeoutId) {
            clearTimeout(this.setTimeoutId);
            this.setTimeoutId = null;
        }
    }

    showNested(content, options = {}) {
        // 取消之前未完成的 hideNested
        if (this._nestedHideTimer) {
            clearTimeout(this._nestedHideTimer);
            this._nestedHideTimer = null;
        }

        if (!this.nestedContainer || !this.nestedContent) {
            this.init();
        }

        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.bottom = '0';

        this.nestedContent.innerHTML = content;

        this.nestedContainer.style.display = 'flex';
        this.nestedContainer.offsetHeight;
        this.nestedContainer.style.opacity = '1';
        this.nestedContent.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        this.nestedContent.classList.add('scale-100', 'opacity-100', 'translate-y-0');

        const nestedHandleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.hideNested();
            }
        };
        document.addEventListener('keydown', nestedHandleKeydown);

        this.nestedContainer.onclick = (e) => {
            if (e.target === this.nestedContainer) {
                this.hideNested();
            }
        };

        this.nestedContainer._keydownHandler = nestedHandleKeydown;

        if (options.onShow) {
            options.onShow();
        }
    }

    hideNested() {
        if (!this.nestedContainer || !this.nestedContent) return;

        this.nestedContent.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        this.nestedContent.classList.add('scale-90', 'opacity-0', 'translate-y-4');
        this.nestedContainer.style.opacity = '0';

        this._nestedHideTimer = setTimeout(() => {
            this._nestedHideTimer = null;
            this.nestedContainer.style.display = 'none';
            const scrollY = parseInt(document.body.style.top) * -1;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.bottom = '';
            window.scrollTo(0, scrollY);
        }, 300);

        if (this.nestedContainer._keydownHandler) {
            document.removeEventListener('keydown', this.nestedContainer._keydownHandler);
            this.nestedContainer._keydownHandler = null;
        }
    }

    showConfirm(message, onConfirm, type = 'confirm') {
        const typeConfig = {
            confirm: {
                icon: 'badge-question-mark',
                bgStyle: 'background-color: rgba(59, 130, 246, 0.1);',
                textStyle: 'color: var(--color-primary);',
                btnText: '确定',
                btnStyle: 'background-color: var(--color-primary);'
            },
            delete: {
                icon: 'triangle-alert',
                bgStyle: 'background-color: rgba(239, 68, 68, 0.1);',
                textStyle: 'color: var(--color-danger);',
                btnText: '删除',
                btnStyle: 'background-color: var(--color-danger);'
            },
            warning: {
                icon: 'circle-alert',
                bgStyle: 'background-color: rgba(245, 158, 11, 0.1);',
                textStyle: 'color: var(--color-warning);',
                btnText: '确定',
                btnStyle: 'background-color: var(--color-warning);'
            }
        };

        const config = typeConfig[type] || typeConfig.confirm;

        const content = `
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style="${config.bgStyle}">
                        <i data-lucide="${config.icon}" class="text-2xl inline-block" style="${config.textStyle} width: 24px; height: 24px;"></i>
                    </div>
                    <p style="color: var(--text-primary);">${message}</p>
                </div>
                <div class="flex space-x-3">
                    <button id="cancel-confirm" class="flex-1 px-4 py-2 rounded-lg transition-colors" style="border: 1px solid var(--border-color); color: var(--text-primary); background-color: var(--bg-secondary);">
                        取消
                    </button>
                    <button id="accept-confirm" class="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style="${config.btnStyle}">
                        ${config.btnText}
                    </button>
                </div>
            </div>
        `;

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
                const cancelHandler = () => this.hide();
                const acceptHandler = () => {
                    onConfirm();
                    this.hide();
                };
                const cancelBtn = document.getElementById('cancel-confirm');
                const acceptBtn = document.getElementById('accept-confirm');
                cancelBtn.addEventListener('click', cancelHandler);
                acceptBtn.addEventListener('click', acceptHandler);
                this.eventListeners.push(
                    { element: cancelBtn, type: 'click', listener: cancelHandler },
                    { element: acceptBtn, type: 'click', listener: acceptHandler }
                );
            }
        });
    }

    /**
     * 显示添加学生模态框
     */
    showAddStudent() {
        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">添加学生</h3>
                    </div>
                    <form id="add-student-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名</label>
                            <input type="text" id="student-name" class="w-full px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                        </div>
                        <div class="mb-4 flex space-x-4">
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">机构</label>
                                <div class="custom-select w-full" id="student-organization-wrapper">
                                    <div class="custom-select-trigger" id="student-organization-trigger" data-action="toggle-select" data-select-wrapper="student-organization-wrapper">
                                        <span>${window.state.organizations[0] || '请选择机构'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="student-organization-options">
                                        ${window.state.organizations.map((org, index) => `<div class="custom-option ${index === 0 ? 'selected' : ''}" data-value="${window.utils.escapeHtml(org)}">${window.utils.escapeHtml(org)}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">年级</label>
                                <div class="custom-select w-full" id="student-grade-wrapper">
                                    <div class="custom-select-trigger" id="student-grade-trigger" data-action="toggle-select" data-select-wrapper="student-grade-wrapper">
                                        <span>${window.state.grades[0] || '请选择年级'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="student-grade-options">
                                        ${window.state.grades.map((grade, index) => `<div class="custom-option ${index === 0 ? 'selected' : ''}" data-value="${window.utils.escapeHtml(grade)}">${window.utils.escapeHtml(grade)}</div>`).join('')}
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
                                    <input type="number" id="duration-one-on-one" min="1" value="120" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="fee-one-on-one" min="0" step="0.01" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                            <div class="mt-2 text-sm" style="color: var(--text-secondary);">
                                多人课请在排课时定价
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal text-white px-4 py-2 rounded-lg mr-2" style="background-color: var(--color-secondary);">关闭</button>
                            <button type="submit" id="add-student-save" class="bg-primary text-white px-4 py-2 rounded-lg">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
                const addStudentForm = document.getElementById('add-student-form');
                if (addStudentForm) {
                    addStudentForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const name = document.getElementById('student-name').value.trim();
                        const organization = document.querySelector('#student-organization-options .custom-option.selected')?.dataset.value;
                        const grade = document.querySelector('#student-grade-options .custom-option.selected')?.dataset.value;
                        const duration = parseInt(document.getElementById('duration-one-on-one').value) || 120;
                        const fee = parseFloat(document.getElementById('fee-one-on-one').value) || 0;

                        if (!name) {
                            window.notificationService.show('请输入学生姓名', 'warning');
                            return;
                        }
                        if (!organization) {
                            window.notificationService.show('请选择机构', 'warning');
                            return;
                        }
                        if (!grade) {
                            window.notificationService.show('请选择年级', 'warning');
                            return;
                        }

                        const newStudent = {
                            id: window.utils.generateId(),
                            name,
                            organization,
                            grade,
                            color: window.utils.generateColor(name),
                            fees: {
                                '一对一': fee,
                                '一对一_duration': duration
                            },
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        window.state.students.push(newStudent);

                        if (window.serverStatusService) {
                            window.serverStatusService.setSyncing();
                        }
                        await window.utils.saveData();

                        window.utils.refreshAllViews();

                        this.hide();

                        window.notificationService.show('学生添加成功', 'success');
                    });
                }
            }
        });
    }

    /**
     * 显示编辑学生模态框
     */
    showEditStudent(student) {
        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">编辑学生</h3>
                    </div>
                    <form id="edit-student-form">
                        <input type="hidden" id="edit-student-id" value="${student.id}">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名</label>
                            <input type="text" id="edit-student-name" class="w-full px-3 py-2 rounded-md" value="" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                        </div>
                        <div class="mb-4 flex space-x-4">
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">机构</label>
                                <div class="custom-select w-full" id="edit-student-organization-wrapper">
                                    <div class="custom-select-trigger" id="edit-student-organization-trigger" data-action="toggle-select" data-select-wrapper="edit-student-organization-wrapper">
                                        <span>${student.organization || window.state.organizations[0] || '请选择机构'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="edit-student-organization-options">
                                        ${window.state.organizations.map((org) => `<div class="custom-option ${org === student.organization ? 'selected' : ''}" data-value="${org}">${org}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="w-1/2">
                                <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">年级</label>
                                <div class="custom-select w-full" id="edit-student-grade-wrapper">
                                    <div class="custom-select-trigger" id="edit-student-grade-trigger" data-action="toggle-select" data-select-wrapper="edit-student-grade-wrapper">
                                        <span>${student.grade || window.state.grades[0] || '请选择年级'}</span>
                                        <i data-lucide="chevron-down" class="custom-select-arrow inline-block" style="width: 12px; height: 12px;"></i>
                                    </div>
                                    <div class="custom-select-options" id="edit-student-grade-options">
                                        ${window.state.grades.map((grade) => `<div class="custom-option ${grade === student.grade ? 'selected' : ''}" data-value="${grade}">${grade}</div>`).join('')}
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
                                    <input type="number" id="edit-duration-one-on-one" min="1" value="${student.fees && student.fees['一对一_duration'] ? student.fees['一对一_duration'] : 120}" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="edit-fee-one-on-one" min="0" step="0.01" class="w-12 px-2 py-1 rounded-md appearance-none" value="${student.fees ? (student.fees['一对一'] || 0) : 0}" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                            <div class="mt-2 text-sm" style="color: var(--text-secondary);">
                                多人课请在排课时定价
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal text-white px-4 py-2 rounded-lg mr-2" style="background-color: var(--color-secondary);">关闭</button>
                            <button type="submit" id="edit-student-save" class="bg-primary text-white px-4 py-2 rounded-lg">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
                const editStudentNameEl = document.getElementById('edit-student-name');
                if (editStudentNameEl) {
                    editStudentNameEl.value = student.name;
                }
                const editStudentForm = document.getElementById('edit-student-form');
                if (editStudentForm) {
                    editStudentForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const studentId = document.getElementById('edit-student-id').value;
                        const name = document.getElementById('edit-student-name').value.trim();
                        const organization = document.querySelector('#edit-student-organization-options .custom-option.selected')?.dataset.value;
                        const grade = document.querySelector('#edit-student-grade-options .custom-option.selected')?.dataset.value;
                        const duration = parseInt(document.getElementById('edit-duration-one-on-one').value) || 120;
                        const fee = parseFloat(document.getElementById('edit-fee-one-on-one').value) || 0;

                        if (!name) {
                            window.notificationService.show('请输入学生姓名', 'warning');
                            return;
                        }
                        if (!organization) {
                            window.notificationService.show('请选择机构', 'warning');
                            return;
                        }
                        if (!grade) {
                            window.notificationService.show('请选择年级', 'warning');
                            return;
                        }

                        const studentIndex = window.state.students.findIndex(s => s.id === studentId);
                        if (studentIndex !== -1) {
                            const oldName = window.state.students[studentIndex].name;
                            
                            window.state.students[studentIndex] = {
                                ...window.state.students[studentIndex],
                                name,
                                organization,
                                grade,
                                color: window.utils.generateColor(name),
                                fees: {
                                    '一对一': fee,
                                    '一对一_duration': duration
                                },
                                updatedAt: new Date().toISOString()
                            };

                            window.state.courses.forEach(course => {
                                if (course.studentNames && course.studentNames.includes(oldName)) {
                                    const idx = course.studentNames.indexOf(oldName);
                                    if (idx !== -1) {
                                        course.studentNames[idx] = name;
                                    }
                                }
                            });

                            if (window.serverStatusService) {
                                window.serverStatusService.setSyncing();
                            }
                            await window.utils.saveData();

                            window.utils.refreshAllViews();

                            this.hide();

                            window.notificationService.show('学生编辑成功', 'success');
                        } else {
                            window.notificationService.show('学生不存在', 'error');
                        }
                    });
                }
            }
        });
    }

    /**
     * 显示添加课程模态框
     */
    showAddCourse(date) {
        const content = window.utils.getCourseFormTemplate(false, { date });

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }

                if (typeof window.utils.initCourseFormEvents === 'function') {
                    window.utils.initCourseFormEvents(false, { date });
                }

                const addCourseForm = document.getElementById('add-course-form');
                if (addCourseForm) {
                    addCourseForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const courseDate = document.getElementById('course-date').value;
                        const lessonType = document.querySelector('input[name="course-lesson-type"]:checked').value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time').value;
                        const note = window.utils.escapeHtml(document.getElementById('course-note').value);

                        if (!courseDate) {
                            window.notificationService.show('请选择日期', 'warning');
                            return;
                        }
                        if (!lessonType) {
                            window.notificationService.show('请选择课型', 'warning');
                            return;
                        }
                        if (selectedStudents.length === 0) {
                            window.notificationService.show('请选择学生', 'warning');
                            return;
                        }
                        if (!startTime) {
                            window.notificationService.show('请选择开始时间', 'warning');
                            return;
                        }

                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        const studentIds = selectedStudents.map(s => s.dataset.id);
                        const studentNames = selectedStudents.map(s => s.dataset.name);
                        const organizations = selectedStudents.map(s => s.dataset.organization);
                        const colors = selectedStudents.map(s => s.dataset.color || 'var(--color-secondary)');
                        
                        const newCourse = {
                            id: window.utils.generateId(),
                            date: courseDate,
                            lessonType,
                            studentIds,
                            studentNames,
                            organizations,
                            colors,
                            startTime,
                            duration,
                            fees: [fee],
                            note,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        if (window.utils?.checkTimeConflict(newCourse)) {
                            window.notificationService.show('该时间段已有课程安排', 'warning');
                            return;
                        }

                        window.state.courses.push(newCourse);

                        // 记录到时间轴
                        if (window.timelineService) {
                            window.timelineService.recordAddCourse(newCourse, false);
                        }

                        if (window.serverStatusService) {
                            window.serverStatusService.setSyncing();
                        }
                        await window.utils.saveData();

                        window.utils.refreshAllViews();

                        this.hide();

                        window.notificationService.show('课程添加成功', 'success');
                    });
                }
            }
        });
    }

    /**
     * 显示编辑课程模态框
     */
    showEditCourse(course) {
        const content = window.utils.getCourseFormTemplate(true, course);

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }

                if (typeof window.utils.initCourseFormEvents === 'function') {
                    window.utils.initCourseFormEvents(true, course);
                }

                const editCourseForm = document.getElementById('edit-course-form');
                if (editCourseForm) {
                    editCourseForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const saveCourseBtn = document.getElementById('save-course');
                        if (saveCourseBtn) {
                            saveCourseBtn.disabled = true;
                            saveCourseBtn.innerHTML = '<i data-lucide="loader-circle" class="inline-block animate-spin mr-2" style="width: 16px; height: 16px;"></i>保存中...';
                        }

                        const courseId = document.getElementById('edit-course-id').value;
                        const courseDate = document.getElementById('course-date').value;
                        const lessonType = document.querySelector('input[name="course-lesson-type"]:checked').value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time').value;
                        const note = window.utils.escapeHtml(document.getElementById('course-note').value);

                        if (!courseDate) {
                            window.notificationService.show('请选择日期', 'warning');
                            if (saveCourseBtn) {
                                saveCourseBtn.disabled = false;
                                saveCourseBtn.innerHTML = '保存';
                            }
                            return;
                        }
                        if (!lessonType) {
                            window.notificationService.show('请选择课型', 'warning');
                            if (saveCourseBtn) {
                                saveCourseBtn.disabled = false;
                                saveCourseBtn.innerHTML = '保存';
                            }
                            return;
                        }
                        if (selectedStudents.length === 0) {
                            window.notificationService.show('请选择学生', 'warning');
                            if (saveCourseBtn) {
                                saveCourseBtn.disabled = false;
                                saveCourseBtn.innerHTML = '保存';
                            }
                            return;
                        }
                        if (!startTime) {
                            window.notificationService.show('请选择开始时间', 'warning');
                            if (saveCourseBtn) {
                                saveCourseBtn.disabled = false;
                                saveCourseBtn.innerHTML = '保存';
                            }
                            return;
                        }

                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        const updatedStudentIds = selectedStudents.map(s => s.dataset.id);
                        const updatedStudentNames = selectedStudents.map(s => s.dataset.name);
                        const updatedOrganizations = selectedStudents.map(s => s.dataset.organization);
                        const updatedColors = selectedStudents.map(s => s.dataset.color || 'var(--color-secondary)');
                        
                        const updatedCourse = {
                            id: courseId,
                            date: courseDate,
                            lessonType,
                            studentIds: updatedStudentIds,
                            studentNames: updatedStudentNames,
                            organizations: updatedOrganizations,
                            colors: updatedColors,
                            startTime,
                            duration,
                            fees: [fee],
                            note,
                            updatedAt: new Date().toISOString()
                        };

                        if (window.utils?.checkTimeConflict(updatedCourse)) {
                            window.notificationService.show('该时间段已有课程安排', 'warning');
                            saveCourseBtn.disabled = false;
                            saveCourseBtn.innerHTML = '保存';
                            return;
                        }

                        const courseIndex = window.state.courses.findIndex(c => c.id === courseId);
                        if (courseIndex !== -1) {
                            const oldCourse = { ...window.state.courses[courseIndex] };
                            window.state.courses[courseIndex] = updatedCourse;

                            // 记录到时间轴
                            if (window.timelineService) {
                                window.timelineService.recordUpdateCourse(oldCourse, updatedCourse, '');
                            }

                            if (window.serverStatusService) {
                                window.serverStatusService.setSyncing();
                            }
                            await window.utils.saveData();

                            window.utils.refreshAllViews();

                            this.hide();

                            window.notificationService.show('课程编辑成功', 'success');
                        } else {
                            window.notificationService.show('课程不存在', 'error');
                            saveCourseBtn.disabled = false;
                            saveCourseBtn.innerHTML = '保存';
                        }
                    });
                }
            }
        });
    }

    /**
     * 显示通用管理模态框
     */
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
                        <div class="flex items-center space-x-2 mb-2">
                            <input type="text" id="new-${itemName}" class="flex-grow px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); color: var(--text-primary);">
                            <button id="add-${itemName}" class="bg-primary text-white px-3 py-2 rounded-md" data-action="add-org-inline" data-item-name="${itemName}">添加</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium mb-2" style="color: var(--text-primary);">已有${itemName} <span class="text-xs font-normal" style="color: var(--text-secondary);">（点击名称可修改颜色）</span></h4>
                        <div id="${itemName}s-list" class="space-y-2 max-h-80 overflow-y-auto pr-2">
                            ${items.map(item => {
                                const bgColor = window.utils.generateColor(item, colorType);
                                return `
                                <div class="flex items-center justify-between p-2 rounded" style="background-color: var(--bg-secondary);" data-${itemName}="${item}">
                                    <button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color: color-mix(in srgb, ${bgColor} 20%, transparent); color: ${bgColor};" data-item="${item}" data-item-name="${itemName}" data-color="${bgColor}">${window.utils.escapeHtml(item)}</button>
                                    <div class="flex items-center">
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${window.utils.escapeHtml(item)}">
                                            <i data-lucide="square-pen" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                                        </button>
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${window.utils.escapeHtml(item)}">
                                            <i data-lucide="trash-2" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="button" class="close-modal text-white px-4 py-2 rounded-lg" style="background-color: var(--color-secondary);">关闭</button>
                    </div>
                </div>
            </div>
        `;

        window.currentManagementModalConfig = config;
        
        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }

                const colorPickerTriggers = document.querySelectorAll(`.${itemName}-name.color-picker-trigger`);
                colorPickerTriggers.forEach(trigger => {
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const item = trigger.dataset.item;
                        const currentColor = trigger.dataset.color;
                        
                        modalService.showColorPicker({
                            itemName: item,
                            itemType: colorType,
                            currentColor: currentColor,
                            onSelect: (newColor) => {
                                // 更新颜色分配
                                window.utils.setColor(item, newColor, colorType);
                                
                                // 更新当前显示的颜色标签
                                trigger.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`;
                                trigger.style.color = newColor;
                                trigger.dataset.color = newColor;
                                
                                // 更新相关课程的颜色
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
                                
                                // 保存数据
                                window.utils.saveData();
                                
                                // 更新视图
                                if (updateUI) {
                                    updateUI();
                                }
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
                        if (addBtn) {
                            addBtn.click();
                        }
                    }
                };
            }
        }, 50);
    }

    /**
     * 显示管理机构模态框
     */
    showManageOrganizations() {
        const config = {
            title: '机构管理',
            items: window.state.organizations,
            itemName: '机构',
            addItem: (org) => {
                window.state.organizations.push(org);
                config.items = window.state.organizations;
                return true;
            },
            editItem: (index, newOrg) => {
                const oldOrg = config.items[index];
                if (!oldOrg) return false;

                // 移除旧名称的颜色分配
                window.utils.removeColorAssignment(oldOrg, 'organization');
                // 为新名称生成新颜色
                const newColor = window.utils.generateColor(newOrg, 'organization');

                window.state.organizations[index] = newOrg;
                config.items[index] = newOrg;

                window.state.students.forEach(student => {
                    if (student.organization === oldOrg) {
                        student.organization = newOrg;
                    }
                });

                window.state.courses.forEach(course => {
                    if (!course.colors) {
                        course.colors = [];
                    }
                    
                    if (Array.isArray(course.organizations)) {
                        course.organizations = course.organizations.map((o, idx) => {
                            if (o === oldOrg) {
                                course.colors[idx] = newColor;
                                return newOrg;
                            }
                            return o;
                        });
                    } else if (course.studentIds) {
                        course.studentIds.forEach((studentId, idx) => {
                            const student = window.state.students.find(s => s.id === studentId);
                            if (student && student.organization === oldOrg) {
                                student.organization = newOrg;
                                course.colors[idx] = newColor;
                            }
                        });
                    }
                });

                const itemElement = document.querySelector(`[data-机构="${oldOrg}"]`);
                if (itemElement) {
                    const nameSpan = itemElement.querySelector('.机构-name');
                    if (nameSpan) {
                        nameSpan.textContent = newOrg;
                        // 更新颜色样式
                        nameSpan.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`;
                        nameSpan.style.color = newColor;
                    }
                    itemElement.dataset['机构'] = newOrg;
                    const editBtn = itemElement.querySelector('[data-action="edit-org-inline"]');
                    if (editBtn) {
                        editBtn.dataset.item = newOrg;
                    }
                    const deleteBtn = itemElement.querySelector('[data-action="delete-org-inline"]');
                    if (deleteBtn) {
                        deleteBtn.dataset.item = newOrg;
                    }
                }

                return true;
            },
            deleteItem: (org) => {
                const index = window.state.organizations.indexOf(org);
                if (index !== -1) {
                    window.state.organizations.splice(index, 1);
                    config.items = window.state.organizations;
                }
            },
            onDelete: (org) => {
                return window.state.students.some(s => s.organization === org);
            },
            updateUI: () => {
                window.render.students();
                window.render.calendar();
            }
        };
        this.showManagementModal(config);
    }

    /**
     * 显示管理年级模态框
     */
    showManageGrades() {
        const config = {
            title: '年级管理',
            items: window.state.grades,
            itemName: '年级',
            addItem: (grade) => {
                window.state.grades.push(grade);
                config.items = window.state.grades;
                return true;
            },
            editItem: (index, newGrade) => {
                const oldGrade = config.items[index];
                if (!oldGrade) return false;

                // 移除旧名称的颜色分配
                window.utils.removeColorAssignment(oldGrade, 'grade');
                // 为新名称生成新颜色
                const newColor = window.utils.generateColor(newGrade, 'grade');

                window.state.grades[index] = newGrade;
                config.items[index] = newGrade;

                window.state.students.forEach(student => {
                    if (student.grade === oldGrade) {
                        student.grade = newGrade;
                    }
                });

                const itemElement = document.querySelector(`[data-年级="${oldGrade}"]`);
                if (itemElement) {
                    const nameSpan = itemElement.querySelector('.年级-name');
                    if (nameSpan) {
                        nameSpan.textContent = newGrade;
                        // 更新颜色样式
                        nameSpan.style.backgroundColor = `color-mix(in srgb, ${newColor} 20%, transparent)`;
                        nameSpan.style.color = newColor;
                    }
                    itemElement.dataset['年级'] = newGrade;
                    const editBtn = itemElement.querySelector('[data-action="edit-org-inline"]');
                    if (editBtn) {
                        editBtn.dataset.item = newGrade;
                    }
                    const deleteBtn = itemElement.querySelector('[data-action="delete-org-inline"]');
                    if (deleteBtn) {
                        deleteBtn.dataset.item = newGrade;
                    }
                }

                return true;
            },
            deleteItem: (grade) => {
                const index = window.state.grades.indexOf(grade);
                if (index !== -1) {
                    window.state.grades.splice(index, 1);
                    config.items = window.state.grades;
                }
            },
            onDelete: (grade) => {
                return window.state.students.some(s => s.grade === grade);
            },
            updateUI: () => {
                window.render.students();
                window.render.calendar();
            }
        };
        this.showManagementModal(config);
    }

    /**
     * 关闭所有弹出层
     */
    closeAllPopovers() {
        document.querySelectorAll('.cell-action-group').forEach(btnGroup => btnGroup.remove());
        document.querySelectorAll('.course-action-group').forEach(btnGroup => btnGroup.remove());
        document.querySelectorAll('.calendar-cell-selected').forEach(cell => cell.classList.remove('calendar-cell-selected'));
        document.querySelectorAll('.course-tag-item.is-selected').forEach(el => el.classList.remove('is-selected'));
    }

    /**
     * 显示颜色选择模态框（嵌套在管理模态框上）
     * @param {Object} options - 选项
     * @param {string} options.itemName - 项目名称（如机构名、年级名）
     * @param {string} options.itemType - 项目类型（'organization' 或 'grade'）
     * @param {string} options.currentColor - 当前颜色
     * @param {Function} options.onSelect - 选择颜色后的回调函数
     */
    showColorPicker(options) {
        const { itemName, itemType, currentColor, onSelect } = options;

        const colorPalette = window.utils.getColorPalette();
        const usedColors = window.utils.getUsedColors(itemType);

        const content = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold" style="color: var(--text-primary);">选择颜色</h3>
                <p class="text-sm" style="color: var(--text-secondary);">为 "${itemName}" 选择一个颜色</p>
            </div>

            <div class="color-picker-grid grid grid-cols-4 gap-2 mb-6">
                ${colorPalette.map(color => {
                    const isUsed = usedColors.includes(color) && color !== currentColor;
                    const isSelected = color === currentColor;
                    return `
                        <button
                            class="color-picker-item h-8 rounded transition-all duration-200 flex items-center justify-center relative font-mono text-xs font-bold"
                            ${isUsed ? 'disabled' : ''}
                            style="background-color: ${color}; color: ${isLightColor(color) ? '#000' : '#fff'}; ${isUsed ? 'opacity: 0.4; cursor: not-allowed;' : 'cursor: pointer;'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-white;' : ''}"
                            data-color="${color}"
                        >
                            ${color.toUpperCase()}
                            ${isSelected ? '<span class="ml-1">✓</span>' : ''}
                            ${isUsed ? '<span class="ml-1">🔒</span>' : ''}
                        </button>
                    `;
                }).join('')}
            </div>

            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 rounded" style="background-color: ${currentColor};"></div>
                    <span class="text-sm font-mono" style="color: var(--text-secondary);">当前颜色: ${currentColor.toUpperCase()}</span>
                </div>
                <button type="button" class="close-color-picker text-white px-4 py-2 rounded-lg" style="background-color: var(--color-secondary);">取消</button>
            </div>
        `;

        this.showNested(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }

                const colorButtons = document.querySelectorAll('.color-picker-item:not([disabled])');
                colorButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const color = btn.dataset.color;
                        if (onSelect && typeof onSelect === 'function') {
                            onSelect(color);
                        }
                        this.hideNested();
                    });
                });

                const cancelBtn = document.querySelector('.close-color-picker');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        this.hideNested();
                    });
                }
            }
        });
    }

    /**
     * 显示快照管理模态框
     */
    async showSnapshotManager() {
        const snapshots = await window.utils.getSnapshots();
        
        const loginSnapshots = snapshots.filter(s => s.type === 'login');
        const autoSnapshots = snapshots.filter(s => s.type === 'auto');
        const manualSnapshots = snapshots.filter(s => s.type === 'manual');
        
        const generateSnapshotHtml = (snapshotList, title, type, showOverwrite = false) => {
            if (snapshotList.length === 0) {
                return `<div class="mb-6">
                    <h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4>
                    <p class="text-center p-3 border rounded-lg" style="color: var(--text-secondary); border-color: var(--border-color);">暂无快照</p>
                </div>`;
            }
            
            const snapshotItems = snapshotList.map(snapshot => {
                const date = new Date(snapshot.timestamp);
                const formattedDate = date.toLocaleString();
                const studentCount = snapshot.data.students?.length || 0;
                const courseCount = snapshot.data.courses?.length || 0;
                const typeText = snapshot.type === 'login' ? '登录' : 
                                snapshot.type === 'auto' ? '自动' : '手动';
                
                return `
                    <div class="p-3 border rounded-lg mb-2 flex justify-between items-center" style="border-color: var(--border-color);">
                        <div>
                            <div class="font-medium" style="color: var(--text-primary);">${formattedDate} (${typeText})</div>
                            <div class="text-sm" style="color: var(--text-secondary);">学生: ${studentCount}人, 课程: ${courseCount}节</div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="restore-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-success); color: white;" data-id="${snapshot.id}">恢复</button>
                            ${showOverwrite ? `<button class="overwrite-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-primary); color: white;" data-id="${snapshot.id}">覆盖</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            return `<div class="mb-6">
                <h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4>
                <div>${snapshotItems}</div>
            </div>`;
        };
        
        const generateManualSnapshotsHtml = (manualList) => {
            const html = [];
            
            for (let i = 0; i < manualList.length; i++) {
                const snapshot = manualList[i];
                const date = new Date(snapshot.timestamp);
                const formattedDate = date.toLocaleString();
                const studentCount = snapshot.data.students?.length || 0;
                const courseCount = snapshot.data.courses?.length || 0;
                
                html.push(`
                    <div class="p-3 border rounded-lg mb-2 flex justify-between items-center" style="border-color: var(--border-color);">
                        <div>
                            <div class="font-medium" style="color: var(--text-primary);">${formattedDate} (手动)</div>
                            <div class="text-sm" style="color: var(--text-secondary);">学生: ${studentCount}人, 课程: ${courseCount}节</div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="restore-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-success); color: white;" data-id="${snapshot.id}">恢复</button>
                            <button class="overwrite-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-primary); color: white;" data-id="${snapshot.id}">覆盖</button>
                        </div>
                    </div>
                `);
            }
            
            for (let i = manualList.length; i < 3; i++) {
                html.push(`
                    <div class="p-3 border rounded-lg mb-2 flex justify-between items-center cursor-pointer hover:bg-content transition-colors" style="border-color: var(--border-color); background-color: var(--bg-secondary);" data-action="create-manual-snapshot">
                        <div class="text-center w-full">
                            <div class="font-medium" style="color: var(--text-secondary);">空快照栏位 ${i + 1}</div>
                            <div class="text-sm" style="color: var(--text-secondary);">点击创建快照</div>
                        </div>
                    </div>
                `);
            }
            
            return `<div class="mb-6">
                <h4 class="font-medium mb-2" style="color: var(--text-primary);">手动快照 (最多3个)</h4>
                <div>${html.join('')}</div>
            </div>`;
        };
        
        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">快照管理</h3>
                    </div>
                    <div class="max-h-[75vh] overflow-y-auto">
                        ${generateSnapshotHtml(loginSnapshots, '登录快照', 'login', false)}
                        ${generateSnapshotHtml(autoSnapshots, '自动快照 (每15分钟)', 'auto', false)}
                        ${generateManualSnapshotsHtml(manualSnapshots)}
                    </div>
                </div>
            </div>
        `;
        
        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });
        
        setTimeout(() => {
            document.querySelectorAll('[data-action="create-manual-snapshot"]').forEach(div => {
                div.addEventListener('click', async () => {
                    await window.utils.createSnapshot('manual');
                    setTimeout(() => {
                        this.showSnapshotManager();
                    }, 500);
                });
            });
            
            document.querySelectorAll('.restore-snapshot').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const snapshotId = e.target.getAttribute('data-id');
                    this.showConfirm('确定要恢复此快照吗？<br>这将覆盖当前数据。', async () => {
                        await window.utils.restoreSnapshot(snapshotId);
                        this.hide();
                    }, 'warning');
                });
            });
            
            document.querySelectorAll('.overwrite-snapshot').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const snapshotId = e.target.getAttribute('data-id');
                    this.showConfirm('确定要覆盖此快照吗？', async () => {
                        try {
                            await window.utils.deleteSnapshot(snapshotId, false);
                            await window.utils.createSnapshot('manual', false);
                            window.notificationService.show('快照覆盖成功', 'success');
                            setTimeout(() => {
                                this.showSnapshotManager();
                            }, 500);
                        } catch (error) {
                            window.notificationService.show('快照覆盖失败', 'error');
                        }
                    }, 'warning');
                });
            });
        }, 0);
    }

    /**
     * 显示时间轴
     */
    async showTimeline() {
        if (!window.timelineService) {
            return;
        }

        const timeline = await window.timelineService.getTimeline();
        
        const getActionIcon = (type) => {
            switch (type) {
                case 'add-course':
                    return 'plus-circle';
                case 'paste-courses':
                    return 'clipboard';
                case 'update-course':
                    return 'square-pen';
                case 'delete-course':
                case 'delete-day-courses':
                    return 'trash-2';
                case 'restore-snapshot':
                    return 'history';
                default:
                    return 'circle-dot';
            }
        };

        const getActionIconColor = (type) => {
            switch (type) {
                case 'add-course':
                    return 'success';
                case 'paste-courses':
                    return 'warning';
                case 'update-course':
                    return 'primary';
                case 'delete-course':
                case 'delete-day-courses':
                    return 'danger';
                case 'restore-snapshot':
                    return 'warning';
                default:
                    return 'secondary';
            }
        };

        const formatTimestamp = (isoString) => {
            const date = new Date(isoString);
            return date.toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const getColorStyle = (colorType) => {
            switch (colorType) {
                case 'success':
                    return 'var(--color-success)';
                case 'primary':
                    return 'var(--color-primary)';
                case 'danger':
                    return 'var(--color-danger)';
                case 'warning':
                    return 'var(--color-warning)';
                default:
                    return 'var(--text-secondary)';
            }
        };

        const getBackgroundColor = (colorType, undone) => {
            if (undone) return 'var(--bg-tertiary)';
            switch (colorType) {
                case 'success':
                    return 'rgba(34, 197, 94, 0.1)';
                case 'primary':
                    return 'rgba(59, 130, 246, 0.1)';
                case 'danger':
                    return 'rgba(239, 68, 68, 0.1)';
                case 'warning':
                    return 'rgba(245, 158, 11, 0.1)';
                default:
                    return 'var(--bg-tertiary)';
            }
        };

        const generateExpandedCourses = (action) => {
            if (!action.courses || action.courses.length === 0) return '';
            
            const items = action.courses.map(course => {
                const courseTag = window.timelineService.generateCourseTag(course);
                return `
                    <div class="timeline-expanded-item" style="color: var(--text-secondary);">
                        ${courseTag}
                    </div>
                `;
            }).join('');
            
            return `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-left: 16px;">${items}</div>`;
        };

        const generateChangesHtml = (action) => {
            if (action.type !== 'update-course' || !action.changes || action.changes.length === 0) {
                return '';
            }

            const colorType = getActionIconColor(action.type);
            const accentColor = getColorStyle(colorType);

            return `
                <div class="timeline-changes" style="margin-top: 12px; padding: 12px; background-color: ${getBackgroundColor(colorType, false)}; border-radius: 8px; border-left: 3px solid ${accentColor};">
                    <div style="font-weight: 600; margin-bottom: 8px; color: ${accentColor}; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="arrow-right-left" class="inline-block" style="width: 16px; height: 16px;"></i>
                        变更内容
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${action.changes.map(change => {
                            if (change.hasChange) {
                                return `
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
                                        <span style="font-weight: 500; min-width: 60px; color: var(--text-primary);">${change.field}</span>
                                        <span style="color: var(--text-secondary);">已变更</span>
                                    </div>
                                `;
                            }
                            return `
                                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
                                    <span style="font-weight: 500; min-width: 60px; color: var(--text-primary);">${change.field}</span>
                                    <span style="color: var(--color-danger); text-decoration: line-through; padding: 2px 8px; border-radius: 4px; background-color: rgba(239, 68, 68, 0.1);">${change.old}</span>
                                    <i data-lucide="arrow-right" class="inline-block" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>
                                    <span style="color: var(--color-success); padding: 2px 8px; border-radius: 4px; background-color: rgba(34, 197, 94, 0.1);">${change.new}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        };

        const generateTimelineHtml = () => {
            if (timeline.length === 0) {
                return `
                    <div class="text-center py-12" style="color: var(--text-secondary);">
                        <i data-lucide="clock" class="inline-block mb-4" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                        <p>暂无操作记录</p>
                    </div>
                `;
            }

            return timeline.map((action, index) => {
                const colorType = getActionIconColor(action.type);
                const accentColor = getColorStyle(colorType);
                const bgColor = getBackgroundColor(colorType, action.undone);

                // 生成课程标签
                const courseTag = (action.course || action.newCourse) ? window.timelineService.generateCourseTag(action.course || action.newCourse) : '';
                const oldCourseTag = action.oldCourse ? window.timelineService.generateCourseTag(action.oldCourse) : '';
                
                return `
                    <div class="timeline-item ${action.undone ? 'timeline-item-undone' : ''}" data-id="${action.id}" style="position: relative; padding-left: 44px; padding-bottom: 28px;">
                        <div class="timeline-dot" style="position: absolute; left: 0; top: 6px; width: 24px; height: 24px; border-radius: 50%; background-color: ${bgColor}; border: 2px solid ${accentColor}; display: flex; align-items: center; justify-content: center; z-index: 1;">
                            <i data-lucide="${getActionIcon(action.type)}" class="inline-block" style="width: 14px; height: 14px; color: ${accentColor};"></i>
                        </div>
                        <div class="timeline-line" style="position: absolute; left: 11px; top: 30px; bottom: 0; width: 2px; background-color: var(--border-color); ${index === timeline.length - 1 ? 'display: none;' : ''}"></div>
                        <div class="timeline-content" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; ${action.undone ? 'opacity: 0.6;' : ''}">
                            <div class="timeline-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div class="timeline-description" style="font-weight: 600; color: var(--text-primary); ${action.undone ? 'text-decoration: line-through;' : ''}">${action.description}</div>
                                <div class="timeline-time" style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; background-color: var(--bg-tertiary); padding: 4px 10px; border-radius: 12px;">${formatTimestamp(action.timestamp)}</div>
                            </div>
                            ${action.type === 'update-course' && oldCourseTag && courseTag ? `
                                <div class="timeline-course-compare" style="margin-top: 12px;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: var(--color-danger); margin-bottom: 4px;">修改前</div>
                                            ${oldCourseTag}
                                        </div>
                                        <i data-lucide="arrow-right" class="inline-block flex-shrink-0" style="width: 20px; height: 20px; color: var(--text-secondary);"></i>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: var(--color-success); margin-bottom: 4px;">修改后</div>
                                            ${courseTag}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            ${action.type === 'add-course' && courseTag ? `
                                <div class="timeline-course-tag" style="margin-top: 12px;">${courseTag}</div>
                            ` : ''}
                            ${action.type === 'delete-course' && courseTag ? `
                                <div class="timeline-course-tag" style="margin-top: 12px; opacity: 0.7;">${courseTag}</div>
                            ` : ''}
                            ${(action.type === 'paste-courses' || action.type === 'delete-day-courses') ? `
                                <div class="timeline-expand-container" style="margin-top: 12px;">
                                    <button data-action="toggle-timeline-expand" data-id="${action.id}" class="timeline-expand-btn" style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--color-primary); cursor: pointer; background: none; border: none; padding: 6px 10px; border-radius: 6px; transition: background-color 0.2s; :hover { background-color: var(--bg-tertiary); }">
                                        <i data-lucide="${action.expanded ? 'chevron-down' : 'chevron-right'}" class="inline-block" style="width: 16px; height: 16px;"></i>
                                        ${action.expanded ? '收起详情' : '展开详情'}
                                    </button>
                                    <div class="timeline-expanded-content" style="${action.expanded ? '' : 'display: none;'} margin-top: 12px;">
                                        ${generateExpandedCourses(action)}
                                    </div>
                                </div>
                            ` : ''}
                            ${action.type !== 'restore-snapshot' ? `
                                <div class="timeline-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                                    ${action.undone ? `
                                        <button data-action="redo-timeline-action" data-id="${action.id}" class="timeline-action-btn timeline-redo" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; cursor: pointer; transition: all 0.2s; background-color: rgba(34, 197, 94, 0.1); color: var(--color-success); border: none;">
                                            <i data-lucide="rotate-ccw" class="inline-block" style="width: 16px; height: 16px;"></i>
                                            重做
                                        </button>
                                    ` : `
                                        <button data-action="undo-timeline-action" data-id="${action.id}" class="timeline-action-btn timeline-undo" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; cursor: pointer; transition: all 0.2s; background-color: rgba(59, 130, 246, 0.1); color: var(--color-primary); border: none;">
                                            <i data-lucide="undo-2" class="inline-block" style="width: 16px; height: 16px;"></i>
                                            撤销
                                        </button>
                                    `}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        };

        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-2xl mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h3 class="text-lg font-semibold" style="color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="history" class="inline-block" style="width: 20px; height: 20px;"></i>
                                操作历史
                            </h3>
                            <p class="text-sm" style="color: var(--text-secondary); margin-top: 4px;">最多保存 ${window.timelineService.maxRecords}条记录</p>
                        </div>
                        <button id="clear-timeline-btn" class="timeline-action-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; cursor: pointer; transition: all 0.2s; background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: none;">
                            <i data-lucide="trash" class="inline-block" style="width: 16px; height: 16px;"></i>
                            清空历史
                        </button>
                    </div>
                    <div id="timeline-container" class="max-h-[75vh] overflow-y-auto" style="padding-right: 8px;">
                        ${generateTimelineHtml()}
                    </div>
                </div>
            </div>
        `;
        
        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }

                // 恢复滚动位置
                if (window._timelineScrollTop !== undefined) {
                    const timelineContainer = document.getElementById('timeline-container');
                    if (timelineContainer) {
                        timelineContainer.scrollTop = window._timelineScrollTop;
                    }
                }

                const bindTimelineEvents = () => {
                    document.querySelectorAll('[data-action="undo-timeline-action"]').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const timelineContainer = document.getElementById('timeline-container');
                            window._timelineScrollTop = timelineContainer ? timelineContainer.scrollTop : 0;
                            const success = await window.timelineService.undoAction(id);
                            if (success) {
                                window.notificationService.show('撤销成功', 'success');
                                this.showTimeline();
                            } else {
                                window.notificationService.show('撤销失败', 'error');
                            }
                        });
                    });

                    document.querySelectorAll('[data-action="redo-timeline-action"]').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const timelineContainer = document.getElementById('timeline-container');
                            window._timelineScrollTop = timelineContainer ? timelineContainer.scrollTop : 0;
                            const success = await window.timelineService.redoAction(id);
                            if (success) {
                                window.notificationService.show('重做成功', 'success');
                                this.showTimeline();
                            } else {
                                window.notificationService.show('重做失败', 'error');
                            }
                        });
                    });

                    document.querySelectorAll('[data-action="toggle-timeline-expand"]').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            const timelineContainer = document.getElementById('timeline-container');
                            window._timelineScrollTop = timelineContainer ? timelineContainer.scrollTop : 0;
                            await window.timelineService.toggleExpand(id);
                            this.showTimeline();
                        });
                    });

                    const clearBtn = document.getElementById('clear-timeline-btn');
                    if (clearBtn) {
                        clearBtn.addEventListener('click', () => {
                            this.showConfirm('确定要清空所有操作历史吗？', async () => {
                                await window.timelineService.clearTimeline();
                                this.hide();
                                window.notificationService.show('历史已清空', 'success');
                            }, 'delete');
                        });
                    }
                };

                bindTimelineEvents();
            }
        });
    }
}

const modalService = new ModalService();
export default modalService;

