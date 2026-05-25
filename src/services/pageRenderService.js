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

        // 如果有当前页面且不是目标页面，先淡出
        if (currentPage && currentPage.id !== pageId) {
            currentPage.classList.remove('active');
            currentPage.classList.add('hidden');
        }

        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('active');
        }
    }

}

export default PageRenderService;
