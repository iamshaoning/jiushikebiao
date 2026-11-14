/**
 * 页面加载态
 *
 * 数据尚未到达时展示，避免页面先渲染「暂无数据」再突然变成有数据。
 * 仅在「未加载完成且本地无数据」时使用，已有本地缓存时直接显示内容。
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoading({ label = '正在加载…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

/**
 * 延迟显示的加载态：内容在 200ms 内加载完成时不显示，
 * 避免路由分包很快时「正在加载页面…」一闪而过。
 */
export function DeferredPageLoading({ label = '正在加载…' }: { label?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return show ? <PageLoading label={label} /> : null;
}
