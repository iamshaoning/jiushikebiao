/**
 * 认证服务
 *
 * @description 用户认证相关的业务逻辑：登录、注册、登出、会话管理
 * @module authService
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
        if (!email || !password) {
            throw new Error('邮箱和密码不能为空');
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new Error('邮箱和密码格式无效');
        }

        const { data, error } = await this.supabaseAuth.signInWithPassword({ email, password });

        if (error) {
            throw error;
        }

        this.setLoginTime();

        return data;
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
        if (!email || !password) {
            throw new Error('邮箱和密码不能为空');
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new Error('邮箱和密码格式无效');
        }
        if (password.length < 6) {
            throw new Error('密码应至少包含6个字符');
        }

        const { data, error } = await this.supabaseAuth.signUp({ email, password });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * 用户登出
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        await this.supabaseAuth.signOut();
        this.clearLoginTime();
    }

    /**
     * 获取当前会话
     * @returns {Promise<Object>} 会话信息
     */
    async getSession() {
        if (!this.supabaseAuth) {
            throw new Error('认证服务未初始化');
        }

        const { data } = await this.supabaseAuth.getSession();
        return data.session;
    }

    setLoginTime() {
        localStorage.setItem(this.loginTimeKey, Date.now().toString());
    }

    clearLoginTime() {
        localStorage.removeItem(this.loginTimeKey);
    }

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