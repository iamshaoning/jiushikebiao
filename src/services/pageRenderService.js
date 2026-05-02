/**
 * 页面渲染服务模块
 * 负责页面切换、导航状态更新、页面动画效果
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
            currentPage.classList.add('hidden');
        }

        // 显示目标页面并添加动画
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            // 强制重绘以确保动画生效
            void targetPage.offsetWidth;
            targetPage.classList.add('active');
        }
    }

    /**
     * 显示指定页面
     * @param {string} pageId - 页面ID
     */
    showPage(pageId) {
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('hidden');
            void page.offsetWidth;
            page.classList.add('active');
        }
    }

    /**
     * 隐藏指定页面
     * @param {string} pageId - 页面ID
     */
    hidePage(pageId) {
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('active');
            page.classList.add('hidden');
        }
    }
}

export default PageRenderService;
