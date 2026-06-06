/**
 * 冲突处理模态框
 *
 * @description 添加/粘贴课程时检测到时间冲突，提供左右对比的逐节处理界面
 * @module conflictModal
 */
import { registry } from '../../core/registry.js';

export class ConflictModal {
    constructor(modalService) {
        this.modal = modalService;
        this.conflicts = [];
        this.currentIndex = 0;
        this.results = [];
        this.bulkAction = null;
        this.onResolve = null;
        this.isSingleAdd = false;
    }

    /**
     * 显示冲突处理模态框
     * @param {Object} options
     * @param {Array} options.conflicts - [{ newCourse, conflictingCourses }]
     * @param {boolean} options.isSingleAdd - 是否为单个添加
     * @param {Function} options.onResolve - 处理完成回调 ({ skipped, overridden })
     */
    show(options) {
        this.conflicts = options.conflicts || [];
        this.currentIndex = 0;
        this.results = [];
        this.bulkAction = null;
        this.onResolve = options.onResolve || null;
        this.isSingleAdd = options.isSingleAdd || false;
        this.useNested = options.useNested !== undefined ? options.useNested : true;

        if (this.conflicts.length === 0) {
            if (this.onResolve) this.onResolve({ skipped: [], overridden: [] });
            return;
        }

        this._render();
    }

    /**
     * 渲染冲突模态框
     */
    _render() {
        const total = this.conflicts.length;
        const current = this.currentIndex + 1;
        const conflict = this.conflicts[this.currentIndex];
        const newCourse = conflict.newCourse;
        const conflictingCourses = conflict.conflictingCourses;

        const newTag = this._generateCourseTag(newCourse, 'new');
        const conflictTags = conflictingCourses.map((c, i) =>
            this._generateCourseTag(c, 'conflict', i + 1)
        ).join('');

        const content = `
            <div class="conflict-modal" style="max-width: 720px; width: 95vw;">
                <div class="conflict-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-weight: 700; font-size: 16px; color: var(--text-primary);">
                            时间冲突处理
                        </span>
                        <span style="margin-left: 8px; font-size: 13px; color: var(--text-secondary);">
                            ${total > 1 ? `第 ${current}/${total} 节` : ''}
                        </span>
                    </div>
                    <span style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                        待处理 ${total - this.results.length} 节冲突
                    </span>
                </div>

                <div class="conflict-compare" style="padding: 16px 20px; display: flex; gap: 16px; align-items: flex-start;">
                    <div class="conflict-side conflict-side-new" style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--color-success); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> 要写入的课程
                        </div>
                        ${newTag}
                    </div>
                    <div class="conflict-divider" style="display: flex; align-items: center; padding-top: 20px; flex-shrink: 0;">
                        <i data-lucide="arrow-right" style="width: 20px; height: 20px; color: var(--text-secondary);"></i>
                    </div>
                    <div class="conflict-side conflict-side-existing" style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--color-danger); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i> 时间冲突的课程（${conflictingCourses.length}节）
                        </div>
                        <div class="conflict-list" style="display: flex; flex-direction: column; gap: 8px;">
                            ${conflictTags}
                        </div>
                    </div>
                </div>

                ${this.conflicts.length > 1 ? this._renderBulkControls() : ''}

                <div class="conflict-actions" style="padding: 16px 20px; border-top: 1px solid var(--border-color); display: flex; gap: 12px; justify-content: flex-end; align-items: center;">
                    ${this.conflicts.length > 1 ? `
                        <div class="conflict-bulk-hint" style="flex: 1; font-size: 12px; color: var(--color-warning);" id="conflict-bulk-hint"></div>
                    ` : ''}
                    <button id="conflict-skip" class="conflict-btn-skip" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 14px; transition: all 0.2s;">
                        跳过
                    </button>
                    <button id="conflict-override" class="conflict-btn-override" style="padding: 8px 20px; border-radius: 8px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                        覆盖
                    </button>
                </div>
            </div>
        `;

        this.modal[this.useNested ? 'showNested' : 'show'](content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                this._bindEvents();
                this._updateBulkHint();
            }
        });
    }

    /**
     * 渲染批量操作控件
     */
    _renderBulkControls() {
        const checked = this.bulkAction !== null;
        return `
            <div class="conflict-bulk-controls" style="padding: 0 20px 12px; display: flex; align-items: center; gap: 12px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-primary);">
                    <input type="checkbox" id="conflict-bulk-checkbox" ${checked ? 'checked' : ''} style="accent-color: var(--color-primary);">
                    全部执行此操作
                </label>
                <button id="conflict-compare-all" class="conflict-btn-compare-all" style="padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 12px; ${!checked ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    比较全部
                </button>
            </div>
        `;
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        const skipBtn = document.getElementById('conflict-skip');
        const overrideBtn = document.getElementById('conflict-override');
        const bulkCheckbox = document.getElementById('conflict-bulk-checkbox');
        const compareAllBtn = document.getElementById('conflict-compare-all');

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this._handleAction('skip'));
        }
        if (overrideBtn) {
            overrideBtn.addEventListener('click', () => this._handleAction('override'));
        }
        if (bulkCheckbox) {
            bulkCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.bulkAction = null;
                } else {
                    this.bulkAction = null;
                }
                this._updateBulkHint();
                this._updateCompareAllBtn();
            });
        }
        if (compareAllBtn) {
            compareAllBtn.addEventListener('click', () => this._showCompareAll());
        }

        // 键盘事件
        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.modal[this.useNested ? 'hideNested' : 'hide']();
                document.removeEventListener('keydown', keydownHandler);
            }
        };
        document.addEventListener('keydown', keydownHandler);
        if (this.modal.nestedContainer) {
            this.modal.nestedContainer._keydownHandler = keydownHandler;
        }
    }

    /**
     * 更新比较全部按钮状态
     */
    _updateCompareAllBtn() {
        const compareAllBtn = document.getElementById('conflict-compare-all');
        const bulkCheckbox = document.getElementById('conflict-bulk-checkbox');
        if (compareAllBtn && bulkCheckbox) {
            if (bulkCheckbox.checked) {
                compareAllBtn.style.opacity = '1';
                compareAllBtn.style.pointerEvents = 'auto';
            } else {
                compareAllBtn.style.opacity = '0.5';
                compareAllBtn.style.pointerEvents = 'none';
            }
        }
    }

    /**
     * 更新批量操作提示
     */
    _updateBulkHint() {
        const hint = document.getElementById('conflict-bulk-hint');
        const skipBtn = document.getElementById('conflict-skip');
        const overrideBtn = document.getElementById('conflict-override');
        const bulkCheckbox = document.getElementById('conflict-bulk-checkbox');

        if (!hint) return;

        if (bulkCheckbox?.checked && this.bulkAction === null) {
            hint.textContent = '请比较全部冲突';
            if (skipBtn) { skipBtn.disabled = true; skipBtn.style.opacity = '0.5'; skipBtn.style.pointerEvents = 'none'; }
            if (overrideBtn) { overrideBtn.disabled = true; overrideBtn.style.opacity = '0.5'; overrideBtn.style.pointerEvents = 'none'; }
        } else {
            hint.textContent = '';
            if (skipBtn) { skipBtn.disabled = false; skipBtn.style.opacity = '1'; skipBtn.style.pointerEvents = 'auto'; }
            if (overrideBtn) { overrideBtn.disabled = false; overrideBtn.style.opacity = '1'; overrideBtn.style.pointerEvents = 'auto'; }
        }
    }

    /**
     * 显示全部比较视图
     */
    _showCompareAll() {
        const allConflicts = this.conflicts.map((conflict, index) => {
            const newTag = this._generateCourseTag(conflict.newCourse, 'new');
            const conflictTags = conflict.conflictingCourses.map((c, i) =>
                this._generateCourseTag(c, 'conflict', i + 1)
            ).join('');

            return `
                <div class="compare-all-item" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        冲突 ${index + 1} / ${this.conflicts.length}
                    </div>
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 11px; font-weight: 600; color: var(--color-success); margin-bottom: 4px;">
                                <i data-lucide="plus-circle" style="width: 12px; height: 12px; display: inline-block;"></i> 要写入
                            </div>
                            ${newTag}
                        </div>
                        <div style="display: flex; align-items: center; padding-top: 16px; flex-shrink: 0;">
                            <i data-lucide="arrow-right" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 11px; font-weight: 600; color: var(--color-danger); margin-bottom: 4px;">
                                <i data-lucide="alert-circle" style="width: 12px; height: 12px; display: inline-block;"></i> 冲突课程
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${conflictTags}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const content = `
            <div class="conflict-compare-all-modal" style="max-width: 720px; width: 95vw; max-height: 80vh; display: flex; flex-direction: column;">
                <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <span style="font-weight: 700; font-size: 16px; color: var(--text-primary);">
                        全部冲突对比（${this.conflicts.length}节）
                    </span>
                    <button id="compare-all-close" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 4px;">
                        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="compare-all-scroll" style="flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 0;">
                    ${allConflicts}
                </div>
                <div style="padding: 12px 20px; border-top: 1px solid var(--border-color); flex-shrink: 0; display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="compare-all-skip-all" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 14px;">
                        全部跳过
                    </button>
                    <button id="compare-all-override-all" style="padding: 8px 20px; border-radius: 8px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 14px;">
                        全部覆盖
                    </button>
                </div>
            </div>
        `;

        this.modal[this.useNested ? 'showNested' : 'show'](content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                const closeBtn = document.getElementById('compare-all-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.modal.hideNested());
                }

                const skipAllBtn = document.getElementById('compare-all-skip-all');
                const overrideAllBtn = document.getElementById('compare-all-override-all');

                if (skipAllBtn) {
                    skipAllBtn.addEventListener('click', () => {
                        this.bulkAction = 'skip';
                        this.modal.hideNested();
                        this._updateBulkHint();
                        this._enableActionButtons();
                    });
                }
                if (overrideAllBtn) {
                    overrideAllBtn.addEventListener('click', () => {
                        this.bulkAction = 'override';
                        this.modal.hideNested();
                        this._updateBulkHint();
                        this._enableActionButtons();
                    });
                }
            }
        });
    }

    /**
     * 启用操作按钮
     */
    _enableActionButtons() {
        const skipBtn = document.getElementById('conflict-skip');
        const overrideBtn = document.getElementById('conflict-override');
        if (skipBtn) { skipBtn.disabled = false; skipBtn.style.opacity = '1'; skipBtn.style.pointerEvents = 'auto'; }
        if (overrideBtn) { overrideBtn.disabled = false; overrideBtn.style.opacity = '1'; overrideBtn.style.pointerEvents = 'auto'; }
    }

    /**
     * 处理操作（跳过或覆盖）
     */
    _handleAction(action) {
        const conflict = this.conflicts[this.currentIndex];
        this.results.push({ conflict, action });

        if (this.bulkAction !== null) {
            // 全部执行此操作模式：应用相同操作到所有剩余冲突
            const remaining = this.conflicts.slice(this.currentIndex + 1);
            remaining.forEach(c => {
                this.results.push({ conflict: c, action: this.bulkAction });
            });
            this._finish();
            return;
        }

        // 移到下一节冲突
        this.currentIndex++;
        if (this.currentIndex >= this.conflicts.length) {
            this._finish();
        } else {
            this._render();
        }
    }

    /**
     * 完成处理
     */
    _finish() {
        const skipped = [];
        const overridden = [];

        this.results.forEach(r => {
            if (r.action === 'skip') {
                skipped.push(r.conflict);
            } else {
                overridden.push(r.conflict);
            }
        });

        this.modal[this.useNested ? 'hideNested' : 'hide']();

        if (this.onResolve) {
            this.onResolve({ skipped, overridden });
        }
    }

    /**
     * 生成课程标签 HTML
     */
    _generateCourseTag(course, type, index) {
        if (!course) return '';

        const escapeHtml = (str) => registry.get('utils').escapeHtml(str) || '';
        const primaryColor = course.colors && course.colors[0] ? course.colors[0] : 'var(--color-secondary)';
        const studentNames = course.studentNames || [];
        const namesArray = Array.isArray(studentNames) ? studentNames : studentNames.split('、').filter(n => n);

        const studentTags = namesArray.map((name, i) => {
            const color = course.colors && course.colors[i] ? course.colors[i] : primaryColor;
            return `
                <span class="px-2 py-0.5 rounded text-xs font-medium"
                      style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">
                    ${escapeHtml(name)}
                </span>
            `;
        }).join('');

        const endTime = this._calculateEndTime(course.startTime, course.duration);
        const fee = course.fees?.[0] ?? 0;
        const feeText = fee > 0 ? `¥${fee}` : '';
        const dateText = course.date ? this._formatDate(course.date) : '';

        return `
            <div class="course-tag-item course-item rounded text-xs relative z-10"
                 style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent); min-width: 200px; max-width: 100%;">
                <div class="tag-content p-3">
                    <div class="flex flex-wrap gap-1" style="margin-bottom: 8px;">
                        ${studentTags}
                    </div>
                    <div>
                        <span style="color: var(--text-primary);">${escapeHtml(course.lessonType)}</span>
                        ${feeText ? `<span style="color: var(--text-primary); margin-left: 6px;">${feeText}</span>` : ''}
                    </div>
                    <div style="margin-top: 4px;">
                        <span style="color: var(--text-secondary);">${dateText || ''}</span>
                        <span style="color: var(--text-secondary); margin-left: 2px;">${dateText ? ' · ' : ''}${course.startTime} - ${endTime}</span>
                    </div>
                    ${course.note ? `<div class="text-[10px] truncate mt-1 ml-1" style="color: var(--text-secondary);">${escapeHtml(course.note)}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 计算结束时间
     */
    _calculateEndTime(startTime, duration) {
        if (!startTime) return '';
        const [h, m] = startTime.split(':').map(Number);
        const totalMins = h * 60 + m + (Number(duration) || 120);
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    /**
     * 格式化日期
     */
    _formatDate(date) {
        if (!date) return '';
        const parts = date.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
        }
        return date;
    }
}