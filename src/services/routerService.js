/**
 * 路由服务
 *
 * @description 基于 Hash 的 SPA 路由，支持 / /students /statistics 三个页面，含 404 处理
 * @module routerService
 */
import { registry } from '../core/registry.js';

class RouterService {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.notFoundCallback = null;
    }
    
    register(path, callback) {
        this.routes[path] = callback;
    }
    
    /**
     * 注册404页面回调
     */
    registerNotFound(callback) {
        this.notFoundCallback = callback;
    }
    
    init() {
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });
        
        this.handleRouteChange();
    }
    
    handleRouteChange() {
        const path = window.location.hash.slice(1) || '/';
        if (this.currentRoute !== path) {
            this.currentRoute = path;
            const callback = this.routes[path];
            if (callback) {
                callback();
            } else if (this.notFoundCallback) {
                this.notFoundCallback();
            } else if (this.routes['/']) {
                this.routes['/']();
            }
        }
    }
    
    navigate(path) {
        window.location.hash = path;
    }
}

const routerService = new RouterService();

export { RouterService, routerService };
export default routerService;