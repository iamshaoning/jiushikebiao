/**
 * 日期工具
 *
 * @description 时间转换、结束时间计算、课程时长计算、时间选择器逻辑等日期相关工具函数
 * @module dateUtils
 */
import { registry } from '../core/registry.js';

const dateUtils = {
    timeToMins: (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const parts = timeStr.split(':');
        if (parts.length < 2) return 0;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return 0;
        return h * 60 + m;
    },
    
    formatLocalTime: (timeInput) => {
        if (!timeInput) return '无数据';
        
        let date;
        if (typeof timeInput === 'string') {
            // 安全检查：如果包含 T，且没有 Z，且不包含 +08:00 这种时区后缀，才安全地加上 Z
            if (timeInput.includes('T') && !timeInput.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(timeInput)) {
                timeInput += 'Z';
            }
            date = new Date(timeInput);
        } else {
            date = new Date(timeInput);
        }

        if (isNaN(date.getTime())) return timeInput;

        // 关键：利用浏览器原生的 toLocaleString，它会自动把 UTC 转为当前系统时区
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },
    
    formatDate: (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    getTimestamp: (timestamp) => {
        if (!timestamp) return 0;
        let date;
        
        // 确保时间戳被正确解析
        if (typeof timestamp === 'string') {
            // 检查是否是YYYY/MM/DD HH:mm:ss格式的本地时间字符串
            if (timestamp.includes(' ') && timestamp.includes(':') && timestamp.includes('/')) {
                // 本地时间格式，解析为本地时间
                date = new Date(timestamp);
            } else if (timestamp.includes('T') && !timestamp.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(timestamp)) {
                date = new Date(timestamp + 'Z');
            } else {
                // 其他格式，尝试解析
                date = new Date(timestamp);
            }
        } else {
            date = new Date(timestamp);
        }
        
        return isNaN(date.getTime()) ? 0 : date.getTime();
    },
    
    calculateEndTime: (startId, endId, minutesToAdd) => {
        const startTimeInput = document.getElementById(startId);
        const endTimeInput = document.getElementById(endId);
        const durationInput = document.getElementById('course-duration');
        
        if (startTimeInput && endTimeInput) {
            const startTime = startTimeInput.value;
            if (startTime) {
                const [hours, minutes] = startTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes + (minutesToAdd || 0);
                const maxMinutes = 24 * 60;
                const finalMinutes = Math.min(totalMinutes, maxMinutes);
                
                const formatted = dateUtils.calculateEndTimeFromDuration(startTime, (minutesToAdd || 0));
                endTimeInput.value = formatted;
                
                if (finalMinutes === maxMinutes && durationInput) {
                    const availableDuration = maxMinutes - (hours * 60 + minutes);
                    durationInput.value = availableDuration;
                    if (registry.get('notificationService')) {
                        registry.get('notificationService').show('只能在当天排课', 'warning');
                    }
                }
                
                if (registry.get('utils')?.calculateFee) {
                    registry.get('utils').calculateFee();
                }
            }
        }
    },
    
    calculateEndTimeFromDuration: (startTime, duration) => {
        if (!startTime || typeof startTime !== 'string') return '';
        const actualDuration = duration ?? 60;
        const parts = startTime.split(':');
        if (parts.length < 2) return '';
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return '';
        const totalMinutes = hours * 60 + minutes + actualDuration;
        const maxMinutes = 24 * 60; // 1440分钟
        const finalMinutes = Math.min(totalMinutes, maxMinutes);
        
        if (finalMinutes === maxMinutes) {
            return '00:00';
        } else {
            const endHours = Math.floor(finalMinutes / 60);
            const endMinutes = finalMinutes % 60;
            return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        }
    },
    
    calculateDuration: (startTime, endTime) => {
        const durationInput = document.getElementById('course-duration');
        if (durationInput) {
            const inputValue = parseInt(durationInput.value);
            if (!isNaN(inputValue) && inputValue > 0 && inputValue <= 240) {
                return inputValue;
            }
        }
        if (startTime && endTime) {
            const startMins = dateUtils.timeToMins(startTime);
            const endMins = dateUtils.timeToMins(endTime);
            if (endMins > startMins) return endMins - startMins;
        }
        return 120;
    }
};

export { dateUtils };
export default dateUtils;
