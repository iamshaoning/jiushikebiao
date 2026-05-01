/**
 * 日期时间处理模块
 * 提供时间转换、计算等工具函数
 * 
 * @module dateUtils
 * @exports dateUtils
 */
const dateUtils = {
    timeToMins: (timeStr, duration = 0) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m + Number(duration);
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
    
    getTimestamp: (timestamp) => {
        if (!timestamp) return 0;
        let date;
        
        // 确保时间戳被正确解析
        if (typeof timestamp === 'string') {
            // 检查是否是YYYY/MM/DD HH:mm:ss格式的本地时间字符串
            if (timestamp.includes(' ') && timestamp.includes(':') && timestamp.includes('/')) {
                // 本地时间格式，解析为本地时间
                date = new Date(timestamp);
            } else if (timestamp.includes('T') && !timestamp.endsWith('Z')) {
                // 如果没有Z标识，手动添加，确保解析为UTC时间
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
                const totalMinutes = hours * 60 + minutes + minutesToAdd;
                
                // 限制结束时间不超过24:00
                const maxMinutes = 24 * 60; // 1440分钟
                const finalMinutes = Math.min(totalMinutes, maxMinutes);
                
                if (finalMinutes === maxMinutes) {
                    // 达到24:00，使用00:00表示
                    endTimeInput.value = '00:00';
                    
                    // 显示通知
                    if (typeof window.notificationService !== 'undefined') {
                        window.notificationService.show('只能在当天排课', 'warning');
                    }
                    
                    // 计算可设置的时长并自动填写
                    if (durationInput) {
                        const availableDuration = maxMinutes - (hours * 60 + minutes);
                        durationInput.value = availableDuration;
                    }
                } else {
                    const endHours = Math.floor(finalMinutes / 60);
                    const endMinutes = finalMinutes % 60;
                    const formattedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                    endTimeInput.value = formattedEndTime;
                }
                
                // 触发费用计算
                setTimeout(() => {
                    if (typeof window.utils?.calculateFee === 'function') {
                        window.utils.calculateFee();
                    }
                }, 10);
            }
        }
    },
    
    calculateEndTimeFromDuration: (startTime, duration) => {
        if (!startTime || !duration) return '00:00';
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
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
        // 优先从课程时长输入框获取（如果有的话）
        const durationInput = document.getElementById('course-duration');
        if (durationInput) {
            const inputValue = parseInt(durationInput.value);
            if (!isNaN(inputValue) && inputValue > 0 && inputValue <= 240) {
                return inputValue;
            }
        }
        return 120; // 默认2小时
    },
    
    adjustTime: (timeId, minutesToAdd) => {
        const timeInput = document.getElementById(timeId);
        if (timeInput) {
            const time = timeInput.value;
            if (time) {
                let [hours, minutes] = time.split(':').map(Number);
                
                // 处理00:00（表示24:00）的情况
                if (time === '00:00') {
                    hours = 24;
                    minutes = 0;
                }
                
                let totalMinutes = hours * 60 + minutes + minutesToAdd;
                
                // 限制总分钟数在有效范围内（0-1440）
                totalMinutes = Math.max(0, Math.min(totalMinutes, 1440));
                
                if (totalMinutes === 1440) {
                    // 达到24:00，使用00:00表示
                    timeInput.value = '00:00';
                } else {
                    const endHours = Math.floor(totalMinutes / 60);
                    const endMinutes = totalMinutes % 60;
                    const formattedTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                    timeInput.value = formattedTime;
                }
                
                // 触发费用计算
                setTimeout(() => {
                    if (typeof window.utils?.calculateFee === 'function') {
                        window.utils.calculateFee();
                    }
                }, 10);
            }
        }
    }
};

export { dateUtils };
export default dateUtils;
