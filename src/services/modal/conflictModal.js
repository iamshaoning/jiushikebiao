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
        this.onResolve = null;
        this.isSingleAdd = false;
        this.showAll = false;
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
        this.onResolve = options.onResolve || null;
        this.isSingleAdd = options.isSingleAdd || false;
        this.useNested = options.useNested !== undefined ? options.useNested : true;
        this.showAll = false;

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

        if (this.showAll && total > 1) {
            this._renderAll();
            return;
        }

        const current = this.currentIndex + 1;
        const conflict = this.conflicts[this.currentIndex];
        const newCourse = conflict.newCourse;
        const conflictingCourses = conflict.conflictingCourses;

        const newTag = this._generateCourseTag(newCourse);
        const conflictTags = conflictingCourses.map((c) =>
            this._generateCourseTag(c)
        ).join('');

        const content = `
            <div class="conflict-modal">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-primary);">时间冲突处理</span>
                    ${total > 1 ? `<span style="font-size: 12px; color: var(--text-secondary);">${current}/${total}</span>` : ''}
                    <span style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">${total - this.results.length} 节冲突</span>
                </div>

                <div style="padding: 10px 16px; overflow: hidden;">
                    <div style="font-size: 11px; font-weight: 600; color: var(--color-success); margin-bottom: 4px;">要写入的课程</div>
                    <div style="overflow: hidden;">${newTag}</div>
                    <div style="display: flex; justify-content: center; padding: 4px 0;">
                        <i data-lucide="arrow-down" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: var(--color-danger); margin-bottom: 4px;">冲突课程（${conflictingCourses.length}节）</div>
                    <div class="conflict-list" style="display: flex; flex-direction: column; gap: 6px; overflow: hidden;">${conflictTags}</div>
                </div>

                ${total > 1 ? this._renderBulkControls() : ''}

                <div style="padding: 10px 16px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="conflict-skip" class="conflict-btn-skip" style="padding: 6px 18px; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px;">跳过</button>
                    <button id="conflict-override" class="conflict-btn-override" style="padding: 6px 18px; border-radius: 6px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 13px;">覆盖</button>
                </div>
            </div>
        `;

        this.modal[this.useNested ? 'showNested' : 'show'](content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                this._bindEvents();
            }
        });
    }

    /**
     * 渲染全部冲突视图（统一处理模式）
     */
    _renderAll() {
        const allItems = this.conflicts.map((conflict, index) => {
            const newTag = this._generateCourseTag(conflict.newCourse);
            const conflictTags = conflict.conflictingCourses.map((c) =>
                this._generateCourseTag(c)
            ).join('');

            return `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                    <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">冲突 ${index + 1} / ${this.conflicts.length}</div>
                    <div style="font-size: 11px; font-weight: 600; color: var(--color-success); margin-bottom: 2px;">要写入</div>
                    <div style="overflow: hidden; margin-bottom: 4px;">${newTag}</div>
                    <div style="display: flex; justify-content: center; padding: 2px 0;">
                        <i data-lucide="arrow-down" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: var(--color-danger); margin-bottom: 2px;">冲突课程</div>
                    <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">${conflictTags}</div>
                </div>
            `;
        }).join('');

        const content = `
            <div class="conflict-modal" style="display: flex; flex-direction: column; max-height: 80vh;">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-primary);">时间冲突处理（统一处理）</span>
                    <span style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">${this.conflicts.length} 节冲突</span>
                </div>
                <div id="conflict-all-scroll" class="scroll-fade-bottom" style="flex: 1; overflow-y: auto; padding: 12px 16px; min-height: 0;">
                    <div id="conflict-all-scroll-inner">${allItems}</div>
                </div>
                <div style="padding: 0 16px 6px; display: flex; align-items: center; flex-shrink: 0;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-primary);">
                        <input type="checkbox" id="conflict-bulk-checkbox" checked style="accent-color: var(--color-primary);"> 统一处理
                    </label>
                </div>
                <div style="padding: 10px 16px; border-top: 1px solid var(--border-color); flex-shrink: 0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="conflict-skip" class="conflict-btn-skip" style="padding: 6px 18px; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px;">全部跳过</button>
                    <button id="conflict-override" class="conflict-btn-override" style="padding: 6px 18px; border-radius: 6px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 13px;">全部覆盖</button>
                </div>
            </div>
        `;

        this.modal[this.useNested ? 'showNested' : 'show'](content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                this._bindEvents();
                // 滚动渐变遮罩
                const scrollEl = document.getElementById('conflict-all-scroll');
                if (scrollEl) {
                    const checkScroll = () => {
                        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;
                        scrollEl.classList.toggle('scrolled-to-bottom', atBottom);
                    };
                    scrollEl.addEventListener('scroll', checkScroll);
                    checkScroll();
                }
            }
        });
    }

    /**
     * 渲染批量操作控件
     */
    _renderBulkControls() {
        return `
            <div class="conflict-bulk-controls" style="padding: 0 16px 6px; display: flex; align-items: center;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-primary);">
                    <input type="checkbox" id="conflict-bulk-checkbox" style="accent-color: var(--color-primary);"> 统一处理
                </label>
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

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this._handleAction('skip'));
        }
        if (overrideBtn) {
            overrideBtn.addEventListener('click', () => this._handleAction('override'));
        }
        if (bulkCheckbox) {
            bulkCheckbox.addEventListener('change', (e) => {
                this.showAll = e.target.checked;
                this._render();
            });
        }

        // 关闭时（Escape/点击遮罩）视为全部跳过
        const container = this.modal[this.useNested ? 'nestedContainer' : 'container'];
        if (container && this.useNested) {
            const origOnClick = container.onclick;
            container.onclick = (e) => {
                if (e.target === container) {
                    container.onclick = origOnClick;
                    this._resolveAllSkipped();
                }
            };
        }

        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', keydownHandler);
                this._resolveAllSkipped();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        if (this.modal.nestedContainer) {
            this.modal.nestedContainer._keydownHandler = keydownHandler;
        }
    }

    /**
     * 处理操作（跳过或覆盖）
     */
    _handleAction(action) {
        if (this.showAll) {
            // 统一处理模式：全部执行相同操作
            this.conflicts.forEach(c => {
                this.results.push({ conflict: c, action });
            });
            this._finish();
            return;
        }

        const conflict = this.conflicts[this.currentIndex];
        this.results.push({ conflict, action });

        this.currentIndex++;
        if (this.currentIndex >= this.conflicts.length) {
            this._finish();
        } else {
            this._render();
        }
    }

    /**
     * 关闭时全部跳过
     */
    _resolveAllSkipped() {
        if (this.results.length > 0) return; // 已经有结果了，不重复处理
        // 把所有未处理的冲突标记为跳过
        for (let i = this.currentIndex; i < this.conflicts.length; i++) {
            this.results.push({ conflict: this.conflicts[i], action: 'skip' });
        }
        this._finish();
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
    _generateCourseTag(course) {
        if (!course) return '';

        const escapeHtml = (str) => registry.get('utils').escapeHtml(str) || '';
        const primaryColor = course.colors && course.colors[0] ? course.colors[0] : 'var(--color-secondary)';
        const studentNames = course.studentNames || [];
        const namesArray = Array.isArray(studentNames) ? studentNames : studentNames.split('、').filter(n => n);

        const studentTags = namesArray.map((name, i) => {
            const color = course.colors && course.colors[i] ? course.colors[i] : primaryColor;
            return `
                <span class="px-1.5 py-0.5 rounded text-xs font-medium inline-block"
                      style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color}; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;">
                    ${escapeHtml(name)}
                </span>
            `;
        }).join('');

        const endTime = this._calculateEndTime(course.startTime, course.duration);
        const fee = course.fees?.[0] ?? 0;
        const feeText = fee > 0 ? `¥${fee}` : '';
        const dateText = course.date ? this._formatDate(course.date) : '';

        return `
            <div class="course-tag-item course-item rounded text-xs relative"
                 style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent); max-width: 100%; width: 100%;">
                <div class="tag-content" style="padding: 8px; overflow: hidden;">
                    <div class="flex flex-wrap gap-1" style="margin-bottom: 6px; overflow: hidden;">
                        ${studentTags}
                    </div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span style="color: var(--text-primary);">${escapeHtml(course.lessonType)}</span>
                        ${feeText ? `<span style="color: var(--text-primary); margin-left: 6px;">${feeText}</span>` : ''}
                    </div>
                    <div style="margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span style="color: var(--text-secondary);">${dateText || ''}</span>
                        <span style="color: var(--text-secondary); margin-left: 2px;">${dateText ? ' · ' : ''}${course.startTime} - ${endTime}</span>
                    </div>
                    ${course.note ? `<div class="text-[10px] truncate mt-1" style="color: var(--text-secondary);">${escapeHtml(course.note)}</div>` : ''}
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