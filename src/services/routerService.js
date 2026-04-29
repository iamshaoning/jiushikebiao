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
    }
    
    register(path, callback) {
        this.routes[path] = callback;
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
            } else {
                if (this.routes['/']) {
                    this.routes['/']();
                }
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