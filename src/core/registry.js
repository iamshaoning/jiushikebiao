/**
 * 服务注册表
 *
 * @description 轻量级服务定位器，提供 set/get/has 接口，替代全局 window.* 实现依赖注入
 * @module registry
 */
const _services = {};

export const registry = {
    set(name, value) { _services[name] = value; return value; },
    get(name) { return _services[name]; },
    has(name) { return name in _services; }
};
