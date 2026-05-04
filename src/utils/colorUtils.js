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
        return colorAssignments[validType].get(text);
    }
    
    const color = colorPalette[nextColorIndex[validType] % colorPalette.length];
    colorAssignments[validType].set(text, color);
    nextColorIndex[validType]++;
    
    scheduleSyncToState(validType);
    return color;
}

export function getAssignedColor(text, type = 'organization') {
    const validType = colorAssignments[type] ? type : 'organization';
    return colorAssignments[validType].get(text) || null;
}

export function resetColorAssignments(type) {
    if (colorAssignments[type]) {
        colorAssignments[type].clear();
        nextColorIndex[type] = 0;
        scheduleSyncToState(type);
    }
}

export function resetAllColorAssignments() {
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
    if (colorAssignments[type]) {
        colorAssignments[type].delete(text);
        scheduleSyncToState(type);
    }
}

export function reassignColors(type, items) {
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
    if (existingColor === color) {
        return;
    }
    colorAssignments[validType].set(text, color);
    
    if (window.state) {
        if (validType === 'organization') {
            const newColors = { ...(window.state.organizationColors || {}) };
            newColors[text] = color;
            window.state.organizationColors = newColors;
        } else if (validType === 'grade') {
            const newColors = { ...(window.state.gradeColors || {}) };
            newColors[text] = color;
            window.state.gradeColors = newColors;
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

function performSyncToState() {
    if (!window.state) {
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
        window.state.organizationColors = newColors;
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
        window.state.gradeColors = newColors;
    }
}

export function initColorsFromState() {
    if (!window.state) {
        return;
    }
    
    const orgColors = window.state.organizationColors;
    const gradeColors = window.state.gradeColors;
    
    if (orgColors) {
        const orgEntries = Object.entries(orgColors);
        let maxOrgIndex = 0;
        
        orgEntries.forEach(([text, color]) => {
            const existing = colorAssignments.organization.get(text);
            if (existing !== color) {
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
    }
    
    if (gradeColors) {
        const gradeEntries = Object.entries(gradeColors);
        let maxGradeIndex = 0;
        
        gradeEntries.forEach(([text, color]) => {
            const existing = colorAssignments.grade.get(text);
            if (existing !== color) {
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
    }
}

export function getColorPalette() {
    return [...colorPalette];
}
