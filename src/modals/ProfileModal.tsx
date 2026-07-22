/**
 * 个人资料模态框
 *
 * 头像预览 + 上传（256x256 Canvas 压缩） + 昵称编辑
 * 数据存储在 Supabase profiles 表 + Profile bucket
 */
import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import {
  loadProfile,
  updateNickname,
  uploadAvatar,
  getAvatarUrl,
  type Profile,
} from '@/lib/profile';
import { updateLocalDisplayName } from '@/lib/auth';
import { Camera, Loader2, Check } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingNick, setSavingNick] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const p = await loadProfile(user.id);
      if (cancelled) return;
      setProfile(p);
      setNickname(p?.nickname || user.display_name);
      const url = await getAvatarUrl(p?.avatar_url);
      if (!cancelled) setAvatarUrl(url);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const result = await uploadAvatar(user.id, file);
    setUploading(false);
    if (result.success) {
      setAvatarUrl(result.url || null);
      toast.success('头像更新成功');
    } else {
      toast.error(result.error || '头像上传失败');
    }
    // 清空 input 以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveNickname = async () => {
    if (!user) return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.warning('昵称不能为空');
      return;
    }
    if (trimmed === profile?.nickname) {
      toast.info('昵称未变化');
      return;
    }
    setSavingNick(true);
    const ok = await updateNickname(user.id, trimmed);
    setSavingNick(false);
    if (ok) {
      setProfile((p) => (p ? { ...p, nickname: trimmed } : p));
      updateLocalDisplayName(trimmed);
      setUser({ ...user, display_name: trimmed });
      useStore.getState().setSessionUser({ ...user, display_name: trimmed });
      toast.success('昵称已更新');
    } else {
      toast.error('昵称更新失败');
    }
  };

  const footer = (
    <button onClick={onClose} className="btn btn-secondary">
      关闭
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="个人资料" footer={footer}>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <div className="space-y-5">
          {/* 头像区 */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-ink-200 hover:border-ink-300 transition-colors group"
              title="点击更换头像"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-bold">
                  {(nickname || user?.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-gray-400">
              支持 JPEG/PNG/GIF/WEBP，最大 200KB，自动压缩为 256×256
            </p>
          </div>

          {/* 邮箱（只读） */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">登录邮箱</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
            />
          </div>

          {/* 昵称编辑 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">昵称</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="input-field flex-1"
                placeholder="请输入昵称"
              />
              <button
                onClick={handleSaveNickname}
                disabled={savingNick}
                className="btn btn-primary whitespace-nowrap"
              >
                {savingNick ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
