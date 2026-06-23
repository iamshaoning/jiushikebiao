/**
 * 页面渲染服务
 *
 * @description 页面切换、导航状态更新、页面动画效果
 * @module pageRenderService
 */
class PageRenderService {
    constructor(elements) {
        this.elements = elements;
    }

    /**
     * 切换页面
     * @param {string} pageId - 目标页面ID
     */
    page(pageId) {
        const currentPage = document.querySelector('.page.active');

        // 更新导航状态
        if (this.elements.navButtons) {
            this.elements.navButtons.forEach(item => {
                item.classList.remove('active');
                item.style.backgroundColor = '';
            });
        }
        const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.backgroundColor = 'var(--bg-content)';
        }

        const targetPage = document.getElementById(pageId);
        if (!targetPage) return;

        // Same page, no transition needed
        if (currentPage === targetPage) return;

        // 切换页面时重置滚动位置到顶部
        window.scrollTo(0, 0);
        // 同时重置主内容区的滚动位置（兼容不同滚动容器）
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = 0;

        // Fade out current page first, then fade in target page
        if (currentPage) {
            currentPage.classList.remove('active');
            currentPage.style.pointerEvents = 'none';

            const switchPage = (e) => {
                // transitionend 会冒泡，只处理 currentPage 自身的 transition 结束事件
                // setTimeout 调用时 e 为 undefined，正常执行
                if (e && e.target !== currentPage) return;
                if (!this._pendingTransition) return;
                this._pendingTransition = false;
                if (this._fallbackTimer) {
                    clearTimeout(this._fallbackTimer);
                    this._fallbackTimer = null;
                }
                currentPage.removeEventListener('transitionend', switchPage);
                currentPage.classList.add('hidden');
                currentPage.style.pointerEvents = '';

                // Fade in target page
                if (targetPage.classList.contains('hidden')) {
                    targetPage.classList.remove('hidden');
                    void targetPage.offsetWidth;
                }
                targetPage.classList.add('active');
            };

            // Clear any pending fallback timer from previous transitions
            if (this._fallbackTimer) {
                clearTimeout(this._fallbackTimer);
                this._fallbackTimer = null;
            }
            this._pendingTransition = true;
            currentPage.addEventListener('transitionend', switchPage);

            // Fallback: if transitionend doesn't fire within 300ms
            this._fallbackTimer = setTimeout(() => {
                if (this._pendingTransition) {
                    switchPage();
                }
            }, 300);
            return; // Don't proceed to fade-in until fade-out completes
        }

        // No current page, just show target directly
        if (targetPage.classList.contains('hidden')) {
            targetPage.classList.remove('hidden');
            void targetPage.offsetWidth;
        }
        targetPage.classList.add('active');
    }

}

export default PageRenderService;
