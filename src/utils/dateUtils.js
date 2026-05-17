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
    
    getTimestamp: (timestamp) => {
        if (!timestamp) return 0;
        let date;
        
        if (typeof timestamp === 'string') {
            if (timestamp.includes(' ') && timestamp.includes(':') && timestamp.includes('/')) {
                date = new Date(timestamp);
            } else if (timestamp.includes('T') && !timestamp.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(timestamp)) {
                date = new Date(timestamp + 'Z');
            } else {
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
        const actualDuration = duration ?? 120;
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
    }
};

export default dateUtils;
