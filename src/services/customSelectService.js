/**
 * 自定义选择器服务
 *
 * @description 管理自定义下拉选择器的交互逻辑
 * @module customSelectService
 */
class CustomSelectService {
    constructor() {
        this.closeListener = null;
    }

    /**
     * 创建点击外部关闭监听器
     * @param {string} pickerId - 选择器ID
     * @param {string} excludeSelector - 排除的选择器
     * @param {Function} callback - 关闭时的回调函数
     */
    createCloseListener(pickerId, excludeSelector, callback) {
        // 如果已有监听器，先移除
        if (this.closeListener) {
            document.removeEventListener('click', this.closeListener);
        }

        this.closeListener = (event) => {
            const target = event.target;
            const isInsidePicker = target.closest(`#${pickerId}`);
            const isInsideExclude = excludeSelector && target.closest(excludeSelector);

            if (!isInsidePicker && !isInsideExclude) {
                // 点击在外部，执行回调
                if (typeof callback === 'function') {
                    callback();
                }
            }
        };

        document.addEventListener('click', this.closeListener);
    }

    /**
     * 切换选择器显示
     * @param {string} pickerId - 选择器容器ID
     * @param {Array} excludeIds - 需要排除关闭的其他选择器ID数组
     * @param {Function} closeListener - 关闭时的监听器
     */
    togglePicker(pickerId, excludeIds = [], closeListener) {
        const picker = document.getElementById(pickerId);
        if (!picker) return;

        // 关闭其他选择器（排除指定的选择器）
        if (excludeIds && excludeIds.length > 0) {
            document.querySelectorAll('.custom-select-options.open').forEach(options => {
                const wrapper = options.parentElement;
                if (!excludeIds.includes(wrapper.id)) {
                    options.classList.remove('open');
                    wrapper.querySelector('.custom-select-trigger')?.classList.remove('active');
                }
            });
        } else {
            // 关闭所有选择器
            document.querySelectorAll('.custom-select-options.open').forEach(options => {
                const wrapper = options.parentElement;
                options.classList.remove('open');
                wrapper.querySelector('.custom-select-trigger')?.classList.remove('active');
            });
        }

        // 切换当前选择器
        const options = picker.querySelector('.custom-select-options');
        const trigger = picker.querySelector('.custom-select-trigger');

        if (options) {
            options.classList.toggle('open');
        }
        if (trigger) {
            trigger.classList.toggle('active');
        }

        // 设置关闭监听器
        if (closeListener && typeof closeListener === 'function') {
            if (this.closeListener) {
                document.removeEventListener('click', this.closeListener);
            }
            this.closeListener = closeListener;
            document.addEventListener('click', this.closeListener);
        }
    }

    /**
     * 切换时长选择器
     * @param {string} dropdownId - 下拉菜单ID
     */
    toggleDurationPicker(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        const isHidden = dropdown.classList.contains('hidden');
        
        if (isHidden) {
            dropdown.classList.remove('hidden');
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-8px)';
            dropdown.offsetHeight;
            dropdown.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';

            // 设置点击外部关闭的监听器
            if (this.closeListener) {
                document.removeEventListener('click', this.closeListener);
            }

            this.closeListener = (event) => {
                const target = event.target;
                const isInsideDropdown = target.closest(`#${dropdownId}`);
                const isToggleButton = target.closest('[data-action="toggle-duration-dropdown"]');

                if (!isInsideDropdown && !isToggleButton) {
                    this._hideDurationPicker(dropdown);
                    document.removeEventListener('click', this.closeListener);
                    this.closeListener = null;
                }
            };

            document.addEventListener('click', this.closeListener);
        } else {
            this._hideDurationPicker(dropdown);
        }
    }

    _hideDurationPicker(dropdown) {
        if (!dropdown || dropdown.classList.contains('hidden')) return;
        dropdown.style.transition = 'opacity 150ms ease-in, transform 150ms ease-in';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-8px)';
        const onTransitionEnd = () => {
            dropdown.classList.add('hidden');
            dropdown.style.opacity = '';
            dropdown.style.transform = '';
            dropdown.style.transition = '';
            dropdown.removeEventListener('transitionend', onTransitionEnd);
        };
        dropdown.addEventListener('transitionend', onTransitionEnd, { once: true });
        if (this.closeListener) {
            document.removeEventListener('click', this.closeListener);
            this.closeListener = null;
        }
    }

    /**
     * 获取自定义选择器的值
     * @param {string} wrapperId - 容器ID
     * @returns {string|null} 选中的值
     */
    getCustomSelectValue(wrapperId) {
        const container = document.getElementById(wrapperId);
        if (!container) return null;

        const selectedOption = container.querySelector('.custom-option.selected');
        return selectedOption ? selectedOption.dataset.value : null;
    }

    /**
     * 设置自定义选择器的值
     * @param {string} wrapperId - 容器ID
     * @param {string|number} value - 要设置的值
     */
    setCustomSelectValue(wrapperId, value) {
        const container = document.getElementById(wrapperId);
        if (!container) return;

        const trigger = container.querySelector('.custom-select-trigger');
        const option = container.querySelector(`.custom-option[data-value="${CSS.escape(value)}"]`);

        if (trigger && option) {
            // 更新触发器文本
            const triggerText = trigger.querySelector('span');
            if (triggerText) {
                triggerText.textContent = option.textContent;
            } else {
                trigger.textContent = option.textContent;
            }

            // 更新选中状态
            container.querySelectorAll('.custom-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
        }
    }

    /**
     * 关闭所有自定义下拉菜单
     */
    closeAllSelectDropdowns() {
        document.querySelectorAll('.custom-select-options.open').forEach(options => {
            options.classList.remove('open');
            const trigger = options.parentElement.querySelector('.custom-select-trigger');
            if (trigger) {
                trigger.classList.remove('active');
            }
        });
    }

}

export default CustomSelectService;
