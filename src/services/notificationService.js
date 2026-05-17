/**
 * 通知服务
 *
 * @description Toast 风格消息提示，支持 success/error/warning/info 四种类型和自动消失
 * @module notificationService
 */
import { registry } from '../core/registry.js';

class NotificationService {
    constructor() {
        this.container = null;
        
        // 通知配置
        this.icons = {
            error: { icon: 'triangle-alert', color: 'var(--color-danger)' },
            warning: { icon: 'circle-alert', color: 'var(--color-warning)' },
            success: { icon: 'circle-check', color: 'var(--color-success)' },
            info: { icon: 'info', color: 'var(--color-primary)' }
        };
    }

    /**
     * 初始化通知服务
     */
    init() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            // 如果容器不存在，创建一个
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'fixed top-20 right-4 z-50 flex flex-col items-end space-y-2';
            document.body.appendChild(this.container);
        }
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型：info, success, error, warning
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, type = 'success', duration) {
        if (!this.container) {
            this.init();
        }

        // 如果未传duration，则根据通知类型设置默认时长
        if (duration === undefined) {
            if (type === 'error') {
                duration = 5000; // 错误通知显示5秒
            } else if (type === 'warning') {
                duration = 4000; // 警告通知显示4秒
            } else {
                duration = 3000; // 其他通知显示3秒
            }
        }

        const config = this.icons[type] || this.icons.success;

        // 创建通知元素
        const notificationEl = document.createElement('div');
        notificationEl.className = 'shadow-lg rounded-lg px-6 py-4 items-center transform translate-x-full opacity-0 transition-all duration-300 ease-out';
        notificationEl.style.width = 'auto';
        notificationEl.style.transform = 'translateX(100%) scale(0.95)';
        notificationEl.style.opacity = '0';
        notificationEl.style.backgroundColor = 'var(--bg-primary)';

        // 构建通知内容
        const safeMessage = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const content = `
            <div class="flex items-center">
                <div class="flex-shrink-0" style="color: ${config.color};">
                    <i data-lucide="${config.icon}" class="text-xl inline-block" style="width: 20px; height: 20px;"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium" style="color: var(--text-primary);">${safeMessage}</p>
                </div>
            </div>
        `;

        notificationEl.innerHTML = content;
        this.container.appendChild(notificationEl);

        // 初始化 Lucide 图标
        if (registry.get('lucide')) {
            registry.get('lucide').createIcons({ nodes: [notificationEl] });
        }

        // 触发重排，使过渡效果生效
        void notificationEl.offsetWidth;

        // 显示通知
        notificationEl.style.transform = 'translateX(0) scale(1)';
        notificationEl.style.opacity = '1';

        // 自动隐藏
        setTimeout(() => {
            notificationEl.style.transform = 'translateX(100%) scale(0.95)';
            notificationEl.style.opacity = '0';
            // 过渡结束后移除元素
            setTimeout(() => {
                if (notificationEl.parentNode === this.container) {
                    this.container.removeChild(notificationEl);
                }
            }, 300);
        }, duration);
    }

}

const notificationService = new NotificationService();
export default notificationService;