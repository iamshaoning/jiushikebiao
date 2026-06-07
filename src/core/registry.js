/**
 * 服务注册表
 *
 * @description 轻量级服务定位器，提供 set/get/has/unregister 接口，替代全局 window.* 实现依赖注入
 * @module registry
 */
const _services = new Map();
const NS = 'svc:';

export const registry = {
    set(name, value) { _services.set(NS + name, value); return value; },
    get(name) { return _services.get(NS + name); },
    has(name) { return _services.has(NS + name); },
    unregister(name) { return _services.delete(NS + name); }
};