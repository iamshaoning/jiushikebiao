/**
 * 应用入口
 *
 * @description 唯一的 script 入口，导入并调用 bootstrap() 启动整个应用
 * @module app
 */
import { bootstrap } from './bootstrap.js';

(function setupViewportScale() {
    const MIN_WIDTH = 1300;

    function applyScale() {
        const vw = window.innerWidth;
        if (vw < MIN_WIDTH) {
            document.body.style.zoom = (vw / MIN_WIDTH).toString();
            document.documentElement.style.overflowX = 'hidden';
        } else {
            document.body.style.zoom = '';
            document.documentElement.style.overflowX = '';
        }
    }

    window.addEventListener('resize', applyScale);
    applyScale();
})();

bootstrap();
