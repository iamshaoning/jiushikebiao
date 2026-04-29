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
    }

    /**
     * 初始化模态框服务
     */
    init() {
        this.container = document.getElementById('modal-container');
        this.content = document.getElementById('modal-content');
        this.nestedContainer = document.getElementById('nested-modal-container');
        this.nestedContent = document.getElementById('nested-modal-content');

        // 如果容器不存在，创建它们
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
     * @param {string} content - 模态框内容
     * @param {Object} options - 选项
     */
    show(content, options = {}) {
        if (!this.container || !this.content) {
            this.init();
        }

        // 先移除之前的事件监听器
        this.eventListeners.forEach(({ element, type, listener }) => {
            element.removeEventListener(type, listener);
        });
        this.eventListeners = [];

        // 清除之前的setTimeout
        if (this.setTimeoutId) {
            clearTimeout(this.setTimeoutId);
            this.setTimeoutId = null;
        }

        // 阻止背景滚动
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        }

        // 设置内容
        this.content.innerHTML = content;

        // 显示模态框
        this.container.style.display = 'flex';
        this.container.offsetHeight; // 触发重排
        this.container.style.opacity = '1';
        this.content.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        this.content.classList.add('scale-100', 'opacity-100', 'translate-y-0');

        // 添加关闭按钮事件（同时支持 class="close-modal" 和 data-action="close-modal"）
        const closeButtons = this.content.querySelectorAll('.close-modal, [data-action="close-modal"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hide());
        });

        // 事件委托：统一处理data-action按钮
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
                    // 直接实现时间选择逻辑
                    const inputHour = document.getElementById(btn.dataset.inputId);
                    if (inputHour) {
                        const currentValue = inputHour.value || '00:00';
                        const [, minute] = currentValue.split(':');
                        inputHour.value = `${btn.dataset.hour}:${minute}`;

                        // 关闭时间选择器
                        if (btn.dataset.inputId === 'course-start-time') {
                            const startContainer = document.getElementById('start-time-container');
                            window.utils.safeAddClass(startContainer, 'hidden');
                        }

                        // 触发费用计算
                        if (typeof window.utils.calculateFee === 'function') {
                            window.utils.calculateFee();
                        }

                        // 如果是开始时间，自动计算结束时间
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

                        // 关闭时间选择器
                        if (btn.dataset.inputId === 'course-start-time') {
                            const startContainer = document.getElementById('start-time-container');
                            window.utils.safeAddClass(startContainer, 'hidden');
                        }

                        // 触发费用计算
                        if (typeof window.utils.calculateFee === 'function') {
                            window.utils.calculateFee();
                        }

                        // 如果是开始时间，自动计算结束时间
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

                        // 关闭下拉菜单
                        const durationDropdown = document.getElementById('duration-dropdown');
                        window.utils.safeAddClass(durationDropdown, 'hidden');

                        // 计算结束时间
                        if (typeof window.utils.calculateEndTime === 'function') {
                            window.utils.calculateEndTime('course-start-time', 'course-end-time', parseInt(btn.dataset.duration));
                        }

                        // 触发费用计算
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

        // 点击背景关闭（带拖动检测）
        let mouseDownPos = null;
        this.container.onmousedown = (e) => {
            if (e.target === this.container) {
                mouseDownPos = { x: e.clientX, y: e.clientY };
            }
        };
        this.container.onmouseup = (e) => {
            if (mouseDownPos && e.target === this.container) {
                const dx = Math.abs(e.clientX - mouseDownPos.x);
                const dy = Math.abs(e.clientY - mouseDownPos.y);
                if (dx < 5 && dy < 5 && !e.target.closest('input[type="date"]') && !e.target.closest('input[type="time"]')) {
                    this.hide();
                }
                mouseDownPos = null;
            }
        };

        // ESC键关闭
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // 执行回调
        if (options.onShow) {
            options.onShow();
        }
    }

    /**
     * 键盘事件处理
     */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.hide();
        }
    }

    /**
     * 隐藏模态框
     */
    hide() {
        if (!this.container || !this.content) return;

        console.log('hide - 清理 currentManagementModalConfig');
        window.currentManagementModalConfig = null;

        // 隐藏动画
        this.content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        this.content.classList.add('scale-90', 'opacity-0', 'translate-y-4');
        this.container.style.opacity = '0';

        // 恢复背景滚动
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        setTimeout(() => {
            this.container.style.display = 'none';
            // 触发hide事件
            const hideEvent = new Event('hide');
            this.container.dispatchEvent(hideEvent);
        }, 400);

        // 移除事件监听
        document.removeEventListener('keydown', this.handleKeydown.bind(this));

        // 移除模态框内容的事件监听器
        this.eventListeners.forEach(({ element, type, listener }) => {
            if (element) {
                element.removeEventListener(type, listener);
            }
        });
        this.eventListeners = [];

        // 清除setTimeout
        if (this.setTimeoutId) {
            clearTimeout(this.setTimeoutId);
            this.setTimeoutId = null;
        }
    }

    /**
     * 显示嵌套模态框
     * @param {string} content - 模态框内容
     * @param {Object} options - 选项
     */
    showNested(content, options = {}) {
        if (!this.nestedContainer || !this.nestedContent) {
            this.init();
        }

        // 阻止背景滚动
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.bottom = '0';

        // 设置内容
        this.nestedContent.innerHTML = content;

        // 显示模态框
        this.nestedContainer.style.display = 'flex';
        this.nestedContainer.offsetHeight; // 触发重排
        this.nestedContainer.style.opacity = '1';
        this.nestedContent.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        this.nestedContent.classList.add('scale-100', 'opacity-100', 'translate-y-0');

        // ESC键关闭嵌套模态框
        const nestedHandleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.hideNested();
            }
        };
        document.addEventListener('keydown', nestedHandleKeydown);

        // 点击背景关闭嵌套模态框
        this.nestedContainer.onclick = (e) => {
            if (e.target === this.nestedContainer) {
                this.hideNested();
            }
        };

        // 保存键盘处理函数引用以便后续移除
        this.nestedContainer._keydownHandler = nestedHandleKeydown;

        // 执行回调
        if (options.onShow) {
            options.onShow();
        }
    }

    /**
     * 隐藏嵌套模态框
     */
    hideNested() {
        if (!this.nestedContainer || !this.nestedContent) return;

        // 隐藏动画
        this.nestedContent.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        this.nestedContent.classList.add('scale-90', 'opacity-0', 'translate-y-4');
        this.nestedContainer.style.opacity = '0';

        setTimeout(() => {
            this.nestedContainer.style.display = 'none';
            // 恢复背景滚动
            const scrollY = parseInt(document.body.style.top) * -1;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.bottom = '';
            window.scrollTo(0, scrollY);
        }, 300);

        // 移除事件监听
        if (this.nestedContainer._keydownHandler) {
            document.removeEventListener('keydown', this.nestedContainer._keydownHandler);
            this.nestedContainer._keydownHandler = null;
        }
    }

    /**
     * 显示确认模态框
     * @param {string} message - 确认消息
     * @param {Function} onConfirm - 确认回调
     * @param {string} type - 类型：delete, confirm
     */
    showConfirm(message, onConfirm, type = 'confirm') {
        // 根据类型设置不同的样式
        const typeConfig = {
            confirm: {
                icon: 'badge-question-mark',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-500',
                btnText: '确定',
                btnColor: 'bg-blue-600 hover:bg-blue-700'
            },
            delete: {
                icon: 'triangle-alert',
                bgColor: 'bg-red-100',
                textColor: 'text-red-500',
                btnText: '删除',
                btnColor: 'bg-red-600 hover:bg-red-700'
            },
            warning: {
                icon: 'circle-alert',
                bgColor: 'bg-yellow-100',
                textColor: 'text-yellow-500',
                btnText: '确定',
                btnColor: 'bg-yellow-600 hover:bg-yellow-700'
            }
        };

        const config = typeConfig[type] || typeConfig.confirm;

        const content = `
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full ${config.bgColor} ${config.textColor} mb-4">
                        <i data-lucide="${config.icon}" class="text-2xl inline-block" style="width: 24px; height: 24px;"></i>
                    </div>
                    <p style="color: var(--text-primary);">${message}</p>
                </div>
                <div class="flex space-x-3">
                    <button id="cancel-confirm" class="flex-1 px-4 py-2 rounded-lg transition-colors" style="border: 1px solid var(--border-color); color: var(--text-primary); background-color: var(--bg-secondary);">
                        取消
                    </button>
                    <button id="accept-confirm" class="flex-1 px-4 py-2 ${config.btnColor} text-white rounded-lg transition-colors">
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
                document.getElementById('cancel-confirm').addEventListener('click', () => this.hide());
                document.getElementById('accept-confirm').addEventListener('click', () => {
                    onConfirm();
                    this.hide();
                });
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
                    <div id="add-student-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">姓名</label>
                            <input type="text" id="student-name" class="w-full px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
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
                                        ${window.state.organizations.map((org, index) => `<div class="custom-option ${index === 0 ? 'selected' : ''}" data-value="${org}">${org}</div>`).join('')}
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
                                        ${window.state.grades.map((grade, index) => `<div class="custom-option ${index === 0 ? 'selected' : ''}" data-value="${grade}">${grade}</div>`).join('')}
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
                                    <input type="number" id="duration-one-on-one" min="1" value="120" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="fee-one-on-one" min="0" step="0.01" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                            <div class="mt-2 text-sm" style="color: var(--text-secondary);">
                                多人课请在排课时定价
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal bg-red-500 text-white px-4 py-2 rounded-lg mr-2">关闭</button>
                            <button type="button" id="add-student-save" class="bg-primary text-white px-4 py-2 rounded-lg">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
                // 绑定保存按钮事件
                const addStudentSave = document.getElementById('add-student-save');
                if (addStudentSave) {
                    addStudentSave.addEventListener('click', async () => {
                        const name = document.getElementById('student-name').value.trim();
                        const organization = document.querySelector('#student-organization-options .custom-option.selected')?.dataset.value;
                        const grade = document.querySelector('#student-grade-options .custom-option.selected')?.dataset.value;
                        const duration = parseInt(document.getElementById('duration-one-on-one').value) || 120;
                        const fee = parseFloat(document.getElementById('fee-one-on-one').value) || 0;

                        // 验证数据
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

                        // 创建学生数据
                        const newStudent = {
                            id: 'student_' + Date.now(),
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

                        // 添加学生
                        window.state.students.push(newStudent);

                        // 设置同步状态并保存
                        if (window.serverStatusService) {
                            window.serverStatusService.setSyncing();
                        }
                        await window.utils.saveData();

                        // 刷新视图
                        window.utils.refreshAllViews();

                        // 关闭模态框
                        this.hide();

                        // 显示成功提示
                        window.notificationService.show('学生添加成功', 'success');
                    });
                }
            }
        });
    }

    /**
     * 显示添加课程模态框
     * @param {string} date - 日期
     */
    showAddCourse(date) {
        const content = window.utils.getCourseFormTemplate(false, { date });

        this.show(content, {
            onShow: () => {
                // 重新初始化 Lucide 图标
                if (window.lucide) {
                    lucide.createIcons();
                }

                // 初始化课程表单事件
                if (typeof window.utils.initCourseFormEvents === 'function') {
                    window.utils.initCourseFormEvents(false, { date });
                }

                // 绑定保存按钮事件
                const addCourseSave = document.getElementById('add-course-save');
                if (addCourseSave) {
                    addCourseSave.addEventListener('click', async () => {
                        const date = document.getElementById('course-date').value;
                        const lessonType = document.querySelector('input[name="course-lesson-type"]:checked').value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time').value;
                        const note = window.utils.escapeHtml(document.getElementById('course-note').value);

                        // 验证数据
                        if (!date) {
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

                        // 获取时长和费用
                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        // 创建课程数据
                        const studentIds = selectedStudents.map(s => s.dataset.id);
                        const studentNames = selectedStudents.map(s => s.dataset.name);
                        const colors = selectedStudents.map(s => s.dataset.color || '#6b7280');
                        
                        const newCourse = {
                            id: 'course_' + Date.now(),
                            date,
                            lessonType,
                            studentIds,
                            studentNames,
                            colors,
                            startTime,
                            duration,
                            fees: [fee],
                            note,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        // 检测课程冲突（只检测时间重叠，不考虑学生）
                        const hasConflict = window.state.courses.some(existingCourse => {
                            if (existingCourse.date !== newCourse.date) return false;
                            
                            const existingStart = new Date(`2000-01-01T${existingCourse.startTime}`).getTime();
                            const existingEnd = existingStart + (existingCourse.duration * 60 * 1000);
                            const newStart = new Date(`2000-01-01T${newCourse.startTime}`).getTime();
                            const newEnd = newStart + (newCourse.duration * 60 * 1000);
                            
                            return !(newEnd <= existingStart || newStart >= existingEnd);
                        });

                        if (hasConflict) {
                            window.notificationService.show('该时间段已有课程安排', 'warning');
                            return;
                        }

                        // 添加课程
                        window.state.courses.push(newCourse);

                        // 设置同步状态并保存
                        if (window.serverStatusService) {
                            window.serverStatusService.setSyncing();
                        }
                        await window.utils.saveData();

                        // 刷新视图
                        window.utils.refreshAllViews();

                        // 关闭模态框
                        this.hide();

                        // 显示成功提示
                        window.notificationService.show('课程添加成功', 'success');
                    });
                }
            }
        });
    }

    /**
     * 显示编辑课程模态框
     * @param {Object} course - 课程数据
     */
    showEditCourse(course) {
        const content = window.utils.getCourseFormTemplate(true, course);

        this.show(content, {
            onShow: () => {
                // 重新初始化 Lucide 图标
                if (window.lucide) {
                    lucide.createIcons();
                }

                // 初始化课程表单事件
                if (typeof window.utils.initCourseFormEvents === 'function') {
                    window.utils.initCourseFormEvents(true, course);
                }

                // 绑定保存按钮事件
                const saveCourse = document.getElementById('save-course');
                if (saveCourse) {
                    saveCourse.addEventListener('click', async () => {
                        // 显示加载状态
                        saveCourse.disabled = true;
                        saveCourse.innerHTML = '<i data-lucide="loader-circle" class="inline-block animate-spin mr-2" style="width: 16px; height: 16px;"></i>保存中...';

                        const courseId = document.getElementById('edit-course-id').value;
                        const date = document.getElementById('course-date').value;
                        const lessonType = document.querySelector('input[name="course-lesson-type"]:checked').value;
                        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
                        const startTime = document.getElementById('course-start-time').value;
                        const note = window.utils.escapeHtml(document.getElementById('course-note').value);

                        // 验证数据
                        if (!date) {
                            window.notificationService.show('请选择日期', 'warning');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                            return;
                        }
                        if (!lessonType) {
                            window.notificationService.show('请选择课型', 'warning');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                            return;
                        }
                        if (selectedStudents.length === 0) {
                            window.notificationService.show('请选择学生', 'warning');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                            return;
                        }
                        if (!startTime) {
                            window.notificationService.show('请选择开始时间', 'warning');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                            return;
                        }

                        // 获取时长和费用
                        const duration = parseInt(document.getElementById('course-duration').value) || 120;
                        const feeInput = document.getElementById('course-fee');
                        const fee = parseFloat(feeInput?.value) || 0;

                        // 创建更新后的课程数据（用于冲突检测）
                        const updatedStudentIds = selectedStudents.map(s => s.dataset.id);
                        const updatedStudentNames = selectedStudents.map(s => s.dataset.name);
                        const updatedColors = selectedStudents.map(s => s.dataset.color || '#6b7280');
                        
                        const updatedCourse = {
                            ...course,
                            id: courseId,
                            date,
                            lessonType,
                            studentIds: updatedStudentIds,
                            studentNames: updatedStudentNames,
                            colors: updatedColors,
                            startTime,
                            duration,
                            fees: [fee],
                            note,
                            updatedAt: new Date().toISOString()
                        };

                        // 检测课程冲突（只检测时间重叠，不考虑学生，排除当前正在编辑的课程）
                        const hasConflict = window.state.courses.some(existingCourse => {
                            // 跳过当前正在编辑的课程
                            if (existingCourse.id === courseId) return false;
                            if (existingCourse.date !== updatedCourse.date) return false;
                            
                            const existingStart = new Date(`2000-01-01T${existingCourse.startTime}`).getTime();
                            const existingEnd = existingStart + (existingCourse.duration * 60 * 1000);
                            const newStart = new Date(`2000-01-01T${updatedCourse.startTime}`).getTime();
                            const newEnd = newStart + (updatedCourse.duration * 60 * 1000);
                            
                            return !(newEnd <= existingStart || newStart >= existingEnd);
                        });

                        if (hasConflict) {
                            window.notificationService.show('该时间段已有课程安排', 'warning');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                            return;
                        }

                        // 查找并更新课程
                        const courseIndex = window.state.courses.findIndex(c => c.id === courseId);
                        if (courseIndex !== -1) {
                            window.state.courses[courseIndex] = updatedCourse;

                            // 设置同步状态并保存
                            if (window.serverStatusService) {
                                window.serverStatusService.setSyncing();
                            }
                            await window.utils.saveData();

                            // 刷新视图
                            window.utils.refreshAllViews();

                            // 关闭模态框
                            this.hide();

                            // 显示成功提示
                            window.notificationService.show('课程编辑成功', 'success');
                        } else {
                            window.notificationService.show('课程不存在', 'error');
                            saveCourse.disabled = false;
                            saveCourse.innerHTML = '保存';
                        }
                    });
                }
            }
        });
    }

    /**
     * 显示编辑学生模态框
     * @param {Object} student - 学生数据
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
                            <input type="text" id="edit-student-name" class="w-full px-3 py-2 rounded-md" value="${student.name}" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
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
                                    <input type="number" id="edit-duration-one-on-one" min="1" value="${student.fees && student.fees['一对一_duration'] ? student.fees['一对一_duration'] : 120}" class="w-12 px-2 py-1 rounded-md appearance-none" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                                    <span class="text-sm mx-2" style="color: var(--text-secondary);">分钟</span>
                                    <input type="number" id="edit-fee-one-on-one" min="0" step="0.01" class="w-12 px-2 py-1 rounded-md appearance-none" value="${student.fees ? (student.fees['一对一'] || 0) : 0}" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                                    <span class="text-sm ml-2" style="color: var(--text-secondary);">元</span>
                                </div>
                            </div>
                            <div class="mt-2 text-sm" style="color: var(--text-secondary);">
                                多人课请在排课时定价
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="close-modal bg-red-500 text-white px-4 py-2 rounded-lg mr-2">关闭</button>
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
                // 绑定保存按钮事件
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

                        // 验证数据
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

                        // 查找并更新学生
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

                            // 更新相关课程中的学生信息
                            window.state.courses.forEach(course => {
                                if (course.studentNames && course.studentNames.includes(oldName)) {
                                    const idx = course.studentNames.indexOf(oldName);
                                    if (idx !== -1) {
                                        course.studentNames[idx] = name;
                                    }
                                }
                            });

                            // 设置同步状态并保存
                            if (window.serverStatusService) {
                                window.serverStatusService.setSyncing();
                            }
                            await window.utils.saveData();

                            // 刷新视图
                            window.utils.refreshAllViews();

                            // 关闭模态框
                            this.hide();

                            // 显示成功提示
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
     * 显示通用管理模态框
     * @param {Object} config - 配置对象
     */
    showManagementModal(config) {
        const { title, items, itemName, addItem, editItem, deleteItem, onDelete, updateUI } = config;

        const content = `
            <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">${title}</h3>
                    </div>
                    <div class="mb-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <input type="text" id="new-${itemName}" class="flex-grow px-3 py-2 rounded-md" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                            <button id="add-${itemName}" class="bg-primary text-white px-3 py-2 rounded-md" data-action="add-org-inline" data-item-name="${itemName}">添加</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium mb-2" style="color: var(--text-primary);">已有${itemName}</h4>
                        <div id="${itemName}s-list" class="space-y-2 max-h-80 overflow-y-auto pr-2">
                            ${items.map(item => `
                                <div class="flex items-center justify-between p-2 rounded" style="background-color: var(--bg-content);" data-${itemName}="${item}">
                                    <span class="${itemName}-name" style="color: var(--text-primary);">${window.utils.escapeHtml(item)}</span>
                                    <div class="flex items-center">
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${item}">
                                            <i data-lucide="square-pen" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                                        </button>
                                        <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${item}">
                                            <i data-lucide="trash-2" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="button" class="close-modal bg-red-500 text-white px-4 py-2 rounded-lg">关闭</button>
                    </div>
                </div>
            </div>
        `;

        console.log('showManagementModal - 被调用, title:', config.title, 'items:', config.items.length, config.items);
        
        // 保存当前配置到全局变量 - 供 index.html 中的事件处理函数使用
        console.log('showManagementModal - 设置 config:', config.items.length, 'items:', config.items);
        window.currentManagementModalConfig = config;
        
        this.show(content, {
            onShow: () => {
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });

        // 自动激活输入框
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

                const newColor = window.utils.generateColor(newOrg);

                // 直接修改数据
                window.state.organizations[index] = newOrg;
                config.items[index] = newOrg;

                window.state.students.forEach(student => {
                    if (student.organization === oldOrg) {
                        student.organization = newOrg;
                    }
                });

                window.state.courses.forEach(course => {
                    if (course.studentIds) {
                        course.organizations = course.organizations.map((o, idx) => {
                            if (o === oldOrg) {
                                if (course.colors && course.colors[idx]) {
                                    course.colors[idx] = newColor;
                                }
                                return newOrg;
                            }
                            return o;
                        });
                    }
                });

                // 更新 DOM 中的显示
                const itemElement = document.querySelector(`[data-机构="${newOrg}"]`);
                if (itemElement) {
                    const nameSpan = itemElement.querySelector('.机构-name');
                    if (nameSpan) {
                        nameSpan.textContent = newOrg;
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

                // 直接修改数据
                window.state.grades[index] = newGrade;
                config.items[index] = newGrade;

                window.state.students.forEach(student => {
                    if (student.grade === oldGrade) {
                        student.grade = newGrade;
                    }
                });

                // 更新 DOM 中的显示
                const itemElement = document.querySelector(`[data-年级="${newGrade}"]`);
                if (itemElement) {
                    const nameSpan = itemElement.querySelector('.年级-name');
                    if (nameSpan) {
                        nameSpan.textContent = newGrade;
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
     * 关闭所有弹出层（课程标签按钮组、日历格子按钮组、选中状态等）
     */
    closeAllPopovers() {
        document.querySelectorAll('.cell-action-group').forEach(btnGroup => btnGroup.remove());
        document.querySelectorAll('.course-action-group').forEach(btnGroup => btnGroup.remove());
        document.querySelectorAll('.calendar-cell-selected').forEach(cell => cell.classList.remove('calendar-cell-selected'));
        document.querySelectorAll('.course-tag-item.is-selected').forEach(el => el.classList.remove('is-selected'));
    }

    /**
     * 显示快照管理模态框
     */
    showSnapshotManager() {
        const snapshots = window.utils.getSnapshots();
        
        // 按照类型分类快照
        const loginSnapshots = snapshots.filter(s => s.type === 'login' || s.type === 'auto');
        const courseChangeSnapshots = snapshots.filter(s => s.type === 'course_change');
        const manualSnapshots = snapshots.filter(s => s.type === 'manual');
        
        // 生成快照HTML
        const generateSnapshotHtml = (snapshots, title, type) => {
            if (snapshots.length === 0) {
                return `<div class="mb-6">
                    <h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4>
                    <p class="text-center p-3 border rounded-lg" style="color: var(--text-secondary); border-color: var(--border-color);">暂无快照</p>
                </div>`;
            }
            
            const snapshotItems = snapshots.map(snapshot => {
                const date = new Date(snapshot.timestamp);
                const formattedDate = date.toLocaleString();
                const studentCount = snapshot.data.students?.length || 0;
                const courseCount = snapshot.data.courses?.length || 0;
                const typeText = snapshot.type === 'login' ? '登录' : 
                                snapshot.type === 'auto' ? '自动' : 
                                snapshot.type === 'course_change' ? '课程变更' : '手动';
                
                return `
                    <div class="p-3 border rounded-lg mb-2 flex justify-between items-center" style="border-color: var(--border-color);">
                        <div>
                            <div class="font-medium" style="color: var(--text-primary);">${formattedDate} (${typeText})</div>
                            <div class="text-sm" style="color: var(--text-secondary);">学生: ${studentCount}人, 课程: ${courseCount}节</div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="restore-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-success); color: white;" data-id="${snapshot.id}">恢复</button>
                            ${type === 'manual' ? `<button class="overwrite-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-primary); color: white;" data-id="${snapshot.id}">覆盖</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            return `<div class="mb-6">
                <h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4>
                <div>${snapshotItems}</div>
            </div>`;
        };
        
        // 生成手动快照栏位（默认3个）
        const generateManualSnapshotsHtml = (manualSnapshots) => {
            const html = [];
            
            // 添加现有手动快照
            for (let i = 0; i < manualSnapshots.length; i++) {
                const snapshot = manualSnapshots[i];
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
            
            // 添加空栏位（最多3个）
            for (let i = manualSnapshots.length; i < 3; i++) {
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
                        ${generateSnapshotHtml(loginSnapshots, '自动快照 (登录/每5分钟)', 'auto')}
                        ${generateSnapshotHtml(courseChangeSnapshots, '课程变更快照 (变动>5节)', 'course_change')}
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
        
        // 绑定事件
        setTimeout(() => {
            // 绑定创建手动快照事件
            document.querySelectorAll('[data-action="create-manual-snapshot"]').forEach(div => {
                div.addEventListener('click', function() {
                    window.utils.createSnapshot('manual');
                    // 重新显示快照管理窗口
                    setTimeout(() => {
                        modalService.showSnapshotManager();
                    }, 500);
                });
            });
            
            // 绑定恢复快照事件
            document.querySelectorAll('.restore-snapshot').forEach(button => {
                button.addEventListener('click', function() {
                    const snapshotId = this.getAttribute('data-id');
                    modalService.showConfirm('确定要恢复此快照吗？<br>这将覆盖当前数据。', () => {
                        window.utils.restoreSnapshot(snapshotId);
                        modalService.hide();
                    }, 'warning');
                });
            });
            
            // 绑定覆盖快照事件
            document.querySelectorAll('.overwrite-snapshot').forEach(button => {
                button.addEventListener('click', function() {
                    const snapshotId = this.getAttribute('data-id');
                    modalService.showConfirm('确定要覆盖此快照吗？', () => {
                        try {
                            // 删除旧快照
                            window.utils.deleteSnapshot(snapshotId, false);
                            // 创建新快照
                            window.utils.createSnapshot('manual', false);
                            // 显示简化的通知
                            window.notificationService.show('快照覆盖成功', 'success');
                            // 重新显示快照管理窗口
                            setTimeout(() => {
                                modalService.showSnapshotManager();
                            }, 500);
                        } catch (error) {
                            window.notificationService.show('快照覆盖失败', 'error');
                        }
                    }, 'warning');
                });
            });
        }, 0);
    }
}

// 导出单例实例
const modalService = new ModalService();
export default modalService;