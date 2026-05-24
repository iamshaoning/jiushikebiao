/**
 * 路由服务
 *
 * @description 基于 Hash 的 SPA 路由，支持 / /students /statistics 三个页面
 * @module routerService
 */
import { registry } from '../core/registry.js';

class RouterService {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
    }

    register(path, callback) {
        this.routes[path] = callback;
    }

    init() {
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        this.handleRouteChange();
    }

    handleRouteChange() {
        let path = window.location.hash.slice(1) || '/';
        // 默认路径 '/' 同步为 '/calendar'
        if (path === '/') {
            path = '/calendar';
            window.location.hash = '/calendar';
        }
        if (this.currentRoute !== path) {
            this.currentRoute = path;
            const callback = this.routes[path];
            if (callback) {
                callback();
            } else {
                // 不存在的路径回退到 /#/calendar
                window.location.hash = '/calendar';
            }
        }
    }
    
    navigate(path) {
        window.location.hash = path;
    }
}

const routerService = new RouterService();

export default routerService;