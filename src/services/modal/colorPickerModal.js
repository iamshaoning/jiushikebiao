/**
 * 颜色选择器模态框
 *
 * @description 嵌套模态框组件，提供调色板选择、已用颜色锁定、当前颜色标记等交互
 * @module colorPickerModal
 */
import { registry } from '../../core/registry.js';
export class ColorPickerModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    show(options) {
        const { itemName, itemType, currentColor, onSelect } = options;
        const colorPalette = registry.get('utils').getColorPalette();
        const usedColors = registry.get('utils').getUsedColors(itemType);

        const content = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold" style="color: var(--text-primary);">选择颜色</h3>
                <p class="text-sm" style="color: var(--text-secondary);">为 "${registry.get('utils').escapeHtml(itemName)}" 选择一个颜色</p>
            </div>

            <div class="color-picker-grid grid grid-cols-4 gap-2 mb-6">
                ${colorPalette.map(color => {
                    const isUsed = usedColors.includes(color) && color !== currentColor;
                    const isSelected = color === currentColor;
                    return `
                        <button
                            class="color-picker-item h-8 rounded transition-all duration-200 flex items-center justify-center relative font-mono text-xs font-bold"
                            ${isUsed ? 'disabled' : ''}
                            style="background-color: ${color}; color: ${registry.get('utils').isLightColor(color) ? '#000' : '#fff'}; ${isUsed ? 'opacity: 0.4; cursor: not-allowed;' : 'cursor: pointer;'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-white;' : ''}"
                            data-color="${color}"
                        >
                            ${color.toUpperCase()}
                            ${isSelected ? '<span class="ml-1">✓</span>' : ''}
                            ${isUsed ? '<span class="ml-1">🔒</span>' : ''}
                        </button>
                    `;
                }).join('')}
            </div>

            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 rounded" style="background-color: ${currentColor};"></div>
                    <span class="text-sm font-mono" style="color: var(--text-secondary);">当前颜色: ${currentColor.toUpperCase()}</span>
                </div>
                <button type="button" class="close-color-picker text-white px-4 py-2 rounded-lg" style="background-color: var(--color-secondary);">取消</button>
            </div>
        `;

        this.modal.showNested(content, {
            onShow: () => {
                if (registry.get('lucide')) lucide.createIcons();
                document.querySelectorAll('.color-picker-item:not([disabled])').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (onSelect && typeof onSelect === 'function') onSelect(btn.dataset.color);
                        this.modal.hideNested();
                    });
                });
                const cancelBtn = document.querySelector('.close-color-picker');
                if (cancelBtn) cancelBtn.addEventListener('click', () => this.modal.hideNested());
            }
        });
    }
}
