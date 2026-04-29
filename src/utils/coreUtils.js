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
        if (!unsafe) return '';
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
    
    polyfill: () => {
        if (!String.prototype.padStart) {
            String.prototype.padStart = function(targetLength, padString) {
                targetLength = targetLength >> 0;
                padString = String(typeof padString !== 'undefined' ? padString : ' ');
                if (this.length > targetLength) {
                    return String(this);
                } else {
                    targetLength = targetLength - this.length;
                    if (targetLength > padString.length) {
                        padString += padString.repeat(targetLength / padString.length);
                    }
                    return padString.slice(0, targetLength) + String(this);
                }
            };
        }
        
        if (!Object.entries) {
            Object.entries = function(obj) {
                var ownProps = Object.keys(obj),
                    i = ownProps.length,
                    resArray = new Array(i);
                while (i--) {
                    resArray[i] = [ownProps[i], obj[ownProps[i]]];
                }
                return resArray;
            };
        }
        
        if (!Object.values) {
            Object.values = function(obj) {
                var ownProps = Object.keys(obj),
                    i = ownProps.length,
                    resArray = new Array(i);
                while (i--) {
                    resArray[i] = obj[ownProps[i]];
                }
                return resArray;
            };
        }
        
        if (!Array.from) {
            Array.from = function(arrayLike, mapFn, thisArg) {
                var C = this;
                var items = Object(arrayLike);
                var len = items.length >>> 0;
                var A = C === Array ? new C(len) : new Array(len);
                var k = 0;
                while (k < len) {
                    var kValue = items[k];
                    if (mapFn) {
                        A[k] = mapFn.call(thisArg, kValue, k);
                    } else {
                        A[k] = kValue;
                    }
                    k++;
                }
                A.length = len;
                return A;
            };
        }
        
        if (!Array.prototype.includes) {
            Array.prototype.includes = function(searchElement, fromIndex) {
                var O = Object(this);
                var len = parseInt(O.length) || 0;
                if (len === 0) {
                    return false;
                }
                var n = parseInt(fromIndex) || 0;
                var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
                function sameValueZero(x, y) {
                    return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
                }
                while (k < len) {
                    if (sameValueZero(O[k], searchElement)) {
                        return true;
                    }
                    k++;
                }
                return false;
            };
        }
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