/**
 * 颜色生成工具模块
 * 负责根据文本生成独立颜色、颜色分配管理等功能
 */

// 预定义的美观颜色数组（按视觉对比度排列）
const colorPalette = [
    '#000000', '#7FFFD4', '#B87333', '#FFB6C1',

    '#C0C0C0', '#0ABAB5', '#FFBF00', '#EE82EE',

    '#32CD32', '#1E90FF', '#FF4500', '#9400D3',

    '#2E8B57', '#003153', '#800020', '#7B68EE',
];

// 按类型存储颜色分配映射
const colorAssignments = {
    organization: new Map(), // 机构颜色映射
    grade: new Map()        // 年级颜色映射
};

// 每种类型的下一个可用颜色索引
const nextColorIndex = {
    organization: 0,
    grade: 0
};

/**
 * 根据文本和类型生成唯一颜色
 * @param {string} text - 用于生成颜色的文本
 * @param {string} type - 类型：'organization' | 'grade'
 * @returns {string} 十六进制颜色值
 */
export function generateColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    
    if (colorAssignments[validType].has(text)) {
        return colorAssignments[validType].get(text);
    }
    
    const color = colorPalette[nextColorIndex[validType] % colorPalette.length];
    colorAssignments[validType].set(text, color);
    nextColorIndex[validType]++;
    
    syncColorsToState(validType);
    return color;
}

/**
 * 根据文本获取已分配的颜色（如果存在）
 * @param {string} text - 文本
 * @param {string} type - 类型
 * @returns {string|null} 颜色值或null
 */
export function getAssignedColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].get(text) || null;
}

/**
 * 重置指定类型的颜色分配
 * @param {string} type - 类型
 */
export function resetColorAssignments(type) {
    if (colorAssignments[type]) {
        colorAssignments[type].clear();
        nextColorIndex[type] = 0;
    }
}

/**
 * 重置所有颜色分配
 */
export function resetAllColorAssignments() {
    Object.keys(colorAssignments).forEach(key => {
        colorAssignments[key].clear();
        nextColorIndex[key] = 0;
    });
}

/**
 * 获取指定类型已分配的颜色数量
 * @param {string} type - 类型
 * @returns {number} 已分配颜色数量
 */
export function getAssignedCount(type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].size;
}

/**
 * 移除特定文本的颜色分配
 * @param {string} text - 文本
 * @param {string} type - 类型
 */
export function removeColorAssignment(text, type) {
    if (colorAssignments[type]) {
        colorAssignments[type].delete(text);
        syncColorsToState(type);
    }
}

/**
 * 重新分配特定类型的所有颜色（重置并重新分配给所有现有项）
 * @param {string} type - 类型
 * @param {string[]} items - 现有项目列表
 */
export function reassignColors(type, items) {
    if (colorAssignments[type]) {
        colorAssignments[type].clear();
        nextColorIndex[type] = 0;
        items.forEach(item => {
            generateColor(item, type);
        });
        syncColorsToState(type);
    }
}

/**
 * 获取特定类型的所有已分配颜色
 * @param {string} type - 类型
 * @returns {string[]} 已分配的颜色数组
 */
export function getUsedColors(type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return Array.from(colorAssignments[validType].values());
}

/**
 * 检查颜色是否已被使用
 * @param {string} color - 颜色值
 * @param {string} type - 类型
 * @returns {boolean} 是否已被使用
 */
export function isColorUsed(color, type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].has(color);
}

/**
 * 设置特定文本的颜色（强制覆盖）
 * @param {string} text - 文本
 * @param {string} color - 颜色值
 * @param {string} type - 类型
 */
export function setColor(text, color, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    colorAssignments[validType].set(text, color);
    syncColorsToState(validType);
}

/**
 * 同步颜色到state
 * @param {string} type - 类型
 */
function syncColorsToState(type) {
    if (!window.state) return;
    if (type === 'organization') {
        window.state.organizationColors = {};
        colorAssignments.organization.forEach((color, text) => {
            window.state.organizationColors[text] = color;
        });
    } else if (type === 'grade') {
        window.state.gradeColors = {};
        colorAssignments.grade.forEach((color, text) => {
            window.state.gradeColors[text] = color;
        });
    }
}

/**
 * 从state初始化颜色
 */
export function initColorsFromState() {
    if (!window.state) return;
    if (window.state.organizationColors) {
        Object.entries(window.state.organizationColors).forEach(([text, color]) => {
            colorAssignments.organization.set(text, color);
        });
    }
    if (window.state.gradeColors) {
        Object.entries(window.state.gradeColors).forEach(([text, color]) => {
            colorAssignments.grade.set(text, color);
        });
    }
}

/**
 * 获取预定义的颜色调色板
 * @returns {string[]} 颜色数组
 */
export function getColorPalette() {
    return [...colorPalette];
}
