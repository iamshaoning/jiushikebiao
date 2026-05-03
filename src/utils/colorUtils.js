/**
 * 颜色生成工具模块
 * 负责根据文本生成独立颜色、颜色分配管理等功能
 */

const colorPalette = [
    '#000000', '#7FFFD4', '#B87333', '#FFB6C1',
    '#C0C0C0', '#0ABAB5', '#FFBF00', '#EE82EE',
    '#32CD32', '#1E90FF', '#FF4500', '#9400D3',
    '#2E8B57', '#003153', '#800020', '#7B68EE',
];

const colorAssignments = {
    organization: new Map(),
    grade: new Map()
};

const nextColorIndex = {
    organization: 0,
    grade: 0
};

let syncTimeout = null;
let pendingSyncTypes = new Set();

export function generateColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    
    if (colorAssignments[validType].has(text)) {
        const cachedColor = colorAssignments[validType].get(text);
        if (window.GLOBAL_DEBUG) console.log(`[颜色] generateColor('${text}', '${type}') - 从缓存获取颜色: ${cachedColor}`);
        return cachedColor;
    }
    
    const color = colorPalette[nextColorIndex[validType] % colorPalette.length];
    colorAssignments[validType].set(text, color);
    nextColorIndex[validType]++;
    
    if (window.GLOBAL_DEBUG) console.log(`[颜色] generateColor('${text}', '${type}') - 分配新颜色: ${color}`);
    
    scheduleSyncToState(validType);
    return color;
}

export function getAssignedColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    const color = colorAssignments[validType].get(text) || null;
    if (window.GLOBAL_DEBUG) console.log(`[颜色] getAssignedColor('${text}', '${type}') = ${color}`);
    return color;
}

export function resetColorAssignments(type) {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] resetColorAssignments('${type}')`);
    if (colorAssignments[type]) {
        colorAssignments[type].clear();
        nextColorIndex[type] = 0;
        scheduleSyncToState(type);
    }
}

export function resetAllColorAssignments() {
    if (window.GLOBAL_DEBUG) console.log('[颜色] resetAllColorAssignments()');
    Object.keys(colorAssignments).forEach(key => {
        colorAssignments[key].clear();
        nextColorIndex[key] = 0;
    });
    scheduleSyncToState('organization');
    scheduleSyncToState('grade');
}

export function getAssignedCount(type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].size;
}

export function removeColorAssignment(text, type) {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] removeColorAssignment('${text}', '${type}')`);
    if (colorAssignments[type]) {
        colorAssignments[type].delete(text);
        scheduleSyncToState(type);
    }
}

export function reassignColors(type, items) {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] reassignColors('${type}', items: ${items.join(', ')})`);
    if (colorAssignments[type]) {
        colorAssignments[type].clear();
        nextColorIndex[type] = 0;
        items.forEach(item => {
            generateColor(item, type);
        });
    }
}

export function getUsedColors(type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return Array.from(colorAssignments[validType].values());
}

export function isColorUsed(color, type) {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].has(color);
}

export function setColor(text, color, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    const existingColor = colorAssignments[validType].get(text);
    if (window.GLOBAL_DEBUG) console.log(`[颜色] setColor('${text}', '${color}', '${type}') - 现有颜色: ${existingColor}`);
    if (existingColor === color) {
        if (window.GLOBAL_DEBUG) console.log(`[颜色] setColor() - 颜色相同，无需更新`);
        return;
    }
    colorAssignments[validType].set(text, color);
    if (window.GLOBAL_DEBUG) console.log(`[颜色] setColor() - 已将 '${text}' 颜色更新为: ${color}`);
    
    if (window.state) {
        if (validType === 'organization') {
            const newColors = { ...(window.state.organizationColors || {}) };
            newColors[text] = color;
            window.state.organizationColors = newColors;
            if (window.GLOBAL_DEBUG) console.log(`[颜色] setColor() - 立即同步 organizationColors:`, JSON.stringify(newColors));
        } else if (validType === 'grade') {
            const newColors = { ...(window.state.gradeColors || {}) };
            newColors[text] = color;
            window.state.gradeColors = newColors;
            if (window.GLOBAL_DEBUG) console.log(`[颜色] setColor() - 立即同步 gradeColors:`, JSON.stringify(newColors));
        }
    }
}

function scheduleSyncToState(type) {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] scheduleSyncToState('${type}')`);
    pendingSyncTypes.add(type);
    
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(() => {
        performSyncToState();
    }, 0);
}

function performSyncToState() {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] performSyncToState() - pending types: ${Array.from(pendingSyncTypes).join(', ')}`);
    if (!window.state) {
        if (window.GLOBAL_DEBUG) console.log(`[颜色] performSyncToState() - window.state 不存在，跳过`);
        pendingSyncTypes.clear();
        return;
    }
    
    if (pendingSyncTypes.has('organization')) {
        syncOrganizationColors();
    }
    
    if (pendingSyncTypes.has('grade')) {
        syncGradeColors();
    }
    
    pendingSyncTypes.clear();
}

function syncOrganizationColors() {
    const newColors = {};
    let hasChanges = false;
    const currentColors = window.state.organizationColors || {};
    
    colorAssignments.organization.forEach((color, text) => {
        newColors[text] = color;
        if (currentColors[text] !== color) {
            hasChanges = true;
        }
    });
    
    const currentKeys = Object.keys(currentColors);
    if (currentKeys.length !== colorAssignments.organization.size) {
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
        if (window.GLOBAL_DEBUG) console.log(`[颜色] syncOrganizationColors() - 更新前: ${JSON.stringify(currentColors)}, 更新后: ${JSON.stringify(newColors)}`);
        window.state.organizationColors = newColors;
    } else {
        if (window.GLOBAL_DEBUG) console.log(`[颜色] syncOrganizationColors() - 无变化，跳过`);
    }
}

function syncGradeColors() {
    const newColors = {};
    let hasChanges = false;
    const currentColors = window.state.gradeColors || {};
    
    colorAssignments.grade.forEach((color, text) => {
        newColors[text] = color;
        if (currentColors[text] !== color) {
            hasChanges = true;
        }
    });
    
    const currentKeys = Object.keys(currentColors);
    if (currentKeys.length !== colorAssignments.grade.size) {
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
        if (window.GLOBAL_DEBUG) console.log(`[颜色] syncGradeColors() - 更新前: ${JSON.stringify(currentColors)}, 更新后: ${JSON.stringify(newColors)}`);
        window.state.gradeColors = newColors;
    } else {
        if (window.GLOBAL_DEBUG) console.log(`[颜色] syncGradeColors() - 无变化，跳过`);
    }
}

export function initColorsFromState() {
    if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - 开始`);
    if (!window.state) {
        if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - window.state 不存在`);
        return;
    }
    
    const orgColors = window.state.organizationColors;
    const gradeColors = window.state.gradeColors;
    
    if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - window.state.organizationColors: ${JSON.stringify(orgColors)}`);
    if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - window.state.gradeColors: ${JSON.stringify(gradeColors)}`);
    
    if (orgColors) {
        const orgEntries = Object.entries(orgColors);
        let maxOrgIndex = 0;
        
        orgEntries.forEach(([text, color]) => {
            const existing = colorAssignments.organization.get(text);
            if (existing !== color) {
                if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - 更新机构 '${text}': ${existing} -> ${color}`);
                colorAssignments.organization.set(text, color);
            }
            const paletteIndex = colorPalette.indexOf(color);
            if (paletteIndex !== -1 && paletteIndex >= maxOrgIndex) {
                maxOrgIndex = paletteIndex + 1;
            }
        });
        
        if (maxOrgIndex > 0) {
            nextColorIndex.organization = maxOrgIndex;
        }
        if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - 机构颜色加载完成，colorAssignments.organization 大小: ${colorAssignments.organization.size}`);
    }
    
    if (gradeColors) {
        const gradeEntries = Object.entries(gradeColors);
        let maxGradeIndex = 0;
        
        gradeEntries.forEach(([text, color]) => {
            const existing = colorAssignments.grade.get(text);
            if (existing !== color) {
                if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - 更新年级 '${text}': ${existing} -> ${color}`);
                colorAssignments.grade.set(text, color);
            }
            const paletteIndex = colorPalette.indexOf(color);
            if (paletteIndex !== -1 && paletteIndex >= maxGradeIndex) {
                maxGradeIndex = paletteIndex + 1;
            }
        });
        
        if (maxGradeIndex > 0) {
            nextColorIndex.grade = maxGradeIndex;
        }
        if (window.GLOBAL_DEBUG) console.log(`[颜色] initColorsFromState() - 年级颜色加载完成，colorAssignments.grade 大小: ${colorAssignments.grade.size}`);
    }
}

export function getColorPalette() {
    return [...colorPalette];
}
