/**
 * 统一错误处理和日志服务
 * 负责全局错误收集、处理和日志记录
 */

class ErrorHandlerService {
    constructor() {
        this.logs = [];
        this.maxLogSize = 500;
        this.GLOBAL_DEBUG = typeof window !== 'undefined' ? window.GLOBAL_DEBUG : false;
        
        // 错误级别
        this.LEVELS = {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error'
        };
    }

    /**
     * 记录日志
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Error|Object} [error] - 错误对象
     * @param {string} [context] - 上下文信息
     */
    log(level, message, error = null, context = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null,
            context
        };

        this.logs.push(logEntry);
        
        // 限制日志大小
        if (this.logs.length > this.maxLogSize) {
            this.logs = this.logs.slice(-this.maxLogSize);
        }

        // 输出到控制台
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

        if (showNotification && window.notificationService) {
            window.notificationService.show(message, 'error');
        }
    }

    /**
     * 记录调试信息
     */
    debug(message, context = null) {
        this.log(this.LEVELS.DEBUG, message, null, context);
    }

    /**
     * 记录信息
     */
    info(message, context = null) {
        this.log(this.LEVELS.INFO, message, null, context);
    }

    /**
     * 记录警告
     */
    warn(message, error = null, context = null) {
        this.log(this.LEVELS.WARN, message, error, context);
    }

    /**
     * 记录错误
     */
    error(message, error, context = null) {
        this.log(this.LEVELS.ERROR, message, error, context);
    }

    /**
     * 获取最近的日志
     */
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    /**
     * 导出日志
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * 初始化全局错误监听
     */
    init() {
        // 监听未捕获的异常
        window.addEventListener('error', (event) => {
            this.handleError(event.error, '未捕获的异常', false);
        });

        // 监听未处理的 Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.warn('未处理的 Promise 拒绝', event.reason);
        });

        // 暴露到全局
        window.errorHandler = this;
        window.utils = window.utils || {};
        window.utils.handleError = (error, message, showNotification) => {
            this.handleError(error, message, showNotification);
        };
    }
}

const errorHandlerService = new ErrorHandlerService();
export default errorHandlerService;
