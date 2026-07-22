import { supabase } from './supabase';
import type { SessionUser } from './types';

const SESSION_KEY = 'jiushikebiao_session';

/**
 * 登录：Supabase Auth 邮箱+密码
 */
export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { success: false, error: '登录失败：' + error.message };
  }
  if (!data.user) {
    return { success: false, error: '登录失败' };
  }

  const sessionUser: SessionUser = {
    id: data.user.id,
    email: data.user.email || email,
    display_name: (data.user.user_metadata?.display_name as string) || email.split('@')[0],
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
}

/**
 * 注册：Supabase Auth 邮箱+密码
 */
export async function register(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email.trim() || !password) {
    return { success: false, error: '请填写邮箱和密码' };
  }
  if (password.length < 6) {
    return { success: false, error: '密码至少 6 位' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Supabase 可能需要邮箱确认；若返回 session 则直接登录态
  if (data.user) {
    const sessionUser: SessionUser = {
      id: data.user.id,
      email: data.user.email || email,
      display_name: email.split('@')[0],
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  }

  return { success: true };
}

export function getCurrentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void,
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // 忽略
  }
  localStorage.removeItem(SESSION_KEY);
}

/** 更新本地缓存的用户显示名 */
export function updateLocalDisplayName(name: string) {
  const u = getCurrentUser();
  if (!u) return;
  const updated = { ...u, display_name: name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
}
