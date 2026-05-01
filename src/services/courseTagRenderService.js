/**
 * 课程标签渲染服务模块
 * 负责生成课程标签的HTML结构
 */

class CourseTagRenderService {
    constructor(utils) {
        this.utils = utils;
    }

    /**
     * 生成课程标签HTML
     * @param {Object} course - 课程对象
     * @returns {string} - HTML字符串
     */
    getCourseTagHTML(course) {
        const primaryColor = course.colors[0] || 'var(--color-secondary)';
        return `
            <div class="course-tag-item course-item mt-1 rounded text-xs relative z-10"
                 data-action="course-click"
                 data-course-id="${course.id}"
                 style="--tag-theme-color: ${primaryColor}; background-color: color-mix(in srgb, ${primaryColor} 10%, transparent);">
                <div class="tag-content p-1">
                    <div class="flex flex-wrap gap-1 mb-1">
                        ${course.studentNames.map((name, index) => {
                            const color = course.colors[index] || 'var(--color-secondary)';
                            return `
                                <span class="px-1 py-0.5 rounded text-xs"
                                      style="background-color: color-mix(in srgb, ${color} 20%, transparent); color: ${color};">
                                    ${this.utils.escapeHtml(name)}
                                </span>
                            `;
                        }).join('')}
                    </div>
                    <div class="text-[10px]" style="color: var(--text-secondary);">${course.startTime} - ${this.utils.calculateEndTimeFromDuration(course.startTime, course.duration)}</div>
                    ${course.note ? `<div class="text-[9px] truncate" style="color: var(--text-secondary);">${this.utils.escapeHtml(course.note)}</div>` : ''}
                </div>
            </div>
        `;
    }
}

export default CourseTagRenderService;
