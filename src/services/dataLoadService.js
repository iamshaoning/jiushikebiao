/**
 * 数据加载服务
 *
 * @description 从 Supabase 加载数据、建立 Realtime 通道、本地/服务端数据比对与同步
 * @module dataLoadService
 */
import { registry } from '../core/registry.js';
class DataLoadService {
    constructor(state, notificationService, serverStatusService, utils) {
        this.state = state;
        this.notificationService = notificationService;
        this.serverStatusService = serverStatusService;
        this.utils = utils;
        this.currentDeviceId = this.getDeviceId();
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    setDeviceId(deviceId) { this.currentDeviceId = deviceId; }

    async _getSession() {
        const auth = registry.get('supabaseAuth');
        if (!auth) return { isLoggedIn: false, session: null };
        try {
            const result = await this.utils.withTimeout(() => auth.getSession(), 10000, '获取会话超时');
            let session = null;
            if (result && typeof result === 'object') {
                session = result.data?.session || result.session || null;
            }
            return { isLoggedIn: !!session, session };
        } catch (error) { this.utils.handleError(error, '获取 session 失败'); return { isLoggedIn: false, session: null }; }
    }

    _getLocalData() { try { const s = localStorage.getItem('coursemanagerdata'); return s ? JSON.parse(s) : null; } catch (e) { console.error('本地数据解析失败:', e); return null; } }

    _shouldCreateLoginSnapshot(localData, isLoggedIn, currentUserId) {
        if (!localData || !isLoggedIn || !currentUserId) return false;
        if (localData.userid && localData.userid !== currentUserId) return false;
        return true;
    }

    _isOtherAccount(localData, currentUserId) { return localData && currentUserId && localData.userid !== currentUserId; }

    _clearStateForNewAccount() {
        this.state.students = [];
        this.state.courses = [];
        this.state.organizations = [];
        this.state.grades = [];
    }

    _setupRealtimeChannel(userId) {
        if (registry.get('realtimeChannel')) return;
        try {
            const channel = registry.get('supabaseClient').channel('course-manager-channel');
            channel.on('postgres_changes', { event: '*', schema: 'public', table: 'coursemanagerdata', filter: `userid=eq.${userId}` }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const serverData = payload.new;
                    const localData = this._getLocalData();
                    const serverTs = this.utils.getTimestamp(serverData.lastupdated);
                    const localTs = this.utils.getTimestamp(localData?.lastupdated);
                    if (serverTs > localTs) {
                        this.utils.updateStateFromData(serverData, false);
                        localStorage.setItem('coursemanagerdata', JSON.stringify(serverData));
                        this.utils.refreshAllViews(true);
                    }
                }
            });
            channel.subscribe();
            registry.set('realtimeChannel', channel);
        } catch (error) { this.utils.handleError(error, '建立实时数据连接失败'); }
    }

    async _handleServerSync(userId, localData) {
        if (!registry.get('supabaseClient')) return;

        const { data: serverData, error } = await this.utils.withTimeout(() =>
            registry.get('supabaseClient').from('coursemanagerdata').select('*').eq('userid', userId).single(), 10000, '加载数据超时');

        if (error) {
            if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
                await this._createDefaultDataOnServer(userId);
                return;
            }
            this.utils.handleError(error, '从服务器加载数据失败');
            this.serverStatusService.updateServerStatus('offline');
            return;
        }
        this._compareAndSync(localData, serverData, userId);
    }

    async _createDefaultDataOnServer(userId) {
        const defaultData = { userid: userId, students: [], courses: [], organizations: [], grades: [], organizationColors: {}, gradeColors: {}, lastupdated: new Date().toISOString() };
        try {
            await this.utils.withTimeout(() => registry.get('supabaseClient').from('coursemanagerdata').insert(defaultData), 10000, '创建初始数据超时');
            this.serverStatusService.updateServerStatus('online');
            this.utils.updateStateFromData(defaultData, false);
            localStorage.setItem('coursemanagerdata', JSON.stringify(defaultData));
            this.utils.refreshAllViews(true);
            this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);
        } catch (e) {
            this.utils.handleError(e, '创建初始数据失败', true);
            this.serverStatusService.updateServerStatus('offline');
            this.notificationService.show('数据加载失败，请刷新页面重试', 'error');
        }
    }

    _compareAndSync(localData, serverData, userId) {
        const localTs = this.utils.getTimestamp(localData?.lastupdated);
        if (!serverData) {
            if (localData) { this._uploadToServer(localData, userId); this.utils.updateStateFromData(localData); }
            else this._initEmptyOnServer(userId);
            this.utils.refreshAllViews(true);
            return;
        }
        const serverTs = this.utils.getTimestamp(serverData.lastupdated);
        if (localData) {
            if (serverTs > localTs) { this.utils.updateStateFromData(serverData, false); localStorage.setItem('coursemanagerdata', JSON.stringify(serverData)); this.serverStatusService.updateServerStatus('online'); }
            else if (localTs > serverTs) { this._uploadToServer(localData, userId); this.serverStatusService.updateServerStatus('online'); }
            else { this.serverStatusService.updateServerStatus('online'); }
        } else { this.utils.updateStateFromData(serverData, false); localStorage.setItem('coursemanagerdata', JSON.stringify(serverData)); this.serverStatusService.updateServerStatus('online'); }
        this.utils.refreshAllViews(true);
    }

    async _uploadToServer(localData, userId) {
        const data = { userid: userId, students: localData.students, courses: localData.courses, organizations: localData.organizations, grades: localData.grades, organizationColors: localData.organizationColors || {}, gradeColors: localData.gradeColors || {}, lastupdated: localData.lastupdated };
        if (this.currentDeviceId) data.device_id = this.currentDeviceId;
        try { await this.utils.withTimeout(() => registry.get('supabaseClient').from('coursemanagerdata').upsert(data), 5000, '上传数据超时'); }
        catch (e) { this.utils.handleError(e, '上传数据失败'); }
    }

    async _initEmptyOnServer(userId) {
        const data = { userid: userId, students: [], courses: [], organizations: [], grades: [], organizationColors: {}, gradeColors: {}, lastupdated: new Date().toISOString() };
        if (this.currentDeviceId) data.device_id = this.currentDeviceId;
        try { await this.utils.withTimeout(() => registry.get('supabaseClient').from('coursemanagerdata').insert(data), 5000, '创建初始数据超时'); this.serverStatusService.updateServerStatus('online'); }
        catch (e) { this.utils.handleError(e, '创建初始数据失败', true); this.serverStatusService.updateServerStatus('offline'); }
        this.utils.updateStateFromData({});
        this.notificationService.show('欢迎使用课程管理系统！请添加您的第一条数据', 'info', 5000);
        this.utils.refreshAllViews(true);
    }

    _handleOffline(localData, isLoggedIn) {
        if (!isLoggedIn) this.serverStatusService.updateServerStatus('loggedout');
        else this.serverStatusService.updateServerStatus('offline');
        if (localData) { this.utils.updateStateFromData(localData); }
        else { this.utils.updateStateFromData({}); this.notificationService.show('无法连接到服务器，请检查网络连接', 'error'); }
        this.utils.refreshAllViews(true);
    }

    async loadData() {
        try {
            const { isLoggedIn, session } = await this._getSession();
            const currentUserId = session?.user?.id;
            const localData = this._getLocalData();

            if (this._shouldCreateLoginSnapshot(localData, isLoggedIn, currentUserId) && registry.get('snapshotUtils')) {
                await registry.get('snapshotUtils').createSnapshot('login', false);
            }
            if (this._isOtherAccount(localData, currentUserId)) {
                localStorage.removeItem('coursemanagerdata');
                this._clearStateForNewAccount();
            }

            if (registry.get('supabaseClient') && isLoggedIn) {
                const userId = session.user.id;
                this._setupRealtimeChannel(userId);

                const currentLocalData = this._getLocalData();
                if (currentLocalData) this.utils.updateStateFromData(currentLocalData);
                else this.utils.updateStateFromData({});

                try { await this._handleServerSync(userId, currentLocalData); }
                catch (error) {
                    console.error('从服务器加载数据失败:', error);
                    this.utils.handleError(error, '从服务器加载数据失败', true);
                    this.serverStatusService.updateServerStatus('offline');
                    const fallback = this._getLocalData();
                    if (fallback) { this.utils.updateStateFromData(fallback); this.notificationService.show('已使用本地缓存数据', 'info'); }
                    else { this.utils.updateStateFromData({}); this.notificationService.show('无法连接到服务器，请检查网络连接', 'error'); }
                    this.utils.refreshAllViews(true);
                }
            } else { this._handleOffline(localData, isLoggedIn); }

            if (registry.get('timelineService')?.reloadTimelineForUser) await registry.get('timelineService').reloadTimelineForUser();
        } catch (error) {
            this.utils.handleError(error, '加载数据失败', true);
            this.utils.updateStateFromData({});
            this.utils.refreshAllViews(true);
        } finally { this.utils.startAutoSnapshotTimer(); }
    }
}

export default DataLoadService;