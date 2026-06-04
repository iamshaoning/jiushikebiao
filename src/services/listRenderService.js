/**
 * 列表渲染服务
 *
 * @description 渲染学生列表，支持搜索过滤和 VirtualList 虚拟滚动
 * @module listRenderService
 */
import { registry } from '../core/registry.js';

export class ListRenderService {
    constructor(state, elements, utils) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
        
        // 缓存变量
        this._cachedStudents = null;
        this._lastSearchTerm = '';
        this._virtualList = null;
        
    }

    /**
     * 渲染学生列表
     */
    students() {
        const studentsList = this.elements.studentsList;
        const searchTerm = this.elements.studentSearch ? this.elements.studentSearch.value.toLowerCase() : '';
        let filteredStudents;

        // 检查是否需要重新计算
        if (searchTerm !== this._lastSearchTerm || !this._cachedStudents) {
            filteredStudents = [...this.state.students];
            
            // 1. 先过滤（减少数据量）
            if (searchTerm) {
                filteredStudents = filteredStudents.filter(student => {
                    const nameMatch = student.name && student.name.toLowerCase().includes(searchTerm);
                    const orgMatch = student.organization && student.organization.toLowerCase().includes(searchTerm);
                    return nameMatch || orgMatch;
                });
                
                // 搜索结果简化排序（只按姓名）
                filteredStudents.sort((a, b) => {
                    const nameA = a.name || '';
                    const nameB = b.name || '';
                    return nameA.localeCompare(nameB);
                });
            } else {
                // 无搜索时使用缓存或完整排序
                if (!this._cachedStudents) {
                    // 完整排序并缓存
                    this._cachedStudents = [...this.state.students].sort((a, b) => {
                        // 1. 按机构排序
                        const orgA = a.organization || '';
                        const orgB = b.organization || '';
                        const orgCompare = orgA.localeCompare(orgB);
                        if (orgCompare !== 0) return orgCompare;
                        
                        // 2. 如果机构相同，按年级排序
                        const gradeA = a.grade || '';
                        const gradeB = b.grade || '';
                        const gradeCompare = gradeA.localeCompare(gradeB);
                        if (gradeCompare !== 0) return gradeCompare;
                        
                        // 3. 如果年级相同，按学生姓名排序
                        const nameA = a.name || '';
                        const nameB = b.name || '';
                        return nameA.localeCompare(nameB);
                    });
                }
                filteredStudents = this._cachedStudents;
            }
            
            // 更新缓存状态
            this._lastSearchTerm = searchTerm;
        } else {
            // 使用缓存的结果
            filteredStudents = this._cachedStudents;
        }
        
        // 渲染学生列表
        if (filteredStudents.length === 0) {
            const tableEl = studentsList.closest('table');
            if (tableEl) tableEl.style.display = '';
            const vlistContainer = document.getElementById('students-virtual-container');
            if (vlistContainer) vlistContainer.style.display = 'none';
            if (this._virtualList) {
                this._virtualList.destroy();
                this._virtualList = null;
            }
            studentsList.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-10 text-center" style="color: var(--text-secondary);">
                        <i data-lucide="user-round-x" style="display: block; margin-left: auto; margin-right: auto;" class="text-4xl mb-2"></i>
                        <p>暂无学生信息</p>
                    </td>
                </tr>
            `;
            if (registry.get('lucide')) {
                registry.get('lucide').createIcons({ nodes: [studentsList] });
            }
            return;
        }
        const VirtualList = registry.get('VirtualList');
        if (VirtualList && filteredStudents.length > 50) {
            // 对于大型列表使用虚拟滚动 — 不能在 tbody 中使用 div 定位，改用独立容器
            const tableEl = studentsList.closest('table');
            if (tableEl) tableEl.style.display = 'none';

            let vlistContainer = document.getElementById('students-virtual-container');
            if (!vlistContainer) {
                vlistContainer = document.createElement('div');
                vlistContainer.id = 'students-virtual-container';
                vlistContainer.style.position = 'relative';
                vlistContainer.style.overflowY = 'auto';
                vlistContainer.style.maxHeight = '70vh';
                studentsList.parentElement.insertAdjacentElement('afterend', vlistContainer);
            }

            if (this._virtualList) {
                this._virtualList.destroy();
                this._virtualList = null;
            }

            vlistContainer.style.display = '';

            this._virtualList = new VirtualList({
                container: vlistContainer,
                items: filteredStudents,
                itemHeight: 80,
                renderItem: (student) => this._renderStudentItem(student)
            });
        } else {
            // 对于小型列表使用传统渲染
            // 销毁旧的虚拟列表并恢复表格显示
            if (this._virtualList) {
                this._virtualList.destroy();
                this._virtualList = null;
            }
            const tableEl = studentsList.closest('table');
            if (tableEl) tableEl.style.display = '';
            const vlistContainer = document.getElementById('students-virtual-container');
            if (vlistContainer) vlistContainer.style.display = 'none';
            
            // 使用DocumentFragment减少DOM重排
            const fragment = document.createDocumentFragment();
            
            filteredStudents.forEach(student => {
                // 确保所有字段都有默认值
                const name = student.name || '未命名';
                const organization = student.organization || '未分配';
                const fees = student.fees ?? { '一对一': 0 };
                const id = student.id || '';
                
                const oneOnOneFee = fees['一对一'] ?? 0;
                const oneOnOneDuration = fees['一对一_duration'] ?? 120;
                const feeDisplay = `<div class="text-sm" style="color: var(--text-secondary);">${Math.round(oneOnOneFee)}元/${oneOnOneDuration}分钟</div>`;
                const orgColor = this.utils.generateColor(organization, 'organization');
                const gradeColor = this.utils.generateColor(student.grade || '未设置', 'grade');
                
                const tr = document.createElement('tr');
                tr.className = 'transition-colors';
                tr.style.backgroundColor = 'var(--bg-secondary)';
                tr.dataset.studentId = id;
                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium" style="color: var(--text-primary);">${this.utils.escapeHtml(name)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${orgColor} 20%, transparent); color: ${orgColor};">
                            ${this.utils.escapeHtml(organization)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${gradeColor} 20%, transparent); color: ${gradeColor};">
                            ${this.utils.escapeHtml(student.grade || '未设置')}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        ${feeDisplay}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div class="flex items-center justify-center">
                            <button class="edit-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-student" data-id="${this.utils.escapeHtml(id)}">
                                <i data-lucide="square-pen" class="inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                            </button>
                            <button class="delete-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-student" data-id="${this.utils.escapeHtml(id)}">
                                <i data-lucide="trash-2" class="inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                            </button>
                        </div>
                    </td>
                `;
                fragment.appendChild(tr);
            });
            
            // 一次性添加所有行，减少DOM重排
            studentsList.innerHTML = '';
            studentsList.appendChild(fragment);
        }

        // 重新初始化 Lucide 图标 - 只渲染新增的内容
        if (registry.get('lucide')) {
            registry.get('lucide').createIcons({ nodes: [studentsList] });
        }

        // Restore multi-select state after re-render
        const ed = registry.get('eventDispatcherService');
        if (ed && ed._selectedStudentIds && ed._selectedStudentIds.size > 0) {
            const rows = [
                ...document.querySelectorAll('#students-list tr'),
                ...document.querySelectorAll('#students-virtual-container .student-item')
            ];
            rows.forEach(row => {
                if (ed._selectedStudentIds.has(row.dataset.studentId)) {
                    row.classList.add('student-selected');
                }
            });
            ed._updateStudentMultiSelectUI();
        }
    }

    _renderStudentItem(student) {
        const name = student.name || '未命名';
        const organization = student.organization || '未分配';
        const fees = student.fees ?? { '一对一': 0 };
        const oneOnOneFee = fees['一对一'] ?? 0;
        const oneOnOneDuration = fees['一对一_duration'] ?? 120;
        const feeDisplay = `${Math.round(oneOnOneFee)}元/${oneOnOneDuration}分钟`;
        const orgColor = this.utils.generateColor(organization, 'organization');
        const gradeColor = this.utils.generateColor(student.grade || '未设置', 'grade');
        const id = student.id || '';

        return `
            <div class="student-item" data-student-id="${this.utils.escapeHtml(id)}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;height:80px;box-sizing:border-box;border-bottom:1px solid var(--border-color);background-color:var(--bg-secondary);">
                <div style="flex:1;min-width:0;">
                    <div class="font-medium" style="color:var(--text-primary);">${this.utils.escapeHtml(name)}</div>
                </div>
                <div style="flex:1;min-width:0;">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,${orgColor} 20%,transparent);color:${orgColor};">${this.utils.escapeHtml(organization)}</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,${gradeColor} 20%,transparent);color:${gradeColor};">${this.utils.escapeHtml(student.grade || '未设置')}</span>
                </div>
                <div style="flex:0 0 auto;text-align:center;">
                    <div class="text-sm" style="color:var(--text-secondary);">${feeDisplay}</div>
                </div>
                <div style="flex:0 0 auto;text-align:center;">
                    <div class="flex items-center justify-center">
                        <button class="edit-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-student" data-id="${this.utils.escapeHtml(id)}">
                            <i data-lucide="square-pen" class="inline-block" style="width:18px;height:18px;color:var(--color-success);"></i>
                        </button>
                        <button class="delete-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-student" data-id="${this.utils.escapeHtml(id)}">
                            <i data-lucide="trash-2" class="inline-block" style="width:18px;height:18px;color:var(--color-danger);"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 重置学生列表缓存
     */
    resetStudentCache() {
        this._cachedStudents = null;
        this._lastSearchTerm = '';
    }
}