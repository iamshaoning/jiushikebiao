/**
 * 课程表单模板生成器
 */
export function getCourseFormTemplate(isEdit, data = {}) {
    const title = isEdit ? '编辑课程' : '添加课程';
    const idInput = isEdit ? `<input type="hidden" id="edit-course-id" value="${data.id}">` : '';
    const dateVal = data.date || '';
    const lessonType = data.lessonType || '一对一';
    const startTimeVal = data.startTime || '00:00';
    const noteVal = data.note || '';
    const feeVal = (data.fees && data.fees[0] !== undefined) ? data.fees[0] : '';

    return `
        <div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);">
            <div class="p-6">
                <div class="mb-4"><h3 class="text-lg font-semibold" style="color: var(--text-primary);">${title}</h3></div>
                <div id="${isEdit ? 'edit-course-form' : 'add-course-form'}">
                    ${idInput}
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">日期</label>
                        <div class="relative">
                            <div class="relative border rounded-md overflow-hidden cursor-pointer" data-action="toggle-date-picker" data-target="course-date-container" style="border-color: var(--border-color); background-color: var(--bg-input);">
                                <input type="text" id="course-date" value="${dateVal}" class="w-full px-3 py-2 border-0 pr-10" style="background-color: var(--bg-input); color: var(--text-primary);" readonly>
                                <button type="button" class="absolute right-0 top-0 h-full px-3 flex items-center justify-center" style="color: var(--text-secondary);">
                                    <i class="fa fa-calendar"></i>
                                </button>
                            </div>
                            ${utils.createDatePickerTemplate('course-date-container', 'course-date')}
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">课型</label>
                        <div class="flex space-x-4">
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="course-lesson-type" value="一对一" ${lessonType === '一对一' ? 'checked' : ''} class="mr-2">
                                <span style="color: var(--text-primary);">一对一课型</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="course-lesson-type" value="多人课" ${lessonType === '多人课' ? 'checked' : ''} class="mr-2">
                                <span style="color: var(--text-primary);">多人课</span>
                            </label>
                        </div>
                    </div>

                    <div class="mb-4" id="student-selection-area" style="background-color: var(--bg-secondary);"></div>
                    <div class="mb-4" id="course-fee-container" style="display: ${isEdit ? 'block' : 'none'};">
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">本节课费用</label>
                        <div class="relative">
                            <input type="number" id="course-fee" min="0" step="0.01" value="${feeVal}" class="w-full px-3 py-2 pr-10 border rounded-md appearance-none" style="border-color: var(--border-color); background-color: var(--bg-input); color: var(--text-primary);">
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style="color: var(--text-secondary);">元</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">开始时间</label>
                            <div class="relative">
                                <div class="relative border rounded-md overflow-hidden cursor-pointer" data-action="toggle-time-picker" data-target="start-time-container" style="border-color: var(--border-color); background-color: var(--bg-input);">
                                    <input type="time" id="course-start-time" value="${startTimeVal}" data-action="course-time-change" class="w-full px-3 py-2 border-0 pr-10" style="background-color: var(--bg-input); color: var(--text-primary);">
                                    <button type="button" class="absolute right-0 top-0 h-full px-3 flex items-center justify-center" style="color: var(--text-secondary);">
                                        <i class="fa fa-clock-o"></i>
                                    </button>
                                </div>
                                ${utils.createTimePickerTemplate('start-time-container', 'course-start-time')}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">时长</label>
                            <div class="relative">
                                <div class="relative border rounded-md overflow-hidden" data-action="toggle-duration-dropdown" style="border-color: var(--border-color); background-color: var(--bg-input);">
                                    <input type="number" id="course-duration" value="${data.duration || 120}" class="w-full px-3 py-2 border-0 pr-16 cursor-pointer" style="background-color: var(--bg-input); color: var(--text-primary);">
                                    <span class="absolute right-2 top-0 h-full flex items-center" style="color: var(--text-secondary);">分钟</span>
                                </div>
                                <div id="duration-dropdown" class="absolute z-50 mt-1 w-full border rounded-md shadow-lg hidden" style="border-color: var(--border-color); background-color: var(--bg-secondary);">
                                    <div class="py-1">
                                        <button type="button" class="block w-full text-left px-4 py-2 text-sm" data-action="select-duration" data-duration="60" style="color: var(--text-primary); background-color: var(--bg-secondary);">60分钟</button>
                                        <button type="button" class="block w-full text-left px-4 py-2 text-sm" data-action="select-duration" data-duration="90" style="color: var(--text-primary); background-color: var(--bg-secondary);">90分钟</button>
                                        <button type="button" class="block w-full text-left px-4 py-2 text-sm" data-action="select-duration" data-duration="120" style="color: var(--text-primary); background-color: var(--bg-secondary);">120分钟</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">结束时间</label>
                            <div class="relative">
                                <div class="relative border rounded-md overflow-hidden" style="border-color: var(--border-color); background-color: var(--bg-input2);">
                                    <input type="time" id="course-end-time" value="" class="w-full px-3 py-2 border-0 pr-10 cursor-default pointer-events-none" style="background-color: var(--bg-input2); color: var(--text-secondary);" readonly disabled>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">备注</label>
                        <textarea id="course-note" rows="2" class="w-full px-3 py-2 border rounded-md" style="border-color: var(--border-color); background-color: var(--bg-input); color: var(--text-primary);">${noteVal}</textarea>
                    </div>
                    <div class="flex justify-end">
                        <button type="button" class="close-modal px-4 py-2 rounded-lg mr-2" style="background-color: var(--color-danger); color: white;">关闭</button>
                        <button type="button" id="${isEdit ? 'save-course' : 'add-course-save'}" class="px-4 py-2 rounded-lg" style="background-color: var(--color-primary); color: white;">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 添加到全局
if (window && window.utils) {
    window.utils.getCourseFormTemplate = getCourseFormTemplate;
}