/**
 * 颜色工具
 *
 * @description 为机构和年级名称生成唯一颜色、管理调色板、颜色分配/移除/重分配
 * @module colorUtils
 */
import { registry } from '../core/registry.js';

const colorPalette = [
    '#3B82F6', '#7FFFD4', '#B87333', '#FFB6C1',
    '#C0C0C0', '#0ABAB5', '#FFBF00', '#EE82EE',
    '#32CD32', '#1E90FF', '#FF4500', '#9400D3',
    '#2E8B57', '#003153', '#800020', '#7B68EE',
];

const colorAssignments = {
    organization: new Map(),
    grade: new Map()
};

const usedColors = {
    organization: new Set(),
    grade: new Set()
};

let syncTimeout = null;
let pendingSyncTypes = new Set();

export function generateColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';

    if (colorAssignments[validType].has(text)) {
        return colorAssignments[validType].get(text);
    }

    // 使用字符串哈希来分配颜色，避免顺序依赖，提高缓存命中率
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    let color = colorPalette[Math.abs(hash) % colorPalette.length];

    // 哈希碰撞处理：如果该颜色已被其他文本使用，查找下一个可用颜色
    if (usedColors[validType].has(color)) {
        const startIndex = colorPalette.indexOf(color);
        for (let i = 1; i < colorPalette.length; i++) {
            const nextColor = colorPalette[(startIndex + i) % colorPalette.length];
            if (!usedColors[validType].has(nextColor)) {
                color = nextColor;
                break;
            }
        }
    }

    colorAssignments[validType].set(text, color);
    usedColors[validType].add(color);

    scheduleSyncToState(validType);
    return color;
}

export function removeColorAssignment(text, type) {
    if (colorAssignments[type]) {
        const color = colorAssignments[type].get(text);
        colorAssignments[type].delete(text);
        if (color && usedColors[type]) {
            // 检查该颜色是否仍被其他文本使用
            let stillUsed = false;
            for (const [, c] of colorAssignments[type]) {
                if (c === color) { stillUsed = true; break; }
            }
            if (!stillUsed) usedColors[type].delete(color);
        }
        scheduleSyncToState(type);
    }
}

export function getUsedColors(type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return Array.from(colorAssignments[validType].values());
}

export function setColor(text, color, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    const existingColor = colorAssignments[validType].get(text);
    if (existingColor === color) {
        return;
    }
    // 更新 usedColors 跟踪
    if (existingColor && usedColors[validType]) {
        let stillUsed = false;
        for (const [key, c] of colorAssignments[validType]) {
            if (key !== text && c === existingColor) { stillUsed = true; break; }
        }
        if (!stillUsed) usedColors[validType].delete(existingColor);
    }
    colorAssignments[validType].set(text, color);
    if (usedColors[validType]) usedColors[validType].add(color);
    
    if (registry.get('state')) {
        if (validType === 'organization') {
            const newColors = { ...(registry.get('state').organizationColors || {}) };
            newColors[text] = color;
            registry.get('state').organizationColors = newColors;
        } else if (validType === 'grade') {
            const newColors = { ...(registry.get('state').gradeColors || {}) };
            newColors[text] = color;
            registry.get('state').gradeColors = newColors;
        }
    }
}

function scheduleSyncToState(type) {
    pendingSyncTypes.add(type);
    
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(() => {
        performSyncToState();
    }, 0);
}

function syncColorsToState(type, stateKey) {
    const newColors = {};
    let hasChanges = false;
    const currentColors = registry.get('state')[stateKey] || {};

    colorAssignments[type].forEach((color, text) => {
        newColors[text] = color;
        if (currentColors[text] !== color) {
            hasChanges = true;
        }
    });

    const currentKeys = Object.keys(currentColors);
    if (currentKeys.length !== colorAssignments[type].size) {
        hasChanges = true;
    } else {
        for (const key of currentKeys) {
            if (!(key in newColors)) {
                hasChanges = true;
                break;
            }
        }
    }

    if (hasChanges) {
        registry.get('state')[stateKey] = newColors;
    }
}

function performSyncToState() {
    if (!registry.get('state')) {
        pendingSyncTypes.clear();
        return;
    }

    if (pendingSyncTypes.has('organization')) {
        syncColorsToState('organization', 'organizationColors');
    }

    if (pendingSyncTypes.has('grade')) {
        syncColorsToState('grade', 'gradeColors');
    }

    pendingSyncTypes.clear();
}

export function initColorsFromState() {
    if (!registry.get('state')) {
        return;
    }
    
    const orgColors = registry.get('state').organizationColors;
    const gradeColors = registry.get('state').gradeColors;
    
    if (orgColors) {
        const orgEntries = Object.entries(orgColors);

        orgEntries.forEach(([text, color]) => {
            const existing = colorAssignments.organization.get(text);
            if (existing !== color) {
                colorAssignments.organization.set(text, color);
            }
            usedColors.organization.add(color);
        });
    }

    if (gradeColors) {
        const gradeEntries = Object.entries(gradeColors);

        gradeEntries.forEach(([text, color]) => {
            const existing = colorAssignments.grade.get(text);
            if (existing !== color) {
                colorAssignments.grade.set(text, color);
            }
            usedColors.grade.add(color);
        });
    }
}

export function getColorPalette() {
    return [...colorPalette];
}

export function isLightColor(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
}
