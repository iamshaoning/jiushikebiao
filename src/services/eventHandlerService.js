/**
 * 事件处理服务
 *
 * @description 注册并管理所有业务事件处理器（学生/课程/机构/年级/日历/UI 交互），由 eventDispatcherService 调起
 * @module eventHandlerService
 */
import { registry } from '../core/registry.js';

class EventHandlerService {
    constructor() {
        this.handlers = {};
        this._isSaving = false;
        this.initHandlers();
    }

    initHandlers() {
        this.handlers = {};
        Object.assign(this.handlers,
            this._setupStudentHandlers(),
            this._setupCourseHandlers(),
            this._setupAuthHandlers(),
            this._setupCalendarHandlers(),
            this._setupUIHandlers(),
            this._setupOrgGradeHandlers()
        );
    }

    _setupStudentHandlers() { return {
        'edit-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) registry.get('modalService').showEditStudent(s); },
        'delete-student': (payload) => { const s = registry.get('state').students.find(s => s.id === payload.id); if (s) { const rc = registry.get('state').courses.filter(c => Array.isArray(c.studentIds) && c.studentIds.includes(s.id)); registry.get('modalService').showConfirm(`删除学生 <strong>${registry.get('utils').escapeHtml(s.name)}</strong> 后，相关的${rc.length}节课也将全部删除，确定吗？`, async () => { const deleteIds = new Set(rc.map(r => r.id)); registry.get('setState')(d => { d.courses = d.courses.filter(c => !deleteIds.has(c.id)); d.students = d.students.filter(st => st.id !== s.id); }, 'students'); await registry.get('utils').saveData(); registry.get('notificationService').show('学生删除成功', 'success'); }, 'delete'); } },
        'add-student-main': () => { registry.get('modalService').showAddStudent(); },
    };}

    _setupCourseHandlers() { return {
        'edit-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('modalService').showEditCourse(c); },
        'copy-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); if (c) registry.get('utils').copyCourses([c]); },
        'delete-course': (p) => { const c = registry.get('state').courses.find(c => c.id === p.id); registry.get('modalService').showConfirm('确定要删除这节课程吗？', () => { if (c) registry.get('timelineService').recordDeleteCourse(c); registry.get('setState')(d => { d.courses = d.courses.filter(co => co.id !== p.id); }, 'courses'); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
        'course-click': (p, e) => { const ci = e.target.closest('.course-tag-item'); if (ci) { registry.get('modalService').closeAllPopovers(); registry.get('utils').handleCourseClick(ci, p.courseId, e); } },
        'add-course': (p) => { if (p.date) registry.get('modalService').showAddCourse(p.date); },
        'copy-date': (p) => { registry.get('utils').copyCourses(registry.get('state').courses.filter(c => c.date === p.date)); },
        'paste-to-date': (p) => { registry.get('utils').pasteCourses(p.date); },
        'delete-date-courses': (p) => { const cs = registry.get('state').courses.filter(c => c.date === p.date); if (!cs.length) { registry.get('notificationService').show('该日期没有课程可删除', 'warning'); return; } registry.get('modalService').showConfirm(`确定要删除 ${p.date} 的全部课程吗？`, () => { registry.get('timelineService').recordDeleteDayCourses(p.date, [...cs]); const deleteIds = new Set(cs.map(c => c.id)); registry.get('setState')(d => { d.courses = d.courses.filter(co => !deleteIds.has(co.id)); }, 'courses'); registry.get('notificationService').show('课程已删除', 'success'); }, 'delete'); },
        'course-time-change': () => { const u = registry.get('utils'); const d = document.getElementById('course-duration'); const dVal = d ? parseInt(d.value) || 120 : 120; u.calculateEndTime('course-start-time', 'course-end-time', dVal); u.calculateFee(); },
        'export-data': () => { registry.get('modalService').showConfirm('确定要导出课时统计数据吗？', () => { const u = registry.get('utils'); const { year, month, organization } = u.getStatisticsParams(); u.exportStatisticsData(year, month, organization); }, 'confirm'); },
    };}

    _setupAuthHandlers() { return {
        'show-login': () => { registry.get('authUIService').showAuthModal(); },
        'show-register': () => { registry.get('authUIService').showAuthModal(); const rt = document.getElementById('register-tab'); if (rt) rt.click(); },
        'logout': () => { registry.get('authUIService').logout(); },
        'navigate-home': () => { registry.get('router').navigate('/'); },
    };}

    _renderCellActionButtons(escapedDate) {
        return `<div data-action="add-course" data-date="${escapedDate}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color:var(--color-primary)"><i data-lucide="plus" class="text-base pointer-events-none inline-block" style="width:16px;height:16px"></i></div><div data-action="copy-date" data-date="${escapedDate}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color:var(--color-success)"><i data-lucide="copy" class="text-base pointer-events-none inline-block" style="width:16px;height:16px"></i></div><div data-action="paste-to-date" data-date="${escapedDate}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color:var(--color-warning)"><i data-lucide="clipboard" class="text-base pointer-events-none inline-block" style="width:16px;height:16px"></i></div><div data-action="delete-date-courses" data-date="${escapedDate}" class="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95" style="background-color:var(--color-danger)"><i data-lucide="trash-2" class="text-base pointer-events-none inline-block" style="width:16px;height:16px"></i></div>`;
    }

    _setupCalendarHandlers() { return {
        'prev-month': () => { registry.get('state').currentDate.setMonth(registry.get('state').currentDate.getMonth() - 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'next-month': () => { registry.get('state').currentDate.setMonth(registry.get('state').currentDate.getMonth() + 1); registry.get('utils').generateYearDropdowns(); registry.get('utils').generateMonthDropdowns(); registry.get('render').calendar(); },
        'calendar-cell-click': (p, e) => { if (e && e.button !== 0) return; if (e.target.closest('.course-tag-item')) return; if (e.target.closest('.cell-action-group')) return; const cell = e.target.closest('.calendar-cell'); if (!cell) return; document.querySelectorAll('.cell-action-group').forEach(g => g.remove()); document.querySelectorAll('.calendar-cell-selected').forEach(c => c.classList.remove('calendar-cell-selected')); const ds = cell.dataset.date; cell.classList.add('calendar-cell-selected'); const bg = document.createElement('div'); bg.className = 'cell-action-group flex items-center space-x-2 transform translate-y-full opacity-0 transition-all duration-300'; bg.style.cssText = 'position:absolute;bottom:4px;left:50%;transform:translate(-50%,100%);z-index:10'; bg.innerHTML = this._renderCellActionButtons(registry.get('utils').escapeHtml(ds)); cell.style.position = 'relative'; cell.appendChild(bg); if (registry.get('lucide')) registry.get('lucide').createIcons(); setTimeout(() => { const isCellVisible = (el) => { const style = window.getComputedStyle(el); return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null; }; if (isCellVisible(cell)) { bg.style.transform = 'translate(-50%,0)'; bg.style.opacity = '1'; } }, 50); },
    };}

    _setupUIHandlers() { return {
        'close-modal': () => { registry.get('modalService').hide(); },
        'toggle-duration-dropdown': (p, e) => { if (e.target.closest('#duration-dropdown')) return; const u = registry.get('utils'); const durEl = document.getElementById('course-duration'); if (durEl) durEl.select(); u.toggleDurationPicker('duration-dropdown'); },
        'select-duration': (p, e) => { const b = e.target.closest('[data-duration]'); if (!b) return; const d = parseInt(b.dataset.duration); if (isNaN(d)) return; const el = document.getElementById('course-duration'); if (el) el.value = d; const sti = document.getElementById('course-start-time'); const st = sti?.value || ''; const u = registry.get('utils'); if (st) u.calculateEndTime('course-start-time', 'course-end-time', d); u.calculateFee(); const dd = document.getElementById('duration-dropdown'); if (dd) dd.classList.add('hidden'); },
        'toggle-select': (p) => { const c = document.getElementById(p.selectWrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector('.custom-select-options'); if (!t || !o) return; document.querySelectorAll('.custom-select-options.open').forEach(oo => { if (oo !== o) { oo.classList.remove('open'); oo.parentElement.querySelector('.custom-select-trigger').classList.remove('active'); } }); o.classList.toggle('open'); t.classList.toggle('active'); },
        'select-option': (p) => { const c = document.getElementById(p.wrapper); if (!c) return; const t = c.querySelector('.custom-select-trigger'), o = c.querySelector(`.custom-option[data-value="${p.value}"]`); if (!t || !o) return; (t.querySelector('span') || t).textContent = o.textContent; c.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); o.classList.add('selected'); c.querySelector('.custom-select-options')?.classList.remove('open'); t.classList.remove('active'); c.dispatchEvent(new CustomEvent('change', { detail: { value: p.value, text: o.textContent }, bubbles: true })); },
    };}

    _setupOrgGradeHandlers() { const self = this; return {
        'manage-organizations': () => { registry.get('modalService').showManageOrganizations(); },
        'manage-grades': () => { registry.get('modalService').showManageGrades(); },
        'edit-org-inline': (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; const el = e.target.closest(`[data-${itemName}]`); if (!el) return; const nip = document.getElementById(`new-${itemName}`), ab = document.getElementById(`add-${itemName}`); if (!nip || !ab) return; const oiv = nip.value; nip.value = item; nip.focus(); nip.select(); const obt = ab.textContent; ab.textContent = '保存'; ab.classList.remove('bg-primary'); ab.style.backgroundColor = 'var(--color-success)'; cfg.editingItem = { itemName, originalItem: item, itemElement: el, originalInputValue: oiv, originalBtnText: obt }; if (ab._originalClickHandler) ab.removeEventListener('click', ab._originalClickHandler); const cancelEdit = () => { nip.value = oiv; ab.textContent = obt; ab.style.backgroundColor = 'var(--color-primary)'; nip.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const beb = document.querySelector(`[data-action="add-org-inline"][data-item-name="${itemName}"]`); if (beb) beb.click(); } }; if (ab._originalClickHandler) ab.addEventListener('click', ab._originalClickHandler); delete cfg.editingItem; }; ab.onclick = async (ev) => { ev.preventDefault(); ev.stopPropagation(); const nn = nip.value.trim(); if (!nn) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; } if (nn === item) { cancelEdit(); return; } if (cfg.items.includes(nn)) { registry.get('notificationService').show(`该${itemName}名称已存在`, 'warning'); return; } if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } self._isSaving = true; ab.disabled = true; nip.disabled = true; try { const idx = cfg.items.indexOf(item); if (cfg.editItem && idx !== -1) { const r = cfg.editItem(idx, nn); if (r === false) return; }; await registry.get('utils').saveData(); registry.get('notificationService').show(`${itemName}修改成功`, 'success'); if (cfg.updateUI) cfg.updateUI(); cancelEdit(); } finally { self._isSaving = false; ab.disabled = false; nip.disabled = false; } }; nip.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); ab.click(); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cancelEdit(); } }; },
        'delete-org-inline': async (p, e) => { const itemName = p.itemName, item = p.item; const cfg = registry.get('currentManagementModalConfig'); if (!cfg) return; if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } const ci = cfg.items.find(i => i === item || i === p[itemName]), di = ci || item; if (cfg.onDelete?.(di)) { registry.get('notificationService').show(`该${itemName}正在被使用，无法删除`, 'warning'); return; } self._isSaving = true; const ib = document.getElementById(`new-${itemName}`); if (ib) ib.disabled = true; const rowElem = e.target.closest(`[data-${itemName}]`); try { const idx = cfg.items.indexOf(di); if (idx !== -1) { cfg.deleteItem?.(di); await registry.get('utils').saveData(); if (rowElem) rowElem.remove(); registry.get('notificationService').show(`${itemName}删除成功`, 'success'); cfg.updateUI?.(); } } finally { self._isSaving = false; if (ib) { ib.disabled = false; ib.focus(); } } },
        'add-org-inline': async (p, e) => { const itemName = p.itemName, nip = document.getElementById(`new-${itemName}`), ab = document.getElementById(`add-${itemName}`); if (!nip || !registry.get('currentManagementModalConfig')) return; if (ab && !ab._originalClickHandler) ab._originalClickHandler = ab.onclick || function(){}; if (self._isSaving) { registry.get('notificationService').show('正在保存中，请稍候...', 'info'); return; } const ni = nip.value.trim(); if (!ni) { registry.get('notificationService').show(`请输入${itemName}名称`, 'warning'); return; } if (registry.get('currentManagementModalConfig').items.includes(ni)) { registry.get('notificationService').show(`该${itemName}名称已存在`, 'warning'); return; } self._isSaving = true; if (ab) ab.disabled = true; nip.disabled = true; try { registry.get('currentManagementModalConfig').addItem(ni); registry.get('currentManagementModalConfig').onAdd?.(ni); await registry.get('utils').saveData(); const il = document.getElementById(`${itemName}s-list`); if (il) { const idiv = document.createElement('div'); idiv.className = 'flex items-center justify-between p-2 rounded'; idiv.style.backgroundColor = 'var(--bg-secondary)'; idiv.dataset[itemName] = ni; const ct = itemName === '机构' ? 'organization' : 'grade', bc = registry.get('utils').generateColor(ni, ct); idiv.innerHTML = `<button class="${itemName}-name color-picker-trigger px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity" style="background-color: color-mix(in srgb, ${bc} 20%, transparent); color: ${bc};" data-item="${ni}" data-item-name="${itemName}" data-color="${bc}">${registry.get('utils').escapeHtml(ni)}</button><div class="flex items-center"><button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-org-inline" data-item-name="${itemName}" data-item="${ni}"><i data-lucide="square-pen" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-success)"></i></button><button class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-org-inline" data-item-name="${itemName}" data-item="${ni}"><i data-lucide="trash-2" class="text-lg inline-block" style="width:18px;height:18px;color:var(--color-danger)"></i></button></div>`; il.appendChild(idiv); if (registry.get('lucide')) registry.get('lucide').createIcons(); const cpt = idiv.querySelector(`.${itemName}-name.color-picker-trigger`); if (cpt) { cpt.addEventListener('click', (ev) => { ev.stopPropagation(); registry.get('modalService').showColorPicker({ itemName: cpt.dataset.item, itemType: ct, currentColor: cpt.dataset.color, onSelect: (nc) => { registry.get('utils').setColor(cpt.dataset.item, nc, ct); cpt.style.backgroundColor = `color-mix(in srgb, ${nc} 20%, transparent)`; cpt.style.color = nc; cpt.dataset.color = nc; if (ct === 'organization') { registry.get('state').courses.forEach(c => { if (Array.isArray(c.organizations)) c.organizations.forEach((o, i) => { if (o === cpt.dataset.item && c.colors?.[i]) c.colors[i] = nc; }); }); } registry.get('utils').saveData(); registry.get('currentManagementModalConfig').updateUI?.(); } }); }); } } nip.value = ''; nip.focus(); registry.get('notificationService').show(`${itemName}添加成功`, 'success'); registry.get('currentManagementModalConfig').updateUI?.(); } finally { self._isSaving = false; if (ab) ab.disabled = false; nip.disabled = false; nip.focus(); } },
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
}

const eventHandlerService = new EventHandlerService();
export { EventHandlerService, eventHandlerService };
export default eventHandlerService;
