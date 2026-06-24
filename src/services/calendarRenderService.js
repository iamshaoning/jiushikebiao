/**
 * 日历渲染服务
 *
 * @description 渲染月视图日历网格、课程标签、节假日标识，支持课程点击交互
 * @module calendarRenderService
 */
import { registry } from '../core/registry.js';
export class CalendarRenderService {
    constructor(state, elements, utils) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
        this.lucide = registry.get('lucide') || null;
        this.getCourseTagHTML = (course) => {
            const state = registry.get('state');
            const privacy = state && state.privacyMode;
            const primaryColor = course.colors?.[0] || 'var(--color-secondary)';
            const fee = course.fees?.[0] ?? 0;
            const feeHtml = (!privacy && fee > 0) ? `<span style="color: var(--text-primary);">¥${fee}</span>` : '';
            const studentNames = Array.isArray(course.studentNames) ? course.studentNames : [];
            const noteHtml = (!privacy && course.note) ? `<div class="text-[9px] truncate" style="color: var(--text-secondary);">${this.utils.escapeHtml(course.note)}</div>` : '';
            const maskName = (name) => {
                if (!name) return '';
                return name[0] + '*'.repeat(Math.max(0, name.length - 1));
            };
            return `<div class="course-tag-item course-item mt-1 rounded text-xs relative z-10" data-action="course-click" data-course-id="${course.id}" style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent);"><div class="tag-content p-1"><div class="flex flex-wrap gap-1 mb-1">${studentNames.map((name, index) => { const color = course.colors?.[index] || 'var(--color-secondary)'; const displayName = privacy ? maskName(name) : name; return `<span class="px-1 py-0.5 rounded text-xs" style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">${this.utils.escapeHtml(displayName)}</span>`; }).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center;"><span class="text-[10px]" style="color: var(--text-secondary);">${course.startTime || ''} - ${this.utils.calculateEndTimeFromDuration(course.startTime, course.duration)}</span>${feeHtml}</div>${noteHtml}</div></div>`;
        };
    }

    handleCourseClick(element, courseId, event) { if (event && event.button !== 0) return; element.classList.add('is-selected'); this.showActionButtons(element, courseId); }

    showActionButtons(element, courseId) {
        const fab = document.getElementById('floating-action-bar');
        const fabContent = document.getElementById('floating-action-bar-content');
        if (!fab || !fabContent) return;
        const prevType = fabContent.dataset.type;
        const isCrossType = prevType && prevType !== 'course';
        const show = () => {
            fabContent.innerHTML = registry.get('fabHandlerService')._renderCourseActionButtons(this.utils.escapeHtml(courseId));
            fabContent.dataset.type = 'course';
            fab.classList.add('active');
            if (this.lucide) this.lucide.createIcons();
        };
        if (isCrossType) {
            fab.classList.remove('active');
            setTimeout(show, 180);
        } else {
            show();
        }
    }

    _buildCoursesByDate() {
        const map = new Map();
        this.state.courses.forEach(c => { const a = map.get(c.date) || []; a.push(c); map.set(c.date, a); });
        return map;
    }

    _fillDays(fragment, year, month, count, startDay, coursesByDate, isCurrent) {
        for (let day = startDay; day < startDay + count; day++) {
            const m = isCurrent ? month : (month === 0 ? 11 : month - 1);
            const y = isCurrent ? year : (month === 0 ? year - 1 : year);
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = isCurrent && new Date().getFullYear() === y && new Date().getMonth() === m && new Date().getDate() === day;
            fragment.appendChild(this.createDayCell(day, dateStr, coursesByDate.get(dateStr) || [], isCurrent, isToday));
        }
    }

    _applyCornerRadius(grid) {
        const cells = grid.querySelectorAll('.calendar-cell');
        if (cells.length > 0) {
            const lastRowStart = cells[cells.length - 7];
            const lastCell = cells[cells.length - 1];
            if (lastRowStart) lastRowStart.style.borderBottomLeftRadius = '0.75rem';
            if (lastCell) lastCell.style.borderBottomRightRadius = '0.75rem';
        }
    }

    calendar(forceUpdate = false) {
        const year = this.state.currentDate.getFullYear(), month = this.state.currentDate.getMonth();
        this.utils.safeSet(this.elements.calendarYearTrigger, 'textContent', `${year}年`);
        this.utils.safeSet(this.elements.calendarMonthTrigger, 'textContent', `${month + 1}月`);
        this.utils.setCustomSelectValue('calendar-year-wrapper', year); this.utils.setCustomSelectValue('calendar-month-wrapper', month);

        const fab = document.getElementById('floating-action-bar');
        if (fab) { fab.classList.remove('active'); }

        const coursesByDate = this._buildCoursesByDate();
        const fragment = document.createDocumentFragment();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInLastMonth = new Date(month === 0 ? year - 1 : year, month === 0 ? 12 : month, 0).getDate();

        this._fillDays(fragment, year, month, startOffset, daysInLastMonth - startOffset + 1, coursesByDate, false);
        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === d;
            fragment.appendChild(this.createDayCell(d, ds, coursesByDate.get(ds) || [], true, isToday));
        }
        const remaining = 42 - startOffset - daysInMonth;
        if (remaining > 0) {
            const nm = month === 11 ? 0 : month + 1, ny = month === 11 ? year + 1 : year;
            for (let d = 1; d <= remaining; d++) {
                const ds = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = new Date().getFullYear() === ny && new Date().getMonth() === nm && new Date().getDate() === d;
                fragment.appendChild(this.createDayCell(d, ds, coursesByDate.get(ds) || [], false, isToday));
            }
        }

        this.elements.calendarGrid.innerHTML = '';
        this.elements.calendarGrid.appendChild(fragment);
        this._applyCornerRadius(this.elements.calendarGrid);

        if (!this.elements.calendarGrid._containerStyled) {
            this.elements.calendarGrid._containerStyled = true;
            const headerRow = this.elements.calendarGrid.previousElementSibling;
            if (headerRow) { headerRow.style.cssText = 'border-top-left-radius:0.75rem;border-top-right-radius:0.75rem;overflow:hidden'; const hc = headerRow.querySelectorAll('div'); if (hc.length) { hc[0].style.borderTopLeftRadius = '0.75rem'; hc[hc.length - 1].style.borderTopRightRadius = '0.75rem'; hc.forEach(c => c.style.overflow = 'hidden'); } }
            const cc = headerRow?.parentElement; if (cc) cc.style.cssText = 'border-radius:0.75rem;overflow:hidden';
        }
        this.elements.calendarGrid._calendarInitialized = true;
        if (!this.elements.calendarGrid._mousedownListenerAdded) { this.elements.calendarGrid.addEventListener('mousedown', e => e.preventDefault()); this.elements.calendarGrid._mousedownListenerAdded = true; }
    }

    updateCourseCells() {
        const map = this._buildCoursesByDate();
        document.querySelectorAll('.calendar-cell').forEach(c => { const ds = c.dataset.date; if (ds) this.updateDayCell(c, map.get(ds) || []); });
    }

    updateDayCell(cell, courses) {
        const cc = cell.querySelector('.course-container');
        if (!cc) return;
        cc.innerHTML = courses.length ? [...courses].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(c => this.getCourseTagHTML(c)).join('') : '';
    }

    getDateInfo(dateStr) {
        if (typeof chineseDays === 'undefined' || !chineseDays) return null;
        try {
            const dd = chineseDays.getDayDetail(dateStr);
            if (!dd) return null;
            const isDayName = /^[A-Z][a-z]+$/.test(dd.name) || dd.name === '1';
            const info = { isWorkday: dd.work === true && !isDayName, isHoliday: !isDayName && dd.work !== true, isInLieu: chineseDays.isInLieu ? chineseDays.isInLieu(dateStr) : false, name: '' };
            if (info.isHoliday && dd.name) { const parts = dd.name.split(','); info.name = parts.find(p => /[\u4e00-\u9fa5]/.test(p)) || parts[parts.length - 1] || dd.name; }
            return info;
        } catch (e) { console.error('Error checking date info:', e); return null; }
    }

    _getScheduleTag(dateInfo, dateStr) {
        if (!dateInfo) return '';
        if (dateInfo.isInLieu) return '<span class="mr-2 w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-medium" style="background-color: var(--color-purple);">调</span>';
        if (dateInfo.isHoliday) return '<span class="mr-2 w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-medium" style="background-color: var(--color-success);">休</span>';
        if (dateInfo.isWorkday) { const d = new Date(dateStr); if (d.getDay() === 0 || d.getDay() === 6) return '<span class="mr-2 w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-medium" style="background-color: var(--color-primary);">班</span>'; }
        return '';
    }

    _getHolidayTag(dateInfo) {
        if (!dateInfo?.isHoliday || !dateInfo.name) return '';
        let nm = dateInfo.name;
        if (nm.includes('劳动节')) nm = '劳动'; else if (nm.includes('国庆')) nm = '国庆'; else if (nm.includes('清明')) nm = '清明'; else if (nm.includes('中秋')) nm = '中秋';
        const styles = { '元旦':'background-color:rgba(239,68,68,0.2);color:var(--color-danger)', '春节':'background-color:var(--color-gold);color:var(--color-danger);font-weight:bold', '劳动':'background-color:transparent;color:var(--color-warning);border:2px solid var(--color-warning)', '清明':'background-color:rgba(59,130,246,0.2);color:#2563eb', '端午':'background-color:rgba(34,197,94,0.2);color:var(--color-success)', '中秋':'background-color:rgba(234,179,8,0.2);color:#b45309', '国庆':'background-color:var(--color-danger);color:var(--color-gold);font-weight:bold' };
        const st = styles[nm] || 'background-color:var(--color-warning);color:black';
        return `<span class="mr-2 px-2 h-6 rounded items-center justify-center text-xs font-semibold inline-flex shadow-sm" style="${st}">${nm}</span>`;
    }

    createDayCell(day, dateStr, courses, isCurrentMonth, isToday) {
        const cell = document.createElement('div');
        const dateInfo = this.getDateInfo(dateStr);
        const todayClass = isToday ? 'today-border relative z-10 today-cell' : '';
        const bgColor = isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-content)';
        const textColor = isCurrentMonth ? (isToday ? 'var(--color-today)' : 'var(--text-secondary)') : 'var(--text-secondary)';

        cell.className = `calendar-cell ${todayClass} border p-2 min-h-28 hover-cell cursor-pointer overflow-visible`;
        cell.style.backgroundColor = bgColor;
        cell.style.color = textColor;
        cell.tabIndex = 0;
        cell.dataset.date = dateStr;

        // 预计算课程HTML
        const coursesHTML = courses.length
            ? [...courses].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                .map(c => this.getCourseTagHTML(c)).join('')
            : '';

        // 构建日期头部HTML
        const holidayTag = this._getHolidayTag(dateInfo);
        const todayTag = isToday ? '<span class="mr-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style="background-color: var(--color-today); color: white;">今</span>' : '';
        const scheduleTag = this._getScheduleTag(dateInfo, dateStr);
        const fontWeight = isCurrentMonth && isToday ? 'font-bold' : '';

        cell.innerHTML = `<div class="text-right ${fontWeight} flex items-center justify-end flex-wrap" style="color: ${textColor};"><div class="flex items-center justify-end w-full">${holidayTag}${todayTag}${scheduleTag}${day}</div></div><div class="course-container mt-1 space-y-1 max-h-[calc(100%-1rem)] overflow-y-auto overflow-x-hidden">${coursesHTML}</div>`;
        return cell;
    }
}
