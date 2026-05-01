/**
 * 图表服务模块
 * 负责图表的渲染和管理
 */

export class ChartService {
    constructor() {
        this.chartInstances = {};
    }

    /**
     * 渲染图表
     * @param {string} canvasId - Canvas 元素 ID
     * @param {Object} data - 图表数据
     * @param {string} title - 图表标题
     * @param {Object} utils - 工具函数对象
     */
    chart(canvasId, data, title, utils) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // 检查canvas或其父容器是否可见，避免在hidden容器上创建图表导致尺寸计算错误
        let visible = canvas.offsetParent !== null;
        if (!visible) {
            const style = window.getComputedStyle(canvas);
            visible = style.display !== 'none' && style.visibility !== 'hidden';
        }
        if (!visible) return;

        const ctx = canvas.getContext('2d');

        // 正确销毁旧图表，防止内存泄漏和重影
        if (this.chartInstances[canvasId] && typeof this.chartInstances[canvasId].destroy === 'function') {
            this.chartInstances[canvasId].destroy();
        }

        const labels = Object.keys(data);
        const values = labels.map(label => data[label].courses);
        const colors = labels.map(label => utils.generateColor(label));

        // 直接使用颜色变量，会根据主题自动调整
        // 获取实际颜色值用于Chart.js
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = computedStyle.getPropertyValue('--text-primary').trim() || '#333333';

        // 如果没有数据，显示空图表
        if (labels.length === 0) {
            this.chartInstances[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['暂无数据'],
                    datasets: [{
                        data: [1],
                        backgroundColor: [computedStyle.getPropertyValue('--bg-content').trim() || '#f3f3f3'],
                        borderColor: [computedStyle.getPropertyValue('--border-color').trim() || '#cccccc'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textColor }
                        },
                        title: {
                            display: false
                        }
                    }
                }
            });
            return;
        }

        // 渲染新图表并保存实例引用
        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor }
                    },
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const label = ctx.label || '';
                                const value = ctx.parsed || 0;
                                const item = data[label];
                                return [
                                    `${label}: ${value}节`,
                                    `费用: ¥${item.fee.toFixed(2)}`,
                                    `学生: ${item.students?.size || 0}人`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
}
