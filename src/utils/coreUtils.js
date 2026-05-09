/**
 * 核心工具函数
 *
 * @description 通用工具函数：ID生成、HTML转义、防抖、安全DOM操作等
 * @module coreUtils
 */
const coreUtils = {
    generateId: () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
    
    escapeHtml: (unsafe) => {
        if (unsafe == null) return '';
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    debounce: (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    safe: (element, method, ...args) => {
        if (!element) return null;
        if (typeof element[method] === 'function') {
            return element[method](...args);
        }
        return element[method];
    },
    
    safeSet: (element, property, value) => {
        if (element) {
            element[property] = value;
        }
    },
    
    safeAddClass: (element, classes) => {
        if (!element) return;
        if (typeof classes === 'string') {
            element.classList.add(classes);
        } else if (Array.isArray(classes)) {
            classes.forEach(cls => element.classList.add(cls));
        }
    },
    
    safeRemoveClass: (element, classes) => {
        if (!element) return;
        if (typeof classes === 'string') {
            element.classList.remove(classes);
        } else if (Array.isArray(classes)) {
            classes.forEach(cls => element.classList.remove(cls));
        }
    },

    withTimeout: (fn, timeout, errorMessage) => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(errorMessage)), timeout);
            fn().then(resolve).catch(reject).finally(() => clearTimeout(timer));
        });
    }
};

export { coreUtils };
export default coreUtils;