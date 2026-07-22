import { createClient } from '@supabase/supabase-js';

// Supabase 配置：通过 .env 环境变量注入（publishable key 可在前端暴露）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'sb-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// 表名常量
export const TABLES = {
  COURSE_DATA: 'coursemanagerdata',
  PROFILES: 'profiles',
  ANNOUNCEMENTS: 'announcements',
} as const;

// Storage bucket
export const BUCKETS = {
  PROFILE: 'Profile',
} as const;
