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
        // 校验布局合法性，避免 localStorage 被篡改导致后续逻辑出错
        const validLayouts = ['single', 'double', 'triple'];
        const savedLayout = localStorage.getItem('studentListLayout');
        this._layout = validLayouts.includes(savedLayout) ? savedLayout : 'single';
        
    }

    /**
     * 获取当前布局模式
     */
    getLayout() {
        return this._layout;
    }

    /**
     * 设置布局模式
     * @param {string} layout - 'single' | 'double' | 'triple'
     */
    setLayout(layout) {
        this._layout = layout;
        localStorage.setItem('studentListLayout', layout);
        // 同步按钮状态
        const btn = document.querySelector('#student-layout-toggle .student-layout-btn');
        if (btn) {
            btn.dataset.layout = layout;
            btn.textContent = { single: '1列', double: '2列', triple: '3列' }[layout];
            btn.classList.toggle('active', layout !== 'single');
        }
        this.resetStudentCache();
        this.students();
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
            
            // 更新缓存状态：仅在无搜索词时缓存完整列表
            // 有搜索词时不更新 _cachedStudents，避免下次相同搜索词命中错误缓存
            this._lastSearchTerm = searchTerm;
        } else {
            // 使用缓存的结果
            filteredStudents = this._cachedStudents;
        }
        
        // 渲染学生列表
        if (filteredStudents.length === 0) {
            this._hideMultiColContainer();
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

        // 多列布局模式
        if (this._layout === 'double' || this._layout === 'triple') {
            this._renderMultiColumn(filteredStudents);
            return;
        }

        // 单列模式 — 先恢复表格容器显示
        this._hideMultiColContainer();

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
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${feeDisplay}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex items-center">
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
                <div style="flex:1;min-width:0;">
                    <div class="text-sm" style="color:var(--text-secondary);">${feeDisplay}</div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="flex items-center">
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
     * 隐藏多列容器，恢复表格显示
     */
    _hideMultiColContainer() {
        const multiCol = document.getElementById('students-multi-col-container');
        if (multiCol) {
            multiCol.classList.remove('active');
            // 清理 innerHTML，避免隐藏的 DOM 残留干扰选择器查询和内存占用
            multiCol.innerHTML = '';
        }
        if (this._virtualList) {
            this._virtualList.destroy();
            this._virtualList = null;
        }
        const vlistContainer = document.getElementById('students-virtual-container');
        if (vlistContainer) vlistContainer.style.display = 'none';
        const tableWrapper = this.elements.studentsList.closest('.rounded-xl');
        if (tableWrapper) tableWrapper.style.display = '';
    }

    /**
     * 渲染多列布局（按机构分组）
     */
    _renderMultiColumn(students) {
        const studentsList = this.elements.studentsList;
        
        // 隐藏表格和虚拟列表（同时隐藏外层 wrapper 避免出现灰色边框线）
        const tableWrapper = studentsList.closest('.rounded-xl');
        if (tableWrapper) tableWrapper.style.display = 'none';
        const vlistContainer = document.getElementById('students-virtual-container');
        if (vlistContainer) vlistContainer.style.display = 'none';
        if (this._virtualList) {
            this._virtualList.destroy();
            this._virtualList = null;
        }

        // 获取或创建多列容器
        let multiCol = document.getElementById('students-multi-col-container');
        if (!multiCol) {
            multiCol = document.createElement('div');
            multiCol.id = 'students-multi-col-container';
            if (tableWrapper) {
                tableWrapper.insertAdjacentElement('afterend', multiCol);
            } else {
                studentsList.parentElement.insertAdjacentElement('afterend', multiCol);
            }
        }
        multiCol.classList.add('active');

        // 按机构分组
        const groups = {};
        students.forEach(s => {
            const org = s.organization || '未分配';
            if (!groups[org]) groups[org] = [];
            groups[org].push(s);
        });

        // 对分组键排序
        const sortedOrgs = Object.keys(groups).sort((a, b) => a.localeCompare(b));

        const colsClass = this._layout === 'triple' ? 'cols-3' : 'cols-2';
        
        let html = `<div class="students-grid ${colsClass}">`;
        
        sortedOrgs.forEach(org => {
            const orgStudents = groups[org];
            const orgColor = this.utils.generateColor(org, 'organization');
            
            html += `<div class="student-org-group">`;
            html += `<div class="student-org-group-header">`;
            html += `<span class="px-2 py-0.5 text-xs font-medium rounded-full" style="background-color:color-mix(in srgb,${orgColor} 20%,transparent);color:${orgColor};">${this.utils.escapeHtml(org)}</span>`;
            html += `<span class="org-count">${orgStudents.length}人</span>`;
            html += `</div>`;
            html += `<div class="student-org-group-body">`;
            
            orgStudents.forEach(student => {
                html += this._renderStudentCard(student);
            });
            
            html += `</div></div>`;
        });
        
        html += `</div>`;
        multiCol.innerHTML = html;

        // 初始化 Lucide 图标
        if (registry.get('lucide')) {
            registry.get('lucide').createIcons({ nodes: [multiCol] });
        }

        // 恢复多选状态
        const ed = registry.get('eventDispatcherService');
        if (ed && ed._selectedStudentIds && ed._selectedStudentIds.size > 0) {
            const cards = multiCol.querySelectorAll('.student-card');
            cards.forEach(card => {
                if (ed._selectedStudentIds.has(card.dataset.studentId)) {
                    card.classList.add('student-selected');
                }
            });
            ed._updateStudentMultiSelectUI();
        }
    }

    /**
     * 渲染单个学生卡片（多列模式）
     */
    _renderStudentCard(student) {
        const name = student.name || '未命名';
        const fees = student.fees ?? { '一对一': 0 };
        const oneOnOneFee = fees['一对一'] ?? 0;
        const oneOnOneDuration = fees['一对一_duration'] ?? 120;
        const id = student.id || '';
        const gradeColor = this.utils.generateColor(student.grade || '未设置', 'grade');

        return `
            <div class="student-card" data-student-id="${this.utils.escapeHtml(id)}">
                <span class="student-card-name">${this.utils.escapeHtml(name)}</span>
                <span class="px-2 py-0.5 text-xs font-medium rounded-full justify-self-center" style="background-color:color-mix(in srgb,${gradeColor} 20%,transparent);color:${gradeColor};">${this.utils.escapeHtml(student.grade || '未设置')}</span>
                <span class="student-card-fee justify-self-center">${Math.round(oneOnOneFee)}元/${oneOnOneDuration}分钟</span>
                <div class="student-card-actions">
                    <button class="edit-student" data-action="edit-student" data-id="${this.utils.escapeHtml(id)}" title="编辑">
                        <i data-lucide="square-pen" style="width:16px;height:16px;color:var(--color-success);"></i>
                    </button>
                    <button class="delete-student" data-action="delete-student" data-id="${this.utils.escapeHtml(id)}" title="删除">
                        <i data-lucide="trash-2" style="width:16px;height:16px;color:var(--color-danger);"></i>
                    </button>
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