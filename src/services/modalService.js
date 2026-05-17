/**
 * 模态框核心服务
 *
 * @description 提供 show/hide/showNested/hideNested/showConfirm 等模态框动画引擎，委托子模块处理具体业务表单
 * @module modalService
 */
import { registry } from '../core/registry.js';
import { ColorPickerModal } from './modal/colorPickerModal.js';
import { TimelineModal } from './modal/timelineModal.js';
import { StudentFormModal } from './modal/studentFormModal.js';
import { CourseFormModal } from './modal/courseFormModal.js';
import { ManagementModal } from './modal/managementModal.js';
import { SnapshotModal } from './modal/snapshotModal.js';

class ModalService {
    constructor() {
        this.container = null;
        this.content = null;
        this.nestedContainer = null;
        this.nestedContent = null;
        this.eventListeners = [];
        this.setTimeoutId = null;
        this._boundKeydownHandler = null;
        this.colorPicker = new ColorPickerModal(this);
        this.timeline = new TimelineModal(this);
        this.studentForm = new StudentFormModal(this);
        this.courseForm = new CourseFormModal(this);
        this.management = new ManagementModal(this);
        this.snapshot = new SnapshotModal(this);
    }

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

    show(content, options = {}) {
        if (!this.container || !this.content) this.init();

        if (this.nestedContainer && this.nestedContainer.style.display === 'flex') this.hideNested();

        // 清理之前的事件监听器，避免重复绑定
        this.eventListeners.forEach(({ element, type, listener }) => { if (element) element.removeEventListener(type, listener); });
        this.eventListeners = [];
        if (this._boundKeydownHandler) { document.removeEventListener('keydown', this._boundKeydownHandler); this._boundKeydownHandler = null; }

        if (this.setTimeoutId) { clearTimeout(this.setTimeoutId); this.setTimeoutId = null; }
        if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }

        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;

        this.content.style.transition = 'none';
        this.content.innerHTML = content;
        void this.content.offsetWidth;
        this.content.style.transition = '';
        this.container.style.display = 'flex';
        this.container.offsetHeight;
        this.container.style.opacity = '1';
        this.content.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        this.content.classList.add('scale-100', 'opacity-100', 'translate-y-0');

        this.content.querySelectorAll('.close-modal, [data-action="close-modal"]').forEach(btn => {
            const h = () => this.hide();
            btn.addEventListener('click', h);
            this.eventListeners.push({ element: btn, type: 'click', listener: h });
        });

        const actionListener = (e) => {
            if (e.target.closest('.close-modal')) { this.hide(); e.stopPropagation(); return; }
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            switch (action) {
                case 'toggle-date-picker': registry.get('utils').toggleDatePicker(btn.dataset.target); e.stopPropagation(); break;
                case 'change-date-month': registry.get('utils').changeDateMonth(btn.dataset.target, parseInt(btn.dataset.delta)); e.stopPropagation(); break;
                case 'close-picker': { const el = document.getElementById(btn.dataset.target); registry.get('utils').safeAddClass(el, 'hidden'); e.stopPropagation(); break; }
                case 'toggle-time-picker': registry.get('utils').toggleTimePicker(btn.dataset.target); e.stopPropagation(); break;
                case 'select-time-hour': this._handleTimeSelect(btn, 'hour'); e.stopPropagation(); break;
                case 'select-time-minute': this._handleTimeSelect(btn, 'minute'); e.stopPropagation(); break;
                case 'select-duration': this._handleDurationSelect(btn); e.stopPropagation(); break;
                case 'close-modal': this.hide(); e.stopPropagation(); break;
                default: break;
            }
        };
        this.content.addEventListener('click', actionListener);
        this.eventListeners.push({ element: this.content, type: 'click', listener: actionListener });

        let mouseDownPos = null;
        const mouseDownHandler = (e) => { if (e.target === this.container) mouseDownPos = { x: e.clientX, y: e.clientY }; };
        const mouseUpHandler = (e) => {
            if (mouseDownPos && e.target === this.container) {
                const dx = Math.abs(e.clientX - mouseDownPos.x), dy = Math.abs(e.clientY - mouseDownPos.y);
                if (dx < 5 && dy < 5 && !e.target.closest('input[type="date"]') && !e.target.closest('input[type="time"]')) this.hide();
                mouseDownPos = null;
            }
        };
        this.container.addEventListener('mousedown', mouseDownHandler);
        this.container.addEventListener('mouseup', mouseUpHandler);
        this.eventListeners.push({ element: this.container, type: 'mousedown', listener: mouseDownHandler });
        this.eventListeners.push({ element: this.container, type: 'mouseup', listener: mouseUpHandler });

        this._boundKeydownHandler = this.handleKeydown.bind(this);
        document.addEventListener('keydown', this._boundKeydownHandler);

        if (options.onShow) options.onShow();
    }

    _handleTimeSelect(btn, part) {
        const input = document.getElementById(btn.dataset.inputId);
        if (!input) return;
        const currentValue = input.value || '00:00';
        const [hour, minute] = currentValue.split(':');
        input.value = part === 'hour' ? `${btn.dataset.hour}:${minute}` : `${hour}:${btn.dataset.minute}`;

        registry.get('utils').calculateFee();
        if (btn.dataset.inputId === 'course-start-time') {
            const d = document.getElementById('course-duration');
            registry.get('utils').calculateEndTime('course-start-time', 'course-end-time', d ? parseInt(d.value) || 120 : 120);
        }
    }

    _handleDurationSelect(btn) {
        const d = document.getElementById('course-duration');
        if (!d) return;
        d.value = btn.dataset.duration;
        registry.get('utils').safeAddClass(document.getElementById('duration-dropdown'), 'hidden');
        registry.get('utils').calculateEndTime('course-start-time', 'course-end-time', parseInt(btn.dataset.duration));
        registry.get('utils').calculateFee();
    }

    handleKeydown(e) { if (e.key === 'Escape') this.hide(); }

    hide() {
        if (!this.container || !this.content) return;
        if (this.nestedContainer && this.nestedContainer.style.display === 'flex') this.hideNested();

        registry.set('currentManagementModalConfig', null);
        this.content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        this.content.classList.add('scale-90', 'opacity-0', 'translate-y-4');
        this.container.style.opacity = '0';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        if (this._hideTimer) clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => {
            this._hideTimer = null;
            this.container.style.display = 'none';
            this.container.dispatchEvent(new Event('hide'));
        }, 400);

        if (this._boundKeydownHandler) { document.removeEventListener('keydown', this._boundKeydownHandler); this._boundKeydownHandler = null; }
        this.eventListeners.forEach(({ element, type, listener }) => { if (element) element.removeEventListener(type, listener); });
        this.eventListeners = [];
        if (this.setTimeoutId) { clearTimeout(this.setTimeoutId); this.setTimeoutId = null; }
    }

    showNested(content, options = {}) {
        if (this._nestedHideTimer) { clearTimeout(this._nestedHideTimer); this._nestedHideTimer = null; }
        if (!this.nestedContainer || !this.nestedContent) this.init();

        // 移除之前可能存在的事件监听器，避免重复绑定
        if (this.nestedContainer._keydownHandler) {
            document.removeEventListener('keydown', this.nestedContainer._keydownHandler);
            this.nestedContainer._keydownHandler = null;
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

        const nestedHandleKeydown = (e) => { if (e.key === 'Escape') this.hideNested(); };
        document.addEventListener('keydown', nestedHandleKeydown);
        this.nestedContainer.onclick = (e) => { if (e.target === this.nestedContainer) this.hideNested(); };
        this.nestedContainer._keydownHandler = nestedHandleKeydown;

        if (options.onShow) options.onShow();
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

        if (this.nestedContainer._keydownHandler) { document.removeEventListener('keydown', this.nestedContainer._keydownHandler); this.nestedContainer._keydownHandler = null; }
    }

    showConfirm(message, onConfirm, type = 'confirm') {
        const typeConfig = {
            confirm: { icon: 'badge-question-mark', bgStyle: 'background-color: rgba(59, 130, 246, 0.1);', textStyle: 'color: var(--color-primary);', btnText: '确定', btnStyle: 'background-color: var(--color-primary);' },
            delete: { icon: 'triangle-alert', bgStyle: 'background-color: rgba(239, 68, 68, 0.1);', textStyle: 'color: var(--color-danger);', btnText: '删除', btnStyle: 'background-color: var(--color-danger);' },
            warning: { icon: 'circle-alert', bgStyle: 'background-color: rgba(245, 158, 11, 0.1);', textStyle: 'color: var(--color-warning);', btnText: '确定', btnStyle: 'background-color: var(--color-warning);' }
        };
        const cfg = typeConfig[type] || typeConfig.confirm;

        const content = `<div class="p-6"><div class="text-center mb-6"><div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style="${cfg.bgStyle}"><i data-lucide="${cfg.icon}" class="text-2xl inline-block" style="${cfg.textStyle} width: 24px; height: 24px;"></i></div><p style="color: var(--text-primary);">${message}</p></div><div class="flex space-x-3"><button id="cancel-confirm" class="flex-1 px-4 py-2 rounded-lg transition-colors" style="border: 1px solid var(--border-color); color: var(--text-primary); background-color: var(--bg-secondary);">取消</button><button id="accept-confirm" class="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style="${cfg.btnStyle}">${cfg.btnText}</button></div></div>`;

        this.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                const cancelBtn = document.getElementById('cancel-confirm');
                const acceptBtn = document.getElementById('accept-confirm');
                if (!cancelBtn || !acceptBtn) return;
                const cancelHandler = () => this.hide();
                const acceptHandler = async () => { acceptBtn.disabled = true; try { await onConfirm(); } catch (error) { registry.get('errorHandlerService').log('error', '操作失败', error); registry.get('notificationService').show('操作失败', 'error'); } this.hide(); };
                cancelBtn.addEventListener('click', cancelHandler);
                acceptBtn.addEventListener('click', acceptHandler);
                this.eventListeners.push({ element: cancelBtn, type: 'click', listener: cancelHandler }, { element: acceptBtn, type: 'click', listener: acceptHandler });
            }
        });
    }

    closeAllPopovers() {
        document.querySelectorAll('.calendar-cell-selected').forEach(el => el.classList.remove('calendar-cell-selected'));
        document.querySelectorAll('.course-tag-item.is-selected').forEach(el => el.classList.remove('is-selected'));
        const fab = document.getElementById('floating-action-bar');
        if (fab) { fab.classList.remove('active'); }
    }

    showAddStudent() { this.studentForm.showAddStudent(); }
    showEditStudent(student) { this.studentForm.showEditStudent(student); }
    showAddCourse(date) { this.courseForm.showAddCourse(date); }
    showEditCourse(course) { this.courseForm.showEditCourse(course); }
    showManageOrganizations() { this.management.showManageOrganizations(); }
    showManageGrades() { this.management.showManageGrades(); }
    showColorPicker(options) { this.colorPicker.show(options); }
    async showSnapshotManager() { await this.snapshot.show(); }
    async showTimeline() { await this.timeline.show(); }
}

const modalService = new ModalService();
export default modalService;
