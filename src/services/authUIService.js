/**
 * 认证 UI 服务
 *
 * @description 管理登录/注册模态框、标签切换、按钮状态、试用模式入口等认证界面交互
 * @module authUIService
 */
import { registry } from '../core/registry.js';

class AuthUIService {
    constructor(elements, utils, notificationService, authService, modalService, serverStatusService) {
        this.elements = elements;
        this.utils = utils;
        this.notificationService = notificationService;
        this.authService = authService;
        this.modalService = modalService;
        this.serverStatusService = serverStatusService;
        this.loadSystemService = null;
    }

    /**
     * 初始化认证UI
     */
    init() {
        this.bindEvents();
        this.setupSettingsDropdown();
        this.setupLogoutButton();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        this.setupTabSwitching();
        this.setupLoginButton();
        this.setupRegisterButton();
        this.setupEnterKey();
    }

    /**
     * 设置登录/注册标签切换
     */
    setupTabSwitching() {
        if (this.elements.loginTab && this.elements.registerTab) {
            this.elements.loginTab.addEventListener('click', () => {
                this.elements.loginTab.style.borderColor = 'var(--color-primary)';
                this.elements.loginTab.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
                this.elements.registerTab.style.borderColor = 'transparent';
                this.elements.registerTab.style.backgroundColor = 'rgba(147, 51, 234, 0.3)';

                const registerBtnContainer = this.elements.registerBtnContainer;
                const loginBtnContainer = this.elements.loginBtnContainer;

                registerBtnContainer.style.opacity = '0';
                registerBtnContainer.style.pointerEvents = 'none';
                registerBtnContainer.style.zIndex = '0';
                loginBtnContainer.style.opacity = '1';
                loginBtnContainer.style.pointerEvents = 'auto';
                loginBtnContainer.style.zIndex = '1';
            });

            this.elements.registerTab.addEventListener('click', () => {
                this.elements.registerTab.style.borderColor = 'rgba(147, 51, 234, 1)';
                this.elements.registerTab.style.backgroundColor = 'rgba(147, 51, 234, 0.4)';
                this.elements.loginTab.style.borderColor = 'transparent';
                this.elements.loginTab.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';

                const loginBtnContainer = this.elements.loginBtnContainer;
                const registerBtnContainer = this.elements.registerBtnContainer;

                loginBtnContainer.style.opacity = '0';
                loginBtnContainer.style.pointerEvents = 'none';
                loginBtnContainer.style.zIndex = '0';
                registerBtnContainer.style.opacity = '1';
                registerBtnContainer.style.pointerEvents = 'auto';
                registerBtnContainer.style.zIndex = '1';
            });
        }
    }

    /**
     * 设置登录按钮
     */
    setupLoginButton() {
        if (this.elements.loginSubmit) {
            this.elements.loginSubmit.addEventListener('click', () => this.handleLogin());
        }
    }

    setupRegisterButton() {
        if (this.elements.registerSubmit) {
            this.elements.registerSubmit.addEventListener('click', () => this.handleRegister());
        }
    }

    /**
     * 判断当前是否为登录标签页激活
     */
    isLoginTabActive() {
        if (this.elements.loginBtnContainer && this.elements.registerBtnContainer) {
            return this.elements.loginBtnContainer.style.opacity === '1';
        }
        if (this.elements.loginTab) {
            return this.elements.loginTab.style.borderColor !== 'transparent';
        }
        return true;
    }

    /**
     * 设置回车键支持
     */
    setupEnterKey() {
        if (this.elements.authEmail) {
            this.elements.authEmail.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (this.elements.authPassword) this.elements.authPassword.focus();
                }
            });
        }

        if (this.elements.authPassword) {
            this.elements.authPassword.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (this.isLoginTabActive()) {
                        this.handleLogin();
                    } else {
                        if (this.elements.registerSubmit) this.elements.registerSubmit.click();
                    }
                }
            });
        }
    }

    /**
     * 显示认证模态框
     */
    showAuthModal() {
        const authModal = this.elements.authModal;
        const authContainer = this.elements.authContainer;

        authModal.style.opacity = '0';
        authContainer.classList.remove('scale-100', 'opacity-100');
        authContainer.classList.add('scale-95', 'opacity-0');

        if (this.elements.loginBtnContainer && this.elements.registerBtnContainer) {
            this.elements.loginBtnContainer.style.opacity = '1';
            this.elements.loginBtnContainer.style.pointerEvents = 'auto';
            this.elements.loginBtnContainer.style.zIndex = '1';
            this.elements.registerBtnContainer.style.opacity = '0';
            this.elements.registerBtnContainer.style.pointerEvents = 'none';
            this.elements.registerBtnContainer.style.zIndex = '0';
        }

        if (this.elements.loginTab && this.elements.registerTab) {
            this.elements.loginTab.style.borderColor = 'var(--color-primary)';
            this.elements.loginTab.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
            this.elements.registerTab.style.borderColor = 'transparent';
            this.elements.registerTab.style.backgroundColor = 'rgba(147, 51, 234, 0.3)';
        }

        authModal.style.display = 'flex';
        authModal.style.pointerEvents = 'auto';
        authModal.offsetHeight;
        authModal.style.opacity = '1';
        authContainer.classList.remove('scale-95', 'opacity-0');
        authContainer.classList.add('scale-100', 'opacity-100');
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        const authModal = this.elements.authModal;
        const authContainer = this.elements.authContainer;

        authContainer.classList.remove('scale-100', 'opacity-100');
        authContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            authModal.style.opacity = '0';
            setTimeout(() => {
                authModal.style.display = 'none';
            }, 300);
        }, 200);
    }

    /**
     * 处理登录
     */
    handleLogin() {
        const email = this.elements.authEmail ? this.elements.authEmail.value : '';
        const password = this.elements.authPassword ? this.elements.authPassword.value : '';

        // 开发测试用：快速进入试用模式（用户名 test，密码留空）
        if (email === 'test' && password === '') {
            this.disableButtonsAndTabs();
            this.setLoginButtonLoading(true);

            setTimeout(() => {
                this.notificationService.show('试用模式登录成功', 'success');
                
                // 试用模式下设置一个登录时间标记，防止被会话检查踢出去
                localStorage.setItem('sb-login-time', Date.now().toString());

                requestAnimationFrame(() => {
                    this.hideAuthModal();
                    this.updateUIForTrialUser();
                    this.resetAuthUI();
                    this.loadSystemService.loadSystem(true);
                });
            }, 1000);

            return;
        }

        this.disableButtonsAndTabs();
        this.setLoginButtonLoading(true);

        this.authService.login(email, password)
            .then((data) => {
                this.notificationService.show('登录成功', 'success');
                requestAnimationFrame(() => {
                    this.hideAuthModal();
                    this.resetAuthUI();
                });
            })
            .catch((error) => {
                registry.get('errorHandlerService').handleError(error, '登录失败', true);
                this.resetAuthUI();
            });
    }

    /**
     * 处理注册
     */
    handleRegister() {
        const email = this.elements.authEmail ? this.elements.authEmail.value : '';
        const password = this.elements.authPassword ? this.elements.authPassword.value : '';

        if (password.length < 6) {
            this.notificationService.show('密码应至少包含6个字符', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.notificationService.show('邮箱无效', 'error');
            return;
        }

        this.disableButtonsAndTabs();
        this.setRegisterButtonLoading(true);

        this.authService.register(email, password)
            .then((data) => {
                this.notificationService.show('注册成功！请前往邮箱验证', 'info', 8000);
                
                if (this.elements.authEmail) this.elements.authEmail.value = '';
                if (this.elements.authPassword) this.elements.authPassword.value = '';
                
                this.resetAuthUI();

                setTimeout(() => {
                    this.authService.logout().catch((error) => {
                        console.error('登出失败:', error);
                    });
                }, 500);
            })
            .catch((error) => {
                registry.get('errorHandlerService').handleError(error, '注册失败', true);
                this.resetAuthUI();
            });
    }

    /**
     * 禁用按钮和标签
     */
    disableButtonsAndTabs() {
        if (this.elements.loginTab) this.elements.loginTab.style.pointerEvents = 'none';
        if (this.elements.registerTab) this.elements.registerTab.style.pointerEvents = 'none';
        
        if (this.elements.loginSubmit) {
            this.elements.loginSubmit.disabled = true; this.elements.loginSubmit.classList.add('cursor-not-allowed');
            this.elements.loginSubmit.style.opacity = '0.8';
        }
        
        if (this.elements.registerSubmit) {
            this.elements.registerSubmit.disabled = true;
            this.elements.registerSubmit.classList.add('cursor-not-allowed');
            this.elements.registerSubmit.style.opacity = '0.8';
        }
    }

    /**
     * 设置登录按钮加载状态
     */
    setLoginButtonLoading(isLoading) {
        const loginBtnText = this.elements.loginBtnText;
        const loginLoading = this.elements.loginLoading;
        
        if (loginBtnText && loginLoading) {
            if (isLoading) {
                loginBtnText.textContent = '登录中...';
                loginLoading.classList.remove('hidden');
            } else {
                loginBtnText.textContent = '登 录';
                loginLoading.classList.add('hidden');
            }
        }
    }

    /**
     * 设置注册按钮加载状态
     */
    setRegisterButtonLoading(isLoading) {
        const registerBtnText = this.elements.registerBtnText;
        const registerLoading = this.elements.registerLoading;
        
        if (registerBtnText && registerLoading) {
            if (isLoading) {
                registerBtnText.textContent = '注册中...';
                registerLoading.classList.remove('hidden');
            } else {
                registerBtnText.textContent = '注 册';
                registerLoading.classList.add('hidden');
            }
        }
    }

    /**
     * 重置认证UI状态
     */
    resetAuthUI() {
        this.utils.safeSet(this.elements.loginBtnText, 'textContent', '登 录');
        this.utils.safeAddClass(this.elements.loginLoading, 'hidden');
        this.utils.safeSet(this.elements.loginSubmit, 'disabled', false);
        this.utils.safeRemoveClass(this.elements.loginSubmit, 'cursor-not-allowed');
        
        if (this.elements.loginSubmit) {
            this.elements.loginSubmit.style.opacity = '1';
            this.elements.loginSubmit.style.pointerEvents = '';
        }

        this.utils.safeSet(this.elements.registerBtnText, 'textContent', '注 册');
        this.utils.safeAddClass(this.elements.registerLoading, 'hidden');
        this.utils.safeSet(this.elements.registerSubmit, 'disabled', false);
        this.utils.safeRemoveClass(this.elements.registerSubmit, 'cursor-not-allowed');
        
        if (this.elements.registerSubmit) {
            this.elements.registerSubmit.style.opacity = '1';
            this.elements.registerSubmit.style.pointerEvents = '';
        }

        if (this.elements.loginTab) {
            this.elements.loginTab.style.pointerEvents = 'auto';
        }
        if (this.elements.registerTab) {
            this.elements.registerTab.style.pointerEvents = 'auto';
        }

        if (this.elements.loginBtnContainer && this.elements.registerBtnContainer) {
            if (this.elements.loginBtnContainer.style.opacity === '1') {
                this.elements.loginBtnContainer.style.zIndex = '1';
                this.elements.registerBtnContainer.style.zIndex = '0';
            } else if (this.elements.registerBtnContainer.style.opacity === '1') {
                this.elements.registerBtnContainer.style.zIndex = '1';
                this.elements.loginBtnContainer.style.zIndex = '0';
            }
        }
    }

    /**
     * 隐藏认证模态框的动画效果（公共方法）
     */
    _hideAuthModalAnimated() {
        if (this.elements.authModal) {
            this.elements.authContainer.classList.remove('scale-100', 'opacity-100');
            this.elements.authContainer.classList.add('scale-90', 'opacity-0');

            setTimeout(() => {
                this.elements.authModal.style.opacity = '0';
                setTimeout(() => {
                    this.elements.authModal.style.display = 'none';
                    this.elements.authModal.style.pointerEvents = 'none';
                    this.elements.authContainer.classList.remove('scale-90', 'opacity-0');
                    this.elements.authContainer.classList.add('scale-95', 'opacity-0');
                }, 800);
            }, 400);
        }
    }

    /**
     * 更新已登录用户的UI
     */
    updateUIForAuth(user) {
        if (this.elements.settingsUserName) {
            this.elements.settingsUserName.textContent = user.email;
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.classList.remove('hidden');
        }

        this._hideAuthModalAnimated();
    }

    /**
     * 更新试用用户UI
     */
    updateUIForTrialUser() {
        if (this.elements.settingsUserName) {
            this.elements.settingsUserName.textContent = '试用用户';
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.classList.remove('hidden');
        }

        this._hideAuthModalAnimated();
    }

    /**
     * 更新未登录用户的UI
     */
    updateUIForUnauth() {
        if (this.elements.nav && this.elements.main) {
            this.elements.nav.style.display = 'none';
            this.elements.main.style.display = 'none';
        }

        const body = document.body;
        if (body) {
            body.style.opacity = '1';
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.classList.add('hidden');
        }

        if (this.loadSystemService) {
            this.loadSystemService.exitTrialMode();
        }

        const authModal = this.elements.authModal;
        if (authModal && authModal.style.display !== 'flex') {
            this.resetAuthUI();
            this.showAuthModal();
        }
    }

    /**
     * 设置下拉菜单
     */
    setupSettingsDropdown() {
        if (this.elements.settingsBtn && this.elements.settingsDropdown) {
            this.elements.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = this.elements.settingsDropdown;
                dropdown.style.visibility = 'visible';
                dropdown.classList.toggle('show');
            }, { once: false });

            this.elements.settingsDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            document.addEventListener('click', (e) => {
                const dropdown = this.elements.settingsDropdown;
                const settingsBtn = this.elements.settingsBtn;
                const settingsContainer = settingsBtn?.parentElement;

                const isClickOnSettings = settingsBtn?.contains(e.target) ||
                                         dropdown?.contains(e.target) ||
                                         settingsContainer?.contains(e.target);

                if (!isClickOnSettings && dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            }, true);
        }
    }

    /**
     * 设置登出按钮
     */
    setupLogoutButton() {
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    /**
     * 登出方法（公共方法，供外部调用）
     */
    logout() {
        this.modalService.showConfirm('确定要登出吗？', () => {
            if (this.loadSystemService) {
                this.loadSystemService.systemLoaded = false;
            }
            if (registry.get('supabaseAuth')) {
                this.authService.logout()
                    .then(() => {
                        this.cleanupRealtimeChannel();
                        this.serverStatusService.stopMonitoring();

                        if (this.elements.nav && this.elements.main) {
                            this.elements.nav.style.display = 'none';
                            this.elements.main.style.display = 'none';
                        }

                        document.body.style.opacity = '1';
                        this.updateUIForUnauth();
                        this.notificationService.show('登出成功', 'success');
                    })
                    .catch((error) => {
                        console.error('登出失败:', error);
                        this.notificationService.show('登出失败: ' + error.message, 'error');
                    });
            } else {
                this.serverStatusService.stopMonitoring();

                if (this.elements.nav && this.elements.main) {
                    this.elements.nav.style.display = 'none';
                    this.elements.main.style.display = 'none';
                }

                document.body.style.opacity = '1';
                this.updateUIForUnauth();
                this.notificationService.show('登出成功', 'success');
            }
        }, 'confirm');
    }

    /**
     * 清理实时数据通道
     */
    cleanupRealtimeChannel() {
        if (registry.get('realtimeChannel')) {
            try {
                registry.get('realtimeChannel').unsubscribe();
                registry.set('realtimeChannel', null);
            } catch (error) {
                console.error('清理实时数据监听失败:', error);
            }
        }
    }

    /**
     * 设置系统加载服务引用
     */
    setLoadSystemService(loadSystemService) {
        this.loadSystemService = loadSystemService;
    }

    /**
     * 进入试用模式
     */
    enterTrialMode() {
        this.serverStatusService.setTrialMode(true);
    }

    /**
     * 退出试用模式
     */
    exitTrialMode() {
        this.serverStatusService.setTrialMode(false);
    }
}

export default AuthUIService;
