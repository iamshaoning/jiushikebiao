/**
 * 主题服务
 *
 * @description 管理系统深色/浅色主题切换，跟随系统或手动设置，存储偏好到 localStorage
 * @module themeService
 */
import { registry } from '../core/registry.js';

class ThemeService {
    constructor(elements, utils, render) {
        this.elements = elements;
        this.utils = utils;
        this.render = render;
        this.themeSlider = null;
        this.themeSliderIndicator = null;
    }

    /**
     * 初始化主题管理
     */
    init() {
        this.themeSlider = document.getElementById('theme-slider');
        this.themeSliderIndicator = document.getElementById('theme-slider-indicator');

        if (!this.themeSlider || !this.themeSliderIndicator) {
            return;
        }

        this.initTheme();
        this.bindEvents();
    }

    /**
     * 应用主题到文档
     * @param {string} mode - 主题模式 (light/dark/auto)
     */
    applyTheme(mode) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const body = document.body;

        if (document.startViewTransition) {
            if (this._transitionActive) {
                document.documentElement.classList.remove('dark');
                if (mode === 'dark' || (mode === 'auto' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                }
                this.reRenderStatistics();
                return;
            }

            this._transitionActive = true;
            body.classList.add('theme-transition');
            const onDone = () => {
                this._transitionActive = false;
                body.classList.remove('theme-transition');
            };
            try {
                const transition = document.startViewTransition(() => {
                    if (mode === 'dark' || (mode === 'auto' && prefersDark)) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    this.reRenderStatistics();
                });
                transition.finished.then(onDone).catch(onDone);
            } catch (e) {
                onDone();
            }
        } else {
            body.classList.add('theme-transitioning');
            setTimeout(() => {
                if (mode === 'dark' || (mode === 'auto' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                this.reRenderStatistics();
                setTimeout(() => {
                    body.classList.remove('theme-transitioning');
                }, 400);
            }, 50);
        }
    }

    /**
     * 重新渲染统计页面图表
     */
    reRenderStatistics() {
        if (typeof this.render !== 'undefined' && this.render.statistics) {
            const currentPage = document.querySelector('.page.active');
            if (currentPage === this.elements.statisticsPage) {
                const { year, month, organization } = this.utils.getStatisticsParams();
                this.render.statistics(year, month, organization);
            }
        }
    }

    /**
     * 更新滑动块位置和图标高亮
     * @param {string} mode - 主题模式
     */
    updateThemeUI(mode) {
        const iconContainers = this.themeSlider.querySelectorAll('[data-theme]');
        iconContainers.forEach(container => container.classList.remove('active'));

        this.themeSliderIndicator.className = 'theme-slider-indicator ' + mode;

        const activeContainer = this.themeSlider.querySelector(`[data-theme="${mode}"]`);
        if (activeContainer) activeContainer.classList.add('active');
    }

    /**
     * 初始化主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'auto';
        this.applyTheme(savedTheme);
        this.updateThemeUI(savedTheme);
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        this.themeSlider.addEventListener('click', (e) => {
            e.stopPropagation();

            const rect = this.themeSlider.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const segmentWidth = rect.width / 3;

            let clickedMode = null;
            if (clickX < segmentWidth) {
                clickedMode = 'light';
            } else if (clickX < segmentWidth * 2) {
                clickedMode = 'auto';
            } else {
                clickedMode = 'dark';
            }

            const currentIsDark = document.documentElement.classList.contains('dark');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const targetIsDark = clickedMode === 'dark' || (clickedMode === 'auto' && prefersDark);

            if (currentIsDark !== targetIsDark) {
                const x = e.clientX;
                const y = e.clientY;

                const radius = Math.hypot(
                    Math.max(x, window.innerWidth - x),
                    Math.max(y, window.innerHeight - y)
                );

                const root = document.documentElement;
                root.style.setProperty('--x', x + 'px');
                root.style.setProperty('--y', y + 'px');
                root.style.setProperty('--r', radius + 'px');

                localStorage.setItem('theme', clickedMode);
                this.applyTheme(clickedMode);
                this.updateThemeUI(clickedMode);
            } else {
                localStorage.setItem('theme', clickedMode);
                this.updateThemeUI(clickedMode);
            }
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const savedTheme = localStorage.getItem('theme') || 'auto';
            if (savedTheme === 'auto') {
                this.applyTheme('auto');
            }
        });
    }
}

export default ThemeService;
