/**
 * 核心工具函数模块
 * 提供通用的工具函数，包括ID生成、HTML转义、防抖、polyfill、安全操作等
 * 
 * @module coreUtils
 * @exports coreUtils
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
    }
};

export { coreUtils };
export default coreUtils;