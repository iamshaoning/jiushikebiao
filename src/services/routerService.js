/**
 * 路由管理服务
 * 处理页面路由注册和导航，支持hash路由
 * 
 * @class RouterService
 * @exports RouterService
 * @exports routerService
 */
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
        window.addEventListener('popstate', () => {
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