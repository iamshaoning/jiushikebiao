/**
 * 全局错误处理服务
 *
 * @description 捕获未处理的 Promise 异常和全局错误，提供统一错误报告接口
 * @module errorHandlerService
 */
import { registry } from '../core/registry.js';

class ErrorHandlerService {
    constructor() {
        this.GLOBAL_DEBUG = typeof window !== 'undefined' ? import.meta.env?.DEV : false;

        this.LEVELS = {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error'
        };
    }

    log(level, message, error = null, context = null) {
        if (this.GLOBAL_DEBUG) {
            this._logToConsole(level, message, error);
        }
    }

    /**
     * 输出日志到控制台
     */
    _logToConsole(level, message, error) {
        const prefix = `[${level.toUpperCase()}]`;
        switch (level) {
            case this.LEVELS.DEBUG:
                console.debug(prefix, message, error || '');
                break;
            case this.LEVELS.INFO:
                console.info(prefix, message, error || '');
                break;
            case this.LEVELS.WARN:
                console.warn(prefix, message, error || '');
                break;
            case this.LEVELS.ERROR:
                console.error(prefix, message, error || '');
                break;
        }
    }

    /**
     * 统一处理错误
     * @param {Error|Object} error - 错误对象
     * @param {string} message - 错误消息
     * @param {boolean} [showNotification=false] - 是否显示通知
     */
    handleError(error, message, showNotification = false) {
        this.log(this.LEVELS.ERROR, message, error);

        if (showNotification && registry.get('notificationService')) {
            registry.get('notificationService').show(message, 'error');
        }
    }

    init() {
        // 监听未捕获的异常
        window.addEventListener('error', (event) => {
            this.handleError(event.error, '未捕获的异常', false);
        });

        // 监听未处理的 Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
            const msg = event.reason?.message || String(event.reason || '');
            if (/InvalidStateError|Transition.*aborted|insertBefore|abort/i.test(msg)) {
                this.log(this.LEVELS.DEBUG, '已忽略的 Promise 拒绝', event.reason);
            } else {
                this.log(this.LEVELS.WARN, '未处理的 Promise 拒绝', event.reason);
            }
        });
    }
}

const errorHandlerService = new ErrorHandlerService();
export default errorHandlerService;
