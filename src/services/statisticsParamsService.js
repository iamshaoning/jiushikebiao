/**
 * 统计参数服务模块
 * 负责处理统计参数相关功能，包括生成年份下拉菜单、月份下拉菜单、获取统计参数等
 */
class StatisticsParamsService {
    constructor(state, elements, utils) {
        this.state = state;
        this.elements = elements;
        this.utils = utils;
    }

    generateYearDropdowns() {
        const currentYear = new Date().getFullYear();
        const displayedYear = this.state.currentDate.getFullYear();
        const courseYears = new Set();

        this.state.courses.forEach(course => {
            if (course.date) {
                const year = parseInt(course.date.split('-')[0]);
                if (!isNaN(year)) {
                    courseYears.add(year);
                }
            }
        });

        let minYear = Math.min(currentYear - 1, displayedYear - 1);
        let maxYear = Math.max(currentYear + 1, displayedYear + 1);
        courseYears.forEach(year => {
            minYear = Math.min(minYear, year);
            maxYear = Math.max(maxYear, year);
        });

        this.utils.safeSet(this.elements.statisticsYearOptions, 'innerHTML', '');
        for (let year = minYear; year <= maxYear; year++) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            optionDiv.dataset.value = year;
            optionDiv.textContent = `${year}年`;
            if (year === currentYear) {
                optionDiv.classList.add('selected');
                this.utils.safeSet(this.elements.statisticsYearTrigger, 'textContent', `${year}年`);
            }
            this.utils.safe(this.elements.statisticsYearOptions, 'appendChild', optionDiv);
        }

        this.utils.safeSet(this.elements.calendarYearOptions, 'innerHTML', '');
        for (let i = minYear; i <= maxYear; i++) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option' + (i === this.state.currentDate.getFullYear() ? ' selected' : '');
            optionDiv.dataset.value = i;
            optionDiv.textContent = `${i}年`;
            this.utils.safe(this.elements.calendarYearOptions, 'appendChild', optionDiv);
        }
        this.utils.safeSet(this.elements.calendarYearTrigger, 'textContent', `${this.state.currentDate.getFullYear()}年`);
    }

    generateMonthDropdowns() {
        const currentMonth = new Date().getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        const monthOptions = this.utils.safe(this.elements.statisticsMonthWrapper, 'querySelectorAll', '.custom-option');
        const monthTrigger = this.utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-select-trigger span');
        if (monthOptions) {
            monthOptions.forEach((opt, index) => {
                if (index === currentMonth) {
                    opt.classList.add('selected');
                    this.utils.safeSet(monthTrigger, 'textContent', opt.textContent);
                } else {
                    opt.classList.remove('selected');
                }
            });
        }

        this.utils.safeSet(this.elements.calendarMonthOptions, 'innerHTML', '');
        monthNames.forEach((monthName, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option' + (index === this.state.currentDate.getMonth() ? ' selected' : '');
            optionDiv.dataset.value = index;
            optionDiv.textContent = monthName;
            this.utils.safe(this.elements.calendarMonthOptions, 'appendChild', optionDiv);
        });
        const calendarMonthTrigger = this.utils.safe(this.elements.calendarMonthWrapper, 'querySelector', '.custom-select-trigger span');
        this.utils.safeSet(calendarMonthTrigger, 'textContent', monthNames[this.state.currentDate.getMonth()]);
    }

    getStatisticsParams() {
        const year = parseInt(this.utils.safe(this.elements.statisticsYearWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getFullYear();
        const month = parseInt(this.utils.safe(this.elements.statisticsMonthWrapper, 'querySelector', '.custom-option.selected')?.dataset.value) || new Date().getMonth();
        const organization = this.utils.safe(this.elements.statisticsOrgWrapper, 'querySelector', '.custom-option.selected')?.dataset.value || '';
        return { year, month, organization };
    }
}

export default StatisticsParamsService;