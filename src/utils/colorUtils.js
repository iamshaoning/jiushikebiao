/**
 * 颜色生成工具模块
 * 负责根据文本生成颜色等功能
 */

/**
 * 根据文本生成颜色
 * @param {string} text - 用于生成颜色的文本
 * @returns {string} 十六进制颜色值
 */
export function generateColor(text) {
    // 预定义的美观颜色数组
    const baseColors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
        '#06b6d4', '#84cc16', '#f97316', '#8b5cf6', '#0891b2', '#d946ef'
    ];
    
    // 使用简单的哈希算法生成索引
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 确保索引在有效范围内
    const index = Math.abs(hash) % baseColors.length;
    return baseColors[index];
}
