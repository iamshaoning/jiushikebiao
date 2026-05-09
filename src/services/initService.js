/**
 * 初始化服务
 *
 * @description 应用启动入口编排：会话检查、试用模式判断、登录过期检测、系统框架显示
 * @module initService
 */
import { registry } from '../core/registry.js';

class InitService {
    constructor(utils, notificationService, serverStatusService, authUIService, themeService, loadSystemService, elements) {
        this.utils = utils;
        this.notificationService = notificationService;
        this.serverStatusService = serverStatusService;
        this.authUIService = authUIService;
        this.themeService = themeService;
        this.loadSystemService = loadSystemService;
        this.elements = elements;
        this.authStateChangeTimer = null;
        this.loginSnapshotCreated = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
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
            await registry.get('supabaseReady');

            const auth = registry.get('supabaseAuth');
            if (auth) {
                // 认证状态检查函数
                const checkAuthStatus = async (retries = 2) => {
                    try {
                        const { data } = await this.utils.withTimeout(() => auth.getSession(), 2000, '获取会话超时');
                        const session = data.session;
                        if (session) {
                            // 用户已登录，更新UI并加载渲染系统
                            const user = session.user;
                            this.authUIService.updateUIForAuth(user);
                            
                            // 调用系统加载服务（loadSystemService 内部会处理重复调用）
                            // 登录快照将在 loadData 完成后在 loadSystemService 中创建
                            this.loadSystemService.loadSystem();

                            // 存储登录时间，用于会话管理
                            localStorage.setItem('sb-login-time', Date.now().toString());
                            return true;
                        } else {
                            // 会话为 null，可能是会话还未初始化，进行重试
                            if (retries > 0) {
                                return new Promise(resolve => {
                                    setTimeout(() => resolve(checkAuthStatus(retries - 1)), 300);
                                });
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
                            return new Promise(resolve => {
                                setTimeout(() => resolve(checkAuthStatus(retries - 1)), 300);
                            });
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
                this._authSubscription = auth.onAuthStateChange((event, session) => {
                    try {
                        if (event === 'SIGNED_IN' && session) {
                            // 用户已登录，更新UI并加载渲染系统
                            this.authUIService.updateUIForAuth(session.user);
                            
                            // 调用系统加载服务（loadSystemService 内部会处理重复调用）
                            // 登录快照将在 loadData 完成后在 loadSystemService 中创建
                            this.loadSystemService.loadSystem();

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
                                // 重置系统加载标志，以便下次登录时可以重新加载
                                this.loadSystemService.systemLoaded = false;
                                // 重置登录快照标志，以便下次登录时创建快照
                                this.loadSystemService.loginSnapshotCreated = false;
                            }, 500); // 防抖
                        }
                    } catch (error) {
                        this.utils.handleError(error, '处理认证状态变化失败');
                    }
                });

                // 定期检查会话状态，确保会话有效（仅在非试用模式下启动）
                this._sessionCheckInterval = setInterval(() => {
                    this._checkSession(auth);
                }, 60 * 1000); // 每60秒检查一次

                // 页面可见性变化监听
                this._visibilityHandler = () => {
                    if (document.hidden) {
                        if (this._sessionCheckInterval) {
                            clearInterval(this._sessionCheckInterval);
                            this._sessionCheckInterval = null;
                        }
                    } else {
                        if (!this._sessionCheckInterval && !(this.serverStatusService && this.serverStatusService.isTrialMode)) {
                            this._sessionCheckInterval = setInterval(() => {
                                this._checkSession(auth);
                            }, 60 * 1000);
                        }
                    }
                };
                document.addEventListener('visibilitychange', this._visibilityHandler);

                window.addEventListener('beforeunload', () => {
                    this._cleanup();
                });

                // 启动服务器状态监测
                this.serverStatusService.startMonitoring();
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
     * 检查会话状态（提取的公共方法）
     * @param {Object} auth - Supabase auth 实例
     */
    _checkSession(auth) {
        // 页面不可见时暂停检查
        if (document.hidden) return;
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
            console.error('定期检查会话状态失败:', error);
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

    _cleanup() {
        if (this._sessionCheckInterval) {
            clearInterval(this._sessionCheckInterval);
            this._sessionCheckInterval = null;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
        if (this.serverStatusService) {
            this.serverStatusService.stopMonitoring();
        }
    }
}

export default InitService;