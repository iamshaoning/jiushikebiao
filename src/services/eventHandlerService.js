/**
 * 事件处理服务
 *
 * @description 注册并管理所有业务事件处理器（学生/机构/年级/日历/UI 交互），由 eventDispatcherService 调起
 * @module eventHandlerService
 */
import { registry } from '../core/registry.js';
import FabHandlerService from './fabHandlerService.js';
import CourseEventHandlerService from './courseEventHandlerService.js';

class EventHandlerService {
    constructor() {
        this.handlers = {};
        this._isSaving = false;
        this._fabHandlerService = new FabHandlerService();
        this._courseEventHandlerService = new CourseEventHandlerService();
        this.initHandlers();
    }

    initHandlers() {
        this.handlers = {};
        Object.assign(this.handlers,
            this._setupStudentHandlers(),
            this._courseEventHandlerService.setup(),
            this._setupAuthHandlers(),
            this._setupCalendarHandlers(),
            this._setupUIHandlers(),
            this._setupOrgGradeHandlers(),
            this._fabHandlerService.setup()
        );
    }

    _setupStudentHandlers() { return {
        'edit-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) registry.get('modalService').showEditStudent(s); },
        'delete-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) { const rc = registry.get('state').courses.filter(c => Array.isArray(c.studentIds) && c.studentIds.includes(s.id)); registry.get('modalService').showConfirm(`删除学生 <strong>${registry.get('utils').escapeHtml(s.name)}</strong> 后，相关的${rc.length}节课也将全部删除`, async () => { registry.get('historyService').recordDeleteStudent(s, rc); const deleteIds = new Set(rc.map(r => r.id)); registry.get('setState')(d => { d.courses = d.courses.filter(c => !deleteIds.has(c.id)); d.students = d.students.filter(st => st.id !== s.id); }, ['students', 'courses']); await registry.get('utils').saveData(); registry.get('notificationService').show('学生删除成功', 'success'); }, 'delete'); } },
        'add-student-main': () => { registry.get('modalService').showAddStudent(); },
         'student-row-ctrl-click': (payload) => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const sid = payload.studentId;
            const rows = document.querySelectorAll(`[data-student-id="${CSS.escape(sid)}"]`);
            // 优先选择可见元素（多列/单列切换时隐藏的旧元素仍留在 DOM 中）
            let row = null;
            for (const r of rows) {
                if (r.offsetParent !== null) { row = r; break; }
            }
            if (!row) row = rows[0];
            if (!row) return;
            if (ed._selectedStudentIds.has(sid)) {
                ed._selectedStudentIds.delete(sid);
                row.classList.remove('student-selected');
            } else {
                ed._selectedStudentIds.add(sid);
                row.classList.add('student-selected');
            }
            ed._updateStudentMultiSelectUI();
        },
        'students-multi-delete': () => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const selectedIds = ed.getSelectedStudentIds();
            if (!selectedIds.length) return;
            const state = registry.get('state');
            const affectedStudents = state.students.filter(s => selectedIds.includes(s.id));
            const affectedCourses = state.courses.filter(c => Array.isArray(c.studentIds) && c.studentIds.some(sid => selectedIds.includes(sid)));
            registry.get('modalService').showConfirm(
                `删除 <strong>${selectedIds.length}</strong> 位学生后，相关的 <strong>${affectedCourses.length}</strong> 节课也将全部删除。`,
                async () => {
                    registry.get('historyService').recordBatchDeleteStudents(affectedStudents, affectedCourses);
                    const deleteCourseIds = new Set(affectedCourses.map(c => c.id));
                    const deleteStudentIds = new Set(selectedIds);
                    registry.get('setState')(d => {
                        d.courses = d.courses.filter(c => !deleteCourseIds.has(c.id));
                        d.students = d.students.filter(st => !deleteStudentIds.has(st.id));
                    }, ['students', 'courses']);
                    ed.clearAllStudentSelections();
                    await registry.get('utils').saveData();
                    registry.get('notificationService').show(`已删除 ${selectedIds.length} 位学生`, 'success');
                },
                'delete'
            );
        },
        'students-multi-cancel': () => {
            const ed = registry.get('eventDispatcherService');
            if (ed) ed.clearAllStudentSelections();
        },
        'students-multi-edit': () => {
            const ed = registry.get('eventDispatcherService');
            if (!ed) return;
            const selectedIds = ed.getSelectedStudentIds();
            if (!selectedIds.length) return;
            registry.get('modalService').studentForm.showBatchEditStudents(Array.from(selectedIds));
        },
    };}

    /** 渲染机构/年级列表项HTML */
    _renderOrgGradeItem(item, itemName, ct) {
        const bc = registry.get('utils').generateColor(item, ct);
        const esc = registry.get('utils').escapeHtml(item);
        return `<div class="flex items-center justify-between p-2 rounded" style="background-color:var(--bg-secondary);" data-${itemName}="${esc}">
            <button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color:color-mix(in srgb,${bc} 20%,transparent);color:${bc};" data-item="${esc}" data-item-name="${itemName}" data-color="${bc}">${esc}</button>
            <div class="flex items-center">
                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${esc}">
                    <i data-lucide="square-pen" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-success)"></i>
                </button>
                <button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${esc}">
                    <i data-lucide="trash-2" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-danger)"></i>
                </button>
            </div>
        </div>`;
    }

    _setupAuthHandlers() { return {
        'show-login': () => { registry.get('authUIService').showAuthModal(); },
        'show-register': () => { registry.get('authUIService').showAuthModal(); const rt = document.getElementById('register-tab'); if (rt) rt.click(); },
        'logout': () => { registry.get('authUIService').logout(); },
        'navigate-home': () => { registry.get('router').navigate('/'); },
    };}

    _setupCalendarHandlers() { return {
        'prev-month': () => { const d = registry.get('state').currentDate; registry.get('state').currentDate = new Date(d.getFullYear(), d.getMonth() - 1, 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'next-month': () => { const d = registry.get('state').currentDate; registry.get('state').currentDate = new Date(d.getFullYear(), d.getMonth() + 1, 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'toggle-privacy': () => {
            const state = registry.get('state');
            state.privacyMode = !state.privacyMode;
            const btn = document.getElementById('toggle-privacy');
            if (btn) {
                if (state.privacyMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
            registry.get('render').calendar();
        },
        'calendar-cell-click': (p, e) => { if (e && e.button !== 0) return; if (e.target.closest('.course-tag-item')) return; if (e.target.closest('#floating-action-bar')) return; const cell = e.target.closest('.calendar-cell'); if (!cell) return; document.querySelectorAll('.calendar-cell-selected').forEach(c => c.classList.remove('calendar-cell-selected')); const ds = cell.dataset.date; cell.classList.add('calendar-cell-selected'); const fab = document.getElementById('floating-action-bar'); const fabContent = document.getElementById('floating-action-bar-content'); if (!fab || !fabContent) return; const prevType = fabContent.dataset.type; const isCrossType = prevType && prevType !== 'cell'; const fabService = this._fabHandlerService; const showButtons = () => { fabContent.innerHTML = fabService._renderCellActionButtons(registry.get('utils').escapeHtml(ds)); fabContent.dataset.type = 'cell'; fab.classList.add('active'); if (registry.get('lucide')) registry.get('lucide').createIcons(); }; if (isCrossType) { setTimeout(showButtons, 180); } else { showButtons(); } },
        'calendar-cell-ctrl-click': (p, e) => { if (e && e.button !== 0) return; if (e.target.closest('.course-tag-item')) return; if (e.target.closest('#floating-action-bar')) return; const cell = e.target.closest('.calendar-cell'); if (!cell) return; cell.classList.toggle('calendar-cell-selected'); this._fabHandlerService._updateSelectedFab('cell'); },
        'calendar-cells-selected': (p, e) => { const dates = p.dates; if (!dates || dates.length === 0) return; const fab = document.getElementById('floating-action-bar'); const fabContent = document.getElementById('floating-action-bar-content'); if (!fab || !fabContent) return; fabContent.innerHTML = this._fabHandlerService._renderMultiCellActionButtons(dates); fabContent.dataset.type = 'cell'; fab.classList.add('active'); if (registry.get('lucide')) registry.get('lucide').createIcons(); },
    };}

    _setupUIHandlers() { return {
        'close-modal': () => { registry.get('modalService').hide(); },
        'toggle-duration-dropdown': (p, e) => { if (e.target.closest('#duration-dropdown')) return; const u = registry.get('utils'); u.toggleDurationPicker('duration-dropdown'); },
        'select-duration': (p, e) => { const b = e.target.closest('[data-duration]'); if (!b) return; const d = parseInt(b.dataset.duration); if (isNaN(d)) return; const el = document.getElementById('course-duration'); if (el) el.value = d; const sti = document.getElementById('course-start-time'); const st = sti?.value || ''; const u = registry.get('utils'); if (st) u.calculateEndTime('course-start-time', 'course-end-time', d); u.calculateFee(); const dd = document.getElementById('duration-dropdown'); if (dd) { dd.classList.add('hidden'); const cs = registry.get('customSelectService'); if (cs?.closeListener) { document.removeEventListener('click', cs.closeListener); cs.closeListener = null; } } },
        'toggle-select': (p) => { const c = document.getElementById(p.selectWrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector('.custom-select-options'); if (!t || !o) return; document.querySelectorAll('.custom-select-options.open').forEach(oo => { if (oo !== o) { oo.classList.remove('open'); oo.parentElement.querySelector('.custom-select-trigger').classList.remove('active'); } }); o.classList.toggle('open'); t.classList.toggle('active'); },
        'select-option': (p) => { const c = document.getElementById(p.wrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector(`.custom-option[data-value="${CSS.escape(p.value)}"]`); if (!t || !o) return; (t.querySelector('span') || t).textContent = o.textContent; c.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); o.classList.add('selected'); c.querySelector('.custom-select-options')?.classList.remove('open'); t.classList.remove('active'); c.dispatchEvent(new CustomEvent('change', { detail: { value: p.value, text: o.textContent }, bubbles: true })); },
        'show-course-detail': (payload) => {
            const service = registry.get('statisticsRenderService');
            if (service) {
                service.showCourseDetail(payload, registry.get('utils'));
            }
        },
    };}

    _setupOrgGradeHandlers() { const self = this; return {
        'manage-organizations': () => { registry.get('modalService').showManageOrganizations(); },
        'manage-grades': () => { registry.get('modalService').showManageGrades(); },
        'edit-org-inline': (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; const el = e.target.closest(`[data-${itemName}]`); if (!el) return; const nip = document.getElementById(`new-${itemName}`), ab = document.getElementById(`add-${itemName}`); if (!nip || !ab) return; const oiv = nip.value; nip.value = item; nip.focus(); nip.select(); const obt = ab.textContent; ab.textContent = '保存'; ab.classList.remove('bg-primary'); ab.style.backgroundColor = 'var(--color-success)'; cfg.editingItem = { itemName, originalItem: item, itemElement: el, originalInputValue: oiv, originalBtnText: obt }; if (ab._originalClickHandler) ab.removeEventListener('click', ab._originalClickHandler); const cancelEdit = () => { nip.value = oiv; ab.textContent = obt; ab.style.backgroundColor = 'var(--color-primary)'; nip.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const beb = document.querySelector(`[data-action="add-org-inline"][data-item-name="${itemName}"]`); if (beb) beb.click(); } }; ab.onclick = ab._originalClickHandler || null; delete cfg.editingItem; }; ab.onclick = async (ev) => { ev.preventDefault(); ev.stopPropagation(); const nn = nip.value.trim(); if (!nn) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; } if (nn === item) { cancelEdit(); return; } if (cfg.items.includes(nn)) { registry.get('notificationService').show(`该${itemName}名称已存在`, 'warning'); return; } if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } self._isSaving = true; ab.disabled = true; nip.disabled = true; try { const idx = cfg.items.indexOf(item); if (cfg.editItem && idx !== -1) { const r = cfg.editItem(idx, nn); if (r === false) { cancelEdit(); return; } }; await registry.get('utils').saveData(); registry.get('notificationService').show(`${itemName}修改成功`, 'success'); if (cfg.updateUI) cfg.updateUI(); cancelEdit(); } catch (err) { registry.get('errorHandlerService').log('error', `${itemName}修改失败`, err); registry.get('notificationService').show(`${itemName}修改失败`, 'error'); cancelEdit(); } finally { self._isSaving = false; ab.disabled = false; nip.disabled = false; } }; },
        'delete-org-inline': async (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } const ci = cfg.items.find(i => i === item || i === p[itemName]), di = ci || item; if (cfg.onDelete?.(di)) { registry.get('notificationService').show(`该${itemName}正在被使用，无法删除`, 'warning'); return; } self._isSaving = true; const ib = document.getElementById(`new-${itemName}`); if (ib) ib.disabled = true; const rowElem = e.target.closest(`[data-${itemName}]`); try { const idx = cfg.items.indexOf(di); if (idx !== -1) { cfg.deleteItem?.(di); await registry.get('utils').saveData(); if (rowElem) rowElem.remove(); registry.get('notificationService').show(`${itemName}删除成功`, 'success'); cfg.updateUI?.(); } } finally { self._isSaving = false; if (ib) { ib.disabled = false; ib.focus(); } } },
        'add-org-inline': async (p, e) => {
            const itemName = p.itemName;
            const nip = document.getElementById(`new-${itemName}`);
            const ab = document.getElementById(`add-${itemName}`);
            if (!nip || !registry.get('currentManagementModalConfig')) return;
            if (ab && !ab._originalClickHandler) ab._originalClickHandler = ab.onclick || function(){};
            if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; }
            const rawValue = nip.value.trim();
            if (!rawValue) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; }
            const cfg = registry.get('currentManagementModalConfig');
            const names = rawValue.split(/[，,、\s]+/).filter(n => n.trim());

            let addedCount = 0;
            const addedNames = [];
            self._isSaving = true;
            if (ab) ab.disabled = true;
            nip.disabled = true;
            try {
                const ct = itemName === '机构' ? 'organization' : 'grade';
                for (const ni of names) {
                    const trimmed = ni.trim();
                    if (cfg.items.includes(trimmed)) continue;
                    cfg.addItem(trimmed);
                    cfg.onAdd?.(trimmed);
                    addedCount++;
                    addedNames.push(trimmed);
                }
                if (addedCount === 0) {
                    registry.get('notificationService').show(`所有${itemName}名称已存在`, 'warning');
                    return;
                }
                await registry.get('utils').saveData();
                // Refresh the entire list UI by re-rendering the list
                const il = document.getElementById(`${itemName}s-list`);
                if (il) {
                    il.innerHTML = registry.get('state')[itemName === '机构' ? 'organizations' : 'grades'].map(item => self._renderOrgGradeItem(item, itemName, ct)).join('');
                    // Re-attach color picker listeners
                    if (registry.get('lucide')) registry.get('lucide').createIcons();
                    il.querySelectorAll(`.${itemName}-name.color-picker-trigger`).forEach(cpt => {
                        cpt.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            registry.get('modalService').showColorPicker({
                                itemName: cpt.dataset.item,
                                itemType: ct,
                                currentColor: cpt.dataset.color,
                                onSelect: (nc) => {
                                    registry.get('utils').setColor(cpt.dataset.item, nc, ct);
                                    cpt.style.backgroundColor = `color-mix(in srgb, ${nc} 20%, transparent)`;
                                    cpt.style.color = nc;
                                    cpt.dataset.color = nc;
                                    if (ct === 'organization') {
                                        registry.get('setState')(draft => {
                                            draft.courses.forEach(c => {
                                                if (Array.isArray(c.organizations)) c.organizations.forEach((o, i) => {
                                                    if (o === cpt.dataset.item && c.colors?.[i]) c.colors[i] = nc;
                                                });
                                            });
                                        }, ['courses', 'organizationColors']);
                                    }
                                    registry.get('utils').saveData().catch(err => { registry.get('errorHandlerService').log('error', '颜色保存失败', err); });
                                    registry.get('currentManagementModalConfig').updateUI?.();
                                }
                            });
                        });
                    });
                }
                nip.value = '';
                nip.focus();
                registry.get('notificationService').show(`成功添加 ${addedCount} 个${itemName}`, 'success');
                cfg.updateUI?.();
            } finally {
                self._isSaving = false;
                if (ab) ab.disabled = false;
                nip.disabled = false;
                nip.focus();
            }
        },
    };}

    handle(action, payload, e) {
        const h = this.handlers[action];
        if (h) {
            try {
                const result = h(payload, e);
                if (result && typeof result.catch === 'function') {
                    result.catch(error => {
                        registry.get('errorHandlerService').log('error', `处理事件 ${action} 失败`, error);
                        registry.get('notificationService').show('操作失败', 'error');
                    });
                }
            } catch (error) {
                registry.get('errorHandlerService').log('error', `处理事件 ${action} 失败`, error);
                registry.get('notificationService').show('操作失败', 'error');
            }
        }
    }

    getFabHandlerService() { return this._fabHandlerService; }
    getCourseEventHandlerService() { return this._courseEventHandlerService; }
}

const eventHandlerService = new EventHandlerService();
export default eventHandlerService;