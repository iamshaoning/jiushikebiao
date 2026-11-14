/**
 * 顶层错误边界
 *
 * 任一页面渲染异常时展示可恢复的提示，避免整页白屏。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('页面渲染异常:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream px-6">
        <div className="card w-full max-w-sm p-6 text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
          >
            <TriangleAlert className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
          </div>
          <h1 className="font-display text-lg font-bold text-ink-700 mb-2">页面出现异常</h1>
          <p className="text-sm text-gray-500 mb-6">
            已保留本地数据，重新加载后通常可以恢复。
          </p>
          <button className="btn-primary w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
        </div>
      </div>
    );
  }
}
