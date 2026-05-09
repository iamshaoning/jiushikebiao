/**
 * 事件绑定服务
 *
 * @description 集中管理所有页面事件绑定：导航、搜索、下拉菜单、排序等
 * @module eventBindingService
 */
class EventBindingService {
    constructor(elements, state, utils, render, modalService, notificationService) {
        this.elements = elements;
        this.state = state;
        this.utils = utils;
        this.render = render;
        this.modalService = modalService;
        this.notificationService = notificationService;
    }

    /**
     * 初始化所有事件监听
     */
    init() {
        this.bindNavigationEvents();
        this.bindStudentSearchEvent();
        this.bindStatisticsDropdownEvents();
        this.bindTimelineButtonEvent();
        this.bindSnapshotButtonEvent();
        this.bindSyncStatusEvent();
        this.bindOrganizationOptionsEvent();
        this.bindCalendarDropdownEvents();
    }

    /**
     * 绑定导航切换事件
     */
    bindNavigationEvents() {
        if (this.elements.navButtons) {
            this.elements.navButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageId = button.dataset.page;
                    this.render.page(pageId);
                });
            });
        }
    }

    /**
     * 绑定学生搜索事件
     */
    bindStudentSearchEvent() {
        if (this.elements.studentSearch) {
            this.elements.studentSearch.addEventListener('input', this.utils.debounce(() => {
                this.render.students();
            }, 300));
        }
    }

    /**
     * 绑定统计页面的年份和月份下拉菜单事件
     */
    bindStatisticsDropdownEvents() {
        if (typeof this.utils.generateYearDropdowns === 'function') {
            this.utils.generateYearDropdowns();
        }

        if (typeof this.utils.generateMonthDropdowns === 'function') {
            this.utils.generateMonthDropdowns();
        }

        if (this.elements.statisticsYearWrapper) {
            this.elements.statisticsYearWrapper.addEventListener('change', (e) => {
                const year = parseInt(e.detail.value);
                const { month, organization } = this.utils.getStatisticsParams();
                this.render.statistics(year, month, organization);
            });
        }

        if (this.elements.statisticsMonthWrapper) {
            this.elements.statisticsMonthWrapper.addEventListener('change', (e) => {
                const month = parseInt(e.detail.value);
                const { year, organization } = this.utils.getStatisticsParams();
                this.render.statistics(year, month, organization);
            });
        }

        if (this.elements.statisticsOrganizationWrapper) {
            this.elements.statisticsOrganizationWrapper.addEventListener('change', (e) => {
                const { year, month } = this.utils.getStatisticsParams();
                const organization = e.detail.value;
                this.render.statistics(year, month, organization);
            });
        }
    }

    /**
     * 绑定时间轴按钮事件
     */
    bindTimelineButtonEvent() {
        const timelineBtn = document.getElementById('timeline-btn');
        if (timelineBtn) {
            timelineBtn.addEventListener('click', () => {
                this.modalService.showTimeline();
            });
        }
    }

    /**
     * 绑定快照按钮事件
     */
    bindSnapshotButtonEvent() {
        const snapshotBtn = document.getElementById('snapshot-btn');
        if (snapshotBtn) {
            snapshotBtn.addEventListener('click', () => {
                this.modalService.showSnapshotManager();
            });
        }
    }

    /**
     * 绑定同步状态点击事件
     */
    bindSyncStatusEvent() {
        if (!this.elements.syncStatus) return;

        this.elements.syncStatus.addEventListener('click', () => {
            if (this.utils.compareLocalAndServerData) {
                this.utils.compareLocalAndServerData();
            } else {
                this.notificationService.show('数据比较服务未初始化', 'warning');
            }
        });
    }

    /**
     * 初始化机构下拉菜单选项
     */
    bindOrganizationOptionsEvent() {
        if (!this.elements.statisticsOrganizationOptions || !this.elements.statisticsOrganizationWrapper) return;

        const optionsContainer = this.elements.statisticsOrganizationOptions;
        const trigger = this.elements.statisticsOrganizationTrigger;

        optionsContainer.innerHTML = '<div class="custom-option selected" data-value="">全部机构</div>';

        this.state.organizations.forEach(org => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            optionDiv.dataset.value = org;
            optionDiv.textContent = org;
            optionsContainer.appendChild(optionDiv);
        });

        if (trigger) {
            const triggerText = trigger.querySelector('span');
            if (triggerText) {
                triggerText.textContent = '全部机构';
            }
        }
    }

    /**
     * 绑定日历页面的年月下拉菜单事件
     */
    bindCalendarDropdownEvents() {
        if (this.elements.calendarYearWrapper) {
            this.elements.calendarYearWrapper.addEventListener('change', (e) => {
                const year = parseInt(e.detail.value);
                const month = this.state.currentDate.getMonth();
                this.state.currentDate = new Date(year, month, 1);
                this.render.calendar();
            });
        }

        if (this.elements.calendarMonthWrapper) {
            this.elements.calendarMonthWrapper.addEventListener('change', (e) => {
                const month = parseInt(e.detail.value);
                const year = this.state.currentDate.getFullYear();
                this.state.currentDate = new Date(year, month, 1);
                this.render.calendar();
            });
        }
    }

    /**
     * 刷新机构选项（当机构数据变化时调用）
     */
    refreshOrganizationOptions() {
        if (!this.elements.statisticsOrganizationOptions) return;

        this.elements.statisticsOrganizationOptions.innerHTML = '<div class="custom-option selected" data-value="">全部机构</div>';

        this.state.organizations.forEach(org => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            optionDiv.dataset.value = org;
            optionDiv.textContent = org;
            this.elements.statisticsOrganizationOptions.appendChild(optionDiv);
        });

        if (this.elements.statisticsOrganizationTrigger) {
            const triggerText = this.elements.statisticsOrganizationTrigger.querySelector('span');
            if (triggerText) {
                triggerText.textContent = '全部机构';
            }
        }
    }
}

export default EventBindingService;
