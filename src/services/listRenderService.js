/**
 * 列表渲染服务模块
 * 负责各种列表的渲染逻辑，包括学生列表、机构列表、年级列表等
 */

export class ListRenderService {
    constructor(state, elements, utils) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
        
        // 缓存变量
        this._cachedStudents = null;
        this._lastSearchTerm = '';
        this._virtualList = null;
        
        // 内部渲染方法
        this._renderStudentItem = (student) => {
            // 确保所有字段都有默认值
            const name = student.name || '未命名';
            const organization = student.organization || '未分配';
            const fees = student.fees || { '一对一': 0 };
            const id = student.id || '';
            
            // 生成一对一课时费显示HTML，格式为"多少元/多少分钟"，不显示小数
            const oneOnOneFee = fees['一对一'] || 0;
            const oneOnOneDuration = fees['一对一_duration'] || 120;
            const feeDisplay = `<div class="text-sm" style="color: var(--text-secondary);">${Math.round(oneOnOneFee)}元/${oneOnOneDuration}分钟</div>`;
            const orgColor = this.utils.generateColor(organization);
            const gradeColor = this.utils.generateColor(student.grade || '未设置');
            
            return `
                <div class="flex items-center p-4 border-b transition-colors" style="border-color: var(--border-color); background-color: var(--bg-secondary);">
                    <div class="w-1/4">
                        <div class="font-medium" style="color: var(--text-primary);">${this.utils.escapeHtml(name)}</div>
                    </div>
                    <div class="w-1/4">
                        <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${orgColor} 20%, transparent); color: ${orgColor};">
                            ${this.utils.escapeHtml(organization)}
                        </span>
                    </div>
                    <div class="w-1/4">
                        <span class="px-2 py-1 text-xs font-medium rounded-full" style="background-color: color-mix(in srgb, ${gradeColor} 20%, transparent); color: ${gradeColor};">
                            ${this.utils.escapeHtml(student.grade || '未设置')}
                        </span>
                    </div>
                    <div class="w-1/4 text-center">
                        ${feeDisplay}
                    </div>
                    <div class="w-1/4 flex items-center justify-center">
                        <button class="edit-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-2 hover:scale-110 active:scale-95 transition-transform" data-action="edit-student" data-id="${this.utils.escapeHtml(id)}">
                            <i data-lucide="square-pen" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                        </button>
                        <button class="delete-student w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform" data-action="delete-student" data-id="${this.utils.escapeHtml(id)}">
                            <i data-lucide="trash-2" class="text-lg inline-block" style="width: 18px; height: 18px; color: var(--color-danger);"></i>
                        </button>
                    </div>
                </div>
            `;
        };
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
                const lowerSearchTerm = searchTerm.toLowerCase();
                filteredStudents = filteredStudents.filter(student => {
                    const nameMatch = student.name && student.name.toLowerCase().includes(lowerSearchTerm);
                    const orgMatch = student.organization && student.organization.toLowerCase().includes(lowerSearchTerm);
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
            filteredStudents = searchTerm ? 
                this.state.students.filter(student => {
                    const lowerSearchTerm = searchTerm.toLowerCase();
                    const nameMatch = student.name && student.name.toLowerCase().includes(lowerSearchTerm);
                    const orgMatch = student.organization && student.organization.toLowerCase().includes(lowerSearchTerm);
                    return nameMatch || orgMatch;
                }).sort((a, b) => {
                    const nameA = a.name || '';
                    const nameB = b.name || '';
                    return nameA.localeCompare(nameB);
                }) : 
                this._cachedStudents;
        }
        
        // 渲染学生列表
        if (filteredStudents.length === 0) {
            studentsList.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-10 text-center" style="color: var(--text-secondary);">
                        <i data-lucide="user-round-x" style="display: block; margin-left: auto; margin-right: auto;" class="text-4xl mb-2"></i>
                        <p>暂无学生信息</p>
                    </td>
                </tr>
            `;

            // 重新初始化 Lucide 图标
            if (window.lucide) {
                lucide.createIcons();
            }
            return;
        }
        
        // 检查是否有 VirtualList 库
        if (typeof VirtualList !== 'undefined' && filteredStudents.length > 50) {
            // 对于大型列表使用虚拟滚动
            // 销毁旧的虚拟列表
            if (this._virtualList) {
                this._virtualList.container.innerHTML = '';
            }
            
            // 创建新的虚拟列表
            this._virtualList = new VirtualList({
                container: studentsList,
                items: filteredStudents,
                itemHeight: 80,
                renderItem: (student) => this._renderStudentItem(student)
            });
        } else {
            // 对于小型列表使用传统渲染
            // 销毁旧的虚拟列表
            if (this._virtualList) {
                this._virtualList.container.innerHTML = '';
                this._virtualList = null;
            }
            
            // 使用DocumentFragment减少DOM重排
            const fragment = document.createDocumentFragment();
            
            filteredStudents.forEach(student => {
                // 确保所有字段都有默认值
                const name = student.name || '未命名';
                const organization = student.organization || '未分配';
                const fees = student.fees || { '一对一': 0 };
                const id = student.id || '';
                
                // 生成一对一课时费显示HTML，格式为"多少元/多少分钟"，不显示小数
                const oneOnOneFee = fees['一对一'] || 0;
                const oneOnOneDuration = fees['一对一_duration'] || 120;
                const feeDisplay = `<div class="text-sm" style="color: var(--text-secondary);">${Math.round(oneOnOneFee)}元/${oneOnOneDuration}分钟</div>`;
                const orgColor = this.utils.generateColor(organization);
                const gradeColor = this.utils.generateColor(student.grade || '未设置');
                
                const tr = document.createElement('tr');
                tr.className = 'transition-colors';
                tr.style.backgroundColor = 'var(--bg-secondary)';
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

        // 重新初始化 Lucide 图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * 重置学生列表缓存
     */
    resetStudentCache() {
        this._cachedStudents = null;
        this._lastSearchTerm = '';
    }
}
