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
     * 渲染单节冲突视图（横向对比）
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
        const conflictTags = conflictingCourses.map((c) => this._generateCourseTag(c)).join('');

        const content = `
            <div class="conflict-modal">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-primary);">时间冲突处理</span>
                    ${total > 1 ? `<span style="font-size: 12px; color: var(--text-secondary);">${current}/${total}</span>` : ''}
                    <span style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">还有 ${total - this.results.length} 节冲突需处理</span>
                </div>

                <div style="padding: 10px 16px; display: flex; gap: 6px; align-items: flex-start; overflow: hidden;">
                    <div style="flex: 1; min-width: 0; width: 0;">
                        <div style="font-size: 11px; font-weight: 600; color: var(--color-success); margin-bottom: 4px; white-space: nowrap;">要写入的课程</div>
                        <div style="overflow: hidden;">${newTag}</div>
                    </div>
                    <div style="display: flex; align-items: center; flex-shrink: 0; padding-top: 45px;">
                        <i data-lucide="arrow-right" style="width: 14px; height: 14px; color: var(--text-secondary); flex-shrink: 0;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0; width: 0;">
                        <div style="font-size: 11px; font-weight: 600; color: var(--color-danger); margin-bottom: 4px; white-space: nowrap;">冲突课程</div>
                        <div class="conflict-list" style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">${conflictTags}</div>
                    </div>
                </div>

                <div style="padding: 8px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    ${total > 1 ? this._renderBulkLabel() : '<span></span>'}
                    <div style="display: flex; gap: 10px;">
                        <button id="conflict-skip" style="padding: 6px 18px; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px;">跳过</button>
                        <button id="conflict-override" style="padding: 6px 18px; border-radius: 6px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 13px;">覆盖</button>
                    </div>
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
     * 渲染全部冲突视图（统一处理模式，横向对比）
     */
    _renderAll() {
        const allItems = this.conflicts.map((conflict, index) => {
            const newTag = this._generateCourseTag(conflict.newCourse);
            const conflictTags = conflict.conflictingCourses.map((c) => this._generateCourseTag(c)).join('');

            return `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                    <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">冲突 ${index + 1} / ${this.conflicts.length}</div>
                    <div style="display: flex; gap: 6px; align-items: flex-start; overflow: hidden;">
                        <div style="flex: 1; min-width: 0; width: 0;">
                            <div style="font-size: 10px; font-weight: 600; color: var(--color-success); margin-bottom: 2px; white-space: nowrap;">要写入</div>
                            <div style="overflow: hidden;">${newTag}</div>
                        </div>
                        <div style="display: flex; align-items: center; flex-shrink: 0; padding-top: 45px;">
                            <i data-lucide="arrow-right" style="width: 12px; height: 12px; color: var(--text-secondary);"></i>
                        </div>
                        <div style="flex: 1; min-width: 0; width: 0;">
                            <div style="font-size: 10px; font-weight: 600; color: var(--color-danger); margin-bottom: 2px; white-space: nowrap;">冲突课程</div>
                            <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">${conflictTags}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const content = `
            <div class="conflict-modal" style="display: flex; flex-direction: column; max-height: 80vh;">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-primary);">时间冲突处理（统一处理）</span>
                    <span style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">还有 ${this.conflicts.length} 节冲突需处理</span>
                </div>
                <div id="conflict-all-scroll" class="scroll-fade-bottom" style="flex: 1; overflow-y: auto; padding: 12px 16px 0; min-height: 0;">
                    <div id="conflict-all-scroll-inner" style="padding-bottom: 12px;">${allItems}</div>
                </div>
                <div style="padding: 8px 16px; border-top: 1px solid var(--border-color); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-primary);">
                        <input type="checkbox" id="conflict-bulk-checkbox" checked style="accent-color: var(--color-primary);"> 统一处理
                    </label>
                    <div style="display: flex; gap: 10px;">
                        <button id="conflict-skip" style="padding: 6px 18px; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px;">全部跳过</button>
                        <button id="conflict-override" style="padding: 6px 18px; border-radius: 6px; border: none; background-color: var(--color-danger); color: #fff; cursor: pointer; font-size: 13px;">全部覆盖</button>
                    </div>
                </div>
            </div>
        `;

        this.modal[this.useNested ? 'showNested' : 'show'](content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();
                this._bindEvents();
                this._setupScrollFade();
            }
        });
    }

    /**
     * 设置滚动渐变遮罩
     */
    _setupScrollFade() {
        const scrollEl = document.getElementById('conflict-all-scroll');
        if (!scrollEl) return;

        const checkScroll = () => {
            const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;
            scrollEl.classList.toggle('scrolled-to-bottom', atBottom);
        };

        scrollEl.addEventListener('scroll', checkScroll);
        checkScroll();
    }

    /**
     * 渲染批量操作控件
     */
    _renderBulkLabel() {
        return `
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-primary);">
                <input type="checkbox" id="conflict-bulk-checkbox" style="accent-color: var(--color-primary);"> 统一处理
            </label>
        `;
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        const skipBtn = document.getElementById('conflict-skip');
        const overrideBtn = document.getElementById('conflict-override');
        const bulkCheckbox = document.getElementById('conflict-bulk-checkbox');

        if (skipBtn) skipBtn.addEventListener('click', () => this._handleAction('skip'));
        if (overrideBtn) overrideBtn.addEventListener('click', () => this._handleAction('override'));
        if (bulkCheckbox) {
            bulkCheckbox.addEventListener('change', (e) => {
                this.showAll = e.target.checked;
                this._render();
            });
        }

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

    _handleAction(action) {
        if (this.showAll) {
            this.conflicts.forEach(c => this.results.push({ conflict: c, action }));
            this._finish();
            return;
        }
        this.results.push({ conflict: this.conflicts[this.currentIndex], action });
        this.currentIndex++;
        if (this.currentIndex >= this.conflicts.length) {
            this._finish();
        } else {
            this._render();
        }
    }

    _resolveAllSkipped() {
        if (this.results.length > 0) return;
        for (let i = this.currentIndex; i < this.conflicts.length; i++) {
            this.results.push({ conflict: this.conflicts[i], action: 'skip' });
        }
        this._finish();
    }

    _finish() {
        const skipped = [];
        const overridden = [];
        this.results.forEach(r => {
            if (r.action === 'skip') skipped.push(r.conflict);
            else overridden.push(r.conflict);
        });
        this.modal[this.useNested ? 'hideNested' : 'hide']();
        if (this.onResolve) this.onResolve({ skipped, overridden });
    }

    /**
     * 生成紧凑课程标签（适配两列横向布局）
     */
    _generateCourseTag(course) {
        if (!course) return '';

        const h = (str) => registry.get('utils').escapeHtml(str) || '';
        const primaryColor = course.colors?.[0] || 'var(--color-secondary)';
        const namesArray = Array.isArray(course.studentNames) ? course.studentNames : (course.studentNames || '').split('、').filter(n => n);

        const studentTags = namesArray.map((name, i) => {
            const color = course.colors?.[i] || primaryColor;
            return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:500;background-color:color-mix(in srgb,${color} 20%,transparent);color:${color};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;">${h(name)}</span>`;
        }).join('');

        const endTime = this._calcEnd(course.startTime, course.duration);
        const fee = course.fees?.[0] ?? 0;
        const feeText = fee > 0 ? `¥${fee}` : '';
        const dateText = course.date ? this._fmtDate(course.date) : '';

        return `
            <div style="--c:${primaryColor};background-color:color-mix(in srgb,${primaryColor} 10%,transparent);border-radius:6px;max-width:100%;width:100%;overflow:hidden;">
                <div style="padding:5px 7px;overflow:hidden;">
                    <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:3px;overflow:hidden;">${studentTags}</div>
                    <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">
                        <span style="color:var(--text-primary);">${h(course.lessonType)}</span>
                        ${feeText ? `<span style="color:var(--text-primary);margin-left:4px;">${feeText}</span>` : ''}
                    </div>
                    <div style="margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--text-secondary);">
                        ${dateText}${dateText&&course.startTime?' · ':''}${course.startTime} - ${endTime}
                    </div>
                    ${course.note ? `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--text-secondary);margin-top:1px;">${h(course.note)}</div>` : ''}
                </div>
            </div>`;
    }

    _calcEnd(startTime, duration) {
        if (!startTime) return '';
        const [h, m] = startTime.split(':').map(Number);
        const t = h * 60 + m + (Number(duration) || 120);
        return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    }

    _fmtDate(date) {
        if (!date) return '';
        const p = date.split('-');
        return p.length === 3 ? `${parseInt(p[1])}月${parseInt(p[2])}日` : date;
    }
}