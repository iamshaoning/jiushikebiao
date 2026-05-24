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

        // 如果有当前页面，先淡出
        if (currentPage) {
            currentPage.classList.remove('active');
            // 使用 requestAnimationFrame 延迟添加 hidden，让淡出动画有机会执行
            requestAnimationFrame(() => {
                if (!currentPage.classList.contains('active')) {
                    currentPage.classList.add('hidden');
                }
            });
        }

        // 显示目标页面并添加动画
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            // 使用 requestAnimationFrame 确保浏览器有机会处理 hidden 移除
            requestAnimationFrame(() => {
                targetPage.classList.add('active');
            });
        }
    }

}

export default PageRenderService;
