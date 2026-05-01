/**
 * 课程操作服务模块
 * 处理课程标签点击事件，显示操作按钮组（编辑、复制、删除）
 */

class CourseActionService {
    constructor(elements, lucide) {
        this.elements = elements;
        this.lucide = lucide;
    }

    /**
     * 处理课程标签点击事件
     * @param {HTMLElement} element - 课程标签元素
     * @param {string} courseId - 课程ID
     * @param {MouseEvent} event - 鼠标事件
     */
    handleCourseClick(element, courseId, event) {
        if (event && event.button !== 0) {
            return;
        }

        element.classList.add('is-selected');
        this.showActionButtons(element, courseId);
    }

    /**
     * 显示操作按钮组
     * @param {HTMLElement} element - 课程标签元素
     * @param {string} courseId - 课程ID
     */
    showActionButtons(element, courseId) {
        if (!element.querySelector('.course-action-group')) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'course-action-group flex items-center space-x-1 transform translate-x-full opacity-0 transition-all duration-300';
            btnGroup.style.position = 'absolute';
            btnGroup.style.right = '4px';
            btnGroup.style.bottom = '4px';
            btnGroup.style.zIndex = '10';

            btnGroup.innerHTML = `
                <div data-action="edit-course" data-id="${courseId}" class="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-600 active:bg-blue-700 active:scale-95">
                    <i data-lucide="square-pen" class="text-[10px] pointer-events-none inline-block" style="width: 10px; height: 10px;"></i>
                </div>
                <div data-action="copy-course" data-id="${courseId}" class="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-green-600 active:bg-green-700 active:scale-95">
                    <i data-lucide="copy" class="text-[10px] pointer-events-none inline-block" style="width: 10px; height: 10px;"></i>
                </div>
                <div data-action="delete-course" data-id="${courseId}" class="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-red-600 active:bg-red-700 active:scale-95">
                    <i data-lucide="trash-2" class="text-[10px] pointer-events-none inline-block" style="width: 10px; height: 10px;"></i>
                </div>
            `;

            element.style.position = 'relative';
            element.appendChild(btnGroup);

            if (this.lucide) {
                this.lucide.createIcons();
            }

            setTimeout(() => {
                btnGroup.style.transform = 'translateX(0)';
                btnGroup.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * 隐藏操作按钮组
     * @param {HTMLElement} element - 课程标签元素
     */
    hideActionButtons(element) {
        element.classList.remove('is-selected');
        const btnGroup = element.querySelector('.course-action-group');
        if (btnGroup) {
            btnGroup.style.transform = 'translateX(100%)';
            btnGroup.style.opacity = '0';
            setTimeout(() => {
                btnGroup.remove();
            }, 300);
        }
    }
}

export default CourseActionService;
