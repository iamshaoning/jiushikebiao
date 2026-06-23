/**
 * 认证 UI 服务
 *
 * @description 管理登录/注册模态框、标签切换、按钮状态、试用模式入口等认证界面交互
 * @module authUIService
 */
import { registry } from '../core/registry.js';
import { subscribeAnnouncements, loadAnnouncements } from './announcementService.js';

class AuthUIService {
    constructor(elements, utils, notificationService, authService, modalService, serverStatusService, profileService) {
        this.elements = elements;
        this.utils = utils;
        this.notificationService = notificationService;
        this.authService = authService;
        this.modalService = modalService;
        this.serverStatusService = serverStatusService;
        this.profileService = profileService;
        this.loadSystemService = null;
        this._currentUserId = null;
    }

    /**
     * 初始化认证UI
     */
    init() {
        this.bindEvents();
        this.setupSettingsDropdown();
        this.setupLogoutButton();
        this._setupProfileEditing();
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
        const footer = document.getElementById('auth-footer');
        if (footer) {
            footer.classList.remove('hidden');
            footer.style.display = 'flex';
        }
        authModal.offsetHeight;
        authModal.style.opacity = '1';
        authContainer.classList.remove('scale-95', 'opacity-0');
        authContainer.classList.add('scale-100', 'opacity-100');

        // 随机打字动画，每次循环重新随机
        const typingGifs = ['pika-typing.gif', 'happy-typing.gif', 'love-typing.gif'];
        const typingImg = document.getElementById('typing-gif');
        const randomizeTyping = () => {
            if (!typingImg) return;
            let gif;
            do { gif = typingGifs[Math.floor(Math.random() * typingGifs.length)]; }
            while (gif === typingImg.src.split('/').pop());
            typingImg.src = './' + gif;
        };
        randomizeTyping();
        if (this._typingTimer) clearInterval(this._typingTimer);
        this._typingTimer = setInterval(randomizeTyping, 3000);

        // 点击皮卡丘/气泡/打字动画播放声音（1秒冷却）
        const pikachuLogo = document.getElementById('pikachu-logo');
        let lastPlayTime = 0;
        if (pikachuLogo) {
            pikachuLogo.onclick = () => {
                const now = Date.now();
                if (now - lastPlayTime < 1000) return;
                lastPlayTime = now;
                const audio = new Audio('./pikachu.mp3');
                audio.play().catch(() => {});
            };
        }

        // 微信悬停显示二维码
        const wechatWrapper = document.getElementById('wechat-wrapper');
        const wechatPopup = document.getElementById('wechat-popup');
        if (wechatWrapper && wechatPopup) {
            let wechatTimer = null;
            wechatWrapper.onmouseenter = () => {
                clearTimeout(wechatTimer);
                wechatTimer = setTimeout(() => {
                    wechatPopup.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
                }, 500);
            };
            wechatWrapper.onmouseleave = () => {
                clearTimeout(wechatTimer);
                wechatPopup.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
            };
        }

        // 公告板悬停显示
        const announcementWrapper = document.getElementById('announcement-wrapper');
        if (announcementWrapper) {
            let hoverTimer = null;
            announcementWrapper.onmouseenter = () => {
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => {
                    this._showAnnouncementModal();
                }, 500);
            };
            announcementWrapper.onmouseleave = () => {
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => this._closeAnnouncement(), 200);
            };
        }

        // 重新渲染 lucide 图标
        if (window.lucide) window.lucide.createIcons();
    }

    _showAnnouncementModal() {
        // 如果已存在则关闭
        const existing = document.getElementById('announcement-panel');
        if (existing) {
            this._closeAnnouncement();
            return;
        }

        // 遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'announcement-overlay';
        overlay.className = 'fixed inset-0 z-50 transition-opacity duration-200';
        overlay.style.opacity = '0';
        overlay.onclick = () => this._closeAnnouncement();
        document.body.appendChild(overlay);

        const panel = document.createElement('div');
        panel.id = 'announcement-panel';
        panel.className = 'fixed z-[60] transform transition-all duration-300 ease-out';
        panel.style.left = '50%';
        panel.style.bottom = '80px';
        panel.style.transform = 'translateX(-50%) translateY(12px) scale(0.95)';
        panel.style.opacity = '0';
        panel.style.width = '420px';
        panel.style.maxWidth = 'calc(100vw - 32px)';
        panel.style.maxHeight = 'calc(100vh - 400px)';
        panel.style.height = 'calc(100vh - 400px)';
        panel.style.borderRadius = '20px';
        panel.style.background = 'rgba(255,255,255,0.12)';
        panel.style.backdropFilter = 'blur(24px)';
        panel.style.webkitBackdropFilter = 'blur(24px)';
        panel.style.border = '1px solid rgba(255,255,255,0.25)';
        panel.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
        panel.innerHTML = `
            <div class="flex items-center justify-between p-4 flex-shrink-0">
                <h3 class="text-xl font-bold" style="color: #ffffff !important; text-shadow: 0 1px 4px rgba(0,0,0,0.3);">公告板</h3>
                <button class="announcement-close p-1 rounded-lg hover:bg-white/10 transition-colors" style="color: rgba(255,255,255,0.8);">
                    <i data-lucide="x" style="width:20px;height:20px"></i>
                </button>
            </div>
            <div class="overflow-y-auto px-4 pb-4" style="max-height: calc(100vh - 460px);">
                <div class="announcement-list space-y-3"></div>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('.announcement-close').onclick = () => this._closeAnnouncement();

        if (window.lucide) window.lucide.createIcons();

        // 入场动画（从底部弹出），同时绑定悬停事件防止竞态
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            panel.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            panel.style.opacity = '1';

            // 悬停面板时保持显示，离开时延迟关闭
            panel.onmouseenter = () => {
                clearTimeout(this._announcementHoverTimer);
            };
            panel.onmouseleave = () => {
                this._announcementHoverTimer = setTimeout(() => this._closeAnnouncement(), 200);
            };
        });

        const listDiv = panel.querySelector('.announcement-list');

        const renderAnnouncements = (announcements) => {
            if (!listDiv) return;
            if (!announcements || announcements.length === 0) {
                listDiv.innerHTML = '<div class="flex items-center justify-center text-base py-12" style="color: #ffffff !important; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">暂无公告</div>';
                return;
            }
            listDiv.innerHTML = announcements.map(a => {
                const date = new Date(a.created_at);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                return `
                    <div class="rounded-xl p-4" style="
                        background: rgba(255,255,255,0.12);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.15);
                    ">
                        <p class="text-base leading-relaxed" style="color: #ffffff !important; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${a.content}</p>
                        <div class="flex items-center gap-1 mt-2 text-sm font-semibold" style="color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                            <span>${dateStr}</span>
                            <span>${timeStr}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // 加载指示
        listDiv.innerHTML = '<div class="flex items-center justify-center" style="height: calc(100vh - 460px);"><div class="animate-spin rounded-full border-4 border-white/20 border-t-white" style="width:40px;height:40px"></div></div>';

        // 加载全部公告
        this._allAnnouncements = [];
        loadAnnouncements().then(announcements => {
            this._allAnnouncements = announcements;
            renderAnnouncements(announcements);
        });

        // 实时订阅新公告
        this._announcementList = listDiv;
        this._unsubscribeAnnouncement = subscribeAnnouncements((announcement) => {
            this._allAnnouncements.unshift(announcement);
            renderAnnouncements(this._allAnnouncements);
        });
    }

    _closeAnnouncement() {
        clearTimeout(this._announcementHoverTimer);
        if (this._unsubscribeAnnouncement) {
            this._unsubscribeAnnouncement();
            this._unsubscribeAnnouncement = null;
        }
        const panel = document.getElementById('announcement-panel');
        const overlay = document.getElementById('announcement-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
        if (panel) {
            panel.style.transform = 'translateX(-50%) translateY(12px) scale(0.95)';
            panel.style.opacity = '0';
            setTimeout(() => panel.remove(), 300);
        }
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        if (this._typingTimer) { clearInterval(this._typingTimer); this._typingTimer = null; }
        const authModal = this.elements.authModal;
        const authContainer = this.elements.authContainer;

        const footer = document.getElementById('auth-footer');
        if (footer) {
            footer.classList.add('hidden');
            footer.style.display = '';
        }
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
            .then(() => {
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
            .then(() => {
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
        const footer = document.getElementById('auth-footer');
        if (footer) {
            footer.classList.add('hidden');
            footer.style.display = '';
        }
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
        this._currentUserId = user.id;
        this._renderProfilePlaceholder(user.email);

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.classList.remove('hidden');
        }

        this._hideAuthModalAnimated();

        // 异步加载 profile
        if (this.profileService && user.id) {
            this.profileService.loadProfile(user.id).then(profile => {
                if (profile) {
                    this._renderProfile(profile);
                }
            }).catch(() => {});
        }
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
                        // 清理本地数据与内存状态，避免下一用户登录时看到上一用户的数据残留
                        this._cleanupUserData();

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
                this._cleanupUserData();

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
     * 清理当前用户的本地数据与内存状态
     * 注意：历史记录和快照按 userId 分组存储，保留在 localStorage 中供下次登录使用
     */
    _cleanupUserData() {
        // 清理 localStorage 中的当前用户业务数据
        localStorage.removeItem('coursemanagerdata');

        // 清理内存状态
        this._currentUserId = null;

        const profileService = registry.get('profileService');
        if (profileService) profileService._profile = null;

        const historyService = registry.get('historyService');
        if (historyService) {
            historyService.records = [];
            historyService.currentUserId = null;
        }

        const stateService = registry.get('stateService');
        if (stateService) {
            stateService.state.students = [];
            stateService.state.courses = [];
            stateService.state.organizations = [];
            stateService.state.grades = [];
            stateService.state.organizationColors = {};
            stateService.state.gradeColors = {};
            stateService.state.lastupdated = null;
        }

        // 清理学生列表布局选择和多列容器残留
        const multiCol = document.getElementById('students-multi-col-container');
        if (multiCol) multiCol.innerHTML = '';
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

    /**
     * 渲染 profile 占位（使用邮箱前缀）
     */
    _renderProfilePlaceholder(email) {
        const nameEl = document.getElementById('settings-user-name');
        if (nameEl) {
            nameEl.textContent = '用户';
        }
        // 清除旧头像残留，显示默认占位
        const avatarImg = document.getElementById('profile-avatar-img');
        const placeholder = document.getElementById('profile-avatar-placeholder');
        const loading = document.getElementById('profile-avatar-loading');
        if (avatarImg) {
            avatarImg.src = '';
            avatarImg.style.display = 'none';
        }
        if (loading) loading.style.display = 'none';
        if (placeholder) placeholder.style.display = '';
    }

    /**
     * 渲染 profile 数据（头像 + 昵称）
     */
    _renderProfile(profile) {
        const nameEl = document.getElementById('settings-user-name');
        if (nameEl && profile.nickname) {
            nameEl.textContent = profile.nickname;
        }

        const avatarImg = document.getElementById('profile-avatar-img');
        const placeholder = document.getElementById('profile-avatar-placeholder');
        const loading = document.getElementById('profile-avatar-loading');

        // 头像：通过文件名动态生成签名 URL
        if (profile.avatar_url) {
            if (loading) loading.style.display = '';
            if (placeholder) placeholder.style.display = 'none';

            this.profileService.getAvatarUrl(profile.avatar_url).then(url => {
                if (url && avatarImg) {
                    avatarImg.src = url;
                    avatarImg.style.display = '';
                    avatarImg.onload = () => {
                        if (loading) loading.style.display = 'none';
                    };
                    avatarImg.onerror = () => {
                        if (loading) loading.style.display = 'none';
                        if (placeholder) placeholder.style.display = '';
                    };
                } else {
                    if (loading) loading.style.display = 'none';
                    if (placeholder) placeholder.style.display = '';
                }
            }).catch(() => {
                if (loading) loading.style.display = 'none';
                if (placeholder) placeholder.style.display = '';
            });
        } else {
            // 无头像，回退到默认占位，清除旧头像残留
            if (avatarImg) {
                avatarImg.src = '';
                avatarImg.style.display = 'none';
            }
            if (loading) loading.style.display = 'none';
            if (placeholder) placeholder.style.display = '';
        }
    }

    /**
     * 设置 profile 编辑功能（昵称编辑 + 头像上传）
     */
    _setupProfileEditing() {
        const nameEl = document.getElementById('settings-user-name');
        const inputEl = document.getElementById('settings-nickname-input');
        const avatarWrapper = document.getElementById('profile-avatar-wrapper');
        const fileInput = document.getElementById('profile-avatar-input');

        // 昵称编辑：点击切换为输入框
        if (nameEl && inputEl) {
            nameEl.addEventListener('click', () => {
                if (!this._currentUserId) return;
                inputEl.value = nameEl.textContent;
                nameEl.style.display = 'none';
                inputEl.style.display = '';
                inputEl.focus();
                inputEl.select();
            });

            const saveNickname = () => {
                const newName = inputEl.value.trim();
                nameEl.style.display = '';
                inputEl.style.display = 'none';

                if (newName && newName !== nameEl.textContent && this._currentUserId) {
                    this.profileService.updateNickname(this._currentUserId, newName).then(success => {
                        if (success) {
                            nameEl.textContent = newName;
                        }
                    }).catch(() => {});
                }
            };

            inputEl.addEventListener('blur', saveNickname);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    inputEl.blur();
                } else if (e.key === 'Escape') {
                    inputEl.value = nameEl.textContent;
                    inputEl.blur();
                }
            });
        }

        // 头像上传：点击头像区域触发文件选择
        if (avatarWrapper && fileInput) {
            avatarWrapper.addEventListener('click', (e) => {
                if (!this._currentUserId) return;
                e.stopPropagation();
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                if (!file || !this._currentUserId) return;

                // 文件大小限制 200KB（前端预检，profileService 内部也会校验）
                if (file.size > 200 * 1024) {
                    this.notificationService.show('文件大小不能超过 200KB', 'error');
                    fileInput.value = '';
                    return;
                }

                this.profileService.uploadAvatar(this._currentUserId, file).then(result => {
                    if (result.success && result.url) {
                        const avatarImg = document.getElementById('profile-avatar-img');
                        const placeholder = document.getElementById('profile-avatar-placeholder');
                        const loading = document.getElementById('profile-avatar-loading');
                        if (loading) loading.style.display = '';
                        if (placeholder) placeholder.style.display = 'none';
                        if (avatarImg) {
                            avatarImg.src = result.url;
                            avatarImg.style.display = '';
                            avatarImg.onload = () => {
                                if (loading) loading.style.display = 'none';
                            };
                            avatarImg.onerror = () => {
                                if (loading) loading.style.display = 'none';
                                if (placeholder) placeholder.style.display = '';
                            };
                        }
                        this.notificationService.show('头像已更新', 'success');
                    } else {
                        this.notificationService.show(result.error || '头像上传失败', 'error');
                    }
                }).catch(() => {
                    this.notificationService.show('头像上传失败', 'error');
                });

                // 重置 file input 以允许重复上传同一文件
                fileInput.value = '';
            });
        }
    }
}

export default AuthUIService;
