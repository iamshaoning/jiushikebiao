/**
 * 初始化服务模块
 * 负责应用的初始化流程、认证状态检查、会话管理、自动登出逻辑
 */
class InitService {
    constructor(utils, notificationService, serverStatusService, authUIService, themeService, loadSystem, elements) {
        this.utils = utils;
        this.notificationService = notificationService;
        this.serverStatusService = serverStatusService;
        this.authUIService = authUIService;
        this.themeService = themeService;
        this.loadSystem = loadSystem;
        this.elements = elements;
        this.authStateChangeTimer = null;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 应用兼容性处理
            this.utils.polyfill();

            // 初始化防抖保存函数（在utils对象创建后）
            this.utils.initDebouncedSave();

            // 初始化认证UI
            this.authUIService.init();

            // 等待 DOM 完全加载
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });

            // 等待 Supabase 初始化完成
            await window.supabaseReady;

            const auth = window.supabaseAuth;
            if (auth) {
                // 认证状态检查函数
                const checkAuthStatus = async (retries = 2) => {
                    try {
                        const { data } = await this.utils.withTimeout(() => auth.getSession(), 2000, '获取会话超时');
                        const session = data.session;
                        if (session) {
                            // 登录时创建快照（如果本地有数据）- 在任何数据同步之前
                            this.utils.createSnapshot('login');

                            // 用户已登录，更新UI并加载渲染系统
                            const user = session.user;
                            this.authUIService.updateUIForAuth(user);
                            this.loadSystem();

                            // 存储登录时间，用于会话管理
                            localStorage.setItem('sb-login-time', Date.now().toString());
                            return true;
                        } else {
                            // 会话为 null，可能是会话还未初始化，进行重试
                            if (retries > 0) {
                                setTimeout(() => checkAuthStatus(retries - 1), 300);
                            } else {
                                // 重试次数用完，确认用户未登录
                                // 清理会话相关数据
                                localStorage.removeItem('sb-login-time');
                                return false;
                            }
                        }
                    } catch (error) {
                        this.utils.handleError(error, '获取会话失败');
                        if (retries > 0) {
                            setTimeout(() => checkAuthStatus(retries - 1), 300);
                        } else {
                            // 清理会话相关数据
                            localStorage.removeItem('sb-login-time');
                            return false;
                        }
                    }
                };

                // 优先显示登录界面，提高LCP性能
                this.authUIService.updateUIForUnauth();

                // 然后在后台进行认证检查，最多重试2次
                checkAuthStatus();

                // 设置认证状态变化监听器
                auth.onAuthStateChange((event, session) => {
                    try {
                        if (event === 'SIGNED_IN' && session) {
                            // 用户已登录，更新UI并加载渲染系统
                            this.authUIService.updateUIForAuth(session.user);
                            this.loadSystem();

                            // 存储登录时间，用于会话管理
                            localStorage.setItem('sb-login-time', Date.now().toString());
                        } else if (event === 'SIGNED_OUT') {
                            // 用户未登录，添加防抖动，避免短暂的认证状态变化导致误触发
                            if (this.authStateChangeTimer) {
                                clearTimeout(this.authStateChangeTimer);
                            }
                            this.authStateChangeTimer = setTimeout(() => {
                                // 清理会话相关数据
                                localStorage.removeItem('sb-login-time');
                                this.authUIService.updateUIForUnauth();
                            }, 500); // 防抖
                        }
                    } catch (error) {
                        this.utils.handleError(error, '处理认证状态变化失败');
                    }
                });

                // 定期检查会话状态，确保会话有效
                setInterval(() => {
                    // 如果是试用模式，跳过会话检查
                    if (this.serverStatusService && this.serverStatusService.isTrialMode) {
                        return;
                    }
                    
                    try {
                        auth.getSession().then(({ data: { session } }) => {
                            if (!session) {
                                // 清理会话相关数据
                                localStorage.removeItem('sb-login-time');
                                this.authUIService.updateUIForUnauth();
                            } else {
                                // 检查登录时间，超过24小时自动登出
                                const loginTime = localStorage.getItem('sb-login-time');
                                if (loginTime) {
                                    const now = Date.now();
                                    const loginTimestamp = parseInt(loginTime);
                                    const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60);
                                    if (hoursSinceLogin > 24) {
                                        auth.signOut().then(() => {
                                            localStorage.removeItem('sb-login-time');
                                            this.authUIService.updateUIForUnauth();
                                            this.notificationService.show('登录时间已超过24小时，请重新登录', 'info');
                                        });
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        if (window.GLOBAL_DEBUG) console.error('定期检查会话状态失败:', error);
                    }
                }, 30 * 1000); // 每30秒检查一次

                // 启动服务器状态监测
                this.utils.startServerStatusMonitor();
            } else {
                // Supabase 不可用，显示登录框
                this.serverStatusService.updateServerStatus('offline');
                this.authUIService.updateUIForUnauth();
            }
        } catch (error) {
            this.utils.handleError(error, '初始化应用失败', true);
            // 即使初始化失败，也要显示登录框
            this.authUIService.updateUIForUnauth();
        }
    }

    /**
     * 显示系统框架
     */
    showSystemFrame() {
        const body = document.body;
        if (body && this.elements.nav && this.elements.main) {
            body.style.opacity = '1';
            this.elements.nav.style.display = 'block';
            this.elements.main.style.display = 'block';
        }
    }
}

export default InitService;
