import coreUtils from './coreUtils.js';

const utils = {
    ...coreUtils,
    
    handleError: (error, context, showNotification = false) => {
        const errorMessage = typeof error === 'string' ? error : error.message || '未知错误';
        if (window.GLOBAL_DEBUG) console.error(`${context}:`, error);
        
        if (showNotification) {
            if (context === '登录失败') {
                window.notificationService?.show('登陆失败', 'error');
            } else if (context === '注册失败') {
                window.notificationService?.show('注册失败，请稍后重试', 'error');
            } else {
                window.notificationService?.show(errorMessage, 'error');
            }
        }
    },
    
    timeToMins: (timeStr, duration = 0) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m + Number(duration);
    },
    
    generateColor: (text) => {
        if (!text) return '#666666';
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `hsl(${h}, 65%, 45%)`;
    },
    
    getStatisticsParams: function() {
        const yearTrigger = document.querySelector('#statistics-year-wrapper .custom-select-trigger span');
        const monthTrigger = document.querySelector('#statistics-month-wrapper .custom-select-trigger span');
        const orgTrigger = document.querySelector('#statistics-organization-trigger span');
        
        return {
            year: parseInt(yearTrigger?.textContent) || new Date().getFullYear(),
            month: parseInt(monthTrigger?.textContent) || new Date().getMonth(),
            organization: orgTrigger?.textContent || ''
        };
    },
    
    withTimeout: async (promiseFn, timeout = 10000, timeoutMessage = '操作超时') => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeout);
        });
        try {
            const result = await Promise.race([promiseFn(), timeoutPromise]);
            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },
    
    formatLocalTime: (timeInput) => {
        if (!timeInput) return '';
        if (typeof timeInput === 'string' && timeInput.includes('T')) {
            const date = new Date(timeInput);
            const h = date.getHours().toString().padStart(2, '0');
            const m = date.getMinutes().toString().padStart(2, '0');
            return `${h}:${m}`;
        }
        return timeInput;
    },
    
    getTimestamp: (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    
    checkTimeConflict: (newCourse) => {
        const courses = window.state.courses;
        const newStartMins = utils.timeToMins(newCourse.startTime);
        const newEndMins = newStartMins + Number(newCourse.duration || 120);
        
        for (const course of courses) {
            if (course.date === newCourse.date && course.id !== newCourse.id) {
                const existStartMins = utils.timeToMins(course.startTime);
                const existEndMins = existStartMins + Number(course.duration || 120);
                
                if (Math.max(newStartMins, existStartMins) < Math.min(newEndMins, existEndMins)) {
                    return true;
                }
            }
        }
        return false;
    },
    
    calculateEndTime: (startId, endId, minutesToAdd) => {
        const startInput = document.getElementById(startId);
        const endInput = document.getElementById(endId);
        if (!startInput || !endInput) return;
        
        const time = startInput.value;
        if (!time) return;
        
        const [hours, minutes] = time.split(':').map(Number);
        const totalMins = hours * 60 + minutes + Number(minutesToAdd || 120);
        const endHours = Math.floor(totalMins / 60) % 24;
        const endMinutes = totalMins % 60;
        
        endInput.value = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    },
    
    calculateEndTimeFromDuration: (startTime, duration) => {
        if (!startTime) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMins = hours * 60 + minutes + Number(duration || 120);
        const endHours = Math.floor(totalMins / 60) % 24;
        const endMinutes = totalMins % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    },
    
    calculateDuration: (startTime, endTime) => {
        if (!startTime || !endTime) return 120;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
    },
    
    calculateFee: () => {
        const studentButtons = document.getElementById('student-buttons');
        if (!studentButtons) return;
        
        const selectedStudents = studentButtons.querySelectorAll('.student-btn.selected');
        const durationInput = document.getElementById('course-duration');
        const lessonTypeInputs = document.querySelectorAll('input[name="lesson-type"]:checked');
        const feeInput = document.getElementById('course-fee');
        
        if (selectedStudents.length === 0) {
            if (feeInput) feeInput.value = '';
            return;
        }
        
        const duration = parseInt(durationInput?.value) || 120;
        const lessonType = lessonTypeInputs[0]?.value || '一对一';
        
        let totalFee = 0;
        selectedStudents.forEach(btn => {
            const studentId = btn.dataset.studentId;
            const student = window.state.students.find(s => s.id === studentId);
            if (student) {
                const fee = student.fees?.[lessonType] || 0;
                totalFee += fee;
            }
        });
        
        if (feeInput) {
            feeInput.value = totalFee;
        }
    },
    
    adjustTime: (timeId, minutesToAdd) => {
        const timeInput = document.getElementById(timeId);
        if (!timeInput || !timeInput.value) return;
        
        const [hours, minutes] = timeInput.value.split(':').map(Number);
        const totalMins = hours * 60 + minutes + Number(minutesToAdd);
        const newHours = Math.floor(totalMins / 60) % 24;
        const newMinutes = totalMins % 60;
        
        timeInput.value = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    },
    
    closeAllSelectDropdowns: () => {
        document.querySelectorAll('.custom-select-options.open').forEach(options => {
            options.classList.remove('open');
            options.parentElement.querySelector('.custom-select-trigger')?.classList.remove('active');
        });
    },
    
    getCustomSelectValue: (wrapperId) => {
        const container = document.getElementById(wrapperId);
        if (container) {
            const selectedOption = container.querySelector('.custom-option.selected');
            return selectedOption ? selectedOption.dataset.value : '';
        }
        return '';
    },
    
    setCustomSelectValue: (wrapperId, value) => {
        const container = document.getElementById(wrapperId);
        if (container) {
            const trigger = container.querySelector('.custom-select-trigger');
            const option = container.querySelector(`.custom-option[data-value="${value}"]`);
            
            if (trigger && option) {
                const triggerText = trigger.querySelector('span');
                if (triggerText) {
                    triggerText.textContent = option.textContent;
                } else {
                    trigger.textContent = option.textContent;
                }
                
                container.querySelectorAll('.custom-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            }
        }
    }
};

export { utils };
export default utils;