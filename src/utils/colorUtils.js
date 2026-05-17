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

export function removeColorAssignment(text, type) {
    if (colorAssignments[type]) {
        colorAssignments[type].delete(text);
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
    colorAssignments[validType].set(text, color);
    
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

export function isLightColor(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
}
