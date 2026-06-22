/**
 * 用户资料服务
 *
 * @description 管理用户头像和昵称，数据存储在 Supabase profiles 表 + Storage
 * @module profileService
 */
import { registry } from '../core/registry.js';

const BUCKET = 'Profile';
// 头像上传安全限制：与 Supabase Storage bucket 配置保持一致
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 200 * 1024; // 200KB

class ProfileService {
    constructor() {
        this._profile = null;
    }

    _getClient() {
        return registry.get('supabaseClient');
    }

    _getAuth() {
        return registry.get('supabaseAuth');
    }

    /**
     * 校验头像文件类型与大小
     * @returns {{valid: boolean, error?: string}}
     */
    _validateAvatarFile(file) {
        if (!file) return { valid: false, error: '未选择文件' };
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024}KB` };
        }
        // 同时校验 MIME 类型与扩展名，避免伪造
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, error: '仅支持 JPEG/JPG/PNG/GIF/WEBP 格式' };
        }
        if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
            return { valid: false, error: '仅支持 JPEG/JPG/PNG/GIF/WEBP 格式' };
        }
        return { valid: true };
    }

    /**
     * 根据文件名生成签名 URL（1小时有效，每次显示时刷新）
     */
    async getAvatarUrl(fileName) {
        if (!fileName) return null;
        // 如果已是完整 URL（旧数据兼容），直接返回
        if (fileName.startsWith('http')) return fileName;

        const client = this._getClient();
        if (!client) return null;
        try {
            const { data, error } = await client.storage
                .from(BUCKET)
                .createSignedUrl(fileName, 3600);
            if (error || !data?.signedUrl) return null;
            return data.signedUrl;
        } catch {
            return null;
        }
    }

    /**
     * 删除旧头像文件
     */
    async _deleteOldAvatar(userId) {
        const client = this._getClient();
        if (!client) return;

        // 先查当前 profile 获取旧文件名
        try {
            const { data } = await client
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            const oldUrl = data?.avatar_url;
            if (!oldUrl || oldUrl.startsWith('http')) return; // 旧格式 URL 跳过

            // oldUrl 就是文件名
            await client.storage.from(BUCKET).remove([oldUrl]);
        } catch {}
    }

    async loadProfile(userId) {
        const client = this._getClient();
        if (!client || !userId) return null;

        try {
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[Profile] 加载失败:', error);
                return null;
            }

            if (!data) {
                return await this._createDefaultProfile(userId);
            }

            this._profile = data;
            return data;
        } catch (err) {
            console.error('[Profile] 异常:', err);
            return null;
        }
    }

    async _createDefaultProfile(userId) {
        const client = this._getClient();
        if (!client) return null;

        const auth = this._getAuth();
        let email = '';
        try {
            const { data } = await auth.getSession();
            email = data?.session?.user?.email || '';
        } catch {}

        const nickname = email ? email.split('@')[0] : '用户';

        try {
            const { data, error } = await client
                .from('profiles')
                .insert({ id: userId, nickname })
                .select()
                .single();

            if (error) {
                console.error('[Profile] 创建默认 profile 失败:', error);
                return null;
            }

            this._profile = data;
            return data;
        } catch (err) {
            console.error('[Profile] 创建异常:', err);
            return null;
        }
    }

    async updateNickname(userId, nickname) {
        const client = this._getClient();
        if (!client || !userId) return false;

        const trimmed = nickname.trim();
        if (!trimmed) return false;

        try {
            const { error } = await client
                .from('profiles')
                .update({ nickname: trimmed, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                console.error('[Profile] 更新昵称失败:', error);
                return false;
            }

            if (this._profile) {
                this._profile.nickname = trimmed;
            }
            return true;
        } catch (err) {
            console.error('[Profile] 更新昵称异常:', err);
            return false;
        }
    }

    /**
     * 上传头像，自动删除旧文件，存储文件名到 avatar_url
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    async uploadAvatar(userId, file) {
        const client = this._getClient();
        if (!client || !userId) return { success: false, error: '服务未初始化' };

        // 前端预校验，避免无效上传消耗带宽
        const validation = this._validateAvatarFile(file);
        if (!validation.valid) return { success: false, error: validation.error };

        try {
            // 删除旧头像文件
            await this._deleteOldAvatar(userId);

            // 上传新文件
            const ext = file.name.split('.').pop().toLowerCase();
            const fileName = `${userId}_${Date.now()}.${ext}`;

            const { error: uploadError } = await client.storage
                .from(BUCKET)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('[Profile] 头像上传失败:', uploadError.message, uploadError);
                return { success: false, error: '头像上传失败' };
            }

            // 存储文件名（非完整 URL），显示时动态生成签名 URL
            const { error: updateError } = await client
                .from('profiles')
                .update({ avatar_url: fileName, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) {
                console.error('[Profile] 更新头像文件名失败:', updateError);
                return { success: false, error: '头像更新失败' };
            }

            if (this._profile) {
                this._profile.avatar_url = fileName;
            }

            // 返回即时可用的签名 URL
            const url = await this.getAvatarUrl(fileName);
            return { success: true, url };
        } catch (err) {
            console.error('[Profile] 头像上传异常:', err);
            return { success: false, error: '头像上传异常' };
        }
    }

    getProfile() {
        return this._profile;
    }
}

export default ProfileService;