/**
 * 图表服务
 *
 * @description 纯 SVG 饼形图渲染，无需第三方图表库，用于统计页面数据可视化
 * @module chartService
 */
import { registry } from '../core/registry.js';

export class ChartService {
    constructor() {
        this.chartInstances = {};
    }

    /**
     * 计算弧线路径
     */
    _describeArc(cx, cy, r, startAngle, endAngle) {
        const toRad = (deg) => deg * Math.PI / 180;
        const sa = toRad(startAngle - 90); // SVG 0° is at top
        const ea = toRad(endAngle - 90);
        const x1 = cx + r * Math.cos(sa);
        const y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea);
        const y2 = cy + r * Math.sin(ea);
        const large = (endAngle - startAngle) > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }

    /**
     * 渲染 SVG 饼形图
     * @param {string} containerId - 容器元素 ID
     * @param {Object} data - { orgName: { courses, fee, students } }
     * @param {string} title - 图表标题
     * @param {Object} utils - 工具函数对象
     */
    chart(containerId, data, title, utils) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data);
        if (entries.length === 0) {
            container.innerHTML = '<div class="text-center" style="color:var(--text-secondary)"><div class="css-pie" style="background:var(--bg-content)">暂无数据</div></div>';
            return;
        }

        const total = entries.reduce((sum, [, s]) => sum + s.courses, 0);
        const size = 220;
        const cx = size / 2, cy = size / 2, r = size / 2 - 4;

        let cumulative = 0;
        const paths = [];
        const labels = [];

        entries.sort(([, a], [, b]) => b.courses - a.courses).forEach(([label, stats]) => {
            const color = utils.generateColor(label, 'organization');
            const pct = stats.courses / total;
            const startAngle = cumulative * 360;
            const endAngle = (cumulative + pct) * 360;
            const gap = endAngle - startAngle > 3 ? 1 : 0;
            const pathD = this._describeArc(cx, cy, r, startAngle + gap, endAngle);

            const tooltip = `${label}: ${stats.courses}节 | ¥${stats.fee.toFixed(2)} | ${stats.students?.size || 0}人`;
            paths.push(`<g class="pie-segment" data-tooltip="${utils.escapeHtml(tooltip)}">
                <path d="${pathD}" fill="${color}" stroke="var(--bg-secondary)" stroke-width="2"/>
            </g>`);

            cumulative += pct;
            labels.push({ label, color });
        });

        container.innerHTML = `
            <div class="css-pie-wrapper">
                <svg class="css-pie-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                    ${paths.join('')}
                </svg>
                <div class="css-pie-tooltip" id="pie-tooltip" style="display:none;"></div>
                <div class="css-pie-legend">
                    ${labels.map(l => `
                        <span class="css-pie-legend-item">
                            <span class="css-pie-legend-dot" style="background-color:${l.color};"></span>
                            <span class="css-pie-legend-label">${utils.escapeHtml(l.label)}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
        `;

        // Attach hover tooltip events
        requestAnimationFrame(() => {
            const svg = container.querySelector('.css-pie-svg');
            const tooltip = container.querySelector('#pie-tooltip');
            if (!svg || !tooltip) return;
            svg.querySelectorAll('.pie-segment').forEach(seg => {
                seg.addEventListener('mouseenter', (e) => {
                    tooltip.textContent = seg.dataset.tooltip;
                    tooltip.style.display = 'block';
                });
                seg.addEventListener('mousemove', (e) => {
                    const rect = svg.getBoundingClientRect();
                    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
                    tooltip.style.top = (e.clientY - rect.top - 28) + 'px';
                });
                seg.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
            });
        });
    }
}
