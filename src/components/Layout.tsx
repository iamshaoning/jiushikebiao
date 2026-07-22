import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/stores/useStore';
import { loadProfile, getAvatarUrl } from '@/lib/profile';
import { updateLocalDisplayName } from '@/lib/auth';
import {
  CalendarCheck,
  Users,
  BarChart3,
  LogOut,
  Camera,
  History as HistoryIcon,
  Bell,
} from 'lucide-react';
import SyncStatus from '@/components/SyncStatus';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProfileModal from '@/modals/ProfileModal';
import SnapshotModal from '@/modals/SnapshotModal';
import HistoryModal from '@/modals/HistoryModal';
import AnnouncementsModal from '@/modals/AnnouncementsModal';
import { startAutoSnapshotTimer } from '@/lib/snapshot';
import { subscribeAnnouncements, type Announcement } from '@/lib/announcement';

// 适配 vite base 路径
const FAVICON = `${import.meta.env.BASE_URL}favicon.svg`;

const navItems = [
  { to: '/calendar', label: '日历排课', icon: CalendarCheck },
  { to: '/students', label: '学生管理', icon: Users },
  { to: '/statistics', label: '费用统计', icon: BarChart3 },
];

const roleLabel = '我的工作台';

// 判断菜单项是否激活
function isActiveItem(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(to + '/');
}

const ANNOUNCEMENT_READ_KEY = 'announcementReadAt';

export default function Layout() {
  const { user, setUser, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [leaving, setLeaving] = useState(false);
  // 进入时元素淡入（从 AuthPage 形变过来后，系统元素缓慢淡入）
  const [entering, setEntering] = useState(true);

  // 模态框状态（互斥：同一时间只打开一个）
  const [activeModal, setActiveModal] = useState<'profile' | 'snapshot' | 'history' | 'announce' | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // 滑动指示器：记录每个菜单项的 DOM 位置
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false });

  // 公告 Realtime 订阅 + 未读判断
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAnnouncements((a: Announcement) => {
      const readAt = localStorage.getItem(ANNOUNCEMENT_READ_KEY);
      const readTs = readAt ? Date.parse(readAt) : 0;
      const annTs = Date.parse(a.created_at);
      if (annTs > readTs) setHasUnread(true);
    });
    return unsub;
  }, [user]);

  // 自动快照定时器（15分钟）
  useEffect(() => {
    if (!user) return;
    const stop = startAutoSnapshotTimer();
    return stop;
  }, [user]);

  // 同步 store user（快照等功能依赖 store.user.id）+ 加载 profile 昵称
  useEffect(() => {
    if (!user) return;
    useStore.getState().setSessionUser(user);
    let cancelled = false;
    (async () => {
      const profile = await loadProfile(user.id);
      if (cancelled) return;
      // 加载头像 URL
      const url = await getAvatarUrl(profile?.avatar_url);
      if (!cancelled) setAvatarUrl(url);
      if (cancelled || !profile?.nickname) return;
      if (profile.nickname !== user.display_name) {
        const updated = { ...user, display_name: profile.nickname };
        setUser(updated);
        useStore.getState().setSessionUser(updated);
        updateLocalDisplayName(profile.nickname);
      }
    })();
    return () => { cancelled = true; };
  }, [user, setUser]);

  if (!user) return null;

  // 路由变化时更新指示器位置 + 清除所有选中状态
  useLayoutEffect(() => {
    const activeIdx = navItems.findIndex((item) => isActiveItem(loc.pathname, item.to));
    const el = itemRefs.current[activeIdx];
    if (el) {
      setIndicator({ top: el.offsetTop, height: el.offsetHeight, visible: true });
    } else {
      setIndicator((prev) => ({ ...prev, visible: false }));
    }
    // 切换标签页时清除日历/学生页的选中状态，收起浮动操作栏
    useStore.getState().clearSelections();
  }, [loc.pathname]);

  // 进入时淡入：挂载后触发系统元素淡入
  useEffect(() => {
    const timer = setTimeout(() => {
      setEntering(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const performLogout = () => {
    // 登出：菜单/内容淡出（logo 区域保持可见），然后跳转 AuthPage
    // 淡出时长 0.3s，与 AuthPage 中部大字/版权消失时长一致
    setLogoutConfirm(false);
    setLeaving(true);
    sessionStorage.setItem('authLogoutTransition', '1');
    setTimeout(() => {
      logout();
      nav('/login', { replace: true });
    }, 300);
  };

  const handleOpenAnnouncements = () => {
    setActiveModal('announce');
    setHasUnread(false);
    localStorage.setItem(ANNOUNCEMENT_READ_KEY, new Date().toISOString());
  };

  // 通用淡入淡出 class：进入时 0.5s 淡入，登出时 0.3s 淡出
  const fadeClass = leaving
    ? 'duration-300 opacity-0'
    : entering
    ? 'duration-500 opacity-0'
    : 'duration-500 opacity-100';
  const asideContentClass = `transition-opacity ${fadeClass}`;
  const mainClass = `transition-opacity ${fadeClass}`;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* 侧边栏：背景色保持，logo 区域始终可见，菜单/用户信息淡入淡出 */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-ink-700 text-white shadow-lg z-50">
        {/* 品牌区域：logo + 大标题，始终可见，衔接 AuthPage logo 形变后的位置 */}
        <div className="px-5 py-6 border-b border-ink-600/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-300 flex items-center justify-center shadow-md p-1.5">
              <img src={FAVICON} alt="玖拾课表" className="w-full h-full object-contain" />
            </div>
            <div className="font-display font-bold text-base leading-tight">玖拾课表</div>
          </div>
          {/* 小标题：独立一行，跟随淡入淡出，不影响 logo 和大标题 */}
          <div className={`text-xs text-ink-100/70 mt-1.5 transition-opacity ${fadeClass}`}>
            {roleLabel}
          </div>
        </div>

        {/* 菜单 + 用户信息：entering/leaving 时淡入淡出 */}
        <div className={`flex flex-col flex-1 ${asideContentClass}`}>
          <nav className="relative flex-1 py-4">
            {/* 滑动指示器 */}
            {indicator.visible && (
              <div
                className="absolute left-0 right-0 bg-amber-300/15 border-l-2 border-amber-300 pointer-events-none"
                style={{
                  top: indicator.top,
                  height: indicator.height,
                  transition: 'top 0.3s ease-out, height 0.3s ease-out',
                }}
              />
            )}
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const active = isActiveItem(loc.pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className={`relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-300 border-l-2 border-transparent ${
                    active
                      ? 'text-amber-200'
                      : 'text-ink-100/80 hover:bg-ink-600/40 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 底部功能区：同步状态 + 快照/历史/公告 + 用户信息 + 退出 */}
          <div className="px-5 py-4 border-t border-ink-600/40 space-y-3">
            {/* 同步状态 */}
            <SyncStatus />

            {/* 快照 / 历史 / 公告 入口 */}
            <div className="flex items-center gap-3 text-xs text-ink-100/60">
              <button
                onClick={() => setActiveModal('snapshot')}
                className="flex items-center gap-1 hover:text-amber-200 transition-colors"
                title="快照管理"
              >
                <Camera className="w-3.5 h-3.5" />
                快照
              </button>
              <button
                onClick={() => setActiveModal('history')}
                className="flex items-center gap-1 hover:text-amber-200 transition-colors"
                title="操作历史"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                历史
              </button>
              <button
                onClick={handleOpenAnnouncements}
                className="flex items-center gap-1 hover:text-amber-200 transition-colors relative"
                title="公告板"
              >
                <Bell className="w-3.5 h-3.5" />
                公告
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>

            {/* 用户信息：头像 + 昵称 + 邮箱，可点击打开个人资料 */}
            <button
              onClick={() => setActiveModal('profile')}
              className="w-full text-left group flex flex-col items-start gap-2"
              title="点击编辑个人资料"
            >
              {/* 头像 */}
              <div className="w-12 h-12 rounded-full overflow-hidden border border-ink-600/40 shrink-0 bg-ink-600/40">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base font-medium text-ink-100/70">
                    {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* 文字信息 */}
              <div className="min-w-0 w-full">
                <div className="text-sm font-medium truncate group-hover:text-amber-200 transition-colors">
                  {user.display_name}
                </div>
                <div className="text-xs text-ink-100/50 truncate group-hover:text-amber-200/80 transition-colors">
                  {user.email}
                </div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-ink-100/70 hover:text-amber-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <div
        className={`md:hidden fixed top-0 inset-x-0 z-50 bg-ink-700 text-white px-4 py-3 flex items-center justify-between shadow-md ${asideContentClass}`}
      >
        <div className="flex items-center gap-2">
          <img src={FAVICON} alt="玖拾课表" className="w-5 h-5 object-contain" />
          <span className="font-display font-bold">玖拾课表</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenAnnouncements} aria-label="公告" className="relative">
            <Bell className="w-4 h-4 text-ink-100/70" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button
            onClick={() => setActiveModal('profile')}
            aria-label="个人资料"
            className="w-7 h-7 rounded-full overflow-hidden border border-ink-600/40 shrink-0 bg-ink-600/40"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-ink-100/70">
                {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          <span className="text-xs text-ink-100/70 truncate max-w-[80px]">{user.display_name}</span>
          <button onClick={handleLogout} aria-label="退出">
            <LogOut className="w-4 h-4 text-ink-100/70" />
          </button>
        </div>
      </div>

      {/* 主内容：进入时淡入，登出时淡出；独立滚动不影响侧边栏 */}
      <main className={`flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0 ${mainClass}`}>
        {/* 移动端次级导航 */}
        <div className="md:hidden bg-[var(--bg-secondary)] border-b border-ink-100 px-4 py-2 flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActiveItem(loc.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-shrink-0 px-3 py-1.5 rounded text-xs ${
                  active
                    ? 'bg-ink text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {/* 右侧内容：key 变化触发重新挂载，播放 route-fade-in 淡入动画 */}
        <div
          key={loc.pathname}
          className="px-4 md:px-8 lg:px-10 py-6 md:py-8 max-w-7xl mx-auto route-fade-in"
        >
          <Outlet />
        </div>
      </main>

      {/* 模态框群（互斥：activeModal 同一时间只有一个值） */}
      <ProfileModal open={activeModal === 'profile'} onClose={() => setActiveModal(null)} />
      <SnapshotModal open={activeModal === 'snapshot'} onClose={() => setActiveModal(null)} />
      <HistoryModal open={activeModal === 'history'} onClose={() => setActiveModal(null)} />
      <AnnouncementsModal open={activeModal === 'announce'} onClose={() => setActiveModal(null)} />

      {/* 登出确认弹窗 */}
      <ConfirmDialog
        open={logoutConfirm}
        message="确定要登出吗？"
        type="warning"
        confirmText="登出"
        onConfirm={performLogout}
        onCancel={() => setLogoutConfirm(false)}
      />
    </div>
  );
}
