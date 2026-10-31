/**
 * 页面加载态
 *
 * 数据尚未到达时展示，避免页面先渲染「暂无数据」再突然变成有数据。
 * 仅在「未加载完成且本地无数据」时使用，已有本地缓存时直接显示内容。
 */
import { Loader2 } from 'lucide-react';

export default function PageLoading({ label = '正在加载…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}
