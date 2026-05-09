/**
 * 费用计算服务
 *
 * @description 根据课型和学生信息计算课程费用
 * @module feeCalculationService
 */
export class FeeCalculationService {
    constructor(state) {
        this.state = state;
    }

    /**
     * 根据课程时长计算费用
     * @param {Object} utils - 工具函数对象
     */
    calculateFee(utils) {
        // 检查当前课型
        const lessonType = document.querySelector('input[name="course-lesson-type"]:checked')?.value;
        if (lessonType !== '一对一') return; // 只对一对一课程计算费用

        const selectedStudents = Array.from(document.querySelectorAll('.student-btn.selected'));
        if (selectedStudents.length === 0) return;

        const studentId = selectedStudents[0].dataset.id;
        const student = this.state.students.find(s => s.id === studentId);
        if (!student) return;

        const studentFees = student.fees || {};
        const baseFee = studentFees['一对一'] || 0;
        // 使用 Math.max 确保分母永远至少是 1，防止 Infinity 错误
        const rawDuration = studentFees['一对一_duration'] || 120;
        const baseDuration = Math.max(1, rawDuration);
        const actualDuration = utils.calculateDuration();

        // 按学生预设时长的价格计算实际费用
        const calculatedFee = (baseFee / baseDuration) * actualDuration;

        const feeInput = document.getElementById('course-fee');
        if (feeInput) {
            feeInput.value = calculatedFee.toFixed(2);
        }
    }

    /**
     * 获取课程费用
     * @param {Object} course - 课程对象
     * @param {Object} student - 学生对象
     * @param {number} index - 学生在课程中的索引
     * @returns {number} 课程费用
     */
    getCourseFee(course, student, index) {
        // 如果课程有费用数组且指定索引的费用已定义，使用课程费用
        if (course.fees && course.fees[index] !== undefined) {
            return course.fees[index];
        }
        // 否则使用学生的"一对一"费用或默认费用
        return student?.fees?.['一对一'] || 0;
    }
}
