/**
 * FAB（浮动操作栏）按钮渲染服务
 *
 * @description 负责渲染和管理浮动操作栏中的按钮，包括单个/批量课程和日期格的操作按钮
 * @module fabHandlerService
 */
import { registry } from '../core/registry.js';

class FabHandlerService {
    constructor() {}

    /**
     * 返回事件处理器对象（此服务主要负责渲染，暂无独立事件）
     */
    setup() {
        return {};
    }

    /**
     * 根据选中元素数量更新浮动操作栏
     * @param {'course'|'cell'} type
     */
    _updateSelectedFab(type) {
        const isCourse = type === 'course';
        const sel = isCourse
            ? document.querySelectorAll('.course-tag-item.is-selected')
            : document.querySelectorAll('.calendar-cell-selected');
        const fab = document.getElementById('floating-action-bar');
        const fabContent = document.getElementById('floating-action-bar-content');
        if (!fab || !fabContent) return;

        const prevType = fabContent.dataset.type;
        const isCrossType = prevType && prevType !== type;

        const applyUpdate = () => {
            if (sel.length === 0) {
                registry.get('modalService').closeAllPopovers();
                return;
            }
            if (sel.length === 1) {
                const id = isCourse
                    ? (sel[0].dataset.courseId || sel[0].closest('[data-course-id]')?.dataset.courseId)
                    : sel[0].dataset.date;
                if (id) {
                    fabContent.innerHTML = isCourse
                        ? this._renderCourseActionButtons(registry.get('utils').escapeHtml(id))
                        : this._renderCellActionButtons(registry.get('utils').escapeHtml(id));
                }
            } else {
                const ids = Array.from(sel).map(el =>
                    isCourse
                        ? (el.dataset.courseId || el.closest('[data-course-id]')?.dataset.courseId)
                        : el.dataset.date
                ).filter(Boolean);
                if (ids.length) {
                    fabContent.innerHTML = isCourse
                        ? this._renderMultiCourseActionButtons(ids)
                        : this._renderMultiCellActionButtons(ids);
                }
            }
            fabContent.dataset.type = type;
            fab.classList.add('active');
            if (registry.get('lucide')) registry.get('lucide').createIcons();
        };

        // 跨类型切换时延迟执行，避免动画冲突
        if (isCrossType) {
            setTimeout(applyUpdate, 180);
        } else {
            applyUpdate();
        }
    }

    _renderCellActionButtons(escapedDate) {
        return `<div data-action="add-course" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="plus" class="pointer-events-none inline-block"></i>添加</div><div data-action="copy-date" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-success)"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="paste-to-date" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-warning)"><i data-lucide="clipboard" class="pointer-events-none inline-block"></i>粘贴</div><div data-action="delete-date-courses" data-date="${escapedDate}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>删除</div>`;
    }

    _renderMultiCellActionButtons(dates) {
        const datesAttr = dates.map(d => registry.get('utils').escapeHtml(d)).join(',');
        return `<div data-action="add-course-multi" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="plus" class="pointer-events-none inline-block"></i>批量添加</div><div data-action="copy-date" data-date="" class="fab-btn" style="background-color:var(--color-success);opacity:0.5;pointer-events:none"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="paste-to-dates" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-warning)"><i data-lucide="clipboard" class="pointer-events-none inline-block"></i>批量粘贴</div><div data-action="delete-date-courses-multi" data-dates="${datesAttr}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>批量删除</div>`;
    }

    _renderCourseActionButtons(escapedCourseId) {
        return `<div data-action="edit-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-primary)"><i data-lucide="square-pen" class="pointer-events-none inline-block"></i>编辑</div><div data-action="copy-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-success)"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="delete-course" data-id="${escapedCourseId}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>删除</div>`;
    }

    _renderMultiCourseActionButtons(courseIds) {
        const idsAttr = courseIds.map(id => registry.get('utils').escapeHtml(id)).join(',');
        return `<div data-action="edit-course" data-id="" class="fab-btn" style="background-color:var(--color-primary);opacity:0.5;pointer-events:none"><i data-lucide="square-pen" class="pointer-events-none inline-block"></i>编辑</div><div data-action="copy-course" data-id="" class="fab-btn" style="background-color:var(--color-success);opacity:0.5;pointer-events:none"><i data-lucide="copy" class="pointer-events-none inline-block"></i>复制</div><div data-action="delete-courses-multi" data-ids="${idsAttr}" class="fab-btn" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="pointer-events-none inline-block"></i>批量删除</div>`;
    }
}

export default FabHandlerService;