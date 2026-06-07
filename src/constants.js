/**
 * 应用常量
 *
 * @description 集中管理全局魔法数字和配置常量，避免硬编码散布在代码中
 * @module constants
 */
export const ANIMATION = {
    /** 跨类型切换（如课程→日期格）的延迟时间(ms) */
    CROSS_TYPE_DELAY: 180,
};

export const HISTORY = {
    /** 最大保存记录数 */
    MAX_RECORDS: 20,
};

export const NETWORK = {
    /** 默认超时时间(ms) */
    DEFAULT_TIMEOUT: 5000,
    /** 最大重试次数 */
    MAX_RETRIES: 2,
    /** 重试间隔基数(ms) */
    RETRY_DELAY_BASE: 1000,
};

export const SESSION = {
    /** 会话状态检查间隔(ms) */
    CHECK_INTERVAL: 60 * 1000,
};

export const STORAGE = {
    /** 历史记录存储键 */
    HISTORY_KEY: 'coursemanagerhistory',
    /** 课程数据存储键 */
    DATA_KEY: 'coursemanagerdata',
    /** 设备 ID 存储键 */
    DEVICE_ID_KEY: 'device_id',
};