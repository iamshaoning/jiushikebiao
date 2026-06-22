/**
 * 历史记录模态框
 *
 * @description 操作历史查看界面，支持撤销/重做、课程标签对比、展开详情、清空历史
 * @module historyModal
 */
import { registry } from '../../core/registry.js';
export class HistoryModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    async show() {
        let records;
        try {
            records = await registry.get('historyService').getHistory();
        } catch (error) {
            registry.get('errorHandlerService').log('error', '获取操作历史失败', error);
            records = [];
        }
        const formatTimestamp = (ts) => {
            const d = new Date(ts);
            return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        };

        const getActionIcon = (type) => {
            const map = { 'add-course':'plus','paste-courses':'clipboard','update-course':'square-pen','delete-course':'trash-2','delete-day-courses':'trash-2','restore-snapshot':'rotate-ccw','batch-add-courses':'plus','batch-paste-courses':'clipboard','batch-delete-courses':'trash-2','batch-delete-day-courses':'trash-2','delete-student':'user-x','batch-delete-students':'user-x' };
            return map[type] || 'circle';
        };

        const getActionColor = (type) => {
            const map = { 'add-course':'info','paste-courses':'warning','update-course':'success','delete-course':'danger','delete-day-courses':'danger','restore-snapshot':'info','batch-add-courses':'info','batch-paste-courses':'warning','batch-delete-courses':'danger','batch-delete-day-courses':'danger','delete-student':'danger','batch-delete-students':'danger' };
            return map[type] || 'secondary';
        };

        const generateExpandedCourses = (action) => {
            const courses = action.courses || (action.course ? [action.course] : []);
            if (courses.length <= 1) {
                return courses.map(c => registry.get('historyService').generateCourseTag(c, [], true)).join('');
            }
            return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">${courses.map(c => registry.get('historyService').generateCourseTag(c, [], true)).join('')}</div>`;
        };

        const generateHistoryHtml = () => {
            if (records.length === 0) return '<div class="text-center p-4" style="color: var(--text-secondary);">暂无操作记录</div>';
            return records.map((action, index) => {
                const bgColor = { success:'rgba(34,197,94,0.08)', warning:'rgba(245,158,11,0.08)', danger:'rgba(239,68,68,0.08)', info:'rgba(6,182,212,0.08)', secondary:'rgba(100,116,139,0.08)' }[getActionColor(action.type)] || 'var(--bg-tertiary)';
                const accentColor = { success:'var(--color-success)', warning:'var(--color-warning)', danger:'var(--color-danger)', info:'var(--color-info)', secondary:'var(--color-secondary)' }[getActionColor(action.type)] || 'var(--color-secondary)';
                const courseTag = (action.course || action.newCourse) ? registry.get('historyService').generateCourseTag(action.course || action.newCourse, action.changes || [], true) : '';
                const oldCourseTag = action.oldCourse ? registry.get('historyService').generateCourseTag(action.oldCourse, action.changes || [], true) : '';

                return `<div class="history-item ${action.undone ? 'history-item-undone' : ''}" data-id="${action.id}" style="position: relative; padding-left: 36px; padding-bottom: 20px;">
                    <div class="history-dot" style="position: absolute; left: 0; top: 4px; width: 20px; height: 20px; border-radius: 50%; background-color: ${bgColor}; border: 2px solid ${accentColor}; display: flex; align-items: center; justify-content: center; z-index: 1;">
                        <i data-lucide="${getActionIcon(action.type)}" class="inline-block" style="width: 12px; height: 12px; color: ${accentColor};"></i>
                    </div>
                    <div class="history-line" style="position: absolute; left: 9px; top: 24px; bottom: 0; width: 2px; background-color: var(--border-color); ${index === records.length - 1 ? 'display: none;' : ''}"></div>
                    <div class="history-content" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; ${action.undone ? 'opacity: 0.6;' : ''}">
                        <div class="history-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px;">
                            <div class="history-description" style="font-weight: 600; font-size: 13px; color: var(--text-primary); ${action.undone ? 'text-decoration: line-through;' : ''}">${action.description}</div>
                            <div class="history-time" style="font-size: 11px; color: var(--text-secondary); white-space: nowrap; background-color: var(--bg-tertiary); padding: 2px 8px; border-radius: 10px; flex-shrink: 0;">${formatTimestamp(action.timestamp)}</div>
                        </div>
                        ${action.type === 'update-course' && oldCourseTag && courseTag ? `<div class="history-course-compare" style="margin-top: 8px; display: flex; align-items: flex-start; gap: 6px;"><div style="flex: 1; min-width: 0;"><div style="font-size: 10px; color: var(--color-danger); margin-bottom: 2px;">修改前</div>${oldCourseTag}</div><div style="display: flex; align-items: center; padding-top: 45px; flex-shrink: 0;"><i data-lucide="arrow-right" class="inline-block" style="width: 14px; height: 14px; color: var(--text-secondary);"></i></div><div style="flex: 1; min-width: 0;"><div style="font-size: 10px; color: var(--color-success); margin-bottom: 2px;">修改后</div>${courseTag}</div></div>` : ''}
                        ${action.type === 'add-course' && courseTag ? `<div class="history-course-tag" style="margin-top: 8px;">${courseTag}</div>` : ''}
                        ${action.type === 'delete-course' && courseTag ? `<div class="history-course-tag" style="margin-top: 8px; opacity: 0.7;">${courseTag}</div>` : ''}
                        ${(action.type === 'delete-student' || action.type === 'batch-delete-students') ? `<div class="history-student-info" style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);"><div>${action.deletedCourses ? `联动删除 ${action.deletedCourses.length} 节课程` : ''}</div>${action.deletedCourses && action.deletedCourses.length > 0 ? `<div class="history-expand-container" style="margin-top: 6px;"><button data-action="toggle-history-expand" data-id="${action.id}" class="history-expand-btn" style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-primary); cursor: pointer; background: none; border: none; padding: 4px 8px; border-radius: 6px; transition: background-color 0.2s;"><i data-lucide="${action.expanded ? 'chevron-down' : 'chevron-right'}" class="inline-block" style="width: 14px; height: 14px;"></i><span>${action.expanded ? '收起详情' : '展开详情'}</span></button><div class="history-expanded-content" data-expanded="${action.expanded ? '1' : '0'}" style="${action.expanded ? '' : 'display: none;'} margin-top: 8px;">${action.deletedCourses.length > 1 ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">${action.deletedCourses.map(c => registry.get('historyService').generateCourseTag(c, [], true)).join('')}</div>` : action.deletedCourses.map(c => registry.get('historyService').generateCourseTag(c, [], true)).join('')}</div></div>` : ''}</div>` : ''}
                        ${action.courses && action.courses.length > 1 && action.expanded !== undefined ? `<div class="history-expand-container" style="margin-top: 8px;"><button data-action="toggle-history-expand" data-id="${action.id}" class="history-expand-btn" style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-primary); cursor: pointer; background: none; border: none; padding: 4px 8px; border-radius: 6px; transition: background-color 0.2s;"><i data-lucide="${action.expanded ? 'chevron-down' : 'chevron-right'}" class="inline-block" style="width: 14px; height: 14px;"></i><span>${action.expanded ? '收起详情' : '展开详情'}</span></button><div class="history-expanded-content" data-expanded="${action.expanded ? '1' : '0'}" style="${action.expanded ? '' : 'display: none;'} margin-top: 8px;">${generateExpandedCourses(action)}</div></div>` : action.courses && action.courses.length === 1 && action.expanded !== undefined ? `<div class="history-expand-container" style="margin-top: 8px;">${generateExpandedCourses(action)}</div>` : ''}
                        <div class="history-actions" style="display: flex; gap: 6px; margin-top: 8px;">${action.undone ? `<button data-action="redo-history-action" data-id="${action.id}" class="history-action-btn" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; font-weight: 500; border-radius: 6px; cursor: pointer; background-color: rgba(34,197,94,0.1); color: var(--color-success); border: none;"><i data-lucide="rotate-ccw" class="inline-block" style="width: 14px; height: 14px;"></i>重做</button>` : `<button data-action="undo-history-action" data-id="${action.id}" class="history-action-btn" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; font-weight: 500; border-radius: 6px; cursor: pointer; background-color: rgba(59,130,246,0.1); color: var(--color-primary); border: none;"><i data-lucide="undo-2" class="inline-block" style="width: 14px; height: 14px;"></i>撤销</button>`}</div>
                    </div>
                </div>`;
            }).join('');
        };

        const content = `<div class="rounded-lg shadow-xl w-full max-w-lg mx-4" style="background-color: var(--bg-secondary);"><div class="p-4"><div class="flex justify-between items-center mb-4"><div><h3 class="text-base font-semibold" style="color: var(--text-primary); display: flex; align-items: center; gap: 6px;"><i data-lucide="history" class="inline-block" style="width: 18px; height: 18px;"></i>操作历史</h3><p class="text-xs" style="color: var(--text-secondary); margin-top: 2px;">最多保存 ${registry.get('historyService').maxRecords}条记录</p></div><button id="clear-history-btn" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; font-weight: 500; border-radius: 6px; cursor: pointer; background-color: rgba(239,68,68,0.1); color: var(--color-danger); border: none;"><i data-lucide="trash" class="inline-block" style="width: 14px; height: 14px;"></i>清空历史</button></div><div id="history-container" class="max-h-[45vh] overflow-y-auto" style="padding-right: 4px;">${generateHistoryHtml()}</div></div></div>`;

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                const undoBtns = document.querySelectorAll('[data-action="undo-history-action"]');
                undoBtns.forEach(btn => btn.addEventListener('click', async () => {
                    try {
                    const id = btn.dataset.id;
                    const success = await registry.get('historyService').undoAction(id);
                    if (success) {
                        registry.get('utils').refreshAllViews(true);
                        // 重新渲染历史模态框，让用户看到撤销后的状态变化
                        await this.show();
                        registry.get('notificationService').show('操作已撤销', 'success');
                        await registry.get('utils').saveData();
                    } else {
                        registry.get('notificationService').show('撤销失败', 'error');
                    }
                    } catch (error) { registry.get('errorHandlerService').log('error', '撤销操作失败', error); registry.get('notificationService').show('撤销操作失败', 'error'); }
                }));

                const redoBtns = document.querySelectorAll('[data-action="redo-history-action"]');
                redoBtns.forEach(btn => btn.addEventListener('click', async () => {
                    try {
                    const id = btn.dataset.id;
                    const success = await registry.get('historyService').redoAction(id);
                    if (success) {
                        registry.get('utils').refreshAllViews(true);
                        // 重新渲染历史模态框，让用户看到重做后的状态变化
                        await this.show();
                        registry.get('notificationService').show('操作已重做', 'success');
                        await registry.get('utils').saveData();
                    } else {
                        registry.get('notificationService').show('重做失败', 'error');
                    }
                    } catch (error) { registry.get('errorHandlerService').log('error', '重做操作失败', error); registry.get('notificationService').show('重做操作失败', 'error'); }
                }));

                const expandBtns = document.querySelectorAll('[data-action="toggle-history-expand"]');
                expandBtns.forEach(btn => btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const id = btn.dataset.id;
                        await registry.get('historyService').toggleExpand(id);
                        const container = btn.closest('.history-expand-container');
                        if (!container) return;
                        const content = container.querySelector('.history-expanded-content');
                        const icon = btn.querySelector('[data-lucide]');
                        const textSpan = btn.querySelector('span');
                        if (!content || !icon) return;
                        const isExpanded = content.dataset.expanded === '1';
                        if (isExpanded) {
                            content.style.display = 'none';
                            content.dataset.expanded = '0';
                            icon.setAttribute('data-lucide', 'chevron-right');
                            if (textSpan) textSpan.textContent = '展开详情';
                        } else {
                            content.style.display = '';
                            content.dataset.expanded = '1';
                            icon.setAttribute('data-lucide', 'chevron-down');
                            if (textSpan) textSpan.textContent = '收起详情';
                        }
                        if (registry.get('lucide')) {
                            registry.get('lucide').createIcons();
                        }
                    } catch (error) {
                        registry.get('errorHandlerService').log('error', '操作历史展开失败', error);
                    }
                }));

                const clearBtn = document.getElementById('clear-history-btn');
                if (clearBtn) clearBtn.addEventListener('click', () => {
                    this.modal.showConfirm('确定要清空所有操作历史吗？', async () => {
                        try {
                            await registry.get('historyService').clearHistory();
                            registry.get('notificationService').show('历史已清空', 'success');
                        } catch (error) {
                            registry.get('errorHandlerService').log('error', '清空历史失败', error);
                            registry.get('notificationService').show('清空历史失败', 'error');
                        }
                        this.modal.hide();
                    }, 'delete');
                });
            }
        });
    }
}
