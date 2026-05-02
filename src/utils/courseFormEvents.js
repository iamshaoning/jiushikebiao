/**
 * 课程表单事件初始化模块
 */
export function initCourseFormEvents(isEdit, courseData = null) {
    // 更新学生选择区域
    const updateStudentSelection = () => {
        const lessonTypeElement = document.querySelector('input[name="course-lesson-type"]:checked');
        if (!lessonTypeElement) return;
        
        const lessonType = lessonTypeElement.value;
        
        // 清空学生选择
        document.querySelectorAll('.student-btn').forEach(btn => {
            btn.classList.remove('selected', 'bg-opacity-40');
            btn.style.backgroundColor = 'transparent';
        });
        
        // 始终显示费用输入框
        const courseFeeContainer = document.getElementById('course-fee-container');
        if (courseFeeContainer) {
            courseFeeContainer.style.display = 'block';
        }
        
        // 重置费用输入框并设置禁用状态
        const courseFee = document.getElementById('course-fee');
        if (courseFee) {
            courseFee.value = '';
            courseFee.disabled = (lessonType === '一对一');
            if (lessonType === '一对一') {
                courseFee.style.backgroundColor = 'var(--bg-content)';
                courseFee.classList.add('cursor-default');
            } else {
                courseFee.style.backgroundColor = '';
                courseFee.classList.remove('cursor-default');
            }
        }
        
        // 显示所有学生，不按课型筛选
        let filteredStudents = [...window.state.students];
        
        // 按机构、年级、姓名拼音排序
        filteredStudents.sort((a, b) => {
            const orgA = a.organization || '';
            const orgB = b.organization || '';
            const gradeA = a.grade || '';
            const gradeB = b.grade || '';
            const nameA = a.name || '';
            const nameB = b.name || '';
            
            const orgCompare = orgA.localeCompare(orgB);
            if (orgCompare !== 0) return orgCompare;
            
            const gradeCompare = gradeA.localeCompare(gradeB);
            if (gradeCompare !== 0) return gradeCompare;
            
            return nameA.localeCompare(nameB);
        });
        
        const studentSelectionArea = document.getElementById('student-selection-area');
        if (studentSelectionArea) {
            if (filteredStudents.length === 0) {
                studentSelectionArea.innerHTML = `
                    <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">学生</label>
                    <div class="text-sm p-3 border rounded-md" style="color: var(--text-secondary); border-color: var(--border-color); background-color: var(--bg-secondary);">
                        暂无学生，请先添加学生
                    </div>
                `;
            } else {
                studentSelectionArea.innerHTML = `
                    <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">${lessonType === '一对一' ? '点击选择一位学生' : '点击可选多位学生'}</label>
                    <div class="border rounded-md p-3" style="border-color: var(--border-color); background-color: var(--bg-secondary);">
                        <div class="flex flex-wrap gap-2" id="student-buttons">
                            ${filteredStudents.map(student => {
                                let isSelected = false;
                                if (isEdit && courseData && courseData.studentIds && Array.isArray(courseData.studentIds)) {
                                    isSelected = courseData.studentIds.includes(student.id);
                                }
                                const color = window.utils.generateColor(student.organization);
                                const studentFees = student.fees || { '一对一': 0 };
                                const fee = lessonType === '一对一' ? (studentFees['一对一'] || 0) : 0;
                                return `
                                    <button type="button" class="student-btn px-3 py-1 rounded-full text-sm border-2 transition-all duration-200 ${isSelected ? 'selected bg-opacity-40' : ''}" 
                                            data-id="${student.id}" 
                                            data-name="${window.utils.escapeHtml(student.name)}" 
                                            data-organization="${window.utils.escapeHtml(student.organization)}" 
                                            data-grade="${window.utils.escapeHtml(student.grade || '未设置')}" 
                                            data-color="${color}"
                                            data-fee="${fee}"
                                            data-lesson-type="${lessonType}"
                                            style="border-color: ${color}; color: ${color}; background-color: ${isSelected ? `${color}40` : 'transparent'};"
                                    >${window.utils.escapeHtml(student.name)}</button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }
    };
    
    // 初始化学生选择区域
    updateStudentSelection();
    
    // 事件委托：处理学生选择按钮点击
    const bindStudentButtonEvents = () => {
        const studentButtonsContainer = document.getElementById('student-buttons');
        if (studentButtonsContainer) {
            // 先移除之前的事件监听器，避免重复绑定
            if (studentButtonsContainer._clickHandler) {
                studentButtonsContainer.removeEventListener('click', studentButtonsContainer._clickHandler);
            }
            
            const clickHandler = function(e) {
                const btn = e.target.closest('.student-btn');
                if (!btn) return;
                
                const lessonType = btn.dataset.lessonType;
                const color = btn.dataset.color;
                
                if (lessonType === '一对一') {
                    document.querySelectorAll('.student-btn').forEach(b => {
                        b.classList.remove('selected', 'bg-opacity-40');
                        b.style.backgroundColor = 'transparent';
                    });
                    btn.classList.add('selected', 'bg-opacity-40');
                    btn.style.backgroundColor = color + '40';
                    
                    if (isEdit) {
                        setTimeout(() => {
                            if (typeof window.utils.calculateFee === 'function') {
                                window.utils.calculateFee();
                            }
                        }, 10);
                    } else {
                        const durationInput = document.getElementById('course-duration');
                        const actualDuration = durationInput ? (parseInt(durationInput.value) || 120) : 120;
                        const studentFees = window.state.students.find(s => s.id === btn.dataset.id)?.fees || {};
                        const studentBaseFee = studentFees['一对一'] || parseFloat(btn.dataset.fee) || 0;
                        const studentBaseDuration = studentFees['一对一_duration'] || 120;
                        const calculatedFee = (studentBaseFee / studentBaseDuration) * actualDuration;
                        const feeInput = document.getElementById('course-fee');
                        if (feeInput) {
                            feeInput.value = calculatedFee.toFixed(2);
                        }
                    }
                } else {
                    const selectedStudents = document.querySelectorAll('.student-btn.selected');
                    const currentOrganization = btn.dataset.organization;
                    const currentGrade = btn.dataset.grade;
                    
                    let organizationMatch = true;
                    let gradeMatch = true;
                    selectedStudents.forEach(selectedBtn => {
                        if (selectedBtn.dataset.organization !== currentOrganization) {
                            organizationMatch = false;
                        }
                        if (selectedBtn.dataset.grade !== currentGrade) {
                            gradeMatch = false;
                        }
                    });
                    
                    if (!organizationMatch) {
                        if (typeof window.notificationService !== 'undefined') {
                            window.notificationService.show('多人课只能选择同一机构的学生', 'warning');
                        }
                    } else if (!gradeMatch) {
                        if (typeof window.notificationService !== 'undefined') {
                            window.notificationService.show('多人课只能选择同一年级的学生', 'warning');
                        }
                    } else {
                        btn.classList.toggle('selected');
                        btn.classList.toggle('bg-opacity-40');
                        btn.style.backgroundColor = btn.classList.contains('selected') ? color + '40' : 'transparent';
                    }
                }
            };
            
            studentButtonsContainer.addEventListener('click', clickHandler);
            studentButtonsContainer._clickHandler = clickHandler;
        }
    };
    
    bindStudentButtonEvents();
    
    // 初始化结束时间
    setTimeout(() => {
        const durationInput = document.getElementById('course-duration');
        const startTimeInput = document.getElementById('course-start-time');
        const endTimeInput = document.getElementById('course-end-time');
        
        if (durationInput && startTimeInput && endTimeInput) {
            let courseDuration = 120;
            if (isEdit && courseData) {
                courseDuration = courseData.duration || 120;
            }
            
            durationInput.value = courseDuration;
            
            if (startTimeInput.value) {
                const [hours, minutes] = startTimeInput.value.split(':').map(Number);
                const startTotalMinutes = hours * 60 + minutes;
                let endTotalMinutes = startTotalMinutes + courseDuration;
                
                const maxMinutes = 24 * 60;
                endTotalMinutes = Math.min(endTotalMinutes, maxMinutes);
                
                if (endTotalMinutes === maxMinutes) {
                    endTimeInput.value = '00:00';
                } else {
                    const endHours = Math.floor(endTotalMinutes / 60);
                    const endMinutes = endTotalMinutes % 60;
                    endTimeInput.value = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                }
            }
        }
    }, 50);
    
    // 绑定时长输入框变化事件
    const durationInput = document.getElementById('course-duration');
    if (durationInput) {
        durationInput.addEventListener('input', function() {
            const duration = parseInt(this.value);
            if (isNaN(duration) || duration < 15 || duration > 240) {
                return;
            }
            const startTime = document.getElementById('course-start-time')?.value;
            if (startTime && typeof window.utils.calculateEndTime === 'function') {
                window.utils.calculateEndTime('course-start-time', 'course-end-time', duration);
            }
            if (typeof window.utils.calculateFee === 'function') {
                window.utils.calculateFee();
            }
        });
    }
    
    // 监听课型变化
    document.querySelectorAll('input[name="course-lesson-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateStudentSelection();
            setTimeout(bindStudentButtonEvents, 10);
        });
    });
    
    // 加载课程中存储的费用数据（仅编辑模式）
    if (isEdit && courseData && courseData.fees && courseData.fees[0] !== undefined) {
        const courseFee = document.getElementById('course-fee');
        if (courseFee) {
            courseFee.value = courseData.fees[0];
        }
    }
    
    // 绑定时间输入框事件
    const courseStartTime = document.getElementById('course-start-time');
    if (courseStartTime) {
        courseStartTime.addEventListener('change', window.utils.calculateFee);
    }
    
    const courseEndTime = document.getElementById('course-end-time');
    if (courseEndTime) {
        courseEndTime.addEventListener('change', window.utils.calculateFee);
    }
    
    // 绑定费用输入框事件
    const courseFee = document.getElementById('course-fee');
    if (courseFee) {
        // 阻止回车键冒泡，避免触发表单提交
        courseFee.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        });
    }
}

// 添加到全局
if (window && window.utils) {
    window.utils.initCourseFormEvents = initCourseFormEvents;
}