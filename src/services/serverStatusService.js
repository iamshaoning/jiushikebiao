/**
 * 服务器状态服务
 *
 * @description 轮询检测 Supabase 连接状态、试用模式管理、网络在线/离线监听、状态指示器 UI
 * @module serverStatusService
 */
import { registry } from '../core/registry.js';

class ServerStatusService {
    constructor() {
        this.supabaseClient = null;
        this.supabaseAuth = null;
        this.previousStatus = null;
        this.statusInterval = null;
        this.isTrialMode = false;
    }

    /**
     * 初始化服务器状态监测服务
     * @param {Object} supabaseClient - Supabase客户端实例
     * @param {Object} supabaseAuth - Supabase认证实例
     */
    init(supabaseClient, supabaseAuth) {
        this.supabaseClient = supabaseClient;
        this.supabaseAuth = supabaseAuth;
    }

    /**
     * 开始监测服务器状态
     */
    startMonitoring() {
        // 试用模式下不启动监测
        if (this.isTrialMode) {
            return;
        }

        if (this.statusInterval) {
            return;
        }

        // 如果没有初始化，尝试从 window 获取
        if (!this.supabaseClient) {
            this.supabaseClient = registry.get('supabaseClient');
        }
        if (!this.supabaseAuth) {
            this.supabaseAuth = registry.get('supabaseAuth');
        }

        // 立即检测一次
        this.monitorServerStatus().catch(err => console.error('初始状态检测失败:', err));

        // 每15秒检测一次
        this.statusInterval = setInterval(() => {
            this.monitorServerStatus();
        }, 15000);

        // 页面可见性变化监听
        this._visibilityHandler = () => {
            if (document.hidden) {
                if (this.statusInterval) {
                    clearInterval(this.statusInterval);
                    this.statusInterval = null;
                }
            } else if (!this.isTrialMode) {
                if (!this.statusInterval) {
                    this.monitorServerStatus();
                    this.statusInterval = setInterval(() => {
                        this.monitorServerStatus();
                    }, 15000);
                }
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);

        // 监听浏览器 online/offline 事件，断网/恢复即时响应
        this._onlineHandler = () => {
            if (!this.isTrialMode) this.monitorServerStatus().catch(() => {});
        };
        this._offlineHandler = () => {
            if (!this.isTrialMode) this.updateServerStatus('offline');
        };
        window.addEventListener('online', this._onlineHandler);
        window.addEventListener('offline', this._offlineHandler);
    }

    /**
     * 停止监测服务器状态
     */
    stopMonitoring() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
        if (this._onlineHandler) {
            window.removeEventListener('online', this._onlineHandler);
            this._onlineHandler = null;
        }
        if (this._offlineHandler) {
            window.removeEventListener('offline', this._offlineHandler);
            this._offlineHandler = null;
        }
    }

    /**
     * 监测服务器状态
     * @returns {Promise<string>} 服务器状态
     */
    async monitorServerStatus() {
        // 试用模式下直接返回，不进行网络检测
        if (this.isTrialMode) {
            return 'trial';
        }

        // 如果没有初始化，尝试从 window 获取
        if (!this.supabaseClient) {
            this.supabaseClient = registry.get('supabaseClient');
        }
        if (!this.supabaseAuth) {
            this.supabaseAuth = registry.get('supabaseAuth');
        }

        if (!this.supabaseClient || !this.supabaseAuth) {
            this.updateServerStatus('loggedout');
            return 'loggedout';
        }

        // 不设置同步中状态，只在状态实际改变时更新UI
        try {
            // 尝试获取会话
            const { data: sessionData, error: sessionError } = await this.withTimeout(
                () => this.supabaseAuth.getSession(),
                3000,
                '会话检测超时'
            );

            if (sessionError) {
                console.error('服务器状态检测: 会话检测错误:', sessionError);
                this.updateServerStatus('offline');
                return 'offline';
            }
            if (!sessionData || !sessionData.session) {
                this.updateServerStatus('loggedout');
                return 'loggedout';
            }

            // 有会话，进一步检测网络连接
            // 尝试一个简单的服务器请求来验证网络连接
            const userId = sessionData.session.user.id;
            try {
                // 添加重试机制，最多重试2次
                const maxRetries = 2;
                let lastError = null;
                
                for (let i = 0; i <= maxRetries; i++) {
                    try {
                        await this.withTimeout(
                            () => this.supabaseClient
                                .from('coursemanagerdata')
                                .select('id')
                                .eq('userid', userId)
                                .limit(1)
                                .single(),
                            5000,
                            '网络检测超时'
                        );

                        // 如果能成功执行上述请求，说明网络连接正常
                        this.updateServerStatus('online');
                        return 'online';
                    } catch (error) {
                        lastError = error;
                        if (i < maxRetries) {
                            // 重试前等待一段时间
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }

                // 所有重试都失败
                throw lastError;
            } catch (error) {
                // 检查是否是表不存在的错误
                if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
                    // 表不存在，可能是首次使用，设置为在线状态
                    this.updateServerStatus('online');
                    return 'online';
                } else {
                    console.error('服务器状态检测: 网络检测错误:', error);
                    // 其他错误，可能是网络问题
                    throw error;
                }
            }
        } catch (error) {
            console.error('服务器状态检测: 服务器连接失败:', error);
            this.updateServerStatus('offline');
            return 'offline';
        }
    }

    /**
     * 设置试用模式
     * @param {boolean} isTrial - 是否为试用模式
     */
    setTrialMode(isTrial) {
        this.isTrialMode = isTrial;
        if (isTrial) {
            this.stopMonitoring();
            this.updateServerStatus('trial');
        }
    }

    /**
     * 更新服务器状态
     * @param {string} status - 服务器状态：online(绿色-正常), offline(红色-断开), loggedout(灰色-未登录), trial(试用模式)
     */
    updateServerStatus(status) {
        // 保存之前的状态
        const oldStatus = this.previousStatus;
        this.previousStatus = status;

        // 更新UI
        const elements = {
            syncStatus: document.getElementById('sync-status'),
            syncIcon: document.getElementById('sync-icon'),
            syncTitle: document.getElementById('sync-title')
        };

        if (elements.syncStatus && elements.syncIcon) {
            const statusConfig = {
                online: { 
                    cardClass: 'sync-success',
                    title: '已同步'
                },
                offline: { 
                    cardClass: 'sync-error',
                    title: '同步失败'
                },
                loggedout: { 
                    cardClass: '',
                    title: '未登录'
                },
                syncing: {
                    cardClass: 'sync-syncing',
                    title: '同步中...'
                },
                trial: {
                    cardClass: '',
                    title: '试用模式'
                }
            };

            const config = statusConfig[status] || statusConfig.loggedout;

            // 移除所有卡片状态类
            this.safeRemoveClass(elements.syncStatus, ['sync-success', 'sync-error', 'sync-syncing', 'sync-trial']);
            
            // 添加当前卡片状态类
            if (config.cardClass) {
                this.safeAddClass(elements.syncStatus, config.cardClass);
            }

            // 更新图标内容
            if (status === 'syncing') {
                elements.syncIcon.innerHTML = '<div class="sync-loader"></div>';
            } else if (status === 'offline') {
                elements.syncIcon.innerHTML = '<div class="sync-dot sync-error"></div>';
            } else if (status === 'trial') {
                elements.syncIcon.innerHTML = '<div class="sync-dot sync-trial"></div>';
            } else {
                elements.syncIcon.innerHTML = '<div class="sync-dot"></div>';
            }

            // 更新标题文字
            if (elements.syncTitle) {
                elements.syncTitle.textContent = config.title;
            }

            // 检查网络是否从离线恢复到在线
            if (oldStatus === 'offline' && status === 'online') {
                // 网络恢复，比较本地和服务器数据
                if (registry.get('utils') && registry.get('utils').compareLocalAndServerData) {
                    registry.get('utils').compareLocalAndServerData();
                }
            }
            // 网络断开不再显示通知，图标状态已足够提示
        }
    }

    /**
     * 设置同步中状态
     */
    setSyncing() {
        // 试用模式下不设置同步中状态
        if (this.isTrialMode) {
            return;
        }

        const elements = {
            syncStatus: document.getElementById('sync-status'),
            syncIcon: document.getElementById('sync-icon'),
            syncTitle: document.getElementById('sync-title')
        };

        if (elements.syncStatus && elements.syncIcon) {
            // 移除所有卡片状态类并添加syncing类
            this.safeRemoveClass(elements.syncStatus, ['sync-success', 'sync-error', 'sync-syncing']);
            this.safeAddClass(elements.syncStatus, 'sync-syncing');

            // 更新图标为加载状态
            elements.syncIcon.innerHTML = '<div class="sync-loader"></div>';

            // 更新标题文字
            if (elements.syncTitle) {
                elements.syncTitle.textContent = '同步中...';
            }
        }
    }

    /**
     * 带超时的Promise
     * @param {Function} fn - 要执行的函数
     * @param {number} timeout - 超时时间（毫秒）
     * @param {string} errorMessage - 错误信息
     * @returns {Promise} 执行结果
     */
    withTimeout(fn, timeout, errorMessage) {
        if (registry.get('coreUtils')?.withTimeout) {
            return registry.get('coreUtils').withTimeout(fn, timeout, errorMessage);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(errorMessage)), timeout);
            fn().then(resolve, reject).finally(() => clearTimeout(timer));
        });
    }

    /**
     * 安全添加CSS类
     * @param {Element} element - DOM元素
     * @param {string} className - CSS类名
     */
    safeAddClass(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    }

    /**
     * 安全移除CSS类
     * @param {Element} element - DOM元素
     * @param {Array} classNames - CSS类名数组
     */
    safeRemoveClass(element, classNames) {
        if (element && element.classList) {
            classNames.forEach(className => {
                element.classList.remove(className);
            });
        }
    }
}

// 导出单例实例
const serverStatusService = new ServerStatusService();
export default serverStatusService;
