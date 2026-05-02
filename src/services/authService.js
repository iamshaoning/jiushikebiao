/**
 * 认证服务模块
 * 负责用户认证相关的业务逻辑
 */

class AuthService {
    constructor() {
        this.supabaseAuth = null;
        this.loginTimeKey = 'sb-login-time';
    }

    /**
     * 初始化认证服务
     * @param {Object} supabaseAuth - Supabase认证实例
     */
    init(supabaseAuth) {
        this.supabaseAuth = supabaseAuth;
    }

    /**
     * 用户登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 登录结果
     */
    async login(email, password) {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        try {
            const { data, error } = await this.supabaseAuth.signInWithPassword({ email, password });

            if (error) {
                throw error;
            }

            // 存储登录时间
            this.setLoginTime();

            return data;
        } catch (error) {
            // 不在 service 层记录日志，让调用层处理错误显示
            throw error;
        }
    }

    /**
     * 用户注册
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 注册结果
     */
    async register(email, password) {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        try {
            const { data, error } = await this.supabaseAuth.signUp({ email, password });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            // 不在 service 层记录日志，让调用层处理错误显示
            throw error;
        }
    }

    /**
     * 用户登出
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        try {
            await this.supabaseAuth.signOut();
            // 清除登录时间
            this.clearLoginTime();
        } catch (error) {
            // 不在 service 层记录日志，让调用层处理错误显示
            throw error;
        }
    }

    /**
     * 获取当前会话
     * @returns {Promise<Object>} 会话信息
     */
    async getSession() {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        try {
            const { data } = await this.supabaseAuth.getSession();
            return data.session;
        } catch (error) {
            // 不在 service 层记录日志，让调用层处理错误显示
            throw error;
        }
    }

    /**
     * 检查用户是否已登录
     * @returns {Promise<boolean>} 是否已登录
     */
    async isLoggedIn() {
        try {
            const session = await this.getSession();
            return !!session;
        } catch (error) {
            return false;
        }
    }

    /**
     * 设置登录时间
     */
    setLoginTime() {
        localStorage.setItem(this.loginTimeKey, Date.now().toString());
    }

    /**
     * 清除登录时间
     */
    clearLoginTime() {
        localStorage.removeItem(this.loginTimeKey);
    }

    /**
     * 检查登录时间是否超过24小时
     * @returns {boolean} 是否已超过24小时
     */
    isLoginTimeExpired() {
        const loginTime = localStorage.getItem(this.loginTimeKey);
        if (!loginTime) return true;

        const now = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60);
        return hoursSinceLogin > 24;
    }

    /**
     * 设置认证状态变化监听器
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听器的函数
     */
    onAuthStateChange(callback) {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        return this.supabaseAuth.onAuthStateChange(callback);
    }
}

// 导出单例实例
const authService = new AuthService();
export default authService;