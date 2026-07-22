/**
 * 用户资料服务
 *
 * 重写自课表 profileService.js
 * 管理用户头像和昵称，数据存储在 Supabase profiles 表 + Profile bucket
 * 头像上传采用 256x256 Canvas 压缩（优于源项目直接上传原文件）
 */
import { supabase, TABLES, BUCKETS } from './supabase';

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 200 * 1024; // 200KB（压缩前预校验）
const AVATAR_SIZE = 256; // 压缩目标尺寸
const AVATAR_QUALITY = 0.85; // JPEG 压缩质量

/** 校验头像文件类型与大小 */
function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: '未选择文件' };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024}KB` };
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: '仅支持 JPEG/JPG/PNG/GIF/WEBP 格式' };
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return { valid: false, error: '仅支持 JPEG/JPG/PNG/GIF/WEBP 格式' };
  }
  return { valid: true };
}

/** 将图片文件压缩为 256x256 JPEG Blob */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 上下文不可用'));
        return;
      }
      // 居中裁剪为正方形
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('图片压缩失败'));
        },
        'image/jpeg',
        AVATAR_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

/** 根据文件名生成签名 URL（1小时有效） */
export async function getAvatarUrl(fileName: string | null | undefined): Promise<string | null> {
  if (!fileName) return null;
  // 已是完整 URL（旧数据兼容），直接返回
  if (fileName.startsWith('http')) return fileName;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKETS.PROFILE)
      .createSignedUrl(fileName, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** 删除旧头像文件 */
async function deleteOldAvatar(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from(TABLES.PROFILES)
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();
    const oldUrl = data?.avatar_url;
    if (!oldUrl || oldUrl.startsWith('http')) return;
    await supabase.storage.from(BUCKETS.PROFILE).remove([oldUrl]);
  } catch {
    // 忽略
  }
}

/** 创建默认 profile */
async function createDefaultProfile(userId: string): Promise<Profile | null> {
  let email = '';
  try {
    const { data } = await supabase.auth.getSession();
    email = data?.session?.user?.email || '';
  } catch {
    // 忽略
  }
  const nickname = email ? email.split('@')[0] : '用户';
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .insert({ id: userId, nickname })
      .select()
      .single();
    if (error) {
      console.error('[Profile] 创建默认 profile 失败:', error);
      return null;
    }
    return data as Profile;
  } catch (err) {
    console.error('[Profile] 创建异常:', err);
    return null;
  }
}

/** 加载用户资料 */
export async function loadProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[Profile] 加载失败:', error);
      return null;
    }
    if (!data) {
      return await createDefaultProfile(userId);
    }
    return data as Profile;
  } catch (err) {
    console.error('[Profile] 异常:', err);
    return null;
  }
}

/** 更新昵称 */
export async function updateNickname(userId: string, nickname: string): Promise<boolean> {
  if (!userId) return false;
  const trimmed = nickname.trim();
  if (!trimmed) return false;
  try {
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ nickname: trimmed, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      console.error('[Profile] 更新昵称失败:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Profile] 更新昵称异常:', err);
    return false;
  }
}

/**
 * 上传头像：校验 → 256x256 压缩 → 删旧 → 上传新 → 更新 avatar_url
 * @returns {success, url?, error?}
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!userId) return { success: false, error: '未登录' };

  const validation = validateAvatarFile(file);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    // 压缩图片
    const compressedBlob = await compressImage(file);
    const fileName = `${userId}_${Date.now()}.jpg`;

    // 删除旧头像
    await deleteOldAvatar(userId);

    // 上传新文件
    const { error: uploadError } = await supabase.storage
      .from(BUCKETS.PROFILE)
      .upload(fileName, compressedBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('[Profile] 头像上传失败:', uploadError);
      return { success: false, error: '头像上传失败' };
    }

    // 更新 profiles.avatar_url
    const { error: updateError } = await supabase
      .from(TABLES.PROFILES)
      .update({ avatar_url: fileName, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[Profile] 更新头像文件名失败:', updateError);
      return { success: false, error: '头像更新失败' };
    }

    // 返回即时可用的签名 URL
    const url = await getAvatarUrl(fileName);
    return { success: true, url: url || undefined };
  } catch (err) {
    console.error('[Profile] 头像上传异常:', err);
    return { success: false, error: '头像上传异常' };
  }
}
