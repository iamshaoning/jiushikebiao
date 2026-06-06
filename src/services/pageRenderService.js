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
            });
        }
        const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        const targetPage = document.getElementById(pageId);
        if (!targetPage) return;

        // Same page, no transition needed
        if (currentPage === targetPage) return;

        // Fade out current page first, then fade in target page
        if (currentPage) {
            currentPage.classList.remove('active');
            currentPage.style.pointerEvents = 'none';

            const switchPage = () => {
                if (!this._pendingTransition) return;
                this._pendingTransition = false;
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
